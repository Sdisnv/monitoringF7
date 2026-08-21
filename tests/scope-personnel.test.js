const assert = require('assert');
const svc = require('../netlify/functions/_scope-personnel-service');

function person(overrides = {}){
  return Object.assign({ id:'p1', nip:'TEST001', grade:'Sgt', nom:'TEST', prenom:'Marc', date_entree_sdis:'2020-02-03' }, overrides);
}

function aff(overrides){
  return Object.assign({ categorie:'OI', domaine:'DPS', cible:'B1', role_domaine:'PRINCIPAL', date_actif:'2026-01-01', date_inactif:null }, overrides || {});
}

function run(){
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

  console.log('scope-personnel tests ok');
}

run();
