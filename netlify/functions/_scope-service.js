const { randomUUID } = require('crypto');
const {
  HttpError,
  isoDate,
  isAffectationValide,
  computeTaux,
  validateParticipationPatch,
  validateCloture,
  expectedPopulationCoherence,
  rangesOverlap,
  ROLES_ENCADREMENT
} = require('./_scope-rules');
const {
  TYPES_PERIODE,
  MOTIFS_INDISPONIBLE,
  dayBefore,
  evaluateEligibility,
  assertPeriodCompatible,
  deriveStatutCourant,
  closeAllOpenAffectations,
  filterAttendusEligibleAtDate
} = require('./_scope-personnel');
const personnelSync = require('./_scope-personnel-sync');
const csvImport = require('./_scope-csv-import');
const importContract = require('./_scope-import-contract');
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
const { matchesAssignmentToEventTarget } = require('./_scope-target-resolution');
const { isQualificationEvenement, wantsQualification } = require('./_scope-qualification');
const { computePrExerciseParticipationState, prSessionLabel, canCloseLastSession } = require('./_scope-cycle-rules');
const display = require('../../assets/js/scope-personnel-display.js');
const referentialDisplay = require('../../assets/js/scope-personnel-referentials.js');

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

function compactCodePart(value, fallback){
  const text = String(value || fallback || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '');
  return text || String(fallback || 'SCOPE');
}

async function nextManualCode(repo, body, cibleIds){
  if(body.codeCours || body.code_cours) return String(body.codeCours || body.code_cours).trim();
  const seq = repo.nextManualEventSequence ? await repo.nextManualEventSequence() : 1;
  const suffix = `S${String(seq).padStart(3, '0')}`;
  const stat = body.statCom || body.stat_com || body.codeSource || body.code_source || 'SCOPE';
  const qui = body.qui || body.publicCible || body.public_cible || compactCodePart((cibleIds || []).length, 'GEN');
  return importContract.buildCodeCours(stat, qui, suffix);
}

function isQuantitatif(evenement){
  return inferModeSuivi(evenement) === MODES.QUANTITATIF;
}

function isPrParticipantContribution(statut, role){
  const r = String(role || 'PARTICIPANT').toUpperCase();
  const s = String(statut || '').toUpperCase();
  if(r === 'SURVEILLANT') return s === 'PRESENT';
  return r === 'PARTICIPANT' && ['PRESENT', 'PERMUTATION', 'DISPENSE'].includes(s);
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
  function comparePeopleByGradeName(a, b){
    const rankOf = (value) => {
      const code = referentialDisplay.canonicalGradeCode ? referentialDisplay.canonicalGradeCode(value) : String(value || '').trim();
      const row = (referentialDisplay.GRADES || []).find((item) => item.code === code);
      return row ? Number(row.rang) : null;
    };
    const ra = rankOf(a?.grade);
    const rb = rankOf(b?.grade);
    let grade = 0;
    if(ra !== null && rb !== null && ra !== rb) grade = rb - ra;
    else if(ra !== null && rb === null) grade = -1;
    else if(ra === null && rb !== null) grade = 1;
    else if(ra === null && rb === null){
      grade = String(a?.grade || '').localeCompare(String(b?.grade || ''), 'fr', { sensitivity: 'base', numeric: true });
    }
    return grade
      || String(a?.nom || '').localeCompare(String(b?.nom || ''), 'fr', { sensitivity: 'base', numeric: true })
      || String(a?.prenom || '').localeCompare(String(b?.prenom || ''), 'fr', { sensitivity: 'base', numeric: true })
      || String(a?.nip || '').localeCompare(String(b?.nip || ''), 'fr', { sensitivity: 'base', numeric: true });
  }

  async function referentiels(){
    const [domaines, cibles, suivi] = await Promise.all([
      repo.listDomaines(),
      repo.listCibles(),
      repo.listSuiviNominatif ? repo.listSuiviNominatif() : Promise.resolve([])
    ]);
    const mappedDomaines = domaines.map(d => ({
      code: d.code,
      libelle: d.libelle,
      libelleAffiche: domaineAffiche(d.code, d),
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
    const leaf = leafDomaines[0];
    if(leafDomaines.length === 1 && domaine !== leaf){
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
    const codeCours = await nextManualCode(repo, body, cibleIds);
    const evenement = await repo.insertEvenement({
      date,
      domaine_code: domaine,
      sous_domaine_code: isSousDomaineFospec(domaine) ? domaine : null,
      libelle,
      statut: 'PLANIFIE',
      origine,
      mode_suivi: modeSuivi,
      code_cours: codeCours,
      code_source: codeCours,
      source_type: origine === 'IMPORT_CSV' ? 'CSV' : 'MANUEL',
      heure_debut: body.heureDebut || body.heure_debut || body.debut || null,
      heure_fin: body.heureFin || body.heure_fin || body.fin || null,
      salle: body.salle || null,
      responsable: body.responsable || null,
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
    if(body.codeCours !== undefined || body.code_cours !== undefined){
      throw new HttpError(422, 'code_cours_immutable', 'CODE COURS immuable après création.');
    }
    if(body.libelle !== undefined){
      const libelle = String(body.libelle || '').trim();
      if(!libelle) throw new HttpError(400, 'libelle_vide', 'Le libellé est obligatoire.');
      patch.libelle = libelle;
    }
    const wantsDate = body.date !== undefined;
    const wantsDomaine = body.domaineCode !== undefined || body.domaine_code !== undefined;
    const wantsCibles = body.cibleIds !== undefined || body.cible_ids !== undefined;
    if(evenement.population_figee && (wantsDate || wantsDomaine)){
      throw new HttpError(422, 'population_figee_immutable', 'Date et domaine ne peuvent plus être modifiés après gel.');
    }
    if(wantsCibles && evenement.statut !== 'PLANIFIE'){
      throw new HttpError(422, 'cible_immutable_cloture', 'La cible d’un événement réalisé n’est pas modifiable.');
    }
    if(wantsDate){
      const date = isoDate(body.date);
      if(!date) throw new HttpError(400, 'date_invalide', 'Date invalide.');
      patch.date = date;
    }
    if(wantsDomaine){
      patch.domaine_code = String(body.domaineCode || body.domaine_code);
    }
    if(body.heureDebut !== undefined || body.heure_debut !== undefined || body.debut !== undefined){
      patch.heure_debut = body.heureDebut || body.heure_debut || body.debut || null;
    }
    if(body.heureFin !== undefined || body.heure_fin !== undefined || body.fin !== undefined){
      patch.heure_fin = body.heureFin || body.heure_fin || body.fin || null;
    }
    if(body.salle !== undefined) patch.salle = String(body.salle || '').trim() || null;
    if(body.responsable !== undefined) patch.responsable = String(body.responsable || '').trim() || null;
    const next = await repo.withTransaction(async (tx) => {
      const updated = await bumpOrConflict(tx, eventId, baseVersion, patch);
      let current = updated;
      if(wantsCibles){
        const cibleIds = body.cibleIds || body.cible_ids;
        if(!Array.isArray(cibleIds) || !cibleIds.length){
          throw new HttpError(400, 'cibles_obligatoires', 'Au moins une cible est obligatoire.');
        }
        await tx.setEventCibles(eventId, cibleIds);
        if(evenement.population_figee){
          await syncExpectedPopulationForEvents(tx, [await tx.getEvent(eventId)], actor, { allPersons: true });
          current = await tx.getEvent(eventId);
        }
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: wantsCibles && evenement.population_figee ? 'RETARGET_CIBLES' : 'MODIFIER',
        avant: { version: evenement.version },
        apres: {
          version: current.version,
          patch,
          cibleIds: wantsCibles ? (body.cibleIds || body.cible_ids) : undefined,
          populationResynced: Boolean(wantsCibles && evenement.population_figee)
        }
      });
      return current;
    });
    return { evenement: next, version: next.version };
  }

  async function resolveEligiblePopulation({ eventDate, domaineCode, sousDomaineCode, cibleIds, suiviNominatif, store }){
    const dbx = store || repo;
    const date = isoDate(eventDate);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’événement invalide.');
    const ids = Array.isArray(cibleIds) ? cibleIds.filter(Boolean) : [];
    const allCibles = dbx.listCibles ? await dbx.listCibles() : [];
    const requestedCibles = ids.map((id) => allCibles.find((c) => c.cible_id === id)).filter(Boolean);
    const expanded = new Set(ids);
    for(const cible of requestedCibles){
      const domaine = String(cible.domaine_code || '').toUpperCase();
      if(cible.niveau_code === 'GEN' && ['DPS', 'DAP', 'JSP', 'PR'].includes(domaine)){
        allCibles
          .filter((c) => c.domaine_code === domaine && c.niveau_code !== 'GEN')
          .forEach((c) => expanded.add(c.cible_id));
      }
    }
    const populationIds = [...expanded];
    const rules = suiviNominatif || (dbx.listSuiviNominatif ? await dbx.listSuiviNominatif() : []);
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
    const affectations = await dbx.listAffectationsForCibles(populationIds, date);
    const byPersonne = new Map();
    for(const aff of affectations){
      if(!isAffectationValide(aff, date)) continue;
      const personne = await dbx.getPersonne(aff.personne_id);
      if(!personne) continue;
      const periodes = dbx.listPersonnesPeriodes
        ? await dbx.listPersonnesPeriodes(aff.personne_id)
        : [];
      const eligibility = evaluateEligibility(personne, periodes, date);
      if(!eligibility.eligible) continue;
      const cible = await dbx.getCible(aff.cible_id);
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

  function cibleMotifFromPopulationPerson(person){
    const parts = (person?.cibles || [])
      .map((c) => `${c.domaineCode || c.domaine_code}_${c.niveauCode || c.niveau_code}`)
      .filter(Boolean);
    return parts.length ? parts.join('|') : (person?.motifInclusion || 'affectation_valide_a_date');
  }

  function normalizeIdList(ids){
    return [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
  }

  function participationHasBusinessTrace(participation){
    if(!participation) return false;
    const role = String(participation.role || 'PARTICIPANT').toUpperCase();
    const statut = String(participation.statut || 'NON_RENSEIGNE').toUpperCase();
    if(ROLES_ENCADREMENT.has(role)) return true;
    if(['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION'].includes(statut)) return true;
    if(participation.motif_absence || participation.commentaire) return true;
    const source = String(participation.source || '').toUpperCase();
    return source && !['GENERATION', 'SYNC_POPULATION', 'RESET'].includes(source);
  }

  function isStaleNonConcerneForExpected(participation){
    if(!participation) return false;
    const role = String(participation.role || 'PARTICIPANT').toUpperCase();
    if(ROLES_ENCADREMENT.has(role)) return false;
    return String(participation.statut || '').toUpperCase() === 'NON_CONCERNE'
      && !participationHasBusinessTrace(Object.assign({}, participation, { statut: 'NON_RENSEIGNE' }));
  }

  async function eventPopulationCibleIds(dbx, eventId, ciblesByEvent){
    if(ciblesByEvent && ciblesByEvent.has(eventId)){
      return ciblesByEvent.get(eventId).map((row) => row.cible_id).filter(Boolean);
    }
    return dbx.listEventCibleIds ? dbx.listEventCibleIds(eventId) : [];
  }

  async function expandEventCibleIds(dbx, cibleIds){
    const ids = Array.isArray(cibleIds) ? cibleIds.filter(Boolean) : [];
    const allCibles = dbx.listCibles ? await dbx.listCibles() : [];
    const requested = ids.map((id) => allCibles.find((c) => String(c.cible_id) === String(id))).filter(Boolean);
    const expanded = new Set(ids.map((id) => String(id)));
    for(const cible of requested){
      const domaine = String(cible.domaine_code || '').toUpperCase();
      if(cible.niveau_code === 'GEN' && ['DPS', 'DAP', 'JSP', 'PR'].includes(domaine)){
        allCibles
          .filter((c) => c.domaine_code === domaine && c.niveau_code !== 'GEN')
          .forEach((c) => expanded.add(String(c.cible_id)));
      }
    }
    return { expanded, allCibles };
  }

  async function evaluatePersonExpectedForEvent(dbx, evenement, cibleIds, personneId){
    const date = isoDate(evenement && evenement.date);
    if(!date || !personneId) return null;
    const personne = dbx.getPersonne ? await dbx.getPersonne(personneId) : null;
    if(!personne) return null;
    const periodes = dbx.listPersonnesPeriodes ? await dbx.listPersonnesPeriodes(personneId) : [];
    const eligibility = evaluateEligibility(personne, periodes, date);
    if(!eligibility.eligible) return null;
    const { expanded, allCibles } = await expandEventCibleIds(dbx, cibleIds);
    const affs = dbx.listAffectations ? await dbx.listAffectations({ personneId, date }) : [];
    const matched = [];
    const seen = new Set();
    for(const aff of affs || []){
      if(!isAffectationValide(aff, date)) continue;
      const cibleId = aff.cible_id ? String(aff.cible_id) : '';
      const hit = (cibleId && expanded.has(cibleId)
        ? allCibles.find((c) => String(c.cible_id) === cibleId)
        : null)
        || allCibles.find((c) => expanded.has(String(c.cible_id)) && matchesAssignmentToEventTarget(aff, c));
      if(!hit || seen.has(String(hit.cible_id))) continue;
      seen.add(String(hit.cible_id));
      matched.push({
        cibleId: hit.cible_id,
        niveauCode: hit.niveau_code,
        domaineCode: hit.domaine_code
      });
    }
    if(!matched.length) return null;
    return {
      personneId: personne.personne_id || personneId,
      nip: personne.nip,
      nom: personne.nom,
      prenom: personne.prenom,
      cibles: matched,
      origine: 'REGLE',
      motifInclusion: 'affectation_valide_a_date',
      eligibility
    };
  }

  async function resolveExpectedByPersonForEvent(dbx, evenement, cibleIds, onlyPersonneIds){
    const scoped = normalizeIdList(onlyPersonneIds);
    if(scoped.length){
      const map = new Map();
      for(const pid of scoped){
        const expected = await evaluatePersonExpectedForEvent(dbx, evenement, cibleIds, pid);
        if(expected) map.set(String(pid), expected);
      }
      return map;
    }
    const population = await resolveEligiblePopulation({
      eventDate: evenement.date,
      domaineCode: evenement.domaine_code,
      sousDomaineCode: evenement.sous_domaine_code,
      cibleIds,
      store: previewPopulationStore(dbx)
    });
    return new Map((population.personnes || []).map((person) => [String(person.personneId), person]));
  }

  function eventCiblesMatchAffected(rows, affectedCibleIds, affectedDomaines){
    for(const row of rows || []){
      const cibleId = String(row.cible_id || '');
      const domaine = String(row.domaine_code || '').toUpperCase();
      const niveau = String(row.niveau_code || '').toUpperCase();
      if(affectedCibleIds.has(cibleId)) return true;
      if(niveau === 'GEN' && affectedDomaines.has(domaine)) return true;
    }
    return false;
  }

  async function syncExpectedPopulationForEvents(dbx, events, actor, options = {}){
    const touchedIds = new Set(normalizeIdList(options.personneIds || options.personne_ids));
    const allPersons = options.allPersons === true || options.all_persons === true;
    const dryRun = options.dryRun === true || options.dry_run === true;
    const summary = {
      ok: true,
      scope: 'EXPECTED_POPULATION',
      personnes: touchedIds.size,
      dryRun,
      eventsScanned: (events || []).length,
      eventsRecalculated: 0,
      attendusAdded: 0,
      attendusRemoved: 0,
      reclassifiedManual: 0,
      participationsCreated: 0,
      participationsPreserved: 0,
      skippedClosed: 0,
      skippedQuantitatif: 0,
      skippedUnfrozen: 0,
      details: []
    };
    for(const evenement of events || []){
      if(!evenement) continue;
      if(evenement.statut !== 'PLANIFIE'){
        summary.skippedClosed += 1;
        continue;
      }
      if(evenement.origine === 'LEGACY_AGGREGATED' || isQuantitatif(evenement)){
        summary.skippedQuantitatif += 1;
        continue;
      }
      if(!evenement.population_figee){
        summary.skippedUnfrozen += 1;
        continue;
      }
      const eventId = evenement.evenement_id;
      const cibleIds = await eventPopulationCibleIds(dbx, eventId, options.ciblesByEvent);
      const expectedByPerson = await resolveExpectedByPersonForEvent(
        dbx,
        evenement,
        cibleIds,
        allPersons ? [] : [...touchedIds]
      );
      const attendus = options.attendusByEvent?.get(eventId) || (dbx.listAttendus ? await dbx.listAttendus(eventId) : []);
      const participations = options.participationsByEvent?.get(eventId) || (dbx.listParticipations ? await dbx.listParticipations(eventId) : []);
      const attendusByPerson = new Map(attendus.map((row) => [String(row.personne_id), row]));
      const participationsByPerson = new Map(participations.map((row) => [String(row.personne_id), row]));
      const candidateIds = allPersons ? new Set() : new Set(touchedIds);
      if(allPersons){
        for(const id of expectedByPerson.keys()) candidateIds.add(id);
        for(const id of attendusByPerson.keys()) candidateIds.add(id);
      }else{
        for(const id of expectedByPerson.keys()){
          if(touchedIds.has(id)) candidateIds.add(id);
        }
      }
      let changed = false;
      const eventDetails = {
        eventId,
        date: evenement.date,
        libelle: evenement.libelle,
        domaine: evenement.domaine_code,
        added: [],
        reclassified: [],
        removed: [],
        preserved: []
      };
      for(const id of candidateIds){
        const expected = expectedByPerson.get(id);
        const attendu = attendusByPerson.get(id);
        const participation = participationsByPerson.get(id);
        if(expected){
          const wasManual = attendu && attendu.origine === 'EXCEPTION_AJOUT';
          if(!attendu || attendu.inclus === false || wasManual){
            const motifInclusion = cibleMotifFromPopulationPerson(expected);
            if(!dryRun){
              await dbx.upsertAttendu({
                evenement_id: eventId,
                personne_id: id,
                inclus: true,
                origine: 'REGLE',
                origine_retrait: null,
                motif_inclusion: motifInclusion
              });
            }
            const detail = {
              personneId: id,
              nip: expected.nip || null,
              nom: expected.nom || null,
              prenom: expected.prenom || null,
              motifInclusion
            };
            if(wasManual) summary.reclassifiedManual += 1;
            else summary.attendusAdded += 1;
            if(wasManual) eventDetails.reclassified.push(detail);
            else eventDetails.added.push(detail);
            changed = true;
          }
          if(!participation){
            if(!dryRun){
              await dbx.upsertParticipation({
                evenement_id: eventId,
                personne_id: id,
                statut: 'NON_RENSEIGNE',
                role: 'PARTICIPANT',
                source: 'GENERATION',
                auteur_id: actorId(actor)
              });
            }
            summary.participationsCreated += 1;
            changed = true;
          }else if(isStaleNonConcerneForExpected(participation)){
            if(!dryRun){
              await dbx.upsertParticipation({
                ...participation,
                statut: 'NON_RENSEIGNE',
                role: participation.role || 'PARTICIPANT',
                source: 'SYNC_POPULATION',
                auteur_id: actorId(actor)
              });
            }
            eventDetails.reclassified.push({ personneId: id, reason: 'non_concerne_residuel' });
            changed = true;
          }else if(!attendu || attendu.inclus === false || wasManual){
            summary.participationsPreserved += 1;
            eventDetails.preserved.push({ personneId: id, reason: 'participation_existante' });
          }
          continue;
        }
        if(attendu && attendu.inclus !== false && attendu.origine !== 'EXCEPTION_AJOUT'){
          const motifRetrait = participationHasBusinessTrace(participation)
            ? 'AFFECTATION_HORS_PERIODE_HISTORIQUE'
            : 'AFFECTATION_HORS_PERIODE';
          if(!dryRun){
            await dbx.upsertAttendu({
              ...attendu,
              inclus: false,
              origine_retrait: 'EXCEPTION_RETRAIT'
            });
          }
          eventDetails.removed.push({ personneId: id, origineRetrait: 'EXCEPTION_RETRAIT', motifRetrait });
          if(participationHasBusinessTrace(participation)){
            summary.participationsPreserved += 1;
            eventDetails.preserved.push({ personneId: id, reason: 'historique_participation' });
          }else if(participation){
            if(!dryRun){
              await dbx.upsertParticipation({
                ...participation,
                statut: 'NON_CONCERNE',
                role: participation.role || 'PARTICIPANT',
                source: 'SYNC_POPULATION',
                auteur_id: actorId(actor)
              });
            }
          }
          summary.attendusRemoved += 1;
          changed = true;
        }
      }
      if(changed){
        if(!dryRun){
          const current = await dbx.getEvent(eventId);
          await dbx.updateEventIfVersion(eventId, current.version, {
            population_version: Number(current.population_version || 0) + 1
          });
          await dbx.appendJournal({
            auteur_id: actorId(actor),
            entite: 'evenement',
            entite_id: eventId,
            action: allPersons ? 'BACKFILL_POPULATION_ATTENDUE' : 'SYNC_POPULATION_ATTENDUE',
            apres: {
              personnes: [...touchedIds],
              allPersons,
              attendusAdded: eventDetails.added.length,
              attendusRemoved: eventDetails.removed.length,
              reclassifiedManual: eventDetails.reclassified.length
            }
          });
        }
        summary.eventsRecalculated += 1;
        summary.details.push(eventDetails);
      }
    }
    return summary;
  }

  async function reconcileExpectedPopulation(options = {}, actor = {}){
    const annee = options.annee || options.year || null;
    const domaine = options.domaine || options.domaineCode || options.domaine_code || null;
    const events = repo.listEvenements ? await repo.listEvenements({ annee, domaine }) : [];
    const selected = (events || []).filter((event) => {
      if(options.eventIds && Array.isArray(options.eventIds) && !options.eventIds.includes(event.evenement_id)) return false;
      if(options.statut && event.statut !== options.statut) return false;
      return true;
    });
    return repo.withTransaction(async (tx) => syncExpectedPopulationForEvents(tx, selected, actor, {
      allPersons: true,
      dryRun: options.dryRun === true || options.dry_run === true,
      reason: options.reason || 'BACKFILL_POPULATION_ATTENDUE'
    }));
  }

  function eventDateInSyncWindow(date, from, to){
    const day = isoDate(date);
    if(!day) return true;
    const start = isoDate(from);
    const end = isoDate(to);
    if(start && day < start) return false;
    if(end && day > end) return false;
    return true;
  }

  async function syncExpectedPopulationForPersonnesInRepo(dbx, personneIds, actor, options = {}){
    const ids = normalizeIdList(personneIds);
    if(!ids.length) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
    const [listedEvents, allCibles] = await Promise.all([
      dbx.listEvenements ? dbx.listEvenements({
        statut: 'PLANIFIE',
        from: options.from || null,
        to: options.to || null
      }) : [],
      dbx.listCibles ? dbx.listCibles() : []
    ]);
    const allEvents = (listedEvents || []).filter((event) => eventDateInSyncWindow(event.date, options.from, options.to));
    const cibleById = new Map((allCibles || []).map((row) => [String(row.cible_id), row]));
    const affectedCibleIds = new Set();
    const affectedDomaines = new Set();
    for(const personneId of ids){
      const affectations = dbx.listAffectations ? await dbx.listAffectations({ personneId }) : [];
      for(const aff of affectations || []){
        const cible = cibleById.get(String(aff.cible_id)) || (dbx.getCible ? await dbx.getCible(aff.cible_id) : null);
        if(aff.cible_id) affectedCibleIds.add(String(aff.cible_id));
        const domaine = String((cible && cible.domaine_code) || aff.domaine_code || aff.domaine || '').toUpperCase();
        if(domaine) affectedDomaines.add(domaine);
      }
    }
    const plannedIds = allEvents.map((event) => event.evenement_id);
    const [eventCibles, eventAttendus, eventParticipations] = await Promise.all([
      dbx.listEventCiblesForEvents && plannedIds.length ? dbx.listEventCiblesForEvents(plannedIds) : [],
      dbx.listAttendusForEvents && plannedIds.length ? dbx.listAttendusForEvents(plannedIds) : [],
      dbx.listParticipationsForEvents && plannedIds.length ? dbx.listParticipationsForEvents(plannedIds) : []
    ]);
    const ciblesByEvent = new Map();
    for(const row of eventCibles || []){
      const eventId = row.evenement_id;
      if(!ciblesByEvent.has(eventId)) ciblesByEvent.set(eventId, []);
      ciblesByEvent.get(eventId).push(row);
    }
    const attendusByEvent = new Map();
    for(const row of eventAttendus || []){
      const eventId = row.evenement_id;
      if(!attendusByEvent.has(eventId)) attendusByEvent.set(eventId, []);
      attendusByEvent.get(eventId).push(row);
    }
    const participationsByEvent = new Map();
    for(const row of eventParticipations || []){
      const eventId = row.evenement_id;
      if(!participationsByEvent.has(eventId)) participationsByEvent.set(eventId, []);
      participationsByEvent.get(eventId).push(row);
    }
    const touched = new Set(ids);
    const removeOnly = String(options.reason || '') === 'PERSONNEL_SABBATICAL_CREATE';
    const candidates = allEvents.filter((event) => {
      if(event.statut !== 'PLANIFIE' || !event.population_figee || event.origine === 'LEGACY_AGGREGATED' || isQuantitatif(event)) return false;
      const rows = ciblesByEvent.get(event.evenement_id) || [];
      const hasTouchedAttendu = (attendusByEvent.get(event.evenement_id) || []).some((row) => touched.has(String(row.personne_id)));
      if(removeOnly) return hasTouchedAttendu;
      return hasTouchedAttendu || eventCiblesMatchAffected(rows, affectedCibleIds, affectedDomaines);
    });
    return syncExpectedPopulationForEvents(dbx, candidates, actor, {
      ...options,
      personneIds: ids,
      ciblesByEvent,
      attendusByEvent,
      participationsByEvent
    });
  }

  async function syncExpectedPopulationForPersonnes(personneIds, actor, options = {}){
    return syncExpectedPopulationForPersonnesInRepo(repo, personneIds, actor, options);
  }

  async function isPersonExpectedForEvent(dbx, evenement, personneId){
    const cibleIds = await eventPopulationCibleIds(dbx, evenement.evenement_id);
    return evaluatePersonExpectedForEvent(dbx, evenement, cibleIds, personneId);
  }

  function previewPopulationStore(store){
    const base = store || repo;
    const cache = {
      cibles: null,
      ciblesById: new Map(),
      personnes: new Map(),
      periodes: new Map(),
      suivi: null
    };
    return {
      async listCibles(){
        if(!cache.cibles){
          cache.cibles = base.listCibles ? await base.listCibles() : [];
          cache.cibles.forEach((cible) => cache.ciblesById.set(cible.cible_id, cible));
        }
        return cache.cibles;
      },
      async getCible(id){
        await this.listCibles();
        if(cache.ciblesById.has(id)) return cache.ciblesById.get(id);
        const cible = base.getCible ? await base.getCible(id) : null;
        if(cible) cache.ciblesById.set(id, cible);
        return cible;
      },
      async listSuiviNominatif(){
        if(!cache.suivi){
          cache.suivi = base.listSuiviNominatif ? await base.listSuiviNominatif() : [];
        }
        return cache.suivi;
      },
      async listAffectationsForCibles(cibleIds, date){
        return base.listAffectationsForCibles ? base.listAffectationsForCibles(cibleIds, date) : [];
      },
      async getPersonne(id){
        if(cache.personnes.has(id)) return cache.personnes.get(id);
        const personne = base.getPersonne ? await base.getPersonne(id) : null;
        cache.personnes.set(id, personne);
        return personne;
      },
      async listPersonnesPeriodes(id){
        if(cache.periodes.has(id)) return cache.periodes.get(id);
        const periodes = base.listPersonnesPeriodes ? await base.listPersonnesPeriodes(id) : [];
        cache.periodes.set(id, periodes);
        return periodes;
      }
    };
  }

  async function enrichStandardPreviewPopulations(preview){
    if(!preview || !Array.isArray(preview.groups) || !preview.groups.length) return preview;
    const store = previewPopulationStore();
    for(const group of preview.groups){
      const cibleIds = (group.cibles || []).map((c) => c.cibleId).filter(Boolean);
      if(!group.date || !group.domaineStockage || !cibleIds.length || String(group.statut || '').indexOf('ERREUR') === 0){
        group.populationCount = null;
        group.populationLabel = '—';
        continue;
      }
      const population = await resolveEligiblePopulation({
        eventDate: group.date,
        domaineCode: group.domaineStockage,
        sousDomaineCode: group.sousDomaine || null,
        cibleIds,
        store
      });
      group.populationCount = population.count;
      group.populationLabel = `${population.count} ${population.count > 1 ? 'personnes' : 'personne'}`;
      group.populationPreview = {
        count: population.count,
        note: population.note || null
      };
      (group.lignes || []).forEach((line) => {
        line.populationCount = population.count;
        line.populationLabel = group.populationLabel;
      });
    }
    return preview;
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
        grade: personne?.grade,
        cibles: [],
        origine: row.origine || 'FIGE',
        motifInclusion: row.motif_inclusion || 'photographie_figee',
        fige: true
      });
    }
    return { count: personnes.length, personnes, fige: true, photographie: true };
  }


  async function decorateJspEventPopulations(evenement, preview){
    const result = preview || { personnes: [] };
    const personnes = result.personnes || [];
    if(String(evenement && evenement.domaine_code || '').toUpperCase() !== 'JSP'){
      return Object.assign({}, result, { jeunes: [] });
    }
    const date = evenement.date;
    const decorated = [];
    for(const person of personnes){
      const role = await classifyJspRoleForEventPerson(
        { grade: person.grade },
        person.personneId || person.personne_id,
        date
      );
      decorated.push(Object.assign({}, person, { jspRole: role }));
    }
    const jeunes = decorated.filter((row) => row.jspRole === 'JEUNE');
    return Object.assign({}, result, {
      personnes: jeunes,
      count: jeunes.length,
      jeunes
    });
  }

  async function classifyJspRoleForEventPerson(person, personneId, date){
    const raw = repo.listAffectations
      ? await repo.listAffectations({ personneId, date })
      : [];
    const affs = [];
    for(const aff of raw){
      const cible = aff.cible_id && repo.getCible ? await repo.getCible(aff.cible_id) : null;
      affs.push({
        ...aff,
        categorie: aff.categorie || 'OI',
        domaine: aff.domaine || cible?.domaine_code,
        cible: aff.cible || cible?.niveau_code,
        date_actif: aff.date_actif || aff.date_debut,
        date_inactif: aff.date_inactif || aff.date_fin
      });
    }
    return display.classifyJspRole(person, affs, date);
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
      const frozen = await photographieFigee(eventId);
      return decorateJspEventPopulations(evenement, frozen);
    }
    const cibleIds = await repo.listEventCibleIds(eventId);
    const preview = await resolveEligiblePopulation({
      eventDate: evenement.date,
      domaineCode: evenement.domaine_code,
      sousDomaineCode: evenement.sous_domaine_code,
      cibleIds
    });
    return decorateJspEventPopulations(evenement, preview);
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

  async function journalClotureAffectations(tx, actor, personne, closed, dateEffet){
    for(const item of closed){
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personne.personne_id,
        action: 'CLOTURER_AFFECTATION',
        avant: {
          nip: personne.nip,
          affectation_id: item.affectation_id,
          cible_id: item.cible_id,
          date_debut: item.date_debut,
          date_fin: null
        },
        apres: {
          date_fin: item.date_fin,
          date_effet: dateEffet
        }
      });
    }
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
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'OUVRIR_PERIODE' });
      return { personne: next, periode: saved, synchronisationPopulation };
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
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'CLOTURER_PERIODE' });
      return { personne: next, periode: saved, synchronisationPopulation };
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
      const openArchive = existing.find((row) =>
        (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
      );
      if(openArchive){
        const closed = await closeAllOpenAffectations(tx, personneId, openArchive.date_debut);
        await journalClotureAffectations(tx, actor, personne, closed, openArchive.date_debut);
        const next = await syncPersonneSnapshot(tx, personneId, openArchive.date_debut);
        const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'ARCHIVER_DEJA_ARCHIVE' });
        return { personne: next, periode: openArchive, dejaArchive: true, affectationsCloturees: closed, synchronisationPopulation };
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
      const afterClose = await tx.listPersonnesPeriodes(personneId);
      const normalized = assertPeriodCompatible(afterClose, { type, date_debut: date, date_fin: null });
      const periode = await tx.insertPeriode({
        personne_id: personneId,
        ...normalized,
        source: body.source || 'MANUEL'
      });
      const closed = await closeAllOpenAffectations(tx, personneId, date);
      await journalClotureAffectations(tx, actor, personne, closed, date);
      const next = await syncPersonneSnapshot(tx, personneId, date);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'ARCHIVER',
        avant: { nip: personne.nip, personne_id: personneId },
        apres: {
          type,
          date,
          periode_id: periode.periode_id,
          affectationsCloturees: closed.map((item) => item.affectation_id)
        }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'ARCHIVER' });
      return { personne: next, periode, affectationsCloturees: closed, synchronisationPopulation };
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
      const openArchive = existing.find((row) =>
        (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
      );
      if(openArchive){
        const leftover = await closeAllOpenAffectations(tx, personne.personne_id, openArchive.date_debut);
        await journalClotureAffectations(tx, actor, personne, leftover, openArchive.date_debut);
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
      if(afterClose.some((row) => row.type === TYPES_PERIODE.ACTIF && !row.date_fin)){
        const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
        const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personne.personne_id], actor, { reason: 'REACTIVER_DEJA_ACTIVE' });
        return { personne: next, dejaActive: true, synchronisationPopulation };
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
      let affectation = null;
      const cibleId = body.cibleId || body.cible_id;
      if(cibleId){
        await assertNoAffectationOverlapInDomain(personne.personne_id, cibleId, date, null, null, tx);
        affectation = await tx.insertAffectation({
          personne_id: personne.personne_id,
          cible_id: cibleId,
          date_debut: date,
          source: body.source || 'MANUEL'
        });
      }
      const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personne.personne_id,
        action: 'REACTIVER',
        avant: { nip: personne.nip, personne_id: personne.personne_id },
        apres: {
          date,
          periode_id: periode.periode_id,
          affectation_id: affectation ? affectation.affectation_id : null,
          cible_id: cibleId || null
        }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personne.personne_id], actor, { reason: 'REACTIVER' });
      return { personne: next, periode, affectation, memeIdentite: true, synchronisationPopulation };
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
        action: 'PERSONNEL_MANUAL_CREATE',
        apres: { nip: saved.nip }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [saved.personne_id], actor, { reason: 'CREER_PERSONNE' });
      return { personne: saved, synchronisationPopulation };
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
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'CHANGER_AFFECTATION' });
      return { affectation: saved, cible, synchronisationPopulation };
    });
  }

  async function previewPersonnelSync(body){
    return personnelSync.previewPersonnelSync(repo, body || {});
  }

  async function commitPersonnelSync(body, actor){
    const rapport = await personnelSync.commitPersonnelSync(repo, body || {}, actor);
    const touchedNips = normalizeIdList([
      ...(rapport.applied || []).map((row) => row.nip),
      ...(rapport.analysedNips || rapport.analysed_nips || [])
    ]);
    const touchedIds = [];
    for(const nip of touchedNips){
      const personne = repo.getPersonneByNip ? await repo.getPersonneByNip(nip) : null;
      if(personne?.personne_id) touchedIds.push(personne.personne_id);
    }
    rapport.synchronisationPopulation = await syncExpectedPopulationForPersonnes(touchedIds, actor, { reason: 'IMPORT_PERSONNEL_COHERENCE' });
    return rapport;
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
        const cibleMotif = (personne.cibles || [])
          .map((c) => `${c.domaineCode || c.domaine_code}_${c.niveauCode || c.niveau_code}`)
          .filter(Boolean)
          .join('|');
        await tx.upsertAttendu({
          evenement_id: eventId,
          personne_id: personne.personneId,
          inclus: true,
          origine: 'REGLE',
          motif_inclusion: cibleMotif || personne.motifInclusion
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
      if(existing && existing.inclus){
        return {
          evenement,
          version: evenement.version,
          dejaPresent: true,
          message: 'Cette personne appartient déjà à l’effectif.'
        };
      }
      const expected = await isPersonExpectedForEvent(tx, evenement, personneId);
      const origine = expected ? 'REGLE' : 'EXCEPTION_AJOUT';
      const motifInclusion = expected
        ? cibleMotifFromPopulationPerson(expected)
        : (body.motifInclusion || body.motif_inclusion || 'exception_ajout');
      await tx.upsertAttendu({
        evenement_id: eventId,
        personne_id: personneId,
        inclus: true,
        origine,
        origine_retrait: null,
        motif_inclusion: motifInclusion
      });
      const participation = await tx.getParticipation(eventId, personneId);
      if(!participation){
        await tx.upsertParticipation({
          evenement_id: eventId,
          personne_id: personneId,
          statut: 'NON_RENSEIGNE',
          role: 'PARTICIPANT',
          source: expected ? 'GENERATION' : 'EXCEPTION',
          auteur_id: actorId(actor)
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: expected ? 'ATTENDU_CIBLE_AJOUT' : 'EXCEPTION_AJOUT',
        apres: { personneId, role, origine },
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

  async function prSeriesEvents(tx, evenement){
    if(String(evenement.domaine_code || '').toUpperCase() !== 'PR') return [evenement];
    const rows = evenement.cycle_id && tx.listCycleEvents
      ? await tx.listCycleEvents(evenement.cycle_id)
      : (tx.listPrExerciseEvents && evenement.pr_exercise_group_key ? await tx.listPrExerciseEvents(evenement.pr_exercise_group_key) : [evenement]);
    const groupKey = evenement.pr_exercise_group_key || null;
    return (rows || [])
      .filter((row) => !groupKey || row.pr_exercise_group_key === groupKey)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(prSessionLabel(a)).localeCompare(String(prSessionLabel(b)), 'fr', { numeric: true }));
  }

  function isFirstPrSessionEvent(evenement){
    return String(evenement.domaine_code || '').toUpperCase() === 'PR' && /\b\d+\.1$/.test(prSessionLabel(evenement));
  }

  async function removeEncadrementRow(tx, eventId, personneId, participation, actor){
    const attendu = await tx.getAttendu(eventId, personneId);
    if(attendu && attendu.inclus){
      const previousStatut = String(participation.statut || '').toUpperCase();
      const previousSource = String(participation.source || '').toUpperCase();
      const keepPrPresence = String(participation.role || '').toUpperCase() === 'FORMATEUR'
        && previousStatut === 'PRESENT'
        && previousSource !== 'ENCADREMENT';
      await tx.upsertParticipation({
        ...participation,
        statut: keepPrPresence ? 'PRESENT' : 'NON_RENSEIGNE',
        motif_absence: null,
        commentaire: null,
        role: 'PARTICIPANT',
        source: keepPrPresence ? participation.source : 'SAISIE',
        auteur_id: actorId(actor)
      });
      return;
    }
    if(typeof tx.deleteParticipation === 'function'){
      await tx.deleteParticipation(eventId, personneId);
    } else {
      await tx.upsertParticipation({
        ...participation,
        statut: 'NON_CONCERNE',
        role: 'PARTICIPANT',
        source: 'SAISIE',
        auteur_id: actorId(actor)
      });
    }
  }

  async function retirerEncadrement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const scope = String(body.scope || body.portee || 'SESSION').toUpperCase();
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Encadrement saisissable uniquement sur PLANIFIE.');
      const participation = await tx.getParticipation(eventId, personneId);
      if(!participation || !ROLES_ENCADREMENT.has(participation.role)){
        throw new HttpError(404, 'encadrement_introuvable', 'Encadrement introuvable.');
      }
      if(scope === 'SERIE' && String(participation.role || '').toUpperCase() !== 'FORMATEUR'){
        throw new HttpError(422, 'serie_formateur_uniquement', 'Le retrait de série est réservé au rôle Formateur.');
      }
      const targets = scope === 'SERIE'
        ? (await prSeriesEvents(tx, evenement)).filter((row) => row.statut === 'PLANIFIE')
        : [evenement];
      let removed = 0;
      for(const target of targets){
        const targetId = target.evenement_id;
        const row = targetId === eventId ? participation : await tx.getParticipation(targetId, personneId);
        if(!row || !ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase())) continue;
        if(scope === 'SERIE' && String(row.role || '').toUpperCase() !== 'FORMATEUR') continue;
        await removeEncadrementRow(tx, targetId, personneId, row, actor);
        await bumpOrConflict(tx, targetId, targetId === eventId ? baseVersion : target.version, {});
        removed += 1;
      }
      const next = await tx.getEvent(eventId);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: scope === 'SERIE' ? 'ENCADREMENT_SERIE_RETRAIT' : 'ENCADREMENT_RETRAIT',
        apres: { personneId, role: participation.role, scope, count: removed }
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
      let savedCount = 0;
      let skippedEncadrement = 0;
      for(const item of items){
        const personneId = item.personneId || item.personne_id;
        const attendu = await tx.getAttendu(eventId, personneId);
        if(!attendu || attendu.inclus === false){
          throw new HttpError(422, 'non_attendu', 'Saisie réservée aux personnes attendues incluses.', { personneId });
        }
        const patch = validateParticipationPatch(item, { domaineCode: evenement.domaine_code });
        const role = String(item.role || item.role_participation || 'PARTICIPANT').toUpperCase();
        let participationRole = ['FORMATEUR', 'SURVEILLANT'].includes(role) ? role : 'PARTICIPANT';
        if(participationRole === 'FORMATEUR' && patch.statut !== 'PRESENT'){
          throw new HttpError(422, 'encadrement_present', 'Un rôle d’encadrement compté en session doit être présent.');
        }
        const existing = await tx.getParticipation(eventId, personneId);
        const existingRole = String(existing?.role || '').toUpperCase();
        if(existingRole === 'SURVEILLANT' && participationRole === 'PARTICIPANT' && patch.statut !== 'NON_RENSEIGNE'){
          participationRole = 'SURVEILLANT';
        }
        if(existing && ROLES_ENCADREMENT.has(String(existing.role || '').toUpperCase()) && participationRole === 'PARTICIPANT'){
          skippedEncadrement += 1;
          continue;
        }
        await tx.upsertParticipation({
          ...(existing || { evenement_id: eventId, personne_id: personneId, role: 'PARTICIPANT' }),
          ...patch,
          role: participationRole,
          source: 'SAISIE',
          auteur_id: actorId(actor)
        });
        savedCount += 1;
      }
      if(savedCount === 0){
        return { evenement, version: evenement.version, skippedEncadrement };
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'SAISIE_PARTICIPATIONS',
        apres: { count: savedCount, skippedEncadrement, version: next.version }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function resetParticipations(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Réinitialisation possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Population non figée.');
      const attendus = await tx.listAttendus(eventId);
      const participations = await tx.listParticipations(eventId);
      const participationsByPersonneId = new Map(participations.map((p) => [String(p.personne_id), p]));
      const attenduIds = new Set(attendus.filter(a => a.inclus !== false).map((a) => String(a.personne_id)));
      const encadrementRows = participations.filter((p) => ROLES_ENCADREMENT.has(String(p.role || '').toUpperCase()));
      const resetRows = attendus
        .filter(a => a.inclus !== false)
        .map((a) => {
          const existing = participationsByPersonneId.get(String(a.personne_id));
          return {
            ...(existing || { evenement_id: eventId, personne_id: a.personne_id }),
            statut: 'NON_RENSEIGNE',
            motif_absence: null,
            commentaire: null,
            role: 'PARTICIPANT',
            source: 'RESET',
            auteur_id: actorId(actor)
          };
        });
      if(typeof tx.bulkUpsertParticipations === 'function') await tx.bulkUpsertParticipations(resetRows);
      else {
        for(const row of resetRows) await tx.upsertParticipation(row);
      }
      const encadrementHorsPopulation = encadrementRows.filter((p) => !attenduIds.has(String(p.personne_id)));
      for(const row of encadrementHorsPopulation){
        if(typeof tx.deleteParticipation === 'function'){
          await tx.deleteParticipation(eventId, row.personne_id);
        } else {
          await tx.upsertParticipation({
            ...row,
            statut: 'NON_CONCERNE',
            motif_absence: null,
            commentaire: null,
            role: 'PARTICIPANT',
            source: 'RESET',
            auteur_id: actorId(actor)
          });
        }
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'RESET_SAISIE',
        apres: { resetParticipations: resetRows.length, encadrementSupprime: encadrementRows.length }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function upsertEncadrementRow(tx, evenement, personneId, role, actor, options = {}){
    const eventId = evenement.evenement_id;
    const attendu = await tx.getAttendu(eventId, personneId);
    const existing = await tx.getParticipation(eventId, personneId);
    if(existing && ROLES_ENCADREMENT.has(String(existing.role || '').toUpperCase())){
      if(options.allowSameRole && String(existing.role || '').toUpperCase() === role) return { changed: false };
      throw new HttpError(422, 'deja_encadrement', 'Cette personne est déjà ajoutée à l’encadrement.');
    }
    if(existing && !ROLES_ENCADREMENT.has(String(existing.role || '').toUpperCase()) && !(attendu && attendu.inclus)){
      const residualEncadrement = String(existing.statut || '') === 'NON_CONCERNE';
      if(!residualEncadrement){
        throw new HttpError(422, 'doublon', 'Une participation existe déjà pour cette personne.');
      }
    }
    const attenduInclus = attendu && attendu.inclus;
    const existingStatut = String(existing?.statut || '').toUpperCase();
    const existingSource = String(existing?.source || '').toUpperCase();
    const presenceDejaSaisie = attenduInclus && existingStatut === 'PRESENT' && existingSource !== 'ENCADREMENT';
    const statutEncadrement = attenduInclus && (role === 'FORMATEUR' || presenceDejaSaisie)
      ? 'PRESENT'
      : (attenduInclus ? 'NON_RENSEIGNE' : 'NON_CONCERNE');
    await tx.upsertParticipation({
      ...(existing || { evenement_id: eventId, personne_id: personneId }),
      statut: statutEncadrement,
      motif_absence: null,
      commentaire: null,
      role,
      source: presenceDejaSaisie ? existing.source : 'ENCADREMENT',
      auteur_id: actorId(actor)
    });
    return { changed: true };
  }

  async function ajouterEncadrement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const role = String(body.role || '');
    const serieComplete = Boolean(body.serieComplete || body.seriesComplete || body.touteSerie);
    if(!ROLES_ENCADREMENT.has(role)){
      throw new HttpError(422, 'role_invalide', 'Rôle d’encadrement invalide (FORMATEUR, MONITEUR, SURVEILLANT, AUXILIAIRE).');
    }
    if(serieComplete && role !== 'FORMATEUR'){
      throw new HttpError(422, 'serie_formateur_uniquement', 'L’option série complète est réservée au rôle Formateur.');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Encadrement saisissable uniquement sur PLANIFIE.');
      const personne = await tx.getPersonne(personneId);
      if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
      if(serieComplete && !isFirstPrSessionEvent(evenement)){
        throw new HttpError(422, 'serie_depuis_premiere_session', 'L’option série complète est disponible uniquement depuis la première session PR.');
      }
      const targets = serieComplete
        ? (await prSeriesEvents(tx, evenement)).filter((row) => row.statut === 'PLANIFIE')
        : [evenement];
      let changed = 0;
      for(const target of targets){
        const result = await upsertEncadrementRow(tx, target, personneId, role, actor, { allowSameRole: serieComplete });
        if(!result.changed) continue;
        await bumpOrConflict(tx, target.evenement_id, target.evenement_id === eventId ? baseVersion : target.version, {});
        changed += 1;
      }
      const next = await tx.getEvent(eventId);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: serieComplete ? 'ENCADREMENT_SERIE' : 'ENCADREMENT',
        apres: { personneId, role, serieComplete, count: changed }
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
      const attendusRaw = await tx.listAttendus(eventId);
      const participations = await tx.listParticipations(eventId);
      const periodesByPersonne = new Map();
      const personneIds = [...new Set((attendusRaw || []).map((row) => String(row.personne_id || row.personneId || '')).filter(Boolean))];
      await Promise.all(personneIds.map(async (pid) => {
        periodesByPersonne.set(pid, tx.listPersonnesPeriodes ? await tx.listPersonnesPeriodes(pid) : []);
      }));
      const eligible = new Set(
        filterAttendusEligibleAtDate(attendusRaw, periodesByPersonne, evenement.date)
          .map((row) => String(row.personne_id || row.personneId))
      );
      const attendus = (attendusRaw || []).map((row) => (
        eligible.has(String(row.personne_id || row.personneId))
          ? row
          : Object.assign({}, row, { inclus: false, origine_retrait: row.origine_retrait || 'INDISPONIBLE' })
      ));
      validateCloture(evenement, attendus, participations, { requireExpectedFilled: true });
      if((evenement.cycle_id || evenement.pr_exercise_group_key) && tx.listParticipationsForEvents){
        const cycle = evenement.cycle_id && tx.getCycle
          ? await tx.getCycle(evenement.cycle_id)
          : { cycle_id: null, domaine_code: evenement.domaine_code || 'PR' };
        const cycleEvents = evenement.cycle_id && tx.listCycleEvents
          ? await tx.listCycleEvents(evenement.cycle_id)
          : (tx.listPrExerciseEvents && evenement.pr_exercise_group_key ? await tx.listPrExerciseEvents(evenement.pr_exercise_group_key) : [evenement]);
        const cyclePersonnes = evenement.cycle_id && tx.listCyclePersonnes ? await tx.listCyclePersonnes(evenement.cycle_id) : [];
        const cycleParticipations = cycleEvents.length ? await tx.listParticipationsForEvents(cycleEvents.map((row) => row.evenement_id)) : [];
        const cycleAttendus = tx.listAttendusForEvents && cycleEvents.length ? await tx.listAttendusForEvents(cycleEvents.map((row) => row.evenement_id)) : attendus;
        const personnes = await hydratePersonnes([
          ...cyclePersonnes.map((row) => row.personne_id),
          ...cycleParticipations.map((row) => row.personne_id),
          ...cycleAttendus.map((row) => row.personne_id)
        ]);
        const prState = computePrExerciseParticipationState({
          cycle,
          evenements: cycleEvents,
          cyclePersonnes,
          attendus: cycleAttendus,
          participations: cycleParticipations,
          personnes,
          currentEventId: eventId
        });
        if(!canCloseLastSession(prState)){
          throw new HttpError(422, 'session_incomplete', 'Chaque personne attendue doit disposer d’un statut avant la clôture définitive de l’exercice.', {
            unfilledPeople: prState.unfilledPeople || []
          });
        }
      }
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

  async function supprimerOuAnnulerEvenement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const motif = String(body.motif || body.commentaire || 'Correction événement').trim();
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      const deleted = tx.deleteEventIfNoDependencies ? await tx.deleteEventIfNoDependencies(eventId) : { deleted: false, reason: 'unsupported' };
      if(deleted.deleted){
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: eventId,
          action: 'SUPPRIMER',
          avant: { codeCours: evenement.code_cours, date: evenement.date, libelle: evenement.libelle },
          commentaire: motif
        });
        return { deleted: true, annule: false, evenement: deleted.event };
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, { statut: 'ANNULE' });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'ANNULER_APRES_DEPENDANCES',
        avant: { statut: evenement.statut, version: evenement.version },
        apres: { statut: 'ANNULE', version: next.version },
        commentaire: motif
      });
      return { deleted: false, annule: true, evenement: next, version: next.version };
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

  function groupByEventId(rows){
    const map = new Map();
    (rows || []).forEach((row) => {
      const id = row.evenement_id;
      if(!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    });
    return map;
  }

  function hasQuantitativeBusinessInput(saisie){
    if(!saisie) return false;
    return [
      'nb_attendus',
      'nb_presents',
      'nb_excuses',
      'nb_excuses_prive',
      'nb_excuses_professionnel',
      'nb_excuses_armee',
      'nb_excuses_accident_maladie',
      'nb_excuses_non_precise',
      'nb_non_excuses',
      'nb_dispenses',
      'nb_permutations'
    ].some((key) => {
      const value = saisie[key];
      return value !== null && value !== undefined && value !== '' && Number(value) !== 0;
    });
  }

  function hasNominativeBusinessInput(participations, attendus){
    const expectedOrigins = new Map((attendus || []).map((row) => [String(row.personne_id), String(row.origine || '').toUpperCase()]));
    return (participations || []).some((row) => {
      const statut = String(row.statut || '').toUpperCase();
      const role = String(row.role || 'PARTICIPANT').toUpperCase();
      const source = String(row.source || '').toUpperCase();
      const motif = String(row.motif_absence || '').trim();
      const commentaire = String(row.commentaire || '').trim();
      if(ROLES_ENCADREMENT.has(role)) return true;
      if(motif || commentaire) return true;
      if(expectedOrigins.get(String(row.personne_id)) === 'EXCEPTION_AJOUT') return true;
      if(statut && !['NON_RENSEIGNE', 'NON_CONCERNE'].includes(statut)) return true;
      if(source && !['GENERATION', 'RESET'].includes(source) && statut !== 'NON_RENSEIGNE') return true;
      return false;
    });
  }

  function businessEtatForEvenement(evenement, context = {}){
    if(String(evenement.statut || '').toUpperCase() === 'REALISE'){
      return { code: 'TRAITE', label: 'Traité' };
    }
    const date = String(evenement.date || '').slice(0, 10);
    const today = String(context.today || new Date().toISOString().slice(0, 10)).slice(0, 10);
    if(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today){
      return { code: 'A_TRAITER', label: 'À traiter' };
    }
    const started = hasNominativeBusinessInput(context.participations, context.attendus)
      || hasQuantitativeBusinessInput(context.saisie);
    if(started) return { code: 'SAISIE_EN_COURS', label: 'Saisie en cours' };
    return { code: 'PLANIFIE', label: 'Planifié' };
  }

  async function summarizeEvenements(evenements, options = {}){
    const list = evenements || [];
    if(!list.length){
      return { items: [], performance: { mode: 'batch', eventCount: 0, queries: 0 } };
    }
    const ids = list.map((e) => e.evenement_id);
    const [allCibles, cibleRows, attendusRows, partRows, qtyRows, legacyRows] = await Promise.all([
      repo.listCibles(),
      repo.listEventCiblesForEvents ? repo.listEventCiblesForEvents(ids) : Promise.resolve([]),
      repo.listAttendusForEvents ? repo.listAttendusForEvents(ids) : Promise.resolve([]),
      repo.listParticipationsForEvents ? repo.listParticipationsForEvents(ids) : Promise.resolve([]),
      repo.listQuantitatifSaisiesForEvents ? repo.listQuantitatifSaisiesForEvents(ids) : Promise.resolve([]),
      repo.listLegacy ? repo.listLegacy() : Promise.resolve([])
    ]);
    const ciblesById = new Map((allCibles || []).map((c) => [c.cible_id, c]));
    const ciblesByEvent = groupByEventId(cibleRows);
    const attendusByEvent = groupByEventId(attendusRows);
    const partsByEvent = groupByEventId(partRows);
    const qtyByEvent = new Map((qtyRows || []).map((row) => [row.evenement_id, row]));
    const legacyByEvent = new Map();
    (legacyRows || []).forEach((row) => {
      if(row.evenement_id) legacyByEvent.set(row.evenement_id, row);
    });
    const items = list.map((evenement) => {
      const linked = ciblesByEvent.get(evenement.evenement_id) || [];
      const cibles = linked.map((row) => ciblesById.get(row.cible_id) || row).filter(Boolean);
      const attendus = attendusByEvent.get(evenement.evenement_id) || [];
      const participations = partsByEvent.get(evenement.evenement_id) || [];
      const saisie = qtyByEvent.get(evenement.evenement_id) || null;
      const etatMetier = businessEtatForEvenement(evenement, {
        participations,
        attendus,
        saisie,
        today: options.today
      });
      const modeSuivi = inferModeSuivi(evenement);
      let compteurs = computeTaux(participations, attendus);
      let attendusInclus = attendus.filter((a) => a.inclus !== false).length;
      if(modeSuivi === MODES.QUANTITATIF){
        const official = saisie ? officialFromQuantitatif(saisie) : null;
        attendusInclus = saisie ? Number(saisie.nb_attendus) : 0;
        compteurs = official
          ? { ...official, presents: official.volumes.presents }
          : { numerator: 0, denominator: 0, percentage: null, presents: saisie ? saisie.nb_presents : 0 };
      }
      const legacy = evenement.origine === 'LEGACY_AGGREGATED'
        ? (legacyByEvent.get(evenement.evenement_id) || null)
        : null;
      return {
        evenement: { ...evenement, mode_suivi: modeSuivi },
        cibles,
        compteurs,
        attendusInclus,
        legacy,
        saisieQuantitative: saisie,
        etatMetier,
        etat_metier: etatMetier,
        modeSuivi,
        qualification: isQualificationEvenement(evenement)
      };
    });
    return { items, performance: { mode: 'batch', eventCount: list.length, queries: 6 } };
  }

  async function summarizeEvenement(evenement){
    const packed = await summarizeEvenements([evenement]);
    return packed.items[0];
  }

  async function listEvenements(query){
    const annee = query?.annee || query?.year || null;
    const statut = query?.statut || query?.status || null;
    const etatsMetier = new Set(['PLANIFIE', 'SAISIE_EN_COURS', 'A_TRAITER', 'TRAITE']);
    const statutFilter = statut && statut !== 'tous' && !etatsMetier.has(statut) ? statut : null;
    const etatMetierFilter = statut && statut !== 'tous' && etatsMetier.has(statut) ? statut : null;
    const domaine = query?.domaineCode || query?.domaine_code || query?.domaine || null;
    let evenements = await repo.listEvenements({
      annee: annee ? Number(annee) : null,
      statut: statutFilter,
      domaine: domaine && domaine !== 'tous' ? domaine : null
    });
    if(!wantsQualification(query)){
      evenements = evenements.filter((row) => !isQualificationEvenement(row));
    }
    const packed = await summarizeEvenements(evenements, { today: query?.today });
    const items = etatMetierFilter
      ? packed.items.filter((item) => item.etatMetier && item.etatMetier.code === etatMetierFilter)
      : packed.items;
    return { evenements: items, performance: packed.performance };
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
    let attendus = await repo.listAttendus(eventId);
    if(String(evenement.statut || '').toUpperCase() === 'PLANIFIE'){
      const periodesByPersonne = new Map();
      const personneIds = [...new Set((attendus || []).map((row) => String(row.personne_id || row.personneId || '')).filter(Boolean))];
      await Promise.all(personneIds.map(async (pid) => {
        periodesByPersonne.set(pid, repo.listPersonnesPeriodes ? await repo.listPersonnesPeriodes(pid) : []);
      }));
      const eligible = new Set(
        filterAttendusEligibleAtDate(attendus, periodesByPersonne, evenement.date)
          .map((row) => String(row.personne_id || row.personneId))
      );
      attendus = (attendus || []).map((row) => (
        eligible.has(String(row.personne_id || row.personneId))
          ? row
          : Object.assign({}, row, { inclus: false, origine_retrait: row.origine_retrait || 'INDISPONIBLE' })
      ));
    }
    const participationsRaw = await repo.listParticipations(eventId);
    const attenduIds = new Set(attendus.filter(a => a.inclus !== false).map(a => String(a.personne_id)));
    const participations = String(evenement.statut || '').toUpperCase() === 'PLANIFIE'
      ? (participationsRaw || []).map((row) => {
        if(!attenduIds.has(String(row.personne_id))) return row;
        if(!isStaleNonConcerneForExpected(row)) return row;
        return Object.assign({}, row, { statut: 'NON_RENSEIGNE' });
      })
      : participationsRaw;
    let encadrement = participations.filter(p => ROLES_ENCADREMENT.has(p.role));
    const taux = computeTaux(participations, attendus);
    const personnes = await hydratePersonnes([
      ...attendus.map(a => a.personne_id),
      ...participations.map(p => p.personne_id)
    ]);
    encadrement = encadrement
      .map((row) => Object.assign({}, personnes[String(row.personne_id)] || personnes[row.personne_id] || {}, row))
      .sort(comparePeopleByGradeName);
    let prExerciseParticipation = { byPersonneId: {}, kpis: null };
    if((evenement.cycle_id || evenement.pr_exercise_group_key) && repo.listParticipationsForEvents){
      const cycle = evenement.cycle_id && repo.getCycle
        ? await repo.getCycle(evenement.cycle_id)
        : { cycle_id: null, domaine_code: evenement.domaine_code || 'PR' };
      if(cycle){
        const cycleEvents = evenement.cycle_id && repo.listCycleEvents
          ? await repo.listCycleEvents(evenement.cycle_id)
          : (repo.listPrExerciseEvents && evenement.pr_exercise_group_key ? await repo.listPrExerciseEvents(evenement.pr_exercise_group_key) : [evenement]);
        const cyclePersonnes = evenement.cycle_id && repo.listCyclePersonnes ? await repo.listCyclePersonnes(evenement.cycle_id) : [];
        const cycleParticipations = cycleEvents.length
          ? await repo.listParticipationsForEvents(cycleEvents.map((row) => row.evenement_id))
          : [];
        const cycleAttendus = repo.listAttendusForEvents && cycleEvents.length
          ? await repo.listAttendusForEvents(cycleEvents.map((row) => row.evenement_id))
          : attendus;
        const cyclePersonnesById = await hydratePersonnes([
          ...cyclePersonnes.map((row) => row.personne_id),
          ...cycleParticipations.map((row) => row.personne_id),
          ...cycleAttendus.map((row) => row.personne_id)
        ]);
        prExerciseParticipation = computePrExerciseParticipationState({
          cycle,
          evenements: cycleEvents,
          cyclePersonnes,
          attendus: cycleAttendus,
          participations: cycleParticipations,
          personnes: cyclePersonnesById,
          currentEventId: eventId
        });
        prExerciseParticipation.sessionLabels = cycleEvents
          .filter((row) => !prExerciseParticipation.groupKey || row.pr_exercise_group_key === prExerciseParticipation.groupKey)
          .map((row) => prSessionLabel(row))
          .filter(Boolean);
        attendus = attendus.map((row) => {
          const state = prExerciseParticipation.byPersonneId[String(row.personne_id)];
          return state
            ? Object.assign({}, row, {
              already_counted_in_session: Boolean(state.alreadyCountedInSession),
              alreadyCountedInSession: Boolean(state.alreadyCountedInSession),
              sessionHasValidStatus: Boolean(state.sessionHasValidStatus),
              session_counted_event_id: state.countedEventId,
              session_counted_role: state.countedRole,
              session_counted_statut: state.countedStatut,
              session_counted_source: state.countedSource,
              session_reference_event_id: state.referenceEventId,
              session_reference_label: state.referenceSessionLabel,
              session_reference_quality: state.referenceQuality,
              session_reference_relation: state.referenceRelation,
              session_formateur_sessions: state.formateurSessionLabels || [],
              sessionReferenceEventId: state.referenceEventId,
              sessionReferenceLabel: state.referenceSessionLabel,
              sessionReferenceQuality: state.referenceQuality,
              sessionReferenceRelation: state.referenceRelation,
              sessionFormateurSessions: state.formateurSessionLabels || [],
              sessionExcuse: Boolean(state.sessionExcuse),
              sessionDispense: Boolean(state.sessionDispense),
              sessionExerciseLabel: state.sessionExerciseLabel || '',
              sessionMessage: state.sessionMessage || '',
              sessionSummary: state.sessionSummary || '',
              sessionMotif: state.countedMotif || null
            })
            : row;
        });
      }
    }
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
    let jsp = { jeunes: [], tauxJeunes: null };
    if(String(evenement.domaine_code || '').toUpperCase() === 'JSP'){
      const date = evenement.date;
      const tagged = [];
      for(const row of attendus){
        const person = personnes[String(row.personne_id)] || personnes[row.personne_id];
        const jspRole = await classifyJspRoleForEventPerson(person, row.personne_id, date);
        tagged.push(Object.assign({}, row, { jspRole }));
      }
      attendus = tagged;
      const jeunes = tagged.filter((row) => row.jspRole === 'JEUNE');
      const jeuneIds = new Set(jeunes.map((row) => String(row.personne_id)));
      jsp = {
        jeunes,
        jeunesAttendus: jeunes.filter((row) => row.inclus !== false).length,
        tauxJeunes: computeTaux(participations.filter((row) => jeuneIds.has(String(row.personne_id))), jeunes)
      };
    }
    const attendusExclus = attendus.filter((row) => row.inclus === false);
    const attendusActifs = attendus.filter((row) => row.inclus !== false);
    const coherenceAttendus = String(evenement.domaine_code || '').toUpperCase() === 'JSP'
      ? (jsp.jeunes || []).filter((row) => row.inclus !== false)
      : attendusActifs;
    return {
      evenement: { ...evenement, mode_suivi: modeSuivi },
      cibles,
      attendus: attendusActifs,
      attendusExclus,
      attendus_exclus: attendusExclus,
      participations,
      encadrement,
      personnes,
      prExerciseParticipation,
      sessionParticipation: prExerciseParticipation,
      journal,
      compteurs,
      saisieQuantitative: saisie,
      modeSuivi,
      legacy,
      jsp,
      populationCoherence: expectedPopulationCoherence(coherenceAttendus, participations),
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
    const [domaines, cibles, rules, existingEvents, importedFingerprints, suiviRules] = await Promise.all([
      repo.listDomaines(),
      repo.listCibles(),
      rulesList(),
      repo.listEvenements({}),
      repo.listImportedFingerprints ? repo.listImportedFingerprints() : [],
      repo.listSuiviNominatif ? repo.listSuiviNominatif() : []
    ]);
    return { domaines, cibles, rules, existingEvents, importedFingerprints, suiviRules };
  }

  async function existingEventsWithCibles(events){
    const list = events || [];
    if(!list.length || !repo.listEventCiblesForEvents){
      return list.map((e) => ({ ...e, cibles: [] }));
    }
    const rows = await repo.listEventCiblesForEvents(list.map((e) => e.evenement_id));
    const byId = {};
    (rows || []).forEach((row) => {
      const id = row.evenement_id;
      if(!byId[id]) byId[id] = [];
      byId[id].push(row);
    });
    return list.map((e) => ({ ...e, cibles: byId[e.evenement_id] || [] }));
  }

  function previewFromCsv(csvText, context){
    const parsed = csvImport.parseExercicesCsv(csvText);
    if(!parsed.ok){
      throw new HttpError(400, parsed.error, parsed.message, { header: parsed.header, missing: parsed.missing });
    }
    const lignes = csvImport.buildPreviewRows(parsed, context);
    const summary = csvImport.summarizePreview(lignes);
    return {
      format: csvImport.IMPORT_PROFIL,
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

  async function previewNativeContext(body){
    const ctx = await previewContext();
    const evenementsExistants = await existingEventsWithCibles(ctx.existingEvents);
    return {
      cibles: ctx.cibles,
      suiviRules: ctx.suiviRules || [],
      importedFingerprints: ctx.importedFingerprints || [],
      evenementsExistants,
      decisions: body?.decisions || {}
    };
  }

  async function previewImportEvenements(body){
    const csvText = String(body?.csvText || body?.csv || '');
    if(!csvText.trim()){
      throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
    }
    const format = importContract.detectCsvFormatFromText(csvText);
    if(format === importContract.FORMAT_NATIVE){
      const preview = importContract.previewScopeImport(csvText, await previewNativeContext(body));
      if(preview.error === 'fichier_vide'){
        throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
      }
      return { ...preview, ecriture: false };
    }
    if(format === importContract.FORMAT_STANDARD){
      const preview = importContract.previewStandardImport(csvText, await previewNativeContext(body));
      if(preview.error === 'fichier_vide'){
        throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
      }
      return { ...(await enrichStandardPreviewPopulations(preview)), ecriture: false };
    }
    if(format === importContract.FORMAT_F7){
      const preview = previewFromCsv(csvText, await previewContext());
      return { ...preview, ecriture: false };
    }
    throw new HttpError(400, 'format_csv_inconnu', 'Format CSV non reconnu. Utilisez le programme SCOPE, le standard CODE COURS ou l’historique Monitoring F7.');
  }

  async function commitStandardImport(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    const filename = String(body?.filename || body?.sourceFilename || '').slice(0, 240);
    const preview = importContract.previewStandardImport(csvText, await previewNativeContext(body));
    if(!body?.previewToken){
      throw new HttpError(400, 'preview_token_requis', 'Relancez le contrôle (preview) avant de confirmer l’import.');
    }
    if(preview.previewToken && body.previewToken !== preview.previewToken){
      throw new HttpError(409, 'preview_obsolete', 'La preview n’est plus à jour. Relancez le contrôle avant de confirmer.', {
        previewToken: preview.previewToken
      });
    }
    const excluded = new Set(
      (Array.isArray(body?.excludedLineNos) ? body.excludedLineNos : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const groups = (preview.groups || []).filter((g) => !g.sourceLineNos.every((n) => excluded.has(n)));
    const blockingLines = preview.lignes.filter((l) => !excluded.has(l.ligneNo) && l.statut === 'ERREUR');
    const blockingGroups = groups.filter((g) => g.statut === 'REVIEW_REQUIRED');
    if(blockingLines.length || blockingGroups.length){
      throw new HttpError(422, 'import_refuse', 'Des lignes en erreur ou à contrôler doivent être corrigées ou exclues avant commit.', {
        erreurs: blockingLines.map((l) => ({ ligneNo: l.ligneNo, raison: l.raison })),
        groupes: blockingGroups.map((g) => ({ sourceLineNos: g.sourceLineNos, statut: g.statut }))
      });
    }
    return repo.withTransaction(async (tx) => {
      const sourceSha = importContract.sha256Hex(csvText);
      const created = [];
      const skipped = [];
      const importedGroups = [];
      const importedByLine = new Map();
      const skippedByLine = new Map();
      const attenduRows = [];
      const participationRows = [];
      const populationStore = previewPopulationStore(tx);
      for(const group of groups){
        if(group.actionPrevue === 'IGNORER_IDEMPOTENT' || group.statut === 'EXACT_MATCH' || group.statut === 'PROBABLE_MATCH'){
          skipped.push({ sourceLineNos: group.sourceLineNos, statut: group.statut, codeCours: group.codeCours });
          group.sourceLineNos.forEach((lineNo) => skippedByLine.set(lineNo, skipped[skipped.length - 1]));
          continue;
        }
        const event = await tx.insertEvenement({
          date: group.date,
          domaine_code: group.domaineStockage,
          sous_domaine_code: group.sousDomaine || null,
          libelle: group.libelle,
          statut: 'PLANIFIE',
          origine: 'IMPORT_CSV',
          mode_suivi: 'NOMINATIF',
          code_cours: group.codeCours,
          code_source: group.codeCours,
          source_type: 'CSV',
          heure_debut: group.heureDebut || null,
          heure_fin: group.heureFin || null,
          salle: group.salle || null,
          responsable: group.responsable || null,
          cible_ids: (group.cibles || []).map((c) => c.cibleId)
        });
        if(event.already_exists){
          const item = { sourceLineNos: group.sourceLineNos, statut: 'EXACT_MATCH', codeCours: group.codeCours };
          skipped.push(item);
          group.sourceLineNos.forEach((lineNo) => skippedByLine.set(lineNo, item));
          continue;
        }
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: event.evenement_id,
          action: 'CREER_IMPORT_STANDARD',
          apres: { codeCours: group.codeCours, sourceLineNos: group.sourceLineNos, cibles: group.cibleCodes }
        });
        const population = await resolveEligiblePopulation({
          eventDate: group.date,
          domaineCode: group.domaineStockage,
          sousDomaineCode: group.sousDomaine || null,
          cibleIds: (group.cibles || []).map((c) => c.cibleId),
          store: populationStore
        });
        for(const personne of population.personnes){
          attenduRows.push({
            evenement_id: event.evenement_id,
            personne_id: personne.personneId,
            inclus: true,
            origine: 'REGLE',
            motif_inclusion: (personne.cibles || [])
              .map((c) => `${c.domaineCode}_${c.niveauCode}`)
              .filter(Boolean)
              .join('|') || 'population_standard'
          });
          participationRows.push({
            evenement_id: event.evenement_id,
            personne_id: personne.personneId,
            statut: 'NON_RENSEIGNE',
            role: 'PARTICIPANT',
            source: 'GENERATION',
            auteur_id: actorId(actor)
          });
        }
        const frozen = await tx.updateEventIfVersion(event.evenement_id, event.version, {
          population_figee: true,
          population_version: 1,
          figee_at: new Date().toISOString(),
          figee_par: actorId(actor)
        });
        created.push({
          evenementId: event.evenement_id,
          codeCours: group.codeCours,
          sourceLineNos: group.sourceLineNos,
          targets: group.cibles.length,
          population: population.count,
          version: frozen ? frozen.version : event.version
        });
        importedGroups.push({ group, event });
        group.sourceLineNos.forEach((lineNo) => importedByLine.set(lineNo, event));
      }
      if(tx.bulkUpsertAttendus) await tx.bulkUpsertAttendus(attenduRows);
      else {
        for(const row of attenduRows) await tx.upsertAttendu(row);
      }
      if(tx.bulkUpsertParticipations) await tx.bulkUpsertParticipations(participationRows);
      else {
        for(const row of participationRows) await tx.upsertParticipation(row);
      }
      const importRow = await tx.insertImport({
        source_filename: filename || null,
        source_sha256: sourceSha,
        imported_par: actorId(actor),
        statut: 'COMMITE',
        nb_lignes: preview.lignes.length,
        rapport: {
          format: importContract.FORMAT_STANDARD,
          imported: created.length,
          skipped: skipped.length,
          grouped: preview.summary.regroupes,
          excluded: [...excluded]
        }
      });
      const importLineRows = [];
      for(const line of preview.lignes){
        const groupDone = importedByLine.get(line.ligneNo);
        const groupSkipped = skippedByLine.get(line.ligneNo);
        importLineRows.push({
          import_id: importRow.import_id,
          ligne_no: line.ligneNo,
          fingerprint: line.fingerprint,
          statut: excluded.has(line.ligneNo) ? 'EXCLU' : (groupSkipped ? 'DEJA_IMPORTE' : 'IMPORTE'),
          type_propose: 'STANDARD',
          evenement_id: groupDone ? groupDone.evenement_id : null,
          payload_source: { format: importContract.FORMAT_STANDARD, line },
          raison: line.raison,
          action: excluded.has(line.ligneNo) ? 'EXCLU' : (groupSkipped ? 'IGNORER_IDEMPOTENT' : 'CREER')
        });
      }
      if(tx.bulkInsertImportLignes) await tx.bulkInsertImportLignes(importLineRows);
      else {
        for(const row of importLineRows) await tx.insertImportLigne(row);
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'import',
        entite_id: importRow.import_id,
        action: 'IMPORTER_EVENEMENTS_STANDARD',
        apres: { filename, imported: created.length, skipped: skipped.length, grouped: preview.summary.regroupes }
      });
      return {
        importId: importRow.import_id,
        format: importContract.FORMAT_STANDARD,
        created,
        skipped,
        excluded: [...excluded],
        summary: {
          nbLignes: preview.lignes.length,
          imported: created.length,
          dejaImporte: skipped.length,
          regroupes: preview.summary.regroupes,
          exclus: excluded.size,
          erreurs: 0
        }
      };
    });
  }

  async function commitNativeImport(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    const filename = String(body?.filename || body?.sourceFilename || '').slice(0, 240);
    const excluded = new Set(
      (Array.isArray(body?.excludedLineNos) ? body.excludedLineNos : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const preview = importContract.previewScopeImport(csvText, await previewNativeContext(body));
    if(!body?.previewToken){
      throw new HttpError(400, 'preview_token_requis', 'Relancez le contrôle (preview) avant de confirmer l’import.');
    }
    if(preview.previewToken && body.previewToken !== preview.previewToken){
      throw new HttpError(409, 'preview_obsolete', 'La preview n’est plus à jour. Relancez le contrôle avant de confirmer.', {
        previewToken: preview.previewToken
      });
    }
    const included = preview.lignes.filter((l) => !excluded.has(l.ligneNo));
    const blocking = included.filter((l) =>
      String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT' || l.statut === 'A_ARBITRER'
    );
    if(blocking.length){
      throw new HttpError(422, 'import_refuse', 'Des lignes en erreur ou à arbitrer doivent être corrigées ou exclues avant commit.', {
        erreurs: blocking.map((l) => ({ ligneNo: l.ligneNo, statut: l.statut, raison: l.raison })),
        summary: preview.summary
      });
    }
    if(!included.length){
      throw new HttpError(400, 'import_vide', 'Aucune ligne à importer.');
    }

    return repo.withTransaction(async (tx) => {
      const sourceSha = importContract.sha256Hex(csvText);
      const created = [];
      const skipped = [];
      const imported = [];

      for(const line of included){
        if(line.actionPrevue === 'IGNORER_IDEMPOTENT' || line.statut === 'DEJA_IMPORTE' || line.statut === 'DEJA_PRESENT'){
          skipped.push({ ligneNo: line.ligneNo, statut: line.statut, fingerprint: line.fingerprint });
          continue;
        }
        const evenement = await tx.insertEvenement({
          date: line.date,
          domaine_code: line.domaineStockage,
          sous_domaine_code: line.sousDomaine || null,
          libelle: line.libelle,
          statut: 'PLANIFIE',
          origine: 'IMPORT_CSV',
          mode_suivi: line.modePropose,
          identifiant_externe: line.identifiantExterne || null,
          cible_ids: (line.cibles || []).map((c) => c.cibleId)
        });
        created.push({
          ligneNo: line.ligneNo,
          evenementId: evenement.evenement_id,
          mode: line.modePropose,
          date: line.date
        });
        imported.push({ line, evenement });
      }

      const importRow = await tx.insertImport({
        source_filename: filename || null,
        source_sha256: sourceSha,
        imported_par: actorId(actor),
        statut: 'COMMITE',
        nb_lignes: preview.lignes.length,
        rapport: {
          format: importContract.FORMAT_NATIVE,
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
            type_propose: line.modePropose,
            payload_source: { format: importContract.FORMAT_NATIVE, fields: line },
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
          type_propose: line.modePropose,
          evenement_id: done ? done.evenement.evenement_id : null,
          payload_source: { format: importContract.FORMAT_NATIVE, libelle: line.libelle, mode: line.modePropose },
          raison: line.raison,
          action: skip ? 'IGNORER_IDEMPOTENT' : line.actionPrevue
        });
      }

      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'import',
        entite_id: importRow.import_id,
        action: 'IMPORTER_PROGRAMME_EXERCICES',
        apres: {
          filename,
          format: importContract.FORMAT_NATIVE,
          fingerprint: sourceSha,
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded]
        }
      });

      return {
        importId: importRow.import_id,
        format: importContract.FORMAT_NATIVE,
        created,
        skipped,
        excluded: [...excluded],
        summary: {
          nbLignes: preview.lignes.length,
          imported: created.length,
          dejaImporte: skipped.length,
          exclus: excluded.size,
          erreurs: 0,
          rollback: 0
        }
      };
    });
  }

  async function commitImportEvenements(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    if(!csvText.trim()){
      throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
    }
    const format = importContract.detectCsvFormatFromText(csvText);
    if(format === importContract.FORMAT_NATIVE){
      return commitNativeImport(body, actor);
    }
    if(format === importContract.FORMAT_STANDARD){
      return commitStandardImport(body, actor);
    }
    if(format !== importContract.FORMAT_F7){
      throw new HttpError(400, 'format_csv_inconnu', 'Format CSV non reconnu. Utilisez le programme SCOPE ou l’historique Monitoring F7.');
    }
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
        format: csvImport.IMPORT_PROFIL,
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
    retirerEncadrement,
    resetParticipations,
    cloturer,
    reouvrir,
    annulerEvenement,
    supprimerOuAnnulerEvenement,
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
    syncExpectedPopulationForPersonnes,
    reconcileExpectedPopulation,
    assertNoAffectationOverlap,
    assertNoAffectationOverlapInDomain,
    computeTaux,
    expectedPopulationCoherence
  };
}

module.exports = { createScopeService, requireBaseVersion };
