const { randomUUID } = require('crypto');
const {
  HttpError,
  isoDate,
  isAffectationValide,
  computeTaux,
  validateParticipationPatch,
  validateCloture,
  rangesOverlap,
  ROLES_ENCADREMENT
} = require('./_scope-rules');
const {
  TYPES_PERIODE,
  MOTIFS_INDISPONIBLE,
  dayBefore,
  evaluateEligibility,
  assertPeriodCompatible,
  deriveStatutCourant
} = require('./_scope-personnel');
const personnelSync = require('./_scope-personnel-sync');
const csvImport = require('./_scope-csv-import');
const {
  inferModeSuivi,
  MODES,
  officialFromQuantitatif,
  parseQuantitatifInput
} = require('./_scope-analytics');
const {
  domaineAffiche,
  isSousDomaineFospec,
  resolveSuiviNominatif
} = require('./_scope-model');

function requireBaseVersion(body){
  const value = body?.baseVersion ?? body?.base_version;
  if(value === undefined || value === null || value === ''){
    throw new HttpError(400, 'base_version_required', 'baseVersion est obligatoire pour toute écriture d’événement.');
  }
  const n = Number(value);
  if(!Number.isInteger(n) || n < 1) throw new HttpError(400, 'base_version_invalid', 'baseVersion invalide.');
  return n;
}

function actorId(actor){
  return String(actor?.sub || actor?.email || actor?.nip || actor || 'systeme');
}

function isQuantitatif(evenement){
  return inferModeSuivi(evenement) === MODES.QUANTITATIF;
}

function requireQuantitatif(evenement){
  if(!isQuantitatif(evenement)){
    throw new HttpError(422, 'mode_non_quantitatif', 'Cette action concerne uniquement le suivi quantitatif.');
  }
}

function volumesOrThrow(body){
  const parsed = parseQuantitatifInput(body || {});
  if(parsed.error === 'missing'){
    throw new HttpError(400, 'volumes_incomplets', 'Attendus, présents, excusés et non excusés sont obligatoires.');
  }
  if(parsed.error === 'negative'){
    throw new HttpError(422, 'volume_negatif', 'Les volumes ne peuvent pas être négatifs.');
  }
  if(parsed.error === 'not_integer'){
    throw new HttpError(422, 'volume_invalide', 'Les volumes doivent être des entiers.');
  }
  if(parsed.error === 'motifs_incoherents'){
    throw new HttpError(422, 'motifs_incoherents', 'La somme des motifs d’excuse doit être égale aux excusés.');
  }
  return parsed.row;
}

function officialQuantitatifOrThrow(row){
  const official = officialFromQuantitatif(row);
  if(!official){
    throw new HttpError(
      422,
      'volumes_incoherents',
      'Présents + excusés + non excusés + dispensés doit être égal aux attendus. Aucune correction automatique n’est appliquée.'
    );
  }
  return official;
}

async function bumpOrConflict(repo, eventId, baseVersion, patch){
  const next = await repo.updateEventIfVersion(eventId, baseVersion, patch);
  if(!next){
    const current = await repo.getEvent(eventId);
    throw new HttpError(409, 'conflict', 'L’événement a été modifié ailleurs.', {
      serverVersion: current ? current.version : null
    });
  }
  return next;
}

function createScopeService(repo){
  async function referentiels(){
    const [domaines, cibles, suivi] = await Promise.all([
      repo.listDomaines(),
      repo.listCibles(),
      repo.listSuiviNominatif ? repo.listSuiviNominatif() : Promise.resolve([])
    ]);
    const mappedDomaines = domaines.map(d => ({
      code: d.code,
      libelle: d.libelle,
      libelleAffiche: d.libelle_affiche || domaineAffiche(d.code, d),
      nature: d.nature || (d.parent_code ? 'SOUS_DOMAINE' : 'DOMAINE'),
      parentCode: d.parent_code || d.parentCode || null,
      actif: d.actif !== false
    }));
    const mappedCibles = cibles.map(c => ({
      cibleId: c.cible_id,
      domaineCode: c.domaine_code,
      niveauCode: c.niveau_code,
      libelle: c.libelle,
      actif: c.actif !== false
    }));
    const roots = mappedDomaines.filter((d) => d.nature !== 'SOUS_DOMAINE' && !d.parentCode);
    const arbre = roots.map((d) => ({
      ...d,
      sousDomaines: mappedDomaines.filter((s) => s.parentCode === d.code).map((s) => ({
        ...s,
        cibles: mappedCibles.filter((c) => c.domaineCode === s.code)
      })),
      cibles: mappedCibles.filter((c) => c.domaineCode === d.code)
    }));
    return {
      domaines: mappedDomaines,
      cibles: mappedCibles,
      arbre,
      suiviNominatif: (suivi || []).map((row) => ({
        suiviId: row.suivi_id || row.suiviId,
        portee: row.portee,
        domaineCode: row.domaine_code || row.domaineCode || null,
        sousDomaineCode: row.sous_domaine_code || row.sousDomaineCode || null,
        cibleId: row.cible_id || row.cibleId || null,
        nominatifAutorise: row.nominatif_autorise !== false && row.nominatifAutorise !== false,
        dateDebut: row.date_debut || row.dateDebut,
        dateFin: row.date_fin || row.dateFin || null,
        commentaire: row.commentaire || null
      })),
      personnelTemporel: {
        typesPeriode: Object.values(TYPES_PERIODE),
        motifsIndisponible: Object.values(MOTIFS_INDISPONIBLE)
      }
    };
  }

  async function listPersonnes(query){
    const personnes = await repo.listPersonnes({ q: query?.q });
    const date = isoDate(query?.date);
    if(!date) return { personnes };
    const result = [];
    for(const personne of personnes){
      const affectations = await repo.listAffectations({ personneId: personne.personne_id, date });
      result.push({ ...personne, affectations });
    }
    return { personnes: result };
  }

  async function affectationsValides(personneId, date){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const affectations = await repo.listAffectations({ personneId, date: isoDate(date) });
    const enriched = [];
    for(const a of affectations){
      const cible = await repo.getCible(a.cible_id);
      enriched.push({ ...a, cible });
    }
    return { personne, affectations: enriched };
  }

  async function createEvenement(body, actor){
    const date = isoDate(body.date);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’événement invalide.');
    let domaine = String(body.domaineCode || body.domaine_code || '').trim();
    const sousDomaineRequested = String(body.sousDomaineCode || body.sous_domaine_code || '').trim().toUpperCase();
    const domaines = await repo.listDomaines();
    if(!domaines.some(d => d.code === domaine && d.actif !== false)){
      throw new HttpError(400, 'domaine_inconnu', 'Domaine inconnu.');
    }
    if(domaine === 'FOSPEC' && (sousDomaineRequested === 'PR' || sousDomaineRequested === 'AUTO')){
      domaine = sousDomaineRequested;
    }
    const libelle = String(body.libelle || '').trim();
    if(!libelle) throw new HttpError(400, 'libelle_vide', 'Le libellé est obligatoire.');
    const cibleIds = Array.isArray(body.cibleIds || body.cible_ids) ? (body.cibleIds || body.cible_ids) : [];
    if(!cibleIds.length) throw new HttpError(400, 'cibles_obligatoires', 'Au moins une cible est obligatoire.');
    const cibles = await repo.listCibles();
    const resolvedCibles = [];
    for(const id of cibleIds){
      const cible = cibles.find(c => c.cible_id === id);
      if(!cible){
        throw new HttpError(400, 'cible_invalide', 'Cible inconnue ou hors domaine.');
      }
      resolvedCibles.push(cible);
    }
    const leafDomaines = [...new Set(resolvedCibles.map((c) => c.domaine_code))];
    if(leafDomaines.length !== 1){
      throw new HttpError(400, 'cible_invalide', 'Les cibles d’un exercice doivent appartenir au même domaine (ou sous-domaine).');
    }
    const leaf = leafDomaines[0];
    if(domaine !== leaf){
      if(domaine === 'FOSPEC' && isSousDomaineFospec(leaf)) domaine = leaf;
      else throw new HttpError(400, 'cible_invalide', 'Cible inconnue ou hors domaine.');
    }
    const origine = body.origine === 'LEGACY_AGGREGATED' ? 'LEGACY_AGGREGATED' : 'NOMINATIF';
    let modeSuivi = inferModeSuivi({ origine, mode_suivi: body.modeSuivi || body.mode_suivi });
    if(origine === 'LEGACY_AGGREGATED') modeSuivi = MODES.LEGACY;
    else {
      const requested = String(body.modeSuivi || body.mode_suivi || '').toUpperCase();
      if(requested === MODES.LEGACY){
        throw new HttpError(400, 'mode_legacy_interdit', 'Le mode historique agrégé ne peut pas être choisi à la création manuelle.');
      }
      if(requested === MODES.QUANTITATIF) modeSuivi = MODES.QUANTITATIF;
      else if(requested === MODES.NOMINATIF) modeSuivi = MODES.NOMINATIF;
      else modeSuivi = MODES.NOMINATIF;
    }
    if(modeSuivi === MODES.NOMINATIF && origine !== 'LEGACY_AGGREGATED'){
      const rules = repo.listSuiviNominatif ? await repo.listSuiviNominatif() : [];
      const resolution = resolveSuiviNominatif(rules, {
        date,
        domaineCode: domaine,
        sousDomaineCode: isSousDomaineFospec(domaine) ? domaine : null,
        cibleId: cibleIds[0]
      });
      if(resolution.possible === false){
        throw new HttpError(422, 'nominatif_non_autorise', 'Le suivi nominatif n’est pas autorisé pour ce périmètre à cette date.');
      }
    }
    const evenement = await repo.insertEvenement({
      date,
      domaine_code: domaine,
      sous_domaine_code: isSousDomaineFospec(domaine) ? domaine : null,
      libelle,
      statut: 'PLANIFIE',
      origine,
      mode_suivi: modeSuivi,
      cible_ids: cibleIds
    });
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'evenement',
      entite_id: evenement.evenement_id,
      action: 'CREER',
      apres: { date, domaine, libelle, cibleIds, origine, modeSuivi }
    });
    return { evenement, version: evenement.version };
  }

  async function patchEvenement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    const patch = {};
    if(body.libelle !== undefined){
      const libelle = String(body.libelle || '').trim();
      if(!libelle) throw new HttpError(400, 'libelle_vide', 'Le libellé est obligatoire.');
      patch.libelle = libelle;
    }
    const wantsDate = body.date !== undefined;
    const wantsDomaine = body.domaineCode !== undefined || body.domaine_code !== undefined;
    const wantsCibles = body.cibleIds !== undefined || body.cible_ids !== undefined;
    if(evenement.population_figee && (wantsDate || wantsDomaine || wantsCibles)){
      throw new HttpError(422, 'population_figee_immutable', 'Date, domaine et cibles ne peuvent plus être modifiés après gel. Une régénération n’est pas exposée dans ce lot.');
    }
    if(wantsDate){
      const date = isoDate(body.date);
      if(!date) throw new HttpError(400, 'date_invalide', 'Date invalide.');
      patch.date = date;
    }
    if(wantsDomaine){
      patch.domaine_code = String(body.domaineCode || body.domaine_code);
    }
    const next = await repo.withTransaction(async (tx) => {
      const updated = await bumpOrConflict(tx, eventId, baseVersion, patch);
      if(wantsCibles && !evenement.population_figee){
        const cibleIds = body.cibleIds || body.cible_ids;
        if(!Array.isArray(cibleIds) || !cibleIds.length){
          throw new HttpError(400, 'cibles_obligatoires', 'Au moins une cible est obligatoire.');
        }
        await tx.setEventCibles(eventId, cibleIds);
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'MODIFIER',
        avant: { version: evenement.version },
        apres: { version: updated.version, patch }
      });
      return updated;
    });
    return { evenement: next, version: next.version };
  }

  async function resolveEligiblePopulation({ eventDate, domaineCode, sousDomaineCode, cibleIds, suiviNominatif }){
    const date = isoDate(eventDate);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’événement invalide.');
    const ids = Array.isArray(cibleIds) ? cibleIds.filter(Boolean) : [];
    const rules = suiviNominatif || (repo.listSuiviNominatif ? await repo.listSuiviNominatif() : []);
    if(ids.length === 1){
      const resolution = resolveSuiviNominatif(rules, {
        date,
        domaineCode,
        sousDomaineCode,
        cibleId: ids[0]
      });
      if(resolution.possible === false){
        return { count: 0, personnes: [], note: 'suivi_nominatif_interdit', resolution };
      }
    }
    const affectations = await repo.listAffectationsForCibles(ids, date);
    const byPersonne = new Map();
    for(const aff of affectations){
      if(!isAffectationValide(aff, date)) continue;
      const personne = await repo.getPersonne(aff.personne_id);
      if(!personne) continue;
      const periodes = repo.listPersonnesPeriodes
        ? await repo.listPersonnesPeriodes(aff.personne_id)
        : [];
      const eligibility = evaluateEligibility(personne, periodes, date);
      if(!eligibility.eligible) continue;
      const cible = await repo.getCible(aff.cible_id);
      const current = byPersonne.get(aff.personne_id) || {
        personneId: aff.personne_id,
        nip: personne.nip,
        nom: personne.nom,
        prenom: personne.prenom,
        cibles: [],
        origine: 'REGLE',
        motifInclusion: 'affectation_valide_a_date',
        eligibility
      };
      current.cibles.push({
        cibleId: aff.cible_id,
        niveauCode: cible?.niveau_code,
        domaineCode: cible?.domaine_code
      });
      byPersonne.set(aff.personne_id, current);
    }
    const personnes = [...byPersonne.values()];
    return { count: personnes.length, personnes };
  }

  async function photographieFigee(eventId){
    const attendus = await repo.listAttendus(eventId);
    const personnes = [];
    for(const row of attendus){
      if(row.inclus === false) continue;
      const personne = await repo.getPersonne(row.personne_id);
      personnes.push({
        personneId: row.personne_id,
        nip: personne?.nip,
        nom: personne?.nom,
        prenom: personne?.prenom,
        cibles: [],
        origine: row.origine || 'FIGE',
        motifInclusion: row.motif_inclusion || 'photographie_figee',
        fige: true
      });
    }
    return { count: personnes.length, personnes, fige: true, photographie: true };
  }

  async function previewAttendus(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    if(evenement.origine === 'LEGACY_AGGREGATED'){
      return { count: 0, personnes: [], note: 'Legacy agrégé : aucune population nominative.' };
    }
    if(isQuantitatif(evenement)){
      throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas de population nominative.');
    }
    if(evenement.population_figee){
      return photographieFigee(eventId);
    }
    const cibleIds = await repo.listEventCibleIds(eventId);
    return resolveEligiblePopulation({
      eventDate: evenement.date,
      domaineCode: evenement.domaine_code,
      sousDomaineCode: evenement.sous_domaine_code,
      cibleIds
    });
  }

  async function listPeriodes(personneId){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const periodes = repo.listPersonnesPeriodes ? await repo.listPersonnesPeriodes(personneId) : [];
    return { personne, periodes };
  }

  async function syncPersonneSnapshot(tx, personneId, today){
    const periodes = await tx.listPersonnesPeriodes(personneId);
    const snap = deriveStatutCourant(periodes, today);
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

  async function ouvrirPeriode(personneId, body, actor){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personneId);
      const normalized = assertPeriodCompatible(existing, body);
      const saved = await tx.insertPeriode({
        personne_id: personneId,
        type: normalized.type,
        date_debut: normalized.date_debut,
        date_fin: normalized.date_fin,
        motif: normalized.motif,
        source: body.source || 'MANUEL'
      });
      const next = await syncPersonneSnapshot(tx, personneId, normalized.date_debut);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'OUVRIR_PERIODE',
        avant: { statut_rh: personne.statut_rh },
        apres: { periode_id: saved.periode_id, type: saved.type, date_debut: saved.date_debut }
      });
      return { personne: next, periode: saved };
    });
  }

  async function cloturerPeriode(personneId, periodeId, body, actor){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const dateFin = isoDate(body.dateFin || body.date_fin);
    if(!dateFin) throw new HttpError(400, 'date_fin_obligatoire', 'La date de fin de période est obligatoire.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personneId);
      const current = existing.find((row) => row.periode_id === periodeId);
      if(!current) throw new HttpError(404, 'periode_introuvable', 'Période introuvable.');
      assertPeriodCompatible(existing, { ...current, date_fin: dateFin });
      const saved = await tx.updatePeriode(periodeId, { date_fin: dateFin });
      const next = await syncPersonneSnapshot(tx, personneId, dateFin);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'CLOTURER_PERIODE',
        apres: { periode_id: periodeId, date_fin: dateFin }
      });
      return { personne: next, periode: saved };
    });
  }

  async function archiverPersonne(personneId, body, actor){
    const type = String(body.type || body.statut || TYPES_PERIODE.SORTI).toUpperCase();
    if(type !== TYPES_PERIODE.SORTI && type !== TYPES_PERIODE.DEMISSIONNAIRE){
      throw new HttpError(422, 'type_archive_invalide', 'Archivage : SORTI ou DEMISSIONNAIRE.');
    }
    const date = isoDate(body.date);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’archivage invalide.');
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personneId);
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
      const afterClose = await tx.listPersonnesPeriodes(personneId);
      const normalized = assertPeriodCompatible(afterClose, { type, date_debut: date, date_fin: null });
      const periode = await tx.insertPeriode({
        personne_id: personneId,
        ...normalized,
        source: body.source || 'MANUEL'
      });
      const next = await syncPersonneSnapshot(tx, personneId, date);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'ARCHIVER',
        avant: { nip: personne.nip, personne_id: personneId },
        apres: { type, date, periode_id: periode.periode_id }
      });
      return { personne: next, periode };
    });
  }

  async function reactiverPersonne(body, actor){
    const date = isoDate(body.date);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date de réactivation invalide.');
    let personne = body.personneId || body.personne_id
      ? await repo.getPersonne(body.personneId || body.personne_id)
      : null;
    if(!personne && body.nip){
      personne = await repo.getPersonneByNip(String(body.nip).trim());
    }
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable. Réactivation par NIP uniquement, jamais par nom/prénom.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personne.personne_id);
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
      if(afterClose.some((row) => row.type === TYPES_PERIODE.ACTIF && !row.date_fin)){
        const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
        return { personne: next, dejaActive: true };
      }
      const normalized = assertPeriodCompatible(afterClose, {
        type: TYPES_PERIODE.ACTIF,
        date_debut: date,
        date_fin: null
      });
      const periode = await tx.insertPeriode({
        personne_id: personne.personne_id,
        ...normalized,
        source: body.source || 'MANUEL'
      });
      const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personne.personne_id,
        action: 'REACTIVER',
        avant: { nip: personne.nip, personne_id: personne.personne_id },
        apres: { date, periode_id: periode.periode_id }
      });
      return { personne: next, periode, memeIdentite: true };
    });
  }

  async function createPersonne(body, actor){
    const nip = String(body.nip || '').trim();
    const nom = String(body.nom || '').trim();
    const prenom = String(body.prenom || '').trim();
    if(!nip) throw new HttpError(400, 'nip_obligatoire', 'Le NIP est obligatoire.');
    if(!nom || !prenom) throw new HttpError(400, 'identite_obligatoire', 'Nom et prénom sont obligatoires.');
    const existing = await repo.getPersonneByNip(nip);
    if(existing){
      throw new HttpError(409, 'nip_existant', 'Ce NIP existe déjà. Réactiver la même personne, ne pas recréer d’identité.');
    }
    return repo.withTransaction(async (tx) => {
      const saved = await tx.insertPersonne({
        nip,
        nom,
        prenom,
        grade: body.grade || null,
        date_entree: isoDate(body.dateEntree || body.date_entree) || isoDate(body.date) || null,
        source: body.source || 'MANUEL'
      });
      if(body.cibleId || body.cible_id){
        const cibleId = body.cibleId || body.cible_id;
        const debut = isoDate(body.dateDebut || body.date_debut || saved.date_entree) || isoDate(new Date().toISOString());
        await assertNoAffectationOverlapInDomain(saved.personne_id, cibleId, debut, null);
        await tx.insertAffectation({
          personne_id: saved.personne_id,
          cible_id: cibleId,
          date_debut: debut,
          source: body.source || 'MANUEL'
        });
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: saved.personne_id,
        action: 'CREER',
        apres: { nip: saved.nip }
      });
      return { personne: saved };
    });
  }

  async function changerAffectation(personneId, body, actor){
    const cibleId = body.cibleId || body.cible_id;
    const dateDebut = isoDate(body.dateDebut || body.date_debut || body.date);
    if(!cibleId) throw new HttpError(400, 'cible_obligatoire', 'La nouvelle cible est obligatoire.');
    if(!dateDebut) throw new HttpError(400, 'date_invalide', 'Date de changement d’affectation invalide.');
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const cible = await repo.getCible(cibleId);
    if(!cible) throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listAffectations({ personneId });
      const lastDay = dayBefore(dateDebut);
      for(const aff of existing){
        const other = await tx.getCible(aff.cible_id);
        if(!other || other.domaine_code !== cible.domaine_code) continue;
        if(aff.date_fin) continue;
        if(!lastDay || lastDay < aff.date_debut){
          throw new HttpError(422, 'changement_trop_tot', 'Le changement d’affectation chevauche le début de l’affectation en cours.');
        }
        await tx.updateAffectation(aff.affectation_id, { date_fin: lastDay });
      }
      await assertNoAffectationOverlapInDomain(personneId, cibleId, dateDebut, isoDate(body.dateFin || body.date_fin), null, tx);
      const saved = await tx.insertAffectation({
        personne_id: personneId,
        cible_id: cibleId,
        date_debut: dateDebut,
        date_fin: isoDate(body.dateFin || body.date_fin),
        source: body.source || 'MANUEL'
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'CHANGER_AFFECTATION',
        apres: { cible_id: cibleId, date_debut: dateDebut, domaine: cible.domaine_code }
      });
      return { affectation: saved, cible };
    });
  }

  async function previewPersonnelSync(body){
    return personnelSync.previewPersonnelSync(repo, body || {});
  }

  async function commitPersonnelSync(body, actor){
    return personnelSync.commitPersonnelSync(repo, body || {}, actor);
  }

  async function figerPopulation(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.origine === 'LEGACY_AGGREGATED'){
        throw new HttpError(422, 'legacy', 'Impossible de figer une population nominative sur un agrégat legacy.');
      }
      if(isQuantitatif(evenement)){
        throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas de population à figer.');
      }
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Le gel n’est possible que sur un événement PLANIFIE.');
      if(evenement.population_figee) throw new HttpError(422, 'deja_figee', 'La population est déjà figée.');
      const preview = await previewAttendus(eventId);
      const stamp = new Date().toISOString();
      for(const personne of preview.personnes){
        await tx.upsertAttendu({
          evenement_id: eventId,
          personne_id: personne.personneId,
          inclus: true,
          origine: 'REGLE',
          motif_inclusion: personne.motifInclusion
        });
        await tx.upsertParticipation({
          evenement_id: eventId,
          personne_id: personne.personneId,
          statut: 'NON_RENSEIGNE',
          role: 'PARTICIPANT',
          source: 'GENERATION',
          auteur_id: actorId(actor)
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {
        population_figee: true,
        population_version: evenement.population_version + 1,
        figee_at: stamp,
        figee_par: actorId(actor)
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'FIGER',
        apres: { count: preview.count, version: next.version }
      });
      return { evenement: next, version: next.version, count: preview.count };
    });
  }

  async function ajouterException(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const role = String(body.role || 'RENFORT');
    if(!['RENFORT', 'REMPLACANT', 'PARTICIPANT'].includes(role)){
      throw new HttpError(422, 'role_invalide', 'Rôle d’exception invalide.');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(isQuantitatif(evenement)){
        throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas d’exceptions nominatives.');
      }
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Exception possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Figer la population avant d’ajouter une exception.');
      const personne = await tx.getPersonne(personneId);
      if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
      const existing = await tx.getAttendu(eventId, personneId);
      if(existing && existing.inclus) throw new HttpError(422, 'doublon', 'Cette personne est déjà attendue.');
      await tx.upsertAttendu({
        evenement_id: eventId,
        personne_id: personneId,
        inclus: true,
        origine: 'EXCEPTION_AJOUT',
        origine_retrait: null,
        motif_inclusion: body.motifInclusion || body.motif_inclusion || 'exception_ajout'
      });
      await tx.upsertParticipation({
        evenement_id: eventId,
        personne_id: personneId,
        statut: 'NON_RENSEIGNE',
        role,
        source: 'EXCEPTION',
        auteur_id: actorId(actor)
      });
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'EXCEPTION_AJOUT',
        apres: { personneId, role },
        commentaire: body.commentaire || null
      });
      return { evenement: next, version: next.version };
    });
  }

  async function retirerAttendu(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Retrait possible uniquement sur PLANIFIE.');
      const attendu = await tx.getAttendu(eventId, personneId);
      if(!attendu) throw new HttpError(404, 'attendu_introuvable', 'Attendu introuvable.');
      await tx.upsertAttendu({
        ...attendu,
        inclus: false,
        origine_retrait: 'EXCEPTION_RETRAIT'
      });
      const participation = await tx.getParticipation(eventId, personneId);
      await tx.upsertParticipation({
        ...(participation || { evenement_id: eventId, personne_id: personneId, role: 'PARTICIPANT' }),
        statut: 'NON_CONCERNE',
        auteur_id: actorId(actor)
      });
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'EXCEPTION_RETRAIT',
        apres: { personneId }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function enregistrerParticipations(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const items = Array.isArray(body.participations) ? body.participations : [];
    if(!items.length) throw new HttpError(400, 'lot_vide', 'Aucune participation à enregistrer.');
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(isQuantitatif(evenement)){
        throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas de participations nominatives.');
      }
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Saisie possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Population non figée.');
      for(const item of items){
        const personneId = item.personneId || item.personne_id;
        const attendu = await tx.getAttendu(eventId, personneId);
        if(!attendu || attendu.inclus === false){
          throw new HttpError(422, 'non_attendu', 'Saisie réservée aux personnes attendues incluses.', { personneId });
        }
        const patch = validateParticipationPatch(item, { domaineCode: evenement.domaine_code });
        const existing = await tx.getParticipation(eventId, personneId);
        await tx.upsertParticipation({
          ...(existing || { evenement_id: eventId, personne_id: personneId, role: 'PARTICIPANT' }),
          ...patch,
          source: 'SAISIE',
          auteur_id: actorId(actor)
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'SAISIE_PARTICIPATIONS',
        apres: { count: items.length, version: next.version }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function ajouterEncadrement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const role = String(body.role || '');
    if(!ROLES_ENCADREMENT.has(role)){
      throw new HttpError(422, 'role_invalide', 'Rôle d’encadrement invalide (FORMATEUR, SURVEILLANT, AUXILIAIRE).');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Encadrement saisissable uniquement sur PLANIFIE.');
      const personne = await tx.getPersonne(personneId);
      if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
      const attendu = await tx.getAttendu(eventId, personneId);
      if(attendu && attendu.inclus){
        throw new HttpError(422, 'deja_attendu', 'Cette personne est déjà attendue : pas de ligne d’encadrement distincte. Elle reste PARTICIPANT et entre dans le taux.');
      }
      const existing = await tx.getParticipation(eventId, personneId);
      if(existing && !ROLES_ENCADREMENT.has(existing.role)){
        throw new HttpError(422, 'doublon', 'Une participation existe déjà pour cette personne.');
      }
      await tx.upsertParticipation({
        evenement_id: eventId,
        personne_id: personneId,
        statut: existing?.statut && existing.statut !== 'NON_RENSEIGNE' ? existing.statut : 'NON_CONCERNE',
        role,
        source: 'ENCADREMENT',
        auteur_id: actorId(actor)
      });
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'ENCADREMENT',
        apres: { personneId, role }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function cloturer(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(isQuantitatif(evenement)){
        if(evenement.statut !== 'PLANIFIE'){
          throw new HttpError(422, 'statut_invalide', 'La clôture n’est possible que depuis PLANIFIE.');
        }
        const saisie = await tx.getQuantitatifSaisie(eventId);
        if(!saisie){
          throw new HttpError(422, 'saisie_manquante', 'Saisissez les volumes avant de clôturer.');
        }
        const official = officialQuantitatifOrThrow(saisie);
        const next = await bumpOrConflict(tx, eventId, baseVersion, {
          statut: 'REALISE',
          cloture_at: new Date().toISOString(),
          cloture_par: actorId(actor)
        });
        const taux = { ...official, officiel: true, kind: 'OFFICIEL' };
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: eventId,
          action: 'CLOTURER',
          avant: { statut: evenement.statut },
          apres: { statut: 'REALISE', version: next.version, taux }
        });
        return { evenement: next, version: next.version, taux };
      }
      const attendus = await tx.listAttendus(eventId);
      const participations = await tx.listParticipations(eventId);
      validateCloture(evenement, attendus, participations);
      const next = await bumpOrConflict(tx, eventId, baseVersion, {
        statut: 'REALISE',
        cloture_at: new Date().toISOString(),
        cloture_par: actorId(actor)
      });
      const taux = computeTaux(participations, attendus);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'CLOTURER',
        apres: { version: next.version, taux }
      });
      return { evenement: next, version: next.version, taux };
    });
  }

  async function annulerEvenement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const motif = String(body.motif || body.commentaire || '').trim();
    if(!motif) throw new HttpError(400, 'motif_obligatoire', 'L’annulation exige un motif.');
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(!['PLANIFIE', 'REPORTE', 'REALISE'].includes(evenement.statut)){
        throw new HttpError(422, 'statut_invalide', 'Annulation possible depuis PLANIFIE, REPORTE ou REALISE.');
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, { statut: 'ANNULE' });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'ANNULER',
        commentaire: motif,
        avant: { statut: evenement.statut, version: evenement.version },
        apres: { statut: 'ANNULE', version: next.version }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function reouvrir(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const motif = String(body.motif || body.commentaire || '').trim();
    if(!motif) throw new HttpError(400, 'motif_obligatoire', 'La réouverture exige un motif.');
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'REALISE') throw new HttpError(422, 'statut_invalide', 'Réouverture possible uniquement depuis REALISE.');
      const next = await bumpOrConflict(tx, eventId, baseVersion, {
        statut: 'PLANIFIE',
        cloture_at: null,
        cloture_par: null
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'REOUVRIR',
        commentaire: motif,
        apres: { version: next.version }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function summarizeEvenement(evenement){
    const cibleIds = await repo.listEventCibleIds(evenement.evenement_id);
    const allCibles = await repo.listCibles();
    const cibles = allCibles.filter(c => cibleIds.includes(c.cible_id));
    const attendus = await repo.listAttendus(evenement.evenement_id);
    const participations = await repo.listParticipations(evenement.evenement_id);
    const saisie = repo.getQuantitatifSaisie ? await repo.getQuantitatifSaisie(evenement.evenement_id) : null;
    const modeSuivi = inferModeSuivi(evenement);
    let compteurs = computeTaux(participations, attendus);
    let attendusInclus = attendus.filter(a => a.inclus !== false).length;
    if(modeSuivi === MODES.QUANTITATIF){
      const official = saisie ? officialFromQuantitatif(saisie) : null;
      attendusInclus = saisie ? Number(saisie.nb_attendus) : 0;
      compteurs = official
        ? { ...official, presents: official.volumes.presents }
        : { numerator: 0, denominator: 0, percentage: null, presents: saisie ? saisie.nb_presents : 0 };
    }
    let legacy = null;
    if(evenement.origine === 'LEGACY_AGGREGATED' && repo.getLegacyByEvenementId){
      legacy = await repo.getLegacyByEvenementId(evenement.evenement_id);
    }
    return {
      evenement: { ...evenement, mode_suivi: modeSuivi },
      cibles,
      compteurs,
      attendusInclus,
      legacy,
      saisieQuantitative: saisie,
      modeSuivi
    };
  }

  async function listEvenements(query){
    const annee = query?.annee || query?.year || null;
    const statut = query?.statut || query?.status || null;
    const domaine = query?.domaineCode || query?.domaine_code || query?.domaine || null;
    const evenements = await repo.listEvenements({
      annee: annee ? Number(annee) : null,
      statut: statut && statut !== 'tous' ? statut : null,
      domaine: domaine && domaine !== 'tous' ? domaine : null
    });
    const items = [];
    for(const evenement of evenements){
      items.push(await summarizeEvenement(evenement));
    }
    return { evenements: items };
  }

  async function hydratePersonnes(ids){
    const unique = [...new Set((ids || []).filter(Boolean).map(String))];
    const personnes = {};
    for(const id of unique){
      const personne = await repo.getPersonne(id);
      if(personne) personnes[id] = personne;
    }
    return personnes;
  }

  async function lireEvenement(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    const cibleIds = await repo.listEventCibleIds(eventId);
    const allCibles = await repo.listCibles();
    const cibles = allCibles.filter(c => cibleIds.includes(c.cible_id));
    const attendus = await repo.listAttendus(eventId);
    const participations = await repo.listParticipations(eventId);
    const encadrement = participations.filter(p => ROLES_ENCADREMENT.has(p.role));
    const taux = computeTaux(participations, attendus);
    const personnes = await hydratePersonnes([
      ...attendus.map(a => a.personne_id),
      ...participations.map(p => p.personne_id)
    ]);
    const journal = await repo.listJournal('evenement', eventId);
    const saisie = repo.getQuantitatifSaisie ? await repo.getQuantitatifSaisie(eventId) : null;
    const modeSuivi = inferModeSuivi(evenement);
    let compteurs = taux;
    if(modeSuivi === MODES.QUANTITATIF){
      const official = saisie ? officialFromQuantitatif(saisie) : null;
      compteurs = official
        ? { ...official, presents: official.volumes.presents, excuses: official.volumes.excuses, nonExcuses: official.volumes.nonExcuses, dispenses: official.volumes.dispenses }
        : { numerator: 0, denominator: 0, percentage: null, presents: 0, excuses: 0, nonExcuses: 0, dispenses: 0 };
    }
    let legacy = null;
    if(evenement.origine === 'LEGACY_AGGREGATED' && repo.getLegacyByEvenementId){
      legacy = await repo.getLegacyByEvenementId(eventId);
    }
    return {
      evenement: { ...evenement, mode_suivi: modeSuivi },
      cibles,
      attendus,
      participations,
      encadrement,
      personnes,
      journal,
      compteurs,
      saisieQuantitative: saisie,
      modeSuivi,
      legacy,
      version: evenement.version
    };
  }

  async function tauxEvenement(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    if(evenement.origine === 'LEGACY_AGGREGATED'){
      const legacy = repo.getLegacyByEvenementId
        ? await repo.getLegacyByEvenementId(eventId)
        : null;
      const payload = (legacy && legacy.payload_v67) || {};
      const presents = legacy ? Number(legacy.nb_presents) : 0;
      const attendu = Number(payload.total_attendu || legacy?.nb_convoques || 0);
      return {
        numerator: presents,
        denominator: attendu,
        percentage: csvImport.legacyTaux({
          nb_presents: presents,
          total_attendu: attendu,
          nb_convoques: legacy?.nb_convoques
        }),
        presents,
        officiel: false,
        kind: 'LEGACY',
        exclus: { nonRealise: true, legacy: true }
      };
    }
    if(isQuantitatif(evenement)){
      const saisie = repo.getQuantitatifSaisie ? await repo.getQuantitatifSaisie(eventId) : null;
      const official = saisie ? officialFromQuantitatif(saisie) : null;
      const realise = evenement.statut === 'REALISE';
      if(!official){
        return {
          numerator: 0,
          denominator: 0,
          percentage: null,
          officiel: false,
          kind: realise ? 'OFFICIEL' : 'PREVIEW',
          mode: MODES.QUANTITATIF,
          volumes: saisie || null
        };
      }
      return {
        ...official,
        officiel: realise,
        kind: realise ? 'OFFICIEL' : 'PREVIEW',
        mode: MODES.QUANTITATIF
      };
    }
    if(evenement.statut !== 'REALISE'){
      const attendus = await repo.listAttendus(eventId);
      const participations = await repo.listParticipations(eventId);
      const taux = computeTaux(participations, attendus);
      return {
        ...taux,
        officiel: false,
        exclus: {
          nonRealise: true,
          legacy: false
        }
      };
    }
    const attendus = await repo.listAttendus(eventId);
    const participations = await repo.listParticipations(eventId);
    return { ...computeTaux(participations, attendus), officiel: true, kind: 'NOMINATIF' };
  }

  async function rulesList(){
    if(!repo.listReglesBascule) return [];
    return repo.listReglesBascule();
  }

  async function previewContext(){
    const [domaines, cibles, rules, existingEvents, importedFingerprints] = await Promise.all([
      repo.listDomaines(),
      repo.listCibles(),
      rulesList(),
      repo.listEvenements({}),
      repo.listImportedFingerprints ? repo.listImportedFingerprints() : []
    ]);
    return { domaines, cibles, rules, existingEvents, importedFingerprints };
  }

  function previewFromCsv(csvText, context){
    const parsed = csvImport.parseExercicesCsv(csvText);
    if(!parsed.ok){
      throw new HttpError(400, parsed.error, parsed.message, { header: parsed.header, missing: parsed.missing });
    }
    const lignes = csvImport.buildPreviewRows(parsed, context);
    const summary = csvImport.summarizePreview(lignes);
    return {
      profil: csvImport.IMPORT_PROFIL,
      horizonNominatifConnu: csvImport.earliestNominativeHorizon(context.rules || []),
      separator: parsed.separator,
      encoding: parsed.encoding,
      header: parsed.header,
      extra: parsed.extra,
      lignes,
      summary
    };
  }

  async function previewImportEvenements(body){
    const csvText = String(body?.csvText || body?.csv || '');
    const preview = previewFromCsv(csvText, await previewContext());
    return { ...preview, ecriture: false };
  }

  async function commitImportEvenements(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    const filename = String(body?.filename || body?.sourceFilename || '').slice(0, 240);
    const excluded = new Set(
      (Array.isArray(body?.excludedLineNos) ? body.excludedLineNos : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const preview = previewFromCsv(csvText, await previewContext());
    const included = preview.lignes.filter((l) => !excluded.has(l.ligneNo));
    const erreurs = included.filter((l) => l.statut === 'ERREUR' && !l.dejaImporte);
    if(erreurs.length){
      throw new HttpError(422, 'import_refuse', 'Des lignes en erreur doivent être corrigées ou exclues avant commit.', {
        erreurs: erreurs.map((l) => ({ ligneNo: l.ligneNo, code: l.code, raison: l.raison })),
        summary: preview.summary
      });
    }
    if(!included.length){
      throw new HttpError(400, 'import_vide', 'Aucune ligne à importer.');
    }

    return repo.withTransaction(async (tx) => {
      const sourceSha = csvImport.sha256Hex(csvText);
      const created = [];
      const skipped = [];
      const imported = [];

      for(const line of included){
        if(line.dejaImporte || line.actionPrevue === 'IGNORER_DEJA_IMPORTE'){
          skipped.push({ ligneNo: line.ligneNo, statut: 'DEJA_IMPORTE', fingerprint: line.fingerprint });
          continue;
        }
        const origine = line.typePropose === 'LEGACY' ? 'LEGACY_AGGREGATED' : 'NOMINATIF';
        const evenement = await tx.insertEvenement({
          date: line.date,
          domaine_code: line.domaine,
          libelle: line.libelle,
          statut: 'PLANIFIE',
          origine,
          mode_suivi: origine === 'LEGACY_AGGREGATED' ? 'LEGACY' : 'NOMINATIF',
          cible_ids: line.cibleId ? [line.cibleId] : []
        });
        let legacy = null;
        if(line.typePropose === 'LEGACY'){
          legacy = await tx.insertLegacy({
            source_record_id: line.fingerprint,
            date: line.date,
            domaine_code: line.domaine,
            libelle: line.libelle,
            nb_convoques: line.numbers.nb_convoques,
            nb_presents: line.numbers.nb_presents,
            nb_excuses: line.numbers.nb_excuses_total,
            nb_absents: line.numbers.nb_absents_non_excuses,
            evenement_id: evenement.evenement_id,
            fingerprint: line.fingerprint,
            payload_v67: {
              provenance: 'CSV_MONITORING_F7',
              profil: csvImport.IMPORT_PROFIL,
              format: csvImport.IMPORT_PROFIL,
              a_comptabiliser: line.aComptabiliser,
              a_comptabiliser_scope: false,
              legacy_inclus_stats: line.aComptabiliser,
              public_cible: line.publicCible,
              modele: line.source.modele || line.libelle,
              libelle: line.libelle,
              nb_permutation: line.numbers.nb_permutation,
              nb_ext_dap_y1: line.numbers.nb_ext_dap_y1,
              nb_ext_dap_y2: line.numbers.nb_ext_dap_y2,
              nb_ext_dap_y3: line.numbers.nb_ext_dap_y3,
              nb_ext_dap_y4: line.numbers.nb_ext_dap_y4,
              nb_ext_dap_total: line.numbers.nb_ext_dap_total,
              nb_excuses_maladie: line.numbers.nb_excuses_maladie,
              nb_excuses_accident: line.numbers.nb_excuses_accident,
              nb_excuses_professionnel: line.numbers.nb_excuses_professionnel,
              nb_excuses_prive: line.numbers.nb_excuses_prive,
              total_detail: line.numbers.total_detail,
              total_attendu: line.numbers.total_attendu,
              remarque: line.source.remarque,
              source: line.source
            }
          });
        }
        created.push({
          ligneNo: line.ligneNo,
          evenementId: evenement.evenement_id,
          legacyId: legacy ? legacy.legacy_id : null,
          typePropose: line.typePropose
        });
        imported.push({ line, evenement, legacy });
      }

      const importRow = await tx.insertImport({
        source_filename: filename || null,
        source_sha256: sourceSha,
        imported_par: actorId(actor),
        statut: 'COMMITE',
        nb_lignes: preview.lignes.length,
        rapport: {
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded]
        }
      });

      for(const line of preview.lignes){
        if(excluded.has(line.ligneNo)){
          await tx.insertImportLigne({
            import_id: importRow.import_id,
            ligne_no: line.ligneNo,
            fingerprint: line.fingerprint,
            statut: 'EXCLU',
            type_propose: line.typePropose,
            payload_source: line.source,
            raison: line.raison,
            action: 'EXCLU'
          });
          continue;
        }
        const done = imported.find((item) => item.line.ligneNo === line.ligneNo);
        const skip = skipped.find((item) => item.ligneNo === line.ligneNo);
        await tx.insertImportLigne({
          import_id: importRow.import_id,
          ligne_no: line.ligneNo,
          fingerprint: line.fingerprint,
          statut: skip ? 'DEJA_IMPORTE' : 'IMPORTE',
          type_propose: line.typePropose,
          evenement_id: done ? done.evenement.evenement_id : null,
          legacy_id: done && done.legacy ? done.legacy.legacy_id : null,
          payload_source: line.source,
          raison: line.raison,
          action: skip ? 'IGNORER_DEJA_IMPORTE' : line.actionPrevue
        });
      }

      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'import',
        entite_id: importRow.import_id,
        action: 'IMPORTER_EVENEMENTS',
        apres: {
          filename,
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded]
        }
      });

      return {
        importId: importRow.import_id,
        created,
        skipped,
        excluded: [...excluded],
        summary: {
          nbLignes: preview.lignes.length,
          imported: created.length,
          dejaImporte: skipped.length,
          exclus: excluded.size
        }
      };
    });
  }

  async function suggestModeSuivi(query = {}){
    const cibleIds = []
      .concat(query.cibleIds || query.cible_ids || [])
      .concat(String(query.cibles || '').split(','))
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    const date = isoDate(query.date) || String(query.date || '').trim();
    if(!cibleIds.length || !date){
      return {
        suggested: null,
        requireExplicit: true,
        reason: 'date_et_cibles_requises',
        message: 'Indiquez la date et la cible pour proposer un mode de suivi.'
      };
    }
    const rules = repo.listReglesBascule ? await repo.listReglesBascule() : [];
    const details = [];
    for(const cibleId of cibleIds){
      const cible = await repo.getCible(cibleId);
      if(!cible){
        throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.', { cibleId });
      }
      const rule = csvImport.resolveBasculeRule(cible.cible_id, cible.domaine_code, rules);
      const nominatif = Boolean(rule && date >= rule.date_bascule);
      details.push({
        cibleId,
        suggested: nominatif ? MODES.NOMINATIF : MODES.QUANTITATIF,
        rule: rule || null
      });
    }
    const unique = [...new Set(details.map((item) => item.suggested))];
    if(unique.length !== 1){
      return {
        suggested: null,
        requireExplicit: true,
        reason: 'cibles_divergentes',
        message: 'Les cibles n’ont pas la même règle de suivi. Choisissez Nominatif ou Quantitatif.',
        details
      };
    }
    return {
      suggested: unique[0],
      requireExplicit: false,
      reason: unique[0] === MODES.NOMINATIF ? 'bascule_nominative' : 'defaut_quantitatif',
      nominatifPossible: true,
      message: unique[0] === MODES.NOMINATIF
        ? 'Une règle de bascule nominative s’applique à cette date. Mode proposé : Nominatif.'
        : 'Aucune bascule nominative à cette date. Mode proposé : Quantitatif. Le nominatif reste possible si vous le choisissez.',
      details
    };
  }

  function summarizeLite(evenement){
    return {
      id: evenement.evenement_id,
      date: evenement.date,
      domaine: evenement.domaine_code,
      libelle: evenement.libelle,
      statut: evenement.statut,
      version: evenement.version,
      modeSuivi: inferModeSuivi(evenement)
    };
  }

  async function previewTauxQuantitatif(eventId, body = {}){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    requireQuantitatif(evenement);
    const row = volumesOrThrow(body);
    if(Number(row.nb_permutations || 0) > 0 && evenement.domaine_code !== 'DAP'){
      throw new HttpError(422, 'permutation_hors_dap', 'Les permutations quantitatives ne sont définies que pour le domaine DAP.');
    }
    const official = officialFromQuantitatif(row);
    if(!official){
      return {
        evenement: summarizeLite(evenement),
        valide: false,
        officiel: false,
        volumes: row,
        taux: null,
        message: 'Présents + excusés + non excusés + dispensés doit être égal aux attendus. Les permutations sont un sous-ensemble des présents.'
      };
    }
    const realise = evenement.statut === 'REALISE';
    return {
      evenement: summarizeLite(evenement),
      valide: true,
      officiel: realise,
      volumes: row,
      taux: {
        ...official,
        source: realise ? 'OFFICIEL' : 'PREVIEW'
      },
      message: realise
        ? 'Taux officiel SCOPE'
        : 'Aperçu calculé par le serveur. Ce n’est pas encore un taux officiel réalisé.'
    };
  }

  async function enregistrerSaisieQuantitative(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const row = volumesOrThrow(body);
    officialQuantitatifOrThrow(row);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      requireQuantitatif(evenement);
      if(evenement.statut !== 'PLANIFIE'){
        throw new HttpError(422, 'statut_invalide', 'Saisie possible uniquement sur PLANIFIE.');
      }
      if(Number(row.nb_permutations || 0) > 0 && evenement.domaine_code !== 'DAP'){
        throw new HttpError(422, 'permutation_hors_dap', 'Les permutations quantitatives ne sont définies que pour le domaine DAP.');
      }
      const saved = await tx.upsertQuantitatifSaisie({
        evenement_id: eventId,
        ...row,
        auteur_id: actorId(actor)
      });
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'SAISIE_QUANTITATIVE',
        apres: saved
      });
      return { evenement: next, version: next.version, saisie: saved };
    });
  }

  async function convertirNominatif(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    if(body.confirmation !== true && String(body.confirmation || '').toLowerCase() !== 'true'){
      throw new HttpError(400, 'confirmation_requise', 'Confirmez la conversion : les volumes quantitatifs seront supprimés.');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      const mode = inferModeSuivi(evenement);
      if(mode === MODES.NOMINATIF){
        throw new HttpError(422, 'deja_nominatif', 'Cet événement est déjà nominatif.');
      }
      if(mode === MODES.LEGACY){
        throw new HttpError(422, 'legacy', 'Un agrégat historique ne peut pas être converti.');
      }
      if(mode !== MODES.QUANTITATIF){
        throw new HttpError(422, 'conversion_interdite', 'La conversion nominatif → quantitatif est interdite.');
      }
      if(evenement.statut === 'REALISE'){
        throw new HttpError(422, 'statut_invalide', 'Réouvrez d’abord la séance avant de passer en nominatif.');
      }
      if(evenement.statut !== 'PLANIFIE'){
        throw new HttpError(422, 'statut_invalide', 'Conversion possible uniquement avant clôture.');
      }
      await tx.deleteQuantitatifSaisie(eventId);
      const next = await bumpOrConflict(tx, eventId, baseVersion, { mode_suivi: MODES.NOMINATIF });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'CONVERTIR_NOMINATIF',
        avant: { modeSuivi: MODES.QUANTITATIF },
        apres: { modeSuivi: MODES.NOMINATIF }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function convertirQuantitatif(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    throw new HttpError(
      422,
      'conversion_interdite',
      'La conversion nominatif → quantitatif est interdite : elle masquerait une traçabilité nominative déjà constituée.'
    );
  }

  async function assertNoAffectationOverlap(personneId, cibleId, dateDebut, dateFin, ignoreId){
    const existing = await repo.listAffectations({ personneId });
    for(const a of existing){
      if(a.cible_id !== cibleId) continue;
      if(ignoreId && a.affectation_id === ignoreId) continue;
      if(rangesOverlap(a.date_debut, a.date_fin, dateDebut, dateFin || null)){
        throw new HttpError(422, 'chevauchement', 'Chevauchement d’affectation Personne × Cible.');
      }
    }
  }

  async function assertNoAffectationOverlapInDomain(personneId, cibleId, dateDebut, dateFin, ignoreId, store){
    const dbx = store || repo;
    const cible = await dbx.getCible(cibleId);
    if(!cible) throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.');
    const existing = await dbx.listAffectations({ personneId });
    for(const a of existing){
      if(ignoreId && a.affectation_id === ignoreId) continue;
      if(a.cible_id === cibleId && rangesOverlap(a.date_debut, a.date_fin, dateDebut, dateFin || null)){
        throw new HttpError(422, 'chevauchement', 'Chevauchement d’affectation Personne × Cible.');
      }
      const other = await dbx.getCible(a.cible_id);
      if(!other || other.domaine_code !== cible.domaine_code) continue;
      if(a.cible_id === cibleId) continue;
      if(rangesOverlap(a.date_debut, a.date_fin, dateDebut, dateFin || null)){
        throw new HttpError(
          422,
          'chevauchement_domaine',
          'Chevauchement d’affectations dans le même domaine. Les appartenances multi-domaines restent autorisées.'
        );
      }
    }
  }

  return {
    referentiels,
    listPersonnes,
    affectationsValides,
    listEvenements,
    createEvenement,
    patchEvenement,
    previewAttendus,
    resolveEligiblePopulation,
    figerPopulation,
    ajouterException,
    retirerAttendu,
    enregistrerParticipations,
    ajouterEncadrement,
    cloturer,
    reouvrir,
    annulerEvenement,
    lireEvenement,
    tauxEvenement,
    suggestModeSuivi,
    previewTauxQuantitatif,
    enregistrerSaisieQuantitative,
    convertirNominatif,
    convertirQuantitatif,
    previewImportEvenements,
    commitImportEvenements,
    createPersonne,
    listPeriodes,
    ouvrirPeriode,
    cloturerPeriode,
    archiverPersonne,
    reactiverPersonne,
    changerAffectation,
    previewPersonnelSync,
    commitPersonnelSync,
    assertNoAffectationOverlap,
    assertNoAffectationOverlapInDomain,
    computeTaux
  };
}

module.exports = { createScopeService, requireBaseVersion };
