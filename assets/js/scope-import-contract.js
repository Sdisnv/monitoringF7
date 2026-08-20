/* SCOPE-MODEL-2 — contrat d’import d’exercices SCOPE (preview uniquement).
   Ce module ne écrit pas en PostgreSQL. L’écriture transactionnelle est un lot dédié. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeImportContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const COLUMNS = [
    'date',
    'domaine',
    'sous_domaine',
    'cibles',
    'libelle',
    'mode_suivi',
    'comptabilise',
    'remarque',
    'identifiant_externe'
  ];

  const DOMAINES_CONNUS = ['FOBA', 'FOCA', 'DPS', 'DAP', 'PR', 'AUTO', 'FOSPEC', 'JSP'];
  const SOUS_DOMAINES = { PR: 'FOSPEC', AUTO: 'FOSPEC' };
  const MODES = ['NOMINATIF', 'QUANTITATIF', 'AUTO'];

  function normalizeHeader(name) {
    return String(name || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');
  }

  function splitLine(line) {
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else inQuotes = false;
        } else current += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ';' || ch === ',') {
        out.push(current);
        current = '';
      } else current += ch;
    }
    out.push(current);
    return out.map((cell) => String(cell || '').trim());
  }

  function parseCsv(text) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter((line, idx, arr) => line.trim() || idx < arr.length - 1);
    if (!lines.length) return { headers: [], rows: [], error: 'fichier_vide' };
    const headers = splitLine(lines[0]).map(normalizeHeader);
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      if (!String(lines[i] || '').trim()) continue;
      const cells = splitLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
      rows.push({ ligneNo: i + 1, raw: lines[i], fields: row });
    }
    return { headers, rows };
  }

  function fingerprint(fields) {
    const date = String(fields.date || '').slice(0, 10);
    const domaine = String(fields.domaine || '').toUpperCase();
    const sous = String(fields.sous_domaine || fields.sousdomaine || '').toUpperCase();
    const cibles = String(fields.cibles || '').toUpperCase().split(/[|;/]+/).map((s) => s.trim()).filter(Boolean).sort().join('|');
    const libelle = String(fields.libelle || '').trim().toLowerCase();
    const ext = String(fields.identifiant_externe || fields.identifiantexterne || '').trim();
    if (ext) return `ext:${ext}`;
    return `nat:${date}|${domaine}|${sous}|${cibles}|${libelle}`;
  }

  function resolveDomaine(fields) {
    const domaine = String(fields.domaine || '').trim().toUpperCase();
    const sous = String(fields.sous_domaine || fields.sousdomaine || '').trim().toUpperCase();
    if (!domaine) return { error: 'domaine_manquant' };
    if (!DOMAINES_CONNUS.includes(domaine) && domaine !== 'PAPR') {
      return { error: 'referentiel_inconnu', message: `Domaine inconnu : ${domaine}` };
    }
    const storage = domaine === 'PAPR' ? 'PR' : domaine;
    if (sous) {
      if (!SOUS_DOMAINES[sous] && sous !== 'PAPR') {
        return { error: 'referentiel_inconnu', message: `Sous-domaine inconnu : ${sous}` };
      }
      const leaf = sous === 'PAPR' ? 'PR' : sous;
      if (storage === 'FOSPEC' || storage === leaf) {
        return { domaineStockage: leaf, sousDomaine: leaf, domaineAffiche: storage === 'FOSPEC' ? 'FOSPEC' : leaf };
      }
      return { error: 'sous_domaine_incoherent', message: `Sous-domaine ${sous} incompatible avec ${domaine}` };
    }
    return {
      domaineStockage: storage,
      sousDomaine: SOUS_DOMAINES[storage] ? storage : null,
      domaineAffiche: storage === 'PR' ? 'PAPR' : storage
    };
  }

  function parseCibles(fields, domaineStockage, knownCibles) {
    const text = String(fields.cibles || '').trim();
    if (!text) return { error: 'cibles_manquantes' };
    const tokens = text.split(/[|;/]+/).map((s) => s.trim()).filter(Boolean);
    const resolved = [];
    for (const token of tokens) {
      const niveau = token.toUpperCase();
      const hit = (knownCibles || []).find((c) =>
        c.domaine_code === domaineStockage && String(c.niveau_code).toUpperCase() === niveau
      );
      if (!hit) {
        return { error: 'referentiel_inconnu', message: `Cible inconnue : ${domaineStockage}/${token}` };
      }
      resolved.push({ cibleId: hit.cible_id, niveauCode: hit.niveau_code, domaineCode: hit.domaine_code });
    }
    return { cibles: resolved };
  }

  function parseMode(fields) {
    const raw = String(fields.mode_suivi || fields.modesuivi || 'AUTO').trim().toUpperCase();
    if (!raw || raw === 'AUTO') return { requested: 'AUTO', explicit: false };
    if (raw === 'NOMINATIF' || raw === 'QUANTITATIF') return { requested: raw, explicit: true };
    return { error: 'mode_invalide', message: `Mode de suivi invalide : ${raw}` };
  }

  function previewScopeImport(csvText, context) {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      return { ok: false, error: parsed.error, lignes: [], summary: { nbLignes: 0 } };
    }
    const missing = COLUMNS.filter((col) => !parsed.headers.includes(col) && col !== 'sous_domaine' && col !== 'identifiant_externe' && col !== 'remarque' && col !== 'comptabilise');
    const lignes = [];
    const seen = new Map();
    const existingExt = new Set(
      (context && context.evenementsExistants || [])
        .map((e) => String(e.identifiant_externe || e.identifiantExterne || '').trim())
        .filter(Boolean)
    );
    const existingNat = new Set(
      (context && context.evenementsExistants || []).map((e) => {
        const date = String(e.date || '').slice(0, 10);
        const domaine = String(e.domaine_code || e.domaineCode || '').toUpperCase();
        const libelle = String(e.libelle || '').trim().toLowerCase();
        return `nat:${date}|${domaine}||${libelle}`;
      })
    );

    parsed.rows.forEach((row) => {
      const errors = [];
      const warnings = [];
      const resolvedDomaine = resolveDomaine(row.fields);
      if (resolvedDomaine.error) errors.push(resolvedDomaine);
      const mode = parseMode(row.fields);
      if (mode.error) errors.push(mode);
      let cibles = [];
      if (!resolvedDomaine.error) {
        const parsedCibles = parseCibles(row.fields, resolvedDomaine.domaineStockage, (context && context.cibles) || []);
        if (parsedCibles.error) errors.push(parsedCibles);
        else cibles = parsedCibles.cibles;
      }
      const date = String(row.fields.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push({ error: 'date_invalide', message: 'Date invalide (AAAA-MM-JJ).' });
      const libelle = String(row.fields.libelle || '').trim();
      if (!libelle) errors.push({ error: 'libelle_vide', message: 'Le libellé est obligatoire.' });
      const fp = fingerprint(row.fields);
      if (seen.has(fp)) {
        errors.push({ error: 'doublon_fichier', message: `Doublon dans le fichier (ligne ${seen.get(fp)}).` });
      } else seen.set(fp, row.ligneNo);

      const ext = String(row.fields.identifiant_externe || row.fields.identifiantexterne || '').trim();
      const deja = (ext && existingExt.has(ext))
        || existingNat.has(`nat:${date}|${resolvedDomaine.domaineStockage || ''}||${libelle.toLowerCase()}`);

      const proposedMode = mode.requested === 'AUTO'
        ? ((context && context.suggestMode) || 'QUANTITATIF')
        : mode.requested;

      const statut = errors.length ? 'ERREUR' : (deja ? 'DEJA_PRESENT' : 'VALIDE');
      if (missing.length) warnings.push(`Colonnes recommandées absentes : ${missing.join(', ')}`);

      lignes.push({
        ligneNo: row.ligneNo,
        statut,
        erreurs: errors,
        avertissements: warnings,
        fingerprint: fp,
        date,
        domaine: resolvedDomaine.domaineAffiche || row.fields.domaine,
        domaineStockage: resolvedDomaine.domaineStockage || null,
        sousDomaine: resolvedDomaine.sousDomaine || null,
        cibles,
        libelle,
        modeDemande: mode.requested || null,
        modePropose: proposedMode,
        comptabilise: String(row.fields.comptabilise || 'oui').toLowerCase() !== 'non',
        remarque: row.fields.remarque || '',
        identifiantExterne: ext || null,
        actionPrevue: statut === 'VALIDE' ? 'CREER' : (statut === 'DEJA_PRESENT' ? 'IGNORER_IDEMPOTENT' : 'REFUSER')
      });
    });

    const summary = {
      nbLignes: lignes.length,
      VALIDE: lignes.filter((l) => l.statut === 'VALIDE').length,
      ERREUR: lignes.filter((l) => l.statut === 'ERREUR').length,
      DEJA_PRESENT: lignes.filter((l) => l.statut === 'DEJA_PRESENT').length,
      aCreer: lignes.filter((l) => l.actionPrevue === 'CREER').length,
      dejaExistants: lignes.filter((l) => l.actionPrevue === 'IGNORER_IDEMPOTENT').length
    };

    return {
      ok: summary.ERREUR === 0,
      format: 'SCOPE_MODEL_2',
      colonnes: COLUMNS,
      previewSeule: true,
      commitTransactionnel: 'lot_ulterieur',
      lignes,
      summary
    };
  }

  return {
    COLUMNS,
    previewScopeImport,
    fingerprint,
    resolveDomaine
  };
});
