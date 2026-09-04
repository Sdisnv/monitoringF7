'use strict';

const { parsePeriod, inPeriod } = require('./_scope-period');
const { safePercentage } = require('./_scope-analytics');
const { filterAttendusEligibleAtDate } = require('./_scope-personnel');
const display = require('../../assets/js/scope-personnel-display.js');
const refs = require('../../assets/js/scope-personnel-referentials.js');

const JSP_SITES = Object.freeze([
  { code: 'G1', label: 'JSP G1' },
  { code: 'C1', label: 'JSP C1' },
  { code: 'B1', label: 'JSP B1' }
]);

const MOTIF_LABELS = Object.freeze({
  PRIVE: 'Privé',
  PROFESSIONNEL: 'Professionnel',
  ARMEE: 'Armée',
  ACCIDENT_MALADIE: 'Accident / maladie',
  ACTIVITE_SCOLAIRE: 'Activité scolaire',
  ACTIVITE_EXTRA_SCOLAIRE: 'Activité extra-scolaire',
  NON_JUSTIFIE: 'Non justifié',
  NON_PRECISE: 'Non précisé (historique)',
  MALADIE: 'Maladie (historique)',
  ACCIDENT: 'Accident (historique)',
  AUTRE: 'Autre (historique)'
});

function clean(value){
  return String(value == null ? '' : value).trim();
}

function pct(num, den){
  return safePercentage(Number(num || 0), Number(den || 0));
}

function emptyCounts(){
  return {
    jeunes: new Set(),
    eventIds: new Set(),
    expected: 0,
    present: 0,
    excused: 0,
    absent: 0,
    dispensed: 0,
    nonRenseigne: 0
  };
}

function finalizeCounts(row){
  const denominator = Number(row.present || 0) + Number(row.excused || 0) + Number(row.absent || 0);
  return Object.assign({}, row, {
    jeunes: row.jeunes instanceof Set ? row.jeunes.size : Number(row.jeunes || 0),
    exercises: row.eventIds instanceof Set ? row.eventIds.size : Number(row.exercises || 0),
    denominator,
    presenceRate: pct(row.present, denominator),
    excusedRate: pct(row.excused, denominator),
    absentRate: pct(row.absent, denominator)
  });
}

function normalizeSite(raw){
  const text = clean(raw).toUpperCase().replace(/^JSP\s+/, '');
  return JSP_SITES.some((row) => row.code === text) ? text : '';
}

function statusBucket(statut){
  const code = clean(statut).toUpperCase();
  if(code === 'PRESENT' || code === 'PERMUTATION') return 'present';
  if(code === 'EXCUSE' || code === 'ABSENT_EXCUSE') return 'excused';
  if(code === 'ABSENT' || code === 'NON_EXCUSE' || code === 'ABSENT_NON_EXCUSE') return 'absent';
  if(code === 'DISPENSE') return 'dispensed';
  return 'nonRenseigne';
}

function motifLabel(motif){
  const key = clean(motif).toUpperCase();
  return MOTIF_LABELS[key] || clean(motif);
}

function periodLabel(period){
  if(!period) return '';
  if(period.preset === 'YEAR') return String(period.from || '').slice(0, 4);
  return [period.from, period.to].filter(Boolean).join(' - ');
}

function siteForPersonAt(assignments, date){
  const rows = (assignments || []).filter((row) => {
    const domaine = clean(row.domaine || row.domaine_code || row.domaineCode).toUpperCase();
    if(domaine !== 'JSP') return false;
    const start = clean(row.date_actif || row.dateActif || row.date_debut || row.dateDebut);
    const end = clean(row.date_inactif || row.dateInactif || row.date_fin || row.dateFin);
    const day = clean(date).slice(0, 10);
    if(start && day && start.slice(0, 10) > day) return false;
    if(end && day && end.slice(0, 10) < day) return false;
    return true;
  });
  const hit = rows.find((row) => normalizeSite(row.cible || row.niveau_code || row.niveauCode));
  return hit ? normalizeSite(hit.cible || hit.niveau_code || hit.niveauCode) : '';
}

function compareName(a, b){
  return `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr', { sensitivity: 'base', numeric: true });
}

function compareInstitutional(a, b){
  return refs.compareGrades(a.grade, b.grade) || compareName(a, b);
}

function displayPerson(person){
  return {
    personneId: person.personne_id || person.personneId,
    nip: person.nip || '',
    grade: person.grade || '',
    nom: person.nom || '',
    prenom: person.prenom || ''
  };
}

async function peopleById(repo){
  const rows = typeof repo.listPersonnes === 'function' ? await repo.listPersonnes({}) : [];
  return new Map((rows || []).map((row) => [String(row.personne_id || row.personneId), row]));
}

async function assignmentsByPerson(repo){
  const rows = typeof repo.listAffectations === 'function' ? await repo.listAffectations({}) : [];
  const byPerson = new Map();
  for(const row of rows || []){
    const pid = String(row.personne_id || row.personneId || '');
    if(!pid) continue;
    if(!byPerson.has(pid)) byPerson.set(pid, []);
    byPerson.get(pid).push(row);
  }
  return byPerson;
}

function eventSite(event, cibles){
  const jsp = (cibles || []).find((row) => clean(row.domaine_code || row.domaineCode).toUpperCase() === 'JSP'
    && normalizeSite(row.niveau_code || row.niveauCode || row.cible));
  return jsp ? normalizeSite(jsp.niveau_code || jsp.niveauCode || jsp.cible) : '';
}

function graphPayload(siteRows, exercises, motifs){
  return {
    evolution: exercises.map((row) => ({
      label: row.date,
      value: row.presenceRate,
      date: row.date,
      exercise: row.libelle
    })),
    sites: siteRows.map((row) => ({
      label: row.site,
      presents: row.present,
      excuses: row.excused,
      absents: row.absent,
      taux: row.presenceRate
    })),
    motifs: motifs.map((row) => ({
      label: row.motif,
      value: row.count,
      percentage: row.share
    }))
  };
}

function createScopeJspReportingService(repo){
  async function report(query = {}){
    const period = parsePeriod(query);
    const wantedSite = normalizeSite(query.site || query.cible || query.niveau);
    const siteFilter = wantedSite || 'TOUS';
    const [people, assignments, eventsRaw] = await Promise.all([
      peopleById(repo),
      assignmentsByPerson(repo),
      repo.listEvenements({ domaine: 'JSP', from: period.from, to: period.to })
    ]);
    const countableEvents = (eventsRaw || [])
      .filter((event) => clean(event.domaine_code || event.domaineCode).toUpperCase() === 'JSP')
      .filter((event) => inPeriod(event.date, period))
      .filter((event) => clean(event.statut).toUpperCase() === 'REALISE');
    const ids = countableEvents.map((event) => event.evenement_id || event.evenementId).filter(Boolean);
    const [allCiblesRows, attendusRows, participationsRows, periodesRows] = await Promise.all([
      typeof repo.listEventCiblesForEvents === 'function' ? repo.listEventCiblesForEvents(ids) : [],
      repo.listAttendusForEvents(ids),
      repo.listParticipationsForEvents(ids),
      typeof repo.listAllPeriodes === 'function' ? repo.listAllPeriodes() : []
    ]);
    const ciblesByEvent = new Map();
    for(const row of allCiblesRows || []){
      const eid = String(row.evenement_id || row.evenementId || '');
      if(!ciblesByEvent.has(eid)) ciblesByEvent.set(eid, []);
      ciblesByEvent.get(eid).push(row);
    }
    const attendusByEvent = new Map();
    for(const row of attendusRows || []){
      const eid = String(row.evenement_id || row.evenementId || '');
      if(!attendusByEvent.has(eid)) attendusByEvent.set(eid, []);
      attendusByEvent.get(eid).push(row);
    }
    const partsByEventPerson = new Map();
    for(const row of participationsRows || []){
      partsByEventPerson.set(`${row.evenement_id || row.evenementId}::${row.personne_id || row.personneId}`, row);
    }
    const periodesByPersonne = new Map();
    for(const row of periodesRows || []){
      const pid = String(row.personne_id || row.personneId || '');
      if(!periodesByPersonne.has(pid)) periodesByPersonne.set(pid, []);
      periodesByPersonne.get(pid).push(row);
    }

    const siteCounts = new Map(JSP_SITES.map((site) => [site.code, Object.assign({ site: site.label, code: site.code }, emptyCounts())]));
    const global = Object.assign({ site: 'Tous les sites', code: 'TOUS' }, emptyCounts());
    const personRows = new Map();
    const detailRows = [];
    const motifCounts = new Map();
    const exerciseMap = new Map();
    let monitorRowsIgnored = 0;

    for(const event of countableEvents){
      const eventId = String(event.evenement_id || event.evenementId);
      const cibles = ciblesByEvent.get(eventId) || [];
      const fallbackSite = eventSite(event, cibles);
      const rawAttendus = attendusByEvent.get(eventId) || [];
      const eligible = filterAttendusEligibleAtDate(rawAttendus, periodesByPersonne, event.date).filter((row) => row.inclus !== false);
      for(const attendu of eligible){
        const personneId = String(attendu.personne_id || attendu.personneId);
        const person = people.get(personneId);
        if(!person) continue;
        const personAssignments = assignments.get(personneId) || [];
        const role = display.classifyJspRole(person, personAssignments, event.date);
        if(role !== 'JEUNE'){
          if(role === 'MONITEUR') monitorRowsIgnored += 1;
          continue;
        }
        const site = siteForPersonAt(personAssignments, event.date) || fallbackSite;
        if(!normalizeSite(site)) continue;
        if(wantedSite && normalizeSite(site) !== wantedSite) continue;
        const part = partsByEventPerson.get(`${eventId}::${personneId}`) || {};
        const bucket = statusBucket(part.statut);
        const personKey = String(person.nip || personneId);
        if(!personRows.has(personKey)){
          personRows.set(personKey, Object.assign(displayPerson(person), {
            site: `JSP ${normalizeSite(site)}`,
            expected: 0,
            present: 0,
            excused: 0,
            absent: 0,
            dispensed: 0,
            nonRenseigne: 0
          }));
        }
        const row = personRows.get(personKey);
        row.expected += 1;
        row[bucket] += 1;
        row.site = row.site || `JSP ${normalizeSite(site)}`;
        const siteRow = siteCounts.get(normalizeSite(site));
        siteRow.jeunes.add(personKey);
        siteRow.eventIds.add(eventId);
        siteRow.expected += 1;
        siteRow[bucket] += 1;
        global.jeunes.add(personKey);
        global.eventIds.add(eventId);
        global.expected += 1;
        global[bucket] += 1;
        const exKey = `${eventId}::${normalizeSite(site)}`;
        if(!exerciseMap.has(exKey)){
          exerciseMap.set(exKey, Object.assign({
            evenementId: eventId,
            date: event.date,
            libelle: event.libelle || 'Exercice JSP',
            site: `JSP ${normalizeSite(site)}`
          }, emptyCounts()));
        }
        const ex = exerciseMap.get(exKey);
        ex.jeunes.add(personKey);
        ex.eventIds.add(eventId);
        ex.expected += 1;
        ex[bucket] += 1;
        if(bucket === 'excused' || bucket === 'absent'){
          const motif = bucket === 'excused' ? motifLabel(part.motif_absence) : 'Absence sans excuse enregistrée';
          detailRows.push(Object.assign(displayPerson(person), {
            date: event.date,
            evenementId: eventId,
            exercice: event.libelle || 'Exercice JSP',
            site: `JSP ${normalizeSite(site)}`,
            statut: bucket === 'excused' ? 'EXCUSÉ' : 'ABSENT',
            motif
          }));
          if(bucket === 'excused'){
            const key = motif || 'Non précisé';
            motifCounts.set(key, (motifCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    const siteRows = JSP_SITES.map((site) => finalizeCounts(siteCounts.get(site.code)));
    const kpis = finalizeCounts(global);
    const persons = [...personRows.values()].map((row) => finalizeCounts(Object.assign({ jeunes: 1, eventIds: new Set() }, row)))
      .sort(compareInstitutional);
    const watchlist = persons.slice().sort((a, b) => {
      const absenceA = Number(a.excused || 0) + Number(a.absent || 0);
      const absenceB = Number(b.excused || 0) + Number(b.absent || 0);
      return Number(b.absent || 0) - Number(a.absent || 0)
        || Number(b.excused || 0) - Number(a.excused || 0)
        || pct(absenceB, b.expected || 0) - pct(absenceA, a.expected || 0)
        || compareName(a, b);
    }).map((row) => Object.assign({}, row, {
      totalAbsences: Number(row.excused || 0) + Number(row.absent || 0),
      absenceRate: pct(Number(row.excused || 0) + Number(row.absent || 0), row.expected)
    }));
    const regulars = persons.slice().sort((a, b) => {
      return Number(b.presenceRate || 0) - Number(a.presenceRate || 0)
        || Number(b.present || 0) - Number(a.present || 0)
        || Number(b.expected || 0) - Number(a.expected || 0)
        || compareName(a, b);
    });
    const exercises = [...exerciseMap.values()].map((row) => {
      const done = finalizeCounts(row);
      return Object.assign(done, { gap: Number(done.present || 0) - Number(done.expected || 0) });
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.site).localeCompare(String(b.site)));
    const excuseTotal = [...motifCounts.values()].reduce((sum, n) => sum + n, 0);
    const motifs = [...motifCounts.entries()].map(([motif, count]) => ({
      motif,
      count,
      share: pct(count, excuseTotal)
    })).sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || String(a.motif).localeCompare(String(b.motif), 'fr'));

    return {
      kind: 'JSP',
      title: 'RAPPORT JSP',
      subtitle: `Participation aux exercices — ${periodLabel(period)}`,
      period,
      siteFilter,
      siteLabel: wantedSite ? `JSP ${wantedSite}` : 'Tous les sites',
      sites: JSP_SITES,
      kpis,
      siteRows,
      persons,
      watchlist,
      regulars,
      exercises,
      motifs,
      details: detailRows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || compareName(a, b)),
      graphs: graphPayload(siteRows, exercises, motifs),
      exclusions: {
        annules: (eventsRaw || []).filter((event) => clean(event.statut).toUpperCase() === 'ANNULE').length,
        nonRealises: (eventsRaw || []).filter((event) => clean(event.statut).toUpperCase() !== 'REALISE' && clean(event.statut).toUpperCase() !== 'ANNULE').length,
        monitors: monitorRowsIgnored
      },
      source: 'scope_evenements + scope_attendus + scope_participations + scope_affectations'
    };
  }

  return { report };
}

module.exports = {
  JSP_SITES,
  createScopeJspReportingService
};
