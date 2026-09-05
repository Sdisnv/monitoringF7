'use strict';
/** SCOPE-QUAL-FINISH-1 — marquage des données de qualification. LEGACY n’est jamais TEST. */

function isQualificationEvenement(row){
  const origine = String((row && (row.origine || row.origine_code)) || '').toUpperCase();
  const mode = String((row && (row.mode_suivi || row.modeSuivi)) || '').toUpperCase();
  if(origine === 'LEGACY_AGGREGATED' || mode === 'LEGACY') return false;
  const libelle = String((row && (row.libelle || row.title)) || '');
  const ext = String((row && (row.identifiant_externe || row.identifiantExterne)) || '');
  if(/^TEST[\s—-]/i.test(libelle.trim())) return true;
  if(/TEST IMPORT SCOPE/i.test(libelle)) return true;
  if(/TEST SCOPE/i.test(libelle)) return true;
  if(/^TEST-/i.test(ext.trim())) return true;
  return false;
}

function isTestPersonnelNip(nip){
  return /^(99\d{3}|TSTR2)/i.test(String(nip || '').trim());
}

function wantsQualification(query){
  const raw = query && (query.includeQualification ?? query.include_qualification);
  if(raw == null || raw === '') return true;
  return ['1', 'true', 'oui', 'yes'].includes(String(raw).toLowerCase());
}

module.exports = { isQualificationEvenement, isTestPersonnelNip, wantsQualification };
