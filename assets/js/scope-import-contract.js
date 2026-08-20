/* SCOPE-EVENT-IMPORT-1 — format SCOPE_EXERCICES_CSV_1 (preview + writer).
   Le commit PostgreSQL est dans _scope-service. Ce module ne écrit pas. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeImportContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FORMAT_NATIVE = 'SCOPE_EXERCICES_CSV_1';
  const FORMAT_F7 = 'monitoring_exercices_sdis_22cols';

  const COLUMNS = [
    'date',
    'domaine',
    'sous_domaine',
    'cibles',
    'libelle',
    'mode_suivi',
    'a_comptabiliser',
    'remarque',
    'identifiant_externe'
  ];

  const REQUIRED = ['date', 'domaine', 'cibles', 'libelle'];
  const DOMAINES_CONNUS = ['FOBA', 'FOCA', 'DPS', 'DAP', 'PR', 'AUTO', 'FOSPEC', 'JSP'];
  const SOUS_DOMAINES = { PR: 'FOSPEC', AUTO: 'FOSPEC' };
  const MODES = ['NOMINATIF', 'QUANTITATIF', 'AUTO'];

  const STATUT_LABELS = {
    A_CREER: 'À créer',
    VALIDE: 'À créer',
    DEJA_PRESENT: 'Déjà présent',
    DEJA_IMPORTE: 'Déjà importé',
    ERREUR: 'Erreur',
    ERREUR_REFERENTIEL: 'Erreur de référentiel',
    ERREUR_DATE: 'Date invalide',
    ERREUR_MODE: 'Mode invalide',
    CONFLIT: 'Conflit',
    A_ARBITRER: 'À arbitrer',
    EXCLU: 'Exclu',
    AVERTISSEMENT: 'Avertissement'
  };

  function normalizeHeader(name) {
    const key = String(name || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');
    if (key === 'comptabilise') return 'a_comptabiliser';
    if (key === 'cible' || key === 'public_cible') return key === 'public_cible' ? key : 'cibles';
    return key;
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

  function detectCsvFormat(headers) {
    const h = (headers || []).map((x) => String(x || '').toLowerCase());
    const has = (name) => h.includes(name);
    const f7 = has('date_exercice') && has('nb_convoques') && has('public_cible');
    const native = has('date') && has('domaine') && (has('libelle') || has('cibles'));
    if (f7 && !has('date')) return FORMAT_F7;
    if (f7 && has('nb_presents')) return FORMAT_F7;
    if (native && !f7) return FORMAT_NATIVE;
    if (f7) return FORMAT_F7;
    if (native) return FORMAT_NATIVE;
    return 'INCONNU';
  }

  function detectCsvFormatFromText(csvText) {
    return detectCsvFormat(parseCsv(csvText).headers);
  }

  function validIsoDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function normalizeDate(raw) {
    const text = String(raw || '').trim();
    if (!text) return { error: 'date_invalide', message: 'Date manquante (AAAA-MM-JJ).' };
    if (validIsoDate(text)) return { iso: text };
    const local = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (local) {
      const iso = `${local[3]}-${String(local[2]).padStart(2, '0')}-${String(local[1]).padStart(2, '0')}`;
      if (validIsoDate(iso)) return { iso, original: text };
    }
    return { error: 'date_invalide', message: 'Date invalide (AAAA-MM-JJ).' };
  }

  function fingerprint(fields, resolved) {
    const ext = String(fields.identifiant_externe || fields.identifiantexterne || '').trim();
    if (ext) return `ext:${ext}`;
    const date = (resolved && resolved.date) || String(fields.date || '').slice(0, 10);
    const domaine = (resolved && resolved.domaineStockage) || String(fields.domaine || '').toUpperCase();
    const sous = (resolved && resolved.sousDomaine) || String(fields.sous_domaine || '').toUpperCase();
    const cibles = (resolved && resolved.cibleCodes)
      || String(fields.cibles || '').toUpperCase().split(/[|;]+/).map((s) => s.trim()).filter(Boolean).sort().join('|');
    const libelle = String(fields.libelle || '').trim().toLowerCase();
    const mode = (resolved && resolved.modeFinal) || '';
    return `nat:${date}|${domaine}|${sous}|${cibles}|${libelle}|${mode}`;
  }

  function identityWithoutMode(fp) {
    return String(fp || '').replace(/\|[^|]*$/, '');
  }

  function resolveDomaine(fields) {
    const domaine = String(fields.domaine || '').trim().toUpperCase();
    const sous = String(fields.sous_domaine || fields.sousdomaine || '').trim().toUpperCase();
    if (!domaine) return { error: 'domaine_manquant', message: 'Domaine manquant.' };
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
        return {
          domaineStockage: leaf,
          sousDomaine: leaf,
          domaineAffiche: 'FOSPEC',
          sousDomaineAffiche: leaf === 'PR' ? 'PAPR' : 'AUTO'
        };
      }
      return { error: 'sous_domaine_incoherent', message: `Sous-domaine ${sous} incompatible avec ${domaine}` };
    }
    if (SOUS_DOMAINES[storage]) {
      return {
        domaineStockage: storage,
        sousDomaine: storage,
        domaineAffiche: 'FOSPEC',
        sousDomaineAffiche: storage === 'PR' ? 'PAPR' : 'AUTO'
      };
    }
    return {
      domaineStockage: storage,
      sousDomaine: null,
      domaineAffiche: storage,
      sousDomaineAffiche: null
    };
  }

  function parseCibles(fields, domaineStockage, knownCibles) {
    const text = String(fields.cibles || '').trim();
    if (!text) return { error: 'cibles_manquantes', message: 'Cible(s) manquante(s). Séparateur officiel : |' };
    const tokens = text.split(/[|;]+/).map((s) => s.trim()).filter(Boolean);
    if (!tokens.length) return { error: 'cibles_manquantes', message: 'Cible(s) manquante(s).' };
    const resolved = [];
    for (const token of tokens) {
      const niveau = token.toUpperCase();
      const hit = (knownCibles || []).find((c) =>
        c.domaine_code === domaineStockage && String(c.niveau_code).toUpperCase() === niveau
      );
      if (!hit) {
        return { error: 'referentiel_inconnu', message: `Cible inconnue : ${domaineStockage}/${token}` };
      }
      resolved.push({
        cibleId: hit.cible_id,
        niveauCode: hit.niveau_code,
        domaineCode: hit.domaine_code
      });
    }
    return { cibles: resolved, cibleCodes: resolved.map((c) => c.niveauCode).sort().join('|') };
  }

  function parseMode(fields) {
    const raw = String(fields.mode_suivi || fields.modesuivi || 'AUTO').trim().toUpperCase();
    if (raw === 'LEGACY') {
      return { error: 'mode_legacy_interdit', message: 'LEGACY est refusé dans le format programme SCOPE.' };
    }
    if (!raw || raw === 'AUTO') return { requested: 'AUTO', explicit: false };
    if (raw === 'NOMINATIF' || raw === 'QUANTITATIF') return { requested: raw, explicit: true };
    return { error: 'mode_invalide', message: `Mode de suivi invalide : ${raw}` };
  }

  function nominatifPossible(rules, info) {
    const day = String(info.date || '').slice(0, 10);
    const covering = (rules || []).filter((row) => {
      const flag = row.nominatif_autorise;
      const flagCamel = row.nominatifAutorise;
      if (flag !== true && flag !== false && flagCamel !== true && flagCamel !== false) return false;
      const debut = String(row.date_debut || row.dateDebut || '').slice(0, 10);
      const fin = row.date_fin || row.dateFin ? String(row.date_fin || row.dateFin).slice(0, 10) : null;
      if (!debut || day < debut) return false;
      if (fin && day > fin) return false;
      return true;
    });
    const porteeRank = { CIBLE: 4, SOUS_DOMAINE: 3, DOMAINE: 2, GLOBAL: 1 };
    const scored = covering.map((row) => {
      const portee = String(row.portee || '').toUpperCase();
      let ok = false;
      if (portee === 'CIBLE' && info.cibleId && String(row.cible_id || row.cibleId) === String(info.cibleId)) ok = true;
      if (portee === 'SOUS_DOMAINE' && info.sousDomaineCode && String(row.sous_domaine_code || row.sousDomaineCode) === String(info.sousDomaineCode)) ok = true;
      if (portee === 'DOMAINE' && info.domaineCode && String(row.domaine_code || row.domaineCode) === String(info.domaineCode)) ok = true;
      if (portee === 'GLOBAL') ok = true;
      return ok ? { row, rank: porteeRank[portee] || 0 } : null;
    }).filter(Boolean).sort((a, b) => b.rank - a.rank);
    if (!scored.length) return { possible: true, source: 'DEFAUT' };
    const top = scored[0].row;
    const possible = top.nominatif_autorise !== false && top.nominatifAutorise !== false;
    return { possible, source: String(top.portee || '').toUpperCase() };
  }

  function resolveAutoMode(cibles, resolvedDomaine, date, context) {
    if (typeof context.resolveMode === 'function') {
      return context.resolveMode({ cibles, domaine: resolvedDomaine, date });
    }
    const rules = (context && context.suiviRules) || [];
    const modes = (cibles || []).map((c) => {
      const hit = nominatifPossible(rules, {
        date,
        domaineCode: resolvedDomaine.domaineStockage,
        sousDomaineCode: resolvedDomaine.sousDomaine,
        cibleId: c.cibleId
      });
      return hit.possible ? 'NOMINATIF' : 'QUANTITATIF';
    });
    const unique = [...new Set(modes)];
    if (unique.length > 1) {
      return { mode: null, arbitrate: true, reason: 'cibles_divergentes', details: modes };
    }
    return { mode: unique[0] || 'NOMINATIF', arbitrate: false, reason: unique[0] === 'NOMINATIF' ? 'suivi_nominatif_autorise' : 'nominatif_non_autorise' };
  }

  function existingMaps(context) {
    const imported = new Set(context && context.importedFingerprints ? context.importedFingerprints : []);
    const byExt = new Set();
    const byMode = new Set();
    const byIdentity = new Set();
    (context && context.evenementsExistants || []).forEach((e) => {
      const date = String(e.date || '').slice(0, 10);
      const domaine = String(e.domaine_code || e.domaineCode || '').toUpperCase();
      const sous = String(e.sous_domaine_code || e.sousDomaineCode || '').toUpperCase();
      const libelle = String(e.libelle || '').trim().toLowerCase();
      const mode = String(e.mode_suivi || e.modeSuivi || 'NOMINATIF').toUpperCase();
      const codes = (e.cibles || e.cibleCodes || [])
        .map((c) => String(c.niveau_code || c.niveauCode || c).toUpperCase())
        .filter(Boolean)
        .sort()
        .join('|');
      const ext = String(e.identifiant_externe || e.identifiantExterne || '').trim();
      if (ext) byExt.add(ext);
      const base = `nat:${date}|${domaine}|${sous}|${codes}|${libelle}`;
      byIdentity.add(base);
      byMode.add(`${base}|${mode}`);
    });
    return { imported, byExt, byMode, byIdentity };
  }

  function sha256Hex(text) {
    if (typeof require === 'function') {
      try {
        return require('crypto').createHash('sha256').update(String(text), 'utf8').digest('hex');
      } catch (_error) { /* navigateur */ }
    }
    return null;
  }

  function previewScopeImport(csvText, context) {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      return { ok: false, error: parsed.error, format: FORMAT_NATIVE, lignes: [], summary: { nbLignes: 0 } };
    }
    const format = detectCsvFormat(parsed.headers);
    if (format !== FORMAT_NATIVE) {
      return { ok: false, error: 'format_attendu_scope', format, lignes: [], summary: { nbLignes: 0 } };
    }
    const missingRequired = REQUIRED.filter((col) => !parsed.headers.includes(col));
    const lignes = [];
    const seen = new Map();
    const seenIdentity = new Map();
    const maps = existingMaps(context || {});
    const decisions = (context && context.decisions) || {};

    parsed.rows.forEach((row) => {
      const errors = [];
      const warnings = [];
      let statutCode = null;
      if (missingRequired.length) {
        errors.push({ error: 'colonnes_manquantes', message: `Colonnes obligatoires absentes : ${missingRequired.join(', ')}` });
        statutCode = 'ERREUR';
      }
      const dateInfo = normalizeDate(row.fields.date);
      if (dateInfo.error) {
        errors.push(dateInfo);
        statutCode = statutCode || 'ERREUR_DATE';
      }
      const libelle = String(row.fields.libelle || '').trim();
      if (!libelle) errors.push({ error: 'libelle_vide', message: 'Le libellé est obligatoire.' });
      const resolvedDomaine = resolveDomaine(row.fields);
      if (resolvedDomaine.error) {
        errors.push(resolvedDomaine);
        statutCode = statutCode || 'ERREUR_REFERENTIEL';
      }
      const mode = parseMode(row.fields);
      if (mode.error) {
        errors.push(mode);
        statutCode = statutCode || 'ERREUR_MODE';
      }
      let cibles = [];
      let cibleCodes = '';
      if (!resolvedDomaine.error) {
        const parsedCibles = parseCibles(row.fields, resolvedDomaine.domaineStockage, (context && context.cibles) || []);
        if (parsedCibles.error) {
          errors.push(parsedCibles);
          statutCode = statutCode || 'ERREUR_REFERENTIEL';
        } else {
          cibles = parsedCibles.cibles;
          cibleCodes = parsedCibles.cibleCodes;
        }
      }

      let modePropose = mode.requested || null;
      let autoMeta = null;
      const decision = decisions[String(row.ligneNo)] || decisions[row.ligneNo];
      if (!mode.error && !errors.length) {
        if (mode.requested === 'AUTO') {
          autoMeta = resolveAutoMode(cibles, resolvedDomaine, dateInfo.iso, context || {});
          if (autoMeta.arbitrate && !(decision && decision.mode)) {
            statutCode = 'A_ARBITRER';
            warnings.push('AUTO : les cibles proposent des modes différents. Choisissez NOMINATIF ou QUANTITATIF.');
          } else if (decision && (decision.mode === 'NOMINATIF' || decision.mode === 'QUANTITATIF')) {
            modePropose = decision.mode;
          } else {
            modePropose = autoMeta.mode;
          }
        } else if (mode.requested === 'NOMINATIF') {
          const check = nominatifPossible((context && context.suiviRules) || [], {
            date: dateInfo.iso,
            domaineCode: resolvedDomaine.domaineStockage,
            sousDomaineCode: resolvedDomaine.sousDomaine,
            cibleId: cibles[0] && cibles[0].cibleId
          });
          if (!check.possible) {
            errors.push({ error: 'nominatif_non_autorise', message: 'Le suivi nominatif n’est pas autorisé pour ce périmètre à cette date.' });
            statutCode = 'ERREUR_MODE';
          }
        }
      }

      const fp = fingerprint(row.fields, {
        date: dateInfo.iso,
        domaineStockage: resolvedDomaine.domaineStockage,
        sousDomaine: resolvedDomaine.sousDomaine || '',
        cibleCodes,
        modeFinal: modePropose || ''
      });
      if (seen.has(fp)) {
        errors.push({ error: 'doublon_fichier', message: `Doublon dans le fichier (ligne ${seen.get(fp)}).` });
        statutCode = statutCode || 'ERREUR';
      } else seen.set(fp, row.ligneNo);
      const identKey = dateInfo.iso && resolvedDomaine.domaineStockage && libelle
        ? `nat:${dateInfo.iso}|${resolvedDomaine.domaineStockage}|${resolvedDomaine.sousDomaine || ''}|${cibleCodes}|${libelle.toLowerCase()}`
        : null;
      if (identKey && seenIdentity.has(identKey) && !errors.some((e) => e.error === 'doublon_fichier')) {
        const prev = seenIdentity.get(identKey);
        if (prev.mode === modePropose) {
          errors.push({ error: 'doublon_fichier', message: `Doublon dans le fichier (ligne ${prev.ligneNo}).` });
          statutCode = statutCode || 'ERREUR';
        } else {
          errors.push({ error: 'conflit_fichier', message: `Même identité métier que la ligne ${prev.ligneNo} avec un autre mode.` });
          statutCode = 'CONFLIT';
        }
      } else if (identKey) {
        seenIdentity.set(identKey, { ligneNo: row.ligneNo, mode: modePropose });
      }

      const ext = String(row.fields.identifiant_externe || row.fields.identifiantexterne || '').trim();
      const baseId = identityWithoutMode(fp);
      let actionPrevue = 'CREER';
      if (errors.length) {
        actionPrevue = 'REFUSER';
      } else if (maps.imported.has(fp) || (ext && maps.imported.has(`ext:${ext}`))) {
        statutCode = 'DEJA_IMPORTE';
        actionPrevue = 'IGNORER_IDEMPOTENT';
      } else if (maps.byMode.has(`${baseId}|${modePropose}`) || (ext && maps.byExt.has(ext))) {
        statutCode = 'DEJA_PRESENT';
        actionPrevue = 'IGNORER_IDEMPOTENT';
      } else if (maps.byIdentity.has(baseId)) {
        statutCode = 'CONFLIT';
        actionPrevue = 'REFUSER';
        errors.push({ error: 'conflit_existant', message: 'Un exercice existe déjà avec la même identité et un autre mode.' });
      } else if (statutCode === 'A_ARBITRER') {
        actionPrevue = 'ARBITRER';
      } else {
        statutCode = 'A_CREER';
        actionPrevue = 'CREER';
      }

      const comptabilise = String(row.fields.a_comptabiliser || row.fields.comptabilise || 'oui').trim().toLowerCase();
      const comptable = !(comptabilise === 'non' || comptabilise === '0' || comptabilise === 'false');
      if (!comptable) {
        warnings.push('a_comptabiliser=non est une métadonnée programme : l’événement reste PLANIFIE ; le KPI ne l’inclut qu’après clôture.');
      }

      const statut = errors.length && !['DEJA_IMPORTE', 'DEJA_PRESENT', 'A_ARBITRER', 'CONFLIT'].includes(statutCode)
        ? (statutCode && statutCode.indexOf('ERREUR') === 0 ? statutCode : 'ERREUR')
        : statutCode;

      lignes.push({
        ligneNo: row.ligneNo,
        statut,
        statutLibelle: STATUT_LABELS[statut] || statut,
        erreurs: errors,
        avertissements: warnings,
        fingerprint: fp,
        date: dateInfo.iso || String(row.fields.date || ''),
        domaine: resolvedDomaine.domaineAffiche || row.fields.domaine,
        domaineStockage: resolvedDomaine.domaineStockage || null,
        sousDomaine: resolvedDomaine.sousDomaine || null,
        sousDomaineAffiche: resolvedDomaine.sousDomaineAffiche || null,
        cibles,
        cibleCodes,
        publicCible: cibleCodes,
        niveauCode: cibleCodes,
        libelle,
        modeDemande: mode.requested || null,
        modePropose,
        auto: autoMeta,
        typePropose: modePropose,
        comptabilise: comptable,
        remarque: row.fields.remarque || '',
        identifiantExterne: ext || null,
        actionPrevue,
        raison: errors.map((e) => e.message).concat(warnings).join(' ')
      });
    });

    const aCreer = lignes.filter((l) => l.actionPrevue === 'CREER');
    const modes = { NOMINATIF: 0, QUANTITATIF: 0 };
    aCreer.forEach((l) => {
      if (l.modePropose === 'NOMINATIF' || l.modePropose === 'QUANTITATIF') modes[l.modePropose] += 1;
    });
    const byDomaine = {};
    aCreer.forEach((l) => {
      let key = l.domaineStockage || l.domaine || '—';
      if (l.sousDomaine === 'PR') key = 'FOSPEC/PR';
      else if (l.sousDomaine === 'AUTO') key = 'FOSPEC/AUTO';
      byDomaine[key] = (byDomaine[key] || 0) + 1;
    });

    const summary = {
      nbLignes: lignes.length,
      A_CREER: aCreer.length,
      VALIDE: aCreer.length,
      ERREUR: lignes.filter((l) => String(l.statut).indexOf('ERREUR') === 0).length,
      DEJA_PRESENT: lignes.filter((l) => l.statut === 'DEJA_PRESENT').length,
      DEJA_IMPORTE: lignes.filter((l) => l.statut === 'DEJA_IMPORTE').length,
      CONFLIT: lignes.filter((l) => l.statut === 'CONFLIT').length,
      A_ARBITRER: lignes.filter((l) => l.statut === 'A_ARBITRER').length,
      aCreer: aCreer.length,
      dejaExistants: lignes.filter((l) => l.actionPrevue === 'IGNORER_IDEMPOTENT').length,
      modes,
      byDomaine
    };

    const tokenPayload = JSON.stringify({
      format: FORMAT_NATIVE,
      lignes: lignes.map((l) => ({ n: l.ligneNo, fp: l.fingerprint, st: l.statut, mode: l.modePropose })),
      imported: [...maps.imported].sort(),
      existing: [...maps.byMode].sort()
    });

    return {
      ok: summary.ERREUR === 0 && summary.CONFLIT === 0 && summary.A_ARBITRER === 0,
      format: FORMAT_NATIVE,
      profil: FORMAT_NATIVE,
      colonnes: COLUMNS,
      previewSeule: false,
      commitTransactionnel: true,
      ecriture: false,
      previewToken: sha256Hex(tokenPayload) || tokenPayload.slice(0, 64),
      lignes,
      summary
    };
  }

  return {
    COLUMNS,
    REQUIRED,
    FORMAT_NATIVE,
    FORMAT_F7,
    STATUT_LABELS,
    previewScopeImport,
    fingerprint,
    resolveDomaine,
    detectCsvFormat,
    detectCsvFormatFromText,
    parseCsv,
    normalizeDate,
    sha256Hex
  };
});
