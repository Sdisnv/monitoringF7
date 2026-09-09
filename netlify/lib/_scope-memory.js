const { randomUUID } = require('crypto');
const { DOMAINES, CIBLES, SOUS_DOMAINES, DOMAINES_MODEL_2 } = require('./_scope-schema');
const { isoDate } = require('./_scope-rules');
const { periodFromPersonneRow } = require('./_scope-personnel');

function now(){ return new Date().toISOString(); }

function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return String(value).slice(0, 10);
}

function createMemoryRepo(){
  const domaines = DOMAINES.map(d => {
    const extra = DOMAINES_MODEL_2[d.code] || {};
    return {
      code: d.code,
      libelle: extra.libelle || d.libelle,
      nature: extra.nature || 'DOMAINE',
      parent_code: extra.parentCode || null,
      libelle_affiche: extra.libelleAffiche || d.code,
      actif: true
    };
  });
  const sousDomaines = SOUS_DOMAINES.map((row) => ({
    code: row.code,
    domaine_parent: row.domaineParent,
    libelle: row.libelle,
    libelle_affiche: row.libelleAffiche,
    actif: true
  }));
  const cibles = CIBLES.map(([domaine_code, niveau_code, libelle]) => ({
    cible_id: randomUUID(),
    domaine_code,
    niveau_code,
    libelle,
    actif: true
  }));
  const personnes = new Map();
  const affectations = new Map();
  const evenements = new Map();
  const evenementCibles = new Map();
  const attendus = new Map();
  const participations = new Map();
  const legacy = new Map();
  const journal = [];
  const reglesBascule = new Map();
  const imports = new Map();
  const importLignes = new Map();
  const quantitatives = new Map();
  const objectifs = new Map();
  const acquittements = new Map();
  const suiviNominatif = new Map();
  const periodes = new Map();
  const cycles = new Map();
  const cyclePersonnes = new Map();
  const exercices = new Map();
  const eventDefinitions = new Map();
  const eventDefinitionVersions = new Map();
  const participationPolicyVersions = new Map();
  const multisessionsV2 = new Map();
  const multisessionV2Sessions = new Map();
  const multisessionV2Population = new Map();
  const multisessionV2Participations = new Map();
  const policy = require('./_scope-participation-policy');
  const participationMotifs = new Map(policy.motifCatalog().map((row) => [row.id, {
    motif_id: row.id,
    motif_type: row.type,
    label: row.label,
    actif: row.active !== false,
    historique: row.historical === true,
    display_order: row.order,
    group_code: row.group,
    metadata: {}
  }]));
  const participationPolicies = new Map(policy.listDefaultPolicies().map((row) => [row.domainCode, {
    domain_code: row.domainCode,
    policy_version: row.policyVersion,
    config: JSON.parse(JSON.stringify(row)),
    actif: true,
    commentaire: 'Configuration SDIS NV par défaut - équivalence V1',
    auteur_id: null
  }]));
  const catalog = require('./_scope-generic-event-catalog');
  policy.listDefaultPolicies().forEach((row) => {
    const version = catalog.policyVersionFromDomainPolicy(row, { year: 2026 });
    const id = version.policy_version_id || randomUUID();
    participationPolicyVersions.set(id, Object.assign({}, version, {
      policy_version_id: id,
      created_at: now(),
      updated_at: now()
    }));
  });
  const dapPolicy = policy.resolveParticipationPolicy('DAP');
  const dapMultiConfig = Object.assign({}, dapPolicy, {
    policyVersion: 'dap-multisession-2026',
    activeStatuses: (dapPolicy.activeStatuses || []).filter((status) => status !== 'PERMUTATION'),
    behavior: Object.assign({}, dapPolicy.behavior || {}, {
      propagationScope: 'ALL_EXERCISE_SESSIONS',
      deduplicationScope: 'EXERCISE'
    })
  });
  const dapMultiPolicyVersion = catalog.normalizePolicyVersion({
    policy_code: 'DAP-MULTISESSION',
    domain: 'DAP',
    version_code: '2026',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    config: dapMultiConfig,
    metadata: { source: 'generic_event_session_policy_architecture_1', explicit: true }
  });
  dapMultiPolicyVersion.policy_version_id = dapMultiPolicyVersion.policy_version_id || randomUUID();
  participationPolicyVersions.set(dapMultiPolicyVersion.policy_version_id, Object.assign({}, dapMultiPolicyVersion, {
    created_at: now(),
    updated_at: now()
  }));
  const dapDefinition = catalog.normalizeDefinition({
    code: 'DAP-FORMATION-GROUPEE',
    label: 'Formation groupée DAP',
    domain: 'DAP',
    description: 'Premier modèle générique raccordable au Multi-session V2 validé.',
    metadata: { source: 'generic_event_session_policy_architecture_1', explicit: true }
  });
  dapDefinition.definition_id = dapDefinition.definition_id || randomUUID();
  eventDefinitions.set(dapDefinition.definition_id, Object.assign({}, dapDefinition, {
    created_at: now(),
    updated_at: now()
  }));
  const dapDefinitionVersion = catalog.normalizeDefinitionVersion({
    definition_id: dapDefinition.definition_id,
    version_code: '2026',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    mode_organisation: catalog.ORGANISATION_MODES.MULTI_SESSION,
    session_count: 2,
    policy_version_id: dapMultiPolicyVersion.policy_version_id,
    population_rule: { type: 'SCOPE_TARGET_RULE', domain: 'DAP', scope: 'CIBLES_EVENEMENT' },
    numbering_pattern: '{label} {index.major}.{index.minor}',
    metadata: { source: 'generic_event_session_policy_architecture_1', reference: 'DAP-FORMATION-GROUPEE-1-2026' }
  });
  dapDefinitionVersion.definition_version_id = dapDefinitionVersion.definition_version_id || randomUUID();
  eventDefinitionVersions.set(dapDefinitionVersion.definition_version_id, Object.assign({}, dapDefinitionVersion, {
    created_at: now(),
    updated_at: now()
  }));
  const permutations = new Map();
  suiviNominatif.set('8c0a0002-2026-4000-8000-000000000001', {
    suivi_id: '8c0a0002-2026-4000-8000-000000000001',
    portee: 'GLOBAL',
    domaine_code: null,
    sous_domaine_code: null,
    cible_id: null,
    nominatif_autorise: true,
    date_debut: '2020-01-01',
    date_fin: null,
    commentaire: 'MODEL-2 : nominatif possible pour tous les domaines.'
  });
  let txLevel = 0;

  function keyEP(evenementId, personneId){ return `${evenementId}::${personneId}`; }
  function keyLigne(importId, ligneNo){ return `${importId}::${ligneNo}`; }
  function keyCP(cycleId, personneId, roleCycle){ return `${cycleId}::${personneId}::${roleCycle || 'PARTICIPANT'}`; }
  function keyMsSession(multisessionId, eventId){ return `${multisessionId}::${eventId}`; }
  function keyMsPopulation(multisessionId, personneId){ return `${multisessionId}::${personneId}`; }
  function keyMsParticipation(multisessionId, sessionId, personneId, role){ return `${multisessionId}::${sessionId}::${personneId}::${role || 'PARTICIPANT'}`; }

  function decorateEvent(item){
    if(!item) return null;
    const exercice = item.exercice_id ? exercices.get(item.exercice_id) : null;
    return {
      ...item,
      date: dateOnly(item.date),
      exercice_key: exercice ? exercice.exercice_key : null,
      exercice_code: exercice ? exercice.code : null,
      exercice_libelle: exercice ? exercice.libelle : null,
      mode_session: exercice ? exercice.mode_session : null,
      nombre_sessions_attendu: exercice ? exercice.nombre_sessions_attendu : null,
      consolidation_active: exercice ? exercice.consolidation_active : false,
      definition_version_id: item.definition_version_id || (exercice && exercice.definition_version_id) || null,
      policy_version_id: item.policy_version_id || (exercice && exercice.policy_version_id) || null,
      engine_route: item.engine_route || (exercice && exercice.engine_route) || null,
      engine_snapshot: item.engine_snapshot || null,
      exercice: exercice ? { ...exercice } : null
    };
  }

  function cloneMap(map){
    return new Map([...map.entries()].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
  }

  function snapshot(){
    return {
      personnes: cloneMap(personnes),
      affectations: cloneMap(affectations),
      evenements: cloneMap(evenements),
      evenementCibles: new Map([...evenementCibles.entries()].map(([k, v]) => [k, [...v]])),
      attendus: cloneMap(attendus),
      participations: cloneMap(participations),
      legacy: cloneMap(legacy),
      journal: JSON.parse(JSON.stringify(journal)),
      reglesBascule: cloneMap(reglesBascule),
      imports: cloneMap(imports),
      importLignes: cloneMap(importLignes),
      quantitatives: cloneMap(quantitatives),
      objectifs: cloneMap(objectifs),
      acquittements: cloneMap(acquittements),
      suiviNominatif: cloneMap(suiviNominatif),
      periodes: cloneMap(periodes),
      cycles: cloneMap(cycles),
      cyclePersonnes: cloneMap(cyclePersonnes),
      exercices: cloneMap(exercices),
      eventDefinitions: cloneMap(eventDefinitions),
      eventDefinitionVersions: cloneMap(eventDefinitionVersions),
      participationPolicyVersions: cloneMap(participationPolicyVersions),
      multisessionsV2: cloneMap(multisessionsV2),
      multisessionV2Sessions: cloneMap(multisessionV2Sessions),
      multisessionV2Population: cloneMap(multisessionV2Population),
      multisessionV2Participations: cloneMap(multisessionV2Participations),
      participationMotifs: cloneMap(participationMotifs),
      participationPolicies: cloneMap(participationPolicies),
      permutations: cloneMap(permutations)
    };
  }

  function restore(snap){
    personnes.clear(); snap.personnes.forEach((v, k) => personnes.set(k, v));
    affectations.clear(); snap.affectations.forEach((v, k) => affectations.set(k, v));
    evenements.clear(); snap.evenements.forEach((v, k) => evenements.set(k, v));
    evenementCibles.clear(); snap.evenementCibles.forEach((v, k) => evenementCibles.set(k, v));
    attendus.clear(); snap.attendus.forEach((v, k) => attendus.set(k, v));
    participations.clear(); snap.participations.forEach((v, k) => participations.set(k, v));
    legacy.clear(); snap.legacy.forEach((v, k) => legacy.set(k, v));
    journal.splice(0, journal.length, ...snap.journal);
    reglesBascule.clear(); snap.reglesBascule.forEach((v, k) => reglesBascule.set(k, v));
    imports.clear(); snap.imports.forEach((v, k) => imports.set(k, v));
    importLignes.clear(); snap.importLignes.forEach((v, k) => importLignes.set(k, v));
    quantitatives.clear(); (snap.quantitatives || new Map()).forEach((v, k) => quantitatives.set(k, v));
    objectifs.clear(); (snap.objectifs || new Map()).forEach((v, k) => objectifs.set(k, v));
    acquittements.clear(); (snap.acquittements || new Map()).forEach((v, k) => acquittements.set(k, v));
    suiviNominatif.clear(); (snap.suiviNominatif || new Map()).forEach((v, k) => suiviNominatif.set(k, v));
    periodes.clear(); (snap.periodes || new Map()).forEach((v, k) => periodes.set(k, v));
    cycles.clear(); (snap.cycles || new Map()).forEach((v, k) => cycles.set(k, v));
    cyclePersonnes.clear(); (snap.cyclePersonnes || new Map()).forEach((v, k) => cyclePersonnes.set(k, v));
    exercices.clear(); (snap.exercices || new Map()).forEach((v, k) => exercices.set(k, v));
    eventDefinitions.clear(); (snap.eventDefinitions || new Map()).forEach((v, k) => eventDefinitions.set(k, v));
    eventDefinitionVersions.clear(); (snap.eventDefinitionVersions || new Map()).forEach((v, k) => eventDefinitionVersions.set(k, v));
    participationPolicyVersions.clear(); (snap.participationPolicyVersions || new Map()).forEach((v, k) => participationPolicyVersions.set(k, v));
    multisessionsV2.clear(); (snap.multisessionsV2 || new Map()).forEach((v, k) => multisessionsV2.set(k, v));
    multisessionV2Sessions.clear(); (snap.multisessionV2Sessions || new Map()).forEach((v, k) => multisessionV2Sessions.set(k, v));
    multisessionV2Population.clear(); (snap.multisessionV2Population || new Map()).forEach((v, k) => multisessionV2Population.set(k, v));
    multisessionV2Participations.clear(); (snap.multisessionV2Participations || new Map()).forEach((v, k) => multisessionV2Participations.set(k, v));
    participationMotifs.clear(); (snap.participationMotifs || new Map()).forEach((v, k) => participationMotifs.set(k, v));
    participationPolicies.clear(); (snap.participationPolicies || new Map()).forEach((v, k) => participationPolicies.set(k, v));
    permutations.clear(); (snap.permutations || new Map()).forEach((v, k) => permutations.set(k, v));
  }

  const api = {
    async withTransaction(fn){
      if(txLevel > 0) return fn(api);
      const snap = snapshot();
      txLevel += 1;
      try{
        const result = await fn(api);
        txLevel -= 1;
        return result;
      }catch(error){
        restore(snap);
        txLevel -= 1;
        throw error;
      }
    },
    async listDomaines(){ return domaines.filter(d => d.actif !== false); },
    async listSousDomaines(){ return sousDomaines.filter(d => d.actif !== false); },
    async listSuiviNominatif(){ return [...suiviNominatif.values()].map((row) => ({ ...row })); },
    async listCibles(){ return cibles.filter(c => c.actif !== false); },
    async getCible(id){ return cibles.find(c => c.cible_id === id) || null; },
    async findCible(domaine, niveau){
      return cibles.find(c => c.domaine_code === domaine && c.niveau_code === niveau) || null;
    },
    async insertPersonne(row){
      const item = {
        personne_id: row.personne_id || randomUUID(),
        nip: String(row.nip),
        nom: row.nom,
        prenom: row.prenom,
        grade: row.grade || null,
        actif: row.actif !== false,
        statut_rh: row.statut_rh || (row.actif === false ? 'INACTIF' : 'ACTIF'),
        date_entree: isoDate(row.date_entree) || null,
        date_sortie: isoDate(row.date_sortie) || null,
        source: row.source || 'MANUEL',
        created_at: now(),
        updated_at: now()
      };
      if([...personnes.values()].some(p => p.nip === item.nip)) throw new Error('nip_unique');
      personnes.set(item.personne_id, item);
      if(!row.skipPeriodes){
        for(const periode of periodFromPersonneRow(item)){
          const stored = {
            periode_id: randomUUID(),
            personne_id: item.personne_id,
            type: periode.type,
            date_debut: periode.date_debut,
            date_fin: periode.date_fin,
            motif: periode.motif,
            source: periode.source || 'MANUEL',
            created_at: now(),
            updated_at: now()
          };
          periodes.set(stored.periode_id, stored);
        }
      }
      return item;
    },
    async updatePersonne(id, patch){
      const item = personnes.get(id);
      if(!item) return null;
      const clean = {};
      for(const [key, value] of Object.entries(patch || {})){
        if(value !== undefined) clean[key] = value;
      }
      Object.assign(item, clean, { updated_at: now() });
      return item;
    },
    async listPersonnesPeriodes(personneId){
      return [...periodes.values()]
        .filter((row) => row.personne_id === personneId)
        .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)));
    },
    async listAllPeriodes(){
      return [...periodes.values()].sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)));
    },
    async insertPeriode(row){
      const item = {
        periode_id: row.periode_id || randomUUID(),
        personne_id: row.personne_id,
        type: row.type,
        date_debut: isoDate(row.date_debut),
        date_fin: isoDate(row.date_fin),
        motif: row.motif || null,
        source: row.source || 'MANUEL',
        created_at: now(),
        updated_at: now()
      };
      periodes.set(item.periode_id, item);
      return item;
    },
    async updatePeriode(id, patch){
      const item = periodes.get(id);
      if(!item) return null;
      Object.assign(item, patch, {
        date_debut: patch.date_debut !== undefined ? isoDate(patch.date_debut) : item.date_debut,
        date_fin: patch.date_fin !== undefined ? isoDate(patch.date_fin) : item.date_fin,
        updated_at: now()
      });
      return item;
    },
    async getPersonne(id){ return personnes.get(id) || null; },
    async getPersonneByNip(nip){
      return [...personnes.values()].find((p) => p.nip === String(nip)) || null;
    },
    async upsertPersonne(row){
      const existing = await api.getPersonneByNip(row.nip);
      if(existing){
        Object.assign(existing, {
          nom: row.nom, prenom: row.prenom, grade: row.grade || existing.grade,
          source: row.source || existing.source, updated_at: now()
        });
        return existing;
      }
      return api.insertPersonne(row);
    },
    async listPersonnes({ q } = {}){
      const query = String(q || '').trim().toLowerCase();
      return [...personnes.values()].filter(p => {
        if(!query) return true;
        return p.nip.toLowerCase().includes(query)
          || p.nom.toLowerCase().includes(query)
          || p.prenom.toLowerCase().includes(query)
          || `${p.nom} ${p.prenom}`.toLowerCase().includes(query)
          || `${p.prenom} ${p.nom}`.toLowerCase().includes(query);
      });
    },
    async countPersonnes(){
      return personnes.size;
    },
    async insertAffectation(row){
      const cibleRow = row.cible_id ? cibles.find((c) => c.cible_id === row.cible_id) : null;
      const item = {
        affectation_id: row.affectation_id || randomUUID(),
        personne_id: row.personne_id,
        cible_id: row.cible_id,
        domaine: row.domaine || cibleRow?.domaine_code || null,
        cible: row.cible || cibleRow?.niveau_code || null,
        domaine_code: row.domaine_code || cibleRow?.domaine_code || null,
        niveau_code: row.niveau_code || cibleRow?.niveau_code || null,
        date_debut: isoDate(row.date_debut),
        date_fin: isoDate(row.date_fin),
        source: row.source || 'MANUEL',
        created_at: now(),
        updated_at: now()
      };
      affectations.set(item.affectation_id, item);
      return item;
    },
    async updateAffectation(id, patch){
      const item = affectations.get(id);
      if(!item) return null;
      if(patch.date_debut !== undefined) item.date_debut = isoDate(patch.date_debut);
      if(patch.date_fin !== undefined) item.date_fin = isoDate(patch.date_fin);
      if(patch.cible_id) item.cible_id = patch.cible_id;
      item.updated_at = now();
      return item;
    },
    async listAffectations({ personneId, date } = {}){
      return [...affectations.values()].filter(a => {
        if(personneId && a.personne_id !== personneId) return false;
        if(date){
          const d = isoDate(date);
          if(a.date_debut > d) return false;
          if(a.date_fin && a.date_fin < d) return false;
        }
        return true;
      });
    },
    async listAffectationsForCibles(cibleIds, date){
      const set = new Set(cibleIds);
      const d = isoDate(date);
      return [...affectations.values()].filter(a => {
        if(!set.has(a.cible_id)) return false;
        if(a.date_debut > d) return false;
        if(a.date_fin && a.date_fin < d) return false;
        return true;
      });
    },
    async insertEvenement(row){
      const codeCours = row.code_cours || row.codeCours || null;
      if(codeCours){
        const existing = [...evenements.values()].find((item) => item.code_cours === codeCours);
        if(existing){
          const current = evenementCibles.get(existing.evenement_id) || [];
          evenementCibles.set(existing.evenement_id, [...new Set(current.concat(row.cible_ids || []))]);
          return { ...decorateEvent(existing), already_exists: true };
        }
      }
      const item = {
        evenement_id: row.evenement_id || randomUUID(),
        date: isoDate(row.date),
        domaine_code: row.domaine_code,
        sous_domaine_code: row.sous_domaine_code || null,
        libelle: String(row.libelle).trim(),
        statut: row.statut || 'PLANIFIE',
        origine: row.origine || 'NOMINATIF',
        mode_suivi: require('./_scope-analytics').inferModeSuivi(row),
        identifiant_externe: row.identifiant_externe || row.identifiantExterne || null,
        internal_event_id: row.internal_event_id || row.internalEventId || row.evenement_id || null,
        code_cours: codeCours,
        code_source: row.code_source || row.codeSource || row.code_cours || row.codeCours || null,
        source_type: row.source_type || row.sourceType || (row.origine === 'IMPORT_CSV' ? 'CSV' : 'MANUEL'),
        heure_debut: row.heure_debut || row.heureDebut || null,
        heure_fin: row.heure_fin || row.heureFin || null,
        salle: row.salle || null,
        responsable: row.responsable || null,
        cycle_id: row.cycle_id || row.cycleId || null,
        exercice_id: row.exercice_id || row.exerciceId || null,
        session_index: row.session_index == null ? (row.sessionIndex == null ? null : Number(row.sessionIndex)) : Number(row.session_index),
        session_label: row.session_label || row.sessionLabel || null,
        pr_exercise_group_key: row.pr_exercise_group_key || row.prExerciseGroupKey || null,
        pr_session_key: row.pr_session_key || row.prSessionKey || null,
        participation_policy_version: row.participation_policy_version || row.participationPolicyVersion || null,
        participation_policy_snapshot: row.participation_policy_snapshot || row.participationPolicySnapshot || null,
        definition_version_id: row.definition_version_id || row.definitionVersionId || null,
        policy_version_id: row.policy_version_id || row.policyVersionId || null,
        engine_route: row.engine_route || row.engineRoute || null,
        engine_snapshot: row.engine_snapshot || row.engineSnapshot || null,
        exercise_equivalence_key: row.exercise_equivalence_key || row.exerciseEquivalenceKey || null,
        population_figee: false,
        population_version: 0,
        figee_at: null,
        figee_par: null,
        cloture_at: null,
        cloture_par: null,
        version: 1,
        created_at: now(),
        updated_at: now()
      };
      evenements.set(item.evenement_id, item);
      evenementCibles.set(item.evenement_id, [...(row.cible_ids || [])]);
      return { ...decorateEvent(item), already_exists: false };
    },
    async listEvenements({ annee, statut, domaine, from, to } = {}){
      return [...evenements.values()]
        .filter((item) => {
          if(annee && String(item.date).slice(0, 4) !== String(annee)) return false;
          if(statut && item.statut !== statut) return false;
          if(domaine && item.domaine_code !== domaine) return false;
          const day = dateOnly(item.date);
          if(from && day && day < isoDate(from)) return false;
          if(to && day && day > isoDate(to)) return false;
          return true;
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.libelle).localeCompare(String(b.libelle)))
        .map(decorateEvent);
    },
    async getEvent(id){
      const item = evenements.get(id);
      if(!item) return null;
      return decorateEvent(item);
    },
    async getEventForUpdate(id){ return api.getEvent(id); },
    async listEventCibleIds(id){ return evenementCibles.get(id) || []; },
    async setEventCibles(id, cibleIds){ evenementCibles.set(id, [...cibleIds]); },
    async updateEventIfVersion(id, baseVersion, patch){
      const item = evenements.get(id);
      if(!item) return null;
      if(item.version !== Number(baseVersion)) return null;
      Object.assign(item, patch, { version: item.version + 1, updated_at: now() });
      evenements.set(id, item);
      return decorateEvent(item);
    },
    async nextManualEventSequence(){
      let max = 0;
      for(const item of evenements.values()){
        const m = String(item.code_cours || '').match(/S(\d+)$/);
        if(m) max = Math.max(max, Number(m[1]));
      }
      return max + 1;
    },
    async deleteEventIfNoDependencies(eventId){
      const hasAttendus = [...attendus.values()].some((row) => row.evenement_id === eventId);
      const hasParticipations = [...participations.values()].some((row) => row.evenement_id === eventId);
      if(hasAttendus || hasParticipations) return { deleted: false, reason: 'dependencies' };
      const event = evenements.get(eventId);
      evenementCibles.delete(eventId);
      evenements.delete(eventId);
      return { deleted: Boolean(event), event: event || null };
    },
    async upsertMultisessionV2(row){
      const existing = row.multisession_id
        ? multisessionsV2.get(String(row.multisession_id))
        : [...multisessionsV2.values()].find((item) => item.code === row.code);
      const item = {
        ...(existing || {}),
        multisession_id: existing?.multisession_id || row.multisession_id || randomUUID(),
        code: row.code,
        label: row.label,
        domain: row.domain || row.domaine || row.domaine_code,
        period: row.period || null,
        status: row.status || 'OUVERTE',
        closed_at: row.closed_at || existing?.closed_at || null,
        closed_by: row.closed_by || existing?.closed_by || null,
        metadata: row.metadata || existing?.metadata || {},
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      multisessionsV2.set(String(item.multisession_id), item);
      return { ...item };
    },
    async getMultisessionV2(id){
      const item = multisessionsV2.get(String(id));
      return item ? { ...item } : null;
    },
    async getMultisessionV2ForEvent(eventId){
      const session = [...multisessionV2Sessions.values()].find((row) => row.event_id === eventId);
      if(!session) return null;
      const item = multisessionsV2.get(String(session.multisession_id));
      return item ? { ...item } : null;
    },
    async listMultisessionV2Sessions(multisessionId){
      return [...multisessionV2Sessions.values()]
        .filter((row) => row.multisession_id === multisessionId)
        .map((row) => ({ ...decorateEvent(evenements.get(row.event_id)), multisession_session_id: row.multisession_session_id, multisession_id: row.multisession_id, event_id: row.event_id, sequence: row.sequence, status: row.status, metadata: row.metadata }));
    },
    async upsertMultisessionV2Session(row){
      const existing = [...multisessionV2Sessions.values()].find((item) => item.event_id === row.event_id)
        || multisessionV2Sessions.get(keyMsSession(row.multisession_id, row.event_id));
      const item = {
        ...(existing || {}),
        multisession_session_id: existing?.multisession_session_id || row.multisession_session_id || randomUUID(),
        multisession_id: row.multisession_id,
        event_id: row.event_id,
        sequence: Number(row.sequence || existing?.sequence || 1),
        status: row.status || existing?.status || 'OUVERTE',
        metadata: row.metadata || existing?.metadata || {},
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      multisessionV2Sessions.set(keyMsSession(item.multisession_id, item.event_id), item);
      return { ...item };
    },
    async listMultisessionV2Population(multisessionId){
      return [...multisessionV2Population.values()].filter((row) => row.multisession_id === multisessionId).map((row) => ({ ...row }));
    },
    async upsertMultisessionV2Population(row){
      const item = {
        multisession_id: row.multisession_id,
        person_id: row.person_id || row.personne_id,
        personne_id: row.person_id || row.personne_id,
        snapshot: row.snapshot || {},
        provenance: row.provenance || 'ATTENDUS_CONSOLIDES',
        created_at: row.created_at || now(),
        updated_at: now()
      };
      multisessionV2Population.set(keyMsPopulation(item.multisession_id, item.person_id), item);
      return { ...item };
    },
    async upsertMultisessionV2Participation(row){
      const item = {
        multisession_id: row.multisession_id,
        session_id: row.session_id || row.event_id,
        person_id: row.person_id || row.personne_id,
        personne_id: row.person_id || row.personne_id,
        attendance_status: row.attendance_status || row.statut,
        role: row.role || 'PARTICIPANT',
        reason: row.reason || row.motif_absence || null,
        created_by: row.created_by || row.auteur_id || null,
        created_at: row.created_at || now(),
        updated_at: now()
      };
      multisessionV2Participations.set(keyMsParticipation(item.multisession_id, item.session_id, item.person_id, item.role), item);
      return { ...item };
    },
    async updateMultisessionV2(id, patch){
      const item = multisessionsV2.get(String(id));
      if(!item) return null;
      Object.assign(item, patch || {}, { updated_at: now() });
      multisessionsV2.set(String(id), item);
      return { ...item };
    },
    async listAttendus(eventId){
      return [...attendus.values()].filter(a => a.evenement_id === eventId);
    },
    async listAttendusForEvents(ids){
      const set = new Set(ids || []);
      return [...attendus.values()].filter((a) => set.has(a.evenement_id));
    },
    async getAttendu(eventId, personneId){ return attendus.get(keyEP(eventId, personneId)) || null; },
    async upsertAttendu(row){
      const item = {
        evenement_id: row.evenement_id,
        personne_id: row.personne_id,
        inclus: row.inclus !== false,
        origine: row.origine,
        origine_retrait: row.origine_retrait || null,
        motif_inclusion: row.motif_inclusion || null,
        created_at: row.created_at || now(),
        updated_at: now()
      };
      attendus.set(keyEP(item.evenement_id, item.personne_id), item);
      return item;
    },
    async bulkUpsertAttendus(rows){
      const out = [];
      for(const row of rows || []) out.push(await api.upsertAttendu(row));
      return out;
    },
    async listParticipations(eventId){
      return [...participations.values()].filter(p => p.evenement_id === eventId);
    },
    async listParticipationsForEvents(ids){
      const set = new Set(ids || []);
      return [...participations.values()].filter((p) => set.has(p.evenement_id));
    },
    async getParticipation(eventId, personneId){
      return participations.get(keyEP(eventId, personneId)) || null;
    },
    async deleteParticipation(eventId, personneId){
      return participations.delete(keyEP(eventId, personneId));
    },
    async upsertParticipation(row){
      const existing = participations.get(keyEP(row.evenement_id, row.personne_id));
      const item = {
        evenement_id: row.evenement_id,
        personne_id: row.personne_id,
        statut: row.statut,
        motif_absence: row.motif_absence || null,
        commentaire: row.commentaire || null,
        cible_suivie_id: row.cible_suivie_id || null,
        role: row.role || 'PARTICIPANT',
        source: row.source || 'SAISIE',
        auteur_id: row.auteur_id || null,
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      participations.set(keyEP(item.evenement_id, item.personne_id), item);
      return item;
    },
    async bulkUpsertParticipations(rows){
      const out = [];
      for(const row of rows || []) out.push(await api.upsertParticipation(row));
      return out;
    },
    async upsertPermutation(row){
      const existing = row.permutation_id
        ? permutations.get(String(row.permutation_id))
        : [...permutations.values()].find((item) =>
          String(item.personne_id) === String(row.personne_id)
          && String(item.source_evenement_id) === String(row.source_evenement_id)
        );
      const id = (existing && existing.permutation_id) || row.permutation_id || randomUUID();
      const item = {
        ...(existing || {}),
        permutation_id: id,
        personne_id: row.personne_id || (existing && existing.personne_id),
        source_evenement_id: row.source_evenement_id || (existing && existing.source_evenement_id),
        source_exercise_key: row.source_exercise_key || (existing && existing.source_exercise_key),
        source_cible_id: row.source_cible_id || null,
        source_date: dateOnly(row.source_date || (existing && existing.source_date)),
        rattrapage_evenement_id: Object.prototype.hasOwnProperty.call(row, 'rattrapage_evenement_id') ? row.rattrapage_evenement_id : (existing && existing.rattrapage_evenement_id) || null,
        rattrapage_cible_id: Object.prototype.hasOwnProperty.call(row, 'rattrapage_cible_id') ? row.rattrapage_cible_id : (existing && existing.rattrapage_cible_id) || null,
        rattrapage_date: dateOnly(Object.prototype.hasOwnProperty.call(row, 'rattrapage_date') ? row.rattrapage_date : (existing && existing.rattrapage_date)),
        statut: row.statut || (existing && existing.statut) || 'A_RATTRAPER',
        regularisation_motif: Object.prototype.hasOwnProperty.call(row, 'regularisation_motif') ? row.regularisation_motif : (existing && existing.regularisation_motif) || null,
        commentaire: Object.prototype.hasOwnProperty.call(row, 'commentaire') ? row.commentaire : (existing && existing.commentaire) || null,
        auteur_id: row.auteur_id || (existing && existing.auteur_id) || null,
        created_at: (existing && existing.created_at) || now(),
        updated_at: now()
      };
      permutations.set(id, item);
      return { ...item };
    },
    async listPermutations(filter = {}){
      return [...permutations.values()].filter((row) => {
        if(filter.personneId && String(row.personne_id) !== String(filter.personneId)) return false;
        if(filter.personne_id && String(row.personne_id) !== String(filter.personne_id)) return false;
        if(filter.sourceEvenementId && String(row.source_evenement_id) !== String(filter.sourceEvenementId)) return false;
        if(filter.source_evenement_id && String(row.source_evenement_id) !== String(filter.source_evenement_id)) return false;
        if(filter.sourceEvenementIds){
          const ids = new Set((filter.sourceEvenementIds || []).map(String));
          if(!ids.has(String(row.source_evenement_id))) return false;
        }
        if(filter.sourceExerciseKey && String(row.source_exercise_key) !== String(filter.sourceExerciseKey)) return false;
        if(filter.source_exercise_key && String(row.source_exercise_key) !== String(filter.source_exercise_key)) return false;
        if(filter.statut){
          const statuses = Array.isArray(filter.statut) ? filter.statut : [filter.statut];
          if(!statuses.includes(row.statut)) return false;
        }
        return true;
      }).map((row) => ({ ...row }));
    },
    async getPermutation(id){
      const item = permutations.get(String(id));
      return item ? { ...item } : null;
    },
    async deletePermutation(id){
      return permutations.delete(String(id));
    },
    async insertLegacy(row){
      const item = {
        legacy_id: row.legacy_id || randomUUID(),
        source_record_id: row.source_record_id || null,
        date: isoDate(row.date),
        domaine_code: row.domaine_code,
        libelle: row.libelle || null,
        nb_convoques: row.nb_convoques ?? null,
        nb_presents: row.nb_presents ?? null,
        nb_excuses: row.nb_excuses ?? null,
        nb_absents: row.nb_absents ?? null,
        payload_v67: row.payload_v67 || null,
        evenement_id: row.evenement_id || null,
        fingerprint: row.fingerprint || null,
        created_at: now(),
        updated_at: now()
      };
      legacy.set(item.legacy_id, item);
      return item;
    },
    async listLegacy(){ return [...legacy.values()]; },
    async listCycles({ annee, domaine, statut } = {}){
      return [...cycles.values()]
        .filter((item) => {
          if(annee && Number(item.annee) !== Number(annee)) return false;
          if(domaine && item.domaine_code !== domaine) return false;
          if(statut && item.statut !== statut) return false;
          return true;
        })
        .sort((a, b) => String(b.annee || '').localeCompare(String(a.annee || '')) || String(a.libelle).localeCompare(String(b.libelle)))
        .map((item) => ({ ...item }));
    },
    async getCycle(id){ return cycles.get(id) ? { ...cycles.get(id) } : null; },
    async getCycleByKey(cycleKey){
      const item = [...cycles.values()].find((row) => row.cycle_key === cycleKey);
      return item ? { ...item } : null;
    },
    async insertCycle(row){
      if(row.cycle_key && [...cycles.values()].some((item) => item.cycle_key === row.cycle_key)){
        const err = new Error('cycle_key_unique');
        err.code = '23505';
        throw err;
      }
      const item = {
        cycle_id: row.cycle_id || randomUUID(),
        cycle_key: row.cycle_key || null,
        annee: row.annee == null ? null : Number(row.annee),
        domaine_code: row.domaine_code,
        type_cycle: row.type_cycle || null,
        libelle: row.libelle,
        statut: row.statut || 'PLANIFIE',
        stat_com: row.stat_com || null,
        qui: row.qui || null,
        date_debut: isoDate(row.date_debut),
        date_fin: isoDate(row.date_fin),
        source_type: row.source_type || 'MANUEL',
        metadata: row.metadata || {},
        created_at: now(),
        updated_at: now()
      };
      cycles.set(item.cycle_id, item);
      return { ...item };
    },
    async updateCycle(id, patch){
      const item = cycles.get(id);
      if(!item) return null;
      const clean = {};
      for(const [key, value] of Object.entries(patch || {})){
        if(value !== undefined) clean[key] = value;
      }
      Object.assign(item, clean, {
        annee: clean.annee !== undefined ? Number(clean.annee) : item.annee,
        date_debut: clean.date_debut !== undefined ? isoDate(clean.date_debut) : item.date_debut,
        date_fin: clean.date_fin !== undefined ? isoDate(clean.date_fin) : item.date_fin,
        updated_at: now()
      });
      return { ...item };
    },
    async listCycleEvents(cycleId){
      return [...evenements.values()]
        .filter((item) => item.cycle_id === cycleId)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.libelle).localeCompare(String(b.libelle)))
        .map(decorateEvent);
    },
    async listPrExerciseEvents(groupKey){
      const textKey = String(groupKey || '');
      if(textKey.startsWith('EXERCICE:') && api.listExerciseEvents){
        return api.listExerciseEvents(textKey.slice('EXERCICE:'.length));
      }
      return [...evenements.values()]
        .filter((item) => item.pr_exercise_group_key === groupKey)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.libelle).localeCompare(String(b.libelle)))
        .map(decorateEvent);
    },
    async listExerciseEvents(exerciceId){
      return [...evenements.values()]
        .filter((item) => item.exercice_id === exerciceId)
        .sort((a, b) => (Number(a.session_index || 999999) - Number(b.session_index || 999999)) || String(a.date).localeCompare(String(b.date)) || String(a.libelle).localeCompare(String(b.libelle)))
        .map(decorateEvent);
    },
    async getExercise(id){
      const item = exercices.get(id);
      return item ? { ...item } : null;
    },
    async getExerciseByKey(exerciceKey){
      const item = [...exercices.values()].find((row) => row.exercice_key === exerciceKey);
      return item ? { ...item } : null;
    },
    async upsertExercise(row){
      const key = row.exercice_key || row.exerciceKey || null;
      const existing = key ? [...exercices.values()].find((item) => item.exercice_key === key) : null;
      const item = existing || {
        exercice_id: row.exercice_id || row.exerciceId || randomUUID(),
        created_at: now()
      };
      Object.assign(item, {
        exercice_key: key,
        domaine_code: row.domaine_code || row.domaineCode,
        code: row.code || null,
        libelle: row.libelle,
        annee: row.annee == null ? null : Number(row.annee),
        mode_session: row.mode_session || row.modeSession || 'SINGLE',
        nombre_sessions_attendu: row.nombre_sessions_attendu == null ? (row.nombreSessionsAttendu == null ? 1 : Number(row.nombreSessionsAttendu)) : Number(row.nombre_sessions_attendu),
        consolidation_active: row.consolidation_active === true || row.consolidationActive === true,
        source: row.source || 'MANUEL',
        cycle_id: row.cycle_id || row.cycleId || null,
        definition_version_id: row.definition_version_id || row.definitionVersionId || null,
        policy_version_id: row.policy_version_id || row.policyVersionId || null,
        engine_route: row.engine_route || row.engineRoute || null,
        configuration_snapshot: row.configuration_snapshot || row.configurationSnapshot || null,
        metadata: Object.assign({}, item.metadata || {}, row.metadata || {}),
        updated_at: now()
      });
      exercices.set(item.exercice_id, item);
      return { ...item };
    },
    async updateExercise(id, patch){
      const item = exercices.get(id);
      if(!item) return null;
      Object.assign(item, patch || {}, {
        nombre_sessions_attendu: (patch || {}).nombre_sessions_attendu == null ? item.nombre_sessions_attendu : Number(patch.nombre_sessions_attendu),
        updated_at: now()
      });
      exercices.set(id, item);
      return { ...item };
    },
    async attachEventToCycle(cycleId, eventId){
      const item = evenements.get(eventId);
      if(!item) return null;
      item.cycle_id = cycleId;
      item.version = Number(item.version || 1) + 1;
      item.updated_at = now();
      return decorateEvent(item);
    },
    async detachEventFromCycle(cycleId, eventId){
      const item = evenements.get(eventId);
      if(!item || item.cycle_id !== cycleId) return null;
      item.cycle_id = null;
      item.version = Number(item.version || 1) + 1;
      item.updated_at = now();
      return decorateEvent(item);
    },
    async listCyclePersonnes(cycleId){
      return [...cyclePersonnes.values()]
        .filter((row) => row.cycle_id === cycleId)
        .map((row) => ({ ...row, ...(personnes.get(row.personne_id) || {}) }));
    },
    async upsertCyclePersonne(row){
      const role = row.role_cycle || 'PARTICIPANT';
      const existing = cyclePersonnes.get(keyCP(row.cycle_id, row.personne_id, role));
      const item = {
        cycle_id: row.cycle_id,
        personne_id: row.personne_id,
        role_cycle: role,
        statut_cycle: row.statut_cycle || 'ACTIF',
        session_event_id: row.session_event_id || null,
        participated_event_id: row.participated_event_id || null,
        exception_type: row.exception_type || null,
        exercise_scope: row.exercise_scope || [],
        source: row.source || 'MANUEL',
        date_debut: isoDate(row.date_debut),
        date_fin: isoDate(row.date_fin),
        commentaire: row.commentaire || null,
        metadata: row.metadata || {},
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      cyclePersonnes.set(keyCP(item.cycle_id, item.personne_id, item.role_cycle), item);
      return { ...item, ...(personnes.get(item.personne_id) || {}) };
    },
    async deleteCyclePersonne(cycleId, personneId, roleCycle){
      return cyclePersonnes.delete(keyCP(cycleId, personneId, roleCycle));
    },
    async getLegacyByEvenementId(eventId){
      return [...legacy.values()].find(item => item.evenement_id === eventId) || null;
    },
    async listReglesBascule(){
      return [...reglesBascule.values()];
    },
    async listParticipationMotifRows(){
      return [...participationMotifs.values()].sort((a, b) => Number(a.display_order) - Number(b.display_order) || String(a.label).localeCompare(String(b.label), 'fr')).map((row) => ({ ...row }));
    },
    async upsertParticipationMotif(row){
      const id = String(row.motif_id || row.id || '').trim().toUpperCase();
      const item = {
        motif_id: id,
        motif_type: String(row.motif_type || row.type || 'EXCUSE').trim().toUpperCase(),
        label: row.label || row.libelle,
        actif: row.actif !== false && row.active !== false,
        historique: row.historique === true || row.historical === true,
        display_order: Number(row.display_order || row.order || 999),
        group_code: row.group_code || row.group || 'operationnel',
        metadata: row.metadata || {},
        updated_at: now()
      };
      participationMotifs.set(id, item);
      return { ...item };
    },
    async listParticipationPolicyRows(){
      return [...participationPolicies.values()].filter((row) => row.actif !== false).map((row) => ({ ...row, config: JSON.parse(JSON.stringify(row.config || {})) }));
    },
    async upsertParticipationPolicy(row){
      const domain = String(row.domain_code || row.domainCode || '').trim().toUpperCase();
      const item = {
        domain_code: domain,
        policy_version: row.policy_version || row.policyVersion,
        config: JSON.parse(JSON.stringify(row.config || row.policy || {})),
        actif: row.actif !== false,
        commentaire: row.commentaire || null,
        auteur_id: row.auteur_id || null,
        updated_at: now()
      };
      participationPolicies.set(domain, item);
      return { ...item, config: JSON.parse(JSON.stringify(item.config)) };
    },
    async listParticipationPolicyVersions(filter = {}){
      return [...participationPolicyVersions.values()]
        .filter((row) => !filter.domain || row.domain === String(filter.domain).toUpperCase())
        .filter((row) => filter.active === undefined || (row.active !== false) === (filter.active !== false))
        .sort((a, b) => String(a.domain).localeCompare(String(b.domain)) || String(a.policy_code).localeCompare(String(b.policy_code)) || String(b.valid_from || '').localeCompare(String(a.valid_from || '')))
        .map((row) => ({ ...row, policyVersionId: row.policy_version_id, policyCode: row.policy_code, versionCode: row.version_code, config: JSON.parse(JSON.stringify(row.config || {})), metadata: JSON.parse(JSON.stringify(row.metadata || {})) }));
    },
    async upsertParticipationPolicyVersion(row){
      const code = row.policy_code || row.policyCode || catalog.policyCode(row);
      const versionCode = row.version_code || row.versionCode || 'V1';
      const existing = [...participationPolicyVersions.values()].find((item) => item.policy_code === code && item.version_code === versionCode);
      const item = {
        ...(existing || {}),
        policy_version_id: existing?.policy_version_id || row.policy_version_id || row.policyVersionId || randomUUID(),
        policy_code: code,
        domain: String(row.domain || row.domain_code || row.domainCode).toUpperCase(),
        version_code: versionCode,
        valid_from: isoDate(row.valid_from || row.validFrom),
        valid_to: isoDate(row.valid_to || row.validTo),
        config: JSON.parse(JSON.stringify(row.config || {})),
        active: row.active !== false && row.actif !== false,
        metadata: Object.assign({}, existing?.metadata || {}, row.metadata || {}),
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      participationPolicyVersions.set(item.policy_version_id, item);
      return { ...item, policyVersionId: item.policy_version_id, policyCode: item.policy_code, versionCode: item.version_code, config: JSON.parse(JSON.stringify(item.config || {})), metadata: JSON.parse(JSON.stringify(item.metadata || {})) };
    },
    async listEventDefinitions(filter = {}){
      return [...eventDefinitions.values()]
        .filter((row) => !filter.domain || row.domain === String(filter.domain).toUpperCase())
        .filter((row) => !filter.status || row.status === String(filter.status).toUpperCase())
        .sort((a, b) => String(a.domain).localeCompare(String(b.domain)) || String(a.label).localeCompare(String(b.label), 'fr'))
        .map((row) => ({ ...row, definitionId: row.definition_id, metadata: JSON.parse(JSON.stringify(row.metadata || {})) }));
    },
    async upsertEventDefinition(row){
      const code = row.code || catalog.definitionCode(row);
      const existing = [...eventDefinitions.values()].find((item) => item.code === code);
      const item = {
        ...(existing || {}),
        definition_id: existing?.definition_id || row.definition_id || row.definitionId || randomUUID(),
        code,
        label: row.label || row.libelle,
        domain: String(row.domain || row.domainCode || row.domaine_code).toUpperCase(),
        description: row.description || '',
        status: row.status || 'ACTIF',
        metadata: Object.assign({}, existing?.metadata || {}, row.metadata || {}),
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      eventDefinitions.set(item.definition_id, item);
      return { ...item, definitionId: item.definition_id, metadata: JSON.parse(JSON.stringify(item.metadata || {})) };
    },
    async listEventDefinitionVersions(filter = {}){
      return [...eventDefinitionVersions.values()]
        .filter((row) => !filter.definitionId || row.definition_id === filter.definitionId)
        .filter((row) => {
          if(!filter.domain) return true;
          const def = eventDefinitions.get(row.definition_id);
          return def && def.domain === String(filter.domain).toUpperCase();
        })
        .filter((row) => filter.active === undefined || (row.active !== false) === (filter.active !== false))
        .sort((a, b) => String(b.valid_from || '').localeCompare(String(a.valid_from || '')) || String(b.version_code || '').localeCompare(String(a.version_code || '')))
        .map((row) => {
          const def = eventDefinitions.get(row.definition_id) || {};
          const pv = participationPolicyVersions.get(row.policy_version_id) || {};
          return {
            ...row,
            definitionVersionId: row.definition_version_id,
            definitionId: row.definition_id,
            versionCode: row.version_code,
            validFrom: row.valid_from,
            validTo: row.valid_to,
            modeOrganisation: row.mode_organisation,
            sessionCount: row.session_count,
            policyVersionId: row.policy_version_id,
            populationRule: JSON.parse(JSON.stringify(row.population_rule || {})),
            definitionCode: def.code || null,
            definitionLabel: def.label || null,
            domain: def.domain || null,
            policyCode: pv.policy_code || null,
            policyVersionCode: pv.version_code || null,
            metadata: JSON.parse(JSON.stringify(row.metadata || {}))
          };
        });
    },
    async countEventsByDefinitionVersions(versionIds = []){
      const wanted = new Set((versionIds || []).filter(Boolean).map(String));
      const counts = {};
      for(const event of evenements.values()){
        const decorated = decorateEvent(event);
        const id = decorated && decorated.definition_version_id;
        if(id && wanted.has(String(id))) counts[id] = Number(counts[id] || 0) + 1;
      }
      return counts;
    },
    async getEventDefinitionVersion(id){
      return (await api.listEventDefinitionVersions({})).find((row) => String(row.definition_version_id) === String(id)) || null;
    },
    async upsertEventDefinitionVersion(row){
      const existing = [...eventDefinitionVersions.values()].find((item) => item.definition_id === (row.definition_id || row.definitionId) && item.version_code === (row.version_code || row.versionCode));
      const item = {
        ...(existing || {}),
        definition_version_id: existing?.definition_version_id || row.definition_version_id || row.definitionVersionId || randomUUID(),
        definition_id: row.definition_id || row.definitionId,
        version_code: row.version_code || row.versionCode || 'V1',
        valid_from: isoDate(row.valid_from || row.validFrom),
        valid_to: isoDate(row.valid_to || row.validTo),
        mode_organisation: row.mode_organisation || row.modeOrganisation || 'SIMPLE',
        session_count: Number(row.session_count || row.sessionCount || 1),
        policy_version_id: row.policy_version_id || row.policyVersionId || null,
        population_rule: JSON.parse(JSON.stringify(row.population_rule || row.populationRule || {})),
        numbering_pattern: row.numbering_pattern || row.numberingPattern || null,
        active: row.active !== false && row.actif !== false,
        metadata: Object.assign({}, existing?.metadata || {}, row.metadata || {}),
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      eventDefinitionVersions.set(item.definition_version_id, item);
      return api.getEventDefinitionVersion(item.definition_version_id);
    },
    async upsertRegleBascule(row){
      const portee = String(row.portee || (row.cible_id ? 'CIBLE' : (row.domaine_code ? 'DOMAINE' : 'GLOBAL'))).toUpperCase();
      const existing = [...reglesBascule.values()].find((r) => {
        if (portee === 'CIBLE') return r.portee === 'CIBLE' && r.cible_id === row.cible_id;
        if (portee === 'DOMAINE') return r.portee === 'DOMAINE' && r.domaine_code === row.domaine_code;
        return r.portee === 'GLOBAL';
      });
      const item = {
        regle_id: (existing && existing.regle_id) || row.regle_id || randomUUID(),
        portee,
        cible_id: portee === 'CIBLE' ? row.cible_id : null,
        domaine_code: portee === 'GLOBAL' ? null : (row.domaine_code || null),
        date_bascule: isoDate(row.date_bascule),
        commentaire: row.commentaire || null,
        updated_at: now()
      };
      if (portee === 'DOMAINE') item.domaine_code = row.domaine_code;
      if (portee === 'CIBLE' && item.domaine_code == null) item.domaine_code = row.domaine_code || null;
      reglesBascule.set(item.regle_id, item);
      if (existing && existing.regle_id !== item.regle_id) reglesBascule.delete(existing.regle_id);
      return item;
    },
    async insertImport(row){
      const item = {
        import_id: row.import_id || randomUUID(),
        source_filename: row.source_filename || null,
        source_sha256: row.source_sha256 || null,
        imported_at: now(),
        imported_par: row.imported_par || null,
        statut: row.statut || 'COMMITE',
        nb_lignes: row.nb_lignes || 0,
        rapport: row.rapport || null
      };
      imports.set(item.import_id, item);
      return item;
    },
    async insertImportLigne(row){
      const item = {
        import_id: row.import_id,
        ligne_no: row.ligne_no,
        fingerprint: row.fingerprint,
        statut: row.statut,
        type_propose: row.type_propose || null,
        evenement_id: row.evenement_id || null,
        legacy_id: row.legacy_id || null,
        payload_source: row.payload_source || null,
        raison: row.raison || null,
        action: row.action || null
      };
      importLignes.set(keyLigne(item.import_id, item.ligne_no), item);
      return item;
    },
    async bulkInsertImportLignes(rows){
      const out = [];
      for(const row of rows || []) out.push(await api.insertImportLigne(row));
      return out;
    },
    async listImportedFingerprints(){
      return [...importLignes.values()]
        .filter(l => l.statut === 'IMPORTE')
        .map(l => l.fingerprint);
    },
    async countTable(name){
      const map = {
        scope_personnes: personnes.size,
        scope_evenements: evenements.size,
        scope_attendus: attendus.size,
        scope_participations: participations.size,
        scope_legacy_aggregates: legacy.size,
        scope_imports: imports.size,
        scope_import_lignes: importLignes.size,
        scope_saisies_quantitatives: quantitatives.size
      };
      return map[name] ?? 0;
    },
    async appendJournal(row){
      const item = {
        journal_id: randomUUID(),
        at: now(),
        auteur_id: row.auteur_id || null,
        entite: row.entite,
        entite_id: String(row.entite_id),
        action: row.action,
        avant: row.avant || null,
        apres: row.apres || null,
        commentaire: row.commentaire || null
      };
      journal.push(item);
      return item;
    },
    async getQuantitatifSaisie(eventId){
      const item = quantitatives.get(eventId);
      return item ? { ...item } : null;
    },
    async listQuantitatifSaisiesForEvents(ids){
      const set = new Set(ids || []);
      return [...quantitatives.values()].filter((row) => set.has(row.evenement_id));
    },
    async listEventCiblesForEvents(ids){
      const out = [];
      for(const id of ids || []){
        const cibleIds = evenementCibles.get(id) || [];
        for(const cibleId of cibleIds){
          const cible = cibles.find((c) => c.cible_id === cibleId);
          if(cible) out.push({ evenement_id: id, ...cible });
        }
      }
      return out;
    },
    async upsertQuantitatifSaisie(row){
      const item = {
        evenement_id: row.evenement_id,
        nb_attendus: row.nb_attendus,
        nb_presents: row.nb_presents,
        nb_excuses: row.nb_excuses,
        nb_non_excuses: row.nb_non_excuses,
        nb_dispenses: row.nb_dispenses,
        nb_excuses_prive: Number(row.nb_excuses_prive || 0),
        nb_excuses_professionnel: Number(row.nb_excuses_professionnel || 0),
        nb_excuses_armee: Number(row.nb_excuses_armee || 0),
        nb_excuses_accident_maladie: Number(row.nb_excuses_accident_maladie || 0),
        nb_excuses_non_precise: Number(row.nb_excuses_non_precise || 0),
        nb_permutations: Number(row.nb_permutations || 0),
        auteur_id: row.auteur_id || null,
        created_at: (quantitatives.get(row.evenement_id) || {}).created_at || now(),
        updated_at: now()
      };
      quantitatives.set(row.evenement_id, item);
      return { ...item };
    },
    async deleteQuantitatifSaisie(eventId){
      quantitatives.delete(eventId);
    },
    async listObjectifs({ actif } = {}){
      return [...objectifs.values()]
        .filter((row) => actif === undefined ? true : Boolean(row.actif) === Boolean(actif))
        .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)));
    },
    async getObjectif(id){
      const item = objectifs.get(id);
      return item ? { ...item } : null;
    },
    async insertObjectif(row){
      const item = {
        objectif_id: row.objectif_id,
        portee: row.portee,
        domaine_code: row.domaine_code || null,
        cible_id: row.cible_id || null,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin),
        seuil_pct: Number(row.seuil_pct),
        actif: row.actif !== false,
        commentaire: row.commentaire || null,
        auteur_id: row.auteur_id || null,
        created_at: now(),
        updated_at: now()
      };
      objectifs.set(item.objectif_id, item);
      return { ...item };
    },
    async updateObjectif(id, patch){
      const current = objectifs.get(id);
      if(!current) return null;
      const next = {
        ...current,
        ...patch,
        date_debut: dateOnly(patch.date_debut !== undefined ? patch.date_debut : current.date_debut),
        date_fin: patch.date_fin !== undefined ? dateOnly(patch.date_fin) : current.date_fin,
        updated_at: now()
      };
      objectifs.set(id, next);
      return { ...next };
    },
    async deleteObjectif(id){
      objectifs.delete(id);
    },
    async listAcquittementsByUser(utilisateurId){
      return [...acquittements.values()].filter((row) => row.utilisateur_id === utilisateurId);
    },
    async upsertAcquittement(row){
      const key = `${row.utilisateur_id}::${row.fingerprint}`;
      const existing = acquittements.get(key);
      const item = {
        acquittement_id: (existing && existing.acquittement_id) || randomUUID(),
        fingerprint: row.fingerprint,
        code: row.code,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        utilisateur_id: row.utilisateur_id,
        commentaire: row.commentaire || null,
        created_at: now()
      };
      acquittements.set(key, item);
      return { ...item };
    },
    async loadAnalyticsBundle({ from, to, domaineCode, cibleId, evenementId, personneId } = {}){
      const { inferModeSuivi } = require('./_scope-analytics');
      const { inPeriod } = require('./_scope-period');
      const bundle = {
        events: [],
        attendusByEvent: {},
        participationsByEvent: {},
        cibleIdsByEvent: {},
        legacyByEvent: {},
        quantitatifByEvent: {},
        personneId: personneId || null
      };
      for(const event of evenements.values()){
        const mapped = { ...decorateEvent(event), mode_suivi: inferModeSuivi(event) };
        if(from && to && !inPeriod(mapped.date, { from, to })) continue;
        if(domaineCode && mapped.domaine_code !== domaineCode) continue;
        if(evenementId && mapped.evenement_id !== evenementId) continue;
        const cibleIds = evenementCibles.get(mapped.evenement_id) || [];
        if(cibleId && !cibleIds.includes(cibleId)) continue;
        if(personneId){
          const att = [...attendus.values()].filter((a) => a.evenement_id === mapped.evenement_id && String(a.personne_id) === String(personneId) && a.inclus !== false);
          if(!att.length || inferModeSuivi(mapped) !== 'NOMINATIF') continue;
        }
        bundle.events.push({ ...mapped, cible_ids: cibleIds });
        bundle.cibleIdsByEvent[mapped.evenement_id] = cibleIds;
        bundle.attendusByEvent[mapped.evenement_id] = [...attendus.values()].filter((a) => a.evenement_id === mapped.evenement_id);
        bundle.participationsByEvent[mapped.evenement_id] = [...participations.values()].filter((p) => p.evenement_id === mapped.evenement_id);
        bundle.legacyByEvent[mapped.evenement_id] = [...legacy.values()].find((item) => item.evenement_id === mapped.evenement_id) || null;
        bundle.quantitatifByEvent[mapped.evenement_id] = quantitatives.get(mapped.evenement_id) || null;
      }
      return bundle;
    },
    async listJournal(entite, entiteId){
      return journal.filter(j => j.entite === entite && j.entite_id === String(entiteId));
    }
  };
  return api;
}

module.exports = { createMemoryRepo };
