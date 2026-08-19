/* SCOPE-QUAL-1 — mapping OI CSV → cible SCOPE. Aucune implication FOBA/PR/AUTO/JSP. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeOiMap = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DATE_BASCULE_SCOPE = '2026-08-19';

  const OI_TO_CIBLE = {
    'DPS G1': { domaineCode: 'DPS', niveauCode: 'G1' },
    'DPS C1': { domaineCode: 'DPS', niveauCode: 'C1' },
    'DPS B1': { domaineCode: 'DPS', niveauCode: 'B1' },
    'DPS B2': { domaineCode: 'DPS', niveauCode: 'B2' },
    'DAP Y1': { domaineCode: 'DAP', niveauCode: 'Y1' },
    'DAP Y2': { domaineCode: 'DAP', niveauCode: 'Y2' },
    'DAP Y3': { domaineCode: 'DAP', niveauCode: 'Y3' },
    'DAP Y4': { domaineCode: 'DAP', niveauCode: 'Y4' }
  };

  function normalizeOi(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function mapOi(value) {
    const oi = normalizeOi(value);
    return OI_TO_CIBLE[oi] || null;
  }

  function parsePersonnelCsv(text) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { header: [], rows: [], separator: ';' };
    const separator = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const header = lines[0].split(separator).map((h) => h.trim());
    const rows = lines.slice(1).map((line, i) => {
      const parts = line.split(separator).map((v) => v.trim());
      const rec = { line: i + 2 };
      header.forEach((key, idx) => { rec[key] = parts[idx] || ''; });
      return rec;
    });
    return { header, rows, separator };
  }

  function planImport(rows, options) {
    const oiFilter = options && options.oi ? normalizeOi(options.oi) : null;
    const dateDebut = (options && options.dateDebut) || DATE_BASCULE_SCOPE;
    const toCreate = [];
    const ignored = [];
    const errors = [];
    const unknownOi = {};
    const duplicates = [];
    const seenNip = new Map();

    for (const row of rows) {
      const nip = String(row.NIP || row.nip || '').trim();
      const nom = String(row.Nom || row.nom || '').trim();
      const prenom = String(row['Prénom'] || row.Prenom || row.prenom || '').trim();
      const grade = String(row.Grade || row.grade || '').trim();
      const oi = normalizeOi(row.OI || row.oi);
      if (seenNip.has(nip)) duplicates.push(nip);
      else seenNip.set(nip, true);
      if (!nip || !nom || !prenom) {
        errors.push({ line: row.line, nip, reason: 'nip_ou_nom_manquant' });
        continue;
      }
      const mapped = mapOi(oi);
      if (!mapped) {
        unknownOi[oi || '(vide)'] = (unknownOi[oi || '(vide)'] || 0) + 1;
        ignored.push({ line: row.line, nip, oi, reason: 'oi_non_reconnu' });
        continue;
      }
      if (oiFilter && oi !== oiFilter) {
        ignored.push({ line: row.line, nip, oi, reason: 'hors_perimetre' });
        continue;
      }
      toCreate.push({
        nip,
        nom,
        prenom,
        grade,
        oi,
        domaineCode: mapped.domaineCode,
        niveauCode: mapped.niveauCode,
        dateDebut,
        source: 'CSV_IMPORT'
      });
    }

    return {
      dateDebut,
      personnesACreer: toCreate.length,
      affectationsACreer: toCreate.length,
      lignesIgnorees: ignored.length,
      erreurs: errors,
      doublons: duplicates,
      oiInconnus: unknownOi,
      personnes: toCreate,
      ignored
    };
  }

  return { DATE_BASCULE_SCOPE, OI_TO_CIBLE, normalizeOi, mapOi, parsePersonnelCsv, planImport };
});
