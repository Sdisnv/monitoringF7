#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

(async () => {
  const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
  const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');

  await record('drawer dynamique présent, sidebar permanente retirée', async () => {
    assert.ok(ui.includes('scope-sidebar'));
    assert.ok(ui.includes('aria-label="Navigation principale"'));
    assert.ok(!ui.includes('scope-nav-inner'));
    assert.ok(!ui.includes('const navButtons'));
    assert.ok(!ui.includes('id="scope-header-menu"'));
    assert.ok(css.includes('.scope-sidebar'));
    assert.ok(css.includes('position: fixed'));
    assert.ok(css.includes('scope-nav-backdrop'));
    assert.ok(css.includes('translateX(-105%)'));
    assert.ok(!css.includes('grid-template-columns: var(--scope-sidebar)'));
  });

  await record('navigation domaines depuis le référentiel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    const arbre = logic.normalizeNavArbre(refs.arbre, refs.domaines, refs.cibles);
    const nav = logic.buildSidebarNav(arbre, { screen: 'vue', nav: 'vue' });
    const codes = nav.domains.map((d) => d.id);
    assert.ok(codes.includes('FOBA'));
    assert.ok(codes.includes('FOCA'));
    assert.ok(codes.includes('DPS'));
    assert.ok(codes.includes('DAP'));
    assert.ok(codes.includes('FOSPEC'));
    assert.ok(codes.includes('JSP'));
    assert.ok(!codes.includes('PR'));
    assert.ok(!codes.includes('AUTO'));
  });

  await record('FOSPEC → Protection respiratoire / AUTO', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    const nav = logic.buildSidebarNav(refs.arbre, { screen: 'vue', domaine: 'FOSPEC' });
    const fospec = nav.domains.find((d) => d.id === 'FOSPEC');
    assert.ok(fospec);
    assert.ok(fospec.expanded);
    const labels = fospec.children.map((c) => c.label);
    assert.ok(labels.includes('Protection respiratoire'));
    assert.ok(labels.includes('AUTO'));
    assert.ok(fospec.children.some((c) => c.id === 'PR' && c.href === '#/vue/PR'));
    assert.ok(fospec.children.some((c) => c.id === 'AUTO' && c.href === '#/vue/AUTO'));
  });

  await record('navigation OI DPS / DAP sans cibles globales', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = await service.referentiels();
    const nav = logic.buildSidebarNav(refs.arbre, { screen: 'vue', domaine: 'DAP', cible: 'Y4' });
    const dap = nav.domains.find((d) => d.id === 'DAP');
    const dps = nav.domains.find((d) => d.id === 'DPS');
    assert.deepStrictEqual(dap.children.map((c) => c.label), ['Y1', 'Y2', 'Y3', 'Y4']);
    assert.deepStrictEqual(dps.children.map((c) => c.label).sort(), ['B1', 'B2', 'C1', 'G1']);
    const allChildren = nav.domains.reduce((n, d) => n + d.children.length, 0);
    assert.ok(allChildren < 25);
    assert.ok(dap.expanded);
  });

  await record('sélecteurs période hors header', async () => {
    assert.ok(ui.includes("periodSelect('scope-preset'"));
    assert.ok(ui.includes("periodSelect('scope-year'"));
    assert.ok(ui.includes('scope-period-context'));
    assert.ok(ui.includes('scope-select-control'));
    assert.ok(css.includes('.scope-select'));
    assert.ok(css.includes('.scope-period-context'));
    assert.ok(!css.includes("url(\"data:image/svg+xml"));
  });

  await record('logo SCOPE taille validée + logo SDIS officiel', async () => {
    assert.ok(ui.includes('assets/img/logo-scope-blanc.png'));
    assert.ok(ui.includes('class="scope-logo"'));
    assert.match(css, /height:\s*83px/);
    assert.ok(css.includes('object-fit: contain'));
    assert.ok(ui.includes('assets/img/LogoSDISseulnoir.png'));
    assert.ok(ui.includes('SDIS régional du Nord vaudois'));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/LogoSDISseulnoir.png')));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/logo-scope-blanc.png')));
  });

  await record('dashboard sans calcul de taux frontend + ALERTS-1', async () => {
    assert.ok(!ui.includes('computeTaux'));
    assert.ok(!ui.includes('officialFromQuantitatif'));
    assert.ok(ui.includes('client.dashboard'));
    assert.ok(ui.includes('À traiter'));
    assert.ok(ui.includes('dash.alerts'));
    assert.ok(ui.includes('scope-dash-split'));
    assert.ok(css.includes('.scope-dash-split'));
  });

  await record('graphique hauteur maîtrisée et palette métier', async () => {
    const empty = logic.participationChartLayout([], []);
    const legacy = logic.participationChartLayout([], [{ date: '2026-03-17', tauxLegacy: 80 }]);
    const sparse = logic.participationChartLayout([{ month: '2026-03', percentage: 80 }], []);
    const full = logic.participationChartLayout([
      { month: '2026-01', percentage: 80 },
      { month: '2026-02', percentage: 82 },
      { month: '2026-03', percentage: 84 }
    ], []);
    assert.strictEqual(empty.mode, 'empty');
    assert.ok(empty.height < sparse.height);
    assert.ok(legacy.height < full.height);
    assert.ok(full.height <= 188);
    const svg = logic.participationChartSvg(
      [{ month: '2026-01', percentage: 80, thresholdPct: 85 }, { month: '2026-02', percentage: 90, thresholdPct: 85 }],
      [{ date: '2026-01-15', tauxLegacy: 70 }]
    );
    assert.ok(svg.includes('#171C8F'));
    assert.ok(svg.includes('#FFA300'));
    assert.ok(svg.includes('#54585A'));
    assert.ok(css.includes('max-height: 188px'));
    assert.ok(logicSrc.includes("officiel: '#171C8F'"));
  });

  await record('responsive structure 1200 / 1024 / 768', async () => {
    assert.ok(css.includes('--scope-max: 1340px'));
    assert.ok(css.includes('@media (max-width: 1200px)'));
    assert.ok(css.includes('@media (max-width: 1100px)'));
    assert.ok(css.includes('@media (max-width: 1024px)'));
    assert.ok(css.includes('@media (max-width: 768px)'));
    assert.ok(css.includes('overflow-x: hidden'));
    assert.ok(!/min-width:\s*980px/.test(css));
    assert.ok(css.includes('transform: translateX(-105%)'));
  });

  await record('accessibilité menu + hash rapports', async () => {
    assert.ok(ui.includes('aria-expanded'));
    assert.ok(ui.includes('aria-current="page"'));
    assert.ok(ui.includes("e.key === 'Escape'"));
    assert.ok(ui.includes('scope-nav-backdrop'));
    assert.strictEqual(logic.parseHash('#/personnel').screen, 'personnel');
    assert.strictEqual(logic.parseHash('#/personnel/abc').screen, 'personne');
    assert.strictEqual(logic.parseHash('#/personnel/abc').personneId, 'abc');
    assert.strictEqual(logic.parseHash('#/personnel/abc').id, undefined);
    assert.strictEqual(logic.parseHash('#/vue/PR').domaine, 'PR');
    assert.strictEqual(logic.parseHash('#/vue/DAP/Y4').cible, 'Y4');
  });

  await record('identité NIP / import exercices hors onglet principal', async () => {
    assert.ok(ui.includes('NIP'));
    assert.ok(ui.includes('Connectez-vous pour consulter l’annuaire et les fiches nominatives.'));
    assert.ok(ui.includes('Importer un programme d’événements'));
    assert.ok(!ui.includes('data-nav="import"'));
    assert.ok(ui.includes('REPORT-1'));
  });

  await record('tri commun typé — dates, nombres, NIP, accents, ASC/DESC', async () => {
    const dateRows = [{ id: 'c', date: '10.12.2026' }, { id: 'a', date: '12.01.2026' }, { id: 'b', date: '02.02.2026' }];
    assert.deepStrictEqual(
      logic.sortRows(dateRows, { key: 'date', dir: 'asc' }, [{ key: 'date', type: 'date' }]).map((r) => r.id),
      ['a', 'b', 'c']
    );
    const effectifRows = [{ n: 94 }, { n: 9 }, { n: 25 }];
    assert.deepStrictEqual(
      logic.sortRows(effectifRows, { key: 'n', dir: 'asc' }, [{ key: 'n', type: 'number' }]).map((r) => r.n),
      [9, 25, 94]
    );
    const nipRows = [{ nip: '10' }, { nip: '2' }, { nip: 'A1' }, { nip: '2' }];
    assert.deepStrictEqual(
      logic.sortRows(nipRows, { key: 'nip', dir: 'asc' }, [{ key: 'nip', type: 'text' }]).map((r) => r.nip),
      ['2', '2', '10', 'A1']
    );
    assert.strictEqual(logic.sortRows(nipRows, { key: 'nip', dir: 'asc' }, [{ key: 'nip', type: 'text' }])[1], nipRows[3]);
    const names = [{ nom: 'Évrard' }, { nom: 'Eclair' }, { nom: 'Van der Meer' }, { nom: 'Anne-Marie' }];
    assert.deepStrictEqual(
      logic.sortRows(names, { key: 'nom', dir: 'asc' }, [{ key: 'nom', type: 'text' }]).map((r) => r.nom),
      ['Anne-Marie', 'Eclair', 'Évrard', 'Van der Meer']
    );
    assert.deepStrictEqual(logic.nextSort({}, 'date', 'asc'), { key: 'date', dir: 'asc' });
    assert.deepStrictEqual(logic.nextSort({ key: 'date', dir: 'asc' }, 'date', 'asc'), { key: 'date', dir: 'desc' });
    assert.deepStrictEqual(logic.nextSort({ key: 'date', dir: 'desc' }, 'date', 'asc'), { key: 'date', dir: 'asc' });
  });

  await record('tri commun — filtre actif et source non mutée', async () => {
    const source = [
      { id: 'dap-25', domaine: 'DAP', effectif: 25 },
      { id: 'dps-94', domaine: 'DPS', effectif: 94 },
      { id: 'dap-9', domaine: 'DAP', effectif: 9 }
    ];
    const before = JSON.stringify(source);
    const filtered = source.filter((row) => row.domaine === 'DAP');
    const sorted = logic.sortRows(filtered, { key: 'effectif', dir: 'asc' }, [{ key: 'effectif', type: 'number' }]);
    assert.deepStrictEqual(sorted.map((r) => r.id), ['dap-9', 'dap-25']);
    assert.strictEqual(JSON.stringify(source), before);
    assert.notStrictEqual(sorted, filtered);
  });

  await record('tri événement après retour navigation conservé côté état UI', async () => {
    assert.ok(ui.includes("eventSort: { key: 'date', dir: 'asc' }"));
    assert.ok(ui.includes('state.eventSort = L.nextSort'));
    assert.ok(ui.includes("sortableHeader('events', 'date', 'Date', state.eventSort)"));
    assert.ok(ui.includes('data-scope-sort="${table}" data-sort-key'));
    assert.ok(!ui.includes('withLoading(loadList);\\n        render();'));
  });

  await record('table personnel événement triable sans mutation de saisie', async () => {
    assert.ok(ui.includes("eventPersonnelSort: { key: 'nom', dir: 'asc' }"));
    assert.ok(ui.includes("sortableHeader('event-personnel', 'nom', 'Personne', state.eventPersonnelSort)"));
    assert.ok(ui.includes("sortableHeader('event-personnel', 'nip', 'NIP', state.eventPersonnelSort)"));
    assert.ok(ui.includes("sortableHeader('event-personnel', 'cible', 'Cible', state.eventPersonnelSort)"));
    assert.ok(ui.includes("sortableHeader('event-personnel', 'presence', 'Statut', state.eventPersonnelSort)"));
    assert.ok(ui.includes('nomFamille: person.nom'));
    assert.ok(ui.includes('prenom: person.prenom'));
    assert.ok(ui.includes('grade: person.grade'));
    assert.ok(ui.includes('const filteredRaw = state.cibleFilter'));
    assert.ok(ui.includes('const filtered = sortSaisieRows(filteredRaw);'));
  });

  await record('rendu final — headers interactifs et indicateurs visibles', async () => {
    assert.ok(ui.includes('class="scope-table-sort-header scope-sortable'));
    assert.ok(ui.includes('class="scope-table-sort-control scope-sort-button"'));
    assert.ok(ui.includes('class="scope-table-sort-label"'));
    assert.ok(ui.includes('class="scope-table-sort-indicator scope-sort-indicator"'));
    assert.ok(logicSrc.includes("indicator: active ? (sort.dir === 'desc' ? '▼' : '▲') : ''"));
    assert.ok(css.includes('.scope-table-sort-header'));
    assert.ok(css.includes('.scope-table-sort-header:hover'));
    assert.ok(css.includes('.scope-table-sort-control:focus-visible'));
    assert.ok(css.includes('.scope-sortable'));
    assert.ok(css.includes('cursor: pointer'));
    assert.ok(css.includes('.scope-sort-indicator'));
    assert.ok(css.includes('appearance: none'));
    assert.ok(css.includes('border-radius: 0'));
    assert.ok(ui.includes('root.querySelectorAll(\'[data-scope-sort][data-sort-key]\')'));
    assert.ok(ui.includes('root.querySelectorAll(\'[data-personnel-sort]\')'));
  });

  await record('rendu ORION — pas de capsule bouton dans les en-têtes triables', async () => {
    const controlBlock = css.slice(css.indexOf('.scope-table-sort-control,'), css.indexOf('.scope-table-sort-control:hover'));
    assert.ok(controlBlock.includes('border: 0'));
    assert.ok(controlBlock.includes('border-radius: 0'));
    assert.ok(controlBlock.includes('background: transparent'));
    assert.ok(!/border-radius:\s*(?:99|999|8|12)px/.test(controlBlock));
    assert.ok(!/background:\s*#(?:fff|f3f4f6|eef2f6)/i.test(controlBlock));
    assert.ok(css.includes('color: var(--scope-red);'));
    assert.ok(ui.includes('<th>Actions</th>'));
    assert.ok(ui.includes('<th>ACTIONS</th>'));
    assert.ok(!ui.includes("sortableHeader('events', 'actions'"));
    assert.ok(!ui.includes("personnelSortHeader('actions'"));
  });

  await record('tri DOM simulé événements — défaut ASC, clic DATE inverse, filtre conservé', async () => {
    const columns = [
      { key: 'date', type: 'date', value: (item) => item.evenement.date, tieBreakers: [
        { key: 'heure', type: 'time', value: (item) => item.evenement.heure_debut },
        { key: 'libelle', type: 'text', value: (item) => item.evenement.libelle }
      ] },
      { key: 'domaine', type: 'text', value: (item) => item.evenement.domaine_code }
    ];
    const rows = [
      { id: 'dec', evenement: { date: '2026-12-10', heure_debut: '09:00', libelle: 'Décembre', domaine_code: 'DPS' } },
      { id: 'jan', evenement: { date: '2026-01-12', heure_debut: '14:00', libelle: 'Janvier', domaine_code: 'DAP' } },
      { id: 'feb', evenement: { date: '2026-02-02', heure_debut: '08:00', libelle: 'Février', domaine_code: 'DAP' } }
    ];
    assert.deepStrictEqual(logic.sortRows(rows, { key: 'date', dir: 'asc' }, columns).map((r) => r.id), ['jan', 'feb', 'dec']);
    assert.deepStrictEqual(logic.sortRows(rows, logic.nextSort({ key: 'date', dir: 'asc' }, 'date', 'asc'), columns).map((r) => r.id), ['dec', 'feb', 'jan']);
    const filtered = rows.filter((row) => row.evenement.domaine_code === 'DAP');
    assert.deepStrictEqual(logic.sortRows(filtered, { key: 'date', dir: 'desc' }, columns).map((r) => r.id), ['feb', 'jan']);
  });

  await record('tri DOM simulé personnel événement — identité structurée et présence conservée', async () => {
    const columns = [
      { key: 'nom', type: 'text', value: (row) => row.nomFamille, tieBreakers: [
        { key: 'prenom', type: 'text', value: (row) => row.prenom },
        { key: 'grade', type: 'text', value: (row) => row.grade },
        { key: 'nip', type: 'text', value: (row) => row.nip }
      ] },
      { key: 'presence', type: 'status', value: (row) => row.statut }
    ];
    const rows = [
      { id: 'dzs', nomFamille: 'Dupont', prenom: 'Zoé', grade: 'Sap', nip: '4', statut: 'PRESENT' },
      { id: 'dap', nomFamille: 'Dupont', prenom: 'Alain', grade: 'Plt', nip: '3', statut: 'ABSENT_EXCUSE' },
      { id: 'bmc', nomFamille: 'Bernard', prenom: 'Marc', grade: 'Cpl', nip: '1', statut: 'NON_RENSEIGNE' },
      { id: 'dac', nomFamille: 'Dupont', prenom: 'Alain', grade: 'Cpl', nip: '2', statut: 'ABSENT_NON_EXCUSE' }
    ];
    const before = JSON.stringify(rows);
    assert.deepStrictEqual(logic.sortRows(rows, { key: 'nom', dir: 'asc' }, columns).map((r) => r.id), ['bmc', 'dac', 'dap', 'dzs']);
    assert.deepStrictEqual(logic.sortRows(rows, { key: 'nom', dir: 'desc' }, columns).map((r) => r.id), ['dzs', 'dap', 'dac', 'bmc']);
    assert.deepStrictEqual(rows.map((r) => r.statut), ['PRESENT', 'ABSENT_EXCUSE', 'NON_RENSEIGNE', 'ABSENT_NON_EXCUSE']);
    assert.strictEqual(JSON.stringify(rows), before);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();
