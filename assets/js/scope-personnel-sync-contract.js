/* SCOPE-MODEL-2-R1 — contrat de synchronisation CSV du personnel (preview uniquement).
   Aucune écriture PostgreSQL. PERSONNEL-SYNC-1 réalisera le commit. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelSyncContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const COLUMNS = ['nip', 'nom', 'prenom', 'grade', 'cible', 'domaine', 'date_debut', 'date_fin', 'statut'];
  const STATUTS = {
    INCHANGE: 'INCHANGE',
    NOUVEAU: 'NOUVEAU',
    MODIFICATION_IDENTITE: 'MODIFICATION_IDENTITE',
    MODIFICATION_AFFECTATION: 'MODIFICATION_AFFECTATION',
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

  function parseCsv(text) {
    const raw = String(text || '').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter((line) => String(line || '').trim());
    if (!lines.length) return { headers: [], rows: [], error: 'fichier_vide' };
    const headers = splitLine(lines[0]).map(normalizeHeader);
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = splitLine(lines[i]);
      const fields = {};
      headers.forEach((h, idx) => { fields[h] = cells[idx] || ''; });
      rows.push({ ligneNo: i + 1, fields });
    }
    return { headers, rows };
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

  function previewPersonnelSync(csvText, context) {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      return { ok: false, error: parsed.error, lignes: [], absents: [], summary: {} };
    }
    const personnes = (context && context.personnes) || [];
    const affectations = (context && context.affectations) || [];
    const byNip = new Map(personnes.map((p) => [String(p.nip).trim(), p]));
    const seenNips = new Set();
    const lignes = [];

    parsed.rows.forEach((row) => {
      const nip = String(row.fields.nip || '').trim();
      const nom = String(row.fields.nom || '').trim();
      const prenom = String(row.fields.prenom || '').trim();
      const statutCsv = String(row.fields.statut || '').trim().toUpperCase();
      if (!nip) {
        lignes.push({ ligneNo: row.ligneNo, statut: STATUTS.ERREUR, error: 'nip_manquant', decision: 'REFUSER' });
        return;
      }
      if (seenNips.has(nip)) {
        lignes.push({ ligneNo: row.ligneNo, nip, statut: STATUTS.CONFLIT, error: 'nip_duplique_fichier', decision: 'EXAMINER' });
        return;
      }
      seenNips.add(nip);
      const existing = byNip.get(nip);
      if (!existing) {
        const homonyme = personnes.find((p) => identityKey(p.nom, p.prenom) === identityKey(nom, prenom));
        lignes.push({
          ligneNo: row.ligneNo,
          nip,
          statut: STATUTS.NOUVEAU,
          decision: 'CREER',
          diagnosticNomPrenom: homonyme ? 'homonyme_sans_nip_ignore' : null,
          personneId: null
        });
        return;
      }
      if (namesConflict(existing, { nom, prenom })) {
        lignes.push({
          ligneNo: row.ligneNo,
          nip,
          personneId: existing.personne_id || existing.personneId,
          statut: STATUTS.CONFLIT,
          decision: 'EXAMINER',
          message: 'NIP identique, identité nom/prénom incohérente. Pas de rapprochement automatique.'
        });
        return;
      }
      const identiteChange = identityKey(existing.nom, existing.prenom) !== identityKey(nom, prenom)
        || String(existing.grade || '') !== String(row.fields.grade || existing.grade || '');
      if (isArchived(existing)) {
        lignes.push({
          ligneNo: row.ligneNo,
          nip,
          personneId: existing.personne_id || existing.personneId,
          statut: STATUTS.ARCHIVE_RETROUVE,
          proposition: STATUTS.REACTIVATION_PROPOSEE,
          decision: 'EXAMINER',
          identiteChange
        });
        return;
      }
      if (statutCsv === 'SORTI' || statutCsv === 'DEMISSIONNAIRE') {
        lignes.push({
          ligneNo: row.ligneNo, nip,
          personneId: existing.personne_id || existing.personneId,
          statut: STATUTS.ARCHIVAGE_PROPOSE,
          decision: 'EXAMINER',
          message: 'Proposition d’archivage. Pas une démission automatique.'
        });
        return;
      }
      const personPeriodes = (context.periodes || []).filter((p) =>
        String(p.personne_id || p.personneId) === String(existing.personne_id || existing.personneId)
      );
      const openConge = personPeriodes.find((p) =>
        String(p.type).toUpperCase() === 'INDISPONIBLE' && !p.date_fin && !p.dateFin
      );
      if (openConge && (statutCsv === 'ACTIF' || statutCsv === 'FIN_CONGE')) {
        lignes.push({
          ligneNo: row.ligneNo, nip, personneId: existing.personne_id || existing.personneId,
          statut: STATUTS.FIN_CONGE, decision: 'EXAMINER'
        });
        return;
      }
      if (statutCsv === 'CONGE' || statutCsv === 'INDISPONIBLE' || statutCsv === 'CONGE_SABBATIQUE' || statutCsv === 'DEBUT_CONGE') {
        lignes.push({
          ligneNo: row.ligneNo, nip, personneId: existing.personne_id || existing.personneId,
          statut: STATUTS.DEBUT_CONGE, decision: 'EXAMINER'
        });
        return;
      }
      const openAff = affectations.filter((a) =>
        String(a.personne_id || a.personneId) === String(existing.personne_id || existing.personneId)
        && !a.date_fin && !a.dateFin
      );
      const cibleCsv = String(row.fields.cible || '').trim().toUpperCase();
      const domaineCsv = String(row.fields.domaine || '').trim().toUpperCase();
      const dateFinCsv = String(row.fields.date_fin || row.fields.dateFin || '').trim();
      let statut = STATUTS.INCHANGE;
      if (identiteChange) statut = STATUTS.MODIFICATION_IDENTITE;
      if (dateFinCsv && openAff.length) {
        statut = STATUTS.FIN_AFFECTATION;
      } else if (cibleCsv && openAff.length && !openAff.some((a) => String(a.niveau_code || a.niveauCode || '').toUpperCase() === cibleCsv)) {
        statut = STATUTS.MODIFICATION_AFFECTATION;
      } else if (cibleCsv && !openAff.length) {
        statut = STATUTS.NOUVELLE_AFFECTATION;
      }
      lignes.push({
        ligneNo: row.ligneNo,
        nip,
        personneId: existing.personne_id || existing.personneId,
        statut,
        decision: statut === STATUTS.INCHANGE ? 'IGNORER' : 'PROPOSER'
      });
    });

    const absents = personnes
      .filter((p) => !seenNips.has(String(p.nip).trim()))
      .map((p) => ({
        nip: p.nip,
        personneId: p.personne_id || p.personneId,
        statut: STATUTS.ABSENT_DU_FICHIER,
        decision: 'EXAMINER',
        message: 'Absent du fichier ≠ démission automatique.',
        proposition: isArchived(p) ? null : STATUTS.ARCHIVAGE_PROPOSE
      }));

    const counts = {};
    Object.keys(STATUTS).forEach((k) => { counts[k] = 0; });
    lignes.concat(absents).forEach((row) => {
      counts[row.statut] = (counts[row.statut] || 0) + 1;
      if (row.proposition === STATUTS.REACTIVATION_PROPOSEE) counts.REACTIVATION_PROPOSEE += 1;
    });

    return {
      ok: lignes.every((l) => l.statut !== STATUTS.ERREUR),
      format: 'SCOPE_PERSONNEL_SYNC_1',
      previewSeule: true,
      rapprochement: { priorite: ['NIP'], interdit: ['nom_prenom_reactivation'] },
      colonnes: COLUMNS,
      lignes,
      absents,
      summary: {
        importes: parsed.rows.length,
        ...counts
      },
      commitTransactionnel: 'PERSONNEL-SYNC-1'
    };
  }

  return { COLUMNS, STATUTS, previewPersonnelSync };
});
