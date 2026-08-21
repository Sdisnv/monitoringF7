const db = require('./_postgres');

function rid(){
  return (global.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clean(value){ return String(value || '').trim(); }
function normalizeNip(value){ return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, ''); }
function monitoringStart(year){ return `${Number(year) || new Date().getFullYear()}-01-01`; }

async function ensureScopeSchema(){
  await db.ensureCoreSchema();
  await db.query(`create table if not exists scope_personnes (
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
  await db.query(`create table if not exists scope_personnel_import_batches (
    id text primary key,
    import_type text not null,
    contexte text,
    annee_monitoring integer not null,
    filename text,
    status text not null,
    total_lines integer not null default 0,
    total_unique_nips integer not null default 0,
    count_identical integer not null default 0,
    count_new_persons integer not null default 0,
    count_modified integer not null default 0,
    count_new_assignments integer not null default 0,
    count_missing_assignments integer not null default 0,
    count_errors integer not null default 0,
    created_by text,
    created_at timestamptz not null default now(),
    committed_at timestamptz
  )`);
  await db.query(`create table if not exists scope_affectations (
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
  await db.query(`create table if not exists scope_personnel_import_lines (
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
  await db.query(`create index if not exists idx_scope_personnes_nip on scope_personnes (nip)`);
  await db.query(`create index if not exists idx_scope_affectations_personne on scope_affectations (personne_id)`);
  await db.query(`create index if not exists idx_scope_affectations_scope on scope_affectations (domaine, cible, role_domaine, date_actif, date_inactif)`);
  await db.query(`create index if not exists idx_scope_import_lines_batch on scope_personnel_import_lines (batch_id, line_number)`);
  await db.query(`insert into monitoring_f7_schema_migrations(version) values ('scope-personnel-1b') on conflict (version) do nothing`);
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
  if(m) return { categorie:'OI', domaine:'DPS', cible:m[1] };
  m = upper.match(/^DAP\s+(Y1|Y2|Y3|Y4)\b/);
  if(m) return { categorie:'OI', domaine:'DAP', cible:m[1] };
  m = upper.match(/^JSP\s+(G1|C1|B1)\b/);
  if(m) return { categorie:'OI', domaine:'JSP', cible:`JSP ${m[1]}` };
  return null;
}

function specializationForContext(contexte){
  const ctx = clean(contexte).toUpperCase();
  if(ctx === 'PR') return { categorie:'SPECIALISATION', domaine:'PR', cible:'PR', role_domaine:null };
  if(ctx === 'AUTO_VL' || ctx === 'COND VL' || ctx === 'AUTO COND VL') return { categorie:'SPECIALISATION', domaine:'AUTO', cible:'cond VL', role_domaine:null };
  if(ctx === 'AUTO_PL' || ctx === 'COND PL' || ctx === 'AUTO COND PL') return { categorie:'SPECIALISATION', domaine:'AUTO', cible:'cond PL', role_domaine:null };
  return null;
}

function normalizeAssignments(rawOrgans, contexte){
  const assignments = [];
  const principalSeen = new Set();
  String(rawOrgans || '').split(',').map(clean).filter(Boolean).forEach(token => {
    const parsed = normalizeOiToken(token);
    if(!parsed) {
      assignments.push({ error:`OI inconnu: ${token}`, raw:token });
      return;
    }
    const principal = !principalSeen.has(parsed.domaine);
    principalSeen.add(parsed.domaine);
    assignments.push(Object.assign(parsed, { role_domaine: principal ? 'PRINCIPAL' : 'SECONDAIRE' }));
  });
  const spec = specializationForContext(contexte);
  if(spec) assignments.push(spec);
  return assignments;
}

function assignmentKey(a){ return `${a.categorie}|${a.domaine}|${a.cible}|${a.role_domaine || ''}`; }

function normalizeRows(rows, contexte){
  const seen = new Map();
  return rows.map(row => {
    const errors = [];
    const nip = normalizeNip(row.nip);
    if(!nip) errors.push('NIP vide.');
    const assignments = normalizeAssignments(row.organes, contexte);
    const validAssignments = assignments.filter(a => !a.error);
    assignments.filter(a => a.error).forEach(a => errors.push(a.error));
    const normalized = {
      nip,
      grade: clean(row.grade),
      prenom: clean(row.prenom),
      nom: clean(row.nom),
      assignments: validAssignments
    };
    if(nip){
      const prev = seen.get(nip);
      if(prev && (prev.grade !== normalized.grade || prev.prenom !== normalized.prenom || prev.nom !== normalized.nom)){
        errors.push('Doublon NIP contradictoire dans le fichier.');
      }
      if(!prev) seen.set(nip, normalized);
    }
    return { lineNumber: row.lineNumber, raw: row, normalized, errors };
  });
}

function summarizeLine(normalizedLine, existingPerson, existingAssignments){
  const errors = normalizedLine.errors || [];
  if(errors.length) return { status:'ERROR', diff:{}, errors };
  const n = normalizedLine.normalized;
  const diff = { person:{}, newAssignments:[], missingAssignments:[], principalChanges:[] };
  let modified = false;
  if(!existingPerson) {
    diff.person.created = true;
  } else {
    ['grade','nom','prenom'].forEach(key => {
      if(clean(existingPerson[key]) !== clean(n[key])) {
        diff.person[key] = { before: clean(existingPerson[key]), after: clean(n[key]) };
        modified = true;
      }
    });
  }
  const existingActive = (existingAssignments || []).filter(a => !a.date_inactif);
  const existingKeys = new Set(existingActive.map(assignmentKey));
  const incomingKeys = new Set(n.assignments.map(assignmentKey));
  n.assignments.forEach(a => { if(!existingKeys.has(assignmentKey(a))) diff.newAssignments.push(a); });
  existingActive.forEach(a => {
    if(incomingKeys.has(assignmentKey(a))) return;
    if(n.assignments.some(next => next.categorie === a.categorie && next.domaine === a.domaine)) diff.missingAssignments.push(a);
  });
  n.assignments.forEach(a => {
    if(a.role_domaine !== 'PRINCIPAL') return;
    const prevPrincipal = existingActive.find(old => old.categorie === 'OI' && old.domaine === a.domaine && old.role_domaine === 'PRINCIPAL');
    if(prevPrincipal && prevPrincipal.cible !== a.cible) diff.principalChanges.push({ domaine:a.domaine, before:prevPrincipal.cible, after:a.cible });
  });
  if(!existingPerson) return { status:'NEW_PERSON', diff, errors:[] };
  if(modified) return { status:'MODIFIED', diff, errors:[] };
  if(diff.newAssignments.length) return { status:'NEW_ASSIGNMENT', diff, errors:[] };
  if(diff.missingAssignments.length || diff.principalChanges.length) return { status:'MISSING_ASSIGNMENT', diff, errors:[] };
  return { status:'IDENTICAL', diff, errors:[] };
}

function summarizeAnalysis(lines){
  const uniqueNips = new Set(lines.map(l => l.normalized?.nip).filter(Boolean));
  const counts = {
    totalLines: lines.length,
    totalUniqueNips: uniqueNips.size,
    countIdentical: 0,
    countNewPersons: 0,
    countModified: 0,
    countNewAssignments: 0,
    countMissingAssignments: 0,
    countErrors: 0
  };
  lines.forEach(line => {
    if(line.status === 'IDENTICAL') counts.countIdentical++;
    if(line.status === 'NEW_PERSON') counts.countNewPersons++;
    if(line.status === 'MODIFIED') counts.countModified++;
    if(line.status === 'NEW_ASSIGNMENT') counts.countNewAssignments++;
    if(line.status === 'MISSING_ASSIGNMENT') counts.countMissingAssignments++;
    if(line.status === 'ERROR') counts.countErrors++;
  });
  return counts;
}

async function loadExistingForNips(nips){
  if(!nips.length) return { persons:new Map(), assignments:new Map() };
  const personsRes = await db.query(`select * from scope_personnes where nip = any($1::text[]) and archived_at is null`, [nips]);
  const persons = new Map((personsRes.rows || []).map(p => [p.nip, p]));
  const ids = [...persons.values()].map(p => p.id);
  const assignments = new Map();
  if(ids.length){
    const affRes = await db.query(`select a.*, p.nip from scope_affectations a join scope_personnes p on p.id = a.personne_id where a.personne_id = any($1::text[])`, [ids]);
    (affRes.rows || []).forEach(row => {
      if(!assignments.has(row.nip)) assignments.set(row.nip, []);
      assignments.get(row.nip).push(row);
    });
  }
  return { persons, assignments };
}

async function analyzeImport({ fileText, filename='', importType='OI', contexte='OI', anneeMonitoring, createdBy='' }){
  await ensureScopeSchema();
  if(String(filename || '').toLowerCase().endsWith('.xlsx')) throw new Error('Import XLSX non active dans ce lot sans dependance tableur serveur. Exporter en CSV.');
  const normalized = normalizeRows(parsePersonnelCsv(fileText), contexte);
  const nips = [...new Set(normalized.map(l => l.normalized.nip).filter(Boolean))];
  const existing = await loadExistingForNips(nips);
  const lines = normalized.map(line => {
    const person = existing.persons.get(line.normalized.nip);
    const summary = summarizeLine(line, person, existing.assignments.get(line.normalized.nip) || []);
    return Object.assign({}, line, summary);
  });
  const counts = summarizeAnalysis(lines);
  const batchId = rid();
  await db.transaction(async client => {
    await client.query(`insert into scope_personnel_import_batches(id, import_type, contexte, annee_monitoring, filename, status, total_lines, total_unique_nips, count_identical, count_new_persons, count_modified, count_new_assignments, count_missing_assignments, count_errors, created_by)
      values ($1,$2,$3,$4,$5,'PREVIEW',$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [batchId, importType, contexte, Number(anneeMonitoring) || new Date().getFullYear(), filename, counts.totalLines, counts.totalUniqueNips, counts.countIdentical, counts.countNewPersons, counts.countModified, counts.countNewAssignments, counts.countMissingAssignments, counts.countErrors, createdBy || null]);
    for(const line of lines){
      await client.query(`insert into scope_personnel_import_lines(id, batch_id, line_number, nip, raw_payload, normalized_payload, status, diff_payload, errors_payload)
        values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,$9::jsonb)`,
        [rid(), batchId, line.lineNumber, line.normalized.nip || null, JSON.stringify(line.raw), JSON.stringify(line.normalized), line.status, JSON.stringify(line.diff || {}), JSON.stringify(line.errors || [])]);
    }
  });
  return { batchId, status:'PREVIEW', counts, lines };
}

async function commitImport(batchId, actorSubject=''){
  await ensureScopeSchema();
  return db.transaction(async client => {
    const batchRes = await client.query(`select * from scope_personnel_import_batches where id=$1 for update`, [batchId]);
    const batch = batchRes.rows[0];
    if(!batch) throw new Error('Batch import introuvable.');
    if(batch.status !== 'PREVIEW') throw new Error(`Batch non commitable: ${batch.status}`);
    const lineRes = await client.query(`select * from scope_personnel_import_lines where batch_id=$1 order by line_number asc`, [batchId]);
    if((lineRes.rows || []).some(line => line.status === 'ERROR')) throw new Error('Import refuse: corriger les lignes en erreur avant commit.');
    let personsTouched = 0;
    let assignmentsCreated = 0;
    for(const line of lineRes.rows || []){
      const n = line.normalized_payload;
      let personRes = await client.query(`select * from scope_personnes where nip=$1 for update`, [n.nip]);
      let person = personRes.rows[0];
      if(!person){
        person = { id:rid() };
        await client.query(`insert into scope_personnes(id, nip, grade, nom, prenom) values ($1,$2,$3,$4,$5)`, [person.id, n.nip, n.grade || null, n.nom || null, n.prenom || null]);
        personsTouched++;
      } else {
        await client.query(`update scope_personnes set grade=coalesce($2, grade), nom=coalesce($3, nom), prenom=coalesce($4, prenom), updated_at=now() where id=$1`, [person.id, n.grade || null, n.nom || null, n.prenom || null]);
        personsTouched++;
      }
      for(const a of n.assignments || []){
        const exists = await client.query(`select id from scope_affectations where personne_id=$1 and categorie=$2 and domaine=$3 and cible=$4 and coalesce(role_domaine,'')=coalesce($5,'') and date_actif=$6 and date_inactif is null limit 1`,
          [person.id, a.categorie, a.domaine, a.cible, a.role_domaine || null, monitoringStart(batch.annee_monitoring)]);
        if(exists.rows[0]) continue;
        await client.query(`insert into scope_affectations(id, personne_id, categorie, domaine, cible, role_domaine, date_actif, source_import_batch_id)
          values ($1,$2,$3,$4,$5,$6,$7,$8)`, [rid(), person.id, a.categorie, a.domaine, a.cible, a.role_domaine || null, monitoringStart(batch.annee_monitoring), batchId]);
        assignmentsCreated++;
      }
    }
    await client.query(`update scope_personnel_import_batches set status='COMMITTED', committed_at=now(), created_by=coalesce(created_by,$2) where id=$1`, [batchId, actorSubject || null]);
    return { ok:true, batchId, personsTouched, assignmentsCreated };
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
    dateActif: row.date_actif,
    dateInactif: row.date_inactif,
    sourceImportBatchId: row.source_import_batch_id
  };
}

async function listPersonnel({ q='', domaine='', cible='' } = {}){
  await ensureScopeSchema();
  const values = [];
  const where = [`p.archived_at is null`];
  if(q){
    values.push(`%${String(q).toLowerCase()}%`);
    where.push(`(lower(p.nip) like $${values.length} or lower(coalesce(p.nom,'')) like $${values.length} or lower(coalesce(p.prenom,'')) like $${values.length} or lower(coalesce(p.grade,'')) like $${values.length})`);
  }
  if(domaine){
    values.push(domaine);
    where.push(`exists (select 1 from scope_affectations a where a.personne_id=p.id and a.domaine=$${values.length} and (a.date_inactif is null or a.date_inactif >= current_date))`);
  }
  if(cible){
    values.push(cible);
    where.push(`exists (select 1 from scope_affectations a where a.personne_id=p.id and a.cible=$${values.length} and (a.date_inactif is null or a.date_inactif >= current_date))`);
  }
  const res = await db.query(`select p.* from scope_personnes p where ${where.join(' and ')} order by lower(coalesce(p.nom,'')), lower(coalesce(p.prenom,'')), p.nip limit 500`, values);
  const persons = (res.rows || []).map(mapPerson);
  const ids = persons.map(p => p.id);
  let assignments = [];
  if(ids.length){
    const aff = await db.query(`select * from scope_affectations where personne_id = any($1::text[]) order by domaine, cible, date_actif`, [ids]);
    assignments = (aff.rows || []).map(mapAssignment);
  }
  return persons.map(person => Object.assign(person, { affectations: assignments.filter(a => a.personneId === person.id) }));
}

async function getPersonne(id){
  await ensureScopeSchema();
  const person = await db.query(`select * from scope_personnes where id=$1 and archived_at is null`, [id]);
  if(!person.rows[0]) return null;
  const aff = await db.query(`select * from scope_affectations where personne_id=$1 order by domaine, cible, date_actif`, [id]);
  return Object.assign(mapPerson(person.rows[0]), { affectations:(aff.rows || []).map(mapAssignment) });
}

async function updatePersonne(id, patch){
  await ensureScopeSchema();
  const dateEntree = clean(patch.dateEntreeSdis || '');
  await db.query(`update scope_personnes set date_entree_sdis=$2::date, updated_at=now() where id=$1`, [id, dateEntree || null]);
  return getPersonne(id);
}

async function updateAffectation(id, patch){
  await ensureScopeSchema();
  const actif = clean(patch.dateActif || '');
  const inactif = clean(patch.dateInactif || '');
  await db.query(`update scope_affectations set date_actif=coalesce($2::date, date_actif), date_inactif=$3::date, updated_at=now() where id=$1`, [id, actif || null, inactif || null]);
  const res = await db.query(`select personne_id from scope_affectations where id=$1`, [id]);
  return res.rows[0] ? getPersonne(res.rows[0].personne_id) : null;
}

async function effectifAtDate({ domaine, cible, date }){
  await ensureScopeSchema();
  const d = clean(date) || new Date().toISOString().slice(0, 10);
  const params = [d, clean(domaine)];
  let where = `a.date_actif <= $1 and (a.date_inactif is null or a.date_inactif >= $1) and a.domaine=$2`;
  if(cible){ params.push(clean(cible)); where += ` and a.cible=$${params.length}`; }
  where += clean(domaine) === 'PR' || clean(domaine) === 'AUTO'
    ? ` and a.categorie='SPECIALISATION'`
    : ` and a.categorie='OI' and a.role_domaine='PRINCIPAL'`;
  const res = await db.query(`select a.domaine, a.cible, count(distinct a.personne_id)::int as count from scope_affectations a where ${where} group by a.domaine, a.cible order by a.domaine, a.cible`, params);
  return { date:d, domaine:clean(domaine), cible:clean(cible), rows:res.rows || [] };
}

function computeEffectifsFromAssignments(assignments, date){
  const d = clean(date);
  const counts = {};
  (assignments || []).forEach(a => {
    if(a.date_actif > d) return;
    if(a.date_inactif && a.date_inactif < d) return;
    if(a.categorie === 'OI' && a.role_domaine !== 'PRINCIPAL') return;
    const key = `${a.domaine} ${a.cible}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

module.exports = {
  ensureScopeSchema,
  parsePersonnelCsv,
  normalizeAssignments,
  normalizeRows,
  summarizeLine,
  summarizeAnalysis,
  analyzeImport,
  commitImport,
  listPersonnel,
  getPersonne,
  updatePersonne,
  updateAffectation,
  effectifAtDate,
  computeEffectifsFromAssignments
};
