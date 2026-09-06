const fs = require('fs');
const assert = require('assert');
const logic = require('../assets/js/scope-ui-logic.js');

const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');

function extractFunction(name){
  const marker = `function ${name}`;
  const start = ui.indexOf(marker);
  assert.ok(start >= 0, `${name} introuvable`);
  const brace = ui.indexOf('{', start);
  let depth = 0;
  for(let i = brace; i < ui.length; i += 1){
    if(ui[i] === '{') depth += 1;
    if(ui[i] === '}') depth -= 1;
    if(depth === 0) return ui.slice(start, i + 1);
  }
  throw new Error(`${name} incomplet`);
}

const buildPresenceSavePayload = logic.buildPresenceSavePayload;

function payload(rows, ids){
  return buildPresenceSavePayload(rows, new Set(ids));
}

{
  const rows = [
    { personneId: 'A', inclus: true, alreadyCountedInSession: false, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }
  ];
  const before = payload(rows, []);
  const after = payload(rows, ['A']);
  assert.deepStrictEqual(before, [{
    personneId: 'A',
    statut: 'NON_RENSEIGNE',
    role: 'PARTICIPANT',
    motif_absence: null,
    commentaire: null
  }]);
  assert.deepStrictEqual(after, []);
}

{
  const rows = [
    { personneId: 'A', inclus: true, alreadyCountedInSession: false, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' },
    { personneId: 'B', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'PARTICIPANT' }
  ];
  assert.deepStrictEqual(payload(rows, ['A']).map((row) => row.personneId), ['B']);
  assert.strictEqual(payload(rows, ['A'])[0].statut, 'PRESENT');
}

for(const role of ['FORMATEUR', 'SURVEILLANT', 'MONITEUR', 'AUXILIAIRE']){
  const rows = [
    { personneId: 'A', inclus: true, alreadyCountedInSession: false, statut: role === 'AUXILIAIRE' ? 'NON_CONCERNE' : 'PRESENT', role }
  ];
  assert.deepStrictEqual(payload(rows, ['A']), [], `${role} ne doit pas être envoyé par Enregistrer Présences`);
}

{
  const rows = [
    { personneId: 'A', inclus: true, alreadyCountedInSession: true, statut: 'PRESENT', role: 'PARTICIPANT' },
    { personneId: 'B', inclus: false, alreadyCountedInSession: false, statut: 'PRESENT', role: 'PARTICIPANT' }
  ];
  assert.deepStrictEqual(payload(rows, []).map((row) => row.personneId), []);
}

const refresh = extractFunction('refreshFichePreservingSaisie');
assert.ok(refresh.indexOf('buildSaisieFromFiche()') < refresh.indexOf('mergeEditableSaisieState(snapshot)'), 'la fiche serveur doit reconstruire state.saisie avant fusion locale');

const merge = extractFunction('mergeEditableSaisieState');
assert.ok(merge.includes('encadrementIds.has(String(row.personneId))'), 'les lignes encadrement doivent rester serveur');
assert.ok(!/role\s*:\s*prior\.role/.test(merge), 'la fusion ne doit jamais réinjecter role depuis le snapshot stale');

const save = extractFunction('persistParticipations');
assert.ok(save.includes('usedEncadrementIds()'), 'persistParticipations doit consulter les encadrants courants');
assert.ok(save.includes('buildPresenceSavePayload(state.saisie, encadrementIds)'), 'persistParticipations doit utiliser le builder filtrant');
assert.ok(extractFunction('buildPresenceSavePayload').includes('L.buildPresenceSavePayload'), 'UI doit déléguer le payload à la logique unique');

console.log('PASS — SCOPE-PAPR-ENCADREMENT-STATE-FIX-2 frontend payload');
