#!/usr/bin/env node
'use strict';

// SCOPE — QUO VADIS — QV-2027-MOA-RECETTE-CORRECTIF-1
// Matrice de comparaison 2026 réel → 2027 généré. Lecture seule, aucune écriture.

const path = require('path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'assets/js/scope-ui-logic.js'));
const cta = require(path.join(root, 'netlify/lib/_scope-cta-rules'));
const canonical = require(path.join(root, 'netlify/lib/data/scope-qv-programme-2027.json'));
const history = require(path.join(root, 'netlify/lib/data/scope-qv-history-2026.json'));

const rotation = L.qvDistributeRotationOccurrences(canonical.rows, history.rows, cta.instructionPublicForDate);
const pionnier = L.qvApplyPionnierRules(rotation.rows);
const family = L.qvApplyDpsInstructionFamilyRules(pionnier.rows, cta.instructionPublicForDate);
const applied = L.qvApplyConduiteContinue(family.rows, cta.conduiteEngineOptions());
const prAbc = L.qvApplyPrAbcStructure(applied.rows, history.rows);
const rows2027 = prAbc.rows.filter((row) => !row.external);

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const weekdayOf = (iso) => (iso ? WEEKDAYS[new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).getUTCDay()] : '—');
const monthOf = (iso) => (iso ? String(iso).slice(5, 7) : '—');
const dateOf = (row) => (row.startsAt ? String(row.startsAt).slice(0, 10) : null);
const hourOf = (row) => (row.startsAt ? `${String(row.startsAt).slice(11, 16)}-${String(row.endsAt || '').slice(11, 16)}` : '—');

function h26(re) {
  return history.rows.filter((row) => re.test(String(row.title || '')));
}
function p27(re) {
  return rows2027.filter((row) => re.test(String(row.label || '')));
}

function describe26(label, re) {
  const list = h26(re);
  const byDate = list.map((r) => r.date).filter(Boolean).sort();
  const days = [...new Set(list.map((r) => weekdayOf(r.date)))];
  const hours = [...new Set(list.map((r) => `${r.start}-${r.end}`))];
  const ois = [...new Set(list.flatMap((r) => r.ois || []))].sort();
  const resp = [...new Set(list.map((r) => r.responsible).filter(Boolean))];
  const stat = [...new Set(list.map((r) => r.statCom).filter(Boolean))];
  const loc = [...new Set(list.map((r) => r.location).filter(Boolean))];
  const pub = [...new Set(list.map((r) => r.personnel).filter(Boolean))];
  return {
    label,
    n: list.length,
    dates: byDate,
    months: [...new Set(byDate.map((d) => d.slice(5, 7)))].sort(),
    days,
    hours,
    ois,
    resp,
    stat,
    loc,
    pub,
  };
}

function describe27(label, re) {
  const list = p27(re);
  const dated = list.filter((r) => r.startsAt);
  const undated = list.length - dated.length;
  const byDate = dated.map(dateOf).sort();
  return {
    label,
    n: list.length,
    dated: dated.length,
    undated,
    dates: byDate,
    months: [...new Set(byDate.map((d) => d.slice(5, 7)))].sort(),
    days: [...new Set(dated.map((r) => weekdayOf(dateOf(r))))],
    hours: [...new Set(dated.map(hourOf))],
    ois: [...new Set(list.flatMap((r) => r.ois || []))].sort(),
    resp: [...new Set(list.map((r) => r.responsible).filter(Boolean))],
    stat: [...new Set(list.map((r) => r.statCom).filter(Boolean))],
    publics: [...new Set(list.flatMap((r) => r.publics || []))],
  };
}

const TOPICS = [
  ['DPS Instr demi-sct', /^Instr demi-sct/i],
  ['DPS Instr sct', /^Instr sct/i],
  ['DPS KICK-OFF', /KICK-?OFF/i],
  ['DPS VARIA', /VARIA/i],
  ['DPS FEU', /\bFEU\b/i],
  ['DPS ABC', /\bABC\b/i],
  ['DPS PIONNIER', /PIONNIER/i],
  ['DPS PIONNIER CSU-nvb', /PIONNIER.*CSU-?nvb/i],
  ['Conduite formation continue', /Conduite.*formation continue/i],
  ['Formation permanents', /Formation permanents?/i],
  ['Formation permanents CSU-nvb', /Formation permanents?.*CSU-?nvb/i],
  ['Journée des familles', /Journ[ée]e des familles/i],
  ['Noël des familles', /No[eë]l des familles/i],
  ['Revue quinquennale', /Revue quinquennale/i],
  ['Préparation Revue quinquennale', /Pr[ée]paration.*[Rr]evue quinquennale/i],
  ['PR-ABC', /PR-?ABC|P-?ABC/i],
  ['DAP Formation groupée', /Formation group[ée]e/i],
  ['DAP Exercice', /Exercice DAP|DAP.*[Ee]xercice/i],
  ['DAP Cours de cadres exercice', /Cours de cadres exercice/i],
  ['DAP Vision locale', /Vision locale/i],
  ['DAP Reconnaissance', /Reconnaissance/i],
  ['CMDT Séance État-major', /[ÉE]tat-?major/i],
  ['CMDT Codir', /Codir/i],
  ['JSP Exercice', /Exercice JSP/i],
  ['JSP Cursus', /Cursus JSP/i],
  ['JSP CEMEA', /CEMEA/i],
  ['JSP Séance Direction', /S[ée]ance Direction JSP/i],
  ['FOBA Exercice', /Exercice FOBA/i],
];

console.log('# MATRICE 2026 → 2027\n');
TOPICS.forEach(([label, re]) => {
  const a = describe26(label, re);
  const b = describe27(label, re);
  console.log(`## ${label}`);
  console.log(`2026 n=${a.n} mois=[${a.months}] jours=[${a.days}] horaires=[${a.hours.slice(0, 4)}]`);
  console.log(`     ois=[${a.ois}] resp=[${a.resp.slice(0, 5)}] stat=[${a.stat.slice(0, 5)}] lieux=[${a.loc.slice(0, 4)}]`);
  console.log(`     dates=${JSON.stringify(a.dates.slice(0, 24))}`);
  console.log(`2027 n=${b.n} (datées ${b.dated}, à définir ${b.undated}) mois=[${b.months}] jours=[${b.days}]`);
  console.log(`     ois=[${b.ois}] resp=[${b.resp.slice(0, 5)}] stat=[${b.stat.slice(0, 5)}]`);
  console.log(`     dates=${JSON.stringify(b.dates.slice(0, 24))}`);
  console.log('');
});

// Doublons techniques 2027 : même label + même date + même horaire + même OI set.
const dupKey = (row) => [row.label, dateOf(row) || 'ND', hourOf(row), (row.ois || []).slice().sort().join('+'), (row.publics || []).slice().sort().join('+')].join(' | ');
const buckets = new Map();
rows2027.forEach((row) => {
  const key = dupKey(row);
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(row);
});
const dups = [...buckets.entries()].filter(([, list]) => list.length > 1).sort((a, b) => b[1].length - a[1].length);
console.log(`\n# DOUBLONS TECHNIQUES 2027 (label+date+horaire+OI+publics identiques) : ${dups.length} groupes, ${dups.reduce((s, [, l]) => s + l.length - 1, 0)} lignes excédentaires`);
dups.slice(0, 40).forEach(([key, list]) => console.log(`  x${list.length}  ${key}`));

// Domaines présents
const domains2027 = {};
rows2027.forEach((row) => { domains2027[row.domain || '—'] = (domains2027[row.domain || '—'] || 0) + 1; });
console.log('\n# DOMAINES 2027', JSON.stringify(domains2027));
console.log('# TOTAL 2027', rows2027.length);
