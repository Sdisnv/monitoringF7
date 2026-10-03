'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const cta = require('../netlify/lib/_scope-cta-rules');
const L = require('../assets/js/scope-ui-logic');
const { createFixture, installLocalHandler } = require('./scope-qv-local-fixture');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');
let passed = 0;
async function test(name, fn) { await fn(); console.log(`PASS ${++passed} - ${name}`); }

async function main() {
  await test('CTA ancrage 13 fevrier 2026 puis cycle perpetuel canonique', () => {
    assert.deepEqual(cta.assignmentsForFriday('2026-02-13').map((x) => x.halfSection), ['N05a', 'N01a', 'N01a', 'N01a']);
    assert.deepEqual(cta.assignmentsForFriday('2027-01-01').map((x) => x.halfSection), ['N04b', 'N03a', 'N03a', 'N03a']);
    assert.deepEqual(['2027-01-08', '2027-01-15', '2027-01-22', '2027-01-29'].map((d) => cta.assignmentsForFriday(d)[1].halfSection), ['N02a', 'N01a', 'N03b', 'N02b']);
  });
  await test('janvier fevrier decembre 2028 et continuite decembre 2027', () => {
    const year = cta.generateYear(2028);
    for (const month of ['01', '02', '12']) assert.ok(year.rows.some((r) => r.startsAt.startsWith(`2028-${month}`)));
    const carry = year.rows.find((r) => r.id === 'CTA-PERM-2027-12-31');
    assert.deepEqual(carry.ctaAssignments.map((r) => r.halfSection), cta.assignmentsForFriday('2027-12-31').map((r) => r.halfSection));
    assert.deepEqual(cta.assignmentsForFriday('2028-01-07').map((r) => r.halfSection), ['N01b', 'N01b', 'N01b', 'N01b']);
    assert.equal(year.holidayEvidence.length, 9);
    assert.equal(cta.vaudHolidays(2028).find((r) => r.label === 'Vendredi saint').date, '2028-04-14');
  });
  const fixture = createFixture();
  const qv = await fixture.service.listProgramme(2027);
  // 829 = 622 − 3 (périodicité) + 38 clones OI + 108 projections − 4 DAP 5
  //       + 52 conduites DPS + 16 conduites DAP.
  await test('829 seances 817 dates 637 historiques 12 sans date et TP9000 preserves', () => {
    const rows = qv.canonicalProgramme.rows.filter((r) => !r.external);
    assert.equal(rows.length, 829);
    assert.equal(rows.filter((r) => r.provenance === 'MOA_RULE_CONDUITE_2027').length, 52);
    assert.equal(rows.filter((r) => r.startsAt).length, 817);
    assert.equal(rows.filter((r) => r.historicalProposal).length, 637);
    assert.equal(rows.filter((r) => !r.startsAt).length, 12);
    const tp = rows.filter((r) => r.tp9000Rule);
    assert.equal(tp.length, 30);
    tp.forEach((r) => { assert.deepEqual(r.ois, ['G1']); assert.deepEqual(r.publics, ['AUTO:2']); });
  });
  const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
  const extract = (name) => ui.slice(ui.indexOf(`  function ${name}(`), ui.indexOf('\n  function ', ui.indexOf(`  function ${name}(`) + 1));
  const context = { L, qvActivities: () => [], qvDateKey: (v) => String(v || '').slice(0, 10), qvProgrammeDate: (r) => String(r.startsAt || '').slice(0, 10), qvCalendarKind: L.qvCalendarKind, qvMonthLabel: (m) => String(m) };
  vm.createContext(context);
  vm.runInContext(['qvCalendarIndex', 'qvProgrammeProposedMonthKey', 'qvBuildMonth', 'qvYearMonths'].map(extract).join('\n'), context);
  await test('grilles calculees 12 mois par an et 12 restes sans periode', () => {
    for (const year of [2026, 2027, 2028]) assert.equal(context.qvYearMonths(qv, year).length, 12);
    for (const month of [1, 2, 12]) assert.ok(context.qvBuildMonth(qv, 2028, month).cells.some((c) => c && c.items.length));
    const undated = qv.canonicalProgramme.rows.filter((r) => !r.external && !r.startsAt);
    assert.equal(undated.filter((r) => context.qvProgrammeProposedMonthKey(r)).length, 0);
    assert.equal(undated.filter((r) => !context.qvProgrammeProposedMonthKey(r)).length, 12);
  });
  await test('navigation annee isolee et references hors Programme', () => {
    for (const year of [2026, 2027, 2028]) assert.equal(L.parseHash(`#/quo-vadis/agenda-annuel?annee=${year}`).qvAnnee, year);
    const render = extract('renderQuoVadisAgendaAnnuel');
    assert.equal((render.match(/class="qv-year-grid"/g) || []).length, 1);
    assert.match(extract('qvRenderMiniMonth'), /month.year === 2027/);
    assert.match(extract('qvAgendaReference'), /Historique et références/);
    assert.match(extract('qvAgendaReference'), /#\/exercices\//);
  });
  process.env.MONITORING_F7_AUTH_SECRET = 'local-qv-final-1-tests-only-secret-2026';
  const handler = installLocalHandler(fixture);
  const { signToken } = require('../netlify/lib/_auth-utils');
  const id = programme.rows.find((r) => r.historicalProposal && r.definitionId !== 'CTA-PERMANENCE').id;
  fixture.published.publication_unit_id = id;
  const originalPublished = JSON.stringify(fixture.published);
  const payload = { date: '2027-02-04', startTime: '19:00', endTime: '21:30', oiCodes: ['G1'], publicCodes: ['ECH:I'], responsableFonctionCode: 'Chef OP', salleTheorieId: null };
  const call = async (role, body) => handler({ httpMethod: 'PATCH', path: `/api/scope/quo-vadis/programme-items/${encodeURIComponent(id)}`, headers: { authorization: `Bearer ${signToken({ typ: 'access', sub: 'local', roles: [role] }, 3600)}` }, body: JSON.stringify(body) });
  await test('meme route RBAC gestionnaire: lieu canonique puis Autre lieu', async () => {
    for (const location of [{ lieuId: 'caserne-g1', lieuLibre: '' }, { lieuId: null, lieuLibre: 'Place du marche Yverdon' }]) {
      const response = await call('GESTIONNAIRE', { ...payload, ...location });
      assert.equal(response.statusCode, 200, response.body);
      const row = JSON.parse(response.body).quoVadis.canonicalProgramme.rows.find((r) => r.id === id);
      assert.equal(row.location, location.lieuLibre || 'Caserne G1');
    }
    assert.equal(JSON.stringify(fixture.published), originalPublished);
    assert.ok(!fixture.queries.some((q) => /(?:update|insert into) scope_evenements/.test(q.sql)));
  });
  await test('profil sans references:manage bloque avant persistance', async () => {
    const count = fixture.queries.length;
    const response = await call('UTILISATEUR', { ...payload, lieuLibre: 'Interdit' });
    assert.equal(response.statusCode, 403);
    assert.equal(fixture.queries.length, count);
  });
  await test('calcul 2028 protege et conserve le programme en preparation', async () => {
    const post=(role,path)=>handler({httpMethod:'POST',path,headers:{authorization:`Bearer ${signToken({typ:'access',sub:'local',roles:[role]},3600)}`},body:'{}'});
    const count=fixture.queries.length;
    const denied=await post('UTILISATEUR','/api/scope/quo-vadis/programmes/2028/generate');
    assert.equal(denied.statusCode,403);
    assert.equal(fixture.queries.length,count);
    const allowed=await post('GESTIONNAIRE','/api/scope/quo-vadis/programmes/2028/generate');
    assert.equal(allowed.statusCode,200,allowed.body);
    const result=JSON.parse(allowed.body).quoVadis;
    assert.equal(result.programme.annee,2028);
    assert.equal(result.programme.statut,'PREPARATION');
  });
  await test('persistance locale relue par une nouvelle instance du vrai service', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qv-final-'));
    const file = path.join(dir, 'preparations.json');
    await createFixture(file).service.updateProgrammePreparation(id, { ...payload, lieuId: null, lieuLibre: 'Place du marche Yverdon' });
    const reloaded = await createFixture(file).service.listProgramme(2027);
    assert.equal(reloaded.canonicalProgramme.rows.find((r) => r.id === id).lieuLibre, 'Place du marche Yverdon');
    fs.rmSync(dir, { recursive: true });
  });
  console.log(`QV-AGENDA-PROGRAMME-UX-FINAL-1: ${passed}/${passed} PASS`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
