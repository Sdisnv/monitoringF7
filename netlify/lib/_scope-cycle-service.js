const { HttpError, isoDate } = require('./_scope-rules');
const { buildCyclePilotage, computeCycleMetrics, proposeCycleLink, resolveCycleCompletion } = require('./_scope-cycle-rules');

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

function derivedCycleId(groupKey, annee){
  return `derived-pr-cycle:${Buffer.from(JSON.stringify({ groupKey: String(groupKey || ''), annee: Number(annee) || null }), 'utf8').toString('base64url')}`;
}

function isDerivedCycleId(cycleId){
  return String(cycleId || '').startsWith('derived-pr-cycle:');
}

function derivedIdentityFromId(cycleId){
  const prefix = 'derived-pr-cycle:';
  const value = String(cycleId || '');
  if(!value.startsWith(prefix)) return null;
  try{
    const decoded = Buffer.from(value.slice(prefix.length), 'base64url').toString('utf8');
    if(decoded.startsWith('{')){
      const parsed = JSON.parse(decoded);
      return { groupKey: String(parsed.groupKey || ''), annee: parsed.annee ? Number(parsed.annee) : null };
    }
    return { groupKey: decoded, annee: null };
  }catch(_error){
    return null;
  }
}

function eventId(row){
  return String((row && (row.evenement_id || row.evenementId || row.id)) || '');
}

function dateOnly(value){
  return String(value || '').slice(0, 10);
}

function yearOfEvent(event){
  const y = dateOnly(event && event.date).slice(0, 4);
  return /^\d{4}$/.test(y) ? Number(y) : null;
}

function sessionNumber(event){
  const textValue = `${event && event.pr_session_key || ''} ${event && event.libelle || ''}`;
  const match = textValue.match(/\b(?:PR|AUTO)?\s*(\d+)\.(\d+)\b/i);
  return match ? { cycleNo: match[1], sessionNo: match[2] } : { cycleNo: null, sessionNo: null };
}

function cycleLabelFromEvents(groupKey, events){
  const first = (events || [])[0] || {};
  const parsed = sessionNumber(first);
  const keyMatch = String(groupKey || '').match(/:(PR|AUTO):(\d+)$/i);
  const domaine = String((first.domaine_code || (keyMatch && keyMatch[1]) || 'PR')).toUpperCase();
  const cycleNo = parsed.cycleNo || (keyMatch && keyMatch[2]) || '';
  const suffix = String(first.libelle || '').split('|').slice(1).join('|').trim();
  const annee = yearOfEvent(first);
  return [cycleNo ? `${domaine} ${cycleNo}` : domaine, suffix || 'Base', annee].filter(Boolean).join(' — ');
}

function cycleStatusFromCompletion(completion){
  if(completion.complete) return 'TERMINE';
  if(completion.eventCount > 0 && completion.cancelledCount === completion.eventCount) return 'ANNULE';
  if(completion.realisedCount > 0 || completion.postponedCount > 0) return 'EN_COURS';
  return 'PLANIFIE';
}

async function hydratePeople(repo, ids){
  const personnes = {};
  for(const id of [...new Set((ids || []).map(String).filter(Boolean))]){
    if(repo.getPersonne){
      const p = await repo.getPersonne(id);
      if(p) personnes[id] = { nip: p.nip, nom: p.nom, prenom: p.prenom, grade: p.grade };
    }
  }
  return personnes;
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

  async function cyclePilotage(cycle, evenements, cyclePersonnes){
    const ids = (evenements || []).map((e) => e.evenement_id).filter(Boolean);
    const [attendus, participations] = await Promise.all([
      repo.listAttendusForEvents && ids.length ? repo.listAttendusForEvents(ids) : [],
      repo.listParticipationsForEvents && ids.length ? repo.listParticipationsForEvents(ids) : []
    ]);
    const personnes = {};
    const hydrateIds = [
      ...(cyclePersonnes || []).map((row) => row.personne_id || row.personneId),
      ...(attendus || []).map((row) => row.personne_id || row.personneId),
      ...(participations || []).map((row) => row.personne_id || row.personneId)
    ].filter(Boolean);
    Object.assign(personnes, await hydratePeople(repo, hydrateIds));
    for(const row of cyclePersonnes || []){
      if(!row.personne_id) continue;
      const merged = { ...(personnes[row.personne_id] || {}) };
      for(const key of ['nip', 'nom', 'prenom', 'grade']){
        if(row[key] != null) merged[key] = row[key];
      }
      personnes[row.personne_id] = merged;
    }
    return buildCyclePilotage({ cycle, evenements, cyclePersonnes, attendus, participations, personnes });
  }

  async function detail(cycleId){
    if(isDerivedCycleId(cycleId)){
      const derived = await derivedCycleDetail(cycleId);
      if(derived) return derived;
      throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
    }
    const cycle = await repo.getCycle(cycleId);
    if(!cycle){
      const derived = await derivedCycleDetail(cycleId);
      if(derived) return derived;
      throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
    }
    const [evenements, personnes] = await Promise.all([
      repo.listCycleEvents(cycleId),
      repo.listCyclePersonnes(cycleId)
    ]);
    const metrics = await cycleMetrics(cycle);
    const pilotage = await cyclePilotage(cycle, evenements, personnes);
    return { cycle, evenements, personnes, metrics, pilotage };
  }

  async function derivedCycleFromEvents(groupKey, events){
    const sorted = (events || []).slice().sort((a, b) => dateOnly(a.date).localeCompare(dateOnly(b.date)) || String(a.libelle || '').localeCompare(String(b.libelle || '')));
    if(!groupKey || sorted.length < 2) return null;
    const annee = yearOfEvent(sorted[0]);
    const cycle = {
      cycle_id: derivedCycleId(groupKey, annee),
      cycle_key: groupKey,
      annee,
      domaine_code: String(sorted[0].domaine_code || 'PR').toUpperCase(),
      type_cycle: String(sorted[0].domaine_code || 'PR').toUpperCase() === 'PR' ? 'PAPR' : String(sorted[0].domaine_code || 'AUTO').toUpperCase(),
      libelle: cycleLabelFromEvents(groupKey, sorted),
      statut: 'PLANIFIE',
      stat_com: sorted[0].stat_com || null,
      qui: sorted[0].qui || null,
      date_debut: dateOnly(sorted[0].date),
      date_fin: dateOnly(sorted[sorted.length - 1].date),
      source_type: 'IMPORT',
      metadata: { derivedFrom: 'pr_exercise_group_key', persisted: false }
    };
    const completionEvents = sorted.map((event) => ({ ...event, cycle_id: cycle.cycle_id }));
    const completion = resolveCycleCompletion({ cycle, evenements: completionEvents });
    cycle.statut = cycleStatusFromCompletion(completion);
    return cycle;
  }

  async function derivedCycleMetrics(cycle, evenements){
    const scopedEvents = (evenements || []).map((event) => ({ ...event, cycle_id: cycle.cycle_id }));
    const ids = evenements.map(eventId).filter(Boolean);
    const [attendus, participations] = await Promise.all([
      repo.listAttendusForEvents && ids.length ? repo.listAttendusForEvents(ids) : [],
      repo.listParticipationsForEvents && ids.length ? repo.listParticipationsForEvents(ids) : []
    ]);
    const personneIds = [
      ...attendus.map((row) => row.personne_id || row.personneId),
      ...participations.map((row) => row.personne_id || row.personneId)
    ].filter(Boolean);
    const personnes = await hydratePeople(repo, personneIds);
    const cyclePersonnes = [];
    const seen = new Set();
    for(const row of attendus || []){
      if(row.inclus === false) continue;
      const id = String(row.personne_id || row.personneId || '');
      if(!id || seen.has(id)) continue;
      seen.add(id);
      cyclePersonnes.push({
        cycle_id: cycle.cycle_id,
        personne_id: id,
        role_cycle: 'PARTICIPANT',
        statut_cycle: 'ACTIF',
        source: 'ATTENDUS',
        ...(personnes[id] || {})
      });
    }
    const metrics = computeCycleMetrics({ cycle, evenements: scopedEvents, cyclePersonnes, participations, personnes });
    const pilotage = buildCyclePilotage({ cycle, evenements: scopedEvents, cyclePersonnes, attendus, participations, personnes });
    return { metrics, personnes: cyclePersonnes, pilotage };
  }

  async function derivedCycles(query = {}){
    if(!repo.listEvenements) return [];
    const annee = query.annee || query.year || null;
    const domaine = optionalFilter(query.domaine || query.domaineCode || query.domaine_code);
    const events = await repo.listEvenements({
      annee: annee ? Number(annee) : null,
      domaine: domaine || null
    });
    const groups = new Map();
    for(const event of events || []){
      if(event.cycle_id) continue;
      const groupKey = text(event.pr_exercise_group_key || event.prExerciseGroupKey);
      if(!groupKey) continue;
      const year = yearOfEvent(event);
      if(annee && Number(annee) !== year) continue;
      if(domaine && normalizeDomain(event.domaine_code) !== normalizeDomain(domaine)) continue;
      const key = `${year || 'NA'}::${normalizeDomain(event.domaine_code)}::${groupKey}`;
      const rows = groups.get(key) || [];
      rows.push(event);
      groups.set(key, rows);
    }
    const out = [];
    for(const rows of groups.values()){
      const cycle = await derivedCycleFromEvents(rows[0].pr_exercise_group_key || rows[0].prExerciseGroupKey, rows);
      if(cycle) out.push(cycle);
    }
    return out;
  }

  async function derivedCycleDetail(cycleId){
    const identity = derivedIdentityFromId(cycleId);
    const groupKey = identity && identity.groupKey;
    if(!groupKey || !repo.listPrExerciseEvents) return null;
    const allEvents = await repo.listPrExerciseEvents(groupKey);
    const scoped = identity.annee
      ? (allEvents || []).filter((event) => yearOfEvent(event) === identity.annee)
      : (allEvents || []);
    const cycle = await derivedCycleFromEvents(groupKey, scoped);
    if(!cycle) return null;
    const evenements = scoped.filter((event) => yearOfEvent(event) === cycle.annee);
    const { metrics, personnes, pilotage } = await derivedCycleMetrics(cycle, evenements);
    return { cycle, evenements, personnes, metrics, pilotage };
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
      const persistedKeys = new Set(items.map((cycle) => String(cycle.cycle_key || '')));
      const synthetic = await derivedCycles(query);
      for(const cycle of synthetic){
        if(persistedKeys.has(String(cycle.cycle_key || ''))) continue;
        const detail = await derivedCycleDetail(cycle.cycle_id);
        if(!detail) continue;
        const statusFilter = optionalFilter(query.statut);
        if(statusFilter && detail.cycle.statut !== statusFilter) continue;
        items.push({
          ...detail.cycle,
          eventCount: detail.evenements.length,
          populationCount: detail.metrics.populationDistincte,
          metrics: detail.metrics,
          personneCount: detail.personnes.length,
          derived: true
        });
      }
      items.sort((a, b) => Number(b.annee || 0) - Number(a.annee || 0) || String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr'));
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
