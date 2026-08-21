/* SCOPE-PERSONNEL-SYNC-1 — synchronisation comparative CSV (preview pure).
   Format officiel : NIP;Grade;Nom;Prénom;OI
   Matching obligatoire : NIP. Aucune écriture. PERSONNEL-SYNC-1 commit côté serveur. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelSyncContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const FORMAT = 'SCOPE_PERSONNEL_CSV_1';
  const COLUMNS = ['nip', 'grade', 'nom', 'prenom', 'oi', 'date_debut', 'statut_rh', 'date_fin', 'motif', 'source'];
  const STATUTS = {
    INCHANGE: 'INCHANGE',
    NOUVEAU: 'NOUVEAU',
    MODIFICATION_IDENTITE: 'MODIFICATION_IDENTITE',
    CHANGEMENT_GRADE: 'CHANGEMENT_GRADE',
    CHANGEMENT_OI: 'CHANGEMENT_OI',
    MODIFICATION_AFFECTATION: 'CHANGEMENT_OI',
    NOUVELLE_AFFECTATION: 'NOUVELLE_AFFECTATION',
    FIN_AFFECTATION: 'FIN_AFFECTATION',
    ABSENT_DU_FICHIER: 'ABSENT_DU_FICHIER',
    ARCHIVAGE_PROPOSE: 'ARCHIVAGE_PROPOSE',
    ARCHIVE_RETROUVE: 'ARCHIVE_RETROUVE',
    REACTIVATION_PROPOSEE: 'REACTIVATION_PROPOSEE',
    DEBUT_CONGE: 'DEBUT_CONGE',
    FIN_CONGE: 'FIN_CONGE',
    CONFLIT: 'CONFLIT',
    ERREUR: 'ERREUR'
  };

  const DECISIONS = {
    IGNORER: 'IGNORER',
    APPLIQUER: 'APPLIQUER',
    EXAMINER: 'EXAMINER',
    CREER: 'CREER',
    ARCHIVER_SORTI: 'ARCHIVER_SORTI',
    ARCHIVER_DEMISSIONNAIRE: 'ARCHIVER_DEMISSIONNAIRE',
    REACTIVER: 'REACTIVER',
    DEBUT_CONGE: 'DEBUT_CONGE',
    FIN_CONGE: 'FIN_CONGE',
    FIN_AFFECTATION: 'FIN_AFFECTATION',
    MODIFIER_IDENTITE: 'MODIFIER_IDENTITE',
    REFUSER: 'REFUSER'
  };

  const DATES_REQUISES = new Set([
    STATUTS.NOUVEAU,
    STATUTS.CHANGEMENT_OI,
    STATUTS.NOUVELLE_AFFECTATION,
    STATUTS.FIN_AFFECTATION,
    STATUTS.ARCHIVAGE_PROPOSE,
    STATUTS.ARCHIVE_RETROUVE,
    STATUTS.REACTIVATION_PROPOSEE,
    STATUTS.DEBUT_CONGE,
    STATUTS.FIN_CONGE
  ]);

  function loadOiMap() {
    if (typeof require === 'function') {
      try { return require('./scope-oi-map.js'); } catch (e) { /* browser bundle */ }
    }
    return root.ScopeOiMap || null;
  }

  const oiMap = loadOiMap();

  function normalizeOi(value) {
    if (oiMap && typeof oiMap.normalizeOi === 'function') return oiMap.normalizeOi(value);
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function mapOi(value) {
    if (oiMap && typeof oiMap.mapOi === 'function') return oiMap.mapOi(value);
    return null;
  }

  function isPrincipalOi(domaine, niveau) {
    if (!domaine || !niveau) return false;
    return Boolean(mapOi(`${domaine} ${niveau}`));
  }

  function formatOi(domaine, niveau) {
    if (!domaine || !niveau) return niveau || domaine || '';
    return `${domaine} ${niveau}`;
  }

  function normalizeHeader(name) {
    return String(name || '').replace(/^\uFEFF/, '').trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');
  }

  function splitLine(line) {
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { current += '"'; i += 1; }
          else inQuotes = false;
        } else current += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ';' || ch === ',') { out.push(current); current = ''; }
      else current += ch;
    }
    out.push(current);
    return out.map((cell) => String(cell || '').trim());
  }

  function detectSeparator(headerLine) {
    const semi = (String(headerLine || '').match(/;/g) || []).length;
    const comma = (String(headerLine || '').match(/,/g) || []).length;
    return semi >= comma ? ';' : ',';
  }

  function parseCsv(text) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter((line) => String(line || '').trim());
    if (!lines.length) return { headers: [], rows: [], error: 'fichier_vide', separator: ';' };
    const separator = detectSeparator(lines[0]);
    const headers = splitLine(lines[0]).map(normalizeHeader);
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = splitLine(lines[i]);
      const fields = {};
      headers.forEach((h, idx) => { fields[h] = cells[idx] || ''; });
      rows.push({ ligneNo: i + 1, fields });
    }
    return { headers, rows, separator, bomStripped: String(text || '').charCodeAt(0) === 0xFEFF };
  }

  function sha256Hex(text) {
    const payload = String(text || '');
    if (typeof require === 'function') {
      try {
        return require('crypto').createHash('sha256').update(payload).digest('hex');
      } catch (e) { /* fall through */ }
    }
    let h = 2166136261;
    for (let i = 0; i < payload.length; i += 1) {
      h ^= payload.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (`00000000${(h >>> 0).toString(16)}`).slice(-8);
  }

  function identityKey(nom, prenom) {
    return `${String(nom || '').trim().toLowerCase()}|${String(prenom || '').trim().toLowerCase()}`;
  }

  function isArchived(personne) {
    const statut = String(personne.statut_rh || personne.statutRh || '').toUpperCase();
    return personne.actif === false || statut === 'SORTI' || statut === 'DEMISSIONNAIRE';
  }

  function namesConflict(a, b) {
    const kn = identityKey(a.nom, a.prenom);
    const kn2 = identityKey(b.nom, b.prenom);
    if (kn === kn2) return false;
    const sameNom = String(a.nom || '').trim().toLowerCase() === String(b.nom || '').trim().toLowerCase();
    const samePrenom = String(a.prenom || '').trim().toLowerCase() === String(b.prenom || '').trim().toLowerCase();
    return !sameNom && !samePrenom;
  }

  function isoDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const fr = raw.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
    return null;
  }

  function parseOiFields(fields) {
    const oiRaw = normalizeOi(fields.oi || fields.oi_principal || '');
    const mapped = mapOi(oiRaw);
    if (mapped) return { oi: oiRaw, domaineCode: mapped.domaineCode, niveauCode: mapped.niveauCode, known: true };
    const domaine = String(fields.domaine || fields.domaine_code || '').trim().toUpperCase();
    let cible = String(fields.cible || fields.niveau || fields.niveau_code || '').trim();
    if (cible.indexOf('/') !== -1) {
      const parts = cible.split('/').map((p) => p.trim());
      if (parts.length === 2) {
        const combo = mapOi(`${parts[0]} ${parts[1]}`);
        if (combo) return { oi: `${parts[0]} ${parts[1]}`, domaineCode: combo.domaineCode, niveauCode: combo.niveauCode, known: true };
      }
    }
    cible = cible.toUpperCase();
    if (domaine && cible) {
      const combo = mapOi(`${domaine} ${cible}`);
      if (combo) return { oi: `${domaine} ${cible}`, domaineCode: combo.domaineCode, niveauCode: combo.niveauCode, known: true };
      return {
        oi: `${domaine} ${cible}`,
        domaineCode: domaine,
        niveauCode: cible,
        known: false,
        horsPerimetre: !isPrincipalOi(domaine, cible)
      };
    }
    if (cible) return { oi: cible, domaineCode: null, niveauCode: cible, known: false, niveauOnly: true };
    if (oiRaw) return { oi: oiRaw, known: false, horsPerimetre: true };
    return null;
  }

  function pidOf(personne) {
    return personne.personne_id || personne.personneId || null;
  }

  function openAffectations(affectations, personneId) {
    return (affectations || []).filter((a) =>
      String(a.personne_id || a.personneId) === String(personneId)
      && !a.date_fin && !a.dateFin
    );
  }

  function oiOfAff(aff) {
    const domaine = aff.domaine_code || aff.domaineCode || (aff.cible && (aff.cible.domaine_code || aff.cible.domaineCode));
    const niveau = aff.niveau_code || aff.niveauCode || (aff.cible && (aff.cible.niveau_code || aff.cible.niveauCode));
    return { domaine, niveau, label: formatOi(domaine, niveau), principal: isPrincipalOi(domaine, niveau) };
  }

  function principalOpen(openAff) {
    return openAff.map(oiOfAff).filter((x) => x.principal);
  }

  function matchesOi(openAff, parsed) {
    if (!parsed) return true;
    if (parsed.known) {
      return openAff.some((a) => {
        const oi = oiOfAff(a);
        return oi.domaine === parsed.domaineCode && oi.niveau === parsed.niveauCode;
      });
    }
    if (parsed.niveauOnly) {
      return openAff.some((a) => String(oiOfAff(a).niveau || '').toUpperCase() === parsed.niveauCode);
    }
    return true;
  }

  function needsDate(statut) {
    return DATES_REQUISES.has(statut);
  }

  function defaultDecision(statut, hasDate) {
    if (statut === STATUTS.INCHANGE) return DECISIONS.IGNORER;
    if (statut === STATUTS.ABSENT_DU_FICHIER) return DECISIONS.IGNORER;
    if (statut === STATUTS.ERREUR) return DECISIONS.REFUSER;
    if (statut === STATUTS.NOUVEAU || statut === STATUTS.CHANGEMENT_OI || statut === STATUTS.CHANGEMENT_GRADE
      || statut === STATUTS.NOUVELLE_AFFECTATION || statut === STATUTS.FIN_AFFECTATION) {
      if (needsDate(statut) && !hasDate) return DECISIONS.EXAMINER;
      return statut === STATUTS.NOUVEAU ? DECISIONS.CREER : DECISIONS.APPLIQUER;
    }
    return DECISIONS.EXAMINER;
  }

  function snapshotFingerprint(personnes, affectations, periodes) {
    const p = (personnes || []).map((x) => [
      pidOf(x), x.nip, x.nom, x.prenom, x.grade || '', x.statut_rh || x.statutRh || '', x.actif
    ].join('|')).sort();
    const a = (affectations || []).map((x) => [
      x.affectation_id || x.affectationId || '', x.personne_id || x.personneId, x.cible_id || x.cibleId,
      x.date_debut || x.dateDebut || '', x.date_fin || x.dateFin || ''
    ].join('|')).sort();
    const r = (periodes || []).map((x) => [
      x.periode_id || x.periodeId || '', x.personne_id || x.personneId, x.type,
      x.date_debut || x.dateDebut || '', x.date_fin || x.dateFin || '', x.motif || ''
    ].join('|')).sort();
    return sha256Hex(JSON.stringify({ p, a, r }));
  }

  function emptyCounts() {
    const counts = {};
    Object.keys(STATUTS).forEach((k) => { counts[k] = 0; });
    counts.CHANGEMENT_OI = 0;
    return counts;
  }

  function previewPersonnelSync(csvText, context) {
    const options = context || {};
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      return {
        ok: false,
        error: parsed.error,
        format: FORMAT,
        previewSeule: true,
        lignes: [],
        absents: [],
        rows: [],
        summary: emptyCounts(),
        counts: emptyCounts(),
        warnings: [{ code: parsed.error, message: 'Fichier vide ou illisible.' }],
        conflicts: [],
        canCommit: false
      };
    }
    const personnes = options.personnes || [];
    const affectations = options.affectations || [];
    const periodes = options.periodes || [];
    const dateGlobale = isoDate(options.dateEffetGlobale || options.dateEffet);
    const byNip = new Map(personnes.map((p) => [String(p.nip).trim(), p]));
    const seenNips = new Set();
    const lignes = [];
    const warnings = [];

    parsed.rows.forEach((row) => {
      const nip = String(row.fields.nip || '').trim();
      const nom = String(row.fields.nom || '').trim();
      const prenom = String(row.fields.prenom || '').trim();
      const grade = String(row.fields.grade || '').trim();
      const statutCsv = String(row.fields.statut || row.fields.statut_rh || '').trim().toUpperCase();
      const dateLigne = isoDate(row.fields.date_debut || row.fields.dateDebut);
      const dateEffet = dateLigne || dateGlobale;
      const parsedOi = parseOiFields(row.fields);
      if (!nip) {
        lignes.push({
          rowId: `ligne:${row.ligneNo}`,
          ligneNo: row.ligneNo,
          statut: STATUTS.ERREUR,
          error: 'nip_manquant',
          decision: DECISIONS.REFUSER,
          actions: [{ type: STATUTS.ERREUR, message: 'NIP manquant.' }]
        });
        return;
      }
      if (seenNips.has(nip)) {
        lignes.push({
          rowId: `nip:${nip}:${row.ligneNo}`,
          ligneNo: row.ligneNo,
          nip,
          statut: STATUTS.CONFLIT,
          error: 'nip_duplique_fichier',
          decision: DECISIONS.EXAMINER,
          message: 'NIP dupliqué dans le fichier.',
          actions: [{ type: STATUTS.CONFLIT, message: 'NIP dupliqué dans le fichier.' }]
        });
        return;
      }
      seenNips.add(nip);
      if (parsedOi && parsedOi.horsPerimetre) {
        warnings.push({
          code: 'oi_hors_perimetre',
          nip,
          oi: parsedOi.oi,
          message: 'OI hors périmètre CSV DPS/DAP. Aucune implication FOBA/PR/AUTO/JSP/FOSPEC.'
        });
      }

      const existing = byNip.get(nip);
      if (!existing) {
        const homonyme = personnes.find((p) => identityKey(p.nom, p.prenom) === identityKey(nom, prenom));
        const statut = STATUTS.NOUVEAU;
        lignes.push({
          rowId: `nip:${nip}`,
          ligneNo: row.ligneNo,
          nip,
          nom,
          prenom,
          grade,
          oiPropose: parsedOi ? parsedOi.oi : '',
          oiActuel: '',
          statut,
          decision: defaultDecision(statut, Boolean(dateEffet)),
          diagnosticNomPrenom: homonyme ? 'homonyme_sans_nip_ignore' : null,
          personneId: null,
          dateEffet,
          dateEffetRequise: !dateEffet,
          parsedOi,
          actions: [{ type: STATUTS.NOUVEAU, apres: { nom, prenom, grade, oi: parsedOi && parsedOi.oi } }]
        });
        return;
      }

      const personneId = pidOf(existing);
      const openAff = openAffectations(affectations, personneId);
      const principal = principalOpen(openAff);
      const oiActuel = principal.length ? principal.map((p) => p.label).join(' · ') : openAff.map((a) => oiOfAff(a).label).filter(Boolean).join(' · ');
      const personPeriodes = periodes.filter((p) => String(p.personne_id || p.personneId) === String(personneId));
      const openConge = personPeriodes.find((p) =>
        String(p.type).toUpperCase() === 'INDISPONIBLE' && !p.date_fin && !p.dateFin
      );
      const actions = [];
      let statut = STATUTS.INCHANGE;
      let message = null;

      if (namesConflict(existing, { nom, prenom })) {
        statut = STATUTS.CONFLIT;
        message = 'NIP identique, identité nom/prénom incohérente. Pas de rapprochement automatique.';
        actions.push({ type: STATUTS.CONFLIT, avant: { nom: existing.nom, prenom: existing.prenom }, apres: { nom, prenom } });
        lignes.push({
          rowId: `nip:${nip}`,
          ligneNo: row.ligneNo,
          nip,
          nom,
          prenom,
          grade,
          personneId,
          oiActuel,
          oiPropose: parsedOi ? parsedOi.oi : '',
          statut,
          decision: DECISIONS.EXAMINER,
          message,
          dateEffet,
          parsedOi,
          actions
        });
        return;
      }

      const nomChange = identityKey(existing.nom, existing.prenom) !== identityKey(nom, prenom);
      const gradeChange = String(existing.grade || '') !== String(grade || existing.grade || '') && String(grade || '') !== '';
      if (nomChange) {
        statut = STATUTS.MODIFICATION_IDENTITE;
        actions.push({
          type: STATUTS.MODIFICATION_IDENTITE,
          avant: { nom: existing.nom, prenom: existing.prenom },
          apres: { nom, prenom }
        });
      }
      if (gradeChange && String(existing.grade || '') !== grade) {
        if (statut === STATUTS.INCHANGE) statut = STATUTS.CHANGEMENT_GRADE;
        actions.push({
          type: STATUTS.CHANGEMENT_GRADE,
          avant: { grade: existing.grade || '' },
          apres: { grade }
        });
      }

      if (isArchived(existing)) {
        statut = STATUTS.ARCHIVE_RETROUVE;
        actions.unshift({ type: STATUTS.REACTIVATION_PROPOSEE, personneId });
        lignes.push({
          rowId: `nip:${nip}`,
          ligneNo: row.ligneNo,
          nip,
          nom,
          prenom,
          grade,
          personneId,
          oiActuel,
          oiPropose: parsedOi ? parsedOi.oi : '',
          statut,
          proposition: STATUTS.REACTIVATION_PROPOSEE,
          decision: DECISIONS.EXAMINER,
          identiteChange: nomChange || gradeChange,
          dateEffet,
          dateEffetRequise: !dateEffet,
          parsedOi,
          actions
        });
        return;
      }

      if (statutCsv === 'SORTI' || statutCsv === 'DEMISSIONNAIRE') {
        statut = STATUTS.ARCHIVAGE_PROPOSE;
        actions.push({ type: STATUTS.ARCHIVAGE_PROPOSE, apres: { type: statutCsv } });
        lignes.push({
          rowId: `nip:${nip}`,
          ligneNo: row.ligneNo,
          nip,
          nom,
          prenom,
          grade,
          personneId,
          oiActuel,
          oiPropose: parsedOi ? parsedOi.oi : '',
          statut,
          decision: DECISIONS.EXAMINER,
          message: 'Proposition d’archivage. Pas une démission automatique.',
          dateEffet,
          dateEffetRequise: !dateEffet,
          parsedOi,
          actions
        });
        return;
      }

      if (openConge && statutCsv !== 'CONGE' && statutCsv !== 'INDISPONIBLE' && statutCsv !== 'CONGE_SABBATIQUE' && statutCsv !== 'DEBUT_CONGE') {
        statut = STATUTS.FIN_CONGE;
        actions.push({ type: STATUTS.FIN_CONGE });
      } else if (statutCsv === 'CONGE' || statutCsv === 'INDISPONIBLE' || statutCsv === 'CONGE_SABBATIQUE' || statutCsv === 'DEBUT_CONGE') {
        statut = STATUTS.DEBUT_CONGE;
        actions.push({ type: STATUTS.DEBUT_CONGE, motif: 'CONGE_SABBATIQUE' });
      }

      const dateFinCsv = isoDate(row.fields.date_fin || row.fields.dateFin);
      if (dateFinCsv && openAff.length) {
        statut = STATUTS.FIN_AFFECTATION;
        actions.push({ type: STATUTS.FIN_AFFECTATION, dateFin: dateFinCsv });
      } else if (parsedOi && parsedOi.known) {
        if (openAff.length && !matchesOi(openAff, parsedOi)) {
          const hasPrincipal = principal.length > 0;
          statut = hasPrincipal ? STATUTS.CHANGEMENT_OI : STATUTS.NOUVELLE_AFFECTATION;
          actions.push({
            type: statut,
            avant: { oi: oiActuel },
            apres: { oi: parsedOi.oi, domaine: parsedOi.domaineCode, niveau: parsedOi.niveauCode }
          });
        } else if (!openAff.length) {
          statut = STATUTS.NOUVELLE_AFFECTATION;
          actions.push({
            type: STATUTS.NOUVELLE_AFFECTATION,
            apres: { oi: parsedOi.oi, domaine: parsedOi.domaineCode, niveau: parsedOi.niveauCode }
          });
        }
      } else if (parsedOi && parsedOi.niveauOnly && openAff.length && !matchesOi(openAff, parsedOi)) {
        statut = STATUTS.CHANGEMENT_OI;
        actions.push({
          type: STATUTS.CHANGEMENT_OI,
          avant: { oi: oiActuel },
          apres: { oi: parsedOi.oi }
        });
      }

      if (!actions.length) statut = STATUTS.INCHANGE;
      const hasDate = Boolean(dateEffet || dateFinCsv);
      lignes.push({
        rowId: `nip:${nip}`,
        ligneNo: row.ligneNo,
        nip,
        nom,
        prenom,
        grade,
        personneId,
        oiActuel,
        oiPropose: parsedOi ? parsedOi.oi : oiActuel,
        statut,
        decision: defaultDecision(statut, hasDate),
        dateEffet,
        dateEffetRequise: needsDate(statut) && !hasDate,
        parsedOi,
        actions: actions.length ? actions : [{ type: STATUTS.INCHANGE }]
      });
    });

    const absents = personnes
      .filter((p) => !seenNips.has(String(p.nip).trim()))
      .map((p) => {
        const personneId = pidOf(p);
        const openAff = openAffectations(affectations, personneId);
        const principal = principalOpen(openAff);
        return {
          rowId: `absent:${p.nip}`,
          nip: p.nip,
          nom: p.nom,
          prenom: p.prenom,
          grade: p.grade || '',
          personneId,
          oiActuel: principal.length ? principal.map((x) => x.label).join(' · ') : '',
          oiPropose: '',
          statut: STATUTS.ABSENT_DU_FICHIER,
          decision: DECISIONS.IGNORER,
          message: 'Absent du fichier ≠ démission automatique.',
          proposition: isArchived(p) ? null : STATUTS.ARCHIVAGE_PROPOSE,
          dateEffet: dateGlobale,
          dateEffetRequise: !dateGlobale,
          actions: [{ type: STATUTS.ABSENT_DU_FICHIER }]
        };
      });

    const counts = emptyCounts();
    const all = lignes.concat(absents);
    all.forEach((row) => {
      counts[row.statut] = (counts[row.statut] || 0) + 1;
      if (row.proposition === STATUTS.REACTIVATION_PROPOSEE) counts.REACTIVATION_PROPOSEE += 1;
      (row.actions || []).forEach((action) => {
        if (action.type === STATUTS.CHANGEMENT_GRADE && row.statut !== STATUTS.CHANGEMENT_GRADE) {
          counts.CHANGEMENT_GRADE += 1;
        }
        if (action.type === STATUTS.CHANGEMENT_OI && row.statut !== STATUTS.CHANGEMENT_OI) {
          counts.CHANGEMENT_OI += 1;
        }
      });
    });

    const conflicts = all.filter((row) => row.statut === STATUTS.CONFLIT || row.statut === STATUTS.ERREUR);
    const blocking = all.filter((row) => {
      if (row.statut === STATUTS.ERREUR) return true;
      if (row.statut === STATUTS.CONFLIT && row.decision === DECISIONS.EXAMINER) return true;
      if (row.dateEffetRequise && row.decision !== DECISIONS.IGNORER && row.decision !== DECISIONS.EXAMINER && row.decision !== DECISIONS.REFUSER) return true;
      if (row.dateEffetRequise && (row.decision === DECISIONS.APPLIQUER || row.decision === DECISIONS.CREER || row.decision === DECISIONS.REACTIVER
        || row.decision === DECISIONS.ARCHIVER_SORTI || row.decision === DECISIONS.ARCHIVER_DEMISSIONNAIRE
        || row.decision === DECISIONS.DEBUT_CONGE || row.decision === DECISIONS.FIN_CONGE
        || row.decision === DECISIONS.FIN_AFFECTATION)) return true;
      return false;
    });
    const dateEffetNeeded = all.some((row) =>
      needsDate(row.statut) && !row.dateEffet
      && row.statut !== STATUTS.ABSENT_DU_FICHIER
      && row.statut !== STATUTS.INCHANGE
    );

    const csvSha256 = sha256Hex(String(csvText || '').replace(/^\uFEFF/, ''));
    const baseFingerprint = snapshotFingerprint(personnes, affectations, periodes);
    const fingerprint = sha256Hex(`${csvSha256}|${baseFingerprint}|${dateGlobale || ''}`);

    return {
      ok: lignes.every((l) => l.statut !== STATUTS.ERREUR),
      format: FORMAT,
      previewSeule: true,
      importId: csvSha256.slice(0, 32),
      fingerprint,
      csvSha256,
      baseFingerprint,
      rapprochement: { priorite: ['NIP'], interdit: ['nom_prenom_reactivation'] },
      colonnes: COLUMNS,
      separator: parsed.separator,
      bomStripped: parsed.bomStripped,
      lignes,
      absents,
      rows: all,
      warnings,
      conflicts,
      dateEffetGlobale: dateGlobale,
      dateEffetRequise: dateEffetNeeded,
      canCommit: blocking.length === 0 && !dateEffetNeeded && lignes.every((l) => l.statut !== STATUTS.ERREUR),
      counts,
      summary: {
        importes: parsed.rows.length,
        analysed: parsed.rows.length,
        personnelFichier: parsed.rows.length,
        ...counts
      },
      commitTransactionnel: true
    };
  }

  function applyDecisions(preview, decisions, dateEffetGlobale) {
    const map = new Map();
    (decisions || []).forEach((d) => {
      const key = d.rowId || (d.nip ? `nip:${d.nip}` : null) || (d.nip ? `absent:${d.nip}` : null);
      if (d.rowId) map.set(d.rowId, d);
      if (d.nip) {
        map.set(`nip:${d.nip}`, d);
        map.set(`absent:${d.nip}`, Object.assign({}, map.get(`absent:${d.nip}`), d));
      }
      if (key) map.set(key, d);
    });
    const dateGlobale = isoDate(dateEffetGlobale) || preview.dateEffetGlobale;
    const rows = (preview.rows || preview.lignes.concat(preview.absents || [])).map((row) => {
      const patch = map.get(row.rowId) || map.get(`nip:${row.nip}`) || (row.statut === STATUTS.ABSENT_DU_FICHIER ? map.get(`absent:${row.nip}`) : null);
      const next = Object.assign({}, row);
      if (patch) {
        if (patch.decision) next.decision = patch.decision;
        if (patch.dateEffet) next.dateEffet = isoDate(patch.dateEffet);
        if (patch.archiveType) next.archiveType = patch.archiveType;
        if (patch.motif) next.motif = patch.motif;
      }
      if (!next.dateEffet && dateGlobale) next.dateEffet = dateGlobale;
      next.dateEffetRequise = needsDate(next.statut) && !next.dateEffet && next.decision !== DECISIONS.IGNORER && next.decision !== DECISIONS.EXAMINER;
      return next;
    });
    const lignes = rows.filter((r) => r.statut !== STATUTS.ABSENT_DU_FICHIER);
    const absents = rows.filter((r) => r.statut === STATUTS.ABSENT_DU_FICHIER);
    const dateEffetNeeded = rows.some((row) =>
      needsDate(row.statut) && !row.dateEffet
      && row.statut !== STATUTS.ABSENT_DU_FICHIER
      && row.statut !== STATUTS.INCHANGE
      && row.decision !== DECISIONS.IGNORER
    );
    const blocking = rows.filter((row) => {
      if (row.statut === STATUTS.ERREUR) return true;
      if (row.statut === STATUTS.CONFLIT && (row.decision === DECISIONS.EXAMINER || !row.decision)) return true;
      const applying = row.decision === DECISIONS.APPLIQUER || row.decision === DECISIONS.CREER || row.decision === DECISIONS.REACTIVER
        || row.decision === DECISIONS.ARCHIVER_SORTI || row.decision === DECISIONS.ARCHIVER_DEMISSIONNAIRE
        || row.decision === DECISIONS.DEBUT_CONGE || row.decision === DECISIONS.FIN_CONGE
        || row.decision === DECISIONS.FIN_AFFECTATION || row.decision === DECISIONS.MODIFIER_IDENTITE;
      if (applying && needsDate(row.statut) && !row.dateEffet) return true;
      return false;
    });
    return Object.assign({}, preview, {
      lignes,
      absents,
      rows,
      dateEffetGlobale: dateGlobale,
      dateEffetRequise: dateEffetNeeded || preview.dateEffetRequise,
      canCommit: blocking.length === 0 && !dateEffetNeeded && lignes.every((l) => l.statut !== STATUTS.ERREUR)
    });
  }

  return {
    FORMAT,
    COLUMNS,
    STATUTS,
    DECISIONS,
    parseCsv,
    sha256Hex,
    mapOi,
    normalizeOi,
    isPrincipalOi,
    formatOi,
    snapshotFingerprint,
    previewPersonnelSync,
    applyDecisions,
    isoDate
  };
});
