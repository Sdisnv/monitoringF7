#!/usr/bin/env node
'use strict';

/**
 * Import pilote CSV personnel local/anonymisé → SCOPE.
 * Dry-run par défaut. --execute exige DATABASE_URL et n’importe qu’un OI filtré.
 *
 *   node scripts/scope-import-personnel.js --dry-run --oi "DAP Y4"
 *   node scripts/scope-import-personnel.js --execute --oi "DAP Y4" --date-debut 2026-08-19
 */

const fs = require('fs');
const path = require('path');
const { parsePersonnelCsv, planImport, DATE_BASCULE_SCOPE } = require('../assets/js/scope-oi-map.js');

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function initials(nom, prenom) {
  const n = String(nom || '').trim();
  const p = String(prenom || '').trim();
  return `${(p[0] || '?')}. ${(n[0] || '?')}.`;
}

async function main() {
  const csvPath = arg('csv', path.join(__dirname, '..', 'tests/fixtures/personnel-dap-y4-anonymized.csv'));
  const oi = arg('oi', '');
  const dateDebut = arg('date-debut', DATE_BASCULE_SCOPE);
  const execute = hasFlag('execute');
  const text = fs.readFileSync(csvPath, 'utf8');
  const parsed = parsePersonnelCsv(text);
  const plan = planImport(parsed.rows, { oi, dateDebut });

  const report = {
    dryRun: !execute,
    csv: path.basename(csvPath),
    oiFiltre: oi || '(tous les OI mappés)',
    dateDebut,
    personnesACreer: plan.personnesACreer,
    personnesAMettreAJour: 0,
    affectationsACreer: plan.affectationsACreer,
    lignesIgnorees: plan.lignesIgnorees,
    erreurs: plan.erreurs.length,
    doublons: plan.doublons.length,
    oiInconnus: plan.oiInconnus,
    echantillon: plan.personnes.slice(0, 20).map((p) => ({
      nip: p.nip,
      initiales: initials(p.nom, p.prenom),
      oi: p.oi,
      cible: `${p.domaineCode}/${p.niveauCode}`,
      dateDebut: p.dateDebut
    }))
  };
  console.log(JSON.stringify(report, null, 2));

  if (!execute) {
    console.error('\nDry-run : aucune écriture.');
    return;
  }
  if (!oi) {
    console.error('Refus : --execute exige --oi pour un périmètre pilote (pas tout le SDIS).');
    process.exitCode = 2;
    return;
  }
  if (!process.env.DATABASE_URL && !process.env.NETLIFY_DATABASE_URL) {
    console.error('Refus : DATABASE_URL absent. Aucune écriture.');
    process.exitCode = 2;
    return;
  }

  const { getPgRepo } = require('../netlify/lib/_scope-pg');
  const repo = await getPgRepo();
  const cibles = await repo.listCibles();
  let createdPeople = 0;
  let updatedPeople = 0;
  let createdAff = 0;
  for (const person of plan.personnes) {
    const cible = cibles.find((c) => c.domaine_code === person.domaineCode && c.niveau_code === person.niveauCode);
    if (!cible) throw new Error(`Cible introuvable ${person.domaineCode}/${person.niveauCode}`);
    const existing = await repo.getPersonneByNip(person.nip);
    let personne = existing;
    if (existing) {
      personne = await repo.upsertPersonne({
        ...existing,
        nom: person.nom,
        prenom: person.prenom,
        grade: person.grade,
        source: 'CSV_IMPORT'
      });
      updatedPeople += 1;
    } else {
      personne = await repo.upsertPersonne({
        nip: person.nip,
        nom: person.nom,
        prenom: person.prenom,
        grade: person.grade,
        source: 'CSV_IMPORT'
      });
      createdPeople += 1;
    }
    const open = await repo.listAffectations({ personneId: personne.personne_id });
    const already = open.some((a) => a.cible_id === cible.cible_id && !a.date_fin);
    if (!already) {
      await repo.insertAffectation({
        personne_id: personne.personne_id,
        cible_id: cible.cible_id,
        date_debut: person.dateDebut,
        source: 'CSV_IMPORT'
      });
      createdAff += 1;
    }
    await repo.appendJournal({
      auteur_id: 'scope-import-personnel',
      entite: 'personne',
      entite_id: personne.personne_id,
      action: 'CSV_IMPORT',
      apres: { nip: person.nip, oi: person.oi, cible: `${person.domaineCode}/${person.niveauCode}`, dateDebut: person.dateDebut }
    });
  }
  console.log(JSON.stringify({
    execute: true,
    personnesCreees: createdPeople,
    personnesMisesAJour: updatedPeople,
    affectationsCreees: createdAff
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error && error.message || error));
  process.exitCode = 1;
});
