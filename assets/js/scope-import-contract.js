/* SCOPE-EVENT-IMPORT-1 — format SCOPE_EXERCICES_CSV_1 (preview + writer).
   Le commit PostgreSQL est dans _scope-service. Ce module ne écrit pas. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeImportContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FORMAT_NATIVE = 'SCOPE_EXERCICES_CSV_1';
  const FORMAT_STANDARD = 'SCOPE_EVENT_STANDARD_CSV_1';
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
  const STANDARD_COLUMNS = {
    obligatoires: ['code_cours', 'date', 'evenement', 'qui', 'stat_com', 'public_cible'],
    optionnelles: ['debut', 'fin', 'domaine', 'sous_domaine', 'responsable', 'salle'],
    informatives: ['semaine', 'jour', 'monitoring', 'code_exercice'],
    ignorees: []
  };
  const DOMAINES_CONNUS = ['FOBA', 'FOCA', 'DPS', 'DAP', 'PR', 'AUTO', 'FOSPEC', 'JSP'];
  const DOMAINES_TERRITORIAUX = ['DPS', 'DAP', 'JSP'];
  const TARGET_CODES = {
    DPS: ['G1', 'C1', 'B1', 'B2'],
    DAP: ['Y1', 'Y2', 'Y3', 'Y4'],
    JSP: ['G1', 'C1', 'B1', 'CAD']
  };
  const STAT_COM_REFERENTIEL = Object.freeze([
    '014B1', '012B1', '014B2', '012B2', '014C1', '012C1',
    'CECA', 'CFSSP', 'CDIV',
    '010FOBC', '010FOBA', '010JSP', '011PR',
    '014G1', '012G1',
    '0151F7', '0152F7', '01521F7', '01522F7', '0153F7', '0154F7', '0155F7',
    '0161F7', '0162F7', '0163F7', '0164F7', '0165F7', '0166F7', '0167F7', '0168F7',
    '0171F7', '0172F7', '0173F7', '0174F7', '0175F7', '0170F7',
    '0120F7', '0130F7', '070F7'
  ]);
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
    AVERTISSEMENT: 'Avertissement',
    NEW_EVENT: 'Nouveau',
    EXACT_MATCH: 'Identique',
    DIVERGENCE: 'Divergence',
    PROBABLE_MATCH: 'Probable',
    REVIEW_REQUIRED: 'À contrôler'
  };

  function normalizeHeader(name) {
    const key = String(name || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');
    if (key === 'code_cours' || key === 'code_cour' || key === 'code') return 'code_cours';
    if (key === 'date_evenement' || key === 'date_exercice') return key;
    if (key === 'debut' || key === 'heure_debut') return 'debut';
    if (key === 'fin' || key === 'heure_fin') return 'fin';
    if (key === 'evenement' || key === 'modele' || key === 'libelle') return key === 'modele' ? 'modele' : key;
    if (key === 'stat_com' || key === 'stat_com_') return 'stat_com';
    if (key === 'public' || key === 'population' || key === 'populations') return 'public_cible';
    if (key === 'comptabilise') return 'a_comptabiliser';
    if (key === 'cible' || key === 'public_cible') return 'public_cible';
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
    const standard = has('code_cours') && (has('date') || has('date_evenement')) && (has('evenement') || has('modele') || has('libelle'));
    const native = has('date') && has('domaine') && (has('libelle') || has('cibles'));
    if (standard) return FORMAT_STANDARD;
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
    const shortLocal = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2})$/);
    if (shortLocal) {
      const year = Number(shortLocal[3]);
      const fullYear = year >= 70 ? 1900 + year : 2000 + year;
      const iso = `${fullYear}-${String(shortLocal[2]).padStart(2, '0')}-${String(shortLocal[1]).padStart(2, '0')}`;
      if (validIsoDate(iso)) return { iso, original: text };
    }
    return { error: 'date_invalide', message: 'Date invalide. Formats acceptés : JJ.MM.AA, JJ.MM.AAAA ou AAAA-MM-JJ.' };
  }

  function normalizeLabelForMatch(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeTime(raw) {
    const text = String(raw || '').trim();
    if (!text) return '';
    const m = text.match(/^(\d{1,2})[h:.]?(\d{2})?$/i);
    if (!m) return text;
    return `${String(m[1]).padStart(2, '0')}:${String(m[2] || '00').padStart(2, '0')}`;
  }

  function normalizeCodeComponent(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }

  function normalizeStatCom(value) {
    return normalizeCodeComponent(value).replace(/\.+$/, '');
  }

  function normalizeQui(value) {
    return normalizeCodeComponent(value).replace(/^\.+|\.+$/g, '');
  }

  function normalizeQuiDomain(value) {
    const raw = String(value || '').trim().toUpperCase();
    const parts = raw.split('/').map((p) => normalizeQui(p)).filter(Boolean);
    const compact = normalizeQui(raw);
    if (parts.includes('AUTO') || compact === 'FOSPECAUTO') return 'AUTO';
    if (parts.includes('PR') || parts.includes('PAPR') || compact === 'FOSPECPR' || compact === 'FOSPECPAPR') return 'PR';
    if (compact === 'PAPR') return 'PR';
    if (DOMAINES_CONNUS.includes(compact)) return compact;
    return compact;
  }

  function buildCodeCours(statCom, qui, suffix) {
    const stat = normalizeStatCom(statCom);
    const who = normalizeQui(qui);
    const end = normalizeCodeComponent(suffix);
    return `${stat}${who}.${end}`;
  }

  /* Planning annuel : CODE = STAT.COM + '.' + numéro de ligne (ex. 010JB1.445, 073F56.5).
     Forme SCOPE avec QUI : STAT.COM + QUI + '.' + numéro (ex. 010JB1JSP.445).
     010JB1 seul est le STAT.COM / la cible, pas l’identité événement. */

  function splitCompactCodePrefix(prefix) {
    const text = normalizeCodeComponent(prefix).replace(/\.+$/, '');
    if (!text) return null;
    const knownQui = [
      ...Object.values(TARGET_CODES).flat(),
      ...DOMAINES_CONNUS,
      'FOBA', 'FOCA', 'PAPR', 'AUTO', 'VL', 'PL'
    ]
      .map((code) => normalizeQui(code))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    for (const candidate of knownQui) {
      if (!text.endsWith(candidate) || text.length <= candidate.length) continue;
      return { statCom: text.slice(0, -candidate.length), qui: candidate };
    }
    return null;
  }

  function splitCodeCours(codeCours, explicitStatCom, explicitQui) {
    const code = String(codeCours || '').trim();
    const parts = code.split('.').filter((p) => p !== '');
    const suffix = parts.length ? parts[parts.length - 1] : '';
    const compact = !explicitStatCom && !explicitQui && parts.length === 2 ? splitCompactCodePrefix(parts[0]) : null;
    const qui = normalizeQui(explicitQui || (compact && compact.qui) || (parts.length >= 2 ? parts[parts.length - 2] : ''));
    const stat = normalizeStatCom(explicitStatCom || (compact && compact.statCom) || (parts.length >= 3 ? parts.slice(0, -2).join('.') : (parts.length >= 2 ? parts[0] : '')));
    return { statCom: stat, qui, suffix, normalized: stat && qui && suffix ? buildCodeCours(stat, qui, suffix) : code };
  }

  function fingerprint(fields, resolved) {
    const ext = String(fields.internal_event_id || fields.identifiant_externe || fields.identifiantexterne || '').trim();
    if (ext) return `ext:${ext}`;
    const codeCours = String(fields.code_cours || '').trim();
    if (codeCours) return `code:${codeCours}`;
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
    const text = String(fields.cibles || fields.public_cible || '').trim();
    if (!text) return { error: 'cibles_manquantes', message: 'Cible(s) manquante(s). Séparateur officiel : |' };
    const tokens = text.split(/[|;]+/).map((s) => s.trim()).filter(Boolean);
    if (!tokens.length) return { error: 'cibles_manquantes', message: 'Cible(s) manquante(s).' };
    const resolved = [];
    for (const token of tokens) {
      const niveauInfo = resolveTargetCode(domaineStockage, token, fields);
      if (niveauInfo.error) return niveauInfo;
      const niveau = niveauInfo.niveauCode;
      const hit = (knownCibles || []).find((c) =>
        c.domaine_code === domaineStockage && String(c.niveau_code).toUpperCase() === niveau
      );
      if (!hit) {
        return { error: 'referentiel_inconnu', message: `Cible inconnue : ${domaineStockage}/${token}` };
      }
      resolved.push({
        cibleId: hit.cible_id,
        niveauCode: hit.niveau_code,
        domaineCode: hit.domaine_code,
        libelle: hit.libelle
      });
    }
    return { cibles: resolved, cibleCodes: resolved.map((c) => c.niveauCode).sort().join('|') };
  }

  function resolveTargetCode(domaineStockage, token, fields) {
    const domaine = String(domaineStockage || '').trim().toUpperCase();
    const direct = normalizeTargetCode(domaine, token);
    if (DOMAINES_TERRITORIAUX.includes(domaine) && direct === domaine) {
      return { niveauCode: 'GEN', global: true };
    }
    return { niveauCode: direct, inferred: false };
  }

  function inferTerritorialTargetCode(domaineStockage, fields) {
    const domaine = String(domaineStockage || '').trim().toUpperCase();
    const allowed = TARGET_CODES[domaine] || [];
    if (!allowed.length) return null;
    const source = [
      fields.code_cours,
      fields.codeCours,
      fields.stat_com,
      fields.statCom,
      fields.code_source,
      fields.codeSource
    ].map(normalizeCodeComponent).filter(Boolean).join(' ');
    const hits = allowed.filter((code) => new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`).test(source)
      || source.includes(code + domaine)
      || source.includes(domaine + code)
      || source.includes(code));
    const unique = [...new Set(hits)];
    return unique.length === 1 ? unique[0] : null;
  }

  function normalizeTargetCode(domaineStockage, token) {
    const domaine = String(domaineStockage || '').trim().toUpperCase();
    let text = String(token || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
    const compact = text.replace(/[^A-Z0-9]+/g, '');
    if (domaine === 'JSP') {
      if (compact === 'JSP') return 'JSP';
      if (compact === 'JSPG1') return 'G1';
      if (compact === 'JSPC1') return 'C1';
      if (compact === 'JSPB1') return 'B1';
      if (compact === 'JSPCAD') return 'CAD';
    }
    if (domaine === 'FOBA') {
      if (compact === 'FOBA1') return '1';
      if (compact === 'FOBA2') return '2';
      if (compact === 'FOBA3') return '3';
    }
    if (domaine === 'PR') {
      if (compact === 'PAPR' || compact === 'PR') return 'GEN';
      if (compact === 'PAPRG1') return 'G1';
      if (compact === 'PAPRC1') return 'C1';
      if (compact === 'PAPRB1') return 'B1';
      if (compact === 'PAPRB2') return 'B2';
    }
    if (domaine === 'DPS') {
      if (compact === 'DPS') return 'DPS';
      if (compact === 'DPSG1') return 'G1';
      if (compact === 'DPSC1') return 'C1';
      if (compact === 'DPSB1') return 'B1';
      if (compact === 'DPSB2') return 'B2';
    }
    if (domaine === 'DAP') {
      if (compact === 'DAP') return 'DAP';
      if (compact === 'DAPY1') return 'Y1';
      if (compact === 'DAPY2') return 'Y2';
      if (compact === 'DAPY3') return 'Y3';
      if (compact === 'DAPY4') return 'Y4';
    }
    if (domaine === 'AUTO') {
      if (compact === 'CONDVL' || compact === 'AUTOVL' || compact === 'CONDVLDPS' || compact === 'CONDVLAUTO') return 'VL';
      if (compact === 'CONDPL' || compact === 'AUTOPL' || compact === 'CONDPLDPS' || compact === 'CONDPLAUTO') return 'PL';
    }
    return compact;
  }

  function isTerritorialStandardEvent(info) {
    const domaine = String(info && info.domaineStockage || '').toUpperCase();
    if (!DOMAINES_TERRITORIAUX.includes(domaine)) return false;
    const quiDomain = normalizeQuiDomain(info.quiSource || info.qui || '');
    if (DOMAINES_TERRITORIAUX.includes(quiDomain)) return true;
    const cibleCodes = String(info.cibleCodes || '').split('|').filter(Boolean);
    const allowed = TARGET_CODES[domaine] || [];
    return cibleCodes.length > 0 && cibleCodes.every((code) => allowed.includes(code));
  }

  function standardGroupingKey(parts) {
    const territorial = isTerritorialStandardEvent(parts);
    return [
      parts.statCom || '',
      parts.qui || '',
      parts.date || '',
      parts.normalizedLabel || '',
      parts.heureDebut || '',
      parts.heureFin || '',
      territorial ? `territorial:${parts.cibleCodes || ''}:${parts.codeCours || ''}` : 'specialisation'
    ].join('|');
  }

  function displayTargetLabel(domaineStockage, cibleCodes, cibles) {
    const domaine = String(domaineStockage || '').toUpperCase();
    const codes = String(cibleCodes || '').split('|').filter(Boolean);
    if (codes.length === 1 && codes[0] === 'GEN') {
      if (domaine === 'DPS') return 'Tous les DPS';
      if (domaine === 'DAP') return 'Tous les DAP';
      if (domaine === 'JSP') return 'Tout le personnel JSP';
    }
    const rows = Array.isArray(cibles) ? cibles : [];
    if (rows.length) {
      return rows
        .slice()
        .sort((a, b) => String(a.niveauCode || '').localeCompare(String(b.niveauCode || ''), 'fr'))
        .map((c) => {
          const niveau = String(c.niveauCode || '').toUpperCase();
          if (domaine === 'AUTO' && niveau === 'PL') return 'Cond PL';
          if (domaine === 'AUTO' && niveau === 'VL') return 'Cond VL';
          if (domaine === 'FOBA') return c.libelle || `FOBA ${niveau}`;
          if (domaine === 'FOCA') return c.libelle || (niveau === 'GEN' ? 'FOCA' : niveau);
          if (domaine === 'PR') return c.libelle || (niveau === 'GEN' ? 'PAPR' : `PAPR ${niveau}`);
          return c.libelle || niveau;
        })
        .filter(Boolean)
        .join(' · ');
    }
    return codes.join(' · ');
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
    const byCodeCours = new Map();
    const byBusiness = new Map();
    const byBusinessLite = new Map();
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
      const codeCours = String(e.code_cours || e.codeCours || '').trim();
      const codeParts = splitCodeCours(codeCours, e.stat_com || e.statCom, e.qui);
      if (ext) byExt.add(ext);
      if (codeCours) byCodeCours.set(codeCours, e);
      const base = `nat:${date}|${domaine}|${sous}|${codes}|${libelle}`;
      byIdentity.add(base);
      byMode.add(`${base}|${mode}`);
      const business = [
        date,
        domaine,
        sous,
        normalizeLabelForMatch(e.libelle),
        String(e.heure_debut || e.heureDebut || ''),
        String(e.heure_fin || e.heureFin || '')
      ].join('|');
      const list = byBusiness.get(business) || [];
      list.push(e);
      byBusiness.set(business, list);
      const lite = [
        codeParts.statCom,
        codeParts.qui,
        date,
        normalizeLabelForMatch(e.libelle),
        String(e.heure_debut || e.heureDebut || ''),
        String(e.heure_fin || e.heureFin || '')
      ].join('|');
      const liteList = byBusinessLite.get(lite) || [];
      liteList.push(e);
      byBusinessLite.set(lite, liteList);
    });
    return { imported, byExt, byMode, byIdentity, byCodeCours, byBusiness, byBusinessLite };
  }

  function existingEventCibleCodes(event) {
    return (event && (event.cibles || event.cibleCodes) || [])
      .map((c) => String((c && (c.niveau_code || c.niveauCode || c)) || '').toUpperCase())
      .filter(Boolean)
      .sort()
      .join('|');
  }

  function diffImportedCodeCours(existing, incoming) {
    const diffs = [];
    if (!existing) return diffs;
    const avantDate = String(existing.date || '').slice(0, 10);
    const apresDate = String(incoming.date || '').slice(0, 10);
    if (avantDate && apresDate && avantDate !== apresDate) {
      diffs.push({ champ: 'date', avant: avantDate, apres: apresDate });
    }
    const avantDebut = normalizeTime(existing.heure_debut || existing.heureDebut);
    const apresDebut = normalizeTime(incoming.heureDebut);
    if ((avantDebut || apresDebut) && avantDebut !== apresDebut) {
      diffs.push({ champ: 'heure_debut', avant: avantDebut || null, apres: apresDebut || null });
    }
    const avantFin = normalizeTime(existing.heure_fin || existing.heureFin);
    const apresFin = normalizeTime(incoming.heureFin);
    if ((avantFin || apresFin) && avantFin !== apresFin) {
      diffs.push({ champ: 'heure_fin', avant: avantFin || null, apres: apresFin || null });
    }
    const avantLib = normalizeLabelForMatch(existing.libelle);
    const apresLib = normalizeLabelForMatch(incoming.libelle);
    if (avantLib && apresLib && avantLib !== apresLib) {
      diffs.push({ champ: 'libelle', avant: existing.libelle, apres: incoming.libelle });
    }
    const avantCibles = existingEventCibleCodes(existing);
    const apresCibles = String(incoming.cibleCodes || '');
    if (avantCibles && apresCibles && avantCibles !== apresCibles) {
      diffs.push({ champ: 'cible', avant: avantCibles, apres: apresCibles });
    }
    return diffs;
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

  function inferDomainFromStandard(fields) {
    const domaineRaw = String(fields.domaine || '').trim().toUpperCase();
    const quiRaw = normalizeQuiDomain(fields.qui);
    const raw = domaineRaw || (DOMAINES_CONNUS.includes(quiRaw) || quiRaw === 'PAPR' ? quiRaw : '') || String(fields.monitoring || '').trim().toUpperCase();
    if (raw === 'PAPR') return 'PR';
    if (DOMAINES_CONNUS.includes(raw)) return raw;
    const text = `${fields.code_cours || ''} ${fields.evenement || fields.modele || fields.libelle || ''} ${fields.qui || ''}`.toUpperCase();
    if (/\bDAP\b/.test(text)) return 'DAP';
    if (/\bDPS\b/.test(text)) return 'DPS';
    if (/\bFOBA\b/.test(text)) return 'FOBA';
    if (/\bJSP\b/.test(text)) return 'JSP';
    if (/\bPAPR\b|\bPR\b/.test(text)) return 'PR';
    if (/\bAUTO\b|\bVL\b|\bPL\b/.test(text)) return 'AUTO';
    return raw;
  }

  function previewStandardImport(csvText, context) {
    const parsed = parseCsv(csvText);
    if (parsed.error) return { ok: false, error: parsed.error, format: FORMAT_STANDARD, lignes: [], groups: [], summary: { nbLignes: 0 } };
    const missing = STANDARD_COLUMNS.obligatoires.filter((col) => {
      if (col === 'date') return !parsed.headers.includes('date') && !parsed.headers.includes('date_evenement');
      if (col === 'evenement') return !parsed.headers.includes('evenement') && !parsed.headers.includes('modele') && !parsed.headers.includes('libelle');
      if (col === 'public_cible') return !parsed.headers.includes('public_cible') && !parsed.headers.includes('cibles');
      return !parsed.headers.includes(col);
    });
    const known = (context && context.cibles) || [];
    const maps = existingMaps(context || {});
    const seenCode = new Map();
    const lines = parsed.rows.map((row) => {
      const f = row.fields;
      const errors = [];
      const warnings = [];
      if (missing.length) {
        const messages = missing.map((col) => col === 'qui' ? 'Colonne QUI obligatoire manquante' : `Colonne ${col.toUpperCase()} obligatoire manquante`);
        errors.push({ error: 'colonnes_manquantes', message: messages.join('. ') });
      }
      const dateInfo = normalizeDate(f.date || f.date_evenement);
      if (dateInfo.error) errors.push(dateInfo);
      const codeCours = String(f.code_cours || '').trim();
      if (!codeCours) errors.push({ error: 'code_cours_manquant', message: 'CODE COURS manquant.' });
      if (codeCours && seenCode.has(codeCours)) warnings.push(`CODE COURS déjà présent ligne ${seenCode.get(codeCours)} : regroupement possible.`);
      else if (codeCours) seenCode.set(codeCours, row.ligneNo);
      const codeParts = splitCodeCours(codeCours, f.stat_com, f.qui);
      if (!codeParts.qui) errors.push({ error: 'qui_manquant', message: 'Colonne QUI obligatoire manquante' });
      if (!codeParts.statCom) errors.push({ error: 'stat_com_manquant', message: 'STAT.COM obligatoire manquant pour le rapprochement.' });
      const libelle = String(f.evenement || f.libelle || f.modele || '').trim();
      if (!libelle) errors.push({ error: 'libelle_vide', message: 'Événement/libellé obligatoire.' });
      const domaine = inferDomainFromStandard(f);
      if (!DOMAINES_CONNUS.includes(domaine)) errors.push({ error: 'domaine_inconnu', message: `Domaine inconnu : ${domaine || '(vide)'}` });
      const explicitDomaine = String(f.domaine || '').trim().toUpperCase();
      const quiDomaine = normalizeQuiDomain(f.qui);
      const compatibleSousDomaine = explicitDomaine === 'FOSPEC' && SOUS_DOMAINES[quiDomaine] === 'FOSPEC';
      if (explicitDomaine && DOMAINES_CONNUS.includes(explicitDomaine) && DOMAINES_CONNUS.includes(quiDomaine) && explicitDomaine !== quiDomaine && !compatibleSousDomaine) {
        errors.push({ error: 'domaine_qui_contradictoire', reviewRequired: true, message: `QUI (${quiDomaine}) et DOMAINE (${explicitDomaine}) sont contradictoires.` });
      }
      const resolvedDomaine = resolveDomaine({ domaine, sous_domaine: f.sous_domaine });
      if (resolvedDomaine.error) errors.push(resolvedDomaine);
      let cibles = [];
      let cibleCodes = '';
      if (!resolvedDomaine.error) {
        const parsedCibles = parseCibles({ ...f, cibles: f.public_cible || f.cibles }, resolvedDomaine.domaineStockage, known);
        if (parsedCibles.error) errors.push(parsedCibles);
        else {
          cibles = parsedCibles.cibles;
          cibleCodes = parsedCibles.cibleCodes;
        }
      }
      const heureDebut = normalizeTime(f.debut);
      const heureFin = normalizeTime(f.fin);
      const normalizedLabel = normalizeLabelForMatch(libelle);
      const matchKey = [
        codeParts.statCom,
        codeParts.qui,
        dateInfo.iso || '',
        normalizedLabel,
        heureDebut,
        heureFin
      ].join('|');
      const groupKey = standardGroupingKey({
        statCom: codeParts.statCom,
        qui: codeParts.qui,
        quiSource: f.qui,
        codeCours,
        date: dateInfo.iso || '',
        normalizedLabel,
        heureDebut,
        heureFin,
        domaineStockage: resolvedDomaine.domaineStockage || domaine,
        cibleCodes
      });
      const businessMatches = (maps.byBusinessLite && maps.byBusinessLite.get(matchKey)) || maps.byBusiness.get(matchKey) || [];
      let matchStatus = 'NEW_EVENT';
      let statut = 'NEW_EVENT';
      let actionPrevue = 'CREER';
      let divergences = [];
      if (errors.length) {
        if (errors.some((e) => e.reviewRequired)) {
          matchStatus = 'CONFLICT';
          statut = 'REVIEW_REQUIRED';
          actionPrevue = 'ARBITRER';
        } else {
          statut = 'ERREUR';
          actionPrevue = 'REFUSER';
        }
      } else if (maps.byCodeCours.has(codeCours)) {
        const existing = maps.byCodeCours.get(codeCours);
        divergences = diffImportedCodeCours(existing, {
          date: dateInfo.iso || '',
          heureDebut,
          heureFin,
          libelle,
          cibleCodes
        });
        if (divergences.length) {
          matchStatus = 'DIVERGENCE';
          statut = 'DIVERGENCE';
          actionPrevue = 'ARBITRER';
          warnings.push('CODE COURS déjà présent avec une date, un horaire, un libellé ou une cible différents. Aucune mise à jour automatique.');
        } else {
          matchStatus = 'EXACT_MATCH';
          statut = 'EXACT_MATCH';
          actionPrevue = 'IGNORER_IDEMPOTENT';
        }
      } else if (businessMatches.length === 1) {
        matchStatus = 'PROBABLE_MATCH';
        statut = 'PROBABLE_MATCH';
        actionPrevue = 'MATCH_EXISTANT';
      } else if (businessMatches.length > 1) {
        matchStatus = 'AMBIGUOUS';
        statut = 'REVIEW_REQUIRED';
        actionPrevue = 'ARBITRER';
      }
      return {
        ligneNo: row.ligneNo,
        source: f,
        statut,
        statutLibelle: STATUT_LABELS[statut] || (statut === 'NEW_EVENT' ? 'Nouveau' : statut),
        matchStatus,
        actionPrevue,
        errors,
        erreurs: errors,
        avertissements: warnings,
        divergences,
        codeCours,
        code_cours: codeCours,
        codeSource: codeCours,
        codeParts,
        date: dateInfo.iso || String(f.date || f.date_evenement || ''),
        heureDebut,
        heureFin,
        domaine: resolvedDomaine.domaineAffiche || domaine,
        domaineStockage: resolvedDomaine.domaineStockage || domaine,
        sousDomaine: resolvedDomaine.sousDomaine || null,
        libelle,
        normalizedLabel,
        responsable: String(f.responsable || '').trim(),
        salle: String(f.salle || '').trim(),
        statCom: codeParts.statCom,
        qui: codeParts.qui,
        cibles,
        cibleCodes,
        publicCible: displayTargetLabel(resolvedDomaine.domaineStockage || domaine, cibleCodes, cibles),
        publicCibleCode: cibleCodes,
        groupKey,
        matchKey,
        regroupementMetier: isTerritorialStandardEvent({
          domaineStockage: resolvedDomaine.domaineStockage || domaine,
          qui: codeParts.qui,
          quiSource: f.qui,
          cibleCodes
        }) ? 'TERRITORIAL_DISTINCT' : 'SPECIALISATION_REGROUPABLE',
        fingerprint: codeCours ? `code:${codeCours}` : `std:${groupKey}|${cibleCodes}`,
        existingEventIds: businessMatches.map((e) => e.evenement_id),
        raison: errors.map((e) => e.message).concat(warnings).join(' ')
      };
    });

    const groupsMap = new Map();
    lines.forEach((line) => {
      if (!line.groupKey || line.statut === 'ERREUR') return;
      const group = groupsMap.get(line.groupKey) || {
        groupKey: line.groupKey,
        statut: 'NEW_EVENT',
        actionPrevue: 'CREER',
        lignes: [],
        sourceLineNos: [],
        cibles: [],
        cibleCodes: '',
        codeCours: line.codeCours,
        codeParts: line.codeParts,
        date: line.date,
        domaineStockage: line.domaineStockage,
        sousDomaine: line.sousDomaine,
        libelle: line.libelle,
        heureDebut: line.heureDebut,
        heureFin: line.heureFin,
        responsable: line.responsable,
        salle: line.salle
      };
      group.lignes.push(line);
      group.sourceLineNos.push(line.ligneNo);
      group.cibles.push(...line.cibles);
      if (line.statut === 'REVIEW_REQUIRED' || line.matchStatus === 'AMBIGUOUS') group.statut = 'REVIEW_REQUIRED';
      else if (line.matchStatus === 'DIVERGENCE') group.statut = 'DIVERGENCE';
      else if (line.matchStatus === 'EXACT_MATCH' && group.statut !== 'REVIEW_REQUIRED' && group.statut !== 'DIVERGENCE') group.statut = 'EXACT_MATCH';
      else if (line.matchStatus === 'PROBABLE_MATCH' && group.statut === 'NEW_EVENT') group.statut = 'PROBABLE_MATCH';
      groupsMap.set(line.groupKey, group);
    });
    const groups = [...groupsMap.values()].map((group) => {
      const cibleById = new Map();
      group.cibles.forEach((c) => cibleById.set(c.cibleId, c));
      group.cibles = [...cibleById.values()];
      group.cibleCodes = group.cibles.map((c) => c.niveauCode).sort().join('|');
      group.publicCible = displayTargetLabel(group.domaineStockage, group.cibleCodes, group.cibles);
      if (group.lignes.length > 1 && group.statut === 'NEW_EVENT') group.statut = 'GROUPED';
      group.regroupementMetier = group.lignes.some((l) => l.regroupementMetier === 'TERRITORIAL_DISTINCT') ? 'TERRITORIAL_DISTINCT' : 'SPECIALISATION_REGROUPABLE';
      group.actionPrevue = group.statut === 'REVIEW_REQUIRED' || group.statut === 'DIVERGENCE' ? 'ARBITRER'
        : (group.statut === 'EXACT_MATCH' ? 'IGNORER_IDEMPOTENT' : 'CREER');
      return group;
    });
    const errors = lines.filter((l) => l.statut === 'ERREUR').length;
    const review = groups.filter((g) => g.statut === 'REVIEW_REQUIRED').length;
    const distinctTargets = [...new Set(lines.map((l) => String(l.source && (l.source.public_cible || l.source.cibles) || '').trim()).filter(Boolean))].sort();
    const unknownTargets = [...new Set(lines.filter((l) => l.erreurs.some((e) => e.error === 'referentiel_inconnu')).map((l) => String(l.source && (l.source.public_cible || l.source.cibles) || '').trim()).filter(Boolean))].sort();
    const summary = {
      nbLignes: lines.length,
      eventsDetected: groups.length,
      nouveaux: groups.filter((g) => g.statut === 'NEW_EVENT' || g.statut === 'GROUPED').length,
      reconnus: groups.filter((g) => g.statut === 'EXACT_MATCH' || g.statut === 'PROBABLE_MATCH').length,
      modifies: groups.filter((g) => g.statut === 'PROBABLE_MATCH').length,
      regroupes: groups.filter((g) => g.statut === 'GROUPED').length,
      aControler: review,
      erreurs: errors,
      ciblesDistinctes: distinctTargets,
      ciblesInconnues: unknownTargets,
      territoriauxDistincts: groups.filter((g) => g.regroupementMetier === 'TERRITORIAL_DISTINCT').length,
      specialisationsRegroupees: groups.filter((g) => g.statut === 'GROUPED' && g.regroupementMetier === 'SPECIALISATION_REGROUPABLE').length,
      peutCommit: errors === 0 && review === 0
    };
    const tokenPayload = JSON.stringify({ format: FORMAT_STANDARD, lines: lines.map((l) => [l.ligneNo, l.fingerprint, l.statut]), groups: groups.map((g) => [g.groupKey, g.statut]) });
    return {
      ok: summary.peutCommit,
      format: FORMAT_STANDARD,
      profil: FORMAT_STANDARD,
      csvContract: STANDARD_COLUMNS,
      ecriture: false,
      previewToken: sha256Hex(tokenPayload) || tokenPayload.slice(0, 64),
      lignes: lines,
      groups,
      summary
    };
  }

  return {
    COLUMNS,
    REQUIRED,
    FORMAT_NATIVE,
    FORMAT_STANDARD,
    FORMAT_F7,
    STANDARD_COLUMNS,
    STAT_COM_REFERENTIEL,
    STATUT_LABELS,
    previewScopeImport,
    previewStandardImport,
    fingerprint,
    normalizeLabelForMatch,
    normalizeStatCom,
    normalizeQui,
    normalizeQuiDomain,
    normalizeTargetCode,
    displayTargetLabel,
    resolveTargetCode,
    inferTerritorialTargetCode,
    isTerritorialStandardEvent,
    standardGroupingKey,
    buildCodeCours,
    splitCodeCours,
    resolveDomaine,
    detectCsvFormat,
    detectCsvFormatFromText,
    parseCsv,
    normalizeDate,
    diffImportedCodeCours,
    sha256Hex
  };
});
