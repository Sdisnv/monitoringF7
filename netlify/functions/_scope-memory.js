const { randomUUID } = require('crypto');
const { DOMAINES, CIBLES } = require('./_scope-schema');
const { isoDate } = require('./_scope-rules');

function now(){ return new Date().toISOString(); }

function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function createMemoryRepo(){
  const domaines = DOMAINES.map(d => ({ ...d, actif: true }));
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

  function keyEP(evenementId, personneId){ return `${evenementId}::${personneId}`; }

  const api = {
    async withTransaction(fn){ return fn(api); },
    async listDomaines(){ return domaines.filter(d => d.actif !== false); },
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
        date_entree: isoDate(row.date_entree) || null,
        date_sortie: isoDate(row.date_sortie) || null,
        source: row.source || 'MANUEL',
        created_at: now(),
        updated_at: now()
      };
      if([...personnes.values()].some(p => p.nip === item.nip)) throw new Error('nip_unique');
      personnes.set(item.personne_id, item);
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
    async insertAffectation(row){
      const item = {
        affectation_id: row.affectation_id || randomUUID(),
        personne_id: row.personne_id,
        cible_id: row.cible_id,
        date_debut: isoDate(row.date_debut),
        date_fin: isoDate(row.date_fin),
        source: row.source || 'MANUEL',
        created_at: now(),
        updated_at: now()
      };
      affectations.set(item.affectation_id, item);
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
      const item = {
        evenement_id: row.evenement_id || randomUUID(),
        date: isoDate(row.date),
        domaine_code: row.domaine_code,
        libelle: String(row.libelle).trim(),
        statut: row.statut || 'PLANIFIE',
        origine: row.origine || 'NOMINATIF',
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
      return item;
    },
    async listEvenements({ annee, statut, domaine } = {}){
      return [...evenements.values()]
        .filter((item) => {
          if(annee && String(item.date).slice(0, 4) !== String(annee)) return false;
          if(statut && item.statut !== statut) return false;
          if(domaine && item.domaine_code !== domaine) return false;
          return true;
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.libelle).localeCompare(String(b.libelle)))
        .map((item) => ({ ...item, date: dateOnly(item.date) }));
    },
    async getEvent(id){
      const item = evenements.get(id);
      if(!item) return null;
      return { ...item, date: dateOnly(item.date) };
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
      return { ...item };
    },
    async listAttendus(eventId){
      return [...attendus.values()].filter(a => a.evenement_id === eventId);
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
    async listParticipations(eventId){
      return [...participations.values()].filter(p => p.evenement_id === eventId);
    },
    async getParticipation(eventId, personneId){
      return participations.get(keyEP(eventId, personneId)) || null;
    },
    async upsertParticipation(row){
      const existing = participations.get(keyEP(row.evenement_id, row.personne_id));
      const item = {
        evenement_id: row.evenement_id,
        personne_id: row.personne_id,
        statut: row.statut,
        motif_absence: row.motif_absence || null,
        commentaire: row.commentaire || null,
        role: row.role || 'PARTICIPANT',
        source: row.source || 'SAISIE',
        auteur_id: row.auteur_id || null,
        created_at: existing?.created_at || now(),
        updated_at: now()
      };
      participations.set(keyEP(item.evenement_id, item.personne_id), item);
      return item;
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
        created_at: now(),
        updated_at: now()
      };
      legacy.set(item.legacy_id, item);
      return item;
    },
    async listLegacy(){ return [...legacy.values()]; },
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
    async listJournal(entite, entiteId){
      return journal.filter(j => j.entite === entite && j.entite_id === String(entiteId));
    }
  };
  return api;
}

module.exports = { createMemoryRepo };
