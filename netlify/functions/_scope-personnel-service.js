'use strict';
const db = require('./_postgres');
const ctx = require('./_scope-personnel-import-contexts');
const display = require('../../assets/js/scope-personnel-display.js');
const temporal = require('../../assets/js/scope-personnel-temporal.js');
const populations = require('../../assets/js/scope-personnel-populations.js');

function rid(){
  return (global.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clean(value){ return String(value || '').trim(); }
function normalizeNip(value){ return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, ''); }
function monitoringStart(year){ return `${Number(year) || new Date().getFullYear()}-01-01`; }
function lastDayOfPreviousYear(year){
  const y = Number(year) || new Date().getFullYear();
  return `${y - 1}-12-31`;
}

function getDb(){ return db; }

async function ensureScopeSchema(){
  if(getDb()._skipScopeSchema) return true;
  const schema = require('./_scope-schema');
  await schema.ensureScopeSchema();
  await getDb().query(`create table if not exists scope_personnes (
    id text primary key,
    nip text not null unique,
    grade text,
    nom text,
    prenom text,
    date_entree_sdis date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz
  )`);
  await getDb().query(`create table if not exists scope_personnel_import_batches (
    id text primary key,
    import_type text not null,
    contexte text,
    site_jsp text,
    annee_monitoring integer not null,
    filename text,
    status text not null,
    total_lines integer not null default 0,
    total_unique_nips integer not null default 0,
    count_identical integer not null default 0,
    count_new_persons integer not null default 0,
    count_new_jsp integer not null default 0,
    count_modified integer not null default 0,
    count_new_assignments integer not null default 0,
    count_existing_assignments integer not null default 0,
    count_missing_assignments integer not null default 0,
    count_closures integer not null default 0,
    count_errors integer not null default 0,
    created_by text,
    created_at timestamptz not null default now(),
    committed_at timestamptz
  )`);
  await getDb().query(`create table if not exists scope_affectations (
    id text primary key,
    personne_id text not null references scope_personnes(id),
    categorie text not null,
    domaine text not null,
    cible text not null,
    role_domaine text,
    date_actif date not null,
    date_inactif date,
    source_import_batch_id text references scope_personnel_import_batches(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scope_affectations_dates_chk check (date_inactif is null or date_actif <= date_inactif),
    constraint scope_affectations_categorie_chk check (categorie in ('OI','SPECIALISATION')),
    constraint scope_affectations_role_chk check (role_domaine is null or role_domaine in ('PRINCIPAL','SECONDAIRE'))
  )`);
  await getDb().query(`create table if not exists scope_personnel_import_lines (
    id text primary key,
    batch_id text not null references scope_personnel_import_batches(id) on delete cascade,
    line_number integer not null,
    nip text,
    raw_payload jsonb not null default '{}'::jsonb,
    normalized_payload jsonb not null default '{}'::jsonb,
    status text not null,
    diff_payload jsonb not null default '{}'::jsonb,
    errors_payload jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
  )`);
  await getDb().query(`create index if not exists idx_scope_personnes_nip on scope_personnes (nip)`);
  await getDb().query(`create index if not exists idx_scope_affectations_personne on scope_affectations (personne_id)`);
  await getDb().query(`create index if not exists idx_scope_affectations_scope on scope_affectations (domaine, cible, role_domaine, date_actif, date_inactif)`);
  await getDb().query(`create index if not exists idx_scope_import_lines_batch on scope_personnel_import_lines (batch_id, line_number)`);
  return true;
}

function parseDelimitedLine(line, sep){
  const out = [];
  let cur = '';
  let quoted = false;
  for(let i = 0; i < String(line).length; i++){
    const ch = line[i];
    if(ch === '"' && line[i + 1] === '"'){ cur += '"'; i++; continue; }
    if(ch === '"'){ quoted = !quoted; continue; }
    if(ch === sep && !quoted){ out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(value){
  return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function parsePersonnelCsv(text){
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if(lines.length < 2) throw new Error('CSV vide ou sans donnees.');
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = parseDelimitedLine(lines[0], sep).map(normalizeHeader);
  const indexOf = names => headers.findIndex(header => names.includes(header));
  const idx = {
    nip: indexOf(['nip', 'eca', 'identifiant', 'matricule']),
    grade: indexOf(['grade', 'rang']),
    prenom: indexOf(['prenom']),
    nom: indexOf(['nom', 'name']),
    organes: indexOf(['organe s d intervention', 'organes d intervention', 'oi', 'organe', 'organisation', 'affectation'])
  };
  return lines.slice(1).map((line, i) => {
    const values = parseDelimitedLine(line, sep);
    return {
      lineNumber: i + 2,
      raw: line,
      nip: idx.nip >= 0 ? values[idx.nip] : '',
      grade: idx.grade >= 0 ? values[idx.grade] : '',
      prenom: idx.prenom >= 0 ? values[idx.prenom] : '',
      nom: idx.nom >= 0 ? values[idx.nom] : '',
      organes: idx.organes >= 0 ? values[idx.organes] : ''
    };
  });
}

function normalizeOiToken(token){
  const raw = clean(token).replace(/\s+/g, ' ');
  const left = raw.split(/\s+-\s+/)[0].trim();
  const upper = left.toUpperCase();
  let m = upper.match(/^DPS\s+(G1|C1|B1|B2)\b/);
  if(m) return { categorie:'OI', domaine:'DPS', cible:m[1], role_domaine:null };
  m = upper.match(/^DAP\s+(Y1|Y2|Y3|Y4)\b/);
  if(m) return { categorie:'OI', domaine:'DAP', cible:m[1], role_domaine:null };
  m = upper.match(/^JSP\s+(G1|C1|B1|CAD|GEN)\b/);
  if(m) return { categorie:'OI', domaine:'JSP', cible:`JSP ${m[1]}`, role_domaine:null };
  return null;
}

function parseOiAssignments(rawOrgans){
  const assignments = [];
  const principalSeen = new Set();
  String(rawOrgans || '').split(',').map(clean).filter(Boolean).forEach(token => {
    const parsed = normalizeOiToken(token);
    if(!parsed) {
      assignments.push({ error:`OI inconnu : "${token}"`, raw:token });
      return;
    }
    const principal = !principalSeen.has(parsed.domaine);
    principalSeen.add(parsed.domaine);
    assignments.push(Object.assign(parsed, { role_domaine: principal ? 'PRINCIPAL' : 'SECONDAIRE' }));
  });
  return assignments;
}

function specializationForContext(contexte, siteJsp){
  const resolved = ctx.resolveImportContext(contexte);
  return ctx.contextAssignment(resolved, siteJsp);
}

function normalizeAssignments(rawOrgans, contexte, siteJsp){
  const resolved = ctx.resolveImportContext(contexte);
  const oi = parseOiAssignments(rawOrgans);
  if(resolved.persistOi) return oi;
  const spec = ctx.contextAssignment(resolved, siteJsp);
  return spec ? [spec] : [];
}

function assignmentKey(a){ return ctx.assignmentKey(a); }

function hasOpenDomaineOi(assignments, domaine){
  return (assignments || []).some((row) => (
    row.categorie === 'OI'
    && row.domaine === domaine
    && !row.date_inactif
    && !row.error
  ));
}

function gradesEqual(a, b){
  const left = ctx.normalizeJspGrade(a);
  const right = ctx.normalizeJspGrade(b);
  if(left && right && (String(left).startsWith('Flm ') || String(right).startsWith('Flm ')) && left === right) return true;
  return clean(a) === clean(b);
}

function identityChanged(existing, next){
  if(!existing) return false;
  return !gradesEqual(existing.grade, next.grade)
    || ['nom', 'prenom'].some((key) => clean(existing[key]) !== clean(next[key]));
}

function normalizeRows(rows, contexte, siteJsp){
  const resolved = ctx.resolveImportContext(contexte);
  const seen = new Map();
  return rows.map(row => {
    const errors = [];
    const warnings = [];
    const nip = normalizeNip(row.nip);
    if(!nip) errors.push('NIP manquant');
    if(resolved.family !== 'JSP'){
      if(!clean(row.nom)) errors.push('Nom vide.');
      if(!clean(row.prenom)) errors.push('Prénom vide.');
    } else {
      if(!clean(row.nom)) errors.push('Nom vide.');
      if(!clean(row.prenom)) errors.push('Prénom vide.');
    }
    const oiParsed = parseOiAssignments(row.organes);
    const oiErrors = oiParsed.filter(a => a.error);
    const oiValid = oiParsed.filter(a => !a.error);
    if(resolved.persistOi){
      oiErrors.forEach(a => errors.push(a.error));
    } else if(oiErrors.length && clean(row.organes)){
      oiErrors.forEach(a => warnings.push(a.error));
    }
    let siteFromRow = siteJsp;
    let assignments = resolved.persistOi
      ? oiValid
      : (ctx.contextAssignment(resolved, siteJsp) ? [ctx.contextAssignment(resolved, siteJsp)] : []);
    if(resolved.siteFromFile){
      const jspOi = oiValid.find((row) => row.domaine === 'JSP');
      siteFromRow = jspOi ? ctx.normalizeJspSite(jspOi.cible) : ctx.normalizeJspSite(row.organes);
      if(!siteFromRow){
        const rawSite = clean(row.organes);
        errors.push(rawSite ? `Site JSP inconnu : "${rawSite}"` : 'Site JSP manquant');
        assignments = [];
      } else {
        assignments = [ctx.contextAssignment(resolved, siteFromRow) || {
          categorie: 'OI',
          domaine: 'JSP',
          cible: siteFromRow.code,
          role_domaine: 'PRINCIPAL'
        }];
      }
    } else if(resolved.family === 'JSP' && (!siteJsp || !siteJsp.code)){
      errors.push('Site JSP obligatoire.');
    }
    const sourceNip = clean(row.nip);
    let grade = clean(row.grade);
    if(resolved.gradeFromFile || resolved.jspPopulation === 'JEUNES'){
      const rawGrade = clean(row.grade);
      grade = ctx.normalizeJspGrade(row.grade);
      if(!ctx.isJspYouthGrade(grade)){
        errors.push(rawGrade ? `Grade JSP inconnu : "${rawGrade}"` : 'Grade JSP manquant');
        grade = '';
      }
    } else if(resolved.family === 'JSP' && resolved.jspGrade){
      grade = resolved.jspGrade;
    }
    const visibleNip = nip || sourceNip;
    const normalized = {
      nip: visibleNip,
      sourceNip,
      grade,
      prenom: clean(row.prenom),
      nom: clean(row.nom),
      assignments,
      oiFromFile: oiValid,
      siteJsp: siteFromRow ? siteFromRow.code : null
    };
    if(nip){
      const prev = seen.get(nip);
      if(prev && (prev.grade !== normalized.grade || prev.prenom !== normalized.prenom || prev.nom !== normalized.nom)){
        errors.push('Doublon NIP contradictoire dans le fichier.');
      }
      if(!prev) seen.set(nip, normalized);
    }
    return { lineNumber: row.lineNumber, raw: row, nip: visibleNip, sourceNip, normalized, errors, warnings, duplicateOf: seen.get(nip) && seen.get(nip) !== normalized };
  });
}

function currentContextAssignments(existingAssignments, resolved, siteJsp){
  return (existingAssignments || []).filter((row) => ctx.assignmentMatchesContext(row, resolved, siteJsp));
}

function summarizeLine(normalizedLine, existingPerson, existingAssignments, resolved, siteJsp, dateActif){
  if(!resolved || !resolved.family){
    resolved = ctx.IMPORT_CONTEXTS.GENERAL;
  }
  const errors = (normalizedLine.errors || []).slice();
  const warnings = (normalizedLine.warnings || []).slice();
  const n = normalizedLine.normalized;
  const open = (existingAssignments || []).filter((row) => !row.date_inactif);
  const contextCurrent = currentContextAssignments(open, resolved, siteJsp);
  const incoming = n.assignments || [];
  const diff = {
    person: {},
    identity: {
      grade: { current: existingPerson ? clean(existingPerson.grade) : '', proposed: n.grade },
      nom: { current: existingPerson ? clean(existingPerson.nom) : '', proposed: n.nom },
      prenom: { current: existingPerson ? clean(existingPerson.prenom) : '', proposed: n.prenom }
    },
    population: {
      oiSite: {
        current: contextCurrent.filter((row) => row.categorie === 'OI').map(ctx.oiLabel).join(', '),
        proposed: incoming.filter((row) => row.categorie === 'OI').map(ctx.oiLabel).join(', ')
      },
      specialization: {
        current: contextCurrent.map(ctx.specializationLabel).join(', '),
        proposed: incoming.map(ctx.specializationLabel).join(', ')
      },
      dateActif: dateActif,
      dateInactif: null
    },
    newAssignments: [],
    existingAssignments: [],
    missingAssignments: [],
    principalChanges: [],
    otherPopulations: open.filter((row) => !ctx.assignmentMatchesContext(row, resolved, siteJsp)).map(ctx.specializationLabel).filter(Boolean)
  };
  if(resolved.jspPopulation === 'MONITEURS'){
    if(!existingPerson){
      errors.push('Moniteur JSP absent du personnel SDIS');
    } else {
      n.grade = clean(existingPerson.grade);
      diff.identity.grade.proposed = n.grade;
      const probe = (existingAssignments || []).concat(n.oiFromFile || []).concat(incoming);
      if(!ctx.hasActiveOi(probe, ['DPS', 'DAP'], dateActif)){
        errors.push('Moniteur JSP sans OI SDIS actif');
      }
    }
  }
  if(errors.length){
    return {
      status: 'ERROR',
      statusLabel: ctx.STATUS_LABELS.ERROR,
      diff,
      errors,
      warnings,
      messages: errors.concat(warnings)
    };
  }
  if(existingPerson && identityChanged(existingPerson, n)){
    ['grade', 'nom', 'prenom'].forEach((key) => {
      const changed = key === 'grade'
        ? !gradesEqual(existingPerson[key], n[key])
        : clean(existingPerson[key]) !== clean(n[key]);
      if(changed){
        diff.person[key] = { before: clean(existingPerson[key]), after: clean(n[key]) };
      }
    });
    if(diff.person.nom || diff.person.prenom){
      warnings.push(`NIP ${n.nip} associé à une identité différente`);
    }
    if(diff.person.grade){
      warnings.push('Changement de grade.');
    }
  }
  const existingKeys = new Set(open.map(assignmentKey));
  const incomingKeys = new Set(incoming.map(assignmentKey));
  incoming.forEach((assignment) => {
    if(existingKeys.has(assignmentKey(assignment))) diff.existingAssignments.push(assignment);
    else diff.newAssignments.push(assignment);
  });
  if(resolved.family === 'GENERAL'){
    open.forEach((assignment) => {
      if(incomingKeys.has(assignmentKey(assignment))) return;
      if(assignment.categorie === 'OI' && (assignment.domaine === 'DPS' || assignment.domaine === 'DAP')){
        diff.missingAssignments.push(assignment);
        warnings.push(`OI ${ctx.oiLabel(assignment)} absent du fichier — non clôturé automatiquement.`);
      }
    });
    incoming.forEach((assignment) => {
      if(assignment.role_domaine !== 'PRINCIPAL') return;
      const prevPrincipal = open.find((old) => old.categorie === 'OI' && old.domaine === assignment.domaine && old.role_domaine === 'PRINCIPAL' && !old.date_inactif);
      if(prevPrincipal && prevPrincipal.cible !== assignment.cible){
        diff.principalChanges.push({ domaine:assignment.domaine, before:prevPrincipal.cible, after:assignment.cible });
      }
    });
  }
  if(resolved.requiresDpsOi && !hasOpenDomaineOi(open.concat(n.oiFromFile || []), 'DPS')){
    warnings.push('cond VL — DPS sans rattachement DPS cohérent.');
  }
  if(resolved.requiresDapOi && !hasOpenDomaineOi(open.concat(n.oiFromFile || []), 'DAP')){
    warnings.push('cond VL — DAP sans rattachement DAP cohérent.');
  }
  if(resolved.family === 'FOBA'){
    const otherFoba = open.filter((row) => row.domaine === 'FOBA' && ctx.normalizeFobaCible(row.cible) !== resolved.fobaLevel && !row.date_inactif);
    otherFoba.forEach((row) => warnings.push(`FOBA ${ctx.normalizeFobaCible(row.cible)} déjà actif — non clôturé automatiquement.`));
  }
  if(resolved.family === 'JSP'){
    const siteCode = n.siteJsp || (siteJsp && siteJsp.code);
    const otherJsp = open.filter((row) => row.domaine === 'JSP' && row.cible !== siteCode && !row.date_inactif);
    otherJsp.forEach((row) => warnings.push(`${ctx.specializationLabel(row)} déjà actif — non clôturé automatiquement.`));
  }
  const infos = [];
  const autoEval = display.evaluateAutoSpecializations(open.concat(incoming), dateActif, resolved.code);
  autoEval.infos.forEach((msg) => { if(!infos.includes(msg)) infos.push(msg); });
  autoEval.anomalies.forEach((msg) => { if(!warnings.includes(msg)) warnings.push(msg); });
  diff.auto = {
    plPriorityForVlDps: autoEval.plPriorityForVlDps,
    plWithoutActiveDps: autoEval.plWithoutActiveDps,
    countsInVlDpsEffectif: autoEval.countsInVlDpsEffectif,
    countsInPlEffectif: autoEval.countsInPlEffectif,
    countsInVlDapEffectif: autoEval.countsInVlDapEffectif
  };
  const messages = warnings.concat(infos);
  if(!existingPerson){
    return {
      status: resolved.newPersonStatus,
      statusLabel: resolved.newPersonLabel,
      diff: Object.assign(diff, { person: { created: true } }),
      errors: [],
      warnings,
      infos,
      messages: messages.slice()
    };
  }
  if(diff.person.grade || diff.person.nom || diff.person.prenom){
    return { status:'MODIFIED', statusLabel: ctx.STATUS_LABELS.MODIFIED, diff, errors:[], warnings, infos, messages: messages.slice() };
  }
  if(diff.newAssignments.length){
    return { status:'NEW_ASSIGNMENT', statusLabel: ctx.STATUS_LABELS.NEW_ASSIGNMENT, diff, errors:[], warnings, infos, messages: messages.slice() };
  }
  if(diff.existingAssignments.length && !warnings.length && !infos.length){
    return { status:'IDENTICAL', statusLabel: ctx.STATUS_LABELS.IDENTICAL, diff, errors:[], warnings, infos: [], messages: [] };
  }
  if(warnings.length || infos.length){
    return { status:'IDENTICAL', statusLabel: ctx.STATUS_LABELS.IDENTICAL, diff, errors:[], warnings, infos, messages: messages.slice() };
  }
  return { status:'IDENTICAL', statusLabel: ctx.STATUS_LABELS.IDENTICAL, diff, errors:[], warnings, infos: [], messages: [] };
}

function buildAbsentLine(person, assignments, resolved, siteJsp, dateActif, dateInactifProposee){
  const contextCurrent = currentContextAssignments(assignments, resolved, siteJsp);
  return {
    lineNumber: `absent-${person.nip}`,
    raw: { nip: person.nip, grade: person.grade, nom: person.nom, prenom: person.prenom },
    nip: person.nip,
    normalized: {
      nip: person.nip,
      sourceNip: person.nip,
      grade: clean(person.grade),
      nom: clean(person.nom),
      prenom: clean(person.prenom),
      assignments: [],
      oiFromFile: []
    },
    status: 'ABSENT_DU_NOUVEL_IMPORT',
    statusLabel: ctx.STATUS_LABELS.ABSENT_DU_NOUVEL_IMPORT,
    errors: [],
    warnings: [],
    messages: ['Absent du nouvel import. Aucune clôture automatique.'],
    decision: 'CONSERVER',
    dateEffet: dateInactifProposee,
    diff: {
      person: {},
      identity: {
        grade: { current: clean(person.grade), proposed: clean(person.grade) },
        nom: { current: clean(person.nom), proposed: clean(person.nom) },
        prenom: { current: clean(person.prenom), proposed: clean(person.prenom) }
      },
      population: {
        oiSite: { current: contextCurrent.filter((row) => row.categorie === 'OI').map(ctx.oiLabel).join(', '), proposed: '' },
        specialization: { current: contextCurrent.map(ctx.specializationLabel).join(', '), proposed: '' },
        dateActif,
        dateInactif: dateInactifProposee
      },
      newAssignments: [],
      existingAssignments: contextCurrent,
      missingAssignments: contextCurrent,
      principalChanges: [],
      otherPopulations: []
    }
  };
}

function summarizeAnalysis(lines){
  const uniqueNips = new Set(lines.map(l => l.normalized?.nip).filter(Boolean));
  const counts = {
    totalLines: lines.filter((line) => line.status !== 'ABSENT_DU_NOUVEL_IMPORT').length,
    totalUniqueNips: uniqueNips.size,
    countIdentical: 0,
    countNewPersons: 0,
    countNewJsp: 0,
    countModified: 0,
    countNewAssignments: 0,
    countExistingAssignments: 0,
    countMissingAssignments: 0,
    countErrors: 0
  };
  lines.forEach(line => {
    if(line.status === 'IDENTICAL') counts.countIdentical++;
    if(line.status === 'NEW_PERSON') counts.countNewPersons++;
    if(line.status === 'NEW_JSP') counts.countNewJsp++;
    if(line.status === 'MODIFIED') counts.countModified++;
    if(line.status === 'NEW_ASSIGNMENT') counts.countNewAssignments++;
    if(line.diff && line.diff.existingAssignments && line.diff.existingAssignments.length && line.status !== 'ABSENT_DU_NOUVEL_IMPORT'){
      counts.countExistingAssignments++;
    }
    if(line.status === 'ABSENT_DU_NOUVEL_IMPORT' || line.status === 'MISSING_ASSIGNMENT') counts.countMissingAssignments++;
    if(line.status === 'ERROR') counts.countErrors++;
  });
  return counts;
}

function buildPreview({ rows, existingPersons, existingAssignments, population, resolved, siteJsp, anneeMonitoring, filename }){
  const dateActif = monitoringStart(anneeMonitoring);
  const dateInactifProposee = lastDayOfPreviousYear(anneeMonitoring);
  const seenNips = new Set();
  const lines = [];
  rows.forEach((row) => {
    const nip = row.normalized.nip;
    if(nip && seenNips.has(nip) && !(row.errors || []).length){
      lines.push(Object.assign({}, row, {
        nip: row.nip || nip,
        status: 'IDENTICAL',
        statusLabel: ctx.STATUS_LABELS.IDENTICAL,
        diff: { person:{}, newAssignments:[], existingAssignments: row.normalized.assignments, missingAssignments:[], principalChanges:[] },
        errors: [],
        warnings: row.warnings || [],
        messages: ['Ligne dupliquée dans le fichier.']
      }));
      return;
    }
    if(nip) seenNips.add(nip);
    const person = existingPersons.get(nip);
    const summary = summarizeLine(row, person, existingAssignments.get(nip) || [], resolved, siteJsp, dateActif);
    lines.push(Object.assign({}, row, summary, { nip: row.nip || nip || (row.normalized && row.normalized.nip) }));
  });
  (population || []).forEach((person) => {
    if(seenNips.has(person.nip)) return;
    lines.push(buildAbsentLine(person, existingAssignments.get(person.nip) || person.affectations || [], resolved, siteJsp, dateActif, dateInactifProposee));
  });
  const counts = summarizeAnalysis(lines);
  const preview = {
    wrote: false,
    status: 'PREVIEW',
    contexte: resolved.code,
    importType: resolved.code,
    contextLabel: resolved.label,
    siteJsp: siteJsp ? siteJsp.code : null,
    siteJspLabel: siteJsp ? siteJsp.label : null,
    populationLabel: ctx.populationLabel(resolved, siteJsp),
    anneeMonitoring: Number(anneeMonitoring) || new Date().getFullYear(),
    dateActif,
    filename: filename || '',
    counts,
    lines
  };
  const sites = [...new Set((preview.lines || []).map((line) => line.normalized && line.normalized.siteJsp).filter(Boolean))];
  if(!preview.siteJsp && sites.length === 1){
    preview.siteJsp = sites[0];
    preview.siteJspLabel = sites[0];
  }
  const planned = planCommitMutations(preview, []);
  preview.needsWrite = Boolean(
    planned.personInserts.length
    || planned.personUpdates.length
    || planned.assignmentInserts.length
    || planned.assignmentClosures.length
  );
  return preview;
}

async function loadJspSites(){
  try{
    const res = await getDb().query(
      `select niveau_code, libelle from scope_cibles where domaine_code='JSP' and coalesce(actif, true) is not false order by niveau_code`
    );
    return ctx.jspSitesFromCibles((res.rows || []).map((row) => ({
      domaine_code: 'JSP',
      niveau_code: row.niveau_code,
      libelle: row.libelle
    })));
  }catch(_error){
    return ctx.JSP_IMPORT_SITES.slice();
  }
}

async function resolveSiteOrThrow(resolved, rawSite){
  if(!resolved.requiresSite) return rawSite ? ctx.normalizeJspSite(rawSite) : null;
  const allowed = await loadJspSites();
  const site = ctx.normalizeJspSite(rawSite, allowed);
  if(!site){
    const error = new Error('Site JSP inconnu ou obligatoire.');
    error.code = 'site_jsp_invalide';
    throw error;
  }
  return site;
}

async function loadExistingForNips(nips){
  if(!nips.length) return { persons:new Map(), assignments:new Map() };
  const personsRes = await getDb().query(`select * from scope_personnes where nip = any($1::text[]) and archived_at is null`, [nips]);
  const persons = new Map((personsRes.rows || []).map(p => [p.nip, p]));
  const ids = [...persons.values()].map(p => p.id);
  const assignments = new Map();
  if(ids.length){
    const affRes = await getDb().query(`select a.*, p.nip from scope_affectations a join scope_personnes p on p.id = a.personne_id where a.personne_id = any($1::text[])`, [ids]);
    (affRes.rows || []).forEach(row => {
      if(!assignments.has(row.nip)) assignments.set(row.nip, []);
      assignments.get(row.nip).push(row);
    });
  }
  return { persons, assignments };
}

function sqlPlaceholderArity(sql){
  let max = 0;
  String(sql).replace(/\$(\d+)/g, (_, n) => {
    max = Math.max(max, Number(n));
    return _;
  });
  return max;
}

function assertSqlBind(sql, params){
  const arity = sqlPlaceholderArity(sql);
  const count = (params || []).length;
  if(arity !== count){
    const error = new Error(`bind message supplies ${count} parameters, but prepared statement requires ${arity}`);
    error.code = 'sql_bind_mismatch';
    throw error;
  }
}

function buildPopulationQuery(resolved, siteJsp){
  const params = [];
  let where = `p.archived_at is null and a.date_inactif is null`;
  if(resolved.family === 'GENERAL'){
    where += ` and a.categorie='OI' and a.domaine in ('DPS','DAP')`;
  } else if(resolved.jspPopulation === 'MONITEURS'){
    where += ` and a.categorie='OI' and a.domaine='JSP'
      and exists (
        select 1 from scope_affectations sdis
        where sdis.personne_id = p.id and sdis.categorie='OI' and sdis.domaine in ('DPS','DAP')
          and sdis.date_inactif is null
      )`;
  } else if(resolved.family === 'JSP'){
    where += ` and a.categorie='OI' and a.domaine='JSP'
      and not exists (
        select 1 from scope_affectations sdis
        where sdis.personne_id = p.id and sdis.categorie='OI' and sdis.domaine in ('DPS','DAP')
          and sdis.date_inactif is null
      )`;
    if(siteJsp && siteJsp.code){
      params.push(siteJsp.code);
      where += ` and a.cible=$${params.length}`;
    }
  } else if(resolved.specialization){
    const spec = resolved.specialization;
    params.push(spec.categorie, spec.domaine, spec.cible);
    where += ` and a.categorie=$1 and a.domaine=$2`;
    if(spec.domaine === 'FOBA'){
      where += ` and (a.cible=$3 or a.cible=('FOBA ' || $3))`;
    } else if(spec.domaine === 'AUTO' && spec.cible === 'PL'){
      where += ` and (a.cible=$3 or a.cible in ('PL', 'cond PL'))`;
    } else {
      where += ` and a.cible=$3`;
    }
  } else {
    return null;
  }
  return {
    sql: `select distinct p.* from scope_affectations a join scope_personnes p on p.id = a.personne_id where ${where}`,
    params
  };
}

async function loadPopulation(resolved, siteJsp){
  const built = buildPopulationQuery(resolved, siteJsp);
  if(!built) return [];
  assertSqlBind(built.sql, built.params);
  const res = await getDb().query(built.sql, built.params);
  return res.rows || [];
}

function defaultDecision(line, decisions){
  const rowId = String(line.lineNumber);
  const found = (decisions || []).find((item) => String(item.rowId) === rowId || (item.nip && item.nip === line.normalized.nip));
  if(found && found.decision) return found;
  if(line.status === 'ABSENT_DU_NOUVEL_IMPORT') return { decision: 'CONSERVER', dateEffet: line.dateEffet };
  if(line.status === 'NEW_PERSON' || line.status === 'NEW_JSP') return { decision: 'CREER' };
  if(line.status === 'MODIFIED') return { decision: 'EXAMINER' };
  if(line.status === 'IDENTICAL') return { decision: 'APPLIQUER' };
  return { decision: 'APPLIQUER' };
}

function requiresExplicitDecision(line){
  return line && line.status === 'MODIFIED'
    && line.diff && line.diff.person
    && (line.diff.person.grade || line.diff.person.nom || line.diff.person.prenom);
}

function unresolvedRequiredDecisions(preview, decisions){
  return (preview.lines || [])
    .filter(requiresExplicitDecision)
    .filter((line) => {
      const decision = String(defaultDecision(line, decisions).decision || '').toUpperCase();
      return !['APPLIQUER', 'MODIFIER_IDENTITE', 'IGNORER', 'CONSERVER'].includes(decision);
    })
    .map((line) => ({
      lineNumber: line.lineNumber,
      nip: line.normalized && line.normalized.nip,
      status: line.status,
      message: 'Décision obligatoire pour divergence d’identité.'
    }));
}

function planCommitMutations(preview, decisions){
  const mutations = {
    personInserts: [],
    personUpdates: [],
    assignmentInserts: [],
    assignmentClosures: [],
    skipped: []
  };
  const seenNips = new Set();
  (preview.lines || []).forEach((line) => {
    const choice = defaultDecision(line, decisions);
    const decision = String(choice.decision || '').toUpperCase();
    if(line.status === 'ERROR' || decision === 'IGNORER' || decision === 'CONSERVER' || decision === 'EXAMINER'){
      mutations.skipped.push({ nip: line.normalized.nip, decision, status: line.status });
      return;
    }
    if(line.status === 'ABSENT_DU_NOUVEL_IMPORT' && (decision === 'CLOTURER' || decision === 'FIN_AFFECTATION' || decision === 'ARCHIVER_SORTI')){
      const dateInactif = choice.dateEffet || choice.dateInactif || line.dateEffet || lastDayOfPreviousYear(preview.anneeMonitoring);
      (line.diff.missingAssignments || line.diff.existingAssignments || []).forEach((assignment) => {
        mutations.assignmentClosures.push({
          nip: line.normalized.nip,
          assignment,
          dateInactif
        });
      });
      return;
    }
    if(line.status === 'ABSENT_DU_NOUVEL_IMPORT'){
      mutations.skipped.push({ nip: line.normalized.nip, decision, status: line.status });
      return;
    }
    const nip = line.normalized.nip;
    if(seenNips.has(nip)) return;
    seenNips.add(nip);
    const created = Boolean(line.diff && line.diff.person && line.diff.person.created);
    const ctxCode = preview.contexte || preview.importType;
    const resolvedCtx = ctx.resolveImportContext(ctxCode);
    if(resolvedCtx.jspPopulation === 'MONITEURS' && created){
      mutations.skipped.push({ nip, decision, status: line.status, reason: 'moniteur_absent_personnel' });
      return;
    }
    if(created && (decision === 'CREER' || decision === 'APPLIQUER')){
      mutations.personInserts.push({
        nip,
        grade: line.normalized.grade || null,
        nom: line.normalized.nom || null,
        prenom: line.normalized.prenom || null
      });
    } else if(line.status === 'MODIFIED' && (decision === 'APPLIQUER' || decision === 'MODIFIER_IDENTITE')){
      if(resolvedCtx.jspPopulation !== 'MONITEURS'){
        mutations.personUpdates.push({
          nip,
          grade: line.normalized.grade || null,
          nom: line.normalized.nom || null,
          prenom: line.normalized.prenom || null
        });
      }
    }
    (line.diff.newAssignments || []).forEach((assignment) => {
      mutations.assignmentInserts.push({
        nip,
        assignment,
        dateActif: choice.dateEffet || preview.dateActif
      });
    });
  });
  return mutations;
}

async function analyzeImport(input = {}){
  await ensureScopeSchema();
  const filename = input.filename || '';
  if(String(filename).toLowerCase().endsWith('.xlsx')) throw new Error('Import XLSX non active dans ce lot sans dependance tableur serveur. Exporter en CSV.');
  const fileText = input.fileText || input.csvText || '';
  const resolved = ctx.resolveImportContext(input.contexte || input.importType || input.context || 'GENERAL');
  const siteJsp = await resolveSiteOrThrow(resolved, input.siteJsp || input.site || input.cibleJsp);
  const anneeMonitoring = Number(input.anneeMonitoring || input.annee || new Date().getFullYear());
  const parsed = normalizeRows(parsePersonnelCsv(fileText), resolved.code, siteJsp);
  const nips = [...new Set(parsed.map(line => line.normalized.nip).filter(Boolean))];
  const existing = input._existing || await loadExistingForNips(nips);
  let population = input._population;
  if(!population){
    const popRows = await loadPopulation(resolved, siteJsp);
    const extraNips = popRows.map((row) => row.nip).filter((nip) => !existing.persons.has(nip));
    if(extraNips.length){
      const extra = await loadExistingForNips(extraNips);
      extra.persons.forEach((person, nip) => existing.persons.set(nip, person));
      extra.assignments.forEach((list, nip) => existing.assignments.set(nip, list));
    }
    const dateActif = monitoringStart(anneeMonitoring);
    population = popRows.filter((person) => {
      const assignments = existing.assignments.get(person.nip) || person.affectations || [];
      return display.countsInImportPopulation(assignments, resolved, dateActif);
    });
  }
  const preview = buildPreview({
    rows: parsed,
    existingPersons: existing.persons,
    existingAssignments: existing.assignments,
    population,
    resolved,
    siteJsp,
    anneeMonitoring,
    filename
  });
  preview.wrote = false;
  return preview;
}

function jsonParam(value){
  return JSON.stringify(value || {});
}

async function commitImport(payload, actorSubject){
  if(typeof payload === 'string'){
    throw new Error('Commit refusé: le preview n’est plus persisté. Renvoyer le fichier et le contexte après validation explicite.');
  }
  const input = payload || {};
  const actor = actorSubject || input.createdBy || '';
  if(input.confirmed === false) throw new Error('Commit refusé: validation explicite requise.');
  const fileText = input.fileText || input.csvText || '';
  if(!fileText) throw new Error('Commit refusé: fichier d’import manquant.');
  const preview = input._preview || await analyzeImport(input);
  if((preview.lines || []).some((line) => line.status === 'ERROR')){
    throw new Error('Import refuse: corriger les lignes en erreur avant commit.');
  }
  const unresolved = unresolvedRequiredDecisions(preview, input.decisions || []);
  if(unresolved.length){
    const first = unresolved[0];
    throw new Error(`Décision obligatoire avant validation pour le NIP ${first.nip || 'inconnu'} (ligne ${first.lineNumber}).`);
  }
  const mutations = input._mutations || planCommitMutations(preview, input.decisions || []);
  const mutationCount = mutations.personInserts.length + mutations.personUpdates.length
    + mutations.assignmentInserts.length + mutations.assignmentClosures.length;
  if(!mutationCount){
    return {
      ok: true,
      wrote: false,
      skipped: true,
      reason: 'no_mutations',
      personsTouched: 0,
      assignmentsCreated: 0,
      closures: 0,
      summary: { mutations: 0, personsTouched: 0, assignmentsCreated: 0, closures: 0 }
    };
  }
  await ensureScopeSchema();
  return getDb().transaction(async client => {
    const batchId = rid();
    const counts = preview.counts || {};
    await client.query(
      `insert into scope_personnel_import_batches(
        id, import_type, contexte, site_jsp, annee_monitoring, filename, status,
        total_lines, total_unique_nips, count_identical, count_new_persons, count_new_jsp,
        count_modified, count_new_assignments, count_existing_assignments, count_missing_assignments,
        count_closures, count_errors, created_by, committed_at
      ) values ($1,$2,$3,$4,$5,$6,'COMMITTED',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())`,
      [
        batchId, preview.importType, preview.contexte, preview.siteJsp, preview.anneeMonitoring, preview.filename,
        counts.totalLines || 0, counts.totalUniqueNips || 0, counts.countIdentical || 0, counts.countNewPersons || 0,
        counts.countNewJsp || 0, counts.countModified || 0, counts.countNewAssignments || 0,
        counts.countExistingAssignments || 0, counts.countMissingAssignments || 0,
        mutations.assignmentClosures.length, counts.countErrors || 0, actor || null
      ]
    );
    for(const line of preview.lines || []){
      await client.query(
        `insert into scope_personnel_import_lines(id, batch_id, line_number, nip, raw_payload, normalized_payload, status, diff_payload, errors_payload)
         values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,$9::jsonb)`,
        [
          rid(), batchId, Number(line.lineNumber) || 0, line.normalized.nip || null,
          jsonParam(line.raw), jsonParam(line.normalized), line.status,
          jsonParam(line.diff || {}), jsonParam(line.errors || [])
        ]
      );
    }
    let personsTouched = 0;
    let assignmentsCreated = 0;
    let closures = 0;
    const personIds = new Map();
    async function personIdFor(nip){
      if(personIds.has(nip)) return personIds.get(nip);
      const found = await client.query(`select * from scope_personnes where nip=$1 for update`, [nip]);
      if(found.rows[0]){
        personIds.set(nip, found.rows[0].id);
        return found.rows[0].id;
      }
      return null;
    }
    for(const row of mutations.personInserts){
      const existing = await personIdFor(row.nip);
      if(existing) continue;
      const id = rid();
      await client.query(
        `insert into scope_personnes(id, nip, grade, nom, prenom) values ($1,$2,$3,$4,$5)`,
        [id, row.nip, row.grade, row.nom, row.prenom]
      );
      personIds.set(row.nip, id);
      personsTouched++;
    }
    for(const row of mutations.personUpdates){
      const id = await personIdFor(row.nip);
      if(!id) continue;
      await client.query(
        `update scope_personnes
         set grade=coalesce($2, grade), nom=coalesce($3, nom), prenom=coalesce($4, prenom), updated_at=now()
         where id=$1`,
        [id, row.grade, row.nom, row.prenom]
      );
      personsTouched++;
    }
    for(const row of mutations.assignmentInserts){
      const id = await personIdFor(row.nip);
      if(!id) continue;
      const a = row.assignment;
      const exists = await client.query(
        `select id from scope_affectations
         where personne_id=$1 and categorie=$2 and domaine=$3 and cible=$4
           and coalesce(role_domaine,'')=coalesce($5,'')
           and date_inactif is null
         limit 1`,
        [id, a.categorie, a.domaine, a.cible, a.role_domaine || null]
      );
      if(exists.rows[0]) continue;
      await client.query(
        `insert into scope_affectations(id, personne_id, categorie, domaine, cible, role_domaine, date_actif, source_import_batch_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [rid(), id, a.categorie, a.domaine, a.cible, a.role_domaine || null, row.dateActif, batchId]
      );
      assignmentsCreated++;
    }
    for(const row of mutations.assignmentClosures){
      const id = await personIdFor(row.nip);
      if(!id) continue;
      const a = row.assignment;
      if(a.id){
        await client.query(
          `update scope_affectations set date_inactif=$2::date, updated_at=now() where id=$1 and date_inactif is null`,
          [a.id, row.dateInactif]
        );
        closures++;
        continue;
      }
      await client.query(
        `update scope_affectations
         set date_inactif=$6::date, updated_at=now()
         where personne_id=$1 and categorie=$2 and domaine=$3 and cible=$4
           and coalesce(role_domaine,'')=coalesce($5,'')
           and date_inactif is null`,
        [id, a.categorie, a.domaine, a.cible, a.role_domaine || null, row.dateInactif]
      );
      closures++;
    }
    return {
      ok: true,
      batchId,
      wrote: true,
      touchedNips: [...new Set([
        ...mutations.personInserts.map((row) => row.nip),
        ...mutations.personUpdates.map((row) => row.nip),
        ...mutations.assignmentInserts.map((row) => row.nip),
        ...mutations.assignmentClosures.map((row) => row.nip)
      ].filter(Boolean))],
      analysedNips: [...new Set((preview.lines || [])
        .map((line) => line.normalized && line.normalized.nip)
        .filter(Boolean))],
      personsTouched,
      assignmentsCreated,
      closures,
      contexte: preview.contexte,
      siteJsp: preview.siteJsp,
      populationLabel: preview.populationLabel,
      summary: {
        mutations: personsTouched + assignmentsCreated + closures,
        personsTouched,
        assignmentsCreated,
        closures
      }
    };
  });
}

function mapPerson(row){
  return {
    id: row.id,
    nip: row.nip,
    grade: row.grade || '',
    nom: row.nom || '',
    prenom: row.prenom || '',
    dateEntreeSdis: row.date_entree_sdis || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAssignment(row){
  return {
    id: row.id,
    personneId: row.personne_id,
    categorie: row.categorie,
    domaine: row.domaine,
    cible: row.cible,
    roleDomaine: row.role_domaine,
    dateActif: temporal.iso(row.date_actif),
    dateInactif: temporal.iso(row.date_inactif) || null,
    sourceImportBatchId: row.source_import_batch_id
  };
}

async function listPersonnel({ q='', domaine='', cible='', statut='', from='', to='', preset='', year='', asOf='', month='', quarter='' } = {}){
  await ensureScopeSchema();
  const asOfDay = temporal.iso(asOf);
  const period = temporal.resolveAnalyzedPeriod({ from, to, preset, year, month, quarter });
  const values = [];
  const where = [];
  if(q){
    values.push(`%${String(q).toLowerCase()}%`);
    where.push(`(lower(p.nip) like $${values.length} or lower(coalesce(p.nom,'')) like $${values.length} or lower(coalesce(p.prenom,'')) like $${values.length} or lower(coalesce(p.grade,'')) like $${values.length})`);
  }
  if(domaine){
    values.push(domaine);
    where.push(`exists (select 1 from scope_affectations a where a.personne_id=p.id and a.domaine=$${values.length})`);
  }
  if(cible){
    values.push(cible);
    where.push(`exists (select 1 from scope_affectations a where a.personne_id=p.id and a.cible=$${values.length})`);
  }
  const res = await getDb().query(`select p.* from scope_personnes p where ${where.length ? where.join(' and ') : 'true'} order by lower(coalesce(p.nom,'')), lower(coalesce(p.prenom,'')), p.nip limit 500`, values);
  const persons = (res.rows || []).map(mapPerson);
  const ids = persons.map(p => p.id);
  let assignments = [];
  let periodes = [];
  if(ids.length){
    const aff = await getDb().query(`select * from scope_affectations where personne_id = any($1::text[]) order by domaine, cible, date_actif`, [ids]);
    assignments = (aff.rows || []).map(mapAssignment);
    try {
      const per = await getDb().query(`select * from scope_personne_periodes where personne_id = any($1::text[]) order by date_debut`, [ids]);
      periodes = per.rows || [];
    } catch (_error) {
      periodes = [];
    }
  }
  const status = String(statut || 'actifs').toLowerCase();
  const decorated = persons.map((person) => {
    const affectations = assignments.filter((a) => a.personneId === person.id);
    const personPeriodes = periodes.filter((row) => row.personne_id === person.id);
    const bundle = Object.assign({}, person, { affectations, periodes: personPeriodes });
    const statutTemporel = temporal.evaluateStatus ? temporal.evaluateStatus(bundle, period, asOfDay) : temporal.temporalStatus(bundle, period);
    const relevantTemporel = asOfDay
      ? (temporal.personRelevantAtDate ? temporal.personRelevantAtDate(bundle, asOfDay) : true)
      : (temporal.personRelevantInPeriod ? temporal.personRelevantInPeriod(bundle, period) : true);
    const window = temporal.activityWindow(bundle, period, asOfDay);
    return Object.assign(bundle, {
      statutTemporel,
      temporalStatus: statutTemporel,
      relevantTemporel,
      dateActif: window.from || '',
      dateInactif: window.to || '',
      period,
      viewMode: asOfDay ? 'asof' : 'period',
      asOf: asOfDay || ''
    });
  });
  const filtered = decorated.filter((person) => {
    if(person.relevantTemporel === false) return false;
    if(status === 'tous' || status === 'all') return true;
    if(status === 'inactifs' || status === 'inactif' || status === 'inactive') return person.statutTemporel === 'inactif';
    if(status === 'archives' || status === 'archived') return person.statutTemporel === 'inactif';
    return person.statutTemporel === 'actif';
  });
  filtered._period = period;
  return filtered;
}

async function appendPersonnelJournal({ auteurId, entite, entiteId, action, avant, apres, commentaire }){
  await getDb().query(
    `insert into scope_journal_metier(journal_id, auteur_id, entite, entite_id, action, avant, apres, commentaire)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`,
    [rid(), auteurId || null, entite, String(entiteId), action, JSON.stringify(avant || null), JSON.stringify(apres || null), commentaire || null]
  );
}

async function getPersonne(id, opts = {}){
  await ensureScopeSchema();
  const person = await getDb().query(`select * from scope_personnes where id=$1`, [id]);
  if(!person.rows[0]) return null;
  const aff = await getDb().query(`select * from scope_affectations where personne_id=$1 order by domaine, cible, date_actif`, [id]);
  let periodes = [];
  let journal = [];
  try {
    const per = await getDb().query(`select * from scope_personne_periodes where personne_id=$1 order by date_debut`, [id]);
    periodes = per.rows || [];
  } catch (_error) { periodes = []; }
  try {
    const jr = await getDb().query(`select * from scope_journal_metier where entite='personne' and entite_id=$1 order by at desc limit 50`, [id]);
    journal = jr.rows || [];
  } catch (_error) { journal = []; }
  const mapped = Object.assign(mapPerson(person.rows[0]), {
    affectations:(aff.rows || []).map(mapAssignment),
    periodes,
    journal
  });
  const period = temporal.resolveAnalyzedPeriod(opts);
  const statutTemporel = temporal.evaluateStatus ? temporal.evaluateStatus(mapped, period, opts.asOf) : temporal.temporalStatus(mapped, period);
  const window = temporal.activityWindow(mapped, period, opts.asOf);
  return Object.assign(mapped, {
    statutTemporel,
    temporalStatus: statutTemporel,
    dateActif: window.from || '',
    dateInactif: window.to || '',
    period
  });
}

async function updatePersonne(id, patch){
  await ensureScopeSchema();
  const dateEntree = clean(patch.dateEntreeSdis || '');
  await getDb().query(`update scope_personnes set date_entree_sdis=$2::date, updated_at=now() where id=$1`, [id, dateEntree || null]);
  return getPersonne(id);
}

async function updateAffectation(id, patch){
  await ensureScopeSchema();
  const actif = clean(patch.dateActif || '');
  const inactif = clean(patch.dateInactif || '');
  await getDb().query(`update scope_affectations set date_actif=coalesce($2::date, date_actif), date_inactif=$3::date, updated_at=now() where id=$1`, [id, actif || null, inactif || null]);
  const res = await getDb().query(`select personne_id from scope_affectations where id=$1`, [id]);
  return res.rows[0] ? getPersonne(res.rows[0].personne_id) : null;
}

async function getPopulationAtDate({ domaine, cible, date, jspRole } = {}){
  await ensureScopeSchema();
  const day = temporal.iso(date);
  if(!day){
    const error = new Error('La date de population est obligatoire.');
    error.statusCode = 400;
    throw error;
  }
  const people = await listPersonnel({ statut: 'actifs', asOf: day });
  return populations.resolvePopulationAtDate(people, { domaine, cible, date: day, jspRole });
}

async function effectifAtDate({ domaine, cible, date }){
  await ensureScopeSchema();
  const d = clean(date) || new Date().toISOString().slice(0, 10);
  const domaineCode = clean(domaine);
  if(domaineCode === 'AUTO'){
    const res = await getDb().query(
      `select a.personne_id, a.categorie, a.domaine, a.cible, a.role_domaine, a.date_actif, a.date_inactif
       from scope_affectations a
       where a.date_actif <= $1 and (a.date_inactif is null or a.date_inactif >= $1)
         and (
           (a.categorie='SPECIALISATION' and a.domaine='AUTO')
           or (a.categorie='OI' and a.domaine='DPS')
         )`,
      [d]
    );
    const counts = computeEffectifsFromAssignments(res.rows || [], d);
    const wanted = clean(cible);
    const rows = Object.keys(counts).filter((key) => key.indexOf('AUTO ') === 0).map((key) => {
      const cibleValue = key.slice(5);
      return { domaine: 'AUTO', cible: cibleValue, count: counts[key] };
    }).filter((row) => !wanted || row.cible === wanted || (wanted === 'PL' && row.cible === 'cond PL') || (wanted === 'VL_DPS' && row.cible === 'VL_DPS'));
    return { date: d, domaine: domaineCode, cible: wanted, rows };
  }
  const params = [d, domaineCode];
  let where = `a.date_actif <= $1 and (a.date_inactif is null or a.date_inactif >= $1) and a.domaine=$2`;
  if(cible){ params.push(clean(cible)); where += ` and a.cible=$${params.length}`; }
  if(domaineCode === 'PR' || domaineCode === 'FOBA'){
    where += ` and a.categorie='SPECIALISATION'`;
  } else {
    where += ` and a.categorie='OI'`;
  }
  const res = await getDb().query(
    `select a.domaine, a.cible, count(distinct a.personne_id)::int as count
     from scope_affectations a where ${where}
     group by a.domaine, a.cible
     order by a.domaine, a.cible`,
    params
  );
  return { date:d, domaine:domaineCode, cible:clean(cible), rows:res.rows || [] };
}

function groupAssignmentsByPerson(assignments){
  const list = assignments || [];
  const hasId = list.some((row) => row && (row.personne_id || row.personneId || row.nip));
  if(!hasId) return [list];
  const groups = new Map();
  list.forEach((row) => {
    const id = row.personne_id || row.personneId || row.nip;
    if(!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  });
  return [...groups.values()];
}

function computeEffectifsFromAssignments(assignments, date){
  const d = clean(date);
  const counts = {};
  groupAssignmentsByPerson(assignments).forEach((personAssignments) => {
    const counted = new Set();
    personAssignments.forEach((a) => {
      if(!display.isAssignmentActiveAt(a, d)) return;
      if(display.isAutoVlDps(a) && !display.countsInVlDpsEffectif(personAssignments, d)) return;
      if(display.isAutoPl(a) && !display.countsInPlEffectif(personAssignments, d)) return;
      const key = [a.domaine, a.cible].filter(Boolean).join(' ');
      if(!key || counted.has(key)) return;
      counted.add(key);
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return counts;
}


async function inactivatePersonne(id, body, actor){
  await ensureScopeSchema();
  const dateEffet = temporal.iso(body && (body.dateInactivite || body.date || body.dateEffet));
  if(!dateEffet){
    const error = new Error('La date d’inactivité est obligatoire.');
    error.statusCode = 400;
    throw error;
  }
  const plan = temporal.planInactivation(dateEffet);
  const existing = await getPersonne(id, { asOf: plan.dernierJourActif });
  if(!existing){
    const error = new Error('Personne introuvable.');
    error.statusCode = 404;
    throw error;
  }
  const closures = temporal.planAssignmentClosures(existing.affectations || [], dateEffet);
  if(!closures.canProceed){
    const error = new Error('Aucune affectation ouverte ne peut être clôturée à cette date d’inactivité. Des affectations commencent après cette date ; elles sont laissées intactes.');
    error.statusCode = 422;
    throw error;
  }
  const toClose = closures.close.concat(closures.sameDay);
  await getDb().transaction(async (tx) => {
    for(const item of toClose){
      const aff = item.assignment;
      await tx.query(`update scope_affectations set date_inactif=$2::date, updated_at=now() where id=$1`, [aff.id, item.dateInactif]);
    }
    const openPeriodes = await tx.query(
      `select * from scope_personne_periodes where personne_id=$1 and date_fin is null and type in ('ACTIF','INDISPONIBLE')`,
      [id]
    );
    for(const row of (openPeriodes.rows || [])){
      const start = temporal.iso(row.date_debut);
      let dateFin = plan.dernierJourActif;
      if(!dateFin || (start && dateFin < start)) dateFin = start;
      await tx.query(`update scope_personne_periodes set date_fin=$2::date, updated_at=now() where periode_id=$1`, [row.periode_id, dateFin]);
    }
    await tx.query(
      `insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
       values ($1,$2,'SORTI',$3::date,null,$4,'MANUEL')`,
      [rid(), id, dateEffet, (body && body.commentaire) || 'Inactivation manuelle']
    );
    await tx.query(
      `insert into scope_journal_metier(journal_id, auteur_id, entite, entite_id, action, avant, apres, commentaire)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`,
      [
        rid(), actor && (actor.sub || actor.id || actor.email) || null,
        'personne', String(id), 'INACTIVER',
        JSON.stringify({ affectations: existing.affectations, statutTemporel: existing.statutTemporel }),
        JSON.stringify({
          dateEffet,
          dernierJourActif: plan.dernierJourActif,
          affectationsCloturees: toClose.map((item) => item.assignment.id),
          affectationsFuturesConservees: closures.future.map((item) => item.assignment.id)
        }),
        (body && body.commentaire) || 'Inactivation manuelle'
      ]
    );
  });
  return getPersonne(id, { asOf: dateEffet });
}

async function correctPersonneInactivation(id, body, actor){
  await ensureScopeSchema();
  const dateEffet = temporal.iso(body && (body.dateInactivite || body.date || body.dateEffet));
  const existing = await getPersonne(id, {});
  if(!existing){
    const error = new Error('Personne introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if(!dateEffet){
    try {
      await getDb().query(
        `update scope_personne_periodes set date_fin=$2::date, updated_at=now()
         where personne_id=$1 and type='SORTI' and date_fin is null`,
        [id, temporal.dayBefore(temporal.iso(body && body.dateReactivation) || new Date().toISOString().slice(0, 10))]
      );
    } catch (_error) {}
    await appendPersonnelJournal({
      auteurId: actor && (actor.sub || actor.id),
      entite: 'personne',
      entiteId: id,
      action: 'REACTIVER',
      avant: { statutTemporel: existing.statutTemporel },
      apres: { dateReactivation: body && body.dateReactivation },
      commentaire: (body && body.commentaire) || 'Réactivation / correction'
    });
    return getPersonne(id, {});
  }
  const plan = temporal.planInactivation(dateEffet);
  await getDb().query(
    `update scope_affectations set date_inactif=$2::date, updated_at=now()
     where personne_id=$1 and date_inactif is not null`,
    [id, plan.dernierJourActif]
  );
  try {
    await getDb().query(
      `update scope_personne_periodes set date_debut=$2::date, updated_at=now()
       where personne_id=$1 and type='SORTI' and date_fin is null`,
      [id, dateEffet]
    );
  } catch (_error) {}
  await appendPersonnelJournal({
    auteurId: actor && (actor.sub || actor.id),
    entite: 'personne',
    entiteId: id,
    action: 'CORRIGER_INACTIVATION',
    avant: { dateInactif: existing.dateInactif },
    apres: { dateEffet, dernierJourActif: plan.dernierJourActif },
    commentaire: (body && body.commentaire) || 'Correction rétroactive'
  });
  return getPersonne(id, {});
}

async function correctAffectationPeriod(affectationId, body, actor){
  await ensureScopeSchema();
  const dateActif = temporal.iso(body && (body.dateActif || body.dateDebut));
  const dateInactif = temporal.iso(body && (body.dateInactif || body.dateFin));
  if(!dateActif){
    const error = new Error('La date d’effet est obligatoire.');
    error.statusCode = 400;
    throw error;
  }
  const current = await getDb().query(`select * from scope_affectations where id=$1`, [affectationId]);
  if(!current.rows[0]){
    const error = new Error('Affectation introuvable.');
    error.statusCode = 404;
    throw error;
  }
  const row = current.rows[0];
  const others = await getDb().query(
    `select * from scope_affectations where personne_id=$1 and id<>$2 and categorie=$3 and domaine=$4 and cible=$5`,
    [row.personne_id, affectationId, row.categorie, row.domaine, row.cible]
  );
  for(const other of (others.rows || [])){
    if(temporal.rangesOverlap(dateActif, dateInactif, other.date_actif, other.date_inactif)){
      const error = new Error('La correction chevauche une autre affectation du même type.');
      error.statusCode = 422;
      throw error;
    }
  }
  await getDb().query(
    `update scope_affectations set date_actif=$2::date, date_inactif=$3::date, updated_at=now() where id=$1`,
    [affectationId, dateActif, dateInactif || null]
  );
  await appendPersonnelJournal({
    auteurId: actor && (actor.sub || actor.id),
    entite: 'affectation',
    entiteId: affectationId,
    action: 'CORRIGER_PERIODE',
    avant: { dateActif: row.date_actif, dateInactif: row.date_inactif },
    apres: { dateActif, dateInactif },
    commentaire: (body && body.commentaire) || 'Correction rétroactive d’affectation'
  });
  return getPersonne(row.personne_id, {});
}

function importTypeLabel(type, extra){
  const raw = String(type || '').toUpperCase();
  try {
    const resolved = ctx.resolveImportContext(raw);
    if(resolved && resolved.label) return resolved.label;
  } catch (_error) {}
  if(raw === 'GENERAL' || raw === 'PERSONNEL_GENERAL') return 'Personnel général';
  if(raw.indexOf('PAPR') >= 0) return 'PAPR';
  if(raw === 'AUTO_PL' || raw.indexOf('PL') >= 0 && raw.indexOf('AUTO') >= 0) return 'cond PL';
  if(raw.indexOf('VL_DPS') >= 0) return 'cond VL — DPS';
  if(raw.indexOf('VL_DAP') >= 0) return 'cond VL — DAP';
  if(raw.indexOf('FOBA_1') >= 0 || raw.indexOf('FOBA 1') >= 0) return 'FOBA 1';
  if(raw.indexOf('FOBA_2') >= 0) return 'FOBA 2';
  if(raw.indexOf('FOBA_3') >= 0) return 'FOBA 3';
  if(raw.indexOf('FOBA') >= 0) return 'FOBA';
  if(raw.indexOf('JSP') >= 0) return extra && extra.site ? ('JSP ' + extra.site) : 'JSP';
  return extra && extra.filename ? String(extra.filename).replace(/\.[^.]+$/, '') : 'Mise à jour Personnel';
}

async function listPersonnelImportHistory(){
  await ensureScopeSchema();
  const res = await getDb().query(`select * from scope_personnel_import_batches order by created_at desc, committed_at desc nulls last limit 100`);
  return (res.rows || []).map((row) => ({
    id: row.id,
    dateImport: row.committed_at || row.created_at,
    dateEffet: row.annee_monitoring ? `${row.annee_monitoring}-01-01` : (row.committed_at || row.created_at),
    type: row.import_type,
    libelle: importTypeLabel(row.import_type || row.contexte, { site: row.site_jsp, filename: row.filename }),
    fichier: row.filename,
    auteur: row.created_by,
    totalLignes: row.total_lines,
    creations: row.count_new_persons,
    modifications: row.count_modified,
    affectations: row.count_new_assignments,
    erreurs: row.count_errors,
    statut: row.status
  }));
}

async function getPersonnelImportBatch(id){
  await ensureScopeSchema();
  const batch = await getDb().query(`select * from scope_personnel_import_batches where id=$1`, [id]);
  if(!batch.rows[0]) return null;
  const lines = await getDb().query(`select * from scope_personnel_import_lines where batch_id=$1 order by line_number limit 500`, [id]);
  const mapped = (await listPersonnelImportHistory()).find((row) => row.id === id);
  return Object.assign({}, mapped, { lignes: lines.rows || [] });
}

async function situationAtDate(date, statut){
  return listPersonnel({ statut: statut || 'tous', asOf: date });
}


module.exports = {
  ensureScopeSchema,
  parsePersonnelCsv,
  normalizeAssignments,
  normalizeRows,
  summarizeLine,
  summarizeAnalysis,
  buildPreview,
  planCommitMutations,
  requiresExplicitDecision,
  unresolvedRequiredDecisions,
  analyzeImport,
  commitImport,
  listPersonnel,
  getPersonne,
  updatePersonne,
  updateAffectation,
  inactivatePersonne,
  correctPersonneInactivation,
  correctAffectationPeriod,
  listPersonnelImportHistory,
  getPersonnelImportBatch,
  situationAtDate,
  getPopulationAtDate,
  addExistingPersonToPopulation: populations.addExistingPersonToPopulation,
  effectifAtDate,
  computeEffectifsFromAssignments,
  evaluateAutoSpecializations: display.evaluateAutoSpecializations,
  isEffectiveCondVlDps: display.isEffectiveCondVlDps,
  countsInVlDpsEffectif: display.countsInVlDpsEffectif,
  specializationForContext,
  assignmentKey,
  buildPopulationQuery,
  sqlPlaceholderArity,
  visibleImportContexts: ctx.visibleImportContexts,
  resolveImportContext: ctx.resolveImportContext,
  IMPORT_CONTEXTS: ctx.IMPORT_CONTEXTS,
  isJspMonitor: ctx.isJspMonitor,
  isJspYouth: ctx.isJspYouth,
  classifyJspRole: ctx.classifyJspRole
};
