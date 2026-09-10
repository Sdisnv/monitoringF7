const { HttpError, isoDate } = require('./_scope-rules');
const { buildCyclePilotage, computeCycleMetrics, proposeCycleLink, resolveCycleCompletion } = require('./_scope-cycle-rules');
const MultiSessionV2 = require('./_scope-multisession-v2');

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

function multisessionCycleId(multisessionId){
  return `multisession-v2-cycle:${Buffer.from(String(multisessionId || ''), 'utf8').toString('base64url')}`;
}

function isDerivedCycleId(cycleId){
  return String(cycleId || '').startsWith('derived-pr-cycle:');
}

function isMultisessionCycleId(cycleId){
  return String(cycleId || '').startsWith('multisession-v2-cycle:');
}

function multisessionIdentityFromId(cycleId){
  const prefix = 'multisession-v2-cycle:';
  const value = String(cycleId || '');
  if(!value.startsWith(prefix)) return null;
  try{
    return Buffer.from(value.slice(prefix.length), 'base64url').toString('utf8');
  }catch(_error){
    return null;
  }
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
  if(value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
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
  const prefix = cycleNo ? `Exercice ${domaine} ${cycleNo}` : `Exercice ${domaine}`;
  return [prefix, suffix || 'Base'].filter(Boolean).join(' – ');
}

function cycleDisplayLabel(cycle){
  const raw = text(cycle && cycle.libelle);
  if(!raw) return raw;
  const domain = normalizeDomain(cycle && cycle.domaine_code);
  const type = String(cycle && cycle.type_cycle || '').toUpperCase();
  if(type === 'MULTI_SESSION') return raw;
  if(domain !== 'PR' && domain !== 'AUTO') return raw;
  let compact = raw
    .replace(/\s+[—-]\s+\d{4}\s*$/u, '')
    .replace(/^Cycle\s+(PR|AUTO)\s*/i, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = compact.match(/^(?:Exercice\s+)?(PR|AUTO)\s+(\d+)(?:\s*[–—-]\s*|\s+)(.+)$/i);
  if(match){
    return `Exercice ${domain} ${match[2]} – ${match[3].trim() || 'Base'}`;
  }
  const number = compact.match(new RegExp(`^(?:Exercice\\s+)?${domain}\\s+(\\d+)\\s*$`, 'i'));
  if(number) return `Exercice ${domain} ${number[1]} – Base`;
  return raw;
}

function projectCycleLabel(cycle){
  if(!cycle) return cycle;
  const libelle = cycleDisplayLabel(cycle);
  return libelle && libelle !== cycle.libelle ? { ...cycle, libelle, libelle_source: cycle.libelle } : cycle;
}

function cycleStatusFromCompletion(completion){
  if(completion.complete) return 'TERMINE';
  if(completion.eventCount > 0 && completion.cancelledCount === completion.eventCount) return 'ANNULE';
  if(completion.realisedCount > 0 || completion.postponedCount > 0) return 'EN_COURS';
  return 'PLANIFIE';
}

function multiSessionStatusFromState(state){
  const status = String(state && state.globalStatus || '').toUpperCase();
  if(status === 'CLOTURE') return 'TERMINE';
  if(status === 'A_FINALISER') return 'A_FINALISER';
  return 'EN_COURS';
}

function dateRangeFromSessions(sessions){
  const dates = (sessions || []).map((row) => dateOnly(row.date)).filter(Boolean).sort();
  return { from: dates[0] || null, to: dates[dates.length - 1] || null };
}

function personDedupeKey(row){
  const nip = text(row && row.nip);
  const id = text(row && (row.personne_id || row.personneId || row.person_id || row.id));
  return nip ? `NIP:${nip}` : (id ? `ID:${id}` : '');
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
    if(isMultisessionCycleId(cycleId)){
      const multi = await multisessionCycleDetail(cycleId);
      if(multi) return multi;
      throw new HttpError(404, 'cycle_introuvable', 'Cycle introuvable.');
    }
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
    return { cycle: projectCycleLabel(cycle), evenements, personnes, metrics, pilotage };
  }

  async function buildMultiSessionState(multisession){
    if(!multisession || !repo.listMultisessionV2Sessions) return null;
    const multisessionId = multisession.multisession_id || multisession.id;
    const sessions = await repo.listMultisessionV2Sessions(multisessionId);
    const eventIds = (sessions || []).map((row) => eventId(row)).filter(Boolean);
    const [populationRows, participations] = await Promise.all([
      repo.listMultisessionV2Population ? repo.listMultisessionV2Population(multisessionId) : [],
      repo.listParticipationsForEvents && eventIds.length ? repo.listParticipationsForEvents(eventIds) : []
    ]);
    const personnes = await hydratePeople(repo, [
      ...populationRows.map((row) => row.person_id || row.personne_id || row.personneId),
      ...participations.map((row) => row.personne_id || row.personneId)
    ]);
    return MultiSessionV2.buildState({
      multisession,
      sessions,
      population: populationRows.map((row) => Object.assign({}, row, { personne_id: row.personne_id || row.person_id })),
      participations,
      personnes
    });
  }

  function multiSessionPilotageFromState(state, populationRows, participations, personnes){
    const sessions = state.sessions || [];
    const obligations = sessions.map((event, index) => ({
      obligationKey: eventId(event),
      label: `Session ${index + 1}/${sessions.length}`,
      domaine: state.multisession && state.multisession.domain || '',
      order: index + 1,
      eventIds: [eventId(event)].filter(Boolean),
      sessions: [event],
      sessionLocked: ['REALISE', 'CLOTUREE', 'ANNULEE'].includes(String(event.statut || event.status || '').toUpperCase())
    }));
    const peopleByKey = new Map();
    for(const row of populationRows || []){
      const id = row.personne_id || row.person_id || row.personneId;
      const p = personnes[id] || row;
      const key = personDedupeKey({ ...p, ...row, personne_id: id });
      if(key) peopleByKey.set(key, { ...p, ...row, personne_id: id });
    }
    const targetKeys = new Set(peopleByKey.keys());
    const supportByKey = new Map();
    for(const row of participations || []){
      const role = String(row.role || 'PARTICIPANT').toUpperCase();
      if(!ROLES_CYCLE.has(role) || role === 'PARTICIPANT') continue;
      const id = row.personne_id || row.personneId;
      const p = personnes[id] || row;
      const key = personDedupeKey({ ...p, ...row, personne_id: id });
      if(!key) continue;
      if(!peopleByKey.has(key)) peopleByKey.set(key, { ...p, ...row, personne_id: id });
      const roles = supportByKey.get(key) || new Set();
      roles.add(role);
      supportByKey.set(key, roles);
    }
    const rows = [...peopleByKey.entries()].map(([key, person]) => {
      const pid = text(person.personne_id || person.person_id || person.id);
      const v2 = state.byPersonneId && state.byPersonneId[pid] || {};
      const finalStatus = String(v2.finalStatus || '').toUpperCase();
      const isPopulation = targetKeys.has(key);
      let globalState = supportByKey.has(key) ? 'ENCADREMENT' : 'HORS_POPULATION';
      if(isPopulation){
        if(finalStatus === 'PRESENT') globalState = 'COMPLET';
        else if(finalStatus === 'DISPENSE') globalState = 'DISPENSE';
        else if(finalStatus === 'ABSENT_EXCUSE') globalState = 'EXCUSE';
        else if(finalStatus === 'ABSENT_NON_EXCUSE') globalState = 'INCOMPLET';
        else globalState = 'INCOMPLET';
      }
      const roleSet = new Set(isPopulation ? ['PARTICIPANT'] : []);
      for(const role of supportByKey.get(key) || []) roleSet.add(role);
      const cells = obligations.map((obligation) => {
        const p = (participations || []).find((row) => eventId(row) === obligation.obligationKey && personDedupeKey({ ...(personnes[row.personne_id] || {}), ...row }) === key) || null;
        const statut = String(p && p.statut || '').toUpperCase();
        let status = 'NON_CONCERNE';
        if(isPopulation){
          if(statut === 'PRESENT') status = 'REALISE';
          else if(statut === 'DISPENSE') status = 'DISPENSE';
          else if(statut === 'ABSENT_EXCUSE') status = 'EXCUSE';
          else if(statut === 'ABSENT_NON_EXCUSE') status = 'ABSENT';
          else status = 'A_RENSEIGNER';
        }
        return { obligationKey: obligation.obligationKey, label: obligation.label, expected: isPopulation, status, eventId: p && eventId(p) || null, role: p && p.role || null, statut: p && p.statut || null, motif: p && (p.motif_absence || p.reason) || null, sessionLocked: obligation.sessionLocked };
      });
      return {
        personKey: key,
        personneId: pid,
        nip: person.nip || '',
        nom: person.nom || '',
        prenom: person.prenom || '',
        grade: person.grade || '',
        roles: [...roleSet].sort(),
        isPopulation,
        isEncadrement: supportByKey.has(key),
        isOutsidePopulation: !isPopulation && !supportByKey.has(key),
        expectedCount: isPopulation ? 1 : 0,
        realisedCount: finalStatus === 'PRESENT' ? 1 : 0,
        dispensedCount: finalStatus === 'DISPENSE' ? 1 : 0,
        excusedCount: finalStatus === 'ABSENT_EXCUSE' ? 1 : 0,
        absentCount: finalStatus === 'ABSENT_NON_EXCUSE' ? 1 : 0,
        openCount: isPopulation && !finalStatus ? 1 : 0,
        progressionPct: isPopulation ? (finalStatus ? 100 : 0) : null,
        globalState,
        primaryEventId: v2.finalEventId || v2.countedEventId || null,
        primaryResultLabel: v2.referenceSessionLabel || null,
        obligations: cells
      };
    }).sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base' }) || String(a.prenom || '').localeCompare(String(b.prenom || ''), 'fr', { sensitivity: 'base' }));
    const population = rows.filter((row) => row.isPopulation);
    const complete = population.filter((row) => ['COMPLET', 'DISPENSE', 'EXCUSE'].includes(row.globalState));
    const incomplete = population.filter((row) => row.globalState === 'INCOMPLET');
    return {
      cycleId: multisessionCycleId(state.multisessionId),
      domaine: state.multisession && state.multisession.domain || '',
      obligations,
      individualRows: rows,
      kpis: {
        population: population.length,
        complete: complete.length,
        incomplete: incomplete.length,
        resteATraiter: incomplete.length,
        remainingObligations: incomplete.length,
        realised: population.filter((row) => row.realisedCount > 0).length,
        excused: population.filter((row) => row.excusedCount > 0).length,
        dispensed: population.filter((row) => row.dispensedCount > 0).length,
        encadrement: rows.filter((row) => row.isEncadrement).length,
        horsPopulation: rows.filter((row) => row.isOutsidePopulation).length,
        progression: population.length ? Math.round((1000 * complete.length) / population.length) / 10 : null
      }
    };
  }

  async function multisessionCycleDetail(cycleId){
    const multisessionId = multisessionIdentityFromId(cycleId);
    if(!multisessionId || !repo.getMultisessionV2) return null;
    const multisession = await repo.getMultisessionV2(multisessionId);
    if(!multisession) return null;
    const sessions = repo.listMultisessionV2Sessions ? await repo.listMultisessionV2Sessions(multisessionId) : [];
    const eventIds = (sessions || []).map((row) => eventId(row)).filter(Boolean);
    const [populationRows, participations] = await Promise.all([
      repo.listMultisessionV2Population ? repo.listMultisessionV2Population(multisessionId) : [],
      repo.listParticipationsForEvents && eventIds.length ? repo.listParticipationsForEvents(eventIds) : []
    ]);
    const personnes = await hydratePeople(repo, [
      ...populationRows.map((row) => row.person_id || row.personne_id || row.personneId),
      ...participations.map((row) => row.personne_id || row.personneId)
    ]);
    const state = MultiSessionV2.buildState({
      multisession,
      sessions,
      population: populationRows.map((row) => Object.assign({}, row, { personne_id: row.personne_id || row.person_id })),
      participations,
      personnes
    });
    const range = dateRangeFromSessions(sessions);
    const cycle = {
      cycle_id: cycleId,
      cycle_key: multisession.code || multisessionId,
      annee: String(range.from || range.to || '').slice(0, 4) ? Number(String(range.from || range.to).slice(0, 4)) : null,
      domaine_code: String(multisession.domain || '').toUpperCase(),
      type_cycle: 'MULTI_SESSION',
      libelle: multisession.label || 'Formation Multi-session',
      statut: multiSessionStatusFromState(state),
      stat_com: null,
      qui: null,
      date_debut: range.from,
      date_fin: range.to,
      source_type: 'CONFIGURATION',
      metadata: { engine: MultiSessionV2.ENGINE.MULTI_SESSION_V2, multisessionId }
    };
    const pilotage = multiSessionPilotageFromState(state, populationRows, participations, personnes);
    const metrics = {
      populationDistincte: state.statistics.population,
      participantsReconnusDistincts: state.statistics.presents,
      nonRenseignesDistincts: state.kpis.restentATraiter,
      effectifEngageCycle: state.statistics.presents,
      tauxParticipationCycle: {
        numerator: state.statistics.presents,
        denominator: state.statistics.denominator,
        percentage: state.statistics.percentage,
        contrat: 'MULTI_SESSION_V2'
      },
      details: {
        population: (populationRows || []).map((row) => personDedupeKey({ ...(personnes[row.person_id || row.personne_id] || {}), ...row })).filter(Boolean)
      }
    };
    const personnesCycle = (populationRows || []).map((row) => {
      const id = row.personne_id || row.person_id || row.personneId;
      return { ...(personnes[id] || {}), personne_id: id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' };
    });
    return { cycle, evenements: sessions, personnes: personnesCycle, metrics, pilotage };
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
    const domainSet = String(domaine || '').toUpperCase() === 'FOSPEC'
      ? new Set(['FOSPEC', 'PR', 'AUTO'])
      : (domaine ? new Set([normalizeDomain(domaine)]) : null);
    const events = await repo.listEvenements({
      annee: annee ? Number(annee) : null,
      domaine: domainSet && domainSet.size === 1 ? [...domainSet][0] : null
    });
    const groups = new Map();
    for(const event of events || []){
      if(event.cycle_id) continue;
      const groupKey = text(event.pr_exercise_group_key || event.prExerciseGroupKey);
      if(!groupKey) continue;
      const year = yearOfEvent(event);
      if(annee && Number(annee) !== year) continue;
      if(domainSet && !domainSet.has(normalizeDomain(event.domaine_code))) continue;
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
      const requestedDomain = optionalFilter(query.domaine || query.domaineCode || query.domaine_code);
      const domainSet = String(requestedDomain || '').toUpperCase() === 'FOSPEC'
        ? new Set(['FOSPEC', 'PR', 'AUTO'])
        : (requestedDomain ? new Set([normalizeDomain(requestedDomain)]) : null);
      const cycles = await repo.listCycles({
        annee: query.annee || query.year,
        domaine: domainSet && domainSet.size === 1 ? [...domainSet][0] : null,
        statut: optionalFilter(query.statut)
      });
      const items = [];
      for(const cycle of cycles){
        if(domainSet && !domainSet.has(normalizeDomain(cycle.domaine_code))) continue;
        const evenements = await repo.listCycleEvents(cycle.cycle_id);
        const personnes = await repo.listCyclePersonnes(cycle.cycle_id);
        const metrics = await cycleMetrics(cycle);
        items.push({ ...projectCycleLabel(cycle), eventCount: evenements.length, populationCount: metrics.populationDistincte, metrics, personneCount: personnes.length });
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
      if(repo.listMultisessionsV2){
        const multisessions = await repo.listMultisessionsV2(Object.assign({}, query, {
          domaine: domainSet && domainSet.size === 1 ? [...domainSet][0] : null
        }));
        for(const multisession of multisessions || []){
          if(domainSet && !domainSet.has(normalizeDomain(multisession.domain || multisession.domaine_code))) continue;
          const id = multisession.multisession_id || multisession.id;
          if(!id) continue;
          const detail = await multisessionCycleDetail(multisessionCycleId(id));
          if(!detail) continue;
          const statusFilter = optionalFilter(query.statut);
          if(statusFilter && detail.cycle.statut !== statusFilter) continue;
          items.push({
            ...detail.cycle,
            eventCount: detail.evenements.length,
            populationCount: detail.pilotage.kpis.population,
            remainingCount: detail.pilotage.kpis.resteATraiter,
            metrics: detail.metrics,
            personneCount: detail.pilotage.kpis.population,
            pilotageKpis: detail.pilotage.kpis,
            cycleTypeLabel: 'Formation Multi-session',
            derived: true,
            engine: MultiSessionV2.ENGINE.MULTI_SESSION_V2
          });
        }
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
