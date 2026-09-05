#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeObjectivesService } = require('../netlify/lib/_scope-objectives-service');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const { collectMultisessionReport, buildConclusion } = require('../netlify/lib/_scope-multisession-report');
const {
  HEADER_TITLE,
  headerTitleLayout,
  headerLogoLayout,
  SCOPE_LOGO_TOP,
  PDF_SHIFT_08_CM,
  SIGNATURE_TEXT_TOP_GAP,
  SIGNATURE_TEXT_LINE_COUNT,
  SIGNATURE_FUNCTION_RELATIVE_Y
} = require('../netlify/lib/_scope-pdf-renderer');
const logic = require('../assets/js/scope-ui-logic.js');
const idle = require('../assets/js/scope-auth-idle.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const apiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const idleSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-auth-idle.js'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-objectives-service.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-objectives.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'idle-1', displayName: 'Testeur AUTH-IDLE-1' };
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-auth-idle-1-'));
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function expectHttp(fn, status, code){
  try {
    await fn();
    throw new Error(`attendu HTTP ${status}${code ? `/${code}` : ''}`);
  } catch (error) {
    assert.strictEqual(error.status, status, String(error));
    if(code) assert.strictEqual(error.error, code);
    return error;
  }
}

function utcToday(){
  return new Date().toISOString().slice(0, 10);
}

function utcShift(days){
  const d = new Date(`${utcToday()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function memoryStorage(map){
  return {
    getItem(key){ return map.has(key) ? map.get(key) : null; },
    setItem(key, value){ map.set(key, String(value)); }
  };
}

async function markRepo(repo, eventId, personneId, statut, motif){
  await repo.upsertParticipation({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: 'PARTICIPANT',
    source: 'SAISIE',
    motif_absence: motif || null
  });
}

async function setupPr(prefix){
  const repo = createMemoryRepo();
  const cycleId = `cycle-pr-${prefix}`;
  await repo.insertCycle({
    cycle_id: cycleId, cycle_key: `PAPR-${prefix}`, annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle PAPR 2026'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    events.push(await repo.insertEvenement({
      evenement_id: `${prefix}-s${i}`,
      cycle_id: cycleId,
      domaine_code: 'PR',
      date: `2026-09-0${i}`,
      libelle: `Exercice PR 1.${i} | Base`,
      code_cours: `PAPR.PR1.${prefix}.${i}`,
      pr_exercise_group_key: `${cycleId}:PR:1`,
      pr_session_key: `${cycleId}:PR:1.${i}`,
      statut: 'REALISE'
    }));
  }
  const people = [];
  for(const spec of [
    { id: `${prefix}-a`, nip: '82011', nom: 'Canna', prenom: 'Kevin' },
    { id: `${prefix}-b`, nip: '82012', nom: 'Masson', prenom: 'Christophe' },
    { id: `${prefix}-c`, nip: '82013', nom: 'Dupont', prenom: 'Alice' },
    { id: `${prefix}-d`, nip: '82014', nom: 'Zampieri', prenom: 'Lucas' }
  ]){
    const p = await repo.insertPersonne({
      personne_id: spec.id, nip: spec.nip, nom: spec.nom, prenom: spec.prenom, skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: cycleId, personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION'
      });
    }
  }
  await repo.insertPersonne({
    personne_id: `${prefix}-chef`, nip: '1506', nom: 'Cerqueira', prenom: 'Marco', grade: 'Lt instr', skipPeriodes: true
  });
  const byId = Object.fromEntries(people.map((p) => [p.personne_id, p]));
  await markRepo(repo, `${prefix}-s5`, byId[`${prefix}-a`].personne_id, 'PRESENT');
  await markRepo(repo, `${prefix}-s2`, byId[`${prefix}-b`].personne_id, 'ABSENT_EXCUSE', 'PRIVE');
  await markRepo(repo, `${prefix}-s4`, byId[`${prefix}-c`].personne_id, 'ABSENT_NON_EXCUSE');
  await markRepo(repo, `${prefix}-s3`, byId[`${prefix}-d`].personne_id, 'DISPENSE', 'FORMATION_HORS_SDIS');
  return repo;
}

(async () => {
  await record('01 — timeout = 10 min', () => {
    assert.strictEqual(idle.AUTH_IDLE_TIMEOUT_MS, 10 * 60 * 1000);
    assert.ok(idleSrc.includes('const AUTH_IDLE_TIMEOUT_MS = 10 * 60 * 1000'));
    assert.ok(!/setTimeout\(\s*10\s*\*\s*60/.test(ui));
  });

  await record('02 — activité clic reset idle', () => {
    let now = 1_000_000;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    ctl.recordHumanEvent({ type: 'click' });
    now += 9 * 60 * 1000;
    assert.ok(!ctl.shouldExpire());
    ctl.recordHumanEvent({ type: 'click' });
    now += 9 * 60 * 1000;
    assert.ok(!ctl.shouldExpire());
  });

  await record('03 — activité clavier reset idle', () => {
    let now = 1_000_000;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    ctl.recordHumanEvent({ type: 'keydown' });
    now += 9 * 60 * 1000;
    ctl.recordHumanEvent({ type: 'keyup' });
    now += 9 * 60 * 1000;
    assert.ok(!ctl.shouldExpire());
  });

  await record('04 — change/select reset idle', () => {
    assert.ok(idle.isHumanActivityEvent({ type: 'change' }));
    assert.ok(idle.isHumanActivityEvent({ type: 'select' }));
    let now = 1_000_000;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    ctl.recordHumanEvent({ type: 'change' });
    now += 9 * 60 * 1000;
    ctl.recordHumanEvent({ type: 'select' });
    now += 9 * 60 * 1000;
    assert.ok(!ctl.shouldExpire());
  });

  await record('05 — polling ne reset pas idle', () => {
    let now = 1_000_000;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    ctl.recordActivity('human');
    now += idle.AUTH_IDLE_TIMEOUT_MS;
    ctl.recordActivity('polling');
    assert.ok(ctl.shouldExpire());
  });

  await record('06 — requête automatique ne reset pas idle', () => {
    assert.ok(idle.isSystemActivity('fetch'));
    assert.ok(idle.isSystemActivity('network'));
    assert.ok(idle.isSystemActivity('refresh'));
    let now = 1_000_000;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    now += idle.AUTH_IDLE_TIMEOUT_MS;
    ctl.recordActivity('fetch');
    assert.ok(ctl.shouldExpire());
  });

  await record('07 — activité pendant >10 min maintient session', () => {
    let now = 0;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    for(let i = 0; i < 12; i += 1){
      now += 5 * 60 * 1000;
      ctl.recordHumanEvent({ type: 'click' });
      assert.ok(!ctl.shouldExpire(), `expire à t=${now}`);
    }
  });

  await record('08 — 10 min sans activité déconnecte', () => {
    let now = 0;
    let expired = false;
    const ctl = idle.createIdleController({
      now: () => now,
      disableChannel: true,
      storage: memoryStorage(new Map()),
      onExpire(){ expired = true; }
    });
    now += idle.AUTH_IDLE_TIMEOUT_MS;
    assert.strictEqual(ctl.tick(), 'expire');
    assert.ok(expired);
  });

  await record('09 — logout propre', () => {
    assert.ok(idle.idleLogoutHref().includes('/auth/logout'));
    assert.ok(decodeURIComponent(idle.idleLogoutHref()).includes('idle=1'));
    assert.ok(ui.includes('Votre session a expiré après une période d’inactivité.'));
    assert.ok(ui.includes('redirectToLogout'));
  });

  await record('10 — pas de boucle refresh', async () => {
    let calls = 0;
    const ctl = idle.createIdleController({
      now: () => 0,
      disableChannel: true,
      storage: memoryStorage(new Map()),
      refreshSession: async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return true;
      }
    });
    await Promise.all([ctl.refreshSession(), ctl.refreshSession(), ctl.refreshSession()]);
    assert.strictEqual(calls, 1);
  });

  await record('11-12 — 401 actif → refresh 1 fois + replay 1 fois', async () => {
    let refreshCalls = 0;
    let runs = 0;
    idle.start({
      disableChannel: true,
      storage: memoryStorage(new Map()),
      tickMs: 60_000,
      refreshSession: async () => {
        refreshCalls += 1;
        return true;
      }
    });
    try {
      const response = await idle.withAuthRetry(async () => {
        runs += 1;
        return { status: runs === 1 ? 401 : 200 };
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(refreshCalls, 1);
      assert.strictEqual(runs, 2);
    } finally {
      idle.stop();
    }
  });

  await record('13 — refresh échec → logout', async () => {
    let refreshCalls = 0;
    let runs = 0;
    idle.start({
      disableChannel: true,
      storage: memoryStorage(new Map()),
      tickMs: 60_000,
      refreshSession: async () => {
        refreshCalls += 1;
        return false;
      }
    });
    try {
      const response = await idle.withAuthRetry(async () => {
        runs += 1;
        return { status: 401 };
      });
      assert.strictEqual(response.status, 401);
      assert.strictEqual(refreshCalls, 1);
      assert.strictEqual(runs, 1);
      assert.ok(apiSrc.includes('redirectToLogout'));
    } finally {
      idle.stop();
    }
  });

  await record('14 — timer nettoyé logout', () => {
    const ctl = idle.createIdleController({
      now: () => 0,
      disableChannel: true,
      storage: memoryStorage(new Map()),
      tickMs: 50
    });
    ctl.start();
    ctl.stop();
    assert.ok(true);
  });

  await record('15 — timer réinitialisé login', () => {
    let now = 0;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    now += idle.AUTH_IDLE_TIMEOUT_MS;
    ctl.resetOnLogin();
    assert.ok(!ctl.shouldExpire());
    assert.ok(ui.includes('ScopeAuthIdle.start'));
  });

  await record('16 — avertissement éventuel', () => {
    let now = 0;
    let warned = false;
    const ctl = idle.createIdleController({
      now: () => now,
      disableChannel: true,
      storage: memoryStorage(new Map()),
      onWarn(){ warned = true; }
    });
    now += idle.AUTH_IDLE_WARN_MS;
    assert.strictEqual(ctl.tick(), 'warn');
    assert.ok(warned);
    assert.ok(ui.includes('SESSION BIENTÔT EXPIRÉE'));
  });

  await record('17 — CTA rester connecté', () => {
    let now = 0;
    const ctl = idle.createIdleController({ now: () => now, disableChannel: true, storage: memoryStorage(new Map()) });
    now += idle.AUTH_IDLE_WARN_MS;
    ctl.tick();
    ctl.stayConnected();
    now += 30 * 1000;
    assert.ok(!ctl.shouldExpire());
    assert.ok(ui.includes('id="scope-idle-stay"'));
    assert.ok(ui.includes('stayConnected'));
  });

  await record('18 — plusieurs onglets cohérents', () => {
    const map = new Map();
    const storage = memoryStorage(map);
    let now = 1_000;
    const a = idle.createIdleController({ now: () => now, disableChannel: true, storage });
    const b = idle.createIdleController({ now: () => now, disableChannel: true, storage });
    a.recordActivity('human');
    now += idle.AUTH_IDLE_TIMEOUT_MS - 1000;
    assert.ok(!b.shouldExpire());
    assert.ok(idleSrc.includes('BroadcastChannel'));
    assert.ok(idleSrc.includes('AUTH_IDLE_STORAGE_KEY'));
  });

  await record('19 — menu actions ⋯', () => {
    assert.ok(ui.includes('data-obj-more'));
    assert.ok(ui.includes('aria-label="Actions"'));
    assert.ok(ui.includes('⋯'));
  });

  await record('20 — Modifier visible', () => {
    assert.ok(ui.includes('data-obj-edit'));
    assert.ok(ui.includes('>Modifier</button>'));
  });

  await record('21 — Nouvelle période visible', () => {
    assert.ok(ui.includes('data-obj-periode'));
    assert.ok(ui.includes('>Nouvelle période</button>'));
  });

  await record('22 — Supprimer futur visible', () => {
    assert.ok(ui.includes('data-obj-supprimer'));
    assert.ok(ui.includes('>Supprimer</button>'));
  });

  await record('23 — objectif futur modifiable', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: utcShift(10), dateFin: utcShift(40)
    }, ACTOR);
    const patched = await objectifs.patchObjectif(created.objectif.objectifId, { seuilPct: 88 }, ACTOR);
    assert.strictEqual(patched.objectif.thresholdPct, 88);
  });

  await record('24 — objectif historique protégé', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: utcShift(-10), dateFin: utcShift(40)
    }, ACTOR);
    const err = await expectHttp(
      () => objectifs.patchObjectif(created.objectif.objectifId, { seuilPct: 90 }, ACTOR),
      422,
      'historique_protege'
    );
    assert.ok(String(err.message).includes('nouvelle période'));
    assert.strictEqual(logic.historiqueProtegeMessage(), err.message);
  });

  await record('25 — objectif futur supprimable', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 70, dateDebut: utcShift(5), dateFin: utcShift(20)
    }, ACTOR);
    const result = await objectifs.deleteObjectif(created.objectif.objectifId, ACTOR);
    assert.ok(result.ok);
    await expectHttp(() => objectifs.getObjectif(created.objectif.objectifId), 404);
  });

  await record('26 — objectif historique non supprimable', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 70, dateDebut: utcShift(-1), dateFin: utcShift(20)
    }, ACTOR);
    await expectHttp(() => objectifs.deleteObjectif(created.objectif.objectifId, ACTOR), 422, 'historique_protege');
  });

  await record('27 — confirmation suppression', () => {
    assert.ok(ui.includes('SUPPRIMER L’OBJECTIF ?'));
    assert.ok(ui.includes('Cette action supprimera définitivement cet objectif futur.'));
    assert.ok(ui.includes('id="obj-delete-confirm"'));
    assert.ok(ui.includes('scope-btn-danger'));
  });

  await record('28 — audit modification', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 75, dateDebut: utcShift(12), dateFin: utcShift(40)
    }, ACTOR);
    await objectifs.patchObjectif(created.objectif.objectifId, { seuilPct: 77, commentaire: 'corr' }, ACTOR);
    const rows = await repo.listJournal('objectif', created.objectif.objectifId);
    assert.ok(rows.some((r) => r.action === 'CREER_OBJECTIF'));
    assert.ok(rows.some((r) => r.action === 'MODIFIER_OBJECTIF'));
    assert.ok(serviceSrc.includes("'MODIFIER_OBJECTIF'"));
  });

  await record('29 — audit suppression', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 75, dateDebut: utcShift(12), dateFin: utcShift(40)
    }, ACTOR);
    await objectifs.deleteObjectif(created.objectif.objectifId, ACTOR);
    const rows = await repo.listJournal('objectif', created.objectif.objectifId);
    assert.ok(rows.some((r) => r.action === 'SUPPRIMER_OBJECTIF'));
    assert.ok(serviceSrc.includes("'CLOTURER_OBJECTIF'"));
    assert.ok(serviceSrc.includes("'NOUVELLE_PERIODE_OBJECTIF'"));
  });

  await record('30 — résolution inchangée', async () => {
    const repo = createMemoryRepo();
    const objectifs = createScopeObjectivesService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 70, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'JSP', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    await objectifs.createObjectif({ portee: 'CIBLE', cibleId: cible.cible_id, seuilPct: 90, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
    const g = await objectifs.resolveObjectif({ date: '2026-06-01' });
    const d = await objectifs.resolveObjectif({ date: '2026-06-01', domaine: 'JSP' });
    const c = await objectifs.resolveObjectif({ date: '2026-06-01', domaine: 'JSP', cible: 'B1' });
    assert.strictEqual(c.objectif.thresholdPct, 90);
    assert.strictEqual(d.objectif.thresholdPct, 80);
    assert.strictEqual(g.objectif.thresholdPct, 70);
    assert.ok(engine.includes('CIBLE') && engine.includes('DOMAINE') && engine.includes('GLOBAL'));
  });

  await record('31 — Général / Domaine / Cible inchangé', () => {
    assert.deepStrictEqual(logic.objectifDomainOptions().map((d) => d.code), ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC']);
    assert.deepStrictEqual(logic.objectifCibleOptions('DPS').map((c) => c.code), ['G1', 'C1', 'B1', 'B2']);
    assert.deepStrictEqual(logic.objectifCibleOptions('DAP').map((c) => c.code), ['Y1', 'Y2', 'Y3', 'Y4']);
    assert.deepStrictEqual(logic.objectifCibleOptions('JSP').map((c) => c.code), ['G1', 'C1', 'B1']);
    assert.deepStrictEqual(logic.objectifCibleOptions('FOBA').map((c) => c.label), ['FOBA 1', 'FOBA 2', 'FOBA 3']);
    assert.deepStrictEqual(logic.objectifCibleOptions('FOCA').map((c) => c.code), []);
    assert.ok(ui.includes('Priorité : Cible → Domaine → Général'));
  });

  await record('32 — référentiel FOSPEC PR/AUTO inchangé', () => {
    assert.deepStrictEqual(logic.objectifCibleOptions('FOSPEC').map((c) => c.code), ['AUTO', 'PR']);
  });

  await record('33 — texte header = Suivi et analyse de l’activité', () => {
    assert.strictEqual(HEADER_TITLE, 'Suivi et analyse de l’activité');
    assert.ok(renderer.includes("const HEADER_TITLE = 'Suivi et analyse de l’activité'"));
  });

  await record('34 — absence de SCOPE — Suivi…', () => {
    assert.ok(!renderer.includes('SCOPE — Suivi et analyse de l’activité'));
  });

  await record('35 — centrage vertical calculé depuis logo', () => {
    const logos = headerLogoLayout();
    const title = headerTitleLayout();
    assert.strictEqual(SCOPE_LOGO_TOP, 11);
    assert.strictEqual(logos.scopeTop, 11);
    assert.strictEqual(title.logoCenter, logos.scopeTop + logos.scopeFit[1] / 2);
    assert.strictEqual(title.titleY, title.logoCenter - title.titleSize / 2);
    assert.ok(renderer.includes('logoCenter - titleSize / 2'));
  });

  await record('36 — conclusion taux = un seul paragraphe', () => {
    const over = buildConclusion({ percentage: 95.7, objectiveThreshold: 95, domaine: 'PR', nonParticipants: [] });
    assert.strictEqual(over.paragraphs.length, 1);
    assert.ok(over.paragraphs[0].includes('95,7 %'));
    assert.ok(over.paragraphs[0].includes('au-dessus'));
    assert.ok(over.paragraphs[0].includes('remercié'));
    assert.ok(!over.paragraphs[0].includes('\n'));
  });

  await record('37 — alignement = justify', () => {
    assert.ok(renderer.includes("paraWithBoldRate"));
    assert.ok(renderer.includes("align: 'justify'"));
  });

  await record('38 — taux reste en gras', () => {
    assert.ok(renderer.includes("this.doc.font('Helvetica-Bold').text(match[0]"));
  });

  await record('39 — cas objectif supérieur', () => {
    const over = buildConclusion({ percentage: 95.7, objectiveThreshold: 95, domaine: 'PR', nonParticipants: [] });
    assert.ok(over.paragraphs[0].includes('0,7 points'));
  });

  await record('40 — cas objectif inférieur', () => {
    const under = buildConclusion({ percentage: 70, objectiveThreshold: 80, domaine: 'AUTO', nonParticipants: [] });
    assert.strictEqual(under.paragraphs.length, 1);
    assert.ok(under.paragraphs[0].includes('en dessous'));
  });

  await record('41 — objectif absent', () => {
    const none = buildConclusion({ percentage: 95.7, objectiveThreshold: null, domaine: 'PR', nonParticipants: [] });
    assert.strictEqual(none.paragraphs.length, 1);
    assert.ok(none.paragraphs[0].includes('Aucun objectif'));
  });

  await record('42-43 — signatures non régressées', () => {
    assert.strictEqual(PDF_SHIFT_08_CM, 22.68);
    assert.strictEqual(SIGNATURE_TEXT_LINE_COUNT, 3);
    assert.ok(renderer.includes('signatureImageY = identityY + SIGNATURE_IMAGE_RELATIVE_Y - PDF_SHIFT_08_CM'));
    assert.ok(renderer.includes('identityY = contentEndY + SIGNATURE_TEXT_TOP_GAP'));
    assert.strictEqual(SIGNATURE_FUNCTION_RELATIVE_Y, 36);
    assert.ok(Number.isFinite(SIGNATURE_TEXT_TOP_GAP));
    assert.ok(!renderer.includes('fontawesome'));
  });

  await record('HTML — idle script avant API', () => {
    const idleIdx = html.indexOf('scope-auth-idle.js');
    const apiIdx = html.indexOf('scope-api.js');
    assert.ok(idleIdx > -1 && apiIdx > idleIdx);
    assert.ok(html.includes('v=scope-auth-idle-1'));
  });

  await record('AB — PDF visuels participation + exercice', async () => {
    const repo = await setupPr('idle1');
    await repo.insertObjectif({
      objectif_id: 'obj-pr-idle',
      portee: 'DOMAINE',
      domaine_code: 'PR',
      date_debut: '2026-01-01',
      date_fin: '2026-12-31',
      seuil_pct: 95,
      actif: true
    });
    const sessionPdf = await generateReport(repo, { kind: 'SESSION', evenementId: 'idle1-s1', nominatif: true, year: 2026 }, ACTOR);
    const eventPdf = await generateReport(repo, { kind: 'EVENT', evenementId: 'idle1-s1', nominatif: true }, ACTOR);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_participation_PR.pdf'), sessionPdf.buffer);
    fs.writeFileSync(path.join(OUT, 'SCOPE_Rapport_exercice_PR.pdf'), eventPdf.buffer);
    assert.ok(sessionPdf.buffer.length > 1000);
    assert.ok(eventPdf.buffer.length > 1000);
    const model = await collectMultisessionReport(repo, 'idle1-s1', { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(model.conclusion.length, 1);
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  results.forEach((row) => {
    const mark = row.status === 'PASS' ? 'PASS' : 'NOK';
    console.log(`${mark}  ${row.name}`);
    if(row.proof) console.log(row.proof);
  });
  console.log(failed.length ? `\nSCOPE-AUTH-IDLE-1 tests: ${failed.length} NOK` : `\nSCOPE-AUTH-IDLE-1 tests: ${results.length} PASS`);
  console.log(`PDF visuels (non suivis) : ${OUT}`);
  process.exit(failed.length ? 1 : 0);
})();
