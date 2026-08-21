const assert = require('assert');
const fs = require('fs');
const path = require('path');
const svc = require('../netlify/functions/_scope-personnel-service');

const ROOT = path.join(__dirname, '..');

function person(overrides = {}){
  return Object.assign({ id:'p1', nip:'TEST001', grade:'Sgt', nom:'TEST', prenom:'Marc', date_entree_sdis:'2020-02-03' }, overrides);
}

function aff(overrides){
  return Object.assign({ categorie:'OI', domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL', date_actif:'2026-01-01', date_inactif:null }, overrides || {});
}

async function run(){
  const csv = `NIP;Grade;Prénom;Nom;Organe(s) d'intervention
TEST001;Sgt;Marc;TEST;DPS B1 - Yvonand, DPS G1 - Yverdon-les-Bains, DAP Y2 - Belmont-sur-Yverdon, JSP B1 - Yvonand`;
  const normalized = svc.normalizeRows(svc.parsePersonnelCsv(csv), 'PR')[0].normalized;
  assert.strictEqual(normalized.nip, 'TEST001');
  assert.strictEqual(normalized.assignments.length, 5);
  assert.deepStrictEqual(normalized.assignments.map(a => `${a.domaine}/${a.cible}/${a.role_domaine || ''}`), [
    'DPS/B1/PRINCIPAL',
    'DPS/G1/SECONDAIRE',
    'DAP/Y2/PRINCIPAL',
    'JSP/JSP B1/PRINCIPAL',
    'PR/PR/'
  ]);

  const identical = svc.summarizeLine({ normalized, errors:[] }, person(), [
    aff({ domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'DPS', cible:'G1', role_domaine:'SECONDAIRE' }),
    aff({ domaine:'DAP', cible:'Y2', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'JSP', cible:'JSP B1', role_domaine:'PRINCIPAL' }),
    aff({ categorie:'SPECIALISATION', domaine:'PR', cible:'PR', role_domaine:null })
  ]);
  assert.strictEqual(identical.status, 'IDENTICAL');

  const gradeChanged = svc.summarizeLine({ normalized:Object.assign({}, normalized, { grade:'Adj' }), errors:[] }, person(), []);
  assert.strictEqual(gradeChanged.status, 'MODIFIED');
  assert.strictEqual(gradeChanged.diff.person.grade.before, 'Sgt');
  assert.strictEqual(gradeChanged.diff.person.grade.after, 'Adj');

  const newPr = svc.summarizeLine({ normalized, errors:[] }, null, []);
  assert.strictEqual(newPr.status, 'NEW_PERSON');

  const duplicate = svc.normalizeRows(svc.parsePersonnelCsv(`NIP;Grade;Prénom;Nom;Organe(s) d'intervention
12345;Cpl;Marc;DUPONT;DPS B1
12345;Sgt;Marc;DUPONT;DPS B1`), 'OI');
  assert.ok(duplicate[1].errors.includes('Doublon NIP contradictoire dans le fichier.'));

  const badNip = svc.normalizeRows(svc.parsePersonnelCsv(`NIP;Grade;Prénom;Nom;Organe(s) d'intervention
;Cpl;Marc;DUPONT;DPS B1`), 'OI')[0];
  assert.ok(badNip.errors.includes('NIP vide.'));

  const unknownOi = svc.normalizeRows(svc.parsePersonnelCsv(`NIP;Grade;Prénom;Nom;Organe(s) d'intervention
12345;Cpl;Marc;DUPONT;XYZ B9`), 'OI')[0];
  assert.ok(unknownOi.errors.some(error => error.includes('OI inconnu')));

  const missing = svc.summarizeLine({ normalized:Object.assign({}, normalized, { assignments:[aff({ domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL' })] }), errors:[] }, person(), [
    aff({ domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'DPS', cible:'G1', role_domaine:'SECONDAIRE' })
  ]);
  assert.strictEqual(missing.status, 'MISSING_ASSIGNMENT');
  assert.strictEqual(missing.diff.missingAssignments.length, 1);

  const changedPrincipal = svc.summarizeLine({ normalized:Object.assign({}, normalized, { assignments:[aff({ domaine:'DPS', cible:'G1', role_domaine:'PRINCIPAL' })] }), errors:[] }, person(), [
    aff({ domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL' })
  ]);
  assert.strictEqual(changedPrincipal.diff.principalChanges[0].before, 'B1');
  assert.strictEqual(changedPrincipal.diff.principalChanges[0].after, 'G1');

  const countsMarch = svc.computeEffectifsFromAssignments([
    aff({ domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'DPS', cible:'G1', role_domaine:'SECONDAIRE' }),
    aff({ domaine:'DAP', cible:'Y2', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'JSP', cible:'JSP B1', role_domaine:'PRINCIPAL' }),
    aff({ categorie:'SPECIALISATION', domaine:'PR', cible:'PR', role_domaine:null })
  ], '2026-03-15');
  assert.strictEqual(countsMarch['DPS B1'], 1);
  assert.strictEqual(countsMarch['DPS G1'] || 0, 0);
  assert.strictEqual(countsMarch['DAP Y2'], 1);
  assert.strictEqual(countsMarch['JSP JSP B1'], 1);
  assert.strictEqual(countsMarch['PR PR'], 1);

  const countsJune = svc.computeEffectifsFromAssignments([
    aff({ domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'DAP', cible:'Y2', role_domaine:'PRINCIPAL' }),
    aff({ domaine:'JSP', cible:'JSP B1', role_domaine:'PRINCIPAL' }),
    aff({ categorie:'SPECIALISATION', domaine:'PR', cible:'PR', role_domaine:null, date_inactif:'2026-05-31' })
  ], '2026-06-01');
  assert.strictEqual(countsJune['DPS B1'], 1);
  assert.strictEqual(countsJune['DAP Y2'], 1);
  assert.strictEqual(countsJune['JSP JSP B1'], 1);
  assert.strictEqual(countsJune['PR PR'] || 0, 0);

  const personnelService = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-personnel-service.js'), 'utf8');
  const pgRepo = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pg.js'), 'utf8');
  const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
  const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const migration = fs.readFileSync(path.join(ROOT, 'database/migrations/20260821_scope_db_convergence_1.sql'), 'utf8');

  assert.ok(!/scope_personnes\s*\([^)]*\bpersonne_id\b/i.test(personnelService));
  assert.ok(!/from\s+scope_personnes[\s\S]{0,120}\bpersonne_id\b/i.test(personnelService));
  assert.ok(!/scope_affectations\s*\([^)]*\baffectation_id\b/i.test(personnelService));
  assert.ok(!/scope_affectations\s*\([^)]*\bdate_debut\b/i.test(personnelService));
  assert.ok(!/scope_affectations\s*\([^)]*\bdate_fin\b/i.test(personnelService));
  assert.ok(personnelService.includes('date_entree_sdis'));
  assert.ok(personnelService.includes('date_actif'));
  assert.ok(personnelService.includes('date_inactif'));
  assert.ok(personnelService.includes('nip text not null unique'));
  assert.ok(personnelService.includes('role_domaine'));

  assert.ok(pgRepo.includes('date_entree_sdis as date_entree'));
  assert.ok(pgRepo.includes('a.date_actif as date_debut'));
  assert.ok(pgRepo.includes('a.date_inactif as date_fin'));
  assert.ok(pgRepo.includes('where id = $1'));
  assert.ok(!/scope_personnes\s+where\s+personne_id/i.test(pgRepo));
  assert.ok(!/insert\s+into\s+scope_personnes\s*\([^)]*\bpersonne_id\b/i.test(pgRepo));
  assert.ok(!/insert\s+into\s+scope_affectations\s*\([^)]*\baffectation_id\b/i.test(pgRepo));
  assert.ok(!/insert\s+into\s+scope_affectations\s*\([^)]*\bdate_debut\b/i.test(pgRepo));
  assert.ok(!/update\s+scope_affectations[\s\S]{0,180}\bdate_fin\s*=/i.test(pgRepo));

  assert.ok(api.includes('scope-personnel-list'));
  assert.ok(api.includes('scope-personnel-detail'));
  assert.ok(api.includes('scope-personnel-import-analyze'));
  assert.ok(api.includes('scope-personnel-import-commit'));
  assert.ok(api.includes('scope-personnel-effectif-at-date'));
  assert.ok(!/listPersonnelDirectory\(params\)\s*\{\s*return request\('GET', `\/personnel/.test(api));
  assert.ok(ui.includes('normalizePersonnelDirectory'));
  assert.ok(ui.includes('dateEntreeSdis'));

  assert.ok(!/create\s+table\s+if\s+not\s+exists\s+scope_personnes\b/i.test(migration));
  assert.ok(!/create\s+table\s+if\s+not\s+exists\s+scope_affectations\b/i.test(migration));
  assert.ok(!/\b(drop|truncate|delete)\b/i.test(migration));
  assert.ok(migration.includes('create table if not exists scope_evenements'));
  assert.ok(migration.includes('personne_id text not null references scope_personnes(id)'));
  assert.ok(migration.includes('create index if not exists'));

  const postgresPath = require.resolve('../netlify/functions/_postgres');
  const schemaPath = require.resolve('../netlify/functions/_scope-schema');
  const originalPostgres = require.cache[postgresPath];
  const originalSchema = require.cache[schemaPath];
  const capturedSql = [];
  require.cache[postgresPath] = {
    id: postgresPath,
    filename: postgresPath,
    loaded: true,
    exports: {
      ensureCoreSchema: async () => {},
      query: async (sql) => {
        capturedSql.push(String(sql));
        if (String(sql).includes('information_schema.columns')) return { rows: [] };
        return { rows: [] };
      }
    }
  };
  delete require.cache[schemaPath];
  try {
    const { ensureScopeSchema } = require('../netlify/functions/_scope-schema');
    await ensureScopeSchema();
  } finally {
    if (originalSchema) require.cache[schemaPath] = originalSchema;
    else delete require.cache[schemaPath];
    if (originalPostgres) require.cache[postgresPath] = originalPostgres;
    else delete require.cache[postgresPath];
  }
  const bootstrapAffectationSql = capturedSql
    .filter((sql) => /\bscope_affectations\b/i.test(sql))
    .join('\n');
  assert.ok(!/\baffectation_id\b/i.test(bootstrapAffectationSql));
  assert.ok(!/\bcible_id\b/i.test(bootstrapAffectationSql));
  assert.ok(!/\bdate_debut\b/i.test(bootstrapAffectationSql));
  assert.ok(!/\bdate_fin\b/i.test(bootstrapAffectationSql));
  assert.ok(bootstrapAffectationSql.includes('date_actif'));
  assert.ok(bootstrapAffectationSql.includes('date_inactif'));
  const bootstrapSousDomainesSql = capturedSql
    .filter((sql) => /\bscope_sous_domaines\b/i.test(sql))
    .join('\n');
  assert.ok(bootstrapSousDomainesSql.includes('domaine_code'));
  assert.ok(!/\bdomaine_parent\b/i.test(bootstrapSousDomainesSql));

  console.log('scope-personnel tests ok');
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
