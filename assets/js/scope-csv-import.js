/* SCOPE-DATA-5 — parsing / normalisation / validation CSV exercices.
   Module partagé Node + navigateur. Aucune écriture PostgreSQL ici. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeCsvImport = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_COLUMNS = [
    'date_exercice', 'domaine', 'public_cible', 'modele', 'a_comptabiliser',
    'nb_convoques', 'nb_permutation',
    'nb_ext_dap_y1', 'nb_ext_dap_y2', 'nb_ext_dap_y3', 'nb_ext_dap_y4', 'nb_ext_dap_total',
    'nb_presents',
    'nb_excuses_maladie', 'nb_excuses_accident', 'nb_excuses_professionnel', 'nb_excuses_prive',
    'nb_excuses_total', 'nb_absents_non_excuses', 'total_detail', 'total_attendu', 'remarque'
  ];

  const NUMERIC_COLUMNS = REQUIRED_COLUMNS.filter((name) => name.startsWith('nb_') || name.startsWith('total_'));

  const DOMAINES_CONNUS = ['FOBA', 'FOCA', 'DPS', 'DAP', 'PR', 'AUTO', 'FOSPEC', 'JSP'];

  /* Normalisation EXPLICITE public_cible → niveau_code. Pas de fuzzy matching. */
  const PUBLIC_CIBLE_MAP = {
    'FOBA|FOBA 1': '1',
    'FOBA|FOBA 2': '2',
    'FOBA|FOBA 3': '3',
    'FOBA|1': '1',
    'FOBA|2': '2',
    'FOBA|3': '3',
    'DAP|Y1': 'Y1',
    'DAP|Y2': 'Y2',
    'DAP|Y3': 'Y3',
    'DAP|Y4': 'Y4',
    'DPS|G1': 'G1',
    'DPS|C1': 'C1',
    'DPS|B1': 'B1',
    'DPS|B2': 'B2',
    'FOCA|GEN': 'GEN',
    'FOCA|FOCA': 'GEN',
    'PR|G1': 'G1',
    'PR|C1': 'C1',
    'PR|B1': 'B1',
    'PR|B2': 'B2',
    'PR|GEN': 'GEN',
    'AUTO|VL': 'VL',
    'AUTO|PL': 'PL',
    'FOSPEC|GEN': 'GEN',
    'FOSPEC|FOSPEC': 'GEN',
    'JSP|G1': 'G1',
    'JSP|C1': 'C1',
    'JSP|B1': 'B1',
    'JSP|CAD': 'CAD',
    'JSP|GEN': 'GEN'
  };

  const MAX_CSV_CHARS = 512 * 1024;
  const MAX_LIGNES = 2000;

  function sha256Hex(text) {
    if (typeof require === 'function') {
      try {
        return require('crypto').createHash('sha256').update(String(text), 'utf8').digest('hex');
      } catch (_error) { /* navigateur */ }
    }
    return null;
  }

  function splitSemicolon(line) {
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
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';') {
        out.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out;
  }

  function stripBom(text) {
    return String(text || '').replace(/^\uFEFF/, '');
  }

  function parseExercicesCsv(text) {
    const raw = stripBom(text);
    if (!raw.trim()) {
      return { ok: false, error: 'csv_vide', message: 'Fichier CSV vide.', separator: ';', encoding: 'utf-8', header: [], rows: [] };
    }
    if (raw.length > MAX_CSV_CHARS) {
      return { ok: false, error: 'csv_trop_volumineux', message: 'Fichier CSV trop volumineux.', separator: ';', encoding: 'utf-8', header: [], rows: [] };
    }
    const lines = raw.split(/\r?\n/).filter((line, index, all) => line.length > 0 || index < all.length - 1);
    const nonempty = lines.filter((line) => String(line).trim().length > 0);
    if (!nonempty.length) {
      return { ok: false, error: 'csv_vide', message: 'Fichier CSV vide.', separator: ';', encoding: 'utf-8', header: [], rows: [] };
    }
    const headerLine = nonempty[0];
    const separator = headerLine.includes(';') ? ';' : (headerLine.includes(',') ? ',' : ';');
    if (separator !== ';') {
      return {
        ok: false,
        error: 'separateur_inattendu',
        message: 'Le séparateur attendu est le point-virgule (;).',
        separator,
        encoding: 'utf-8',
        header: [],
        rows: []
      };
    }
    const header = splitSemicolon(headerLine).map((h) => h.trim());
    const v67Markers = ['date_evenement', 'stat_com', 'nb_excuses_armee', 'formateurs_nb'];
    if (v67Markers.some((col) => header.includes(col))) {
      return {
        ok: false,
        error: 'profil_csv_non_supporte',
        message: 'Format export Monitoring F7 v67 actuel non supporté par le profil monitoring_exercices_sdis_22cols. Un parser dédié sera requis plus tard. Aucun mélange silencieux.',
        separator,
        encoding: 'utf-8',
        header,
        rows: []
      };
    }
    const missing = REQUIRED_COLUMNS.filter((col) => !header.includes(col));
    const extra = header.filter((col) => col && !REQUIRED_COLUMNS.includes(col));
    const dataLines = nonempty.slice(1);
    if (dataLines.length > MAX_LIGNES) {
      return {
        ok: false,
        error: 'trop_de_lignes',
        message: `Plus de ${MAX_LIGNES} lignes de données.`,
        separator,
        encoding: 'utf-8',
        header,
        rows: []
      };
    }
    const rows = dataLines.map((line, index) => {
      const values = splitSemicolon(line);
      const record = {};
      header.forEach((col, i) => { record[col] = values[i] == null ? '' : String(values[i]); });
      return { ligneNo: index + 1, raw: line, record, nColonnes: values.length };
    });
    return {
      ok: missing.length === 0,
      error: missing.length ? 'colonnes_manquantes' : null,
      message: missing.length ? `Colonnes manquantes : ${missing.join(', ')}.` : null,
      separator,
      encoding: 'utf-8',
      header,
      missing,
      extra,
      rows
    };
  }

  function parseDateExercice(value) {
    const text = String(value || '').trim();
    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/) || text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return null;
  }

  function parseOuiNon(value) {
    const text = String(value || '').trim().toLowerCase();
    if (['oui', 'yes', 'true', '1'].includes(text)) return true;
    if (['non', 'no', 'false', '0'].includes(text)) return false;
    return null;
  }

  function parseIntField(value) {
    const text = String(value == null ? '' : value).trim();
    if (text === '') return { ok: true, value: 0, empty: true };
    if (!/^-?\d+$/.test(text)) return { ok: false, value: null, empty: false };
    return { ok: true, value: Number(text), empty: false };
  }

  function normalizePublicCible(domaine, publicCible) {
    const key = `${String(domaine || '').trim().toUpperCase()}|${String(publicCible || '').trim().replace(/\s+/g, ' ')}`;
    if (Object.prototype.hasOwnProperty.call(PUBLIC_CIBLE_MAP, key)) return PUBLIC_CIBLE_MAP[key];
    return null;
  }

  function fingerprintLine(canonical) {
    const payload = JSON.stringify(canonical);
    return sha256Hex(payload) || payload;
  }

  function round1(value) {
    if (value == null || !Number.isFinite(Number(value))) return null;
    return Math.round(Number(value) * 10) / 10;
  }

  function legacyTaux(numbers) {
    const presents = Number(numbers && numbers.nb_presents);
    const attendu = Number(numbers && (numbers.total_attendu || numbers.nb_convoques));
    if (!Number.isFinite(presents) || !Number.isFinite(attendu) || attendu <= 0) return null;
    return round1((100 * presents) / attendu);
  }

  const IMPORT_PROFIL = 'monitoring_exercices_sdis_22cols';

  function toIsoDate(value) {
    if (value == null || value === '') return '';
    if (Object.prototype.toString.call(value) === '[object Date]' && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    const text = String(value);
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  function normalizeRegle(row) {
    if (!row) return null;
    const portee = String(row.portee || '').toUpperCase();
    return {
      regle_id: row.regle_id || row.regleId || null,
      portee,
      cible_id: row.cible_id || row.cibleId || null,
      domaine_code: row.domaine_code || row.domaineCode || null,
      date_bascule: toIsoDate(row.date_bascule || row.dateBascule)
    };
  }

  function resolveBasculeRule(cibleId, domaine, rules) {
    const list = (rules || []).map(normalizeRegle).filter((r) => r && r.date_bascule);
    const cible = list.find((r) => r.portee === 'CIBLE' && r.cible_id && r.cible_id === cibleId);
    if (cible) return Object.assign({ source: 'CIBLE' }, cible);
    const domaineRule = list.find((r) => r.portee === 'DOMAINE' && r.domaine_code === domaine);
    if (domaineRule) return Object.assign({ source: 'DOMAINE' }, domaineRule);
    const global = list.find((r) => r.portee === 'GLOBAL');
    if (global) return Object.assign({ source: 'GLOBAL' }, global);
    return null;
  }

  function earliestNominativeHorizon(rules) {
    const dates = (rules || [])
      .map(normalizeRegle)
      .map((r) => r && r.date_bascule)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    return dates[0] || null;
  }

  /* Classification explicite :
     1) règle cible > domaine > globale → LEGACY si date < bascule, sinon PLANIFIE
     2) sinon, si une bascule nominative existe ailleurs et date < min(règles)
        → LEGACY historique (horizon dérivé des règles seedées, pas une règle inventée pour cette cible)
     3) sinon → ERREUR bascule_non_definie
     L’absence de règle ne transforme jamais à elle seule un événement en LEGACY. */
  function classifyType(dateIso, domaine, cibleId, rules) {
    const resolved = resolveBasculeRule(cibleId, domaine, rules);
    const horizon = earliestNominativeHorizon(rules);
    if (resolved) {
      if (dateIso < resolved.date_bascule) {
        return {
          typePropose: 'LEGACY',
          statut: 'VALIDE',
          code: 'legacy',
          raison: `Date ${dateIso} antérieure à la bascule nominative ${resolved.date_bascule} (règle ${resolved.source}).`,
          bascule: { resolved, horizonNominatifConnu: horizon }
        };
      }
      return {
        typePropose: 'PLANIFIE',
        statut: 'VALIDE',
        code: 'planifie',
        raison: `Date ${dateIso} postérieure ou égale à la bascule nominative ${resolved.date_bascule} (règle ${resolved.source}). Agrégats CSV non utilisés comme vérité nominative.`,
        bascule: { resolved, horizonNominatifConnu: horizon }
      };
    }
    if (horizon && dateIso < horizon) {
      return {
        typePropose: 'LEGACY',
        statut: 'VALIDE',
        code: 'legacy_avant_horizon_nominatif',
        raison: `Cible non qualifiée nominativement (aucune règle cible/domaine/globale). Date ${dateIso} antérieure à l’horizon nominatif connu ${horizon} (minimum des règles seedées, pas une bascule inventée pour cette cible). Import LEGACY agrégé uniquement.`,
        bascule: { resolved: null, horizonNominatifConnu: horizon }
      };
    }
    return {
      typePropose: null,
      statut: 'ERREUR',
      code: 'bascule_non_definie',
      raison: horizon
        ? `Cible non qualifiée nominativement. Date ${dateIso} postérieure ou égale à l’horizon nominatif connu ${horizon}. Ni PLANIFIE ni LEGACY silencieux.`
        : 'Aucune règle de bascule nominative n’est définie. Impossible de classer cette ligne.',
      bascule: { resolved: null, horizonNominatifConnu: horizon }
    };
  }

  function buildPreviewRows(parsed, context) {
    const domaines = (context && context.domaines) || [];
    const cibles = (context && context.cibles) || [];
    const rules = (context && context.rules) || (context && context.rulesByDomaine) || [];
    const existingEvents = (context && context.existingEvents) || [];
    const importedFingerprints = new Set((context && context.importedFingerprints) || []);

    const domaineSet = new Set(domaines.map((d) => d.code));
    const warningsGlobaux = [];
    const seenFingerprints = new Set();
    if (parsed.extra && parsed.extra.length) {
      warningsGlobaux.push(`Colonnes supplémentaires ignorées : ${parsed.extra.join(', ')}.`);
    }

    const lines = parsed.rows.map((row) => {
      const record = row.record;
      const issues = [];
      const warnings = [...warningsGlobaux];
      const numbers = {};

      if (row.nColonnes !== parsed.header.length) {
        issues.push({ code: 'colonnes_incompletes', niveau: 'ERREUR', message: `Nombre de colonnes (${row.nColonnes}) différent de l’en-tête (${parsed.header.length}).` });
      }

      const dateIso = parseDateExercice(record.date_exercice);
      if (!dateIso) {
        issues.push({ code: 'date_invalide', niveau: 'ERREUR', message: `Date invalide : ${record.date_exercice || '(vide)'}.` });
      }

      const domaine = String(record.domaine || '').trim().toUpperCase();
      if (!domaineSet.has(domaine) || !DOMAINES_CONNUS.includes(domaine)) {
        issues.push({ code: 'domaine_inconnu', niveau: 'ERREUR', message: `Domaine inconnu : ${record.domaine || '(vide)'}. Aucune création automatique.` });
      }

      const publicRaw = String(record.public_cible || '').trim().replace(/\s+/g, ' ');
      let niveauCode = null;
      let cible = null;
      if (domaineSet.has(domaine)) {
        niveauCode = normalizePublicCible(domaine, publicRaw);
        if (!niveauCode) {
          issues.push({ code: 'cible_inconnue', niveau: 'ERREUR', message: `Cible inconnue pour ${domaine} : ${publicRaw || '(vide)'}. Aucune création automatique.` });
        } else {
          cible = cibles.find((c) => c.domaine_code === domaine && c.niveau_code === niveauCode && c.actif !== false) || null;
          if (!cible) {
            issues.push({ code: 'cible_inconnue', niveau: 'ERREUR', message: `Cible ${domaine}/${niveauCode} absente du référentiel SCOPE.` });
          }
        }
      }

      const libelle = String(record.modele || '').trim();
      if (!libelle) {
        issues.push({ code: 'libelle_vide', niveau: 'ERREUR', message: 'Le champ modele (libellé) est vide.' });
      }

      const aComptabiliser = parseOuiNon(record.a_comptabiliser);
      if (aComptabiliser == null) {
        issues.push({ code: 'a_comptabiliser_invalide', niveau: 'ERREUR', message: `a_comptabiliser invalide : ${record.a_comptabiliser || '(vide)'}.` });
      }

      NUMERIC_COLUMNS.forEach((col) => {
        const parsedNum = parseIntField(record[col]);
        if (!parsedNum.ok) {
          issues.push({ code: 'entier_invalide', niveau: 'ERREUR', message: `${col} n’est pas un entier : ${record[col]}.` });
        } else {
          numbers[col] = parsedNum.value;
          if (parsedNum.empty) warnings.push(`${col} vide, interprété comme 0.`);
        }
      });

      if (numbers.nb_ext_dap_y1 != null) {
        const sumExt = numbers.nb_ext_dap_y1 + numbers.nb_ext_dap_y2 + numbers.nb_ext_dap_y3 + numbers.nb_ext_dap_y4;
        if (numbers.nb_ext_dap_total !== sumExt) {
          warnings.push(`nb_ext_dap_total=${numbers.nb_ext_dap_total} ≠ somme Y1–Y4 ${sumExt}. Valeur source conservée.`);
        }
      }
      if (numbers.nb_excuses_maladie != null) {
        const sumExc = numbers.nb_excuses_maladie + numbers.nb_excuses_accident + numbers.nb_excuses_professionnel + numbers.nb_excuses_prive;
        if (numbers.nb_excuses_total !== sumExc) {
          warnings.push(`nb_excuses_total=${numbers.nb_excuses_total} ≠ somme des motifs ${sumExc}. Valeur source conservée.`);
        }
      }
      if (numbers.nb_presents != null && numbers.nb_excuses_total != null && numbers.nb_absents_non_excuses != null) {
        const recomposed = numbers.nb_presents + numbers.nb_excuses_total + numbers.nb_absents_non_excuses;
        if (numbers.total_detail !== recomposed) {
          warnings.push(`total_detail=${numbers.total_detail} ≠ présents+excusés+absents ${recomposed}. Valeur source conservée.`);
        }
      }
      if (numbers.total_detail != null && numbers.total_attendu != null && numbers.total_detail !== numbers.total_attendu) {
        warnings.push(`total_detail=${numbers.total_detail} ≠ total_attendu=${numbers.total_attendu}. Écart historique conservé tel quel, sans reconstruction nominative.`);
      }

      const canonical = {
        date_exercice: dateIso || String(record.date_exercice || ''),
        domaine,
        public_cible: publicRaw,
        modele: libelle,
        a_comptabiliser: aComptabiliser,
        ...numbers,
        remarque: String(record.remarque || '').replace(/^""$/, '').trim()
      };
      const fingerprint = fingerprintLine(canonical);
      if (seenFingerprints.has(fingerprint)) {
        issues.push({ code: 'doublon_fichier', niveau: 'ERREUR', message: 'Ligne dupliquée dans le fichier (même empreinte).' });
      }
      seenFingerprints.add(fingerprint);

      let classification = { typePropose: null, statut: 'ERREUR', code: 'invalide', raison: 'Ligne invalide.' };
      if (!issues.some((i) => i.niveau === 'ERREUR')) {
        classification = classifyType(dateIso, domaine, cible ? cible.cible_id : null, Array.isArray(rules) ? rules : []);
      } else {
        classification = {
          typePropose: null,
          statut: 'ERREUR',
          code: issues[0].code,
          raison: issues.map((i) => i.message).join(' ')
        };
      }

      if (importedFingerprints.has(fingerprint)) {
        warnings.push('Ligne déjà importée (même empreinte). Un nouvel import ne recréera pas l’événement.');
      }

      const sameBusiness = existingEvents.filter((ev) => (
        ev.date === dateIso
        && ev.domaine_code === domaine
        && String(ev.libelle || '').trim() === libelle
      ));
      if (sameBusiness.length && !importedFingerprints.has(fingerprint)) {
        warnings.push('Événement potentiellement existant (date + domaine + libellé). Pas d’UPSERT automatique.');
      }

      const statut = classification.statut === 'ERREUR'
        ? 'ERREUR'
        : (warnings.length ? 'AVERTISSEMENT' : 'VALIDE');

      let actionPrevue = 'AUCUNE';
      if (importedFingerprints.has(fingerprint)) actionPrevue = 'IGNORER_DEJA_IMPORTE';
      else if (statut === 'ERREUR') actionPrevue = 'BLOQUER';
      else if (classification.typePropose === 'LEGACY') actionPrevue = 'CREER_LEGACY';
      else if (classification.typePropose === 'PLANIFIE') actionPrevue = 'CREER_PLANIFIE';

      return {
        ligneNo: row.ligneNo,
        source: record,
        date: dateIso,
        domaine,
        publicCible: publicRaw,
        niveauCode,
        cibleId: cible ? cible.cible_id : null,
        cibleLibelle: cible ? cible.libelle : null,
        libelle,
        aComptabiliser,
        typePropose: classification.typePropose,
        statut,
        code: classification.code,
        raison: [classification.raison, ...warnings].filter(Boolean).join(' '),
        actionPrevue,
        fingerprint,
        numbers,
        groupingKey: dateIso && domaine && libelle ? `${dateIso}|${domaine}|${libelle}` : null,
        groupingAArbitrer: false,
        groupingNonFusionne: false,
        dejaImporte: importedFingerprints.has(fingerprint),
        evenementPotentiel: sameBusiness.map((ev) => ev.evenement_id),
        bascule: classification.bascule || null,
        profil: IMPORT_PROFIL,
        issues,
        warnings
      };
    });

    const groups = new Map();
    lines.forEach((line) => {
      if (!line.groupingKey) return;
      const list = groups.get(line.groupingKey) || [];
      list.push(line);
      groups.set(line.groupingKey, list);
    });
    groups.forEach((list) => {
      const ciblesDistinctes = new Set(list.map((l) => l.niveauCode).filter(Boolean));
      if (list.length > 1 && ciblesDistinctes.size > 1) {
        list.forEach((line) => {
          line.groupingAArbitrer = false;
          line.groupingNonFusionne = true;
          line.warnings.push('Mêmes date, domaine et modèle, cibles distinctes : lignes conservées comme événements distincts. Fusion automatique uniquement si un identifiant de groupe explicite est fourni par le fichier source. Jamais sur la seule base date + domaine + modèle.');
          if (line.statut !== 'ERREUR') line.statut = 'AVERTISSEMENT';
          line.raison = `${line.raison} Événements distincts (pas de fusion automatique).`.trim();
          if (line.actionPrevue === 'CREER_LEGACY' || line.actionPrevue === 'CREER_PLANIFIE') {
            line.actionPrevue = `${line.actionPrevue}_DISTINCT`;
          }
        });
      }
    });

    return lines;
  }

  function summarizePreview(lignes) {
    const counts = { VALIDE: 0, AVERTISSEMENT: 0, ERREUR: 0 };
    lignes.forEach((l) => { counts[l.statut] = (counts[l.statut] || 0) + 1; });
    return {
      nbLignes: lignes.length,
      ...counts,
      peutCommit: counts.ERREUR === 0 && lignes.length > 0
    };
  }

  return {
    REQUIRED_COLUMNS,
    PUBLIC_CIBLE_MAP,
    DOMAINES_CONNUS,
    IMPORT_PROFIL,
    MAX_CSV_CHARS,
    parseExercicesCsv,
    parseDateExercice,
    parseOuiNon,
    normalizePublicCible,
    fingerprintLine,
    resolveBasculeRule,
    earliestNominativeHorizon,
    classifyType,
    buildPreviewRows,
    summarizePreview,
    legacyTaux,
    sha256Hex
  };
});
