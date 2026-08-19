const { randomUUID } = require('crypto');
const {
  HttpError,
  isoDate,
  isAffectationValide,
  personneActiveA,
  computeTaux,
  validateParticipationPatch,
  validateCloture,
  rangesOverlap,
  ROLES_ENCADREMENT
} = require('./_scope-rules');
const csvImport = require('./_scope-csv-import');

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
    const [domaines, cibles] = await Promise.all([repo.listDomaines(), repo.listCibles()]);
    return {
      domaines: domaines.map(d => ({
        code: d.code,
        libelle: d.libelle,
        libelleAffiche: d.code === 'PR' ? 'PAPR' : d.code,
        actif: d.actif !== false
      })),
      cibles: cibles.map(c => ({
        cibleId: c.cible_id,
        domaineCode: c.domaine_code,
        niveauCode: c.niveau_code,
        libelle: c.libelle,
        actif: c.actif !== false
      }))
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
    const domaine = String(body.domaineCode || body.domaine_code || '').trim();
    const domaines = await repo.listDomaines();
    if(!domaines.some(d => d.code === domaine && d.actif !== false)){
      throw new HttpError(400, 'domaine_inconnu', 'Domaine inconnu.');
    }
    const libelle = String(body.libelle || '').trim();
    if(!libelle) throw new HttpError(400, 'libelle_vide', 'Le libellé est obligatoire.');
    const cibleIds = Array.isArray(body.cibleIds || body.cible_ids) ? (body.cibleIds || body.cible_ids) : [];
    if(!cibleIds.length) throw new HttpError(400, 'cibles_obligatoires', 'Au moins une cible est obligatoire.');
    const cibles = await repo.listCibles();
    for(const id of cibleIds){
      const cible = cibles.find(c => c.cible_id === id);
      if(!cible || cible.domaine_code !== domaine){
        throw new HttpError(400, 'cible_invalide', 'Cible inconnue ou hors domaine.');
      }
    }
    const origine = body.origine === 'LEGACY_AGGREGATED' ? 'LEGACY_AGGREGATED' : 'NOMINATIF';
    const evenement = await repo.insertEvenement({
      date,
      domaine_code: domaine,
      libelle,
      statut: 'PLANIFIE',
      origine,
      cible_ids: cibleIds
    });
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'evenement',
      entite_id: evenement.evenement_id,
      action: 'CREER',
      apres: { date, domaine, libelle, cibleIds, origine }
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

  async function previewAttendus(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    if(evenement.origine === 'LEGACY_AGGREGATED'){
      return { count: 0, personnes: [], note: 'Legacy agrégé : aucune population nominative.' };
    }
    const cibleIds = await repo.listEventCibleIds(eventId);
    const affectations = await repo.listAffectationsForCibles(cibleIds, evenement.date);
    const byPersonne = new Map();
    for(const aff of affectations){
      const personne = await repo.getPersonne(aff.personne_id);
      if(!personne || !personneActiveA(personne, evenement.date)) continue;
      if(!isAffectationValide(aff, evenement.date)) continue;
      const cible = await repo.getCible(aff.cible_id);
      const current = byPersonne.get(aff.personne_id) || {
        personneId: aff.personne_id,
        nip: personne.nip,
        nom: personne.nom,
        prenom: personne.prenom,
        cibles: [],
        origine: 'REGLE',
        motifInclusion: 'affectation_valide'
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

  async function figerPopulation(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.origine === 'LEGACY_AGGREGATED'){
        throw new HttpError(422, 'legacy', 'Impossible de figer une population nominative sur un agrégat legacy.');
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
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Saisie possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Population non figée.');
      for(const item of items){
        const personneId = item.personneId || item.personne_id;
        const attendu = await tx.getAttendu(eventId, personneId);
        if(!attendu || attendu.inclus === false){
          throw new HttpError(422, 'non_attendu', 'Saisie réservée aux personnes attendues incluses.', { personneId });
        }
        const patch = validateParticipationPatch(item);
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
    const compteurs = computeTaux(participations, attendus);
    const attendusInclus = attendus.filter(a => a.inclus !== false).length;
    let legacy = null;
    if(evenement.origine === 'LEGACY_AGGREGATED' && repo.getLegacyByEvenementId){
      legacy = await repo.getLegacyByEvenementId(evenement.evenement_id);
    }
    return { evenement, cibles, compteurs, attendusInclus, legacy };
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
    let legacy = null;
    if(evenement.origine === 'LEGACY_AGGREGATED' && repo.getLegacyByEvenementId){
      legacy = await repo.getLegacyByEvenementId(eventId);
    }
    return {
      evenement,
      cibles,
      attendus,
      participations,
      encadrement,
      personnes,
      journal,
      compteurs: taux,
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

  return {
    referentiels,
    listPersonnes,
    affectationsValides,
    listEvenements,
    createEvenement,
    patchEvenement,
    previewAttendus,
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
    previewImportEvenements,
    commitImportEvenements,
    assertNoAffectationOverlap,
    computeTaux
  };
}

module.exports = { createScopeService, requireBaseVersion };
