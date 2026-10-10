/* SCOPE-IMPL-1B — helpers UI P0, sans calcul du taux officiel. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeUiLogic = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ActivityLabel = globalThis.ScopeActivityLabel || (typeof require === 'function' ? require('./scope-activity-label') : null);

  const MOTIFS = [
    { value: 'PRIVE', label: 'Privé' },
    { value: 'PROFESSIONNEL', label: 'Professionnel' },
    { value: 'ARMEE', label: 'Armée' },
    { value: 'ACCIDENT_MALADIE', label: 'Accident/Maladie' }
  ];
  const MOTIFS_JSP = [
    { value: 'PRIVE', label: 'Privé', group: 'operationnel' },
    { value: 'ACTIVITE_SCOLAIRE', label: 'Activité scolaire', group: 'operationnel' },
    { value: 'ACTIVITE_EXTRA_SCOLAIRE', label: 'Activité extra-scolaire', group: 'operationnel' },
    { value: 'OUBLI', label: 'Oubli', group: 'operationnel' },
    { value: 'ACCIDENT_MALADIE', label: 'Accident/maladie', group: 'operationnel' },
    { value: 'NON_JUSTIFIE', label: 'Non-justifié', group: 'administratif' }
  ];
  const MOTIFS_DISPENSE = [
    { value: 'FORMATEUR_PR', label: 'Formateur PR', group: 'operationnel' },
    { value: 'FORMATION_HORS_SDIS', label: 'Formation hors SDIS', group: 'operationnel' },
    { value: 'JOKER', label: 'Joker', group: 'operationnel' },
    { value: 'AUTO_RETRAIT', label: 'Auto-retrait', group: 'administratif' },
    { value: 'DEMISSION_EN_COURS', label: 'Démission en cours', group: 'administratif' },
    { value: 'NON_CONCERNE', label: 'Non concerné', group: 'administratif' }
  ];
  const MOTIFS_DISPENSE_HISTORIQUES = [
    { value: 'PAS_CONCERNE', label: 'Non concerné', group: 'administratif', legacy: true }
  ];
  const MOTIFS_HISTORIQUES = [
    { value: 'MALADIE', label: 'Maladie (historique)' },
    { value: 'ACCIDENT', label: 'Accident (historique)' },
    { value: 'AUTRE', label: 'Autre (historique)' },
    { value: 'NON_PRECISE', label: 'Non précisé (historique)' }
  ];

  function isJspDomaine(code) {
    return String(code || '').toUpperCase() === 'JSP';
  }

  function motifFromPolicyId(id, catalog) {
    const value = String(id || '').toUpperCase();
    const hit = (catalog || motifCatalogue()).find((m) => String(m.value || m.id || '').toUpperCase() === value);
    if (!hit) return { value, label: value, group: 'operationnel' };
    return {
      value,
      label: hit.label || hit.libelle || value,
      group: hit.group || hit.group_code || 'operationnel',
      legacy: Boolean(hit.legacy || hit.historical || hit.historique)
    };
  }

  function normalizePolicyCatalog(policyState) {
    const motifs = ((policyState && policyState.motifs) || []).map((row) => ({
      value: row.value || row.id || row.motif_id,
      label: row.label || row.libelle,
      group: row.group || row.group_code || 'operationnel',
      legacy: Boolean(row.legacy || row.historical || row.historique)
    })).filter((row) => row.value);
    return motifs.length ? motifs : motifCatalogue();
  }

  function policyForDomaine(domaineCode, policyState) {
    const raw = String(domaineCode || '').toUpperCase();
    const domain = raw === 'PAPR' ? 'PR' : raw;
    if (policyState && String(policyState.domainCode || policyState.domain_code || '').toUpperCase() === domain) return policyState;
    const policies = (policyState && policyState.policies) || [];
    return policies.find((row) => String(row.domainCode || row.domain_code || '').toUpperCase() === domain) || null;
  }

  function motifsSaisieForDomaine(domaineCode, policyState) {
    const policy = policyForDomaine(domaineCode, policyState);
    if (policy && Array.isArray(policy.excuseMotifs) && policy.excuseMotifs.length) {
      const catalog = normalizePolicyCatalog(policyState);
      return policy.excuseMotifs.map((id) => motifFromPolicyId(id, catalog));
    }
    return isJspDomaine(domaineCode) ? MOTIFS_JSP.slice() : MOTIFS.slice();
  }

  function motifCatalogue() {
    return MOTIFS.concat(MOTIFS_JSP, MOTIFS_DISPENSE, MOTIFS_DISPENSE_HISTORIQUES, MOTIFS_HISTORIQUES);
  }

  function motifsForRow(row, domaineCode, policyState) {
    const domaine = domaineCode || row && (row.domaineCode || row.domaine_code);
    const base = motifsSaisieForDomaine(domaine, policyState);
    const extra = MOTIFS.concat(MOTIFS_JSP, MOTIFS_HISTORIQUES).filter((m) => {
      if (!row || row.motifAbsence !== m.value) return false;
      return !base.some((item) => item.value === m.value);
    });
    return base.concat(extra);
  }

  function motifsDispenseForRow(row, domaineCode, policyState) {
    const policy = policyForDomaine(domaineCode || (row && (row.domaineCode || row.domaine_code)), policyState);
    const catalog = normalizePolicyCatalog(policyState);
    if (policy && Array.isArray(policy.dispenseMotifs)) {
      const motifs = policy.dispenseMotifs.map((id) => motifFromPolicyId(id, catalog));
      if (row && row.motifAbsence && !motifs.some((item) => item.value === row.motifAbsence)) {
        const extra = motifFromPolicyId(row.motifAbsence, catalog);
        extra.legacy = true;
        motifs.push(extra);
      }
      return motifs;
    }
    const motifs = MOTIFS_DISPENSE.slice();
    if (row && row.motifAbsence === 'PAS_CONCERNE') motifs.push(MOTIFS_DISPENSE_HISTORIQUES[0]);
    return motifs;
  }

  function isDispenseMotif(value) {
    return MOTIFS_DISPENSE.concat(MOTIFS_DISPENSE_HISTORIQUES).some((m) => m.value === String(value || ''));
  }

  function motifShortLabel(code) {
    const value = String(code || '');
    if (!value) return '';
    const hit = motifCatalogue().find((m) => m.value === value);
    if (!hit) return value;
    return String(hit.label || '').replace(/\s*\(historique\)\s*$/i, '');
  }

  function informationMotifLabel(row) {
    const catchup = permutationCatchupSourceLabel(row);
    if (catchup) return catchup;
    const permutation = permutationSourceInformationLabel(row);
    if (permutation) return permutation;
    const statut = String((row && (row.statut || row.statutParticipation)) || '').toUpperCase();
    if (statut !== 'ABSENT_EXCUSE' && statut !== 'EXCUSE' && statut !== 'DISPENSE') return '';
    return motifShortLabel(row && (row.motifAbsence || row.motif_absence || row.sessionMotif || row.motif));
  }

  function cleanLabel(value) {
    return String(value == null ? '' : value).trim();
  }

  function permutationStatusLabel(code) {
    const status = String(code || '').toUpperCase();
    if (status === 'A_RATTRAPER') return 'À rattraper';
    if (status === 'RATTRAPPE') return 'Rattrapé';
    if (status === 'A_REGULARISER') return 'À régulariser';
    if (status === 'REGULARISE') return 'Régularisé';
    return status || '—';
  }

  function permutationSourceLabel(source) {
    const src = source || {};
    const eventLabel = cleanLabel(src.libelle || src.eventLabel || src.evenementLibelle || src.label);
    const cible = cleanLabel(src.cibleLabel || src.cible || src.oi || src.niveauLabel || src.niveau);
    if (eventLabel && cible) return `${eventLabel}, section ${cible}`;
    if (eventLabel) return eventLabel;
    if (cible) return `Section ${cible}`;
    return 'Source de permutation';
  }

  function permutationCatchupMotif(source) {
    return `permutation_rattrapage|${permutationSourceLabel(source)}`;
  }

  function permutationCatchupSourceLabel(row) {
    const raw = cleanLabel(row && (row.catchupSourceLabel || row.rattrapageSourceLabel || row.sourcePermutationLabel || row.motifInclusion || row.motif_inclusion));
    if (!raw) return '';
    const marker = 'permutation_rattrapage|';
    if (raw.toLowerCase().startsWith(marker)) return raw.slice(marker.length).trim();
    if (row && (row.rattrapageSourceLabel || row.rattrapage_source_label) && !raw.includes('|')) return raw;
    return '';
  }

  function permutationRattrapageSectionLabel(row) {
    return cleanLabel(row && (
      row.permutationRattrapageCibleLabel
      || row.permutation_rattrapage_cible_label
      || row.rattrapageCibleLabel
      || row.rattrapage_cible_label
    ));
  }

  function permutationSourceInformationLabel(row) {
    const statut = String((row && (row.statut || row.statutParticipation)) || '').toUpperCase();
    if (statut !== 'PERMUTATION') return '';
    const section = permutationRattrapageSectionLabel(row);
    if (section) return `Rattrapage section ${section}`;
    return 'À rattraper';
  }

  function isPermutationCatchup(row) {
    return Boolean(permutationCatchupSourceLabel(row) || row && (row.catchup || row.rattrapage || row.isCatchup));
  }

  function sessionExplainTooltip(row) {
    if (!row) return '';
    if (row.sessionMessage) return String(row.sessionMessage);
    if (coveredInGlobalBilan(row)) {
      const session = String(row.sessionReferenceLabel || row.session_reference_label || '').trim();
      if (session) return `Réalisé lors de la session ${session}.`;
      const reference = String(row.sessionReferenceEventLabel || row.session_reference_event_label || row.referenceEventLabel || '').trim();
      const date = String(row.sessionReferenceEventDate || row.session_reference_event_date || row.referenceEventDate || '').trim();
      if (reference) return `Déjà comptabilisé lors de ${reference}${date ? ` — ${formatDate(date)}` : ''}.`;
    }
    const name = [row.prenom, row.nomFamille || row.nom].filter(Boolean).join(' ') || 'Cette personne';
    const motif = informationMotifLabel(row);
    const exercise = String(row.sessionExerciseLabel || '').trim();
    const statut = String(row.statut || '').toUpperCase();
    if (statut === 'ABSENT_EXCUSE' || statut === 'EXCUSE' || row.sessionExcuse) {
      const motifBit = motif ? ` pour motif ${motif}` : '';
      const sessionBit = exercise ? ` lors de la session d’exercice ${exercise}` : '';
      return `${name} a été excusé${motifBit}${sessionBit}.`;
    }
    if (statut === 'DISPENSE' || row.sessionDispense) {
      return `${name} est dispensé de cet exercice pour la raison suivante : ${motif || '—'}.`;
    }
    return '';
  }

  function placeSessionTooltip(anchor, tooltip, viewport) {
    const vp = viewport || { width: (typeof window !== 'undefined' && window.innerWidth) || 1024, height: (typeof window !== 'undefined' && window.innerHeight) || 768 };
    const row = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : (anchor || { left: 0, right: 240, top: 0, bottom: 44 });
    const tw = Math.min(360, Math.max(160, vp.width - 16));
    const th = (tooltip && tooltip.offsetHeight) || 72;
    let left = Number(row.right || 0) + 8;
    if (left + tw > vp.width - 8) left = Number(row.left || 0) - tw - 8;
    if (left < 8) left = 8;
    let top = Number(row.top || 0);
    if (top + th > vp.height - 8) top = Math.max(8, Number(row.top || 0) - th - 8);
    if (tooltip && tooltip.style) {
      tooltip.style.position = 'fixed';
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.style.width = `${Math.round(tw)}px`;
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
    }
    return { left, top, width: tw };
  }

  const STATUT_LABELS = {
    PRESENT: 'Présent',
    ABSENT_EXCUSE: 'Excusé',
    ABSENT_NON_EXCUSE: 'Absent',
    DISPENSE: 'Dispensé',
    PERMUTATION: 'Permutation',
    NON_RENSEIGNE: 'Non renseigné',
    NON_CONCERNE: 'Non concerné',
    PLANIFIE: 'Planifié',
    SAISIE_EN_COURS: 'Saisie en cours',
    A_TRAITER: 'À traiter',
    TRAITE: 'Traité',
    REALISE: 'Réalisé',
    EN_COURS: 'En cours',
    TERMINE: 'Terminé',
    REPORTE: 'Reporté',
    ANNULE: 'Annulé',
    LEGACY_AGGREGATED: 'Historique agrégé'
  };

  const ROLE_LABELS = {
    PARTICIPANT: 'Participant',
    FORMATEUR: 'Formateur',
    MONITEUR: 'Moniteur',
    SURVEILLANT: 'Surveillant',
    AUXILIAIRE: 'Auxiliaire',
    RENFORT: 'Renfort',
    REMPLACANT: 'Remplaçant'
  };
  const ENCADREMENT_ROLE_ORDER = Object.freeze(['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
  const ROLES_ENCADREMENT = new Set(ENCADREMENT_ROLE_ORDER);

  function domaineAffiche(code) {
    const value = String(code || '').toUpperCase();
    if (value === 'PAPR' || value === 'PR') return 'PR';
    if (value === 'GEN') return 'Général';
    return String(code || '');
  }

  function isPrDomaine(code) {
    const value = String(code || '').toUpperCase();
    return value === 'PR' || value === 'PAPR';
  }

  const SHARED_DOMAIN_GROUPS = Object.freeze([
    { label: 'Opérationnel', codes: Object.freeze(['DPS', 'DAP', 'JSP']) },
    { label: 'Formation', codes: Object.freeze(['FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR']), separatorBefore: 'AUTO' }
  ]);

  const SHARED_OI_BY_DOMAIN = Object.freeze({
    DPS: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'G1', label: 'G1' },
      { value: 'C1', label: 'C1' },
      { value: 'B1', label: 'B1' },
      { value: 'B2', label: 'B2' }
    ]),
    DAP: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'Y1', label: 'Y1' },
      { value: 'Y2', label: 'Y2' },
      { value: 'Y3', label: 'Y3' },
      { value: 'Y4', label: 'Y4' }
    ]),
    JSP: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'GEN', label: 'Général' }
    ]),
    FOBA: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'GEN', label: 'Général' }
    ]),
    FOCO: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'DPS', label: 'DPS' },
      { value: 'DAP', label: 'DAP' },
      { value: 'JSP', label: 'JSP' }
    ]),
    FOCA: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'GEN', label: 'Général' }
    ]),
    FOSPEC: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'GEN', label: 'Général' }
    ]),
    PR: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'GEN', label: 'Général' },
      { value: 'PAPR', label: 'PAPR' },
      { value: 'ABC', label: 'PABC' }
    ]),
    AUTO: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'PL', label: 'cond PL' },
      { value: 'TP9', label: 'cond TP9' },
      { value: 'VL', label: 'cond VL' },
      { value: 'GRUTIER', label: 'Grutier' },
      { value: 'MEA', label: 'MEA' },
      { value: 'BAT', label: 'Pilote BAT' }
    ])
  });

  const SHARED_SPEC_BY_DOMAIN = Object.freeze({
    FOSPEC: Object.freeze([
      { value: '', label: 'Non précisé' },
      { value: 'Antichute', label: 'Antichute' },
      { value: 'NAC', label: 'NAC' },
      { value: 'OFSI', label: 'OFSI' },
      { value: 'OP VPC', label: 'OP VPC' }
    ])
  });

  function compactReferentialCode(value) {
    return String(value || '').toUpperCase().replace(/[\s/_-]+/g, '');
  }

  function domainTaxonomyGroups() {
    return SHARED_DOMAIN_GROUPS.map((group) => ({ label: group.label, codes: group.codes.slice(), separatorBefore: group.separatorBefore || '' }));
  }

  function sharedOiOptions(domain) {
    const code = String(domain || '').trim().toUpperCase() === 'PAPR' ? 'PR' : String(domain || '').trim().toUpperCase();
    if (!code) return [{ value: '', label: 'Non précisé' }];
    const rows = SHARED_OI_BY_DOMAIN[code] || [
      { value: '', label: 'Non précisé' },
      { value: 'GEN', label: 'Général' }
    ];
    return rows.map((row) => ({ value: row.value, label: row.label }));
  }

  function sharedSpecOptions(domain) {
    const code = String(domain || '').toUpperCase();
    const rows = SHARED_SPEC_BY_DOMAIN[code] || [{ value: '', label: 'Non précisé' }];
    return rows.map((row) => ({ value: row.value, label: row.label }));
  }

  function normalizeOiCode(domain, raw) {
    const code = String(domain || '').trim().toUpperCase() === 'PAPR' ? 'PR' : String(domain || '').trim().toUpperCase();
    const compact = compactReferentialCode(raw);
    if (!compact) return '';
    if (code === 'PR') {
      if (compact === 'GEN' || compact === 'GENERAL') return 'GEN';
      if (compact === 'PAPR') return 'PAPR';
      if (compact === 'ABC' || compact === 'PRABC' || compact === 'PABC') return 'ABC';
    }
    if (code === 'FOCO' && ['DPS', 'DAP', 'JSP'].includes(compact)) return compact;
    if (code === 'AUTO') {
      if (compact === 'PL' || compact === 'CONDPL') return 'PL';
      if (compact === 'TP9' || compact === 'CONDTP9') return 'TP9';
      if (compact === 'VL' || compact === 'CONDVL') return 'VL';
      if (compact === 'GRUTIER') return 'GRUTIER';
      if (compact === 'MEA') return 'MEA';
      if (compact === 'BAT' || compact === 'PILOTEBAT') return 'BAT';
    }
    if (compact === 'GEN' || compact === 'GENERAL') return 'GEN';
    return String(raw || '').toUpperCase();
  }

  function hasDuplicateOiValues(options) {
    const seen = new Set();
    for (const row of options || []) {
      const key = String(row.value == null ? '' : row.value);
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }

  function eventCiblesForForm(domain, dbCibles, selectedIds) {
    const code = String(domain || '').toUpperCase();
    const selected = new Set((selectedIds || []).map((id) => String(id)));
    const domainRows = (dbCibles || []).filter((cible) => String(cible.domaineCode || cible.domaine_code || '').toUpperCase() === code);
    const entries = sharedOiOptions(code).filter((row) => row.value);
    const seen = new Set();
    const out = [];
    entries.forEach((entry) => {
      const match = domainRows.find((cible) => normalizeOiCode(code, cible.niveauCode || cible.niveau_code) === entry.value);
      if (!match || seen.has(entry.value)) return;
      seen.add(entry.value);
      out.push(match);
    });
    domainRows.forEach((cible) => {
      const id = String(cible.cibleId || cible.cible_id || '');
      const key = normalizeOiCode(code, cible.niveauCode || cible.niveau_code) || id;
      if ((cible.actif === false && !selected.has(id)) || seen.has(key) || seen.has(id)) return;
      seen.add(key);
      seen.add(id);
      out.push(cible);
    });
    if (code === 'AUTO') out.sort((a, b) => String(a.libelle || a.niveauCode || '').localeCompare(String(b.libelle || b.niveauCode || ''), 'fr'));
    return out;
  }

  function eventLieuDisplayLabel(lieu) {
    if (!lieu) return '';
    const name = String(lieu.nomCourt || lieu.nom_court || lieu.nomComplet || lieu.nom_complet || '').trim();
    const loc = String(lieu.localite || '').trim();
    if (name && loc && name.toLowerCase().indexOf(loc.toLowerCase()) < 0) return `${name} – ${loc}`;
    return name || loc || '';
  }

  function sortEventLieux(lieux) {
    return sortByScopeSiteOrder(lieux || [], (row) => row && (row.oiCode || row.oi_code || row.siteCode || row.nomCourt || row.nom_court));
  }

  function niveauAffiche(domaineCode, niveauCode) {
    const domaine = String(domaineCode || '');
    const niveau = String(niveauCode || '');
    const compactNiveau = compactReferentialCode(niveau);
    const normalized = normalizeOiCode(domaine, niveau);
    const shared = sharedOiOptions(domaine).find((row) => row.value && (row.value === normalized || row.value === niveau || row.value === compactNiveau));
    if (shared) return shared.label;
    if (niveau === 'GEN' || compactNiveau === 'GEN') return 'Général';
    if (domaine === 'FOBA' && /^[123]$/.test(niveau)) return `FOBA ${niveau}`;
    if (domaine === 'FOCA') {
      if (niveau === 'I') return 'Échelon I';
      if (niveau === 'II') return 'Échelon II';
      if (niveau === 'III_IV' || niveau === 'III-IV' || niveau === 'III/IV') return 'Échelons III et IV';
    }
    if (domaine === 'JSP' && compactNiveau === 'CAD') return 'Cadets';
    return niveau;
  }

  function cibleMetierLabel(cible, niveauCode) {
    let domaine = '';
    let niveau = '';
    let libelle = '';
    if (cible && typeof cible === 'object' && arguments.length < 2) {
      domaine = String(cible.domaineCode || cible.domaine_code || '');
      niveau = String(cible.niveauCode || cible.niveau_code || '');
      libelle = String(cible.libelle || cible.libelleAffiche || '');
    } else {
      domaine = String(cible || '');
      niveau = String(niveauCode || '');
    }
    const compact = compactReferentialCode(niveau);
    if (domaine === 'JSP' && compact === 'CAD') return 'Cadets';
    const affiche = niveauAffiche(domaine, niveau);
    if (affiche && affiche !== niveau) return affiche;
    if (libelle) {
      const raw = `${domaine} ${niveau}`.trim();
      if (libelle !== niveau && libelle !== raw && libelle !== domaine) return libelle;
    }
    return affiche || niveau;
  }

  function statutLabel(code) {
    return STATUT_LABELS[code] || code || '';
  }

  function parsePrSessionLabel(label) {
    const text = String(label || '').trim();
    const m = text.match(/^(\d+)(?:\.(\d+))?$/);
    if (!m) return { label: text, major: Number.MAX_SAFE_INTEGER, minor: Number.MAX_SAFE_INTEGER };
    return { label: text, major: Number(m[1]), minor: m[2] == null ? 0 : Number(m[2]) };
  }

  function uniqueSortedPrSessionLabels(labels) {
    const seen = new Set();
    return (labels || [])
      .map((label) => String(label || '').trim())
      .filter(Boolean)
      .filter((label) => {
        if (seen.has(label)) return false;
        seen.add(label);
        return true;
      })
      .sort((a, b) => {
        const left = parsePrSessionLabel(a);
        const right = parsePrSessionLabel(b);
        if (left.major !== right.major) return left.major - right.major;
        if (left.minor !== right.minor) return left.minor - right.minor;
        return left.label.localeCompare(right.label, 'fr', { numeric: true, sensitivity: 'base' });
      });
  }

  function compactPrSessionLabels(labels) {
    const sorted = uniqueSortedPrSessionLabels(labels);
    const parts = [];
    let run = [];
    const flush = () => {
      if (!run.length) return;
      if (run.length >= 3) parts.push(`${run[0].label} à ${run[run.length - 1].label}`);
      else run.forEach((item) => parts.push(item.label));
      run = [];
    };
    for (const label of sorted) {
      const parsed = parsePrSessionLabel(label);
      const last = run[run.length - 1];
      const continuous = last
        && parsed.major === last.major
        && Number.isFinite(parsed.minor)
        && Number.isFinite(last.minor)
        && parsed.minor === last.minor + 1;
      if (!run.length || continuous) run.push(parsed);
      else {
        flush();
        run.push(parsed);
      }
    }
    flush();
    return parts;
  }

  function joinFrenchList(parts) {
    const values = (parts || []).filter(Boolean);
    if (!values.length) return '';
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} et ${values[1]}`;
    return `${values.slice(0, -1).join(', ')} et ${values[values.length - 1]}`;
  }

  function formatPrSessionList(labels) {
    const parts = compactPrSessionLabels(labels);
    return joinFrenchList(parts);
  }

  function formatFormateurPrTooltip(fullName, nip, labels) {
    const sorted = uniqueSortedPrSessionLabels(labels);
    if (!sorted.length) return '';
    const person = `${fullName || 'Personne'}${nip ? ` (${nip})` : ''}`;
    if (sorted.length === 1) {
      return `${person} participe comme Formateur PR à la session ${sorted[0]}.`;
    }
    return `${person} participe comme Formateur PR aux sessions ${formatPrSessionList(sorted)}.`;
  }

  function formatDate(iso) {
    const text = String(iso || '').slice(0, 10);
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return text || '—';
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function formatDurationMinutes(minutes) {
    const d = Number(minutes);
    if (!Number.isFinite(d) || d < 0) return '';
    const h = Math.floor(d / 60);
    const r = d % 60;
    if (h && r) return `${h} h ${String(r).padStart(2, '0')}`;
    if (h) return `${h} h`;
    return `${r} min`;
  }

  function formatClockLabel(value) {
    const text = String(value || '').trim();
    const m = text.match(/^(\d{1,2})[:h.](\d{2})/);
    if (!m) return '';
    return `${String(m[1]).padStart(2, '0')}h${m[2]}`;
  }

  function formatDurationHoursMinutes(minutes) {
    const value = Number(minutes);
    if (!Number.isFinite(value)) return '';
    const rounded = Math.round(value);
    const hours = Math.floor(rounded / 60);
    const rest = rounded % 60;
    if (!hours) return `${rounded} min`;
    return `${rounded} min / ${hours} h ${String(rest).padStart(2, '0')}`;
  }

  function isEffectiveParticipationStatut(statut) {
    return String(statut || '').toUpperCase() === 'PRESENT';
  }


  function formatTaux(percentage) {
    if (percentage === null || percentage === undefined || percentage === '') return '—';
    const n = Number(percentage);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(1).replace('.', ',')} %`;
  }

  function formatGap(gapPct) {
    if (gapPct === null || gapPct === undefined || gapPct === '') return null;
    const n = Number(gapPct);
    if (!Number.isFinite(n)) return null;
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1).replace('.', ',')} pts`;
  }

  function analyticStatusLabel(code) {
    if (code === 'ATTEINT') return 'Atteint';
    if (code === 'ATTENTION') return 'Attention';
    if (code === 'VIGILANCE') return 'Vigilance';
    return 'Non évaluable';
  }

  const CHART_COLORS = Object.freeze({
    officiel: '#171C8F',
    objectif: '#FFA300',
    legacy: '#54585A',
    accent: '#DE000A'
  });

  function participationChartLayout(officiel, legacyPoints) {
    const official = (officiel || []).filter((b) => b && b.month && b.percentage != null);
    const legacy = (legacyPoints || []).filter((p) => p && p.date && p.tauxLegacy != null);
    if (!official.length && !legacy.length) return { mode: 'empty', height: 72, width: 640 };
    if (!official.length) return { mode: 'legacy', height: 112, width: 640 };
    if (official.length < 3) return { mode: 'sparse', height: 132, width: 640 };
    return { mode: 'full', height: 140, width: 640 };
  }

  function participationChartSvg(officiel, legacyPoints, size) {
    const layout = participationChartLayout(officiel, legacyPoints);
    const width = (size && size.width) || layout.width;
    const height = (size && size.height) || layout.height;
    const pad = { l: 36, r: 12, t: 12, b: 24 };
    const buckets = (officiel || []).filter((b) => b && b.month);
    const legacy = (legacyPoints || []).filter((p) => p && p.date && p.tauxLegacy != null);
    if (!buckets.length && !legacy.length) {
      return `<p class="scope-empty scope-chart-empty">Aucune série officielle sur cette période.</p>`;
    }
    const months = [...new Set([
      ...buckets.map((b) => b.month),
      ...legacy.map((p) => String(p.date).slice(0, 7))
    ])].sort();
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const xOf = (month) => {
      if (months.length === 1) return pad.l + innerW / 2;
      const i = months.indexOf(month);
      return pad.l + (i / (months.length - 1)) * innerW;
    };
    const yOf = (pct) => pad.t + innerH * (1 - (Number(pct) / 100));
    const officialPts = buckets
      .filter((b) => b.percentage != null)
      .map((b) => `${xOf(b.month).toFixed(1)},${yOf(b.percentage).toFixed(1)}`);
    const uniqueThresholds = [...new Set(buckets.map((b) => b.thresholdPct).filter((t) => t != null && t !== ''))];
    let objectiveMark = '';
    if (uniqueThresholds.length === 1) {
      const y = yOf(uniqueThresholds[0]);
      objectiveMark = `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="${CHART_COLORS.objectif}" stroke-dasharray="5 4" stroke-width="2" />`;
    } else if (uniqueThresholds.length > 1) {
      objectiveMark = '';
    }
    const ticks = [0, 50, 100].map((v) => {
      const y = yOf(v);
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="#e3e7ec"/><text x="4" y="${y + 4}" font-size="11" fill="#6b7785">${v}</text>`;
    }).join('');
    const monthLabels = months.map((m) => `<text x="${xOf(m)}" y="${height - 6}" font-size="11" text-anchor="middle" fill="#6b7785">${m.slice(5)}</text>`).join('');
    const legacyDots = legacy.map((p) => {
      const month = String(p.date).slice(0, 7);
      return `<circle cx="${xOf(month)}" cy="${yOf(p.tauxLegacy)}" r="3.5" fill="${CHART_COLORS.legacy}" />`;
    }).join('');
    return `<svg class="scope-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution du taux de participation">
      ${ticks}
      ${objectiveMark}
      ${officialPts.length > 1 ? `<polyline fill="none" stroke="${CHART_COLORS.officiel}" stroke-width="2.4" points="${officialPts.join(' ')}" />` : ''}
      ${officialPts.length === 1 ? `<circle cx="${officialPts[0].split(',')[0]}" cy="${officialPts[0].split(',')[1]}" r="4" fill="${CHART_COLORS.officiel}" />` : ''}
      ${legacyDots}
      ${monthLabels}
    </svg>`;
  }

  function sousDomaineNavLabel(node) {
    if (!node) return '';
    if (node.code === 'PR') return 'Protection respiratoire';
    if (node.code === 'AUTO') return 'AUTO';
    return node.libelle || node.libelleAffiche || node.code;
  }

  function navParentCode(arbre, code) {
    const wanted = String(code || '');
    for (const domaine of arbre || []) {
      if ((domaine.sousDomaines || []).some((s) => s.code === wanted)) return domaine.code;
    }
    return null;
  }

  function normalizeNavArbre(arbre, domaines, cibles) {
    if (arbre && arbre.length) return arbre;
    const list = (domaines || []).map((d) => {
      const code = d.code;
      const inferredParent = d.parentCode || d.parent_code || null;
      return {
        code,
        libelle: d.libelle,
        libelleAffiche: (code === 'PR' || code === 'PAPR' || String(d.libelleAffiche || d.libelle_affiche || '').toUpperCase() === 'PAPR') ? 'PR' : (d.libelleAffiche || d.libelle_affiche || code),
        nature: d.nature || (inferredParent ? 'SOUS_DOMAINE' : 'DOMAINE'),
        parentCode: inferredParent
      };
    });
    const roots = list.filter((d) => d.nature !== 'SOUS_DOMAINE' && !d.parentCode);
    return roots.map((d) => ({
      ...d,
      sousDomaines: list.filter((s) => s.parentCode === d.code).map((s) => ({
        ...s,
        cibles: (cibles || []).filter((c) => c.domaineCode === s.code)
      })),
      cibles: (cibles || []).filter((c) => c.domaineCode === d.code)
    }));
  }

  const EVENT_DOMAIN_GROUPS = Object.freeze(SHARED_DOMAIN_GROUPS.map((group) => group.codes));

  const OBJECTIF_PORTEE_LABELS = Object.freeze({
    GLOBAL: 'Général',
    DOMAINE: 'Domaine',
    CIBLE: 'Cible'
  });

  const OBJECTIF_UX_DOMAINES = Object.freeze(['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR']);
  const OBJECTIF_UX_CIBLES = Object.freeze({
    DPS: ['G1', 'C1', 'B1', 'B2'],
    DAP: ['Y1', 'Y2', 'Y3', 'Y4'],
    JSP: ['G1', 'C1', 'B1'],
    FOBA: ['1', '2', '3'],
    FOCO: [],
    FOCA: [],
    FOSPEC: [],
    AUTO: [],
    PR: []
  });
  // Niveau UX futur (hors lot) : Domaine → Cible → PÉRIMÈTRE. Non implémenté.
  const OBJECTIF_FUTURE_LEVEL = 'PERIMETRE';

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function isValidYmd(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isInteger(y) || y < 1000 || y > 9999) return false;
    if (!Number.isInteger(m) || m < 1 || m > 12) return false;
    if (!Number.isInteger(d) || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function toIsoDate(value) {
    const text = String(value || '').trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso && isValidYmd(iso[1], iso[2], iso[3])) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const eu = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (eu && isValidYmd(eu[3], pad2(eu[2]), pad2(eu[1]))) {
      return `${eu[3]}-${pad2(eu[2])}-${pad2(eu[1])}`;
    }
    return '';
  }

  function formatUiDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return '';
    return formatDate(iso);
  }

  function qvDateKey(value) {
    const iso = toIsoDate(value);
    if (iso) return iso;
    return String(value || '').slice(0, 10);
  }

  function qvShiftDateKey(dateKey, days) {
    const iso = qvDateKey(dateKey);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const date = new Date(`${iso}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function qvCalendarKind(row) {
    return String((row && (row.typeJour || row.type_jour)) || '').toUpperCase();
  }

  function qvCalendarEndDate(row) {
    const meta = (row && row.metadata) || {};
    return qvDateKey(meta.dateFin || meta.date_fin || meta.endDate || meta.fin || (row && (row.dateFin || row.date_fin)));
  }

  function qvCalendarMarkVisible(row) {
    if (!row) return false;
    const jour = qvDateKey(row.jour);
    if (!jour) return false;
    const kind = qvCalendarKind(row);
    if (kind === 'NEUTRALISATION_INTERNE') return false;
    if (kind === 'FERIE' || kind === 'VACANCES_SCOLAIRES') return true;
    return row.neutralise !== true;
  }

  function qvExpandCalendarDays(calendarDays) {
    const byDate = {};
    const push = (date, row) => {
      if (!date) return;
      (byDate[date] = byDate[date] || []).push(row);
    };
    (calendarDays || []).forEach((row) => {
      if (!qvCalendarMarkVisible(row)) return;
      const start = qvDateKey(row.jour);
      const end = qvCalendarEndDate(row);
      const kind = qvCalendarKind(row);
      if (kind === 'VACANCES_SCOLAIRES' && end && end > start) {
        let guard = 0;
        for (let date = start; date && date <= end && guard < 90; date = qvShiftDateKey(date, 1), guard += 1) push(date, row);
      } else {
        push(start, row);
      }
    });
    return byDate;
  }

  function qvCalendarMarksForDate(byDate, date) {
    const marks = (byDate && byDate[qvDateKey(date)]) || [];
    return {
      holiday: marks.some((row) => qvCalendarKind(row) === 'FERIE'),
      vacation: marks.some((row) => qvCalendarKind(row) === 'VACANCES_SCOLAIRES'),
      labels: marks.map((row) => row.libelle).filter(Boolean)
    };
  }

  function qvVacationPeriods(calendarDays) {
    const periods = [];
    const seen = new Set();
    (calendarDays || []).forEach((row) => {
      if (!qvCalendarMarkVisible(row) || qvCalendarKind(row) !== 'VACANCES_SCOLAIRES') return;
      const debut = qvDateKey(row.jour);
      const fin = qvCalendarEndDate(row) || debut;
      const libelle = row.libelle || 'Vacances scolaires';
      const key = `${debut}|${fin}|${libelle}`;
      if (!debut || seen.has(key)) return;
      seen.add(key);
      periods.push({ debut, fin, libelle });
    });
    periods.sort((a, b) => String(a.debut).localeCompare(String(b.debut)) || String(a.fin).localeCompare(String(b.fin)));
    const merged = [];
    periods.forEach((row) => {
      const last = merged[merged.length - 1];
      const adjacent = last && last.libelle === row.libelle && last.fin >= qvShiftDateKey(row.debut, -1);
      if (adjacent) {
        if (row.debut < last.debut) last.debut = row.debut;
        if (row.fin > last.fin) last.fin = row.fin;
        return;
      }
      merged.push({ debut: row.debut, fin: row.fin, libelle: row.libelle });
    });
    return merged;
  }

  function qvHolidayEntries(calendarDays) {
    const entries = [];
    const seen = new Set();
    (calendarDays || []).forEach((row) => {
      if (!qvCalendarMarkVisible(row) || qvCalendarKind(row) !== 'FERIE') return;
      const date = qvDateKey(row.jour);
      const key = `${date}|${row.libelle || ''}`;
      if (!date || seen.has(key)) return;
      seen.add(key);
      entries.push({ date, libelle: row.libelle || 'Jour férié' });
    });
    return entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function qvAgendaDayAnchorId(date) {
    const key = qvDateKey(date);
    return key ? `qv-agenda-day-${key}` : '';
  }

  function qvIsoWeek(value) {
    const iso = qvDateKey(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 0;
    const date = new Date(`${iso}T12:00:00Z`);
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  }

  const SCOPE_SITE_ORDER = Object.freeze(['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);
  const SCOPE_DOMAIN_ORDER = Object.freeze(SHARED_DOMAIN_GROUPS.flatMap((group) => group.codes));
  const SCOPE_DOMAIN_LABELS = Object.freeze({
    DPS: 'Détachement de premier secours',
    DAP: 'Détachement d’appui',
    JSP: 'Jeunes sapeurs-pompiers',
    FOBA: 'Formation de base',
    FOCO: 'Formation continue',
    FOCA: 'Formation cadres',
    FOSPEC: 'Formations spécialisées',
    AUTO: 'Formation automobile',
    PR: 'Formation PR'
  });

  function extractSiteCode(value) {
    const match = String(value || '').toUpperCase().match(/\b([GBC][12]|Y[1-4])\b/);
    return match ? match[1] : '';
  }

  function scopeSiteRank(value) {
    const code = extractSiteCode(value);
    if (!code) return SCOPE_SITE_ORDER.length;
    const index = SCOPE_SITE_ORDER.indexOf(code);
    return index < 0 ? SCOPE_SITE_ORDER.length : index;
  }

  function compareScopeSites(a, b) {
    return scopeSiteRank(a) - scopeSiteRank(b);
  }

  function sortByScopeSiteOrder(rows, getter) {
    const get = getter || ((row) => row && (row.oiCode || row.oi_code || row.nomCourt || row.code || row.lieu || row));
    return (rows || []).slice().sort((a, b) => {
      const cmp = compareScopeSites(get(a), get(b));
      if (cmp) return cmp;
      return String(get(a) || '').localeCompare(String(get(b) || ''), 'fr');
    });
  }

  function qvStartTimeKey(value) {
    const raw = String(value || '');
    const match = raw.match(/T(\d{2}:\d{2})/) || raw.match(/\b(\d{2}:\d{2})\b/);
    return match ? match[1] : '';
  }

  function qvActivitySiteCode(row) {
    const sources = [
      row && row.siteCode,
      row && row.oiCode,
      row && row.oi,
      row && row.lieu,
      row && row.nomCourt,
      row && row.lieuCode,
      ...((row && row.cibleCodes) || []),
      row && row.title
    ];
    for (let i = 0; i < sources.length; i += 1) {
      const code = extractSiteCode(sources[i]);
      if (code) return code;
    }
    return '';
  }

  function qvActivityStableId(row) {
    return String((row && (row.activityId || row.codeEvent || row.id || row.title)) || '');
  }

  function normalizeScopeDomainCode(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'PAPR') return 'PR';
    return raw;
  }

  function qvActivityDomainCode(row) {
    return normalizeScopeDomainCode(row && (row.domain || row.domaine || row.domainCode || row.domainLabel));
  }

  function scopeDomainBand(value) {
    const code = normalizeScopeDomainCode(value);
    const index = SCOPE_DOMAIN_ORDER.indexOf(code);
    if (index >= 0) return [1, index, code];
    return [2, 0, code];
  }

  function scopeDomainRank(value) {
    const band = scopeDomainBand(value);
    return (band[0] * 1000) + band[1];
  }

  function compareScopeDomains(a, b) {
    const left = scopeDomainBand(a);
    const right = scopeDomainBand(b);
    if (left[0] !== right[0]) return left[0] - right[0];
    if (left[1] !== right[1]) return left[1] - right[1];
    return String(left[2] || '').localeCompare(String(right[2] || ''), 'fr');
  }

  function sortByScopeDomainOrder(rows, getter) {
    const get = getter || ((row) => row && (row.domain || row.domainCode || row.code || row));
    return (rows || []).slice().sort((a, b) => {
      const cmp = compareScopeDomains(get(a), get(b));
      if (cmp) return cmp;
      return String(get(a) || '').localeCompare(String(get(b) || ''), 'fr');
    });
  }

  function scopeDomainLabel(value) {
    const code = normalizeScopeDomainCode(value);
    return SCOPE_DOMAIN_LABELS[code] || code || '';
  }

  function scopeDomainOrderTrail() {
    return 'DPS → DAP → JSP → FOBA → FOCO → FOCA → FOSPEC → … → AUTO → PR';
  }

  function compareQvActivities(a, b) {
    const dateCmp = String(qvDateKey((a && (a.startsAt || a.date)) || '') || '').localeCompare(String(qvDateKey((b && (b.startsAt || b.date)) || '') || ''));
    if (dateCmp) return dateCmp;
    const timeCmp = qvStartTimeKey((a && (a.startsAt || a.time)) || '').localeCompare(qvStartTimeKey((b && (b.startsAt || b.time)) || ''));
    if (timeCmp) return timeCmp;
    const domainCmp = compareScopeDomains(qvActivityDomainCode(a), qvActivityDomainCode(b));
    if (domainCmp) return domainCmp;
    const siteCmp = compareScopeSites(qvActivitySiteCode(a), qvActivitySiteCode(b));
    if (siteCmp) return siteCmp;
    return qvActivityStableId(a).localeCompare(qvActivityStableId(b), 'fr');
  }

  function qvStripSessionSuffix(title) {
    const text = String(title || '').trim();
    return text.replace(/\.(\d+)\s*$/, '').trim() || text;
  }

  function qvHumanActivityTitle(title) {
    const text = String(title || '').trim();
    if (!text) return '';
    const grouped = text.match(/^([A-Z]{2,8})\s+FORMATION_GROUPEE\s+(\d+)\s*$/i);
    if (grouped) return `Formation groupée ${grouped[1].toUpperCase()} ${grouped[2]}`;
    const inverted = text.match(/^FORMATION_GROUPEE\s+([A-Z]{2,8})\s+(\d+)\s*$/i);
    if (inverted) return `Formation groupée ${inverted[1].toUpperCase()} ${inverted[2]}`;
    return text;
  }

  function qvCodeCoursValue(row) {
    const raw = String((row && (row.codeCours || row.code_cours || row.codeEvenement)) || '').trim();
    return raw;
  }

  function qvHasXySessionNotation(value) {
    return /\d+\.\d+/.test(String(value || ''));
  }

  function qvSeriesIdentity(row) {
    return String((row && (row.seriesKey || row.groupKey || row.historicalActivityKey)) || '');
  }

  function qvIsGroupedFormation(row) {
    return /FORMATION_GROUPEE|formation group[ée]e/i.test(`${(row && row.title) || ''} ${qvSeriesIdentity(row)}`);
  }

  function qvIsRecurringExerciseIdentity(row) {
    if (/RECUR:/.test(qvSeriesIdentity(row))) return true;
    const title = qvHumanActivityTitle(qvStripSessionSuffix((row && row.title) || ''));
    return /^Exercice\s+[A-Z0-9]{2,8}$/i.test(title);
  }

  function qvTitleXySuffix(title) {
    const match = String(title || '').trim().match(/(\d+)\.(\d+)\s*$/);
    return match ? `${match[1]}.${match[2]}` : '';
  }

  function qvCollectOiCodes(row) {
    const codes = [];
    const push = (value) => {
      const raw = String(value || '').trim().toUpperCase();
      const code = extractSiteCode(raw) || (SCOPE_SITE_ORDER.indexOf(raw) >= 0 ? raw : '');
      if (code && codes.indexOf(code) < 0) codes.push(code);
    };
    ((row && row.cibleCodes) || []).forEach(push);
    ((row && row.oiCodes) || []).forEach(push);
    push(row && (row.oiCode || row.oi || row.siteCode));
    qvSeriesIdentity(row).split('|').forEach(push);
    push(qvActivitySiteCode(row));
    return codes;
  }

  function qvSortOiCodes(codes) {
    return Array.from(new Set((codes || []).filter(Boolean))).sort(compareScopeSites);
  }

  function qvProgrammeIsPermanence(row) {
    const item = row || {};
    return item.definitionId === 'CTA-PERMANENCE'
      || /permanence/i.test([item.activityLabel,item.label,item.title,item.definitionId].filter(Boolean).join(' '));
  }

  function qvProgrammeDragLock(row) {
    const item = row || {};
    if (item.definitionId === 'CTA-PERMANENCE') return 'CTA_PERMANENCE';
    if (item.publishedEventId) return 'EVENEMENT_PUBLIE';
    if (item.external || item.externalHistorical) return 'REFERENCE_EXTERNE';
    if (item.locked === true || item.fixedDate === true) return 'DATE_VERROUILLEE';
    return '';
  }

  function qvProgrammeDragReason(code) {
    const labels = {
      CTA_PERMANENCE: 'Permanence CTA calculée par le moteur',
      EVENEMENT_PUBLIE: 'Occurrence déjà publiée dans SCOPE',
      REFERENCE_EXTERNE: 'Référence historique externe',
      DATE_VERROUILLEE: 'Date verrouillée'
    };
    return labels[String(code || '')] || '';
  }

  function qvSiteGroupRank(codes) {
    const ranks = (codes || []).map(scopeSiteRank).filter((rank) => rank < SCOPE_SITE_ORDER.length);
    return ranks.length ? Math.min(...ranks) : SCOPE_SITE_ORDER.length;
  }

  function qvProgrammeOrderKey(row) {
    const item = row || {};
    const preparatory = item.definitionId === 'CTA-PERMANENCE' || item.preparation;
    const stamp = String(item.startsAt || '');
    const slicedDate = stamp.slice(0, 10);
    const slicedTime = stamp.length >= 16 ? stamp.slice(11, 16) : '';
    return {
      date: preparatory ? slicedDate : (item.publishedEventDate || slicedDate),
      startTime: preparatory ? slicedTime : (item.publishedEventStart || slicedTime),
      domain: item.domain || '',
      ois: (item.ois && item.ois.length) ? item.ois : qvCollectOiCodes(item),
      label: item.eventDisplayLabel || item.label || item.title || '',
      id: item.id || ''
    };
  }

  function compareQvProgrammeRows(a, b) {
    return compareQvBusinessOrder(qvProgrammeOrderKey(a), qvProgrammeOrderKey(b));
  }

  function compareQvBusinessOrder(a, b) {
    const left = a || {};
    const right = b || {};
    const text = (value) => String(value == null ? '' : value);
    const date = text(left.date).localeCompare(text(right.date));
    if (date) return date;
    const time = text(left.startTime).localeCompare(text(right.startTime));
    if (time) return time;
    const domain = compareScopeDomains(left.domain, right.domain);
    if (domain) return domain;
    const site = qvSiteGroupRank(left.ois) - qvSiteGroupRank(right.ois);
    if (site) return site;
    const label = text(left.label).localeCompare(text(right.label), 'fr', { numeric: true });
    if (label) return label;
    return text(left.id).localeCompare(text(right.id), 'fr', { numeric: true });
  }

  function qvCibleCodesOf(row) {
    return Array.from(new Set(((row && row.cibleCodes) || []).map((code) => String(code || '').trim()).filter(Boolean)));
  }

  function qvPublicCibleLabel(domain, codes, cibles) {
    return (codes || []).map((code) => {
      const wanted = String(code || '').trim();
      if (!wanted) return '';
      const row = (cibles || []).find((cible) => {
        const niveau = String(cible.niveauCode || cible.niveau_code || '').trim();
        const domaine = String(cible.domaineCode || cible.domaine_code || '').toUpperCase();
        if (niveau !== wanted && String(niveau).toUpperCase() !== wanted.toUpperCase()) return false;
        if (!domain) return true;
        return !domaine || domaine === String(domain || '').toUpperCase();
      });
      return row ? cibleMetierLabel(row) : (cibleMetierLabel(domain, wanted) || wanted);
    }).filter(Boolean).join(', ');
  }

  function qvSessionLabelValues(row) {
    return []
      .concat(((row && row.sessions) || []).map((session) => session && (session.sessionLabel || session.label)))
      .concat(((row && row.proposals) || []).map((proposal) => proposal && (proposal.sessionLabel || ((proposal.conflictSummary) || {}).sessionLabel)));
  }

  function qvIsStructuredMultiSession(row) {
    if (!row) return false;
    if (String(row.sourceType || '').toUpperCase() === 'CURSUS') return true;
    if (qvIsGroupedFormation(row)) return true;
    if (qvIsRecurringExerciseIdentity(row)) return false;
    if (qvHasXySessionNotation(row.title)) return true;
    if ((qvSessionLabelValues(row) || []).some(qvHasXySessionNotation)) return true;
    return false;
  }

  function qvCollectSessionNumbers(row) {
    const nums = new Set();
    ((row && row.sessions) || []).forEach((session) => {
      const n = Number((session && (session.sessionNumber || session.sessionIndex)) || 0);
      if (n > 0) nums.add(n);
    });
    ((row && row.proposals) || []).forEach((proposal) => {
      const n = qvProposalSessionNumber(proposal, 0);
      if (n > 0) nums.add(n);
    });
    return nums;
  }

  function qvIsMultiSessionRow(row) {
    return qvIsStructuredMultiSession(row);
  }

  function qvSiteAgnosticKey(value) {
    return String(value || '').replace(/\|(?:[GBC][12]|Y[1-4])\|/g, '|SITE|');
  }

  function qvPrincipalActivityKey(row) {
    const domain = qvActivityDomainCode(row);
    const displayTitle = qvHumanActivityTitle(qvStripSessionSuffix((row && row.title) || ''));
    const explicit = String((row && (row.seriesKey || row.groupKey || row.historicalActivityKey)) || '').trim();
    if (qvIsMultiSessionRow(row) || qvHasXySessionNotation(row.title)) {
      if (explicit) return `${domain}|MS:${qvSiteAgnosticKey(explicit)}`;
      return `${domain}|MS:${displayTitle || qvActivityStableId(row)}`;
    }
    const stripped = qvStripSessionSuffix((row && row.title) || '');
    if (stripped && stripped !== String((row && row.title) || '').trim()) {
      return `${domain}|MS:${qvHumanActivityTitle(stripped)}`;
    }
    return `${domain}|U:${displayTitle || qvActivityStableId(row)}`;
  }

  function qvProposalSessionNumber(proposal, fallback) {
    const conflict = (proposal && proposal.conflictSummary) || {};
    const raw = conflict.sessionNumber || conflict.sessionIndex || (proposal && (proposal.sessionNumber || proposal.sessionIndex)) || fallback || 0;
    const number = Number(raw);
    return Number.isFinite(number) ? number : 0;
  }

  function compareQvProposals(a, b) {
    const dateCmp = String(qvDateKey((a && a.startsAt) || '') || '').localeCompare(String(qvDateKey((b && b.startsAt) || '') || ''));
    if (dateCmp) return dateCmp;
    const timeCmp = qvStartTimeKey((a && a.startsAt) || '').localeCompare(qvStartTimeKey((b && b.startsAt) || ''));
    if (timeCmp) return timeCmp;
    const sessionCmp = qvProposalSessionNumber(a, 0) - qvProposalSessionNumber(b, 0);
    if (sessionCmp) return sessionCmp;
    return String((a && (a.proposalId || a.id)) || '').localeCompare(String((b && (b.proposalId || b.id)) || ''), 'fr');
  }

  function qvArbitragePeriodLabel(dates, multi) {
    const unique = Array.from(new Set((dates || []).map((value) => qvDateKey(value)).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)))).sort();
    if (!unique.length) return '';
    if (!multi || unique.length === 1) return formatDate(unique[0]);
    return `${formatDate(unique[0])} → ${formatDate(unique[unique.length - 1])}`;
  }

  function qvNeedsArbitrationRow(row) {
    return Boolean(row && (row.needsArbitration === true || row.humanReviewRequired === true));
  }

  function qvBuildArbitrageGroups(activities) {
    const map = new Map();
    (activities || []).forEach((row) => {
      const key = qvPrincipalActivityKey(row);
      const bucket = map.get(key) || { key, domain: qvActivityDomainCode(row), rows: [], proposals: [] };
      bucket.rows.push(row);
      ((row && row.proposals) || []).forEach((proposal) => bucket.proposals.push(proposal));
      map.set(key, bucket);
    });
    return Array.from(map.values()).map((group) => {
      const rows = group.rows.slice().sort(compareQvActivities);
      const primary = rows[0] || {};
      const proposals = group.proposals.slice().sort(compareQvProposals);
      const titles = rows.map((row) => String(row.title || '').trim());
      const xySuffixes = Array.from(new Set(titles.map(qvTitleXySuffix).filter(Boolean)));
      const suffixSplit = xySuffixes.length > 1;
      const sessionNums = new Set();
      rows.forEach((row) => qvCollectSessionNumbers(row).forEach((n) => sessionNums.add(n)));
      proposals.forEach((proposal) => {
        const n = qvProposalSessionNumber(proposal, 0);
        if (n > 0) sessionNums.add(n);
      });
      const sites = qvUniqueTexts(rows.flatMap(qvCibleCodesOf));
      const oiCodes = qvSortOiCodes(rows.flatMap(qvCollectOiCodes));
      const lieux = Array.from(new Set(rows.map((row) => row.lieu).concat(proposals.map((row) => row.lieu)).filter(Boolean)));
      const groupedFormation = rows.some(qvIsGroupedFormation);
      const cursus = rows.some((row) => String(row.sourceType || '').toUpperCase() === 'CURSUS' || String(row.cursus || '').trim());
      const xyTitle = suffixSplit || rows.some((row) => qvHasXySessionNotation(row.title));
      const xyLabels = rows.some((row) => (qvSessionLabelValues(row) || []).some(qvHasXySessionNotation));
      const siteReplica = oiCodes.length > 1 || (lieux.length > 1 && !xyTitle && !groupedFormation);
      const engineSeries = !rows.some(qvIsRecurringExerciseIdentity) && rows.some((row) => (
        qvHasXySessionNotation(row.numberingPattern) && (qvCollectSessionNumbers(row).size > 1 || Number(row.sessionCount || 0) > 1 || ((row.sessions) || []).length > 1)
      ));
      const multi = Boolean(cursus || groupedFormation || suffixSplit || (xyTitle && xySuffixes.length > 1) || (!siteReplica && (xyLabels || engineSeries || rows.some(qvIsStructuredMultiSession))));
      const multiSite = siteReplica && !multi;
      const sessionCount = multi
        ? Math.max(sessionNums.size, xySuffixes.length, Number(primary.sessionCount) || 0, ((primary.sessions) || []).length, 1)
        : 1;
      const dates = multi
        ? proposals.map((row) => row.startsAt).concat(rows.map((row) => row.startsAt))
        : [primary.startsAt || (proposals[0] && proposals[0].startsAt)];
      const firstStartsAt = (dates.map(qvDateKey).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort()[0]) || primary.startsAt || '';
      const responsables = Array.from(new Set(rows.map((row) => String(row.responsable || '').trim()).filter(Boolean)));
      const codeCours = qvCodeCoursValue(rows.find((row) => qvCodeCoursValue(row)) || primary);
      const statcomCode = rows.map((row) => row.statcomCode || row.statComCode).find(Boolean) || primary.statcomCode || '';
      return {
        key: group.key,
        domain: group.domain,
        domainLabel: scopeDomainLabel(group.domain),
        title: qvHumanActivityTitle(qvStripSessionSuffix(primary.title) || primary.title || ''),
        storedTitle: primary.title || '',
        cursus: String(primary.cursus || '').trim(),
        type: multi ? 'Multi-session' : 'Activité unique',
        multi,
        multiSite,
        sessionCount,
        proposalCount: Math.max(proposals.length, rows.length),
        periodLabel: qvArbitragePeriodLabel(dates, multi),
        lieu: lieux.join(' · ') || '',
        cibleCodes: sites,
        oiCodes,
        responsable: responsables[0] || '',
        responsableFonctionCode: rows.map((row) => row.responsableFonctionCode).find(Boolean) || '',
        codeCours,
        attention: rows.some((row) => row.attention),
        validated: rows.length > 0 && rows.every((row) => ['PLANIFIE', 'RETENU'].includes(String(row.status || '').toUpperCase())),
        needsArbitration: rows.some(qvNeedsArbitrationRow),
        status: primary.status,
        statcomCode,
        activityId: primary.activityId || primary.obligationId || '',
        rows,
        proposals,
        firstStartsAt
      };
    }).sort((a, b) => {
      const domainCmp = compareScopeDomains(a.domain, b.domain);
      if (domainCmp) return domainCmp;
      const titleCmp = String(a.title || '').localeCompare(String(b.title || ''), 'fr', { numeric: true });
      if (titleCmp) return titleCmp;
      const dateCmp = String(qvDateKey(a.firstStartsAt) || '9999-12-31').localeCompare(String(qvDateKey(b.firstStartsAt) || '9999-12-31'));
      if (dateCmp) return dateCmp;
      return String(a.activityId || '').localeCompare(String(b.activityId || ''), 'fr');
    });
  }

  function qvGroupArbitrageByDomain(groups) {
    const map = new Map();
    (groups || []).forEach((group) => {
      const code = group.domain || 'SCOPE';
      if (!map.has(code)) map.set(code, { code, label: scopeDomainLabel(code), groups: [] });
      map.get(code).groups.push(group);
    });
    return Array.from(map.values()).sort((a, b) => compareScopeDomains(a.code, b.code));
  }

  function qvInitialOpenDomain(domainGroups) {
    const first = (domainGroups || []).find((row) => ((row && row.groups) || []).length);
    return first ? first.code : '';
  }

  function qvArbitrageKpis(groups, allGroups) {
    const shown = groups || [];
    const universe = allGroups || shown;
    return {
      aArbitrer: shown.filter((group) => group.needsArbitration).length,
      propositions: shown.reduce((sum, group) => sum + Number(group.proposalCount || 0), 0),
      cursusMulti: shown.filter((group) => group.multi || group.cursus).length,
      attention: shown.filter((group) => group.attention).length,
      validees: universe.filter((group) => group.validated).length
    };
  }

  function qvArbitrerKindSubtitle(group) {
    if (group && group.multi) {
      const count = Math.max(2, Number(group.sessionCount || 0));
      return `${count} séances`;
    }
    if (group && group.multiSite) return 'Plusieurs sites';
    return '';
  }

  function qvArbitrageState(group) {
    if (group && group.needsArbitration) return { key: 'arbitrate', tone: 'block', label: 'À arbitrer' };
    if (group && group.validated) return { key: 'validated', tone: 'positive', label: 'Validé' };
    if (group && group.attention) return { key: 'attention', tone: 'attention', label: 'Point d’attention' };
    const status = String((group && group.status) || '').toUpperCase();
    if (status === 'ANNULE') return { key: 'cancelled', tone: 'inactive', label: 'Annulé' };
    return { key: 'planned', tone: 'info', label: 'Planifié' };
  }

  function qvUniqueTexts(values) {
    return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
  }

  function qvArbitrerSortColumns() {
    return [
      { key: 'codeCours', type: 'text', value: (group) => qvCodeCoursValue(group) },
      { key: 'title', type: 'text', value: (group) => qvHumanActivityTitle(group && group.title) },
      { key: 'statCom', type: 'text', value: (group) => (group && group.statcomCode) || '' },
      { key: 'date', type: 'date', value: (group) => (group && group.firstStartsAt) || '' },
      { key: 'horaire', type: 'time', value: (group) => {
        const row = group && ((group.rows && group.rows[0]) || (group.proposals && group.proposals[0]) || {});
        return (row && row.startsAt) || '';
      } },
      { key: 'oi', type: 'text', value: (group) => qvSortOiCodes((group && group.oiCodes) || []).join(', ') },
      { key: 'cible', type: 'text', value: (group) => (group && (group.cibleLabel || ((group.cibleCodes) || []).join(', '))) || '' },
      { key: 'responsable', type: 'text', value: (group) => (group && group.responsable) || '' },
      { key: 'lieu', type: 'text', value: (group) => (group && group.lieu) || '' },
      { key: 'etat', type: 'text', value: (group) => qvArbitrageState(group).label }
    ];
  }

  function qvCalendarConstraints(calendarDays) {
    return (calendarDays || []).filter((row) => ['VEILLE_FERIE', 'NEUTRALISATION_INTERNE'].includes(qvCalendarKind(row)))
      .map((row) => {
        const kind = qvCalendarKind(row);
        const metadata = row && row.metadata || {};
        return {
          date: qvDateKey(row.jour),
          type: kind === 'VEILLE_FERIE' ? 'Veille de jour férié' : (metadata.constraintKind === 'PONT_ASCENSION' ? 'Pont de l’Ascension' : 'Neutralisation interne'),
          motif: metadata.constraintKind === 'PONT_ASCENSION' ? 'Formation neutralisée' : (row.libelle || 'Formation neutralisée')
        };
      })
      .filter((row) => row.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function extractCalendarYear(value) {
    const s = String(value || '').trim();
    if (/^\d{4}$/.test(s)) return s;
    const iso = s.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (iso) return iso[1];
    const eu = s.match(/^\d{1,2}[./]\d{1,2}[./](\d{4})$/);
    if (eu) return eu[1];
    return '';
  }

  function yearToObjectifPeriod(year) {
    const y = extractCalendarYear(year);
    if (!y) return { dateDebut: '', dateFin: '' };
    return { dateDebut: `${y}-01-01`, dateFin: `${y}-12-31` };
  }

  function periodFromStart(start) {
    const iso = toIsoDate(start);
    const y = extractCalendarYear(iso || start);
    if (!iso || !y) return { dateDebut: iso || '', dateFin: '' };
    return { dateDebut: iso, dateFin: `${y}-12-31` };
  }

  function nextObjectifPeriod(row) {
    const end = toIsoDate(row && (row.dateFin || row.date_fin)) || toIsoDate(row && (row.dateDebut || row.date_debut));
    const y = Number(extractCalendarYear(end) || '2026') + 1;
    return yearToObjectifPeriod(String(y));
  }

  function objectifOverlapsYear(row, year) {
    const y = extractCalendarYear(year);
    if (!y) return true;
    const start = `${y}-01-01`;
    const end = `${y}-12-31`;
    const aStart = String((row && (row.dateDebut || row.date_debut)) || '').slice(0, 10);
    const aEnd = String((row && (row.dateFin || row.date_fin)) || '9999-12-31').slice(0, 10);
    if (!aStart) return false;
    return aStart <= end && start <= aEnd;
  }

  function objectifLifecycleStatus(row, todayIso) {
    if (!row || row.actif === false) return 'TERMINE';
    const today = String(todayIso || '').slice(0, 10);
    const debut = String(row.dateDebut || row.date_debut || '').slice(0, 10);
    const fin = String(row.dateFin || row.date_fin || '').slice(0, 10);
    if (debut && today && debut > today) return 'FUTUR';
    if (fin && today && fin < today) return 'TERMINE';
    return 'ACTIF';
  }

  function objectifIsFuture(row, todayIso) {
    return objectifLifecycleStatus(row, todayIso) === 'FUTUR';
  }

  function objectifHistoryProtected(row, todayIso) {
    const life = objectifLifecycleStatus(row, todayIso);
    return life === 'ACTIF' || life === 'TERMINE';
  }

  function historiqueProtegeMessage() {
    return 'Cet objectif est déjà utilisé pour une période active ou passée. Pour préserver l’historique, créez une nouvelle période.';
  }

  function objectifLifecycleLabel(status) {
    if (status === 'ACTIF') return 'Actif';
    if (status === 'FUTUR') return 'Futur';
    return 'Terminé';
  }

  function objectifPeriodLabel(row) {
    const debut = String((row && row.dateDebut) || '').slice(0, 10);
    const fin = String((row && row.dateFin) || '').slice(0, 10);
    if (/^\d{4}-01-01$/.test(debut) && /^\d{4}-12-31$/.test(fin) && debut.slice(0, 4) === fin.slice(0, 4)) {
      return debut.slice(0, 4);
    }
    if (/^\d{4}-01-01$/.test(debut) && !fin) return `${debut.slice(0, 4)} (ouverte)`;
    return [debut, fin].filter(Boolean).join(' → ') || '—';
  }

  function objectifUxFromRow(row, cibles) {
    const scope = String((row && (row.scope || row.portee)) || '').toUpperCase();
    const domaine = String((row && (row.domaineCode || row.domaine_code)) || '').toUpperCase();
    const cibleId = (row && (row.cibleId || row.cible_id)) || '';
    if (scope === 'GLOBAL' || (!scope && !domaine)) {
      return { portee: 'GLOBAL', porteeLabel: 'Général', domaineUx: '', cibleUx: '', cibleLabel: '—' };
    }
    if (scope === 'CIBLE') {
      const cible = (cibles || []).find((c) => c.cibleId === cibleId || c.cible_id === cibleId);
      const niveau = cible ? String(cible.niveauCode || cible.niveau_code || '') : '';
      const label = cible ? (niveauAffiche(cible.domaineCode || cible.domaine_code, niveau) || niveau) : '—';
      const domaineUx = String((cible && (cible.domaineCode || cible.domaine_code)) || domaine).toUpperCase();
      return { portee: 'CIBLE', porteeLabel: 'Cible', domaineUx, cibleUx: niveau, cibleLabel: label };
    }
    return { portee: 'DOMAINE', porteeLabel: 'Domaine', domaineUx: domaine, cibleUx: '', cibleLabel: '—' };
  }

  function objectifFormToEngine(form, cibles) {
    const portee = String((form && form.portee) || 'GLOBAL').toUpperCase();
    const domaine = String((form && form.domaineCode) || '').toUpperCase();
    const cibleCode = String((form && (form.cibleCode || form.cibleId)) || '').toUpperCase();
    if (portee === 'GLOBAL') return { portee: 'GLOBAL', domaineCode: null, cibleId: null };
    if (portee === 'DOMAINE') return { portee: 'DOMAINE', domaineCode: domaine || null, cibleId: null };
    const row = (cibles || []).find((c) => String(c.domaineCode).toUpperCase() === domaine && String(c.niveauCode).toUpperCase() === cibleCode);
    return { portee: 'CIBLE', domaineCode: domaine || null, cibleId: (row && row.cibleId) || null };
  }

  function objectifPreviewQuery(preview) {
    const domaine = String((preview && preview.domaine) || '').toUpperCase();
    const cibleCode = String((preview && preview.cibleCode) || '').toUpperCase();
    if (!domaine) return { analysisGrain: 'GLOBAL' };
    if (cibleCode) return { domaine, cible: cibleCode, analysisGrain: 'CIBLE' };
    return { domaine, analysisGrain: 'DOMAINE' };
  }

  function objectifCibleOptions(domaine, cibles) {
    const code = String(domaine || '').toUpperCase();
    const allowed = OBJECTIF_UX_CIBLES[code] || [];
    return allowed.map((niveau) => {
      const row = (cibles || []).find((c) => String(c.domaineCode).toUpperCase() === code && String(c.niveauCode) === niveau);
      return {
        code: niveau,
        label: code === 'FOBA' ? `FOBA ${niveau}` : niveau,
        cibleId: row ? row.cibleId : ''
      };
    });
  }

  function objectifHint(form) {
    const portee = String((form && form.portee) || '').toUpperCase();
    const domaine = String((form && form.domaineCode) || '').toUpperCase();
    const cible = String((form && form.cibleCode) || '').toUpperCase();
    if (portee === 'GLOBAL') return 'Cet objectif sera utilisé lorsqu’aucun objectif de domaine ou de cible plus précis n’existe.';
    if (portee === 'DOMAINE' && domaine) {
      return `Cet objectif s’appliquera à l’ensemble du domaine ${domaine} sauf lorsqu’un objectif plus précis existe pour une cible ${domaine}.`;
    }
    if (portee === 'CIBLE' && domaine && cible) {
      const label = domaine === 'FOBA' ? `FOBA ${cible}` : `${domaine} ${cible}`;
      return `Cet objectif s’appliquera uniquement à ${label}.`;
    }
    return '';
  }

  function filterObjectifs(rows, filters, todayIso, cibles) {
    const f = filters || {};
    return (rows || []).filter((row) => {
      if (String(row.domaineCode || '').toUpperCase() === 'PAPR') return false;
      const ux = objectifUxFromRow(row, cibles);
      if (f.portee && ux.portee !== String(f.portee).toUpperCase()) return false;
      if (f.domaine && ux.domaineUx !== String(f.domaine).toUpperCase()) return false;
      if (f.statut && objectifLifecycleStatus(row, todayIso) !== f.statut) return false;
      if (f.annee && !objectifOverlapsYear(row, f.annee)) return false;
      return true;
    });
  }

  function sortObjectifsDefault(rows, todayIso) {
    const rank = { ACTIF: 0, FUTUR: 1, TERMINE: 2 };
    return (rows || []).slice().sort((a, b) => {
      const ra = rank[objectifLifecycleStatus(a, todayIso)] ?? 9;
      const rb = rank[objectifLifecycleStatus(b, todayIso)] ?? 9;
      if (ra !== rb) return ra - rb;
      return String(b.dateDebut || '').localeCompare(String(a.dateDebut || ''));
    });
  }

  function sortObjectifs(rows, sort, todayIso) {
    const source = (rows || []).slice();
    if (!sort || !sort.key) return sortObjectifsDefault(source, todayIso);
    return sortRows(source, sort, [
      { key: 'periode', type: 'text', value: (r) => objectifPeriodLabel(r) },
      { key: 'portee', type: 'text', value: (r) => objectifUxFromRow(r).porteeLabel },
      { key: 'domaine', type: 'text', value: (r) => objectifUxFromRow(r).domaineUx || '' },
      { key: 'cible', type: 'text', value: (r) => objectifUxFromRow(r).cibleLabel || '' },
      { key: 'objectif', type: 'number', value: (r) => Number(r.thresholdPct) },
      { key: 'debut', type: 'date', value: (r) => r.dateDebut },
      { key: 'fin', type: 'date', value: (r) => r.dateFin || '' },
      { key: 'statut', type: 'text', value: (r) => objectifLifecycleStatus(r, todayIso) }
    ]);
  }

  function objectifDomainOptions() {
    return OBJECTIF_UX_DOMAINES.map((code) => ({ type: 'domain', code, label: code }));
  }

  const EVENT_DOMAIN_FILTER_ORDER = SCOPE_DOMAIN_ORDER;

  function eventDomainFilterItems(domaines) {
    const list = (domaines || []).filter((d) => {
      const code = String((d && d.code) || '').toUpperCase();
      return code && code !== 'PAPR';
    });
    const byCode = new Map(list.map((d) => [String(d.code).toUpperCase(), d]));
    const labelOf = (d, code) => {
      if (code === 'PR' || String((d && (d.libelleAffiche || d.libelle_affiche)) || '').toUpperCase() === 'PAPR') return 'PR';
      return (d && (d.libelleAffiche || d.libelle_affiche || d.libelle)) || code;
    };
    const items = EVENT_DOMAIN_FILTER_ORDER.map((code) => {
      const d = byCode.get(code);
      return { type: 'domain', code, label: labelOf(d, code) };
    });
    const used = new Set(EVENT_DOMAIN_FILTER_ORDER);
    const rest = list.filter((d) => !used.has(String(d.code).toUpperCase()));
    if (rest.length) {
      items.push({ type: 'separator', id: 'sep-rest' });
      rest.forEach((d) => {
        const code = String(d.code).toUpperCase();
        items.push({ type: 'domain', code, label: labelOf(d, code) });
      });
    }
    return items;
  }

  function eventListDomainParam(domaine) {
    const code = String(domaine || '').toUpperCase();
    if (!code || code === 'TOUS') return '';
    return code;
  }

  function buildSidebarNav(arbre, route) {
    const r = route || {};
    const order = ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR'];
    const rank = (code) => {
      const idx = order.indexOf(code);
      return idx === -1 ? order.length + 1 : idx;
    };
    const roots = (arbre || [])
      .filter((d) => d && d.nature !== 'SOUS_DOMAINE' && !d.parentCode)
      .slice()
      .sort((a, b) => {
        const ra = rank(a.code);
        const rb = rank(b.code);
        if (ra !== rb) return ra - rb;
        return String(a.libelleAffiche || a.code).localeCompare(String(b.libelleAffiche || b.code), 'fr');
      });
    const parent = navParentCode(arbre, r.domaine);
    const home = { id: 'accueil', href: '#/accueil', label: 'Accueil', icon: 'home', current: r.screen === 'accueil' };
    const activity = [
      { id: 'quo-vadis', href: '#/quo-vadis', label: 'QUO VADIS', icon: 'clock', current: r.nav === 'quo-vadis' },
      { id: 'exercices', href: '#/evenements', label: 'Événements', icon: 'events', current: r.nav === 'exercices' },
      { id: 'cycles', href: '#/cycles', label: 'Cycles', icon: 'cycles', current: r.nav === 'cycles' },
    ];
    const pilotage = [
      { id: 'vigilance', href: '#/vigilance', label: 'Vigilance', icon: 'vigilance', current: r.nav === 'vigilance' },
      { id: 'analyses', href: '#/statistiques', label: 'Analyses', icon: 'stats', current: r.screen === 'statistiques' }
    ];
    const direct = [
      { id: 'personnel', href: '#/personnel', label: 'Personnel', icon: 'people', permission: 'personnel:read', current: r.nav === 'personnel' },
      { id: 'rapports', href: '#/rapports', label: 'Rapports', icon: 'report', current: r.nav === 'rapports' }
    ];
    const adminSections = [
      {
        id: 'application',
        label: 'Application',
        items: [
          { id: 'objectifs', href: '#/reglages/objectifs', label: 'Objectifs', permission: 'references:manage', current: r.screen === 'objectifs' },
          { id: 'formations', href: '#/reglages/formations', label: 'Configuration formation', permission: 'references:manage', current: r.screen === 'formation-catalog' },
          { id: 'participation', href: '#/reglages/participation', label: 'Participation', permission: 'references:manage', current: r.screen === 'participation-admin' },
          { id: 'suivi', href: '#/reglages/suivi', label: 'Suivi nominatif', permission: 'personnel:manage', current: r.screen === 'suivi' }
        ]
      },
      {
        id: 'imports',
        label: 'Imports',
        items: [
          { id: 'import-evenements', href: '#/reglages/import-evenements', label: 'Événements', permission: 'events:create', current: r.screen === 'import-evenements' },
          { id: 'import-personnel', href: '#/reglages/import-personnel', label: 'Personnel', permission: 'personnel:manage', current: r.screen === 'import-personnel' }
        ]
      },
      {
        id: 'acces',
        label: 'Accès',
        items: [
          { id: 'utilisateurs', href: '#/reglages/utilisateurs', label: 'Utilisateurs', permission: 'users:admin', current: r.screen === 'utilisateurs' }
        ]
      },
      {
        id: 'infos',
        label: '',
        items: [
          { id: 'apropos', href: '#/reglages/apropos', label: 'À propos', current: r.screen === 'apropos' }
        ]
      }
    ];
    const domains = roots.map((d) => {
        const sous = d.sousDomaines || [];
        const cibles = (d.cibles || []).filter((c) => {
          const niveau = String(c.niveauCode || c.niveau_code || '').toUpperCase();
          return !(niveau === 'GEN' && ['DPS', 'DAP', 'JSP'].includes(String(d.code || '').toUpperCase()));
        });
        const showCibles = !sous.length && cibles.length > 0 && cibles.length <= 6;
        const children = sous.length
          ? sous.map((s) => ({
            id: s.code,
            href: `#/vue/${encodeURIComponent(s.code)}`,
            label: sousDomaineNavLabel(s)
          }))
          : (showCibles
            ? cibles.map((c) => ({
              id: c.niveauCode,
              href: `#/vue/${encodeURIComponent(d.code)}/${encodeURIComponent(c.niveauCode)}`,
              label: niveauAffiche(d.code, c.niveauCode)
            }))
            : []);
        const childActive = children.some((c) => c.id === r.domaine || c.id === r.cible);
        return {
          id: d.code,
          href: `#/vue/${encodeURIComponent(d.code)}`,
          label: d.libelleAffiche || d.code,
          expanded: d.code === r.domaine || d.code === parent || childActive,
          children
        };
      });
    return {
      home,
      groups: [
        { id: 'activite', label: 'Activité', icon: 'events', current: activity.some((item) => item.current), items: activity },
        { id: 'pilotage', label: 'Pilotage', icon: 'stats', current: pilotage.some((item) => item.current), items: pilotage },
        { id: 'administration', label: 'Administration', icon: 'settings', current: r.nav === 'reglages', sections: adminSections }
      ],
      direct,
      domains,
      primary: [home].concat(activity, pilotage),
      settings: adminSections.reduce((items, section) => items.concat(section.items || []), []),
      extras: direct
    };
  }

  function currentYear(now) {
    const d = now ? new Date(now) : new Date();
    return String(d.getFullYear());
  }

  function periodParams(state) {
    const preset = String((state && state.preset) || 'YEAR').toUpperCase();
    const year = String((state && state.year) || currentYear());
    const params = { preset, year };
    if (preset === 'MONTH') params.month = String((state && state.month) || '1');
    if (preset === 'QUARTER') params.quarter = String((state && state.quarter) || '1');
    if (preset === 'SEMESTER') params.semester = String((state && state.semester) || '1');
    if (preset === 'CUSTOM') {
      params.from = (state && state.from) || `${year}-01-01`;
      params.to = (state && state.to) || `${year}-12-31`;
    }
    if (state && state.domaine) params.domaine = state.domaine;
    if (state && state.cible) params.cible = state.cible;
    return params;
  }

  function alertLevelLabel(level) {
    if (level === 'P0') return 'Action requise';
    if (level === 'P1') return 'Vigilance métier';
    if (level === 'P2') return 'Information';
    return '';
  }

  function objectiveKpiLabel(officiel) {
    const ctx = (officiel && officiel.objectiveContext) || {};
    const distinct = ctx.distinctObjectives || [];
    if (ctx.homogeneous === false && distinct.length > 1) {
      return { title: 'Période non homogène', subtitle: 'Plusieurs objectifs temporels — aucun seuil unique.' };
    }
    if (!officiel || !officiel.objective) {
      return { title: 'Aucun objectif défini', subtitle: '' };
    }
    const o = officiel.objective;
    const pct = Number(o.thresholdPct);
    const title = Number.isFinite(pct) ? `${String(pct).replace('.', ',')} %` : '—';
    const subtitle = o.scope === 'GLOBAL'
      ? 'Global'
      : o.scope === 'DOMAINE'
        ? `Domaine ${o.domaineCode || o.domaine_code || ''}`.trim()
        : 'Cible';
    return { title, subtitle };
  }

  function participationStatutLabel(statut) {
    if (statut === 'PRESENT') return 'Présent';
    if (statut === 'PERMUTATION') return 'Permutation';
    if (statut === 'ABSENT_EXCUSE') return 'Excusé';
    if (statut === 'ABSENT_NON_EXCUSE' || statut === 'ABSENT') return 'Absent';
    if (statut === 'DISPENSE') return 'Dispensé';
    if (statut === 'NON_RENSEIGNE') return 'Non renseigné';
    if (statut === 'NON_CONCERNE') return 'Non concerné';
    return statut || '—';
  }

  const PRESENCE_SAVE_FAILED_CLOSE_MESSAGE = 'La saisie n’a pas pu être enregistrée. L’événement n’a pas été clôturé.';

  function hasUnsavedPresenceChanges(stateLike) {
    return Boolean(stateLike && (stateLike.hasUnsavedChanges || stateLike.saisieDirty));
  }

  function canStartPresenceSave(stateLike) {
    return !Boolean(stateLike && (stateLike.saveInFlight || stateLike.presenceSaveBusy));
  }

  function nextEventVersionAfterSave(saveResult, previousVersion) {
    if (saveResult && saveResult.version != null) return saveResult.version;
    if (saveResult && saveResult.evenement && saveResult.evenement.version != null) return saveResult.evenement.version;
    return previousVersion;
  }

  function isLeavingSaisieRoute(current, next) {
    if (!current || current.screen !== 'saisie') return false;
    if (!next) return true;
    if (next.screen === 'saisie' && String(next.id) === String(current.id)) return false;
    return true;
  }

  function shouldWarnBeforeUnload(stateLike, routeLike) {
    return hasUnsavedPresenceChanges(stateLike) && Boolean(routeLike && routeLike.screen === 'saisie');
  }

  function planSaisieLeave(stateLike) {
    if (!hasUnsavedPresenceChanges(stateLike)) {
      return { action: 'LEAVE', title: '', message: '' };
    }
    return {
      action: 'PROMPT',
      title: 'MODIFICATIONS NON ENREGISTRÉES',
      message: 'Des modifications n’ont pas encore été enregistrées.'
    };
  }

  async function orchestrateClosePresence(ctx) {
    const context = ctx || {};
    const order = [];
    if (context.saveInFlight || context.presenceSaveBusy) {
      return { ok: false, reason: 'in_flight', closed: false, order };
    }
    let version = context.version;
    if (hasUnsavedPresenceChanges(context) || context.dirty) {
      order.push('save');
      if (typeof context.save !== 'function') {
        return { ok: false, reason: 'save_failed', closed: false, order, message: PRESENCE_SAVE_FAILED_CLOSE_MESSAGE, dirty: true };
      }
      const saved = await context.save();
      if (!saved || saved.ok === false) {
        const conflict = Boolean(saved && (saved.conflict || saved.status === 409 || (saved.error && saved.error.status === 409)));
        return {
          ok: false,
          reason: conflict ? 'conflict' : 'save_failed',
          closed: false,
          order,
          dirty: true,
          conflict,
          message: conflict
            ? (saved.message || 'Cette séance a été modifiée ailleurs. Rechargez les données avant de poursuivre.')
            : PRESENCE_SAVE_FAILED_CLOSE_MESSAGE
        };
      }
      version = nextEventVersionAfterSave(saved, version);
    }
    if (context.isLastSession && !context.isMultiSession && typeof context.unfilledAfterSave === 'function') {
      order.push('unfilled');
      const missing = await context.unfilledAfterSave(version) || [];
      if (missing.length) {
        return { ok: false, reason: 'unfilled', closed: false, order, version, unfilled: missing, dirty: false };
      }
    }
    order.push('close');
    if (typeof context.close === 'function') await context.close(version);
    return { ok: true, closed: true, order, version, dirty: false };
  }

  async function orchestrateLeaveSaisie(ctx) {
    const context = ctx || {};
    if (!hasUnsavedPresenceChanges(context) && !context.dirty) {
      return { ok: true, navigated: true, saved: false, discarded: false };
    }
    const choice = String(context.choice || 'save');
    if (choice === 'stay') return { ok: true, navigated: false, saved: false };
    if (choice === 'discard') return { ok: true, navigated: true, discarded: true, dirty: false };
    if (context.saveInFlight || context.presenceSaveBusy) {
      return { ok: false, reason: 'in_flight', navigated: false };
    }
    const saved = typeof context.save === 'function' ? await context.save() : { ok: false };
    if (!saved || saved.ok === false) {
      return {
        ok: false,
        reason: 'save_failed',
        navigated: false,
        dirty: true,
        message: 'La saisie n’a pas pu être enregistrée.'
      };
    }
    return { ok: true, navigated: true, saved: true, dirty: false, version: nextEventVersionAfterSave(saved, context.version) };
  }

  function parseHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    const path = raw.split('?')[0];
    const parts = path.split('/').filter(Boolean);
    if (!parts.length || parts[0] === 'accueil') return { screen: 'accueil', nav: 'accueil' };
    if (parts[0] === 'quo-vadis') {
      const query = {};
      String(raw.split('?')[1] || '').split('&').filter(Boolean).forEach((pair) => {
        const idx = pair.indexOf('=');
        const key = decodeURIComponent((idx === -1 ? pair : pair.slice(0, idx)).replace(/\+/g, ' '));
        const value = decodeURIComponent((idx === -1 ? '' : pair.slice(idx + 1)).replace(/\+/g, ' '));
        query[key] = value;
      });
      const views = {
        synthese: 'synthese',
        programme: 'programme',
        'catalogue-annuel': 'catalogue-annuel',
        'agenda-annuel': 'agenda-annuel',
        agenda: 'agenda',
        activites: 'activites',
        'a-arbitrer': 'a-arbitrer',
        alertes: 'alertes',
        cursus: 'cursus',
        regles: 'regles',
        'dates-connues': 'dates-connues',
        'dates-annoncees': 'dates-connues'
      };
      if (parts[1] === 'catalogue-annuel' && parts[2]) {
        return {
          screen: 'quo-vadis',
          nav: 'quo-vadis',
          qvView: 'catalogue-activite',
          qvCatalogCode: decodeURIComponent(parts[2]),
          qvYear: query.annee || '2027'
        };
      }
      if (parts[1] === 'activites' && parts[2]) {
        return {
          screen: 'quo-vadis',
          nav: 'quo-vadis',
          qvView: 'activite',
          qvActivityId: parts[2],
          qvFrom: query.from || 'activites',
          qvJour: query.jour || ''
        };
      }
      if (parts[1] === 'programme' && parts[2]) {
        return {
          screen: 'quo-vadis',
          nav: 'quo-vadis',
          qvView: 'programme-fiche',
          qvProgrammeItemId: decodeURIComponent(parts.slice(2).join('/')),
          qvFrom: query.from || 'programme'
        };
      }
      const view = views[parts[1]] || 'agenda-annuel';
      return {
        screen: 'quo-vadis',
        nav: 'quo-vadis',
        qvView: view,
        qvJour: query.jour || '',
        qvFrom: query.from || '',
        qvDomaine: query.domaine || '',
        qvFamille: query.famille || '',
        qvMois: query.mois || '',
        qvAnnee: ['2026', '2027', '2028'].includes(query.annee) ? Number(query.annee) : 2027,
        qvMode: query.mode || '',
        qvPlacement: query.placement || '',
        qvSeances: query.seances || ''
      };
    }
    if (parts[0] === 'vigilance') return { screen: 'vigilance', nav: 'vigilance' };
    if (parts[0] === 'statistiques') return { screen: 'statistiques', nav: 'statistiques' };
    if (parts[0] === 'cycles') {
      if(parts[1]) return { screen: 'cycle', nav: 'cycles', id: parts[1] };
      return { screen: 'cycles', nav: 'cycles' };
    }
    if (parts[0] === 'evenements') parts[0] = 'exercices';
    if (!parts.length || parts[0] === 'exercices') {
      if (parts[1] === 'nouveau') return { screen: 'nouveau', nav: 'exercices' };
      if (parts[1] === 'import') return { screen: 'import-evenements', nav: 'reglages' };
      if (parts[1] && parts[2] === 'saisie') return { screen: 'saisie', nav: 'exercices', id: parts[1] };
      if (parts[1]) return { screen: 'fiche', nav: 'exercices', id: parts[1] };
      return { screen: 'liste', nav: 'exercices' };
    }
    if (parts[0] === 'vue') {
      if (parts[1] && parts[2]) return { screen: 'vue', nav: 'vue', domaine: parts[1], cible: parts[2] };
      if (parts[1]) return { screen: 'vue', nav: 'vue', domaine: parts[1] };
      return { screen: 'vue', nav: 'vue' };
    }
    if (parts[0] === 'personnel') {
      if (parts[1]) return { screen: 'personne', nav: 'personnel', personneId: parts[1] };
      return { screen: 'personnel', nav: 'personnel' };
    }
    if (parts[0] === 'reglages' && parts[1] === 'personnel') return { screen: 'personnel', nav: 'personnel' };
    if (parts[0] === 'reglages' && parts[1] === 'import-evenements') return { screen: 'import-evenements', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'import-personnel') return { screen: 'import-personnel', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'formations') return { screen: 'formation-catalog', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'participation') return { screen: 'participation-admin', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'utilisateurs') return { screen: 'utilisateurs', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'administration') return { screen: 'administration', nav: 'reglages' };
    if (parts[0] === 'rapports' && parts[1] === 'formation') return { screen: 'rapport-formation', nav: 'rapports' };
    if (parts[0] === 'rapports' && parts[1] === 'participation') return { screen: 'rapport-participation', nav: 'rapports' };
    if (parts[0] === 'rapports' && parts[1] === 'jsp') return { screen: 'rapport-jsp', nav: 'rapports' };
    if (parts[0] === 'rapports') return { screen: 'rapports', nav: 'rapports' };
    if (parts[0] === 'apropos') return { screen: 'apropos', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'apropos') return { screen: 'apropos', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'suivi') {
      return { screen: 'suivi', nav: 'reglages' };
    }
    if (parts[0] === 'reglages' && (!parts[1] || parts[1] === 'objectifs')) {
      return { screen: 'objectifs', nav: 'reglages' };
    }
    return { screen: 'accueil', nav: 'accueil' };
  }

  function previewPersonId(person) {
    return String((person && (person.personId || person.personneId || person.personne_id)) || '').trim();
  }

  function createPreviewSelectionRows(people, previousRows) {
    const prevMap = new Map((previousRows || []).map((row) => [String(row.personId), row]));
    const seen = new Set();
    const rows = [];
    for (const person of people || []) {
      const personId = previewPersonId(person);
      if (!personId || seen.has(personId)) continue;
      seen.add(personId);
      const prev = prevMap.get(personId);
      rows.push({
        personId,
        selected: prev ? prev.selected === true : true,
        manual: Boolean(
          (person && (person.manual || person.origine === 'EXCEPTION_AJOUT' || person.motifInclusion === 'exception_ajout'))
          || (prev && prev.manual)
        ),
        source: person
      });
    }
    return rows;
  }

  function setAllPreviewSelected(rows, selected) {
    return (rows || []).map((row) => Object.assign({}, row, { selected: Boolean(selected) }));
  }

  function setPreviewRowSelected(rows, personId, selected) {
    const id = String(personId || '').trim();
    return (rows || []).map((row) => (
      String(row.personId) === id ? Object.assign({}, row, { selected: Boolean(selected) }) : row
    ));
  }

  function selectedPreviewPersonIds(rows) {
    return (rows || [])
      .filter((row) => row && row.selected === true)
      .map((row) => String(row.personId || '').trim())
      .filter(Boolean);
  }

  function previewSelectionCount(rows) {
    const list = rows || [];
    return {
      total: list.length,
      selected: list.filter((row) => row && row.selected === true).length
    };
  }

  function formatPreviewSelectionCountLabel(total, selected, extraSuffix) {
    const nTotal = Number(total) || 0;
    const nSelected = Number(selected) || 0;
    const extra = extraSuffix ? ` · ${extraSuffix}` : '';
    return `${nTotal} personne${nTotal > 1 ? 's' : ''} · ${nSelected} sélectionnée${nSelected > 1 ? 's' : ''}${extra}`;
  }

  function parsePreviewSelectedCountText(text) {
    const match = String(text || '').match(/·\s*(\d+)\s+sélectionnée/);
    return match ? Number(match[1]) : null;
  }

  function addManualPreviewSelectionRow(rows, person) {
    const personId = previewPersonId(person);
    const current = rows || [];
    if (!personId) return { rows: current, added: false, duplicate: false };
    if (current.some((row) => String(row.personId) === personId)) {
      return {
        rows: current.map((row) => (
          String(row.personId) === personId
            ? Object.assign({}, row, { selected: true, manual: Boolean(row.manual) })
            : row
        )),
        added: false,
        duplicate: true
      };
    }
    return {
      rows: current.concat([{
        personId,
        selected: true,
        manual: true,
        source: Object.assign({}, person, {
          personneId: personId,
          personne_id: personId,
          motifInclusion: 'exception_ajout',
          origine: 'EXCEPTION_AJOUT',
          manual: true
        })
      }]),
      added: true,
      duplicate: false
    };
  }

  function buildAssignmentSelectedPersonIds(rows, displayedCount) {
    const selectedPersonIds = selectedPreviewPersonIds(rows);
    const count = previewSelectionCount(rows);
    const displayed = displayedCount == null || displayedCount === '' ? null : Number(displayedCount);
    if (selectedPersonIds.length !== count.selected) {
      return { ok: false, selectedPersonIds: [], error: 'selection_incoherente' };
    }
    if (displayed != null && Number.isFinite(displayed) && selectedPersonIds.length !== displayed) {
      return { ok: false, selectedPersonIds: [], error: 'selection_incoherente' };
    }
    return { ok: true, selectedPersonIds };
  }

  function isCancelledEvenement(event) {
    const statut = String((event && (
      event.statut
      || event.status
      || event.statutEvenement
      || event.eventStatut
      || (event.etatMetier && event.etatMetier.code)
      || (event.etat_metier && event.etat_metier.code)
      || (typeof event === 'string' ? event : '')
    )) || '').toUpperCase();
    return Boolean(event && event.cancelled === true) || statut === 'ANNULE' || statut === 'ANNULEE';
  }

  function isHiddenEvenement(event) {
    if (!event) return false;
    if (event.hidden === true) return true;
    const etat = String((event.etatMetier && event.etatMetier.code) || (event.etat_metier && event.etat_metier.code) || '').toUpperCase();
    return Boolean(event.hidden_at || event.hiddenAt) || etat === 'SUPPRIME';
  }

  function cancelledEventHref(eventId) {
    return `#/exercices/${eventId}`;
  }

  function isParticipationCountable(event, participation) {
    if (isHiddenEvenement(event) || isCancelledEvenement(event)) return false;
    if (String((event && (event.statut || event.status)) || '').toUpperCase() !== 'REALISE') return false;
    return Boolean(participation);
  }

  function principalCta({ statut, populationFigee, previewReady, origine, modeSuivi }) {
    if (origine === 'LEGACY_AGGREGATED' || modeSuivi === 'LEGACY') return null;
    if (isCancelledEvenement({ statut })) return null;
    if (statut && statut !== 'PLANIFIE') return null;
    if (modeSuivi === 'QUANTITATIF') return { action: 'saisir-volumes', label: 'Saisir les présences' };
    if (populationFigee) return { action: 'saisir', label: 'Saisir les participations' };
    if (previewReady) return { action: 'figer', label: 'Assigner les participants' };
    return { action: 'generer', label: 'Préparer les participants' };
  }

  function modeSuiviOf(evenement) {
    const explicit = String((evenement && (evenement.mode_suivi || evenement.modeSuivi)) || '').toUpperCase();
    if (explicit === 'NOMINATIF' || explicit === 'QUANTITATIF' || explicit === 'LEGACY') return explicit;
    if (evenement && evenement.origine === 'LEGACY_AGGREGATED') return 'LEGACY';
    return 'NOMINATIF';
  }

  function modeLabel(mode) {
    if (mode === 'QUANTITATIF') return 'Quantitatif';
    if (mode === 'LEGACY') return 'Historique agrégé';
    return 'Nominatif';
  }

  function volumesEquality(volumes) {
    const attendus = Number(volumes && volumes.attendus);
    const presents = Number(volumes && volumes.presents);
    const nonExcuses = Number(volumes && volumes.nonExcuses);
    const dispenses = Number(volumes && volumes.dispenses);
    const permutations = Number((volumes && volumes.permutations) || 0);
    const motifKeys = ['excusesPrive', 'excusesProfessionnel', 'excusesArmee', 'excusesAccidentMaladie', 'excusesNonPrecise'];
    const hasMotifs = motifKeys.some((key) => volumes && volumes[key] !== undefined && volumes[key] !== '');
    const motifSum = motifKeys.reduce((sum, key) => sum + Number((volumes && volumes[key]) || 0), 0);
    const excuses = hasMotifs ? motifSum : Number(volumes && volumes.excuses);
    if (![attendus, presents, excuses, nonExcuses, dispenses, permutations].every((n) => Number.isInteger(n) && n >= 0)) {
      return false;
    }
    if (permutations > presents) return false;
    if (hasMotifs && volumes.excuses !== '' && volumes.excuses != null && Number(volumes.excuses) !== motifSum) {
      return false;
    }
    return attendus === presents + excuses + nonExcuses + dispenses;
  }

  function liveCounters(rows) {
    let present = 0;
    let formateur = 0;
    let excuse = 0;
    let absent = 0;
    let dispense = 0;
    let open = 0;
    let permutations = 0;
    for (const row of rows || []) {
      if (!countsInSaisieTaux(row)) continue;
      const s = row.statut;
      if (s === 'PRESENT') {
        present += 1;
        if (row.role === 'FORMATEUR') formateur += 1;
      }
      else if (s === 'PERMUTATION') permutations += 1;
      else if (s === 'ABSENT_EXCUSE') {
        if (isIncompleteClosureRow(row)) open += 1;
        else excuse += 1;
      }
      else if (s === 'ABSENT_NON_EXCUSE') absent += 1;
      else if (s === 'DISPENSE') {
        if (isIncompleteClosureRow(row)) open += 1;
        else dispense += 1;
      }
      else if (isIncompleteClosureRow(row)) open += 1;
    }
    return { present, formateur, excuse, absent, dispense, permutations, open };
  }

  function countsInSaisieTaux(row) {
    if (!row || row.inclus === false) return false;
    const jsp = String(row.jspRole || row.jsp_role || '').toUpperCase();
    if (jsp === 'MONITEUR') return false;
    const role = String(row.role || '').toUpperCase();
    if (role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
    if (ROLES_ENCADREMENT.has(role) && row.inclus !== true) return false;
    return true;
  }

  function sessionPresenceKpis(rows) {
    const counters = liveCounters(rows);
    let attendus = 0;
    for (const row of rows || []) {
      if (countsInSaisieTaux(row)) attendus += 1;
    }
    return Object.assign({ attendus }, counters);
  }

  function coveredInGlobalBilan(row) {
    if (row && row.sessionHasValidStatus === true && isValidSessionStatut(row.statut)) return false;
    return Boolean(row && (
      row.coveredInGlobalBilan
      || row.alreadyCountedInSession
      || row.already_counted_in_session
    ));
  }

  function participationStatusesForDomaine(domaine, policyState) {
    const raw = String(domaine || '').toUpperCase();
    const d = raw === 'PR' ? 'PAPR' : raw;
    const policy = policyForDomaine(d, policyState);
    if (policy && Array.isArray(policy.activeStatuses)) {
      const labels = new Map(((policyState && policyState.statuses) || []).map((row) => [String(row.id || row.value || '').toUpperCase(), row.label || row.libelle]));
      const allowed = policy.activeStatuses
        .map((status) => String(status || '').toUpperCase())
        .filter((status) => status && status !== 'NON_RENSEIGNE' && status !== 'NON_CONCERNE');
      if (allowed.length) {
        return allowed.map((status) => [status, labels.get(status) || statutLabel(status)]);
      }
    }
    const list = [
      ['PRESENT', 'Présent'],
      ['ABSENT_EXCUSE', 'Excusé'],
      ['ABSENT_NON_EXCUSE', 'Absent']
    ];
    if (d !== 'JSP') list.push(['DISPENSE', 'Dispensé']);
    if (d === 'DAP') list.push(['PERMUTATION', 'Permutation']);
    return list;
  }

  function preserveParticipationRole(role) {
    const r = String(role || 'PARTICIPANT').toUpperCase();
    return ROLES_ENCADREMENT.has(r) ? r : 'PARTICIPANT';
  }

  function statusLockedForRole(role) {
    const r = String(role || '').toUpperCase();
    return r === 'FORMATEUR' || r === 'MONITEUR' || r === 'AUXILIAIRE';
  }

  function applyParticipationStatus(row, statut) {
    const next = Object.assign({}, row);
    next.role = preserveParticipationRole(row && row.role);
    if (statusLockedForRole(next.role)) {
      next.presenceEdited = true;
      return next;
    }
    if (sessionLocked(next)) return row;
    const wasActive = row && row.statut === statut;
    if (wasActive) {
      next.statut = 'NON_RENSEIGNE';
      next.motifAbsence = '';
      next.commentaire = '';
      next.editMotif = false;
    } else {
      next.statut = statut;
      if (statut === 'ABSENT_EXCUSE') {
        if (!next.motifAbsence || isDispenseMotif(next.motifAbsence)) {
          next.motifAbsence = '';
          next.editMotif = true;
        }
      } else if (statut === 'DISPENSE') {
        if (!isDispenseMotif(next.motifAbsence)) {
          next.motifAbsence = '';
          next.commentaire = '';
          next.editMotif = true;
        }
      } else {
        next.motifAbsence = '';
        next.commentaire = '';
        next.editMotif = false;
      }
    }
    if (!isEffectiveParticipationStatut(next.statut)) {
      next.heureDebutIndividuelle = '';
      next.heureFinIndividuelle = '';
      next.timeOverrideOpen = false;
    } else if (!isEffectiveParticipationStatut(row && row.statut)) {
      next.heureDebutIndividuelle = '';
      next.heureFinIndividuelle = '';
      next.timeOverrideOpen = false;
    }
    next.presenceEdited = true;
    return next;
  }

  function applyExcuseMotif(row, motif) {
    if (sessionLocked(row)) return row;
    const next = Object.assign({}, row, {
      statut: 'ABSENT_EXCUSE',
      motifAbsence: motif,
      editMotif: false,
      presenceEdited: true,
      heureDebutIndividuelle: '',
      heureFinIndividuelle: '',
      timeOverrideOpen: false,
      role: preserveParticipationRole(row && row.role)
    });
    if (motif !== 'AUTRE') next.commentaire = row && row.motifAbsence === 'AUTRE' ? '' : (row.commentaire || '');
    return next;
  }

  function applyDispenseMotif(row, motif) {
    if (sessionLocked(row)) return row;
    return Object.assign({}, row, {
      statut: 'DISPENSE',
      motifAbsence: motif,
      editMotif: false,
      presenceEdited: true,
      commentaire: '',
      heureDebutIndividuelle: '',
      heureFinIndividuelle: '',
      timeOverrideOpen: false,
      role: preserveParticipationRole(row && row.role)
    });
  }

  function buildPresenceSavePayload(rows, encadrementIds) {
    const lockedEncadrement = encadrementIds || new Set();
    return (rows || [])
      .filter((r) => {
        if (r.inclus === false) return false;
        if (coveredInGlobalBilan(r)) return false;
        const role = preserveParticipationRole(r.role);
        if (role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
        const locked = lockedEncadrement.has(String(r.personneId));
        return !locked || (role === 'SURVEILLANT' && r.presenceEdited);
      })
      .map((r) => {
        const effective = isEffectiveParticipationStatut(r.statut);
        return {
          personneId: r.personneId,
          statut: r.statut,
          role: preserveParticipationRole(r.role),
          motif_absence: r.motifAbsence || null,
          commentaire: r.commentaire || null,
          heureDebutIndividuelle: effective ? (r.heureDebutIndividuelle || null) : null,
          heureFinIndividuelle: effective ? (r.heureFinIndividuelle || null) : null
        };
      });
  }

  function excuseBreakdown(rows, domaineCode) {
    const motifs = motifsSaisieForDomaine(domaineCode);
    const counts = Object.fromEntries(motifs.map((m) => [m.value, 0]));
    for (const row of rows || []) {
      if (!row || row.inclus === false || row.statut !== 'ABSENT_EXCUSE') continue;
      const key = String(row.motifAbsence || row.motif_absence || '');
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
    }
    return motifs.map((m) => ({ value: m.value, label: m.label, count: counts[m.value] || 0 }));
  }

  function clotureDisabled(counters) {
    return false;
  }

  function sessionLocked(row) {
    return coveredInGlobalBilan(row);
  }

  function isValidSessionStatut(statut) {
    const value = String(statut || '').toUpperCase();
    return value === 'PRESENT' || value === 'PERMUTATION' || value === 'ABSENT_EXCUSE' || value === 'ABSENT_NON_EXCUSE' || value === 'DISPENSE';
  }

  function isIncompleteClosureRow(row) {
    if (!row || row.inclus === false) return false;
    if (!countsInSaisieTaux(row)) return false;
    if (coveredInGlobalBilan(row)) return false;
    if (statusLockedForRole(row.role)) return false;
    if (!row.statut || row.statut === 'NON_RENSEIGNE' || row.statut === 'NON_CONCERNE') return true;
    if (row.statut === 'ABSENT_EXCUSE' && !row.motifAbsence) return true;
    return false;
  }

  function isOpenSaisieRow(row) {
    return isIncompleteClosureRow(row);
  }

  function listIncompleteClosureRows(rows) {
    return (rows || []).filter((row) => isIncompleteClosureRow(row));
  }

  function isInvalidMotifClosureRow(row) {
    if (!row || row.inclus === false) return false;
    if (!countsInSaisieTaux(row)) return false;
    if (coveredInGlobalBilan(row)) return false;
    if (statusLockedForRole(row.role)) return false;
    if (row.statut === 'ABSENT_EXCUSE' && !row.motifAbsence) return true;
    return false;
  }

  function listSessionClosureBlockingRows(rows, options) {
    const context = options || {};
    if (context.isMultiSession) return (rows || []).filter((row) => isInvalidMotifClosureRow(row));
    return listIncompleteClosureRows(rows);
  }

  function formatIncompletePersonLabel(row) {
    const grade = String((row && row.grade) || '').trim();
    const prenom = String((row && row.prenom) || '').trim();
    const nom = String((row && (row.nomFamille || row.nom)) || '').trim();
    const nip = String((row && row.nip) || '').trim();
    const identity = [prenom, nom].filter(Boolean).join(' ') || 'Personne';
    return [grade, identity, nip ? `NIP ${nip}` : ''].filter(Boolean).join(' — ');
  }

  function hasIncompleteDispense(rows) {
    return (rows || []).some((row) =>
      row
      && row.inclus !== false
      && !coveredInGlobalBilan(row)
      && !statusLockedForRole(row.role)
      && row.statut === 'DISPENSE'
      && !isDispenseMotif(row.motifAbsence)
    );
  }
  function hasIncompleteExcuse(rows) {
    return (rows || []).some((row) =>
      row
      && row.inclus !== false
      && !coveredInGlobalBilan(row)
      && !statusLockedForRole(row.role)
      && row.statut === 'ABSENT_EXCUSE'
      && !row.motifAbsence
    );
  }

  function closureBlockers(rows) {
    const out = { open: 0, incompleteExcuses: 0, incompleteDispenses: 0, message: '' };
    (rows || []).forEach((row) => {
      if (!row || row.inclus === false || coveredInGlobalBilan(row) || statusLockedForRole(row.role) || !countsInSaisieTaux(row)) return;
      if (isIncompleteClosureRow(row) && (!row.statut || row.statut === 'NON_RENSEIGNE' || row.statut === 'NON_CONCERNE')) out.open += 1;
      if (row.statut === 'ABSENT_EXCUSE' && !row.motifAbsence) out.incompleteExcuses += 1;
      if (row.statut === 'DISPENSE' && !isDispenseMotif(row.motifAbsence)) out.incompleteDispenses += 1;
    });
    const parts = [];
    if (out.incompleteExcuses) parts.push(`${out.incompleteExcuses} absence${out.incompleteExcuses > 1 ? 's excusées sans motif' : ' excusée sans motif'}`);
    if (out.incompleteDispenses) parts.push(`${out.incompleteDispenses} dispense${out.incompleteDispenses > 1 ? 's sans motif' : ' sans motif'}`);
    out.message = parts.length ? `Clôture impossible : ${parts.join(' ; ')}.` : '';
    return out;
  }

  function resetSaisie(rows) {
    return (rows || []).map((row) => Object.assign({}, row, {
      statut: 'NON_RENSEIGNE',
      role: 'PARTICIPANT',
      motifAbsence: '',
      commentaire: ''
    }));
  }

  function normalizeDomaineForContribution(value) {
    const domaine = String(value || '').toUpperCase();
    return domaine === 'PR' ? 'PAPR' : domaine;
  }

  function getEncadrementContribution({ domaine, role, contexte } = {}) {
    const d = normalizeDomaineForContribution(domaine);
    const r = String(role || '').toUpperCase();
    const session = String((contexte && (contexte.type || contexte.kind)) || '').toUpperCase() === 'SESSION';
    const base = {
      role: r,
      domaine: d,
      countsPopulationSuivie: false,
      countsTauxPresence: false,
      countsEffectifEngageEvenement: false,
      countsEffectifConsolideSession: false,
      informatifSeulement: true,
      dedupeByNip: true
    };
    if (r === 'AUXILIAIRE') return base;
    if (r === 'MONITEUR') return base;
    if (r === 'SURVEILLANT') return base;
    if (r === 'FORMATEUR') return Object.assign({}, base, {
      countsEffectifEngageEvenement: d === 'DPS' || d === 'DAP',
      countsEffectifConsolideSession: session && (d === 'AUTO' || d === 'PAPR'),
      informatifSeulement: !(d === 'DPS' || d === 'DAP' || (session && (d === 'AUTO' || d === 'PAPR')))
    });
    return Object.assign({}, base, { dedupeByNip: false });
  }

  function needsConfirmReset(rows, encadrement) {
    if ((encadrement || []).some((row) => row && ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase()))) return true;
    return (rows || []).some((row) => row && row.inclus !== false && (
      (row.statut && row.statut !== 'NON_RENSEIGNE') ||
      ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase()) ||
      row.motifAbsence ||
      row.commentaire
    ));
  }

  function needsConfirmAllPresent(rows) {
    return (rows || []).some((row) => {
      if (row.inclus === false) return false;
      if (coveredInGlobalBilan(row)) return false;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return false;
      return row.statut && row.statut !== 'NON_RENSEIGNE' && row.statut !== 'PRESENT';
    });
  }

  function applyAllPresent(rows) {
    return (rows || []).map((row) => {
      if (row.inclus === false) return row;
      if (coveredInGlobalBilan(row)) return row;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '', role: 'PARTICIPANT' });
    });
  }

  function applyAllPresentFiltered(rows, cibleCode) {
    return (rows || []).map((row) => {
      if (cibleCode && row.cible !== cibleCode && !(row.cibles || []).includes(cibleCode)) return row;
      if (row.inclus === false) return row;
      if (coveredInGlobalBilan(row)) return row;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '', role: 'PARTICIPANT' });
    });
  }

  function saisieAttendusFromFiche(fiche) {
    return ((fiche && fiche.attendus) || []).filter((row) => row && row.inclus !== false);
  }

  function personnelMutationError(error) {
    const info = friendlyError(error);
    const status = Number(error && (error.status || error.statusCode));
    const raw = `${(info && info.title) || ''} ${(info && info.message) || ''} ${(error && error.message) || ''}`;
    if (status === 422 || status === 400 || status === 404) {
      return {
        tone: 'error',
        title: info.title || 'Action refusée',
        message: (error && error.message) || info.message
      };
    }
    if (/<html[\s>]|inactivity timeout|timed?\s*out|timeout|délai d’exécution|delai d.execution|netlify|sql\b/i.test(raw)) {
      return {
        tone: 'error',
        title: 'Enregistrement impossible',
        message: 'L’opération n’a pas pu être enregistrée. Vérifiez la saisie et réessayez.'
      };
    }
    return info;
  }

  function friendlyError(error) {
    const status = Number(error && error.status);
    const code = error && (error.error || error.code);
    const message = String(error && error.message || '');
    const payloadMessage = String(error && error.payload && error.payload.message || '');
    const raw = `${message} ${payloadMessage}`;
    if (/<html[\s>]/i.test(raw) || /inactivity timeout|timed?\s*out|timeout/i.test(raw)) {
      return {
        tone: 'error',
        title: 'Import interrompu',
        message: 'Le traitement n’a pas pu être finalisé. Aucune nouvelle tentative ne sera lancée automatiquement. Erreur technique : délai d’exécution dépassé.'
      };
    }
    if (status === 0 || code === 'network') {
      return { tone: 'error', title: 'Import interrompu', message: 'La réponse du serveur a été interrompue. Relancez une preview avant de décider de réessayer.' };
    }
    if (status === 401) {
      return {
        tone: 'error',
        title: 'Session SCOPE expirée',
        message: 'Reconnectez-vous à SCOPE pour poursuivre votre travail.',
        sessionRequired: true,
        okta: false
      };
    }
    if (status === 403) {
      return { tone: 'error', title: 'Action non autorisée', message: 'Votre profil ne permet pas cette modification.' };
    }
    if (code === 'personnel_stale') {
      return {
        tone: 'warning',
        title: 'Import du personnel',
        message: payloadMessage || message || 'Les données du personnel ont été modifiées depuis l’analyse. Rechargez et analysez à nouveau le fichier avant de poursuivre.',
        conflict: true
      };
    }
    if (code === 'scope_personnel_import_commit_failed') {
      return {
        tone: 'error',
        title: 'Import du personnel',
        message: payloadMessage || message || 'L’import du personnel n’a pas pu être validé.'
      };
    }
    if (code === 'rapport_session_incomplete') {
      return {
        tone: 'error',
        title: 'Rapport détaillé indisponible',
        message: payloadMessage || message || 'Le rapport détaillé sera disponible lorsque toutes les séances seront clôturées.'
      };
    }
    if (code === 'referentiel_utilise') {
      return {
        tone: 'error',
        title: 'Suppression impossible',
        message: payloadMessage || message || 'Cet élément a déjà été utilisé. Archivez-le afin de préserver l’historique.'
      };
    }
    if (status === 404 || code === 'not_found' || code === 'evenement_introuvable' || code === 'encadrement_introuvable' || code === 'attendu_introuvable' || code === 'personne_introuvable' || code === 'ressource_introuvable') {
      const fallback = code === 'encadrement_introuvable'
        ? 'Cette personne n’est plus dans l’encadrement de cet événement.'
        : (code === 'evenement_introuvable' || status === 404
          ? 'Cet événement n’est plus disponible dans les vues opérationnelles.'
          : 'Cette action n’est pas disponible pour cet événement.');
      const text = message && message !== code && message !== 'not_found' ? message : fallback;
      return {
        tone: 'error',
        title: 'Action impossible',
        message: text
      };
    }
    if (status === 409 || code === 'conflict') {
      return {
        tone: 'warning',
        title: 'Séance modifiée ailleurs',
        message: 'Cette séance a été modifiée ailleurs. Rechargez les données avant de poursuivre.',
        conflict: true
      };
    }
    if (status === 422) {
      const details = (error && error.details && error.details.errors) || [];
      const lines = details.map((item) => item.message || item.code).filter(Boolean);
      return {
        tone: 'error',
        title: 'Action refusée',
        message: lines.length ? lines.join(' ') : (error.message || 'La saisie n’est pas complète.'),
        errors: details
      };
    }
    if (/column .+ of relation|relation .+ does not exist|duplicate key value|violates .+ constraint|syntax error at or near|postgres|pg_/i.test(raw)) {
      return {
        tone: 'error',
        title: 'Action impossible',
        message: 'Le service SCOPE n’a pas pu terminer cette action. Réessayez. Si le problème continue, contactez l’administrateur.'
      };
    }
    const fallbackMessage = (error && error.message) || payloadMessage || 'Une erreur est survenue.';
    if (!fallbackMessage || String(fallbackMessage).toLowerCase() === 'not_found' || String(fallbackMessage) === String(code || '')) {
      return { tone: 'error', title: 'Action impossible', message: 'Cette action n’est pas disponible pour cet événement.' };
    }
    return { tone: 'error', title: 'Impossible de continuer', message: fallbackMessage };
  }

  function ciblesLabel(cibles) {
    if (!cibles || !cibles.length) return '—';
    return cibles.map((c) => {
      if (!c || typeof c !== 'object') return c;
      const domaine = c.domaine_code || c.domaineCode || '';
      const niveau = c.niveau_code || c.niveauCode || c.libelle || '';
      return niveauAffiche(domaine, niveau);
    }).join(' · ');
  }

  function sortCiblesForEventForm(cibles, selectedIds) {
    const rows = cibles || [];
    if (!rows.length) return [];
    const domain = String(rows[0].domaineCode || rows[0].domaine_code || '');
    return eventCiblesForForm(domain, rows, selectedIds);
  }

  function displayTauxForList(statut, officiel, percentage, extra) {
    if (extra && extra.origine === 'LEGACY_AGGREGATED') {
      const label = formatTaux(percentage);
      return label === '—' ? 'Non nominatif' : `${label} · non nominatif`;
    }
    if (statut !== 'REALISE') return '—';
    if (officiel === false) return '—';
    return formatTaux(percentage);
  }

  function legacyTauxFromRow(legacy) {
    if (!legacy) return null;
    const presents = Number(legacy.nb_presents);
    const payload = legacy.payload_v67 || legacy.payloadV67 || {};
    const attendu = Number(payload.total_attendu || legacy.nb_convoques);
    if (!Number.isFinite(presents) || !Number.isFinite(attendu) || attendu <= 0) return null;
    return Math.round((100 * presents) / attendu * 10) / 10;
  }

  function emptyMessage(kind) {
    const map = {
      exercices: 'Aucun événement sur la période choisie.',
      attendus: 'Aucun attendu généré pour cet événement.',
      resultats: 'Aucun résultat nominatif pour cet événement.',
      personnes: 'Aucune personne ne correspond à cette recherche.',
      objectifs: 'Aucun objectif de participation défini.'
    };
    return map[kind] || 'Aucun élément.';
  }

  function loadingMessage(kind) {
    const map = {
      exercices: 'Chargement des événements…',
      personnel: 'Chargement du personnel…',
      dashboard: 'Chargement de la vue d’ensemble…',
      personne: 'Chargement de la fiche…',
      rapports: 'Chargement des rapports…'
    };
    return map[kind] || 'Chargement…';
  }

  function errorMessage(kind) {
    const map = {
      exercices: 'Impossible de charger les événements. Réessayez.',
      personnel: 'Impossible de charger le personnel. Réessayez.',
      dashboard: 'Impossible de charger la vue d’ensemble. Réessayez.',
      personne: 'Impossible de charger la fiche. Réessayez.',
      rapports: 'Impossible de charger les rapports. Réessayez.'
    };
    return map[kind] || 'Impossible de charger les données. Réessayez.';
  }

  function listViewState({ ready, error, count } = {}) {
    if (error) return 'error';
    if (!ready) return 'loading';
    if (!count) return 'empty';
    return 'content';
  }

  const SORT_STATUS_ORDER = Object.freeze({
    PLANIFIE: 10,
    REALISE: 20,
    REPORTE: 30,
    ANNULE: 40,
    LEGACY_AGGREGATED: 50,
    NON_RENSEIGNE: 10,
    PRESENT: 20,
    FORMATEUR: 25,
    ABSENT_EXCUSE: 30,
    ABSENT_NON_EXCUSE: 40,
    DISPENSE: 50,
    PERMUTATION: 60
  });

  const FR_SORT_COLLATOR = new Intl.Collator('fr-CH', { numeric: true, sensitivity: 'base' });

  function cleanSortText(value) {
    return String(value == null ? '' : value).trim();
  }

  function parseSortDate(value) {
    const text = cleanSortText(value).slice(0, 10);
    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return Number(`${m[1]}${m[2]}${m[3]}`);
    m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return Number(`${m[3]}${m[2]}${m[1]}`);
    const timestamp = Date.parse(text);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function parseSortTime(value) {
    const text = cleanSortText(value);
    const m = text.match(/(\d{1,2})[:hH](\d{2})?/);
    if (!m) return null;
    const hours = Number(m[1]);
    const minutes = Number(m[2] || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  }

  function compareSortValues(a, b, type) {
    const kind = type || 'text';
    if (kind === 'date') {
      const da = parseSortDate(a);
      const db = parseSortDate(b);
      if (da !== null || db !== null) return (da ?? Number.MAX_SAFE_INTEGER) - (db ?? Number.MAX_SAFE_INTEGER);
    }
    if (kind === 'time') {
      const ta = parseSortTime(a);
      const tb = parseSortTime(b);
      if (ta !== null || tb !== null) return (ta ?? Number.MAX_SAFE_INTEGER) - (tb ?? Number.MAX_SAFE_INTEGER);
    }
    if (kind === 'number') {
      const toNumber = (value) => Number(cleanSortText(value).replace(/\s+/g, '').replace(',', '.').replace(/[^0-9.+-]/g, ''));
      const na = toNumber(a);
      const nb = toNumber(b);
      if (Number.isFinite(na) || Number.isFinite(nb)) return (Number.isFinite(na) ? na : Number.MAX_SAFE_INTEGER) - (Number.isFinite(nb) ? nb : Number.MAX_SAFE_INTEGER);
    }
    if (kind === 'status') {
      const sa = SORT_STATUS_ORDER[cleanSortText(a).toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
      const sb = SORT_STATUS_ORDER[cleanSortText(b).toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
    }
    return FR_SORT_COLLATOR.compare(cleanSortText(a), cleanSortText(b));
  }

  function sortRows(rows, sort, columns) {
    const source = Array.isArray(rows) ? rows : [];
    const key = sort && sort.key;
    const dir = sort && sort.dir;
    const column = key && (columns || []).find((item) => item && item.key === key);
    if (!column || !dir) return source.slice();
    const factor = dir === 'desc' ? -1 : 1;
    return source
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const av = typeof column.value === 'function' ? column.value(a.row) : a.row[column.key];
        const bv = typeof column.value === 'function' ? column.value(b.row) : b.row[column.key];
        const cmp = compareSortValues(av, bv, column.type);
        if (cmp) return cmp * factor;
        for (const tie of column.tieBreakers || []) {
          const tav = typeof tie.value === 'function' ? tie.value(a.row) : a.row[tie.key];
          const tbv = typeof tie.value === 'function' ? tie.value(b.row) : b.row[tie.key];
          const tcmp = compareSortValues(tav, tbv, tie.type || 'text');
          if (tcmp) return tcmp * factor;
        }
        return a.index - b.index;
      })
      .map((item) => item.row);
  }

  function statComCellValue(row, key) {
    if (key === 'code') return row && row.code || '';
    if (key === 'label') return row && (row.label || row.libelle) || '';
    if (key === 'domain') return row && row.domain || '';
    if (key === 'category') return row && row.category || '';
    if (key === 'oi') return row && (row.oi || row.oi_code || row.oiCode) || '';
    if (key === 'specialization') return statComBusinessSpecialization(row);
    if (key === 'validity') return row && (row.valid_from || row.validFrom) || '';
    if (key === 'state') return row && row.active === false ? 'Inactif' : 'Actif';
    return '';
  }

  function firstDefined() {
    for (let i = 0; i < arguments.length; i += 1) {
      if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
    }
    return '';
  }

  function statComBusinessSpecialization(row) {
    if (!row) return '';
    return firstDefined(row.specialization, row.specializationLabel, row.specialization_label, '');
  }

  function buildStatComSavePayload(values, draft) {
    const form = values || {};
    const source = draft || {};
    return {
      code: firstDefined(form.code, source.code, ''),
      label: firstDefined(form.label, source.label, source.libelle, ''),
      domain: firstDefined(form.domain, source.domain, ''),
      category: firstDefined(form.category, source.category, ''),
      oi: firstDefined(form.oi, source.oi, source.oi_code, source.oiCode, ''),
      specialization: firstDefined(form.specialization, statComBusinessSpecialization(source), ''),
      validFrom: firstDefined(form.validFrom, source.validFrom, source.valid_from, '2023-01-01') || '2023-01-01',
      validTo: firstDefined(form.validTo, source.validTo, source.valid_to, null) || null,
      active: Boolean(firstDefined(form.active, source.active !== false))
    };
  }

  function statComSortColumns() {
    return [
      { key: 'code', value: (row) => statComCellValue(row, 'code'), type: 'text' },
      { key: 'label', value: (row) => statComCellValue(row, 'label'), type: 'text' },
      { key: 'domain', value: (row) => statComCellValue(row, 'domain'), type: 'text' },
      { key: 'category', value: (row) => statComCellValue(row, 'category'), type: 'text' },
      { key: 'oi', value: (row) => statComCellValue(row, 'oi'), type: 'text' },
      { key: 'specialization', value: (row) => statComCellValue(row, 'specialization'), type: 'text' },
      { key: 'validity', value: (row) => statComCellValue(row, 'validity'), type: 'date' },
      { key: 'state', value: (row) => statComCellValue(row, 'state'), type: 'text' }
    ];
  }

  function visibleStatComRows(rows, options) {
    const source = Array.isArray(rows) ? rows : [];
    const opts = options || {};
    const query = cleanSortText(opts.query || '').toUpperCase();
    const domainFilter = cleanSortText(opts.domainFilter || '').toUpperCase();
    const stateFilter = cleanSortText(opts.stateFilter || 'TOUS').toUpperCase();
    const filtered = source.filter((row) => {
      const active = row && row.active !== false;
      if (domainFilter && cleanSortText(row && row.domain).toUpperCase() !== domainFilter) return false;
      if (stateFilter === 'ACTIF' && !active) return false;
      if (stateFilter === 'INACTIF' && active) return false;
      if (!query) return true;
      return ['code', 'label', 'domain', 'category', 'oi', 'specialization'].some((key) => cleanSortText(statComCellValue(row, key)).toUpperCase().includes(query));
    });
    return sortRows(filtered, opts.sort || { key: 'code', dir: 'asc' }, statComSortColumns());
  }

  function statComSortLabel(sort) {
    const labels = {
      code: 'Code',
      label: 'Libellé',
      domain: 'Domaine',
      category: 'Catégorie',
      oi: 'OI',
      specialization: 'Spécialisation',
      validity: 'Validité',
      state: 'État'
    };
    const current = sort || {};
    const direction = current.dir === 'desc' ? 'décroissant' : 'croissant';
    return `${labels[current.key] || 'Code'} — ${direction}`;
  }

  function nextSort(current, key, defaultDir) {
    const cur = current || {};
    const initial = defaultDir || 'asc';
    if (cur.key !== key) return { key, dir: initial };
    return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  }

  function sortHeaderState(sort, key) {
    const active = sort && sort.key === key && sort.dir;
    return {
      active: Boolean(active),
      className: active ? (sort.dir === 'desc' ? 'is-desc' : 'is-asc') : '',
      ariaSort: active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none',
      indicator: active ? (sort.dir === 'desc' ? '▼' : '▲') : ''
    };
  }

  const CYCLE_CONSOLIDATED_STATES = Object.freeze([
    'SATISFAIT',
    'SATISFAIT_PAR_RATTRAPAGE',
    'EN_COURS',
    'A_REALISER',
    'RATTRAPAGE_REQUIS',
    'DISPENSE',
    'NON_CONCERNE',
    'A_CONTROLER'
  ]);

  function cycleConsolidatedState(row, obligationKey) {
    if (!row) return 'NON_CONCERNE';
    if (obligationKey && obligationKey !== 'tous') {
      const cell = (row.obligations || []).find((item) => item && item.obligationKey === obligationKey);
      return String(cell && cell.consolidatedState || 'NON_CONCERNE').toUpperCase();
    }
    return String(row.consolidatedState || row.globalState || 'NON_CONCERNE').toUpperCase();
  }

  function filterCyclePilotageRows(rows, filters) {
    const opts = filters || {};
    const query = cleanSortText(opts.query || '').toUpperCase();
    const stateFilter = String(opts.state || 'tous').toUpperCase();
    const obligationKey = String(opts.obligation || 'tous');
    return (rows || []).filter((row) => {
      if (!row || !row.isPopulation) return false;
      const cells = row.obligations || [];
      if (obligationKey !== 'tous' && !cells.some((cell) => cell && cell.expected && cell.obligationKey === obligationKey)) return false;
      const consolidatedState = cycleConsolidatedState(row, obligationKey);
      if (stateFilter !== 'TOUS' && consolidatedState !== stateFilter) return false;
      if (!query) return true;
      const obligationLabels = cells.filter((cell) => cell && cell.expected).map((cell) => cell.label).join(' ');
      const haystack = cleanSortText([row.grade, row.nom, row.prenom, row.nip, obligationLabels].filter(Boolean).join(' ')).toUpperCase();
      return haystack.includes(query);
    });
  }

  function cyclePilotageSummary(rows, obligationKey) {
    const selectedKey = String(obligationKey || 'tous');
    const populationRows = (rows || []).filter((row) => row && row.isPopulation);
    const cells = populationRows.flatMap((row) => (row.obligations || []).filter((cell) => (
      cell && cell.expected && (selectedKey === 'tous' || cell.obligationKey === selectedKey)
    )));
    const count = (state) => cells.filter((cell) => String(cell.consolidatedState || '').toUpperCase() === state).length;
    const nonConcerne = count('NON_CONCERNE');
    const dispenses = count('DISPENSE');
    const satisfies = count('SATISFAIT');
    const satisfiedByCatchup = count('SATISFAIT_PAR_RATTRAPAGE');
    const denominator = Math.max(0, cells.length - nonConcerne - dispenses);
    const personKeys = new Set(populationRows.filter((row) => (
      (row.obligations || []).some((cell) => cell && cell.expected && (selectedKey === 'tous' || cell.obligationKey === selectedKey) && cell.consolidatedState !== 'NON_CONCERNE')
    )).map((row) => row.personKey || row.personneId || row.nip).filter(Boolean));
    return {
      personnes: personKeys.size,
      obligations: cells.length - nonConcerne,
      satisfaites: satisfies,
      satisfaitesParRattrapage: satisfiedByCatchup,
      enCours: count('EN_COURS'),
      aRealiser: count('A_REALISER'),
      rattrapageRequis: count('RATTRAPAGE_REQUIS'),
      dispenses,
      nonConcernes: nonConcerne,
      aControler: count('A_CONTROLER'),
      denominator,
      satisfactionPct: denominator ? Math.round((1000 * (satisfies + satisfiedByCatchup)) / denominator) / 10 : null
    };
  }

  function cycleObligationSummaries(rows, obligations) {
    return (obligations || []).map((obligation) => {
      const scopedRows = (rows || []).filter((row) => (row.obligations || []).some((cell) => cell && cell.expected && cell.obligationKey === obligation.obligationKey));
      return Object.assign({
        obligationKey: obligation.obligationKey,
        label: obligation.label,
        eventIds: obligation.eventIds || [],
        sessions: obligation.sessions || []
      }, cyclePilotageSummary(scopedRows, obligation.obligationKey));
    });
  }

  function isQualificationEvenement(row) {
    const origine = String((row && (row.origine || row.origine_code)) || '').toUpperCase();
    const mode = String((row && (row.mode_suivi || row.modeSuivi)) || '').toUpperCase();
    if (origine === 'LEGACY_AGGREGATED' || mode === 'LEGACY') return false;
    const libelle = String((row && (row.libelle || row.title)) || '');
    const ext = String((row && (row.identifiant_externe || row.identifiantExterne)) || '');
    if (/^TEST[\s—-]/i.test(libelle.trim())) return true;
    if (/TEST IMPORT SCOPE/i.test(libelle)) return true;
    if (/TEST SCOPE/i.test(libelle)) return true;
    if (/^TEST-/i.test(ext.trim())) return true;
    return false;
  }

  function isTestPersonnelNip(nip) {
    return /^(99\d{3}|TSTR2)/i.test(String(nip || '').trim());
  }

  function shouldRenderPermutations(domaineCode, dataset) {
    if (dataset && dataset.emptyReason === 'HORS_DAP') return false;
    const domaine = String(domaineCode || '').toUpperCase();
    if (domaine && domaine !== 'DAP') return false;
    return true;
  }

  function resolveClientMode() {
    return 'live';
  }

  function oktaLoginHref(returnPath) {
    const raw = String(returnPath || '/scope.html').trim();
    const safe = raw.startsWith('/') && !raw.startsWith('//') && !/^javascript:/i.test(raw)
      ? raw
      : '/scope.html';
    return `/auth/oidc/start?returnTo=${encodeURIComponent(safe)}`;
  }

  const TRANSIENT_AUTH_QUERY_PARAMS = Object.freeze(['code', 'state', 'authError', 'reason', 'mode', 'idle']);

  function cleanAuthenticatedScopeUrl({ pathname, search, hash, hostname } = {}) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    for (const key of TRANSIENT_AUTH_QUERY_PARAMS) params.delete(key);
    const cleanSearch = params.toString();
    let cleanPath = pathname || '/';
    if (hostname === 'scope-sdisnv.netlify.app' && (cleanPath === '/scope.html' || cleanPath === '/index.html')) {
      cleanPath = '/';
    }
    const cleanHash = String(hash || '');
    return `${cleanPath}${cleanSearch ? `?${cleanSearch}` : ''}${cleanHash}`;
  }

  function importPreviewFilterCount(id, { standard, all, groups, excluded } = {}) {
    const lines = all || [];
    const previewGroups = groups || [];
    const excludedMap = excluded || {};
    const excludedLine = (line) => Boolean(excludedMap[line.ligneNo]);
    const excludedGroup = (item) => (item.sourceLineNos || []).length && (item.sourceLineNos || []).every((n) => excludedMap[n]);
    if (standard) {
      if (id === 'TOUS') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'REVIEW_REQUIRED' || g.statut === 'CONFLIT' || String(g.statut).indexOf('ERREUR') === 0 || (g.avertissements || []).length)).length;
      if (id === 'A_CREER') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'NEW_EVENT' || g.statut === 'GROUPED')).length;
      if (id === 'DEJA') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'EXACT_MATCH' || g.statut === 'PROBABLE_MATCH')).length;
      if (id === 'GROUPED') return previewGroups.filter((g) => !excludedGroup(g) && g.statut === 'GROUPED').length;
      if (id === 'ERREURS') return lines.filter((l) => !excludedLine(l) && (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')).length;
      if (id === 'ARBITRER') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'REVIEW_REQUIRED' || g.statut === 'A_ARBITRER')).length;
      if (id === 'EXCLUS') return Object.keys(excludedMap).filter((k) => excludedMap[k]).length;
      return 0;
    }
    if (id === 'TOUS') return lines.filter((l) => !excludedLine(l)).length;
    if (id === 'A_CREER') return lines.filter((l) => !excludedLine(l) && (l.statut === 'A_CREER' || l.statut === 'VALIDE' || l.statut === 'NEW_EVENT')).length;
    if (id === 'DEJA') return lines.filter((l) => !excludedLine(l) && ['DEJA_PRESENT', 'DEJA_IMPORTE', 'EXACT_MATCH', 'PROBABLE_MATCH'].includes(l.statut)).length;
    if (id === 'GROUPED') return lines.filter((l) => !excludedLine(l) && Boolean(l.groupKey)).length;
    if (id === 'ERREURS') return lines.filter((l) => !excludedLine(l) && (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')).length;
    if (id === 'ARBITRER') return lines.filter((l) => !excludedLine(l) && (l.statut === 'A_ARBITRER' || l.statut === 'REVIEW_REQUIRED')).length;
    if (id === 'EXCLUS') return Object.keys(excludedMap).filter((k) => excludedMap[k]).length;
    if (id === 'NOMINATIF') return lines.filter((l) => !excludedLine(l) && (l.modePropose === 'NOMINATIF' || l.typePropose === 'NOMINATIF')).length;
    if (id === 'QUANTITATIF') return lines.filter((l) => !excludedLine(l) && (l.modePropose === 'QUANTITATIF' || l.typePropose === 'QUANTITATIF')).length;
    return 0;
  }

  function buildImportPreviewFilters(options) {
    const standard = Boolean(options && options.standard);
    const defs = standard ? [
      ['TOUS', 'Points à traiter'], ['A_CREER', 'À créer'], ['DEJA', 'Déjà présents'], ['GROUPED', 'Regroupés'],
      ['ERREURS', 'Erreurs'], ['ARBITRER', 'À contrôler'], ['EXCLUS', 'Exclus']
    ] : [
      ['TOUS', 'Tout'], ['A_CREER', 'À créer'], ['DEJA', 'Déjà présents'], ['GROUPED', 'Regroupés'],
      ['ERREURS', 'Erreurs'], ['ARBITRER', 'À arbitrer'], ['EXCLUS', 'Exclus'],
      ['NOMINATIF', 'Nominatif'], ['QUANTITATIF', 'Quantitatif']
    ];
    return defs
      .map(([id, label]) => ({ id, label, count: importPreviewFilterCount(id, options || {}) }))
      .filter((item) => item.count > 0);
  }

  function defaultImportPreviewFilter(filters) {
    const order = ['TOUS', 'A_CREER', 'DEJA', 'GROUPED'];
    return (order.map((id) => (filters || []).find((f) => f.id === id)).find(Boolean) || (filters || [])[0] || { id: 'TOUS' }).id;
  }

  const ANNUAL_STATUS_LABELS = Object.freeze({
    A_DEFINIR: 'À définir',DRAFT: 'En préparation',READY: 'Prêt pour QUO VADIS',SUPERSEDED: 'Remplacé',CANCELLED: 'Annulé',
    ARCHIVE: 'Archivée',REVIEW_REQUIRED: 'À arbitrer',MIGRATION_REQUIRED: 'Migration requise',SCHEMA_INCOMPATIBLE: 'Schéma incompatible',SCHEMA_READY: 'Disponible'
  });
  const ANNUAL_ENUM_LABELS = Object.freeze({
    ON_DEMAND: 'Selon besoin',ANNUAL: 'Chaque année',TIMES_PER_YEAR: 'Plusieurs fois par année',PRIMARY: 'Domaine principal',SECONDARY: 'Domaine associé',
    UNION: 'Publics réunis',INTERSECTION: 'Publics communs',EXCLUSION: 'Publics exclus',INHERIT: 'Repris de l’activité',SAME: 'Identique',INDEPENDENT: 'Indépendant',
    FULL_DURATION: 'Toute la durée',FIXED_MINUTES: 'Durée fixe',PERCENTAGE: 'Part de la durée',MANUAL: 'Saisie manuelle',
    PER_PARTICIPANT: 'Pour chaque participant',PER_SESSION: 'Par séance',PER_OCCURRENCE: 'Par occurrence',
    PREREQUISITE: 'Prérequis',TAUGHT: 'Enseignée',RENEWED: 'Renouvelée'
  });
  const ANNUAL_MONTHS = Object.freeze(['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']);

  function annualStatusLabel(value){ return ANNUAL_STATUS_LABELS[String(value || 'A_DEFINIR').toUpperCase()] || 'À arbitrer'; }
  function annualEnumLabel(value){ const key = String(value || '').toUpperCase(); return ANNUAL_ENUM_LABELS[key] || String(value || ''); }
  function annualMonthLabel(value){
    const match = String(value || '').match(/^\d{4}-(\d{2})-\d{2}$/);
    return match && ANNUAL_MONTHS[Number(match[1]) - 1] || '';
  }
  function annualPeriodLabel(start,end){
    const first = annualMonthLabel(start); const last = annualMonthLabel(end);
    if(first && last) return first === last ? first : `${first} – ${last}`;
    return first || last || 'Année complète';
  }
  function annualThemeSummary(requiredOccurrences,assignments){
    const required = Number(requiredOccurrences || 0);
    const defined = new Set((assignments || []).map((row) => Number(row.occurrenceNumber ?? row.occurrence_number)).filter((value) => value > 0 && value <= required)).size;
    const missing = Math.max(0,required - defined);
    return { defined,missing,label: required ? `${defined} défini${defined > 1 ? 's' : ''}${missing ? ` · ${missing} à préciser` : ''}` : '—' };
  }
  function annualCountLabel(count,singular,plural){
    const value = Number(count || 0);
    return `${value} ${value === 1 ? singular : (plural || `${singular}s`)}`;
  }
  function annualSummary(requirement,assignments,preparedOccurrenceCount){
    if(!requirement) return {
      requirement: 'Besoin non défini',period: 'Période à définir',contents: 'Contenus à définir',quoVadis: 'Non préparé dans QUO VADIS'
    };
    const required = Number(requirement.requiredOccurrences ?? requirement.required_occurrences ?? 0);
    const themes = annualThemeSummary(required,assignments);
    const contents = themes.missing
      ? `${annualCountLabel(themes.defined,'thème défini','thèmes définis')} · ${annualCountLabel(themes.missing,'à préciser','à préciser')}`
      : annualCountLabel(themes.defined,'thème défini','thèmes définis');
    return {
      requirement: annualCountLabel(required,'occurrence'),period: annualPeriodLabel(requirement.windowStart || requirement.window_start,requirement.windowEnd || requirement.window_end),
      contents,quoVadis: `${Number(preparedOccurrenceCount || 0)}/${required} préparée${required === 1 ? '' : 's'} dans QUO VADIS`
    };
  }
  function annualReadyAction(requirement,readyTransition){
    const visible = String(requirement && requirement.status || '').toUpperCase() === 'DRAFT';
    const enabled = visible && Boolean(readyTransition && readyTransition.allowed);
    return {
      visible,enabled,
      message: visible && !enabled ? String(readyTransition && readyTransition.message || 'La configuration de l’activité doit encore être complétée.') : ''
    };
  }
  function annualSectionHasData(value){ return Array.isArray(value) ? value.length > 0 : Boolean(value && Object.keys(value).length); }
  function annualDraftDateValue(input){ return input && String(input.value || '').trim() ? String(input.value).trim() : null; }
  function splitActivityThemeLabel(value){ return ActivityLabel.splitActivityThemeLabel(value); }
  function formatActivityThemeLabel(activityOrLabel,theme){ return ActivityLabel.formatActivityThemeLabel(activityOrLabel,theme); }

  function qvResponsableGroups() {
    return [
      ['Commandant', 'Quartier-maître', 'Chef OP', 'Chef logistique', 'Chef formation', 'Of communication', 'Chef site DPS', 'Chef DAP'],
      ['Of auto', 'Chef PR', 'Chef FOBA', 'Chef FOCA', 'Chef FOSPEC', 'Réf. Sanitaire', 'Resp. VPC'],
      ['Chef section DAP', 'Chef section DPS'],
      ['Chef JSP', 'Chef site JSP', 'Resp. formation JSP']
    ];
  }

  function qvResponsableKey(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function qvResponsableCanonique(value, context) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const key = qvResponsableKey(raw);
    const direct = {
      'c foba': 'Chef FOBA',
      'c dap': 'Chef DAP',
      cdt: 'Commandant',
      'c log': 'Chef logistique',
      'c op': 'Chef OP',
      qm: 'Quartier-maître',
      'c pr': 'Chef PR',
      'c jsp': 'Chef JSP',
      'c site jsp': 'Chef site JSP',
      'of auto': 'Of auto',
      'resp for jsp': 'Resp. formation JSP'
    };
    if (direct[key]) return direct[key];
    const domain = String((context && context.domain) || '').trim().toUpperCase();
    if ((key === 'c site' || key === 'chef site') && domain === 'DPS') return 'Chef site DPS';
    if (key === 'c sct' && domain === 'DAP') return 'Chef section DAP';
    if (key === 'c sct' && domain === 'DPS') return 'Chef section DPS';
    const canonical = qvResponsableGroups().flat().find((label) => qvResponsableKey(label) === key);
    return canonical || raw;
  }

  function qvProgrammePublicCatalogue() {
    return [
      { group: 'Général', items: [['GEN:RECRUE', 'Recrue'], ['GEN:SAPEUR', 'Sapeur'], ['GEN:SAPEUR-DPS', 'Sapeur DPS'], ['GEN:SAPEUR-DAP', 'Sapeur DAP']] },
      { group: 'Échelons', items: [['ECH:I', 'Échelon I'], ['ECH:II', 'Échelon II'], ['ECH:III', 'Échelon III'], ['ECH:IV', 'Échelon IV']] },
      { group: 'Sections DPS', items: ['N01', 'N01a', 'N01b', 'N02', 'N02a', 'N02b', 'N03', 'N03a', 'N03b', 'N04', 'N04a', 'N04b', 'N05', 'N05a', 'N05b', 'N06'].map(code => [code, code]) },
      { group: 'Encadrement', items: [['ENC:C-SECTION', 'C section'], ['ENC:C-GROUPE', 'C groupe'], ['ENC:CAND-C-GROUPE', 'Candidats C groupe'], ['ENC:CI-DPS', 'CI DPS'], ['ENC:CAND-CI-DPS', 'Candidats CI DPS'], ['ENC:CI-DAP', 'CI DAP'], ['ENC:CAND-CI-DAP', 'Candidats CI DAP']] },
      { group: 'Formation', items: [['FOBA:1', 'FOBA 1'], ['FOBA:2', 'FOBA 2'], ['FOBA:3', 'FOBA 3']] },
      { group: 'PR', items: [['PR:2', 'PAPR'], ['PR:CAND-PAPR', 'Candidats PAPR'], ['PR:3', 'PABC'], ['PR:FORMATEURS', 'Formateurs PR'], ['PR:FMF', 'Formateur maison Feu (FMF)'], ['PR:CHEF-PISTE', 'Chef piste']] },
      { group: 'AUTO', items: [['AUTO:1', 'cond PL'], ['AUTO:CAND-PL', 'Candidats cond PL'], ['AUTO:3', 'cond VL'], ['AUTO:5', 'Machiniste EA'], ['AUTO:CAND-EA', 'Candidats machiniste EA'], ['AUTO:6', 'Pilote BAT'], ['AUTO:2', 'cond TP9'], ['AUTO:CAND-TP9', 'Candidats cond TP9'], ['AUTO:4', 'Grutier'], ['AUTO:MONITEURS', 'Moniteurs conduite'], ['AUTO:FORM-C1', 'Formateurs C1/118'], ['AUTO:FORM-EA', 'Formateurs EA'], ['AUTO:FORM-GRUTIER', 'Formateurs Grutier']] },
      { group: 'FOSPEC', items: [['FOSPEC:1', 'Antichute'], ['FOSPEC:2', 'NAC'], ['FOSPEC:3', 'OFSI'], ['FOSPEC:4', 'OP VPC']] },
      { group: 'JSP', items: [['JSP:1', 'JSP']] }
    ];
  }

  function qvProgrammePublicLabel(code) {
    const value = String(code || '').trim();
    for (const group of qvProgrammePublicCatalogue()) {
      const found = group.items.find((item) => item[0] === value);
      if (found) return found[1];
    }
    return value.includes(':') ? 'À définir' : value;
  }

  function qvProgrammeOiCatalogue() {
    return [
      { group: 'SDIS', items: [['SDIS', 'SDIS']] },
      { group: 'DPS', items: ['G1', 'C1', 'B1', 'B2'].map(code => [`DPS:${code}`, code]) },
      { group: 'DAP', items: ['Y1', 'Y2', 'Y3', 'Y4'].map(code => [`DAP:${code}`, code]) },
      { group: 'JSP', items: ['G1', 'C1', 'B1'].map(code => [`JSP:${code}`, `JSP ${code}`]) }
    ];
  }

  function qvProgrammeFamily(row) {
    const domain = String(row && row.domain || '').toUpperCase();
    if(domain === 'CMDT') return '';
    if(['PR','AUTO','FOBA','FOCO','FOCA','FOSPEC'].includes(domain)) return domain;
    return row && row.family || '';
  }

  function qvProgrammeFilterFamily(row) {
    const code = String(row && row.domain || '').toUpperCase();
    return ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCO', 'FOCA', 'FOSPEC', 'AUTO', 'PR'].includes(code) ? code : '';
  }

  function qvProgrammeFilterType(row) {
    if (row && (row.sourceType === 'CURSUS' || row.activityKind === 'CURSUS'
      || (row.cursusCode && row.cursusStepCode))) return 'Cursus';
    if (String(row && (row.label || row.title) || '').trim() === 'Conduite, formation continue') return 'Conduite';
    const value = String(row && (row.activityType || row.type || row.family) || '').trim();
    if (['Cours', 'Cursus', 'Événement', 'Exercice', 'Formation', 'Instruction', 'Représentation', 'Séance', 'Conduite'].includes(value)) return value;
    if (/^Séance\b/i.test(String(row && row.label || ''))) return 'Séance';
    if (String(row && row.label || '') === 'Permanence') return 'Permanence';
    return '';
  }

  function qvProgrammeFunctionalDomain(row, historicalReference) {
    const prepared = String(row && row.programmeDomain || '').toUpperCase();
    if (/^F[0-8]$/.test(prepared)) return prepared;
    const direct = String(row && row.domain || '').toUpperCase();
    if (/^F[0-8]$/.test(direct)) return direct;
    const historical = String(historicalReference && historicalReference.domainF7 || '').toUpperCase();
    if (/^F[0-8]\/[0-8]$/.test(direct) || /^F[0-8]\/[0-8]$/.test(historical)) return '';
    if (/^F[0-8]$/.test(historical)) return historical;
    const statCom = String(row && row.statCom || '').toUpperCase().match(/F([0-8])$/);
    return statCom ? `F${statCom[1]}` : '';
  }

  function qvProgrammeOiMatches(row, selected) {
    if (!selected || selected === 'tous') return true;
    const codes = qvProgrammeConfirmedOiCodes(row);
    return ['DPS', 'DAP', 'JSP'].includes(selected)
      ? codes.some((code) => code.startsWith(`${selected}:`))
      : codes.includes(selected);
  }

  function qvProgrammeHasMultipleSessions(row) {
    if (Number(row && row.sessionCount || 1) > 1) return true;
    if (String(row && row.label || '') === 'Formation groupée JSP'
      && Number(row && row.occurrenceCount || 1) > 1) return true;
    const activity = String(row && row.activityLabel || '').trim();
    const event = String(row && row.eventDisplayLabel || '').trim();
    return Number(row && row.occurrenceCount || 1) > 1
      && Boolean(activity) && Boolean(event)
      && event.startsWith(`${activity}.`)
      && /^\d+$/.test(event.slice(activity.length + 1));
  }

  function qvProgrammeDomainMatches(row, value) {
    if (!value || value === 'tous') return true;
    return String(row && (row.programmeDomain || row.domain) || '') === value;
  }

  function qvIsJspActivity(row) {
    const item = row || {};
    if (String(item.domain || '').toUpperCase() === 'JSP') return true;
    if (/^010J/.test(String(item.statCom || ''))) return true;
    return /\bJSP\b/i.test(String(item.label || item.title || ''));
  }

  function qvNormalizeOiSelections(row, values) {
    const original = [...new Set(values || row.oiSelections || row.ois || [])];
    const known = new Set(qvProgrammeOiCatalogue().flatMap(group => group.items.map(item => item[0])));
    const ambiguous = [];
    let changed = false;
    const codes = original.map(value => {
      const code = String(value || '').trim().toUpperCase();
      if (known.has(code)) return code;
      let domain = '';
      if (/^Y[1-4]$/.test(code)) domain = 'DAP';
      // Le site confirme l'OI indépendamment du domaine de l'activite; JSP garde son referentiel propre.
      if (/^(G1|C1|B1|B2)$/.test(code) && !(/^B2$/.test(code) && qvIsJspActivity(row))) {
        domain = qvIsJspActivity(row) ? 'JSP' : 'DPS';
      }
      const qualified = domain && `${domain}:${code}`;
      if (known.has(qualified)) { changed = true; return qualified; }
      ambiguous.push(code);
      return code;
    });
    return { codes: [...new Set(codes)], ambiguous, status: ambiguous.length ? 'AMBIGUOUS' : changed ? 'NORMALIZED' : 'UNCHANGED' };
  }

  function qvOiSites(codes) {
    return [...new Set((codes || []).map(code => String(code).replace(/^(DPS|DAP|JSP):/, '')))];
  }

  function qvFormatOiSelections(codes) {
    const parts = [];
    for (const group of qvProgrammeOiCatalogue()) {
      const labels = group.items.filter(item => (codes || []).includes(item[0])).map(item => item[1]);
      if (labels.length) parts.push(labels.join(', '));
    }
    const known = new Set(qvProgrammeOiCatalogue().flatMap(group => group.items.map(item => item[0])));
    const legacy = (codes || []).filter(code => !known.has(code));
    if (legacy.length) parts.push(`À qualifier : ${legacy.join(', ')}`);
    return parts.join(' ; ');
  }

  function qvProgrammeConfirmedOiCodes(row) {
    const known = new Set(qvProgrammeOiCatalogue().flatMap(group => group.items.map(item => item[0])));
    return qvSortOiCodes(qvNormalizeOiSelections(row || {}, row && (row.oiSelections || row.ois) || []).codes.filter(code => known.has(code)));
  }

  function qvProgrammeOiLabel(row) {
    const labels = new Map(qvProgrammeOiCatalogue().flatMap(group => group.items));
    return qvProgrammeConfirmedOiCodes(row).map(code => labels.get(code)).join(', ');
  }

  function qvEnrichBusinessReference(row, context = {}) {
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const label = row.title || row.label || row.libelle || '';
    const date = String(row.date || row.startsAt || '').slice(0, 10);
    const sourceStatCom = row.statCom || row.statcom_code || '';
    const succession = (context.statComSuccessions || []).find(item => item.sourceCode === sourceStatCom && date >= item.effectiveFrom);
    const statCom = succession ? succession.canonicalCode : sourceStatCom;
    const stat = (context.statComCodes || []).find(item => item.code === statCom && item.active !== false &&
      (!item.validFrom || !date || item.validFrom <= date) && (!item.validTo || !date || item.validTo >= date));
    const explicitDomain = row.domain || row.domaine_code || row.qui || '';
    const domain = explicitDomain || (stat && ['DPS', 'DAP', 'JSP', 'AUTO', 'PR', 'FOBA', 'FOCA', 'FOSPEC'].includes(stat.domain) ? stat.domain : '');
    const evidence = [];
    if(succession) evidence.push({field:'statCom',rule:'CANONICAL_DATED_STATCOM_SUCCESSION',source:sourceStatCom,effectiveFrom:succession.effectiveFrom});
    if (!explicitDomain && domain) evidence.push({ field: 'domain', rule: 'CANONICAL_STATCOM_DOMAIN', source: statCom });
    const oi = qvNormalizeOiSelections({ ...row, domain, ois: row.ois || row.oi_codes || [] });
    const targets = row.business_targets || [];
    const knownOis = new Set(qvProgrammeOiCatalogue().flatMap(group => group.items.map(item => item[0])));
    if(!oi.codes.length && stat && stat.oi_code && knownOis.has(`${domain}:${stat.oi_code}`)){
      oi.codes.push(`${domain}:${stat.oi_code}`);evidence.push({field:'oiSelections',rule:'CANONICAL_STATCOM_OI',source:statCom});
    }
    for(const target of targets){
      const code = `${target.domain}:${target.code}`;
      if(knownOis.has(code) && !oi.codes.includes(code)){
        oi.codes.push(code);evidence.push({field:'oiSelections',rule:'CANONICAL_EVENT_TARGET_OI',source:code});
      }
    }
    if (oi.status === 'NORMALIZED') evidence.push({ field: 'oiSelections', rule: 'CANONICAL_DOMAIN_OI', source: explicitDomain || statCom });
    const personnel = row.personnel || '';
    const segments = personnel.split(/[|+]/).map(key).filter(Boolean);
    const publics = [...new Set(row.publics || row.publicCodes || row.public_codes || [])];
    const catalogue = qvProgrammePublicCatalogue().flatMap(group => group.items);
    for(const target of targets){
      const exact = `${target.domain}:${target.code}`;
      const alias = target.domain === 'AUTO' ? ({PL:'AUTO:1',VL:'AUTO:3'})[target.code]
        : target.domain === 'JSP' && ['G1','C1','B1','GEN'].includes(target.code) ? 'JSP:1' : '';
      const code = catalogue.some(item => item[0] === exact) ? exact : alias;
      if(code && !publics.includes(code)){
        publics.push(code);evidence.push({field:'publicCodes',rule:'CANONICAL_EVENT_TARGET_PUBLIC',source:exact});
      }
    }
    const targetPublicCount = publics.length;
    for (const segment of segments) {
      const exact = catalogue.filter(item => key(item[1]) === segment);
      if (exact.length === 1 && !publics.includes(exact[0][0])) publics.push(exact[0][0]);
    }
    if (domain === 'DPS') publics.push(...qvSectionCodes(personnel));
    const publicCodes = [...new Set(publics)];
    if (publicCodes.length > targetPublicCount) evidence.push({ field: 'publicCodes', rule: 'EXPLICIT_PERSONNEL_PUBLIC', source: personnel });
    const responsibleRaw = row.responsible || row.responsable || '';
    const responsible = qvResponsableCanonique(responsibleRaw, { domain });
    if (responsible && responsible !== responsibleRaw) evidence.push({ field: 'responsible', rule: 'CANONICAL_RESPONSABLE_ALIAS', source: responsibleRaw });
    const location = row.location || '';
    const locations = (context.lieux || []).filter(item => item.actif !== false && (String(item.lieuId) === String(row.lieuId || row.lieu_id || '') ||
      [item.code, item.nomCourt, `L-${item.siteCode || item.oiCode}`].some(value => key(value) === key(location) && key(location))));
    const lieu = locations.length === 1 ? locations[0] : null;
    const room = row.room || row.salle || '';
    const rooms = lieu ? (context.sallesTheorie || []).filter(item => item.actif !== false && item.lieuId === lieu.lieuId &&
      (item.salleId === (row.salleTheorieId || row.salle_theorie_id) || key(item.code) === key(room) || key(item.libelle) === key(room.replace(/^salle\s+/i, '')))) : [];
    const salle = rooms.length === 1 ? rooms[0] : null;
    if (lieu && !row.lieuId && !row.lieu_id) evidence.push({ field: 'lieuId', rule: 'EXACT_CANONICAL_LOCATION', source: location });
    if (salle && !row.salleTheorieId && !row.salle_theorie_id) evidence.push({ field: 'salleTheorieId', rule: 'EXACT_COMPATIBLE_ROOM', source: room });
    const explicitFamily = row.family || row.famille || row.subDomain || row.sous_domaine_code || '';
    const family = explicitFamily || (['DPS', 'DAP', 'JSP'].includes(domain) && /instr|exercice/i.test(label) ? 'FOCO' : ['AUTO', 'FOBA', 'FOCA', 'FOSPEC', 'PR'].includes(domain) ? domain : '');
    if (family && !row.family && !row.famille) evidence.push({ field: 'family', rule: 'EXPLICIT_ACTIVITY_FAMILY', source: statCom || label });
    const missing = [];
    if (!domain) missing.push('Domaine non démontré');
    if (!oi.codes.length || oi.ambiguous.length) missing.push('OI à qualifier');
    if (!publicCodes.length) missing.push('Public cible non démontré');
    if (statCom && !stat) missing.push('Stat.Com absent du référentiel');
    const unmappedPublicLabels = personnel.split(/[|+]/).map(value => value.trim()).filter(value => value && !qvSectionCodes(value).length &&
      !catalogue.some(([,label]) => key(label) === key(value)));
    if(unmappedPublicLabels.length) missing.push('Public historique complémentaire à qualifier');
    if (domain === 'DPS' && /instr.*(?:sct|section)/i.test(label) && !publicCodes.some(code => /^N0/.test(code))) missing.push('Section non démontrée');
    const classification = missing.length ? 'AMBIGU' : evidence.length ? 'REGLE_GENERALISABLE' : 'CERTAIN';
    return { activityLabel: label, statCom, domain, family, oiSelections: oi.codes,oiQualification:oi.status, publicCodes, responsible,
      location: lieu ? lieu.nomCourt : location, lieuId: lieu && lieu.lieuId || row.lieuId || row.lieu_id || null,
      room: salle ? salle.libelle : room, salleTheorieId: salle && salle.salleId || row.salleTheorieId || row.salle_theorie_id || null,
      date,sourceStatCom, startTime: row.start || row.heure_debut || row.heure_debut_prevue || '', endTime: row.end || row.heure_fin || row.heure_fin_prevue || '',
      classification, evidence, missing,unmappedPublicLabels,sourcePersonnel:personnel, sourceLine: row.sourceLine || null, sourceEventId: row.evenement_id || row.eventId || null };
  }

  function qvSectionCodes(value) {
    const codes = [...String(value || '').matchAll(/\b(?:N0?|section\s+)([1-6])\s*([ab])?\b/gi)]
      .map(match => `N0${match[1]}${(match[2] || '').toLowerCase()}`);
    return [...new Set(codes)].filter(code => qvProgrammePublicCatalogue().find(group => group.group === 'Sections DPS').items.some(item => item[0] === code));
  }

  // Décalage 2026 → 2027 : 52 semaines exactes, ce qui préserve le jour de la semaine.
  // C'est la règle déjà appliquée pour produire chaque historicalProposal.proposedDate2027.
  const QV_HISTORICAL_SHIFT_DAYS = 364;

  function qvShiftHistoricalDate(date2026, days = QV_HISTORICAL_SHIFT_DAYS) {
    const key = String(date2026 || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
    const base = new Date(`${key}T00:00:00Z`);
    base.setUTCDate(base.getUTCDate() + Number(days || 0));
    return base.toISOString().slice(0, 10);
  }

  const QV_DPS_SITES = Object.freeze(['G1', 'C1', 'B1', 'B2']);

  function qvRewriteDpsSiteToken(value, site) {
    const next = String(site || '').toUpperCase();
    if (!QV_DPS_SITES.includes(next)) return String(value || '');
    return String(value || '').replace(/(012)(G1|C1|B1|B2)/g, `$1${next}`);
  }

  // La rotation des tours historiques précède la couverture propre aux instructions.
  // Chaque tour démontré reste propre à un OI : date + horaire + OI, jamais un OI fusionné.
  function qvRotationBuckets(historicalRows, title) {
    const wanted = String(title || '').trim().toLowerCase();
    if (!wanted) return [];
    const byKey = new Map();
    for (const row of historicalRows || []) {
      if (String(row.title || '').trim().toLowerCase() !== wanted) continue;
      const date = String(row.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const start = String(row.start || '').slice(0, 5);
      const lineOis = qvSortOiCodes([...(row.ois || [])]).filter((code) => QV_DPS_SITES.includes(code));
      const targets = lineOis.length ? lineOis : [''];
      for (const oi of targets) {
        const key = `${date}\t${start}\t${oi}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(row);
      }
    }
    return [...byKey.entries()].sort((a, b) => {
      const [dateA, startA, oiA] = a[0].split('\t');
      const [dateB, startB, oiB] = b[0].split('\t');
      return dateA.localeCompare(dateB) || startA.localeCompare(startB) || (scopeSiteRank(oiA) - scopeSiteRank(oiB));
    }).map(([key, lines]) => {
      const [date2026, startKey, oi] = key.split('\t');
      const ois = oi ? [oi] : qvSortOiCodes([...new Set(lines.flatMap((line) => line.ois || []))]);
      const site = ois[0] || '';
      const locationBySite = {};
      let statCom = '';
      for (const line of lines) {
        for (const code of (line.ois || [])) {
          if (line.location && !locationBySite[code]) locationBySite[code] = line.location;
        }
        if (!statCom && line.statCom) statCom = String(line.statCom);
      }
      const location = site ? `Caserne ${qvDpsDefaultLieuCode(site)}` : String((lines.find((line) => line.location) || {}).location || '');
      return {
        date2026,
        date2027: qvShiftHistoricalDate(date2026),
        oi: site,
        ois,
        sections: [...new Set(lines.flatMap((line) => qvSectionCodes(line.personnel)))],
        locationBySite,
        location,
        locationHistorical: locationBySite[site] || '',
        start: startKey || String((lines.find((line) => line.start) || {}).start || '').slice(0, 5),
        end: String((lines.find((line) => line.end) || {}).end || '').slice(0, 5),
        statCom,
        sourceLines: lines.map((line) => line.sourceLine).filter((value) => value != null)
      };
    });
  }

  function qvRotationProtected(row) {
    const item = row || {};
    const metadata = item.metadata || {};
    return Boolean(item.publishedEventId) || item.locked === true || item.fixedDate === true
      || metadata.humanDecision === true || metadata.preserveDecision === true
      || item.humanDecision === true || item.preserveDecision === true;
  }

  function qvOccurrenceRank(row) {
    const match = String((row && (row.occurrenceId || row.id)) || '').match(/:O(\d+)/);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  }

  function qvInstructionSectionPublic(row, bucket, ctaResolver) {
    const kind = qvDpsInstructionKind(row);
    const site = bucket.oi || (bucket.ois || [])[0];
    if (typeof ctaResolver === 'function' && bucket.date2027 && site && kind) {
      const derived = ctaResolver(bucket.date2027, site, kind, qvIsPionnierRow(row));
      if (derived) return derived;
    }
    return (bucket.sections || [])[0] || '';
  }

  function qvApplyRotationBucket(row, bucket, ctaResolver) {
    const start = bucket.start || String(row.startsAt || '').slice(11, 16);
    const end = bucket.end || String(row.endsAt || '').slice(11, 16);
    const site = bucket.oi || (bucket.ois || [])[0];
    const ois = site ? [site] : (bucket.ois && bucket.ois.length ? bucket.ois : [...(row.ois || [])]);
    const section = qvInstructionSectionPublic(row, { ...bucket, oi: site || ois[0] }, ctaResolver);
    const publics = section
      ? [...new Set((row.publics || []).filter((code) => !/^N0[1-6][ab]?$/.test(code)).concat([section]))]
      : [...(row.publics || [])];
    const location = site ? `Caserne ${qvDpsDefaultLieuCode(site)}` : (bucket.location || row.location || '');
    const statCom = qvRewriteDpsSiteToken(row.statCom || bucket.statCom || '', site);
    const code = qvRewriteDpsSiteToken(row.code || '', site);
    return {
      ...row,
      startsAt: start && bucket.date2027 ? `${bucket.date2027}T${start}` : row.startsAt,
      endsAt: end && bucket.date2027 ? `${bucket.date2027}T${end}` : row.endsAt,
      publics,
      ois,
      location,
      statCom: statCom || row.statCom,
      code: code || row.code,
      rotationStatus: 'DISTRIBUTED',
      rotationRule: 'ROTATION_HISTORIQUE_2026_DEMONTREE',
      sectionPublicStatus: section ? 'DEMONSTRATED' : row.sectionPublicStatus,
      sectionPublicRule: section && typeof ctaResolver === 'function' ? 'CTA_PERMANENCE_CYCLE' : (section ? 'EXCEL_PERSONNEL_SECTION_EXPLICIT' : row.sectionPublicRule),
      sectionPublicOi: site || '',
      sectionPublicDerived: section || '',
      rotationEvidence: {
        date2026: bucket.date2026,
        shiftDays: QV_HISTORICAL_SHIFT_DAYS,
        oi: site,
        sections: bucket.sections,
        sectionCta: section,
        locationBySite: bucket.locationBySite,
        locationDivergence: bucket.locationHistorical && bucket.locationHistorical !== location
          ? { historique: bucket.locationHistorical, referentiel: location } : null,
        sourceLines: bucket.sourceLines
      },
      historicalProposal: {
        ...(row.historicalProposal || {}),
        source: 'HISTORICAL_2026',
        sourceLine: bucket.sourceLines[0],
        date2026: bucket.date2026,
        proposedDate2027: bucket.date2027,
        start,
        end
      }
    };
  }

  function qvFindRowForRotationBucket(remaining, bucket) {
    const date = bucket.date2027;
    const start = bucket.start;
    const oi = bucket.oi;
    const exact = remaining.find((row) => {
      const sites = qvDpsSitesOf(row);
      return sites.length === 1 && sites[0] === oi
        && String(row.startsAt || '').slice(0, 10) === date
        && String(row.startsAt || '').slice(11, 16) === start;
    });
    if (exact) return exact;
    const sameOi = remaining.find((row) => {
      const sites = qvDpsSitesOf(row);
      return sites.length === 1 && sites[0] === oi;
    });
    if (sameOi) return sameOi;
    const fusedWithOi = remaining.find((row) => {
      const sites = qvDpsSitesOf(row);
      return sites.length !== 1 && (!oi || sites.includes(oi));
    });
    if (fusedWithOi) return fusedWithOi;
    return remaining[0] || null;
  }

  function qvCloneInstructionForOi(template, bucket, ctaResolver) {
    const applied = qvApplyRotationBucket(template, bucket, ctaResolver);
    const startKey = String(bucket.start || '').replace(':', '');
    const id = `QV27:OI:${template.definitionId}:${bucket.oi}:${bucket.date2027}:${startKey}`;
    return {
      ...applied,
      id,
      occurrenceId: `QV27:OI:${template.definitionId}:${bucket.oi}:${bucket.date2027}`,
      sessionId: `${id}:S1`,
      eventLabel: `${applied.label || template.label} ${bucket.oi}`,
      rotationAdded: true,
      rotationRule: 'ROTATION_OI_DISTINCT_2026_DEMONTREE'
    };
  }

  // Les N tours historiques (date + horaire + OI) deviennent N réalisations distinctes.
  // Si le canonique 2027 a fusionné C1/B1/B2 sur une seule ligne, les OI manquants sont ajoutés.
  function qvDistributeRotationOccurrences(rows, historicalRows, ctaResolver) {
    const groups = new Map();
    for (const row of rows || []) {
      if (!row || row.external) continue;
      if (!qvDpsInstructionKind(row)) continue;
      if (row.provenance === 'SOURCE_2027_EXPLICIT') continue;
      const key = String(row.definitionId || row.label || '');
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const patches = new Map();
    const additions = [];
    const addedIds = new Set();
    const report = [];
    for (const [key, group] of groups) {
      const ordered = group.slice().sort((a, b) => qvOccurrenceRank(a) - qvOccurrenceRank(b));
      const buckets = qvRotationBuckets(historicalRows, ordered[0].label || ordered[0].title);
      const entry = {
        definitionId: key,
        label: ordered[0].label || ordered[0].title || '',
        occurrences: ordered.length,
        buckets: buckets.length,
        distributed: 0,
        added: 0,
        protected: 0,
        unmapped: [],
        changes: []
      };
      if (!buckets.length) { entry.reason = 'AUCUNE_SOURCE_HISTORIQUE'; report.push(entry); continue; }
      const remaining = ordered.filter((row) => {
        if (!qvRotationProtected(row)) return true;
        entry.protected += 1;
        patches.set(String(row.id), { ...row, rotationStatus: 'HUMAN_DECISION', rotationRule: 'DECISION_HUMAINE_PRESERVEE' });
        return false;
      });
      const template = ordered[0];
      for (const bucket of buckets) {
        if (!bucket || !bucket.date2027) continue;
        const existingCloneId = `QV27:OI:${template.definitionId}:${bucket.oi}:${bucket.date2027}:${String(bucket.start || '').replace(':', '')}`;
        const already = remaining.find((row) => String(row.id) === existingCloneId)
          || (rows || []).find((row) => String(row && row.id) === existingCloneId && !patches.has(existingCloneId)
            && !addedIds.has(existingCloneId));
        let row = already && remaining.includes(already) ? already : qvFindRowForRotationBucket(remaining, bucket);
        if (already && !remaining.includes(already) && !patches.has(String(already.id))) {
          row = already;
        }
        if (row && remaining.includes(row)) remaining.splice(remaining.indexOf(row), 1);
        if (!row) {
          const cloned = qvCloneInstructionForOi(template, bucket, ctaResolver);
          if (!addedIds.has(cloned.id) && !patches.has(cloned.id)) {
            additions.push(cloned);
            addedIds.add(cloned.id);
            entry.added += 1;
            entry.distributed += 1;
            entry.changes.push({ id: cloned.id, from: null, to: { date: bucket.date2027, publics: cloned.publics, ois: cloned.ois, location: cloned.location } });
          }
          continue;
        }
        const previous = { date: String(row.startsAt || '').slice(0, 10), publics: [...(row.publics || [])], ois: [...(row.ois || [])], location: row.location || '', statCom: row.statCom || '' };
        const next = qvApplyRotationBucket(row, bucket, ctaResolver);
        entry.distributed += 1;
        if (previous.date !== bucket.date2027 || String(previous.publics) !== String(next.publics)
          || String(previous.ois) !== String(next.ois) || previous.location !== next.location
          || previous.statCom !== next.statCom) {
          entry.changes.push({ id: row.id, from: previous, to: { date: bucket.date2027, publics: next.publics, ois: next.ois, location: next.location, statCom: next.statCom } });
        }
        patches.set(String(row.id), next);
      }
      for (const leftover of remaining) {
        entry.unmapped.push(leftover.id);
        patches.set(String(leftover.id), { ...leftover, rotationStatus: 'MOA_REQUIRED', rotationRule: 'ROTATION_TOUR_NON_DEMONTRE' });
      }
      report.push(entry);
    }
    const nextRows = (rows || []).map((row) => patches.get(String(row && row.id)) || row);
    return { rows: nextRows.concat(additions.filter((row) => !nextRows.some((item) => item && item.id === row.id))), report };
  }

  // QV-PROJ-001 : la projection annuelle compte une occurrence par ligne source 2026 mais écrase
  // chacune avec l'union des OI et la date de la première ligne. Chaque occurrence reprend donc
  // sa propre réalisation historique : date, horaire, OI, lieu, responsable.
  const QV_PROJ_RULE = 'QV-PROJ-001';

  // Seul renommage canonique démontré entre le classeur 2026 et le référentiel 2027.
  const QV_HISTORICAL_LABEL_ALIASES = Object.freeze({ 'séance état-major': Object.freeze(['séance em']) });

  function qvHistoricalLabelKey(value) {
    return String(value || '').split('|')[0].replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function qvHistoricalLabelKeys(label) {
    const base = qvHistoricalLabelKey(label);
    return [base].concat(QV_HISTORICAL_LABEL_ALIASES[base] || []).filter(Boolean);
  }

  // Une occurrence par réalisation 2027 distincte : date projetée + horaire + lieu + OI.
  // Une ligne 2026 multi-OI reste un seul événement portant tous ses OI.
  // Deux sources 2026 qui tombent sur le même créneau 2027 ne font qu'un événement :
  // la ligne déjà datée en 2027 prime sur la ligne 2026 projetée.
  function qvHistoricalOccurrenceBuckets(historicalRows, label, year) {
    const wanted = new Set(qvHistoricalLabelKeys(label));
    if (!wanted.size) return [];
    const matching = (historicalRows || []).filter((row) => wanted.has(qvHistoricalLabelKey(row.title || row.label))
      && /^\d{4}-\d{2}-\d{2}$/.test(String(row.date || '').slice(0, 10)));
    if (!matching.length) return [];
    // Aucune ligne ne porte d'OI mais les lieux désignent plusieurs sites : chaque ligne est
    // alors une réalisation propre à un site, l'OI est démontré par le lieu.
    const sitesFromLocation = new Set(matching.map((row) => extractSiteCode(row.location)).filter(Boolean));
    const deriveOiFromLocation = matching.every((row) => !(row.ois || []).length) && sitesFromLocation.size > 1;
    const byKey = new Map();
    for (const row of matching) {
      const date2026 = String(row.date || '').slice(0, 10);
      const explicit2027 = date2026.slice(0, 4) === String(year);
      const date2027 = explicit2027 ? date2026 : qvShiftHistoricalDate(date2026);
      const start = String(row.start || '').slice(0, 5);
      const end = String(row.end || '').slice(0, 5);
      const derived = deriveOiFromLocation ? extractSiteCode(row.location) : '';
      const ois = derived ? [derived] : qvSortOiCodes([...new Set(row.ois || [])]);
      const key = [date2027, start, end, row.location || '', ois.join('+')].join('\t');
      const slot = [date2027, start, ois.join('+')].join('\t');
      const collision = [...byKey.values()].find((item) => item.slot === slot);
      if (byKey.has(key) || (collision && !explicit2027)) continue;
      if (collision && explicit2027) byKey.delete(collision.key);
      byKey.set(key, {
        key,
        slot,
        date2026,
        date2027,
        explicit2027,
        start,
        end,
        ois,
        oiFromLocation: Boolean(derived),
        location: String(row.location || ''),
        responsible: String(row.responsible || ''),
        statCom: String(row.statCom || ''),
        theme: String(row.title || '').split('|').slice(1).map((part) => part.trim()).filter(Boolean).join(' · '),
        sourceLines: [row.sourceLine].filter((value) => value != null)
      });
    }
    return [...byKey.values()].sort((a, b) => a.date2027.localeCompare(b.date2027)
      || a.start.localeCompare(b.start)
      || (scopeSiteRank(a.ois[0] || '') - scopeSiteRank(b.ois[0] || ''))
      || a.location.localeCompare(b.location));
  }

  function qvApplyHistoricalBucket(row, bucket, options) {
    const start = bucket.start || String(row.startsAt || '').slice(11, 16);
    const end = bucket.end || String(row.endsAt || '').slice(11, 16);
    const base = String(row.label || row.title || '');
    const statCom = options && typeof options.statComResolver === 'function'
      ? options.statComResolver(bucket, row) : '';
    const priorStatCom = String(row.statCom || '');
    const priorCode = String(row.code || '');
    return {
      ...row,
      ...(statCom && statCom !== priorStatCom ? { statCom,
        code: priorStatCom && priorCode.startsWith(`${priorStatCom}.`)
          ? `${statCom}${priorCode.slice(priorStatCom.length)}` : row.code,
        statComProjectionEvidence: { sourceLine: bucket.sourceLines[0], sourceStatCom: bucket.statCom,
          canonicalStatCom: statCom } } : {}),
      startsAt: start ? `${bucket.date2027}T${start}` : row.startsAt,
      endsAt: start && end ? `${bucket.date2027}T${end}` : row.endsAt,
      ois: bucket.ois.length ? [...bucket.ois] : [...(row.ois || [])],
      location: bucket.location || row.location || '',
      responsible: bucket.responsible || row.responsible,
      eventLabel: `${base}${bucket.ois.length === 1 ? ` ${bucket.ois[0]}` : ''}${bucket.theme ? ` — ${bucket.theme}` : ''}` || row.eventLabel,
      provenance: row.provenance === 'SOURCE_2027_EXPLICIT' ? row.provenance : 'RECURRENCE_RULE+HISTORICAL_2026',
      projectionRule: QV_PROJ_RULE,
      projectionStatus: start ? 'MATERIALIZED_FROM_2026' : 'DATE_2026_SANS_HORAIRE',
      projectionEvidence: {
        date2026: bucket.date2026,
        shiftDays: bucket.date2026 === bucket.date2027 ? 0 : QV_HISTORICAL_SHIFT_DAYS,
        ois: bucket.ois,
        location: bucket.location,
        theme: bucket.theme,
        sourceLines: bucket.sourceLines
      },
      historicalProposal: {
        ...(row.historicalProposal || {}),
        source: 'HISTORICAL_2026',
        sourceLine: bucket.sourceLines[0],
        date2026: bucket.date2026,
        proposedDate2027: bucket.date2027,
        start: bucket.start,
        end: bucket.end
      }
    };
  }

  function qvCloneOccurrenceForBucket(template, bucket, index, options) {
    const applied = qvApplyHistoricalBucket(template, bucket, options);
    const discriminant = bucket.ois.length ? bucket.ois.join('-') : (String(bucket.location || '').replace(/[^A-Za-z0-9]+/g, '-') || `L${index}`);
    const id = `QV27:PROJ:${template.definitionId}:${bucket.date2027}:${String(bucket.start || index).replace(':', '')}:${discriminant}`;
    return {
      ...applied,
      id,
      occurrenceId: id,
      sessionId: `${id}:S1`,
      sessionIndex: 1,
      sessionCount: 1,
      status: template.status === 'VALIDATED' ? 'A_POSITIONNER' : (template.status || 'A_POSITIONNER'),
      publishedEventId: null,
      projectionAdded: true,
      reason: `Occurrence rétablie par ${QV_PROJ_RULE} : réalisation 2026 du ${bucket.date2026} non reportée par la génération.`
    };
  }

  // Une occurrence est rattachée à sa propre réalisation historique. On ne retire jamais une
  // occurrence : seules les dates, OI, lieux et responsables sont rétablis, et les réalisations
  // 2026 perdues par la génération sont recréées.
  function qvMaterializeHistoricalOccurrences(rows, historicalRows, options) {
    const year = Number((options && options.year) || 2027);
    const owned = new Set([QV_CONDUITE_LABEL, QV_PR_ABC_LABEL].concat((options && options.ownedLabels) || []));
    const groups = new Map();
    for (const row of rows || []) {
      if (!row || row.external) continue;
      if (qvDpsInstructionKind(row)) continue;
      if (owned.has(String(row.label || row.title || ''))) continue;
      const key = String(row.definitionId || row.label || '');
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const patches = new Map();
    const additions = [];
    const report = [];
    for (const [key, group] of groups) {
      const ordered = group.slice().sort((a, b) => qvOccurrenceRank(a) - qvOccurrenceRank(b));
      const label = ordered[0].label || ordered[0].title || '';
      const entry = { definitionId: key, label, occurrences: ordered.length, buckets: 0, dated: 0, added: 0, protected: 0, unmapped: [] };
      // Les séances d'une même occurrence relèvent du modèle multi-session déjà validé.
      if (ordered.some((row) => Number(row.sessionCount || 1) > 1)) { entry.reason = 'MODELE_MULTI_SESSION'; report.push(entry); continue; }
      const buckets = qvHistoricalOccurrenceBuckets(historicalRows, label, year);
      entry.buckets = buckets.length;
      if (!buckets.length) { entry.reason = 'AUCUNE_SOURCE_HISTORIQUE'; report.push(entry); continue; }
      const signature = (row) => `${row.startsAt || 'ND'}|${qvSortOiCodes([...(row.ois || [])]).join('+')}`;
      const counts = new Map();
      ordered.forEach((row) => counts.set(signature(row), (counts.get(signature(row)) || 0) + 1));
      const duplicated = [...counts.values()].some((value) => value > 1);
      const undated = ordered.filter((row) => !row.startsAt).length;
      if (!duplicated && !undated && ordered.length >= buckets.length) { entry.reason = 'DEJA_CONFORME'; report.push(entry); continue; }
      const freeBuckets = buckets.slice();
      const takeBucket = (predicate) => {
        const index = freeBuckets.findIndex(predicate);
        return index < 0 ? null : freeBuckets.splice(index, 1)[0];
      };
      const pending = [];
      for (const row of ordered) {
        if (!qvRotationProtected(row) && row.provenance !== 'SOURCE_2027_EXPLICIT' && row.status !== 'VALIDATED') {
          pending.push(row);
          continue;
        }
        entry.protected += 1;
        const date = String(row.startsAt || '').slice(0, 10);
        takeBucket((bucket) => bucket.date2027 === date);
        patches.set(String(row.id), { ...row, projectionRule: QV_PROJ_RULE, projectionStatus: 'DECISION_EXISTANTE_PRESERVEE' });
      }
      for (const row of pending) {
        const date = String(row.startsAt || '').slice(0, 10);
        const time = String(row.startsAt || '').slice(11, 16);
        const site = qvSortOiCodes([...(row.ois || [])]);
        const bucket = takeBucket((item) => site.length === 1 && item.ois.length === 1
            && item.ois[0] === site[0] && item.date2027 === date && item.start === time)
          || takeBucket((item) => site.length === 1 && item.ois.length === 1 && item.ois[0] === site[0])
          || takeBucket((item) => item.date2027 === date && item.start === time)
          || takeBucket(() => true);
        if (!bucket) {
          entry.unmapped.push(row.id);
          patches.set(String(row.id), { ...row, projectionRule: QV_PROJ_RULE, projectionStatus: 'REALISATION_2026_NON_DEMONTREE' });
          continue;
        }
        entry.dated += 1;
        patches.set(String(row.id), qvApplyHistoricalBucket(row, bucket, options));
      }
      freeBuckets.forEach((bucket, index) => {
        const cloned = qvCloneOccurrenceForBucket(ordered[0], bucket, index, options);
        if (additions.some((item) => item.id === cloned.id) || (rows || []).some((item) => item && item.id === cloned.id)) return;
        additions.push(cloned);
        entry.added += 1;
      });
      report.push(entry);
    }
    const nextRows = (rows || []).map((row) => patches.get(String(row && row.id)) || row);
    return { rows: nextRows.concat(additions), report };
  }

  // QV-PERIOD-001 : certaines activités ne sont pas annuelles. La Revue quinquennale suit la
  // législature (un cycle de 5 ans) ; sa préparation suit la même échéance. 2026 est l'édition
  // de référence, la prochaine est donc 2031. « Non reconduite en 2027 » ne veut pas dire
  // « activité supprimée » : la périodicité reste portée par le moteur et par le catalogue.
  const QV_PERIODIC_ACTIVITIES = Object.freeze([
    Object.freeze({
      rule: 'QV-PERIOD-001',
      pattern: /revue\s+quinquennale/i,
      periodYears: 5,
      referenceYear: 2026,
      basis: 'Législature — une édition par cycle de 5 ans. Édition de référence 2026.'
    })
  ]);

  function qvPeriodicActivityDecision(label, year) {
    const target = Number(year || 2027);
    for (const item of QV_PERIODIC_ACTIVITIES) {
      if (!item.pattern.test(String(label || ''))) continue;
      const delta = target - item.referenceYear;
      const due = delta >= 0 && delta % item.periodYears === 0;
      const nextDue = item.referenceYear + Math.ceil(Math.max(delta, 1) / item.periodYears) * item.periodYears;
      return { rule: item.rule, periodYears: item.periodYears, referenceYear: item.referenceYear, basis: item.basis, due, nextDue, year: target };
    }
    return null;
  }

  function qvApplyPeriodicActivityRules(rows, options) {
    const year = Number((options && options.year) || 2027);
    const kept = [];
    const notRenewed = [];
    for (const row of rows || []) {
      const decision = row && !row.external ? qvPeriodicActivityDecision(row.label || row.title, year) : null;
      if (!decision || decision.due) { kept.push(row); continue; }
      if (qvRotationProtected(row)) {
        kept.push({ ...row, periodicityRule: decision.rule, periodicityStatus: 'DECISION_EXISTANTE_PRESERVEE', periodicityNextDue: decision.nextDue });
        continue;
      }
      notRenewed.push({ id: row.id, label: row.label || row.title || '', statCom: row.statCom || '', rule: decision.rule, nextDue: decision.nextDue, basis: decision.basis });
    }
    return { rows: kept, report: { year, notRenewed, removed: notRenewed.length, nextDue: notRenewed.length ? notRenewed[0].nextDue : null } };
  }

  const QV_CONDUITE_LABEL = 'Conduite, formation continue';
  const QV_CONDUITE_STATCOM = '0152F7';
  const QV_CONDUITE_PUBLICS = Object.freeze(['AUTO:1', 'AUTO:3']);
  const QV_CONDUITE_MAX_MINUTES = 60;
  const QV_CONDUITE_PER_HALF = 2;
  const QV_DPS_INSTRUCTION_RESPONSABLE = 'Chef section DPS';
  // Familles corrélées aux deux fenêtres de conduite observées en 2026.
  const QV_CONDUITE_THEMES = Object.freeze({
    G1: Object.freeze(['KICK-OFF', 'VARIA']),
    C1: Object.freeze(['KICK-OFF', 'FEU']),
    B1: Object.freeze(['KICK-OFF', 'FEU']),
    B2: Object.freeze(['KICK-OFF', 'FEU'])
  });
  let qvCtaRulesModule = null;
  try {
    if (typeof require === 'function') qvCtaRulesModule = require('../../netlify/lib/_scope-cta-rules');
  } catch (error) {
    qvCtaRulesModule = null;
  }

  function qvDpsInstructionKind(row) {
    const label = String((row && (row.label || row.title)) || '');
    if (/instr(?:uction)?\s+demi[-\s]*(?:sct|section)/i.test(label)) return 'demi-section';
    if (/instr(?:uction)?\s+(?:sct|section)/i.test(label)) return 'section';
    return '';
  }

  function qvIsPionnierRow(row) {
    return /\bPIONNIER\b/i.test(String((row && (row.label || row.title)) || ''));
  }

  function qvDpsSitesOf(row) {
    return qvSortOiCodes(((row && row.ois) || []).map((code) => String(code || '').replace(/^(DPS|DAP|JSP):/, '')))
      .filter((code) => QV_DPS_SITES.includes(code));
  }

  function qvDpsDefaultLieuCode(site) {
    // Règle MOA : instructions et exercices DPS B2 se déroulent par défaut sur le site C1.
    return String(site || '').toUpperCase() === 'B2' ? 'C1' : String(site || '').toUpperCase();
  }

  function qvInstructionTheme(row) {
    const parts = String((row && (row.label || row.title)) || '').split(/\s+-\s+/);
    if (parts.length < 2) return '';
    return parts.slice(1).join(' - ').trim().toUpperCase().replace(/\s+CSU-NVB$/, '');
  }

  function qvProgrammeVisibleThemes(row) {
    const explicit = Array.isArray(row && row.themes) ? row.themes.filter(Boolean) : [];
    const historical = String(row && row.projectionEvidence && row.projectionEvidence.theme || '').trim();
    const eventLabel = String(row && row.eventLabel || '');
    const kickoff = eventLabel.match(/[·—]\s*(KICK-OFF)\s*$/i);
    return [...new Set([...explicit, historical, kickoff && kickoff[1]].filter(Boolean)
      .map((value) => String(value).trim()))];
  }

  function qvAddMinutes(stamp, minutes) {
    const text = String(stamp || '');
    if (text.length < 16) return '';
    const base = new Date(`${text.slice(0, 16)}:00Z`);
    base.setUTCMinutes(base.getUTCMinutes() + Number(minutes || 0));
    return base.toISOString().slice(0, 16);
  }

  function qvConduiteEngineOptions(options) {
    if (options && typeof options.ctaResolver === 'function' && typeof options.operationalHalvesForOi === 'function') {
      return options;
    }
    if (qvCtaRulesModule) {
      return {
        ...(options || {}),
        ctaResolver: (options && options.ctaResolver) || qvCtaRulesModule.instructionPublicForDate,
        operationalHalvesForOi: (options && options.operationalHalvesForOi) || qvCtaRulesModule.operationalHalfSections
      };
    }
    return options || {};
  }

  function qvHalfSectionOf(row, site, ctaResolver) {
    const existing = (row && row.publics || []).find((code) => /^N0[1-6][ab]$/.test(code));
    if (existing) return existing;
    if (typeof ctaResolver === 'function' && row && row.startsAt && site) {
      return ctaResolver(String(row.startsAt).slice(0, 10), site, 'demi-section', qvIsPionnierRow(row)) || '';
    }
    return '';
  }

  function qvConduitePublics(halfSection) {
    return [halfSection, ...QV_CONDUITE_PUBLICS].filter(Boolean);
  }

  // Première et dernière instruction réelle de chaque demi-section : deux heures annuelles.
  function qvSelectSpreadIndices(n, k) {
    const count = Math.max(0, Number(n) || 0);
    const want = Math.max(0, Number(k) || 0);
    if (!count || !want) return [];
    if (count <= want) return [...Array(count).keys()];
    const picked = [];
    for (let i = 0; i < want; i += 1) {
      let index = Math.round(i * (count - 1) / (want - 1));
      while (picked.includes(index) && index < count - 1) index += 1;
      while (picked.includes(index) && index > 0) index -= 1;
      if (!picked.includes(index)) picked.push(index);
    }
    return picked.sort((a, b) => a - b);
  }

  function qvIsoDayNumber(date) {
    return Math.round(Date.parse(`${date}T12:00:00Z`) / 86400000);
  }

  // QV-DPS-006 : la saison d'instruction section / demi-section est bornée par l'historique.
  // 2026 ne compte aucune instruction en janvier, démarre le premier samedi de février et
  // s'arrête début décembre. Aucune instruction ne peut donc être programmée en janvier,
  // ni entre Noël et la fin d'année.
  function qvFirstSaturdayOfFebruary(year) {
    for (let day = 1; day <= 7; day += 1) {
      const key = `${year}-02-${String(day).padStart(2, '0')}`;
      if (new Date(`${key}T12:00:00Z`).getUTCDay() === 6) return key;
    }
    return `${year}-02-01`;
  }

  function qvInstructionSeasonBounds(historicalRows, year) {
    const target = Number(year || 2027);
    const start = qvFirstSaturdayOfFebruary(target);
    const christmas = `${target}-12-23`;
    const previous = String(target - 1);
    const lastHistorical = (historicalRows || [])
      .filter((row) => /^Instr (?:sct|demi-sct)\b/.test(String(row.title || row.label || '')))
      .map((row) => String(row.date || '').slice(0, 10))
      .filter((date) => date.slice(0, 4) === previous)
      .sort()
      .pop();
    const projected = lastHistorical ? qvShiftHistoricalDate(lastHistorical) : '';
    const end = projected && projected < christmas ? projected : christmas;
    return { start, end, source: lastHistorical ? 'HISTORIQUE_2026_PROJETE' : 'BORNE_NOEL_CANONIQUE', lastHistorical: lastHistorical || '' };
  }

  // La couverture d'instructions est assurée par son propre moteur ; la conduite ne crée pas de source.
  function qvEnsureAnnualConduiteInstructionSources(rows, options) {
    return { rows: rows || [], added: [], season: (options && options.season) || null };
  }

  function qvConduiteSources(rows, ctaResolver) {
    const eligible = [];
    for (const row of rows || []) {
      if (!row || row.external || !row.startsAt || !row.endsAt) continue;
      if (qvDpsInstructionKind(row) !== 'demi-section') continue;
      if (qvIsPionnierRow(row)) continue;
      const theme = qvInstructionTheme(row);
      const sites = qvDpsSitesOf(row);
      for (const site of sites) {
        const halfSection = qvHalfSectionOf(row, site, ctaResolver);
        if (!halfSection) continue;
        if (qvCtaRulesModule && qvCtaRulesModule.isReserveHalfSection(site, halfSection)) continue;
        const location = sites.length === 1 ? (row.location || '') : `Caserne ${qvDpsDefaultLieuCode(site)}`;
        eligible.push({ site, theme, halfSection, row, location });
      }
    }
    return eligible.sort((a, b) => String(a.row.startsAt).localeCompare(String(b.row.startsAt))
      || (scopeSiteRank(a.site) - scopeSiteRank(b.site))
      || String(a.halfSection).localeCompare(String(b.halfSection)));
  }

  function qvNextStatComSerials(existing, statCom, count) {
    const prefix = `${statCom}.`;
    const used = new Set((existing || []).map((row) => String(row.code || ''))
      .filter((code) => code.startsWith(prefix))
      .map((code) => Number(code.slice(prefix.length)))
      .filter((value) => Number.isFinite(value)));
    const serials = [];
    let cursor = 1;
    while (serials.length < count) {
      if (!used.has(cursor)) serials.push(cursor);
      cursor += 1;
    }
    return serials;
  }

  function qvBuildConduiteRow(item, serial, existing) {
    const startsAt = String(item.row.endsAt).slice(0, 16);
    const endsAt = qvAddMinutes(startsAt, QV_CONDUITE_MAX_MINUTES);
    const dateKey = startsAt.slice(0, 10);
    const startKey = startsAt.slice(11, 16).replace(':', '');
    const id = `QV${dateKey.slice(2, 4)}:CONDUITE:${item.site}:${item.halfSection}:${dateKey}:${startKey}`;
    const evidence = {
      rule: 'QV-CONDUITE-001',
      site: item.site,
      theme: item.theme,
      halfSection: item.halfSection,
      sourceId: item.row.id,
      spread: 'QV-CONDUITE-007'
    };
    const publics = qvConduitePublics(item.halfSection);
    const sourceLocation = item.location || item.row.location || '';
    if (existing) {
      const realigned = sourceLocation && String(existing.location || '') !== sourceLocation;
      return {
        ...existing,
        endsAt: String(existing.endsAt).slice(0, 16) || endsAt,
        location: sourceLocation || existing.location || '',
        ois: [item.site],
        publics,
        statCom: QV_CONDUITE_STATCOM,
        conduiteMinutesPerParticipant: QV_CONDUITE_MAX_MINUTES,
        conduiteEvidence: realigned
          ? { ...(existing.conduiteEvidence || {}), ...evidence, locationRealignedFrom: String(existing.location || ''), locationRule: 'MOA_CONDUITE_FOLLOWS_SOURCE_LOCATION' }
          : { ...(existing.conduiteEvidence || {}), ...evidence }
      };
    }
    return {
      id,
      definitionId: 'QV26-CONDUITE-FORMATION-CONTINUE-2990E6C6',
      occurrenceId: id,
      sessionId: `${id}:S1`,
      label: QV_CONDUITE_LABEL,
      eventLabel: QV_CONDUITE_LABEL,
      status: item.row.status === 'VALIDATED' ? 'VALIDATED' : 'A_POSITIONNER',
      code: `${QV_CONDUITE_STATCOM}.${String(serial).padStart(3, '0')}`,
      statCom: QV_CONDUITE_STATCOM,
      domain: 'AUTO',
      family: 'Formation',
      ois: [item.site],
      publics,
      conduiteMinutesPerParticipant: QV_CONDUITE_MAX_MINUTES,
      sessionIndex: 1,
      sessionCount: 1,
      startsAt,
      endsAt,
      location: sourceLocation,
      room: '',
      responsible: item.row.responsible || '',
      provenance: 'MOA_RULE_CONDUITE_ANNUAL',
      reason: `Conduite positionnée après ${item.row.label} (${item.site} ${item.halfSection}).`,
      review: false,
      external: false,
      conduiteEvidence: evidence
    };
  }

  function qvDeriveConduiteContinue(rows, options) {
    const engine = qvConduiteEngineOptions(options);
    const sources = qvConduiteSources(rows, engine.ctaResolver);
    const existing = (rows || []).filter((row) => row && !row.external
      && String(row.statCom || '') === QV_CONDUITE_STATCOM && String(row.label || '') === QV_CONDUITE_LABEL);
    const grouped = new Map();
    for (const item of sources) {
      const key = `${item.site}|${item.halfSection}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }
    const slots = [];
    const insufficient = [];
    const halvesFor = typeof engine.operationalHalvesForOi === 'function'
      ? engine.operationalHalvesForOi : () => [];
    for (const site of QV_DPS_SITES) {
      for (const halfSection of halvesFor(site)) {
        const list = (grouped.get(`${site}|${halfSection}`) || [])
          .slice().sort((a, b) => String(a.row.startsAt).localeCompare(String(b.row.startsAt)));
        const current = existing.filter((row) => qvDpsSitesOf(row)[0] === site
          && qvHalfSectionOf(row, site, engine.ctaResolver) === halfSection);
        const pinned = current.some((row) => row.calendarAdjustment?.rule === 'MOA_CALENDAR_FINAL_2027')
          && current.length === QV_CONDUITE_PER_HALF
          ? current.map((row) => list.find((item) => item.row.id === row.conduiteEvidence?.sourceId
            && String(item.row.endsAt).slice(0, 16) === String(row.startsAt).slice(0, 16)))
          : [];
        const picked = pinned.length === QV_CONDUITE_PER_HALF && pinned.every(Boolean)
          && new Set(pinned.map((item) => item.row.id)).size === QV_CONDUITE_PER_HALF
          ? pinned : qvSelectSpreadIndices(list.length, QV_CONDUITE_PER_HALF).map((index) => list[index]);
        slots.push(...picked);
        if (picked.length < QV_CONDUITE_PER_HALF) {
          insufficient.push({ code: 'CONDUITE_SOURCE_INSUFFISANTE', oi: site, halfSection,
            expected: QV_CONDUITE_PER_HALF, found: picked.length,
            candidates: list.map((item) => ({ id: item.row.id,
              date: String(item.row.startsAt).slice(0, 10), theme: item.theme })) });
        }
      }
    }
    const taken = new Set();
    const matched = [];
    const toAdd = [];
    for (const item of slots) {
      const startsAt = String(item.row.endsAt).slice(0, 16);
      const found = existing.find((row) => !taken.has(row.id)
        && qvDpsSitesOf(row)[0] === item.site && String(row.startsAt).slice(0, 16) === startsAt
        && qvHalfSectionOf(row, item.site, engine.ctaResolver) === item.halfSection);
      if (found) {
        taken.add(found.id);
        matched.push(qvBuildConduiteRow(item, 0, found));
      } else {
        toAdd.push(item);
      }
    }
    const serials = qvNextStatComSerials(existing, QV_CONDUITE_STATCOM, toAdd.length);
    const added = toAdd.map((item, index) => qvBuildConduiteRow(item, serials[index], null));
    const orphans = existing.filter((row) => !taken.has(row.id));
    const expected = QV_DPS_SITES.reduce((count, site) => count + halvesFor(site).length * QV_CONDUITE_PER_HALF, 0);
    return {
      matched,
      added,
      missing: insufficient,
      insufficient,
      orphans,
      expected,
      materialized: matched.length + added.length
    };
  }

  function qvApplyConduiteContinue(rows, options) {
    const derived = qvDeriveConduiteContinue(rows, options);
    derived.programmedInstructions = [];
    derived.season = (options && options.season) || null;
    const replaced = new Map(derived.matched.map((row) => [String(row.id), row]));
    const next = (rows || []).map((row) => replaced.get(String(row && row.id)) || row);
    return { rows: next.concat(derived.added), derived };
  }

  // QV-DAP-001 : la conduite / formation continue DAP existe dans l'historique (Stat.Com 01522F7,
  // sections Y1–Y4, 18:30–21:30, local de section) mais la génération 2027 ne l'a pas reportée.
  // Elle est rétablie depuis 2026 ; elle ne copie pas les occurrences DPS (Stat.Com 0152F7).
  const QV_DAP_CONDUITE_STATCOM = '01522F7';
  const QV_DAP_CONDUITE_PUBLICS = Object.freeze(['AUTO:3']);
  const QV_DAP_CONDUITE_RESPONSABLE = 'Of auto';
  const QV_DAP_SECTIONS = Object.freeze(['Y1', 'Y2', 'Y3', 'Y4']);

  function qvDapConduiteBuckets(historicalRows, year) {
    const byKey = new Map();
    for (const row of historicalRows || []) {
      if (String(row.statCom || '') !== QV_DAP_CONDUITE_STATCOM) continue;
      if (qvHistoricalLabelKey(row.title || row.label) !== qvHistoricalLabelKey(QV_CONDUITE_LABEL)) continue;
      const date2026 = String(row.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date2026)) continue;
      const ois = qvSortOiCodes([...new Set(row.ois || [])]).filter((code) => QV_DAP_SECTIONS.includes(code));
      if (!ois.length) continue;
      const start = String(row.start || '').slice(0, 5);
      const key = [date2026, start, ois.join('+')].join('\t');
      if (byKey.has(key)) continue;
      byKey.set(key, {
        date2026,
        date2027: date2026.slice(0, 4) === String(year) ? date2026 : qvShiftHistoricalDate(date2026),
        start,
        end: String(row.end || '').slice(0, 5),
        ois,
        location: String(row.location || ''),
        sourceLine: row.sourceLine
      });
    }
    const bySection = new Map(QV_DAP_SECTIONS.map((oi) => [oi, []]));
    for (const bucket of [...byKey.values()].sort((a, b) => a.date2027.localeCompare(b.date2027))) {
      if (bucket.date2027.slice(5, 7) < '03' || bucket.date2027.slice(5, 7) > '05') continue;
      for (const oi of bucket.ois) {
        const section = bySection.get(oi);
        if (section && section.length < 4) section.push({ ...bucket, ois: [oi] });
      }
    }
    return [...bySection.values()].flat().sort((a, b) => a.date2027.localeCompare(b.date2027)
      || (scopeSiteRank(a.ois[0]) - scopeSiteRank(b.ois[0])));
  }

  function qvDapConduiteSlots(date) {
    return [['18:30', '19:30'], ['19:00', '20:00'], ['20:00', '21:00'], ['20:30', '21:30']]
      .map(([start, end], index) => ({ position: index + 1, startsAt: `${date}T${start}`, endsAt: `${date}T${end}`,
        conduiteStartsAt: `${date}T${['19:00', '19:30', '20:30', '21:00'][index]}`,
        conduiteEndsAt: `${date}T${['19:30', '20:00', '21:00', '21:30'][index]}`,
        connaissanceVehiculeStartsAt: `${date}T${['18:30', '19:00', '20:00', '20:30'][index]}`,
        connaissanceVehiculeEndsAt: `${date}T${['19:00', '19:30', '20:30', '21:00'][index]}`,
        conduiteMinutes: 30, connaissanceVehiculeMinutes: 30 }));
  }

  function qvApplyDapConduite(rows, historicalRows, options) {
    const year = Number((options && options.year) || 2027);
    const buckets = qvDapConduiteBuckets(historicalRows, year);
    const existing = (rows || []).filter((row) => row && !row.external
      && String(row.statCom || '') === QV_DAP_CONDUITE_STATCOM
      && String(row.label || row.title || '') === QV_CONDUITE_LABEL);
    if (!buckets.length) return { rows: rows || [], report: { expected: 0, existing: existing.length, added: 0, reason: 'AUCUNE_SOURCE_HISTORIQUE' } };
    const datedExisting = new Set(existing.map((row) => `${String(row.startsAt || '').slice(0, 10)}|${qvSortOiCodes([...(row.ois || [])]).join('+')}`));
    const serials = qvNextStatComSerials(rows || [], QV_DAP_CONDUITE_STATCOM, buckets.length);
    const additions = [];
    buckets.forEach((bucket, index) => {
      if (datedExisting.has(`${bucket.date2027}|${bucket.ois.join('+')}`)) return;
      const id = `QV27:DAPCOND:${bucket.date2027}:${bucket.ois.join('-')}:${String(bucket.start || '').replace(':', '')}`;
      if ((rows || []).some((row) => row && row.id === id) || additions.some((row) => row.id === id)) return;
      additions.push({
        id,
        definitionId: 'QV27-CONDUITE-DAP',
        occurrenceId: id,
        sessionId: `${id}:S1`,
        sessionIndex: 1,
        sessionCount: 1,
        label: QV_CONDUITE_LABEL,
        eventLabel: `${QV_CONDUITE_LABEL} ${bucket.ois.join(', ')}`,
        status: 'A_POSITIONNER',
        code: `${QV_DAP_CONDUITE_STATCOM}.${String(serials[index] || index + 1).padStart(3, '0')}`,
        statCom: QV_DAP_CONDUITE_STATCOM,
        domain: 'AUTO',
        family: 'Conduite',
        ois: [...bucket.ois],
        publics: [...QV_DAP_CONDUITE_PUBLICS],
        conduiteSlots: qvDapConduiteSlots(bucket.date2027),
        startsAt: bucket.start ? `${bucket.date2027}T${bucket.start}` : null,
        endsAt: bucket.start && bucket.end ? `${bucket.date2027}T${bucket.end}` : null,
        location: bucket.location || `Local ${bucket.ois[0]}`,
        room: '',
        responsible: QV_DAP_CONDUITE_RESPONSABLE,
        responsableFonctionCode: QV_DAP_CONDUITE_RESPONSABLE,
        provenance: 'MOA_RULE_CONDUITE_DAP_2027',
        conduiteRule: 'QV-DAP-001',
        reason: `Conduite DAP rétablie depuis la réalisation 2026 du ${bucket.date2026} (Stat.Com ${QV_DAP_CONDUITE_STATCOM}, section ${bucket.ois.join(', ')}).`,
        historicalProposal: {
          source: 'HISTORICAL_2026',
          sourceLine: bucket.sourceLine,
          date2026: bucket.date2026,
          proposedDate2027: bucket.date2027,
          start: bucket.start,
          end: bucket.end
        },
        review: false,
        external: false
      });
    });
    return { rows: (rows || []).concat(additions), report: { expected: buckets.length, existing: existing.length, added: additions.length, byOi: QV_DAP_SECTIONS.map((oi) => ({ oi, count: buckets.filter((bucket) => bucket.ois.includes(oi)).length })) } };
  }

  function qvApplyDapAnnualExercisePlan(rows, historicalRows) {
    const lastBySection = new Map((historicalRows || [])
      .filter((row) => row.title === 'Exercice DAP 5' && String(row.date || '').startsWith('2026-'))
      .flatMap((row) => (row.ois || []).filter((oi) => QV_DAP_SECTIONS.includes(oi)).map((oi) => [oi, row])));
    const report = { targetExercises: 4, shiftedFinal: 0, replacedFifth: 0, protected: [], missingEvidence: [], formationGroupeeDate: null };
    const next = (rows || []).map((row) => {
      if (!row || row.external || !/^Exercice DAP [45]$/.test(String(row.label || ''))) return row;
      const oi = (row.ois || []).find((code) => QV_DAP_SECTIONS.includes(code));
      if (qvRotationProtected(row) || row.status === 'VALIDATED' || row.provenance === 'SOURCE_2027_EXPLICIT') {
        report.protected.push(row.id);
        return row;
      }
      if (row.label === 'Exercice DAP 5') {
        report.replacedFifth += 1;
        return { ...row, external: true, dapAnnualRule: 'QV-DAP-002',
          dapAnnualStatus: 'REMPLACE_PAR_FORMATION_GROUPEE',
          reason: 'La formation groupée DAP remplace un des cinq exercices annuels ; quatre exercices sont conservés.' };
      }
      const source = lastBySection.get(oi);
      if (!source || !source.start || !source.end) {
        report.missingEvidence.push({ id: row.id, oi });
        return { ...row, dapAnnualStatus: 'MOA_REQUIRED' };
      }
      const date = qvShiftHistoricalDate(source.date);
      report.shiftedFinal += 1;
      return { ...row, startsAt: `${date}T${source.start}`, endsAt: `${date}T${source.end}`,
        dapAnnualRule: 'QV-DAP-002', dapAnnualStatus: 'DERNIER_EXERCICE_VENDREDI_SAMEDI',
        historicalProposal: { ...(row.historicalProposal || {}), source: 'HISTORICAL_2026', sourceLine: source.sourceLine,
          title2026: source.title, date2026: source.date, proposedDate2027: date, start: source.start, end: source.end },
        dapAnnualEvidence: { replacedExercise: 'Exercice DAP 5', priorDate: row.startsAt, sourceLine: source.sourceLine,
          sourceDate2026: source.date, formationGroupeeDate: null } };
    });
    return { rows: next, report };
  }

  function qvThemesFromHistoricalTitle(title) {
    return String(title || '').split('|').slice(1).map((part) => part.trim()).filter(Boolean);
  }

  function qvApplyFobaOccurrenceThemes(rows, historicalRows) {
    const source = (historicalRows || []).filter((row) => String(row.date || '').startsWith('2026-')
      && /^Exercice FOBA(?: \d+)?(?:\s*\||$)/.test(String(row.title || '')));
    const groups = new Map();
    for (const item of source) {
      const key = String(item.title).split('|')[0].trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    for (const group of groups.values()) group.sort((a, b) => a.date.localeCompare(b.date));
    const counters = new Map();
    const report = { matched: 0, themed: 0, protected: [], missingEvidence: [] };
    const next = (rows || []).map((row) => {
      const key = String(row && row.label || '');
      if (!groups.has(key) || row.external) return row;
      const index = counters.get(key) || 0;
      counters.set(key, index + 1);
      const item = groups.get(key)[index];
      if (!item) { report.missingEvidence.push(row.id); return row; }
      if (qvRotationProtected(row) || row.status === 'VALIDATED' || row.provenance === 'SOURCE_2027_EXPLICIT') {
        report.protected.push(row.id);
        return row;
      }
      const date = qvShiftHistoricalDate(item.date);
      const themes = qvThemesFromHistoricalTitle(item.title);
      report.matched += 1;
      if (themes.length) report.themed += 1;
      return { ...row, startsAt: `${date}T${item.start}`, endsAt: `${date}T${item.end}`,
        themes, themeSource: { sourceLine: item.sourceLine, date2026: item.date },
        historicalProposal: { ...(row.historicalProposal || {}), source: 'HISTORICAL_2026', sourceLine: item.sourceLine,
          title2026: item.title, date2026: item.date, proposedDate2027: date, start: item.start, end: item.end },
        fobaRule: 'QV-FOBA-001' };
    });
    return { rows: next, report };
  }

  function qvApplyPrSeriesContinuity(rows, historicalRows) {
    const source = new Map((historicalRows || [])
      .filter((row) => /^Exercice PR [1-4]\.\d+\s*\|/.test(String(row.title || ''))
        && String(row.date || '').startsWith('2026-'))
      .map((row) => [String(row.title).split('|')[0].trim(), row]));
    const priorSeason = new Set([...source].filter(([, row]) => row.date >= '2026-10-01' && /^Exercice PR 1\./.test(row.title))
      .map(([label]) => label));
    const report = { datedFirstSeries: 0, priorSeason: [...priorSeason], themed: 0, protected: [], missingEvidence: [] };
    const next = (rows || []).map((row) => {
      if (!row || row.external || !/^Exercice PR [1-4]\./.test(String(row.label || ''))) return row;
      const firstSeries = row.label === 'Exercice PR 1.1' && Number(row.sessionCount || 1) > 1;
      const label = firstSeries ? `Exercice PR 1.${Number(row.sessionIndex || 1)}` : row.label;
      const item = source.get(label);
      if (!item) { report.missingEvidence.push(row.id); return row; }
      if (qvRotationProtected(row) || row.status === 'VALIDATED' || row.provenance === 'SOURCE_2027_EXPLICIT') {
        report.protected.push(row.id);
        return row;
      }
      if (firstSeries && priorSeason.has(label)) return { ...row, external: true, prRule: 'QV-PR-001', prStatus: 'DEJA_PLANIFIE_FIN_2026' };
      const themes = qvThemesFromHistoricalTitle(item.title);
      if (themes.length) report.themed += 1;
      const date = qvShiftHistoricalDate(item.date);
      if (firstSeries) report.datedFirstSeries += 1;
      return { ...row, ...(firstSeries ? { startsAt: `${date}T${item.start}`, endsAt: `${date}T${item.end}` } : {}),
        themes, themeSource: { sourceLine: item.sourceLine, date2026: item.date }, prRule: 'QV-PR-001',
        historicalProposal: { ...(row.historicalProposal || {}), source: 'HISTORICAL_2026', sourceLine: item.sourceLine,
          title2026: item.title, date2026: item.date, proposedDate2027: date, start: item.start, end: item.end } };
    });
    return { rows: next, report };
  }

  function qvConduiteCoherenceControl(rows, options) {
    const engine = qvConduiteEngineOptions(options);
    const ctaResolver = engine.ctaResolver;
    const list = (rows || []).filter((row) => row && !row.external);
    const conduites = list.filter((row) => row.label === QV_CONDUITE_LABEL
      && String(row.statCom || '') !== QV_DAP_CONDUITE_STATCOM);
    const halvesFor = typeof engine.operationalHalvesForOi === 'function'
      ? engine.operationalHalvesForOi : () => [];
    const perSite = QV_DPS_SITES.map((site) => ({ oi: site,
      n: conduites.filter((row) => qvDpsSitesOf(row)[0] === site).length,
      expected: halvesFor(site).length * QV_CONDUITE_PER_HALF }));
    perSite.forEach((item) => { item.pass = item.n === item.expected; });
    const perHalf = QV_DPS_SITES.flatMap((site) => halvesFor(site).map((halfSection) => ({
      oi: site, halfSection, expected: QV_CONDUITE_PER_HALF,
      n: conduites.filter((row) => qvDpsSitesOf(row)[0] === site
        && qvHalfSectionOf(row, site, ctaResolver) === halfSection).length
    })));
    perHalf.forEach((item) => { item.pass = item.n === item.expected; });
    let reserveConduites = 0;
    let orphans = 0;
    let oiMismatch = 0;
    let nxxMismatch = 0;
    let notImmediate = 0;
    let durationFail = 0;
    let publicFail = 0;
    let fusedOi = 0;
    let statComFail = 0;
    let lieuFail = 0;
    let themeFail = 0;
    let spreadFail = 0;
    let pionnierFail = 0;
    const keys = new Set();
    let duplicates = 0;
    const expected = perSite.reduce((count, item) => count + item.expected, 0);
    const sources = qvConduiteSources(list, ctaResolver);
    for (const site of QV_DPS_SITES) {
      const group = conduites.filter((row) => qvDpsSitesOf(row)[0] === site)
        .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
      for (const halfSection of halvesFor(site)) {
        const pair = group.filter((row) => qvHalfSectionOf(row, site, ctaResolver) === halfSection);
        if (pair.length === 2 && qvIsoDayNumber(String(pair[1].startsAt).slice(0, 10))
          - qvIsoDayNumber(String(pair[0].startsAt).slice(0, 10)) < 28) spreadFail += 1;
        const actualThemes = pair.map((row) => (row.conduiteEvidence || {}).theme);
        const candidates = sources.filter((item) => item.site === site && item.halfSection === halfSection);
        const selectedThemes = qvSelectSpreadIndices(candidates.length, QV_CONDUITE_PER_HALF).map((index) => candidates[index].theme);
        if (pair.length === 2 && !pair.some((row) => row.calendarAdjustment?.rule === 'MOA_CALENDAR_FINAL_2027')
          && JSON.stringify(actualThemes) !== JSON.stringify(selectedThemes)) themeFail += 1;
      }
      if (site === 'G1') {
        const firstPionnier = list.filter((row) => qvIsPionnierRow(row) && qvDpsInstructionKind(row)
          && qvDpsSitesOf(row)[0] === site && row.startsAt)
          .map((row) => String(row.startsAt)).sort()[0];
        if (firstPionnier && group.some((row) => String(row.startsAt) >= firstPionnier)) pionnierFail += 1;
      }
    }
    for (const row of conduites) {
      const sites = qvDpsSitesOf(row);
      if (sites.length !== 1) fusedOi += 1;
      const site = sites[0];
      const half = (row.conduiteEvidence && row.conduiteEvidence.halfSection) || '';
      if (qvCtaRulesModule && qvCtaRulesModule.isReserveHalfSection(site, half)) reserveConduites += 1;
      const source = list.find((item) => item.id === (row.conduiteEvidence && row.conduiteEvidence.sourceId));
      if (!source) orphans += 1;
      else {
        if (qvDpsSitesOf(source)[0] !== site) oiMismatch += 1;
        const sourceHalf = qvHalfSectionOf(source, site, ctaResolver);
        if (sourceHalf !== half) nxxMismatch += 1;
        if (String(row.startsAt).slice(0, 16) !== String(source.endsAt).slice(0, 16)) notImmediate += 1;
      }
      const minutes = (Number(String(row.endsAt).slice(11, 13)) * 60 + Number(String(row.endsAt).slice(14, 16)))
        - (Number(String(row.startsAt).slice(11, 13)) * 60 + Number(String(row.startsAt).slice(14, 16)));
      if (!(minutes > 0 && minutes <= 60)) durationFail += 1;
      if (JSON.stringify(row.publics || []) !== JSON.stringify(qvConduitePublics(half))) publicFail += 1;
      if (/^Caserne /.test(String(row.location || '')) && row.location !== `Caserne ${qvDpsDefaultLieuCode(site)}`) lieuFail += 1;
      if (row.statCom !== QV_CONDUITE_STATCOM) statComFail += 1;
      const key = `${site}|${row.startsAt}|${half}`;
      if (keys.has(key)) duplicates += 1;
      keys.add(key);
    }
    const instructionFused = list.filter((row) => qvDpsInstructionKind(row) && qvDpsSitesOf(row).length !== 1).length;
    const variaFeu = list.filter((row) => /Instr (demi-sct|sct) - (VARIA|FEU)$/.test(row.label || ''));
    const responsableFail = variaFeu.filter((row) => row.responsible !== QV_DPS_INSTRUCTION_RESPONSABLE).length;
    fusedOi += instructionFused;
    return {
      halves: Object.fromEntries(QV_DPS_SITES.map((site) => [site, halvesFor(site).length])),
      target: expected,
      materialized: conduites.length,
      perSite,
      perHalf,
      incompleteSites: perSite.filter((item) => !item.pass),
      incompleteHalves: perHalf.filter((item) => !item.pass),
      reserveConduites,
      orphans,
      oiMismatch,
      nxxMismatch,
      notImmediate,
      durationFail,
      publicFail,
      fusedOi,
      statComFail,
      lieuFail,
      themeFail,
      spreadFail,
      pionnierFail,
      responsableFail,
      duplicates,
      pass: conduites.length === expected
        && perSite.every((item) => item.pass)
        && perHalf.every((item) => item.pass)
        && !reserveConduites && !orphans && !oiMismatch && !nxxMismatch && !notImmediate
        && !durationFail && !publicFail && !instructionFused && !statComFail && !lieuFail
        && !responsableFail && !themeFail && !spreadFail && !pionnierFail && !duplicates
    };
  }

  const QV_PIONNIER_RULES = Object.freeze({
    sectionCsuNvb: Object.freeze({ start: '19:15', end: '22:00' }),
    demiSectionMinutes: 240,
    site: 'G1',
    fobaPublic: 'FOBA:2'
  });

  function qvApplyPionnierRules(rows) {
    const changes = [];
    const next = (rows || []).map((row) => {
      if (!row || row.external || !qvIsPionnierRow(row)) return row;
      const label = String(row.label || row.title || '');
      const kind = qvDpsInstructionKind(row);
      const date = String(row.startsAt || '').slice(0, 10);
      const patch = {};
      const evidence = [];
      if (/^Introduction\s+PIONNIER/i.test(label) && !(row.publics || []).includes(QV_PIONNIER_RULES.fobaPublic)) {
        patch.publics = [QV_PIONNIER_RULES.fobaPublic];
        evidence.push({ field: 'publics', rule: 'MOA_PIONNIER_FOBA_2', from: (row.publics || []).join(',') });
      }
      if (/CSU-nvb/i.test(label) && kind === 'section' && date) {
        const { start, end } = QV_PIONNIER_RULES.sectionCsuNvb;
        if (String(row.startsAt).slice(11, 16) !== start || String(row.endsAt || '').slice(11, 16) !== end) {
          patch.startsAt = `${date}T${start}`;
          patch.endsAt = `${date}T${end}`;
          evidence.push({ field: 'horaire', rule: 'MOA_PIONNIER_CSU_NVB_19_15_22_00',
            from: `${String(row.startsAt).slice(11, 16)}-${String(row.endsAt || '').slice(11, 16)}` });
        }
      }
      if (kind === 'demi-section' && date && row.endsAt) {
        const expected = qvAddMinutes(String(row.startsAt).slice(0, 16), QV_PIONNIER_RULES.demiSectionMinutes);
        if (expected && String(row.endsAt).slice(0, 16) !== expected) {
          patch.endsAt = expected;
          evidence.push({ field: 'duree', rule: 'MOA_PIONNIER_DEMI_SECTION_4H', from: String(row.endsAt).slice(11, 16) });
        }
      }
      if (!evidence.length) return { ...row, pionnierRule: 'MOA_PIONNIER_CONFORME' };
      changes.push({ id: row.id, label, evidence });
      return { ...row, ...patch, pionnierRule: 'MOA_PIONNIER_APPLIED', pionnierEvidence: evidence };
    });
    return { rows: next, changes };
  }

  function qvPionnierCtaCheck(row, ctaResolver) {
    const date = String((row && row.startsAt) || '').slice(0, 10);
    const site = qvDpsSitesOf(row)[0];
    const publicCode = ((row && row.publics) || []).find((code) => /^N0[1-5][ab]?$/.test(code)) || '';
    const section = publicCode.slice(0, 3);
    if (!date || !section || site !== 'G1' || typeof ctaResolver !== 'function') {
      return { pass: false, reason: 'PUBLIC_OU_CTA_NON_DEMONTRE', date, section };
    }
    const dutyN = ctaResolver(date, site, 'section', false);
    const dutyNMinus1 = ctaResolver(qvShiftDateKey(date, -7), site, 'section', false);
    return { pass: Boolean(dutyN && dutyNMinus1 && dutyN !== section && dutyNMinus1 !== section),
      date, section, dutyN, dutyNMinus1 };
  }

  // Conserve les occurrences et leurs publics, puis recherche le premier tour hors astreinte.
  function qvSchedulePionnierOffDuty(rows, options) {
    const firstDated = (rows || []).find((row) => row && qvIsPionnierRow(row) && row.startsAt);
    const year = Number((options && options.year) || String((firstDated && firstDated.startsAt) || '').slice(0, 4));
    const ctaResolver = (options && options.ctaResolver)
      || (qvCtaRulesModule && qvCtaRulesModule.instructionPublicForDate);
    const source = rows || [];
    const pionnier = source.filter((row) => row && !row.external && qvIsPionnierRow(row)
      && qvDpsInstructionKind(row) && qvDpsSitesOf(row)[0] === 'G1' && row.startsAt);
    const halves = pionnier.filter((row) => qvDpsInstructionKind(row) === 'demi-section')
      .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
    const sections = pionnier.filter((row) => qvDpsInstructionKind(row) === 'section')
      .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
    const occupied = source.filter((row) => row && !row.external && row.startsAt && row.endsAt
      && qvDpsInstructionKind(row) && !qvIsPionnierRow(row)
      && qvDpsSitesOf(row).includes('G1'));
    const patches = new Map();
    const report = [];
    const lastVaria = occupied.filter((row) => qvDpsInstructionKind(row) && qvInstructionTheme(row) === 'VARIA')
      .map((row) => String(row.startsAt).slice(0, 10)).sort().pop() || '';
    let previousHalf = '';
    let previousSection = '';
    for (const row of halves.concat(sections)) {
      const kind = qvDpsInstructionKind(row);
      const initial = String(row.startsAt).slice(0, 10);
      const publicCode = (row.publics || []).find((code) => /^N0[1-5][ab]?$/.test(code)) || '';
      const section = publicCode.slice(0, 3);
      const ownHalves = halves.filter((item) => (item.publics || []).some((code) => code.slice(0, 3) === section));
      const lastOwnHalf = ownHalves.map((item) => String((patches.get(String(item.id)) || item).startsAt).slice(0, 10)).sort().pop() || '';
      const protectedRow = qvRotationProtected(row);
      let chosen = null;
      for (let date = initial; date <= `${year}-12-23`; date = qvShiftDateKey(date, 7)) {
        if (date.slice(0, 4) !== String(year) || date < `${year}-09-01` || date <= lastVaria) continue;
        if (kind === 'demi-section' && previousHalf && date <= previousHalf) continue;
        if (kind === 'section' && (date <= lastOwnHalf || (previousSection && date <= previousSection))) continue;
        if (protectedRow && date !== initial) break;
        const startsAt = `${date}${String(row.startsAt).slice(10, 16)}`;
        const endsAt = `${date}${String(row.endsAt).slice(10, 16)}`;
        if (occupied.some((item) => item.id !== row.id && String(item.startsAt) < endsAt
          && String(item.endsAt) > startsAt)) continue;
        const candidate = { ...row, startsAt, endsAt };
        const cta = qvPionnierCtaCheck(candidate, ctaResolver);
        if (!cta.pass) continue;
        chosen = { ...candidate, pionnierCta: { ...cta, originalDate: initial },
          sectionPublicRule: 'CTA_OFF_DUTY_N_AND_N_MINUS_1', sectionPublicStatus: 'DEMONSTRATED',
          sectionPublicDerived: publicCode };
        break;
      }
      if (!chosen) {
        report.push({ id: row.id, status: 'MOA_REQUIRED', reason: protectedRow ? 'DECISION_HUMAINE_INCOMPATIBLE' : 'AUCUN_CRENEAU_COMPATIBLE' });
        patches.set(String(row.id), { ...row, pionnierCtaStatus: 'MOA_REQUIRED' });
        continue;
      }
      patches.set(String(row.id), chosen);
      occupied.push(chosen);
      if (kind === 'demi-section') previousHalf = chosen.startsAt.slice(0, 10);
      else previousSection = chosen.startsAt.slice(0, 10);
      report.push({ id: row.id, from: initial, to: chosen.startsAt.slice(0, 10), publicCode,
        dutyN: chosen.pionnierCta.dutyN, dutyNMinus1: chosen.pionnierCta.dutyNMinus1, status: 'PASS' });
    }
    return { rows: source.map((row) => patches.get(String(row && row.id)) || row), report };
  }

  function qvAnnualDpsInstructionVersion(year, versions) {
    return (versions || []).filter((rule) => Number(rule.effectiveFromYear) <= Number(year))
      .sort((a, b) => Number(b.effectiveFromYear) - Number(a.effectiveFromYear))[0] || null;
  }

  function qvProjectAnnualWeekday(date, year) {
    const source = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) return '';
    const wanted = new Date(`${source}T12:00:00Z`).getUTCDay();
    const base = `${year}${source.slice(4)}`;
    return [-3, -2, -1, 0, 1, 2, 3].map((days) => qvShiftDateKey(base, days))
      .filter((candidate) => candidate.slice(0, 4) === String(year)
        && new Date(`${candidate}T12:00:00Z`).getUTCDay() === wanted)
      .sort((a, b) => Math.abs(qvIsoDayNumber(a) - qvIsoDayNumber(base))
        - Math.abs(qvIsoDayNumber(b) - qvIsoDayNumber(base)) || a.localeCompare(b))[0] || '';
  }

  function qvAnnualInstructionPublics(site, sections, kind, operationalHalvesForOi) {
    const active = new Set(sections || []);
    if (kind === 'section') return [...active];
    const available = typeof operationalHalvesForOi === 'function'
      ? operationalHalvesForOi(site) : [...active].flatMap((section) => [`${section}a`, `${section}b`]);
    return [...new Set(available.filter((code) => active.has(String(code).slice(0, 3))))];
  }

  // L'historique fixe le rythme et les profils horaires ; chaque thème d'instruction couvre
  // ses publics actifs, même lorsqu'une ligne historique manque.
  function qvBuildAnnualDpsInstructions(historicalRows, options) {
    const year = Number(options && options.year);
    const rule = qvAnnualDpsInstructionVersion(year, options && options.versions);
    const ctaResolver = options && options.ctaResolver;
    if (!rule || typeof ctaResolver !== 'function') return { rows: [], report: { year, status: 'MOA_REQUIRED', reason: 'REGLE_OU_CTA_ABSENT' } };
    const rows = [];
    const missing = [];
    const sectionsBySite = (options && options.sections) || rule.sections;
    const operationalHalvesForOi = options && options.operationalHalvesForOi;
    const keyOf = (item) => qvInstructionTheme(item).startsWith('PIONNIER') ? 'PIONNIER' : qvInstructionTheme(item);
    for (const site of QV_DPS_SITES) {
      const active = new Set(sectionsBySite[site] || []);
      const halves = qvAnnualInstructionPublics(site, [...active], 'demi-section', operationalHalvesForOi);
      for (const section of active) {
        if (!halves.includes(`${section}a`) || !halves.includes(`${section}b`)) {
          missing.push({ site, section, reason: 'STRUCTURE_HORS_CYCLE_CTA' });
        }
      }
      let lastThemeDate = '';
      for (const theme of rule.themeOrder[site] || []) {
        const themeRows = [];
        const historicalTheme = (historicalRows || []).filter((item) => item
          && String(item.date || '').startsWith('2026-')
          && (item.ois || []).includes(site) && qvDpsInstructionKind(item) && keyOf(item) === theme)
          .sort((a, b) => String(a.date).localeCompare(String(b.date)) || Number(a.sourceLine) - Number(b.sourceLine));
        const historicalAnchor = historicalTheme[0] && historicalTheme[0].date;
        const annualAnchor = historicalAnchor && (options && options.projection === 'SHIFT_52_WEEKS' && year === 2027
          ? qvShiftHistoricalDate(historicalAnchor) : qvProjectAnnualWeekday(historicalAnchor, year));
        const project = (date) => annualAnchor
          ? qvShiftDateKey(annualAnchor, qvIsoDayNumber(date) - qvIsoDayNumber(historicalAnchor)) : '';
        for (const kind of ['demi-section', 'section']) {
          const expectedPublics = qvAnnualInstructionPublics(site, [...active], kind, operationalHalvesForOi);
          const used = new Set();
          const candidates = historicalTheme.filter((item) => qvDpsInstructionKind(item) === kind);
          if (!candidates.length) {
            missing.push({ site, theme, kind, expected: expectedPublics.length, reason: 'AUCUN_PROFIL_HISTORIQUE' });
            continue;
          }
          let previousDate = '';
          for (let index = 0; index < expectedPublics.length; index += 1) {
            const synthetic = index >= candidates.length;
            const item = candidates[Math.min(index, candidates.length - 1)];
            let date = project(item.date);
            if (synthetic) date = qvShiftDateKey(date, 7 * (index - candidates.length + 1));
            let publicCode = '';
            while (date && date.slice(0, 4) === String(year) && date <= `${year}-12-23`) {
              const candidate = ctaResolver(date, site, kind, theme === 'PIONNIER');
              const ownHalves = kind === 'section' ? halves.filter((code) => code.slice(0, 3) === candidate) : [];
              const ownReady = kind !== 'section' || ownHalves.every((code) => themeRows.some((row) =>
                qvDpsInstructionKind(row) === 'demi-section' && row.publics.includes(code)
                && String(row.startsAt).slice(0, 10) < date));
              const start = `${date}T${String(item.start).slice(0, 5)}`;
              const end = `${date}T${String(item.end).slice(0, 5)}`;
              const free = !themeRows.some((row) => row.startsAt < end && row.endsAt > start);
              if (candidate && expectedPublics.includes(candidate) && !used.has(candidate)
                && (!previousDate || date > previousDate) && (!lastThemeDate || date > lastThemeDate)
                && ownReady && free) { publicCode = candidate; break; }
              date = qvShiftDateKey(date, 7);
            }
            if (!publicCode) {
              missing.push({ site, theme, kind, sourceLine: item.sourceLine,
                expected: expectedPublics.length, obtained: used.size, reason: 'AUCUN_CRENEAU_CTA_ACTIF' });
              continue;
            }
            previousDate = date;
            used.add(publicCode);
            const id = `QV${String(year).slice(2)}:HIST:${item.sourceLine}:${site}`
              + (synthetic ? `:COVERAGE:${kind}:${index + 1}` : '');
            themeRows.push({ id, definitionId: `QV26-INSTR:${site}:${theme}:${kind}`,
              occurrenceId: id, sessionId: `${id}:S1`, label: item.title, eventLabel: `${item.title} ${site}`,
              status: 'A_POSITIONNER', code: '', statCom: item.statCom || '',
              domain: item.subDomain === 'FOSPEC' ? 'FOSPEC' : 'DPS', family: 'Instruction',
              ois: [site], publics: [publicCode], startsAt: `${date}T${String(item.start).slice(0, 5)}`,
              endsAt: `${date}T${String(item.end).slice(0, 5)}`, location: `Caserne ${qvDpsDefaultLieuCode(site)}`,
              room: item.room || '', responsible: QV_DPS_INSTRUCTION_RESPONSABLE,
              responsableFonctionCode: QV_DPS_INSTRUCTION_RESPONSABLE, external: false,
              provenance: 'HISTORICAL_2026_ANNUAL_RULE', sourceLine2026: item.sourceLine,
              sectionPublicRule: 'CTA_PERMANENCE_CYCLE', sectionPublicStatus: 'DEMONSTRATED',
              sectionPublicOi: site, sectionPublicDerived: publicCode,
              coverageEvidence: { rule: 'QV-DPS-COVERAGE-001', synthetic, site, theme, kind, publicCode,
                sourceLine2026: item.sourceLine },
              historicalProposal: { source: 'HISTORICAL_2026', sourceLine: item.sourceLine,
                date2026: item.date, proposedDate: date, syntheticCoverage: synthetic } });
          }
        }
        lastThemeDate = themeRows.map((row) => String(row.startsAt).slice(0, 10)).sort().pop() || lastThemeDate;
        rows.push(...themeRows);
      }
    }
    return { rows, report: { year, effectiveFromYear: rule.effectiveFromYear,
      activeSections: Object.fromEntries(QV_DPS_SITES.map((site) => [site, sectionsBySite[site] || []])),
      instructions: rows.length, missing } };
  }

  function qvDpsInstructionCoverageControl(rows, options) {
    const year = Number(options && options.year);
    const rule = qvAnnualDpsInstructionVersion(year, options && options.versions);
    if (!rule) return { year, pass: false, reason: 'REGLE_ANNUELLE_ABSENTE', table: [] };
    const sectionsBySite = (options && options.sections) || rule.sections;
    const ctaResolver = options && options.ctaResolver;
    const operationalHalvesForOi = options && options.operationalHalvesForOi;
    const instructionRows = (rows || []).filter((row) => row && !row.external && qvDpsInstructionKind(row));
    const table = [];
    for (const site of QV_DPS_SITES) {
      let previousThemeEnd = '';
      for (const theme of rule.themeOrder[site] || []) {
        const group = instructionRows.filter((row) => qvDpsSitesOf(row)[0] === site
          && (qvInstructionTheme(row).startsWith('PIONNIER') ? 'PIONNIER' : qvInstructionTheme(row)) === theme);
        const expectedHalves = qvAnnualInstructionPublics(site, sectionsBySite[site] || [], 'demi-section', operationalHalvesForOi);
        const expectedSections = qvAnnualInstructionPublics(site, sectionsBySite[site] || [], 'section', operationalHalvesForOi);
        const actual = (kind) => group.filter((row) => qvDpsInstructionKind(row) === kind);
        const halfRows = actual('demi-section');
        const sectionRows = actual('section');
        const codes = (list) => list.map((row) => (row.publics || []).find((code) => /^N0[1-6][ab]?$/.test(code)) || '');
        const halfCodes = codes(halfRows);
        const sectionCodes = codes(sectionRows);
        const first = group.map((row) => String(row.startsAt || '')).filter(Boolean).sort()[0] || '';
        const last = group.map((row) => String(row.startsAt || '')).filter(Boolean).sort().pop() || '';
        const ownOrder = sectionRows.every((row) => expectedHalves.filter((code) => code.slice(0, 3) === codes([row])[0])
          .every((code) => halfRows.some((half) => halfCodes.includes(code) && (half.publics || []).includes(code)
            && String(half.startsAt) < String(row.startsAt))));
        const ctaPass = typeof ctaResolver !== 'function' || group.filter((row) => !qvIsPionnierRow(row))
          .every((row) => (row.publics || []).includes(ctaResolver(String(row.startsAt).slice(0, 10), site,
            qvDpsInstructionKind(row), false)));
        const complete = halfRows.length === expectedHalves.length && sectionRows.length === expectedSections.length
          && halfCodes.length === new Set(halfCodes).size && sectionCodes.length === new Set(sectionCodes).size
          && halfCodes.every((code) => expectedHalves.includes(code))
          && sectionCodes.every((code) => expectedSections.includes(code));
        const pass = complete && ownOrder && ctaPass && Boolean(first)
          && (!previousThemeEnd || previousThemeEnd < first);
        table.push({ site, theme, expectedHalf: expectedHalves.length, actualHalf: halfRows.length,
          expectedSection: expectedSections.length, actualSection: sectionRows.length,
          missingHalves: expectedHalves.filter((code) => !halfCodes.includes(code)),
          missingSections: expectedSections.filter((code) => !sectionCodes.includes(code)),
          ownOrder, ctaPass, themeOrder: !previousThemeEnd || previousThemeEnd < first, pass });
        previousThemeEnd = last;
      }
    }
    return { year, table, pass: table.every((item) => item.pass) };
  }

  function qvCompleteDpsInstructionCoverage(rows, historicalRows, options) {
    const year = Number(options && options.year);
    const ctaResolver = options && options.ctaResolver;
    const planned = qvBuildAnnualDpsInstructions(historicalRows, {
      ...(options || {}), year, projection: year === 2027 ? 'SHIFT_52_WEEKS' : undefined
    });
    const source = rows || [];
    const present = new Set(source.filter((row) => row && !row.external && qvDpsInstructionKind(row))
      .map((row) => {
        const site = qvDpsSitesOf(row)[0];
        const kind = qvDpsInstructionKind(row);
        const explicitPublic = (row.publics || []).find((code) => /^N0[1-6][ab]?$/.test(code));
        const publicCode = explicitPublic || (row.provenance === 'SOURCE_2027_EXPLICIT'
          && row.startsAt && typeof ctaResolver === 'function'
          ? ctaResolver(String(row.startsAt).slice(0, 10), site, kind, qvIsPionnierRow(row)) : '');
        return `${site}|${qvInstructionTheme(row).startsWith('PIONNIER') ? 'PIONNIER' : qvInstructionTheme(row)}`
          + `|${kind}|${publicCode || ''}`;
      }));
    const added = [];
    for (const plannedRow of planned.rows) {
      const site = qvDpsSitesOf(plannedRow)[0];
      const theme = qvInstructionTheme(plannedRow).startsWith('PIONNIER') ? 'PIONNIER' : qvInstructionTheme(plannedRow);
      const kind = qvDpsInstructionKind(plannedRow);
      const publicCode = (plannedRow.publics || [])[0];
      const key = `${site}|${theme}|${kind}|${publicCode}`;
      if (present.has(key)) continue;
      const template = source.find((row) => row && !row.external && qvDpsSitesOf(row)[0] === site
        && (qvInstructionTheme(row).startsWith('PIONNIER') ? 'PIONNIER' : qvInstructionTheme(row)) === theme
        && qvDpsInstructionKind(row) === kind);
      const id = `QV${String(year).slice(2)}:COVERAGE:${site}:${theme}:${kind}:${publicCode}`;
      const { historicalProposal, ...profile } = plannedRow;
      added.push({ ...profile, id, occurrenceId: id, sessionId: `${id}:S1`,
        definitionId: template ? template.definitionId : plannedRow.definitionId,
        provenance: 'MOA_RULE_INSTRUCTION_COVERAGE', coverageAdded: true });
      present.add(key);
    }
    const next = source.concat(added);
    return { rows: next, added, planned: planned.report,
      coverage: qvDpsInstructionCoverageControl(qvApplyDpsInstructionFamilyRules(next, ctaResolver).rows, options) };
  }

  const QV_PR_ABC_LABEL = 'Exercice PR-ABC';
  const QV_PR_ABC_DEFINITION = 'QV26-EXERCICE-PR-ABC-75229C6D';
  // Public PABC du référentiel métier. JSP n'est jamais public d'une activité PR-ABC.
  const QV_PR_ABC_PUBLICS = Object.freeze(['PR:3']);
  const QV_PR_ABC_RESPONSABLE = 'C PR';

  function qvCalendarQuarter(date) {
    const month = Number(String(date || '').slice(5, 7));
    if (month >= 1 && month <= 3) return 'T1';
    if (month >= 4 && month <= 6) return 'T2';
    if (month >= 7 && month <= 9) return 'T3';
    if (month >= 10 && month <= 12) return 'T4';
    return '';
  }

  function qvPrAbcHistoricalRefresh(historicalRows) {
    return (historicalRows || [])
      .filter((row) => /Exercice PR-ABC/i.test(String(row.title || row.label || '')))
      .map((row) => {
        const date2026 = String(row.date || '').slice(0, 10);
        const utc = /^\d{4}-\d{2}-\d{2}$/.test(date2026) ? new Date(`${date2026}T00:00:00Z`) : null;
        const weekday = utc ? ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][utc.getUTCDay()] : '';
        return {
          sourceLine: row.sourceLine,
          date2026,
          date2027: qvShiftHistoricalDate(date2026),
          start: String(row.start || '').slice(0, 5),
          end: String(row.end || '').slice(0, 5),
          weekday,
          quarter: qvCalendarQuarter(date2026),
          location: row.location || '',
          statCom: row.statCom || '0164F7',
          ois: [...(row.ois || [])],
          personnel: row.personnel || ''
        };
      });
  }

  // QV-PRABC-003 — Correctif MOA : l'exercice PR-ABC compte exactement 3 séances sur l'année.
  // 2026 le démontre : 21.04 soir (T2), 10.06 mercredi matin (T2), 06.10 soir (T4).
  // L'ancienne structure 3 T1 + 3 T4 (6 lignes) dédoublait chaque séance et est abandonnée.
  function qvPrAbcSessionPlan(historical) {
    return (historical || [])
      .slice()
      .sort((a, b) => String(a.date2026).localeCompare(String(b.date2026)))
      .map((item, index) => ({
        ...item,
        occurrence: index + 1,
        morning: Boolean(item.start) && Number(item.start.slice(0, 2)) < 12
      }));
  }

  function qvApplyPrAbcStructure(rows, historicalRows) {
    const historical = qvPrAbcHistoricalRefresh(historicalRows);
    const plan = qvPrAbcSessionPlan(historical);
    const datingStatus = plan.length ? 'HISTORICAL_2026_DATES' : 'AUCUNE_SOURCE_HISTORIQUE';
    const existing = (rows || []).filter((row) => row && !row.external && String(row.label || row.title || '') === QV_PR_ABC_LABEL);
    const template = existing[0];
    if (!template || !plan.length) {
      return { rows: rows || [], report: { expected: plan.length, existing: existing.length, added: 0, surplus: 0, datingStatus, historical, reason: template ? 'AUCUNE_SOURCE_HISTORIQUE' : 'AUCUNE_OCCURRENCE_SOURCE' } };
    }
    const applySlot = (slot, row, cloned) => {
      const occurrenceId = `${QV_PR_ABC_DEFINITION}:O${slot.occurrence}`;
      const id = cloned ? `${occurrenceId}:S1` : row.id;
      return {
        ...row,
        id,
        definitionId: QV_PR_ABC_DEFINITION,
        occurrenceId,
        sessionId: `${occurrenceId}:S1`,
        label: QV_PR_ABC_LABEL,
        eventLabel: `${QV_PR_ABC_LABEL} ${slot.quarter} — ${slot.weekday} ${slot.morning ? 'matin' : 'soir'}`,
        sessionIndex: 1,
        sessionCount: 1,
        domain: row.domain || 'PR',
        family: row.family || 'Exercice',
        statCom: row.statCom || slot.statCom || '0164F7',
        ois: !cloned && qvRotationProtected(row) ? row.ois : [...slot.ois],
        publics: [...QV_PR_ABC_PUBLICS],
        responsible: QV_PR_ABC_RESPONSABLE,
        responsableFonctionCode: QV_PR_ABC_RESPONSABLE,
        location: slot.location || row.location || '',
        startsAt: slot.date2027 && slot.start ? `${slot.date2027}T${slot.start}` : row.startsAt,
        endsAt: slot.date2027 && slot.end ? `${slot.date2027}T${slot.end}` : row.endsAt,
        provenance: 'MOA_RULE_PR_ABC_3_SEANCES',
        prAbcRule: 'QV-PRABC-003',
        prAbcStatus: datingStatus,
        prAbcProposal: {
          rule: 'MOA_PR_ABC_3_SEANCES',
          quarter: slot.quarter,
          weekday: slot.weekday,
          morning: slot.morning,
          sessionIndex: 1,
          sessionCount: 1,
          proposedStart: slot.start,
          proposedEnd: slot.end,
          datingStatus,
          date2026: slot.date2026,
          date2027: slot.date2027,
          historical2026: historical
        },
        reason: `Séance ${slot.occurrence}/3 — ${slot.quarter}, ${slot.weekday} ${slot.morning ? 'matin' : 'soir'}, réalisation 2026 du ${slot.date2026}. Public PABC, responsable Chef PR.`,
        review: false
      };
    };
    const ordered = existing.slice().sort((a, b) => qvOccurrenceRank(a) - qvOccurrenceRank(b));
    const patches = new Map();
    const additions = [];
    let surplus = 0;
    plan.forEach((slot, index) => {
      const row = ordered[index];
      if (row) {
        patches.set(String(row.id), applySlot(slot, row, false));
        return;
      }
      const cloned = applySlot(slot, template, true);
      if (additions.some((item) => item.id === cloned.id) || (rows || []).some((item) => item && item.id === cloned.id)) return;
      additions.push(cloned);
    });
    // Les occurrences au-delà des 3 séances démontrées ne sont pas supprimées : elles sont signalées à la MOA.
    ordered.slice(plan.length).forEach((row) => {
      surplus += 1;
      patches.set(String(row.id), { ...row, prAbcRule: 'QV-PRABC-003', prAbcStatus: 'SEANCE_2026_NON_DEMONTREE' });
    });
    const next = (rows || []).map((row) => patches.get(String(row && row.id)) || row).concat(additions);
    return {
      rows: next,
      report: {
        expected: plan.length,
        existing: existing.length,
        added: additions.length,
        surplus,
        datingStatus,
        historical,
        quarters: plan.map((slot) => slot.quarter),
        dates2027: plan.map((slot) => slot.date2027)
      }
    };
  }

  function qvSalleTree(rooms) {
    const active = (rooms || []).filter((room) => room && room.actif !== false);
    const byId = new Map(active.map((room) => [String(room.salleId), room]));
    const byCode = new Map(active.map((room) => [String(room.code || ''), room]));
    const parentOf = (room) => {
      const direct = room.parentSalleId && byId.get(String(room.parentSalleId));
      return direct || (room.parentCode && byCode.get(String(room.parentCode))) || null;
    };
    const label = (room) => String((room && room.libelle) || '');
    const sorted = (list) => list.slice().sort((a, b) => label(a).localeCompare(label(b), 'fr', { sensitivity: 'base' }));
    const tree = [];
    for (const room of sorted(active.filter((room) => !parentOf(room)))) {
      tree.push({ room, depth: 0, parent: null });
      for (const child of sorted(active.filter((item) => parentOf(item) === room))) {
        tree.push({ room: child, depth: 1, parent: room });
      }
    }
    for (const room of sorted(active.filter((room) => parentOf(room) && !byId.has(String(parentOf(room).salleId))))) {
      if (!tree.some((node) => node.room === room)) tree.push({ room, depth: 0, parent: null });
    }
    return tree;
  }

  // Repli CTA : n'intervient que si l'analyse historique n'a pas déjà démontré ou qualifié le public.
  function qvApplyCtaSectionPublic(row, ctaResolver) {
    if (typeof ctaResolver !== 'function') return row;
    if (row.sectionPublicStatus === 'DEMONSTRATED' || row.sectionPublicRule === 'SHARED_HISTORICAL_REFERENCE') return row;
    if ((row.publics || []).some((code) => /^N0[1-6][ab]?$/.test(code))) return row;
    const kind = qvDpsInstructionKind(row);
    if (!kind || !row.startsAt) return row;
    const sites = qvDpsSitesOf(row);
    if (sites.length !== 1) {
      return { ...row, sectionPublicStatus: 'MOA_REQUIRED', sectionPublicRule: 'CTA_MULTI_OI_NON_REPARTI' };
    }
    if (row.provenance !== 'SOURCE_2027_EXPLICIT') {
      return { ...row, sectionPublicStatus: 'MOA_REQUIRED', sectionPublicRule: 'CTA_DATE_NON_DEMONTREE' };
    }
    const derived = ctaResolver(String(row.startsAt).slice(0, 10), sites[0], kind, qvIsPionnierRow(row));
    if (!derived) return row;
    return { ...row, publics: [...new Set((row.publics || []).concat([derived]))],
      sectionPublicStatus: 'DEMONSTRATED', sectionPublicRule: 'CTA_PERMANENCE_CYCLE',
      sectionPublicOi: sites[0], sectionPublicDerived: derived };
  }

  function qvEnrichSectionPublic(row, references, programmeRows = [], ctaResolver = null) {
    return qvApplyCtaSectionPublic(qvEnrichSectionPublicHistorical(row, references, programmeRows), ctaResolver);
  }

  function qvIsDpsInstructionFamily(row) {
    return Boolean(qvDpsInstructionKind(row));
  }

  function qvApplyDpsInstructionFamilyRules(rows, ctaResolver) {
    const changes = [];
    const next = (rows || []).map((row) => {
      if (!row || row.external) return row;
      let current = row;
      if (qvIsDpsInstructionFamily(current) && !qvRotationProtected(current)) {
        const displayed = qvResponsableCanonique(current.responsible, { domain: current.domain });
        if (displayed !== QV_DPS_INSTRUCTION_RESPONSABLE || String(current.responsible || '').trim() !== QV_DPS_INSTRUCTION_RESPONSABLE) {
          changes.push({ id: current.id, from: current.responsible || '', to: QV_DPS_INSTRUCTION_RESPONSABLE, rule: 'QV-DPS-003' });
          current = {
            ...current,
            responsible: QV_DPS_INSTRUCTION_RESPONSABLE,
            responsableFonctionCode: QV_DPS_INSTRUCTION_RESPONSABLE,
            instructionFamilyRule: 'QV-DPS-003'
          };
        }
      }
      return typeof ctaResolver === 'function' ? qvApplyCtaSectionPublic(current, ctaResolver) : current;
    });
    return { rows: next, changes };
  }

  function qvEnrichSectionPublicHistorical(row, references, programmeRows = []) {
    if (row.domain !== 'DPS' || !/instr(?:uction)?\s+(?:demi[-\s]*)?(?:sct|section)/i.test(row.label || row.title || '')) return row;
    // La rotation a déjà posé le public CTA : l'Excel ne doit pas le remplacer, surtout pas par un personnel
    // multi-OI ou « Perm B2 » qui fusionnerait visuellement des réalisations distinctes.
    if (row.sectionPublicRule === 'CTA_PERMANENCE_CYCLE' || row.rotationStatus === 'DISTRIBUTED') return row;
    const sourceLine = row.historicalProposal && row.historicalProposal.sourceLine;
    const reference = (references || []).find(item => item.sourceLine === sourceLine);
    const demonstrated = reference && reference.domain === 'DPS' && (row.ois || []).some(oi => reference.ois.includes(oi))
      ? qvSectionCodes(reference.personnel) : qvSectionCodes(row.label);
    const existing = (row.publics || []).filter(code => /^N0[1-6][ab]?$/.test(code));
    const shared = sourceLine && programmeRows.filter(item => item.historicalProposal && item.historicalProposal.sourceLine === sourceLine).length > 1;
    if (shared && !existing.length) return { ...row, sectionPublicStatus: 'AMBIGUOUS', sectionPublicRule: 'SHARED_HISTORICAL_REFERENCE' };
    if (shared && existing.length) return { ...row, sectionPublicStatus: 'EXISTING' };
    if (!demonstrated.length) return { ...row, sectionPublicStatus: existing.length ? 'EXISTING' : 'AMBIGUOUS' };
    return { ...row, publics: [...new Set((row.publics || []).filter(code => !/^N0[1-6][ab]?$/.test(code)).concat(demonstrated))],
      sectionPublicStatus: 'DEMONSTRATED', sectionPublicRule: 'EXCEL_PERSONNEL_SECTION_EXPLICIT', sectionPublicSourceLine: reference && reference.sourceLine };
  }

  function qvHistoricalAgenda(events, references) {
    const visible = (events || []).filter(row => !row.hidden_at && String(row.date || '').slice(0, 4) === '2026');
    const matched = new Map();
    const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    for (const reference of references || []) {
      const candidates = visible.filter(event => String(event.date).slice(0, 10) === reference.date &&
        ((reference.code && [event.code_cours, event.code_source].includes(reference.code)) ||
          (normalized(event.libelle) === normalized(reference.title) && String(event.heure_debut || event.heure_debut_prevue || '').slice(0, 5) === reference.start &&
            (!reference.statCom || event.statcom_code === reference.statCom))));
      if (candidates.length === 1) matched.set(reference.sourceLine, candidates[0].evenement_id);
    }
    return {
      events: visible.map(event => ({ id: event.evenement_id, eventId: event.evenement_id, date: String(event.date).slice(0, 10),
        startsAt: `${String(event.date).slice(0, 10)}T${String(event.heure_debut || event.heure_debut_prevue || '00:00').slice(0, 5)}`,
        label: event.libelle, start: String(event.heure_debut || event.heure_debut_prevue || '').slice(0, 5), end: String(event.heure_fin || event.heure_fin_prevue || '').slice(0, 5),
        status: event.statut, kind: 'SCOPE_EVENT', referenceLines: [...matched].filter(([, id]) => id === event.evenement_id).map(([line]) => line) })),
      references: (references || []).filter(row => !matched.has(row.sourceLine)).map(row => ({ ...row, kind: 'EXCEL_REFERENCE' })),
      counts: { events: visible.length, matchedReferences: matched.size, unmatchedReferences: (references || []).length - matched.size }
    };
  }

  function qvFormatEchelons(labels) {
    const rank = { I: 1, II: 2, III: 3, IV: 4 };
    const numeral = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
    const ranks = [...new Set((labels || []).map((label) => {
      const match = String(label || '').match(/^Échelon\s+(IV|I{1,3})$/);
      return match ? rank[match[1]] : 0;
    }).filter(Boolean))].sort((a, b) => a - b);
    if (!ranks.length) return '';
    const runs = [];
    let start = ranks[0];
    let previous = ranks[0];
    for (let index = 1; index <= ranks.length; index += 1) {
      const current = ranks[index];
      if (current === previous + 1) {
        previous = current;
        continue;
      }
      runs.push([start, previous]);
      start = current;
      previous = current;
    }
    const phrase = (run) => {
      const [from, to] = run;
      if (from === to) return numeral[from];
      if (runs.length === 1 && to === from + 1) return `${numeral[from]} et ${numeral[to]}`;
      return `${numeral[from]} à ${numeral[to]}`;
    };
    return `Échelon ${runs.map(phrase).join(' et ')}`;
  }

  function qvFormatPublicLabels(codes) {
    const labels = [...new Set((codes || []).map((code) => qvProgrammePublicLabel(code)).filter((label) => label && label !== 'À définir'))];
    const contraction = qvFormatEchelons(labels.filter((label) => /^Échelon\s+/.test(label)));
    let placed = false;
    const rendered = [];
    labels.forEach((label) => {
      if (/^Échelon\s+/.test(label)) {
        if (!placed && contraction) rendered.push(contraction);
        placed = true;
        return;
      }
      rendered.push(label);
    });
    return rendered.join(', ');
  }

  return {
    MOTIFS,
    MOTIFS_JSP,
    MOTIFS_DISPENSE,
    motifsForRow,
    motifsDispenseForRow,
    isDispenseMotif,
    motifShortLabel,
    informationMotifLabel,
    permutationStatusLabel,
    permutationSourceLabel,
    permutationCatchupMotif,
    permutationCatchupSourceLabel,
    permutationRattrapageSectionLabel,
    permutationSourceInformationLabel,
    isPermutationCatchup,
    sessionExplainTooltip,
    placeSessionTooltip,
    STATUT_LABELS,
    ROLE_LABELS,
    ENCADREMENT_ROLE_ORDER,
    ROLES_ENCADREMENT,
    getEncadrementContribution,
    domaineAffiche,
    niveauAffiche,
    cibleMetierLabel,
    formatDurationMinutes,
    formatClockLabel,
    formatDurationHoursMinutes,
    isEffectiveParticipationStatut,
    domainTaxonomyGroups,
    sharedOiOptions,
    sharedSpecOptions,
    normalizeOiCode,
    hasDuplicateOiValues,
    eventCiblesForForm,
    eventLieuDisplayLabel,
    sortEventLieux,
    statutLabel,
    formatPrSessionList,
    formatFormateurPrTooltip,
    formatDate,
    formatTaux,
    formatGap,
    analyticStatusLabel,
    CHART_COLORS,
    participationChartLayout,
    participationChartSvg,
    sousDomaineNavLabel,
    navParentCode,
    normalizeNavArbre,
    EVENT_DOMAIN_GROUPS,
    eventDomainFilterItems,
    eventListDomainParam,
    OBJECTIF_PORTEE_LABELS,
    OBJECTIF_UX_DOMAINES,
    OBJECTIF_UX_CIBLES,
    OBJECTIF_FUTURE_LEVEL,
    toIsoDate,
    formatUiDate,
    qvDateKey,
    qvShiftDateKey,
    qvCalendarKind,
    qvCalendarEndDate,
    qvCalendarMarkVisible,
    qvExpandCalendarDays,
    qvCalendarMarksForDate,
    qvVacationPeriods,
    qvHolidayEntries,
    qvCalendarConstraints,
    qvAgendaDayAnchorId,
    qvIsoWeek,
    SCOPE_SITE_ORDER,
    SCOPE_DOMAIN_ORDER,
    SCOPE_DOMAIN_LABELS,
    extractSiteCode,
    scopeSiteRank,
    compareScopeSites,
    sortByScopeSiteOrder,
    qvActivitySiteCode,
    qvActivityDomainCode,
    normalizeScopeDomainCode,
    scopeDomainRank,
    compareScopeDomains,
    sortByScopeDomainOrder,
    scopeDomainLabel,
    scopeDomainOrderTrail,
    compareQvActivities,
    qvStripSessionSuffix,
    qvHumanActivityTitle,
    qvCodeCoursValue,
    qvCollectOiCodes,
    qvSortOiCodes,
    qvSiteGroupRank,
    compareQvBusinessOrder,
    qvProgrammeOrderKey,
    compareQvProgrammeRows,
    QV_DPS_SITES,
    QV_CONDUITE_LABEL,
    QV_CONDUITE_STATCOM,
    QV_CONDUITE_THEMES,
    qvIsJspActivity,
    qvDpsInstructionKind,
    qvIsPionnierRow,
    QV_HISTORICAL_SHIFT_DAYS,
    qvShiftHistoricalDate,
    qvRotationBuckets,
    qvDistributeRotationOccurrences,
    qvHistoricalOccurrenceBuckets,
    qvMaterializeHistoricalOccurrences,
    qvInstructionSeasonBounds,
    qvFirstSaturdayOfFebruary,
    qvApplyPeriodicActivityRules,
    qvPeriodicActivityDecision,
    qvApplyDapConduite,
    qvDapConduiteBuckets,
    qvApplyDapAnnualExercisePlan,
    qvApplyFobaOccurrenceThemes,
    qvApplyPrSeriesContinuity,
    qvRewriteDpsSiteToken,
    qvDpsSitesOf,
    qvDpsDefaultLieuCode,
    qvInstructionTheme,
    qvProgrammeVisibleThemes,
    qvConduiteSources,
    qvEnsureAnnualConduiteInstructionSources,
    qvDeriveConduiteContinue,
    qvApplyConduiteContinue,
    qvConduiteCoherenceControl,
    qvSelectSpreadIndices,
    qvConduitePublics,
    qvApplyDpsInstructionFamilyRules,
    QV_DPS_INSTRUCTION_RESPONSABLE,
    QV_CONDUITE_PER_HALF,
    QV_PIONNIER_RULES,
    qvApplyPionnierRules,
    qvPionnierCtaCheck,
    qvSchedulePionnierOffDuty,
    qvAnnualDpsInstructionVersion,
    qvProjectAnnualWeekday,
    qvBuildAnnualDpsInstructions,
    qvDpsInstructionCoverageControl,
    qvCompleteDpsInstructionCoverage,
    qvApplyPrAbcStructure,
    qvPrAbcHistoricalRefresh,
    QV_PR_ABC_LABEL,
    qvSalleTree,
    qvProgrammeDragLock,
    qvProgrammeIsPermanence,
    qvProgrammeDragReason,
    qvPublicCibleLabel,
    qvIsStructuredMultiSession,
    qvIsMultiSessionRow,
    qvArbitrerKindSubtitle,
    qvPrincipalActivityKey,
    compareQvProposals,
    qvArbitragePeriodLabel,
    qvNeedsArbitrationRow,
    qvBuildArbitrageGroups,
    qvGroupArbitrageByDomain,
    qvInitialOpenDomain,
    qvArbitrageKpis,
    qvArbitrageState,
    qvUniqueTexts,
    qvArbitrerSortColumns,
    extractCalendarYear,
    yearToObjectifPeriod,
    periodFromStart,
    nextObjectifPeriod,
    objectifOverlapsYear,
    objectifLifecycleStatus,
    objectifLifecycleLabel,
    objectifIsFuture,
    objectifHistoryProtected,
    historiqueProtegeMessage,
    objectifPeriodLabel,
    objectifUxFromRow,
    objectifFormToEngine,
    objectifPreviewQuery,
    objectifCibleOptions,
    objectifHint,
    filterObjectifs,
    sortObjectifsDefault,
    sortObjectifs,
    objectifDomainOptions,
    buildSidebarNav,
    currentYear,
    periodParams,
    alertLevelLabel,
    objectiveKpiLabel,
    participationStatutLabel,
    parseHash,
    previewPersonId,
    createPreviewSelectionRows,
    setAllPreviewSelected,
    setPreviewRowSelected,
    selectedPreviewPersonIds,
    previewSelectionCount,
    formatPreviewSelectionCountLabel,
    parsePreviewSelectedCountText,
    addManualPreviewSelectionRow,
    buildAssignmentSelectedPersonIds,
    isCancelledEvenement,
    isHiddenEvenement,
    cancelledEventHref,
    isParticipationCountable,
    principalCta,
    modeSuiviOf,
    modeLabel,
    volumesEquality,
    liveCounters,
    sessionPresenceKpis,
    coveredInGlobalBilan,
    countsInSaisieTaux,
    participationStatusesForDomaine,
    preserveParticipationRole,
    statusLockedForRole,
    applyParticipationStatus,
    applyExcuseMotif,
    applyDispenseMotif,
    buildPresenceSavePayload,
    excuseBreakdown,
    clotureDisabled,
    needsConfirmAllPresent,
    applyAllPresent,
    applyAllPresentFiltered,
    hasIncompleteExcuse,
    hasIncompleteDispense,
    isValidSessionStatut,
    sessionLocked,
    isOpenSaisieRow,
    isIncompleteClosureRow,
    listIncompleteClosureRows,
    listSessionClosureBlockingRows,
    formatIncompletePersonLabel,
    motifsSaisieForDomaine,
    closureBlockers,
    resetSaisie,
    needsConfirmReset,
    saisieAttendusFromFiche,
    personnelMutationError,
    friendlyError,
    ciblesLabel,
    sortCiblesForEventForm,
    displayTauxForList,
    legacyTauxFromRow,
    emptyMessage,
    loadingMessage,
    errorMessage,
    listViewState,
    SORT_STATUS_ORDER,
    cleanSortText,
    parseSortDate,
    parseSortTime,
    compareSortValues,
    sortRows,
    statComCellValue,
    statComBusinessSpecialization,
    buildStatComSavePayload,
    statComSortColumns,
    visibleStatComRows,
    statComSortLabel,
    nextSort,
    CYCLE_CONSOLIDATED_STATES,
    cycleConsolidatedState,
    filterCyclePilotageRows,
    cyclePilotageSummary,
    cycleObligationSummaries,
    ANNUAL_STATUS_LABELS,
    ANNUAL_ENUM_LABELS,
    annualStatusLabel,
    annualEnumLabel,
    annualMonthLabel,
    annualPeriodLabel,
    annualThemeSummary,
    annualCountLabel,
    annualSummary,
    annualReadyAction,
    annualSectionHasData,
    annualDraftDateValue,
    splitActivityThemeLabel,
    formatActivityThemeLabel,
    sortHeaderState,
    isQualificationEvenement,
    isTestPersonnelNip,
    shouldRenderPermutations,
    resolveClientMode,
    importPreviewFilterCount,
    buildImportPreviewFilters,
    defaultImportPreviewFilter,
    oktaLoginHref,
    cleanAuthenticatedScopeUrl,
    hasUnsavedPresenceChanges,
    canStartPresenceSave,
    nextEventVersionAfterSave,
    isLeavingSaisieRoute,
    shouldWarnBeforeUnload,
    planSaisieLeave,
    orchestrateClosePresence,
    orchestrateLeaveSaisie,
    PRESENCE_SAVE_FAILED_CLOSE_MESSAGE,
    qvResponsableGroups,
    qvResponsableCanonique,
    qvProgrammePublicCatalogue,
    qvProgrammeFilterFamily,
    qvProgrammeFilterType,
    qvProgrammeFunctionalDomain,
    qvProgrammeOiMatches,
    qvProgrammeHasMultipleSessions,
    qvProgrammeOiCatalogue,
    qvProgrammeFamily,
    qvProgrammeDomainMatches,
    qvNormalizeOiSelections,
    qvOiSites,
    qvFormatOiSelections,
    qvProgrammeConfirmedOiCodes,
    qvProgrammeOiLabel,
    qvEnrichBusinessReference,
    qvSectionCodes,
    qvEnrichSectionPublic,
    qvHistoricalAgenda,
    qvProgrammePublicLabel,
    qvFormatEchelons,
    qvFormatPublicLabels
  };
});
