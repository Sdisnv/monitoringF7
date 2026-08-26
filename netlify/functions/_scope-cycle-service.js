const { HttpError, isoDate } = require('./_scope-rules');
const { computeCycleMetrics, proposeCycleLink } = require('./_scope-cycle-rules');

const DOMAINES_CYCLE = new Set(['PR', 'AUTO']);
const STATUTS_CYCLE = new Set(['PLANIFIE', 'REALISE', 'REPORTE', 'ANNULE']);
const ROLES_CYCLE = new Set(['PARTICIPANT', 'FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
const STATUTS_PERSONNE_CYCLE = new Set(['ACTIF', 'DISPENSE', 'EXCLU', 'NON_RENSEIGNE']);
const EXCEPTIONS = new Set(['DISPENSE_EXERCICE_INTERNE']);
const SOURCES_CYCLE = new Set(['IMPORT', 'MANUEL', 'ARBITRAGE_MOA']);

function actorId(actor){
  return (actor && (actor.sub || actor.subject || actor.email || actor.nip)) || 'system';
}

function normalizeDomain(value){
  const code = String(value || '').trim().toUpperCase();
  return code === 'PAPR' ? 'PR' : code;
}

function text(value){
  return String(value || '').trim();
}

function optionalText(value){
  const out = text(value);
  return out || null;
}

function optionalFilter(value){
  const out = text(value);
  if(!out || out.toLowerCase() === 'tous' || out.toLowerCase() === 'all') return null;
  return out;
}

function normalizeCyclePayload(body = {}, existing = null){
  const domaine = normalizeDomain(body.domaineCode || body.domaine_code || (existing && existing.domaine_code));
  if(!DOMAINES_CYCLE.has(domaine)){
    throw new HttpError(400, 'domaine_cycle_invalide', 'Un cycle de spécialisation est limité à PAPR/PR ou AUTO.');
  }
  const libelle = text(body.libelle !== undefined ? body.libelle : existing && existing.libelle);
  if(!libelle) throw new HttpError(400, 'libelle_obligatoire', 'Le libellé du cycle est obligatoire.');
  const statut = String(body.statut || (existing && existing.statut) || 'PLANIFIE').toUpperCase();
  if(!STATUTS_CYCLE.has(statut)) throw new HttpError(400, 'statut_cycle_invalide', 'Statut de cycle invalide.');
  const dateDebut = body.dateDebut !== undefined || body.date_debut !== undefined ? isoDate(body.dateDebut || body.date_debut) : (existing && existing.date_debut) || null;
  const dateFin = body.dateFin !== undefined || body.date_fin !== undefined ? isoDate(body.dateFin || body.date_fin) : (existing && existing.date_fin) || null;
  if((body.dateDebut || body.date_debut) && !dateDebut) throw new HttpError(400, 'date_debut_invalide', 'Date de début invalide.');
  if((body.dateFin || body.date_fin) && !dateFin) throw new HttpError(400, 'date_fin_invalide', 'Date de fin invalide.');
  if(dateDebut && dateFin && dateDebut > dateFin) throw new HttpError(400, 'dates_cycle_invalides', 'La date de fin du cycle doit être postérieure à la date de début.');
  const sourceType = String(body.sourceType || body.source_type || (existing && existing.source_type) || 'MANUEL').toUpperCase();
  if(!SOURCES_CYCLE.has(sourceType)) throw new HttpError(400, 'source_cycle_invalide', 'Source de cycle invalide.');
  return {
    cycle_key: optionalText(body.cycleKey || body.cycle_key || (existing && existing.cycle_key)),
    annee: body.annee !== undefined ? Number(body.annee) : (body.year !== undefined ? Number(body.year) : (existing && existing.annee) || null),
    domaine_code: domaine,
    type_cycle: optionalText(body.typeCycle || body.type_cycle || (existing && existing.type_cycle)),
    libelle,
    statut,
    stat_com: optionalText(body.statCom || body.stat_com || (existing && existing.stat_com)),
    qui: optionalText(body.qui || (existing && existing.qui)),
    date_debut: dateDebut,
    date_fin: dateFin,
    source_type: sourceType,
    metadata: body.metadata || (existing && existing.metadata) || {}
  };
}

function normalizeCyclePersonnePayload(cycleId, body = {}){
  const personneId = text(body.personneId || body.personne_id);
  const nip = optionalText(body.nip);
  if(!personneId && !nip) throw new HttpError(400, 'personne_obligatoire', 'Personne ou NIP obligatoire.');
  const role = String(body.roleCycle || body.role_cycle || 'PARTICIPANT').toUpperCase();
  if(!ROLES_CYCLE.has(role)) throw new HttpError(400, 'role_cycle_invalide', 'Rôle de cycle invalide.');
  const statut = String(body.statutCycle || body.statut_cycle || 'ACTIF').toUpperCase();
  if(!STATUTS_PERSONNE_CYCLE.has(statut)) throw new HttpError(400, 'statut_cycle_personne_invalide', 'Statut de personne cycle invalide.');
  const exceptionType = optionalText(body.exceptionType || body.exception_type);
  if(exceptionType && !EXCEPTIONS.has(exceptionType)) throw new HttpError(400, 'exception_cycle_invalide', 'Exception cycle invalide.');
  return {
    cycle_id: cycleId,
    personne_id: personneId || null,
    nip,
    role_cycle: role,
    statut_cycle: statut,
    session_event_id: optionalText(body.sessionEventId || body.session_event_id),
    participated_event_id: optionalText(body.participatedEventId || body.participated_event_id),
    exception_type: exceptionType,
    exercise_scope: Array.isArray(body.exerciseScope || body.exercise_scope) ? (body.exerciseScope || body.exercise_scope) : [],
    source: String(body.source || 'MANUEL').toUpperCase(),
    date_debut: isoDate(body.dateDebut || body.date_debut),
    date_fin: isoDate(body.dateFin || body.date_fin),
    commentaire: optionalText(body.commentaire),
    metadata: body.metadata || {}
  };
}

function createScopeCycleService(repo){
  async function cycleMetrics(cycle){
    const evenements = await repo.listCycleEvents(cycle.cycle_id);
    const cyclePersonnes = await repo.listCyclePersonnes(cycle.cycle_id);
    const participations = evenements.length ? await repo.listParticipationsForEvents(evenements.map((e) => e.evenement_id)) : [];
    const personnes = {};
    for(const row of cyclePersonnes){
      personnes[row.personne_id] = {
        nip: row.nip,
        nom: row.nom,
        prenom: row.prenom,
        grade: row.grade
      };
    }
    return computeCycleMetrics({ cycle, evenements, cyclePersonnes, participations, personnes });
  }

  async function detail(cycleId){
    const cycle = await repo.getCycle(cycleId);
    if(!cycle) throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
    const [evenements, personnes] = await Promise.all([
      repo.listCycleEvents(cycleId),
      repo.listCyclePersonnes(cycleId)
    ]);
    const metrics = await cycleMetrics(cycle);
    return { cycle, evenements, personnes, metrics };
  }

  return {
    async listCycles(query = {}){
      const cycles = await repo.listCycles({
        annee: query.annee || query.year,
        domaine: optionalFilter(query.domaine || query.domaineCode || query.domaine_code),
        statut: optionalFilter(query.statut)
      });
      const items = [];
      for(const cycle of cycles){
        const evenements = await repo.listCycleEvents(cycle.cycle_id);
        const personnes = await repo.listCyclePersonnes(cycle.cycle_id);
        const metrics = await cycleMetrics(cycle);
        items.push({ ...cycle, eventCount: evenements.length, populationCount: metrics.populationDistincte, metrics, personneCount: personnes.length });
      }
      return { cycles: items };
    },
    async getCycle(cycleId){ return detail(cycleId); },
    async createCycle(body, actor){
      const payload = normalizeCyclePayload(body);
      try{
        const cycle = await repo.insertCycle(payload);
        if(repo.appendJournal){
          await repo.appendJournal({ auteur_id: actorId(actor), entite: 'cycle', entite_id: cycle.cycle_id, action: 'CREER', apres: cycle });
        }
        return detail(cycle.cycle_id);
      }catch(error){
        if(error && (error.code === '23505' || String(error.message || '').includes('cycle_key_unique'))){
          throw new HttpError(409, 'cycle_deja_existant', 'Un cycle avec cette clé existe déjà.');
        }
        throw error;
      }
    },
    async patchCycle(cycleId, body, actor){
      const existing = await repo.getCycle(cycleId);
      if(!existing) throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
      const patch = normalizeCyclePayload(body, existing);
      const cycle = await repo.updateCycle(cycleId, patch);
      if(repo.appendJournal){
        await repo.appendJournal({ auteur_id: actorId(actor), entite: 'cycle', entite_id: cycleId, action: 'MODIFIER', avant: existing, apres: cycle });
      }
      return detail(cycle.cycle_id);
    },
    async attachEvent(cycleId, body, actor){
      const eventId = text(body.evenementId || body.evenement_id || body.eventId);
      if(!eventId) throw new HttpError(400, 'evenement_obligatoire', 'Événement obligatoire.');
      return repo.withTransaction(async (tx) => {
        const cycle = await tx.getCycle(cycleId);
        if(!cycle) throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
        const event = await tx.getEvent(eventId);
        if(!event) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
        if(event.cycle_id && event.cycle_id !== cycleId) throw new HttpError(409, 'evenement_deja_rattache', 'Cet événement est déjà rattaché à un autre cycle.');
        await tx.attachEventToCycle(cycleId, eventId);
        if(tx.appendJournal){
          await tx.appendJournal({ auteur_id: actorId(actor), entite: 'cycle', entite_id: cycleId, action: 'RATTACHER_EVENEMENT', apres: { eventId } });
        }
        return detail(cycleId);
      });
    },
    async detachEvent(cycleId, body, actor){
      const eventId = text(body.evenementId || body.evenement_id || body.eventId);
      if(!eventId) throw new HttpError(400, 'evenement_obligatoire', 'Événement obligatoire.');
      return repo.withTransaction(async (tx) => {
        const cycle = await tx.getCycle(cycleId);
        if(!cycle) throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
        const event = await tx.detachEventFromCycle(cycleId, eventId);
        if(!event) throw new HttpError(404, 'rattachement_introuvable', 'Rattachement événement-cycle introuvable.');
        if(tx.appendJournal){
          await tx.appendJournal({ auteur_id: actorId(actor), entite: 'cycle', entite_id: cycleId, action: 'DETACHER_EVENEMENT', apres: { eventId } });
        }
        return detail(cycleId);
      });
    },
    async upsertPersonne(cycleId, body, actor){
      return repo.withTransaction(async (tx) => {
        const cycle = await tx.getCycle(cycleId);
        if(!cycle) throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
        const payload = normalizeCyclePersonnePayload(cycleId, body);
        let personne = payload.personne_id ? await tx.getPersonne(payload.personne_id) : null;
        if(!personne && payload.nip) personne = await tx.getPersonneByNip(payload.nip);
        if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable : le cycle ne crée pas de doublon Personne.');
        const row = await tx.upsertCyclePersonne({ ...payload, personne_id: personne.personne_id || personne.id });
        if(tx.appendJournal){
          await tx.appendJournal({ auteur_id: actorId(actor), entite: 'cycle', entite_id: cycleId, action: 'PERSONNE_CYCLE', apres: row });
        }
        return detail(cycleId);
      });
    },
    async removePersonne(cycleId, body, actor){
      const personneId = text(body.personneId || body.personne_id);
      const role = String(body.roleCycle || body.role_cycle || 'PARTICIPANT').toUpperCase();
      if(!personneId) throw new HttpError(400, 'personne_obligatoire', 'Personne obligatoire.');
      return repo.withTransaction(async (tx) => {
        const cycle = await tx.getCycle(cycleId);
        if(!cycle) throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
        const deleted = await tx.deleteCyclePersonne(cycleId, personneId, role);
        if(!deleted) throw new HttpError(404, 'personne_cycle_introuvable', 'Personne non rattachée à ce cycle avec ce rôle.');
        if(tx.appendJournal){
          await tx.appendJournal({ auteur_id: actorId(actor), entite: 'cycle', entite_id: cycleId, action: 'RETIRER_PERSONNE_CYCLE', apres: { personneId, role } });
        }
        return detail(cycleId);
      });
    },
    proposeCycle(body = {}){
      const rows = Array.isArray(body.evenements || body.events) ? (body.evenements || body.events) : [];
      return { proposition: proposeCycleLink(rows) };
    }
  };
}

module.exports = { createScopeCycleService };
