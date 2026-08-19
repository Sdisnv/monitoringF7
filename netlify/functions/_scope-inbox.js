'use strict';
const { isoDate } = require('./_scope-rules');
const { MODES, inferModeSuivi } = require('./_scope-analytics');

function volumesComplete(saisie){
  if(!saisie) return false;
  const attendus = Number(saisie.nb_attendus);
  const presents = Number(saisie.nb_presents);
  const excuses = Number(saisie.nb_excuses);
  const nonExcuses = Number(saisie.nb_non_excuses);
  const dispenses = Number(saisie.nb_dispenses || 0);
  if(![attendus, presents, excuses, nonExcuses, dispenses].every((n) => Number.isInteger(n) && n >= 0)) return false;
  return attendus === presents + excuses + nonExcuses + dispenses;
}

function addDays(iso, n){
  const text = isoDate(iso);
  if(!text) return null;
  const [y, m, d] = text.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(n)));
  return dt.toISOString().slice(0, 10);
}

function todayIso(value){
  return isoDate(value) || new Date().toISOString().slice(0, 10);
}

function ctaFor(code, evenementId){
  const href = `#/exercices/${evenementId}${code === 'SAISIE_NON_RENSEIGNE' || code === 'QUANTITATIF_INCOMPLET' ? '/saisie' : ''}`;
  if(code === 'QUANTITATIF_INCOMPLET') return { action: 'saisir-volumes', label: 'Saisir les présences', href };
  if(code === 'SAISIE_NON_RENSEIGNE') return { action: 'saisir', label: 'Compléter la saisie', href };
  if(code === 'NOMINATIF_NON_FIGE') return { action: 'figer', label: 'Figer la population', href: `#/exercices/${evenementId}` };
  if(code === 'ECHU_PLANIFIE') return { action: 'ouvrir', label: 'Ouvrir', href: `#/exercices/${evenementId}` };
  if(code === 'CLOTURE_POSSIBLE') return { action: 'cloturer', label: 'Clôturer', href: `#/exercices/${evenementId}` };
  return { action: 'ouvrir', label: 'Ouvrir', href: `#/exercices/${evenementId}` };
}

function classifyInboxItem(event, extras = {}){
  const evenement = event.evenement || event;
  const mode = inferModeSuivi(evenement);
  const date = isoDate(evenement.date);
  const today = todayIso(extras.today);
  const proche = addDays(today, 7);
  if(!evenement || evenement.origine === 'LEGACY_AGGREGATED' || mode === MODES.LEGACY) return null;
  if(evenement.statut === 'ANNULE' || evenement.statut === 'REPORTE' || evenement.statut === 'REALISE') return null;
  if(evenement.statut !== 'PLANIFIE') return null;

  const saisie = extras.saisie || extras.saisieQuantitative || event.saisieQuantitative || null;
  const participations = extras.participations || [];
  const attendus = (extras.attendus || []).filter((a) => a.inclus !== false);
  const echu = date && date < today;
  const imminent = date && date <= proche;

  let code = null;
  let reason = null;

  if(mode === MODES.QUANTITATIF){
    const volumesOk = volumesComplete(saisie);
    if(!volumesOk){
      code = 'QUANTITATIF_INCOMPLET';
      reason = 'Saisie quantitative incomplète ou absente.';
    } else {
      code = echu ? 'CLOTURE_POSSIBLE' : null;
      reason = code ? 'Saisie complète : l’exercice échu peut être clôturé.' : null;
    }
  } else if(!evenement.population_figee){
    if(echu || imminent){
      code = 'NOMINATIF_NON_FIGE';
      reason = echu
        ? 'Date échue, population non figée.'
        : 'Exercice proche, population non figée.';
    }
  } else {
    const open = attendus.filter((a) => {
      const p = participations.find((row) => String(row.personne_id) === String(a.personne_id));
      return !p || p.statut === 'NON_RENSEIGNE';
    });
    if(open.length){
      code = 'SAISIE_NON_RENSEIGNE';
      reason = `${open.length} participation(s) encore non renseignée(s).`;
    } else if(echu){
      code = 'CLOTURE_POSSIBLE';
      reason = 'Saisie complète : l’exercice échu peut être clôturé.';
    }
  }

  if(!code && echu){
    code = 'ECHU_PLANIFIE';
    reason = 'Date passée, exercice encore planifié.';
  }
  if(!code) return null;

  const cibles = extras.cibles || event.cibles || [];
  return {
    evenementId: evenement.evenement_id,
    date,
    domaine: evenement.domaine_code,
    libelle: evenement.libelle,
    modeSuivi: mode,
    statut: evenement.statut,
    cibles: cibles.map((c) => ({
      cibleId: c.cible_id || c.cibleId,
      niveauCode: c.niveau_code || c.niveauCode,
      libelle: c.libelle
    })),
    reasonCode: code,
    reason,
    cta: ctaFor(code, evenement.evenement_id)
  };
}

module.exports = { classifyInboxItem, todayIso, addDays };
