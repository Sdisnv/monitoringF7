'use strict';
/** SCOPE-PERSONNEL-SYNC-1 — preview + commit transactionnel. Aucun DELETE+INSERT. */

const { randomUUID } = require('crypto');
const { HttpError, isoDate, rangesOverlap } = require('./_scope-rules');
const {
  TYPES_PERIODE,
  MOTIFS_INDISPONIBLE,
  dayBefore,
  assertPeriodCompatible,
  deriveStatutCourant,
  closeAllOpenAffectations
} = require('./_scope-personnel');
const contract = require('./_scope-personnel-sync-contract');

const { previewPersonnelSync: previewContract, applyDecisions, STATUTS, DECISIONS, isPrincipalOi } = contract;

function actorId(actor){
  return (actor && (actor.sub || actor.userId || actor.email)) || null;
}

function actorLabel(actor){
  return (actor && (actor.displayName || actor.name || actor.email || actor.sub)) || 'session SCOPE';
}

async function loadContext(repo){
  const personnes = await repo.listPersonnes({});
  const cibles = await repo.listCibles();
  const byCible = new Map(cibles.map((c) => [c.cible_id, c]));
  const affectations = typeof repo.listAffectations === 'function'
    ? await repo.listAffectations({})
    : [];
  const enriched = affectations.map((a) => {
    const cible = byCible.get(a.cible_id);
    return {
      ...a,
      niveau_code: cible ? cible.niveau_code : a.niveau_code,
      domaine_code: cible ? cible.domaine_code : a.domaine_code
    };
  });
  let periodes = [];
  if(typeof repo.listAllPeriodes === 'function'){
    periodes = await repo.listAllPeriodes();
  }else if(typeof repo.listPersonnesPeriodes === 'function'){
    for(const personne of personnes){
      periodes.push(...await repo.listPersonnesPeriodes(personne.personne_id));
    }
  }
  return { personnes, affectations: enriched, periodes, cibles };
}

function buildPreview(csvText, ctx, dateEffetGlobale){
  return previewContract(csvText, {
    personnes: ctx.personnes,
    affectations: ctx.affectations,
    periodes: ctx.periodes,
    dateEffetGlobale
  });
}

async function previewPersonnelSync(repo, body){
  const csvText = body.csvText || body.csv || '';
  if(!String(csvText).trim()){
    throw new HttpError(400, 'csv_obligatoire', 'Le fichier CSV du personnel est obligatoire.');
  }
  const ctx = await loadContext(repo);
  const preview = buildPreview(csvText, ctx, body.dateEffetGlobale || body.dateEffet);
  return {
    ...preview,
    importSummary: {
      personnelFichier: preview.summary.personnelFichier,
      inchanges: preview.summary.INCHANGE || 0,
      nouveaux: preview.summary.NOUVEAU || 0,
      changementsOi: preview.summary.CHANGEMENT_OI || 0,
      changementsGrade: preview.summary.CHANGEMENT_GRADE || 0,
      absents: preview.summary.ABSENT_DU_FICHIER || 0,
      archivesRetrouves: preview.summary.ARCHIVE_RETROUVE || 0,
      reactivations: preview.summary.REACTIVATION_PROPOSEE || 0,
      conflits: preview.summary.CONFLIT || 0,
      erreurs: preview.summary.ERREUR || 0,
      ecritures: 0
    }
  };
}

async function syncPersonneSnapshot(tx, personneId, date){
  const periodes = await tx.listPersonnesPeriodes(personneId);
  const snap = deriveStatutCourant(periodes, date);
  const actifs = periodes
    .filter((row) => row.type === TYPES_PERIODE.ACTIF)
    .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)));
  const archiveOpen = periodes.find((row) =>
    (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
  );
  await tx.updatePersonne(personneId, {
    actif: snap.actif,
    statut_rh: snap.statut_rh,
    date_entree: actifs[0] ? actifs[0].date_debut : undefined,
    date_sortie: archiveOpen ? archiveOpen.date_debut : null
  });
  return tx.getPersonne(personneId);
}

async function journal(tx, actor, action, personneId, apres, avant, commentaire){
  await tx.appendJournal({
    auteur_id: actorId(actor),
    entite: 'personne',
    entite_id: personneId,
    action,
    avant: avant || null,
    apres: apres || null,
    commentaire: commentaire || 'CSV_SYNC'
  });
}

function applying(decision){
  return [
    DECISIONS.APPLIQUER,
    DECISIONS.CREER,
    DECISIONS.REACTIVER,
    DECISIONS.ARCHIVER_SORTI,
    DECISIONS.ARCHIVER_DEMISSIONNAIRE,
    DECISIONS.DEBUT_CONGE,
    DECISIONS.FIN_CONGE,
    DECISIONS.FIN_AFFECTATION,
    DECISIONS.MODIFIER_IDENTITE
  ].includes(decision);
}

async function closePrincipalAffectations(tx, personneId, date, cibles, keepCibleId){
  const existing = await tx.listAffectations({ personneId });
  const lastDay = dayBefore(date);
  const closed = [];
  for(const aff of existing){
    if(aff.date_fin) continue;
    if(keepCibleId && aff.cible_id === keepCibleId) continue;
    const cible = cibles.find((c) => c.cible_id === aff.cible_id) || await tx.getCible(aff.cible_id);
    if(!cible || !isPrincipalOi(cible.domaine_code, cible.niveau_code)) continue;
    if(!lastDay || lastDay < aff.date_debut){
      throw new HttpError(422, 'changement_trop_tot', 'Le changement d’OI chevauche le début de l’affectation en cours.');
    }
    await tx.updateAffectation(aff.affectation_id, { date_fin: lastDay });
    closed.push({ affectation_id: aff.affectation_id, cible_id: aff.cible_id, date_fin: lastDay });
  }
  return closed;
}

async function openAffectation(tx, personneId, cible, date){
  const existing = await tx.listAffectations({ personneId });
  const already = existing.find((a) => a.cible_id === cible.cible_id && !a.date_fin);
  if(already) return { affectation: already, created: false };
  for(const a of existing){
    if(a.cible_id !== cible.cible_id) continue;
    if(rangesOverlap(a.date_debut, a.date_fin, date, null)){
      throw new HttpError(422, 'chevauchement', 'Chevauchement d’affectation Personne × Cible.');
    }
  }
  const saved = await tx.insertAffectation({
    personne_id: personneId,
    cible_id: cible.cible_id,
    date_debut: date,
    source: 'CSV_SYNC'
  });
  return { affectation: saved, created: true };
}

function resolveCible(cibles, parsedOi){
  if(!parsedOi || !parsedOi.known) return null;
  return cibles.find((c) => c.domaine_code === parsedOi.domaineCode && c.niveau_code === parsedOi.niveauCode) || null;
}

async function journalClosedAffectations(tx, actor, personne, closed, dateEffet){
  for(const item of closed){
    await journal(tx, actor, 'CLOTURER_AFFECTATION', personne.personne_id, {
      affectation_id: item.affectation_id,
      cible_id: item.cible_id,
      date_debut: item.date_debut,
      date_fin: item.date_fin,
      date_effet: dateEffet
    }, { nip: personne.nip, date_fin: null });
  }
}

async function applyArchive(tx, personne, date, type, actor){
  const existing = await tx.listPersonnesPeriodes(personne.personne_id);
  const openArchive = existing.find((row) =>
    (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
  );
  if(openArchive){
    const closed = await closeAllOpenAffectations(tx, personne.personne_id, openArchive.date_debut);
    await journalClosedAffectations(tx, actor, personne, closed, openArchive.date_debut);
    return syncPersonneSnapshot(tx, personne.personne_id, openArchive.date_debut);
  }
  const lastActive = dayBefore(date);
  for(const row of existing){
    if(row.date_fin) continue;
    if(row.type === TYPES_PERIODE.ACTIF || row.type === TYPES_PERIODE.INDISPONIBLE){
      if(!lastActive || lastActive < row.date_debut){
        throw new HttpError(422, 'archive_trop_tot', 'La date d’archivage ne peut pas précéder le début d’activité.');
      }
      await tx.updatePeriode(row.periode_id, { date_fin: lastActive });
    }
  }
  const afterClose = await tx.listPersonnesPeriodes(personne.personne_id);
  const normalized = assertPeriodCompatible(afterClose, { type, date_debut: date, date_fin: null });
  const periode = await tx.insertPeriode({
    personne_id: personne.personne_id,
    ...normalized,
    source: 'CSV_SYNC'
  });
  const closed = await closeAllOpenAffectations(tx, personne.personne_id, date);
  await journalClosedAffectations(tx, actor, personne, closed, date);
  const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
  await journal(tx, actor, 'ARCHIVER_PERSONNE', personne.personne_id, {
    type,
    date,
    periode_id: periode.periode_id,
    affectationsCloturees: closed.map((item) => item.affectation_id)
  }, { nip: personne.nip });
  return next;
}

async function applyReactivation(tx, personne, date, parsedOi, cibles, actor){
  const existing = await tx.listPersonnesPeriodes(personne.personne_id);
  const openArchive = existing.find((row) =>
    (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
  );
  if(openArchive){
    const leftover = await closeAllOpenAffectations(tx, personne.personne_id, openArchive.date_debut);
    await journalClosedAffectations(tx, actor, personne, leftover, openArchive.date_debut);
  }
  const lastOut = dayBefore(date);
  for(const row of existing){
    if(row.date_fin) continue;
    if(row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE){
      if(!lastOut || lastOut < row.date_debut){
        throw new HttpError(422, 'reactivation_trop_tot', 'La réactivation ne peut pas précéder le début d’archivage.');
      }
      await tx.updatePeriode(row.periode_id, { date_fin: lastOut });
    }
  }
  const afterClose = await tx.listPersonnesPeriodes(personne.personne_id);
  const alreadyActive = afterClose.some((row) => row.type === TYPES_PERIODE.ACTIF && !row.date_fin);
  if(!alreadyActive){
    const normalized = assertPeriodCompatible(afterClose, {
      type: TYPES_PERIODE.ACTIF,
      date_debut: date,
      date_fin: null
    });
    await tx.insertPeriode({
      personne_id: personne.personne_id,
      ...normalized,
      source: 'CSV_SYNC'
    });
  }
  const cible = resolveCible(cibles, parsedOi);
  if(cible && !alreadyActive){
    const opened = await openAffectation(tx, personne.personne_id, cible, date);
    if(opened.created){
      await journal(tx, actor, 'OUVRIR_AFFECTATION', personne.personne_id, {
        cible: `${cible.domaine_code}/${cible.niveau_code}`,
        date
      }, { nip: personne.nip });
    }
  }
  const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
  await journal(tx, actor, 'REACTIVER_PERSONNE', personne.personne_id, { date, nip: personne.nip }, { nip: personne.nip });
  return next;
}

async function applyConge(tx, personne, date, motif, actor){
  const existing = await tx.listPersonnesPeriodes(personne.personne_id);
  const lastActive = dayBefore(date);
  for(const row of existing){
    if(row.date_fin) continue;
    if(row.type === TYPES_PERIODE.ACTIF){
      if(!lastActive || lastActive < row.date_debut){
        throw new HttpError(422, 'conge_trop_tot', 'La date de congé ne peut pas précéder le début d’activité.');
      }
      await tx.updatePeriode(row.periode_id, { date_fin: lastActive });
    }
  }
  const afterClose = await tx.listPersonnesPeriodes(personne.personne_id);
  const normalized = assertPeriodCompatible(afterClose, {
    type: TYPES_PERIODE.INDISPONIBLE,
    date_debut: date,
    date_fin: null,
    motif: motif || MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE
  });
  const periode = await tx.insertPeriode({
    personne_id: personne.personne_id,
    ...normalized,
    source: 'CSV_SYNC'
  });
  const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
  await journal(tx, actor, 'DEBUT_CONGE', personne.personne_id, { date, motif: normalized.motif, periode_id: periode.periode_id });
  return next;
}

async function applyFinConge(tx, personne, date, actor){
  const existing = await tx.listPersonnesPeriodes(personne.personne_id);
  const lastDay = dayBefore(date);
  for(const row of existing){
    if(row.date_fin) continue;
    if(row.type === TYPES_PERIODE.INDISPONIBLE){
      if(!lastDay || lastDay < row.date_debut){
        throw new HttpError(422, 'fin_conge_trop_tot', 'La fin de congé ne peut pas précéder le début du congé.');
      }
      await tx.updatePeriode(row.periode_id, { date_fin: lastDay });
    }
  }
  const afterClose = await tx.listPersonnesPeriodes(personne.personne_id);
  if(!afterClose.some((row) => row.type === TYPES_PERIODE.ACTIF && !row.date_fin)){
    const normalized = assertPeriodCompatible(afterClose, {
      type: TYPES_PERIODE.ACTIF,
      date_debut: date,
      date_fin: null
    });
    await tx.insertPeriode({
      personne_id: personne.personne_id,
      ...normalized,
      source: 'CSV_SYNC'
    });
  }
  const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
  await journal(tx, actor, 'FIN_CONGE', personne.personne_id, { date });
  return next;
}

async function commitPersonnelSync(repo, body, actor){
  const csvText = body.csvText || body.csv || '';
  if(!String(csvText).trim()){
    throw new HttpError(400, 'csv_obligatoire', 'Le fichier CSV du personnel est obligatoire.');
  }
  const idempotencyKey = String(body.idempotencyKey || body.importId || '').trim();
  if(idempotencyKey && typeof repo.listJournal === 'function'){
    const previous = await repo.listJournal('import_personnel', idempotencyKey);
    const done = previous.find((row) => row.action === 'IMPORT_PERSONNEL');
    if(done){
      return Object.assign({}, done.apres || {}, { ok: true, idempotent: true });
    }
  }

  const ctx = await loadContext(repo);
  const rawPreview = buildPreview(csvText, ctx, body.dateEffetGlobale || body.dateEffet);
  if(body.fingerprint && body.fingerprint !== rawPreview.fingerprint){
    throw new HttpError(409, 'preview_obsolete', 'La base a changé depuis le preview. Relancez le contrôle.', {
      fingerprint: rawPreview.fingerprint
    });
  }
  const preview = applyDecisions(rawPreview, body.decisions || [], body.dateEffetGlobale || body.dateEffet);
  if(!preview.canCommit){
    throw new HttpError(422, 'commit_refuse', 'Des conflits, erreurs ou dates d’effet manquent. Aucune écriture.', {
      conflicts: preview.conflicts,
      dateEffetRequise: preview.dateEffetRequise
    });
  }

  const applied = [];
  return repo.withTransaction(async (tx) => {
    const cibles = ctx.cibles;
    for(const row of preview.rows){
      if(!applying(row.decision)) continue;
      const date = isoDate(row.dateEffet);
      if(row.statut === STATUTS.NOUVEAU && (row.decision === DECISIONS.CREER || row.decision === DECISIONS.APPLIQUER)){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        const existing = await tx.getPersonneByNip(row.nip);
        if(existing){
          throw new HttpError(409, 'nip_existant', 'Ce NIP existe déjà. Réactiver la même personne, ne pas recréer d’identité.');
        }
        const saved = await tx.insertPersonne({
          nip: row.nip,
          nom: row.nom,
          prenom: row.prenom,
          grade: row.grade || null,
          date_entree: date,
          source: 'CSV_SYNC'
        });
        const cible = resolveCible(cibles, row.parsedOi);
        if(cible){
          await openAffectation(tx, saved.personne_id, cible, date);
          await journal(tx, actor, 'OUVRIR_AFFECTATION', saved.personne_id, {
            cible: `${cible.domaine_code}/${cible.niveau_code}`,
            date
          });
        }
        await journal(tx, actor, 'CREER_PERSONNE', saved.personne_id, { nip: saved.nip, date });
        applied.push({ nip: row.nip, action: 'CREER_PERSONNE', personneId: saved.personne_id });
        continue;
      }

      const personne = row.personneId
        ? await tx.getPersonne(row.personneId)
        : await tx.getPersonneByNip(row.nip);
      if(!personne){
        throw new HttpError(409, 'preview_obsolete', 'Personne introuvable depuis le preview. Relancez le contrôle.');
      }
      const current = ctx.personnes.find((p) => p.personne_id === personne.personne_id) || personne;
      if(String(current.nom) !== String(personne.nom) || String(current.grade || '') !== String(personne.grade || '')
        || String(current.statut_rh || '') !== String(personne.statut_rh || '')){
        throw new HttpError(409, 'preview_obsolete', 'La personne a été modifiée depuis le preview. Relancez le contrôle.');
      }

      if(row.decision === DECISIONS.MODIFIER_IDENTITE || (row.statut === STATUTS.MODIFICATION_IDENTITE && applying(row.decision))){
        await tx.updatePersonne(personne.personne_id, { nom: row.nom, prenom: row.prenom });
        await journal(tx, actor, 'MODIFIER_IDENTITE', personne.personne_id, { nom: row.nom, prenom: row.prenom }, { nom: personne.nom, prenom: personne.prenom });
        applied.push({ nip: row.nip, action: 'MODIFIER_IDENTITE' });
      }
      if((row.actions || []).some((a) => a.type === STATUTS.CHANGEMENT_GRADE) && applying(row.decision) && row.decision !== DECISIONS.MODIFIER_IDENTITE){
        await tx.updatePersonne(personne.personne_id, { grade: row.grade || personne.grade });
        await journal(tx, actor, 'MODIFIER_GRADE', personne.personne_id, { grade: row.grade }, { grade: personne.grade });
        applied.push({ nip: row.nip, action: 'MODIFIER_GRADE' });
      }
      if(row.statut === STATUTS.CHANGEMENT_GRADE && applying(row.decision) && !(row.actions || []).some((a) => a.type === STATUTS.CHANGEMENT_GRADE)){
        await tx.updatePersonne(personne.personne_id, { grade: row.grade || personne.grade });
        await journal(tx, actor, 'MODIFIER_GRADE', personne.personne_id, { grade: row.grade }, { grade: personne.grade });
        applied.push({ nip: row.nip, action: 'MODIFIER_GRADE' });
      }

      if(row.statut === STATUTS.CHANGEMENT_OI || row.statut === STATUTS.NOUVELLE_AFFECTATION){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        const cible = resolveCible(cibles, row.parsedOi);
        if(!cible){
          throw new HttpError(422, 'oi_non_reconnu', 'OI hors périmètre DPS/DAP. Aucune implication FOBA/PR/AUTO.');
        }
        const closed = await closePrincipalAffectations(tx, personne.personne_id, date, cibles, cible.cible_id);
        for(const item of closed){
          await journal(tx, actor, 'CLOTURER_AFFECTATION', personne.personne_id, item);
        }
        const opened = await openAffectation(tx, personne.personne_id, cible, date);
        if(opened.created){
          await journal(tx, actor, 'OUVRIR_AFFECTATION', personne.personne_id, {
            cible: `${cible.domaine_code}/${cible.niveau_code}`,
            date
          });
        }
        if(closed.length || opened.created){
          await journal(tx, actor, 'CHANGER_OI', personne.personne_id, {
            avant: row.oiActuel,
            apres: row.oiPropose,
            date
          });
          applied.push({ nip: row.nip, action: 'CHANGER_OI' });
        }
      }

      if(row.statut === STATUTS.FIN_AFFECTATION || row.decision === DECISIONS.FIN_AFFECTATION){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        const closed = await closePrincipalAffectations(tx, personne.personne_id, date, cibles, null);
        for(const item of closed){
          await journal(tx, actor, 'CLOTURER_AFFECTATION', personne.personne_id, item);
        }
        applied.push({ nip: row.nip, action: 'CLOTURER_AFFECTATION' });
      }

      if(row.decision === DECISIONS.ARCHIVER_SORTI || row.decision === DECISIONS.ARCHIVER_DEMISSIONNAIRE
        || (row.statut === STATUTS.ARCHIVAGE_PROPOSE && applying(row.decision))){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        const type = row.decision === DECISIONS.ARCHIVER_DEMISSIONNAIRE || row.archiveType === 'DEMISSIONNAIRE'
          ? TYPES_PERIODE.DEMISSIONNAIRE
          : TYPES_PERIODE.SORTI;
        await applyArchive(tx, personne, date, type, actor);
        applied.push({ nip: row.nip, action: 'ARCHIVER_PERSONNE', type });
      }

      if(row.decision === DECISIONS.REACTIVER || (row.statut === STATUTS.ARCHIVE_RETROUVE && applying(row.decision))){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        await applyReactivation(tx, personne, date, row.parsedOi, cibles, actor);
        applied.push({ nip: row.nip, action: 'REACTIVER_PERSONNE', personneId: personne.personne_id });
      }

      if(row.decision === DECISIONS.DEBUT_CONGE || row.statut === STATUTS.DEBUT_CONGE && applying(row.decision)){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        await applyConge(tx, personne, date, row.motif || MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE, actor);
        applied.push({ nip: row.nip, action: 'DEBUT_CONGE' });
      }

      if(row.decision === DECISIONS.FIN_CONGE || (row.statut === STATUTS.FIN_CONGE && applying(row.decision))){
        if(!date) throw new HttpError(400, 'date_effet_obligatoire', `Date d’effet obligatoire pour le NIP ${row.nip}.`);
        await applyFinConge(tx, personne, date, actor);
        applied.push({ nip: row.nip, action: 'FIN_CONGE' });
      }
    }

    const summary = {
      analysed: preview.summary.personnelFichier,
      inchanges: preview.summary.INCHANGE || 0,
      creations: applied.filter((a) => a.action === 'CREER_PERSONNE').length,
      changementsOi: applied.filter((a) => a.action === 'CHANGER_OI').length,
      changementsGrade: applied.filter((a) => a.action === 'MODIFIER_GRADE').length,
      reactivations: applied.filter((a) => a.action === 'REACTIVER_PERSONNE').length,
      archivages: applied.filter((a) => a.action === 'ARCHIVER_PERSONNE').length,
      conges: applied.filter((a) => a.action === 'DEBUT_CONGE' || a.action === 'FIN_CONGE').length,
      conflits: preview.summary.CONFLIT || 0,
      erreurs: 0,
      mutations: applied.length
    };
    const rapport = {
      ok: true,
      idempotent: false,
      importId: preview.importId,
      fingerprint: preview.fingerprint,
      filename: body.filename || null,
      summary,
      applied,
      analysedNips: [...new Set((preview.rows || []).map((row) => row.nip).filter(Boolean))],
      auteur: actorLabel(actor)
    };
    const key = idempotencyKey || preview.importId;
    await tx.appendJournal({
      auteur_id: actorId(actor),
      entite: 'import_personnel',
      entite_id: key,
      action: 'IMPORT_PERSONNEL',
      apres: rapport,
      commentaire: body.filename || 'CSV_SYNC'
    });
    return rapport;
  });
}

module.exports = {
  previewPersonnelSync,
  commitPersonnelSync,
  loadContext
};
