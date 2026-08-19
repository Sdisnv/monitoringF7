/* SCOPE-IMPL-1B — helpers UI P0, sans calcul du taux officiel. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeUiLogic = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MOTIFS = [
    { value: 'MALADIE', label: 'Maladie' },
    { value: 'ACCIDENT', label: 'Accident' },
    { value: 'ARMEE', label: 'Armée' },
    { value: 'PROFESSIONNEL', label: 'Professionnel' },
    { value: 'PRIVE', label: 'Privé' },
    { value: 'AUTRE', label: 'Autre' }
  ];

  const STATUT_LABELS = {
    PLANIFIE: 'Planifié',
    REALISE: 'Réalisé',
    REPORTE: 'Reporté',
    ANNULE: 'Annulé',
    LEGACY_AGGREGATED: 'Historique agrégé'
  };

  const ROLE_LABELS = {
    PARTICIPANT: 'Participant',
    FORMATEUR: 'Formateur',
    SURVEILLANT: 'Surveillant',
    AUXILIAIRE: 'Auxiliaire',
    RENFORT: 'Renfort',
    REMPLACANT: 'Remplaçant'
  };

  function domaineAffiche(code) {
    return code === 'PR' ? 'PAPR' : String(code || '');
  }

  function statutLabel(code) {
    return STATUT_LABELS[code] || code || '';
  }

  function formatDate(iso) {
    const text = String(iso || '').slice(0, 10);
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return text || '—';
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function formatTaux(percentage) {
    if (percentage === null || percentage === undefined || percentage === '') return '—';
    const n = Number(percentage);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(1).replace('.', ',')} %`;
  }

  function currentYear(now) {
    const d = now ? new Date(now) : new Date();
    return String(d.getFullYear());
  }

  function parseHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    const path = raw.split('?')[0];
    const parts = path.split('/').filter(Boolean);
    if (!parts.length || parts[0] === 'exercices') {
      if (parts[1] === 'nouveau') return { screen: 'nouveau', nav: 'exercices' };
      if (parts[1] && parts[2] === 'saisie') return { screen: 'saisie', nav: 'exercices', id: parts[1] };
      if (parts[1]) return { screen: 'fiche', nav: 'exercices', id: parts[1] };
      return { screen: 'liste', nav: 'exercices' };
    }
    if (parts[0] === 'vue') return { screen: 'vue', nav: 'vue' };
    if (parts[0] === 'personnel') return { screen: 'personnel', nav: 'personnel' };
    return { screen: 'liste', nav: 'exercices' };
  }

  function principalCta({ statut, populationFigee, previewReady }) {
    if (statut && statut !== 'PLANIFIE') return null;
    if (populationFigee) return { action: 'saisir', label: 'Saisir les participations' };
    if (previewReady) return { action: 'figer', label: 'Figer la population' };
    return { action: 'generer', label: 'Générer les attendus' };
  }

  function liveCounters(rows) {
    let present = 0;
    let excuse = 0;
    let absent = 0;
    let dispense = 0;
    let open = 0;
    for (const row of rows || []) {
      if (row.inclus === false) continue;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role) && row.inclus !== true) continue;
      const s = row.statut;
      if (s === 'PRESENT') present += 1;
      else if (s === 'ABSENT_EXCUSE') excuse += 1;
      else if (s === 'ABSENT_NON_EXCUSE') absent += 1;
      else if (s === 'DISPENSE') dispense += 1;
      else if (s === 'NON_RENSEIGNE' || !s) open += 1;
    }
    return { present, excuse, absent, dispense, open };
  }

  function clotureDisabled(counters) {
    return Number(counters && counters.open) > 0;
  }

  function needsConfirmAllPresent(rows) {
    return (rows || []).some((row) => {
      if (row.inclus === false) return false;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role)) return false;
      return row.statut && row.statut !== 'NON_RENSEIGNE' && row.statut !== 'PRESENT';
    });
  }

  function applyAllPresent(rows) {
    return (rows || []).map((row) => {
      if (row.inclus === false) return row;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '' });
    });
  }

  function applyAllPresentFiltered(rows, cibleCode) {
    return (rows || []).map((row) => {
      if (cibleCode && row.cible !== cibleCode && !(row.cibles || []).includes(cibleCode)) return row;
      if (row.inclus === false) return row;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '' });
    });
  }

  function friendlyError(error) {
    const status = Number(error && error.status);
    const code = error && (error.error || error.code);
    if (status === 0 || code === 'network') {
      return { tone: 'error', title: 'Connexion interrompue', message: 'Le serveur n’est pas joignable. Vérifiez le réseau puis réessayez.' };
    }
    if (status === 401) {
      return { tone: 'error', title: 'Session expirée', message: 'Reconnectez-vous pour continuer.' };
    }
    if (status === 403) {
      return { tone: 'error', title: 'Action non autorisée', message: 'Votre profil ne permet pas cette modification.' };
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
    return { tone: 'error', title: 'Impossible de continuer', message: (error && error.message) || 'Une erreur est survenue.' };
  }

  function ciblesLabel(cibles) {
    if (!cibles || !cibles.length) return '—';
    return cibles.map((c) => c.niveau_code || c.niveauCode || c.libelle || c).join(' · ');
  }

  function displayTauxForList(statut, officiel, percentage) {
    if (statut !== 'REALISE') return '—';
    if (officiel === false) return '—';
    return formatTaux(percentage);
  }

  function emptyMessage(kind) {
    const map = {
      exercices: 'Aucun exercice sur la période choisie.',
      attendus: 'Aucun attendu généré pour cet exercice.',
      resultats: 'Aucun résultat nominatif pour cet exercice.',
      personnes: 'Aucune personne ne correspond à cette recherche.'
    };
    return map[kind] || 'Aucun élément.';
  }

  return {
    MOTIFS,
    STATUT_LABELS,
    ROLE_LABELS,
    domaineAffiche,
    statutLabel,
    formatDate,
    formatTaux,
    currentYear,
    parseHash,
    principalCta,
    liveCounters,
    clotureDisabled,
    needsConfirmAllPresent,
    applyAllPresent,
    applyAllPresentFiltered,
    friendlyError,
    ciblesLabel,
    displayTauxForList,
    emptyMessage
  };
});
