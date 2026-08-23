'use strict';
/**
 * Contextes d’import nominatif. NIP = clé Personne unique.
 * JSP : Flamme = grade de la Personne ; site JSP = cible d’affectation.
 * FOBA 1/2/3 restent des populations distinctes (pas des grades JSP).
 */

const JSP_IMPORT_SITES = Object.freeze([
  { code: 'JSP G1', siteCode: 'G1', label: 'JSP G1' },
  { code: 'JSP C1', siteCode: 'C1', label: 'JSP C1' },
  { code: 'JSP B1', siteCode: 'B1', label: 'JSP B1' }
]);

const JSP_CADRE_NIVEAUX = Object.freeze(['CAD', 'GEN']);

const IMPORT_CONTEXTS = Object.freeze({
  GENERAL: {
    code: 'GENERAL',
    label: 'Personnel général',
    family: 'GENERAL',
    requiresOi: true,
    persistOi: true,
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  PAPR: {
    code: 'PAPR',
    label: 'PAPR',
    family: 'SPECIALISATION',
    specialization: { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', role_domaine: null },
    persistOi: false,
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  AUTO_VL_DPS: {
    code: 'AUTO_VL_DPS',
    label: 'cond VL — DPS',
    family: 'SPECIALISATION',
    specialization: { categorie: 'SPECIALISATION', domaine: 'AUTO', cible: 'VL_DPS', role_domaine: null },
    persistOi: false,
    requiresDpsOi: true,
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  AUTO_VL_DAP: {
    code: 'AUTO_VL_DAP',
    label: 'cond VL — DAP',
    family: 'SPECIALISATION',
    specialization: { categorie: 'SPECIALISATION', domaine: 'AUTO', cible: 'VL_DAP', role_domaine: null },
    persistOi: false,
    requiresDapOi: true,
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  AUTO_PL: {
    code: 'AUTO_PL',
    label: 'cond PL',
    family: 'SPECIALISATION',
    specialization: { categorie: 'SPECIALISATION', domaine: 'AUTO', cible: 'PL', role_domaine: null },
    persistOi: false,
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  FOBA_1: {
    code: 'FOBA_1',
    label: 'FOBA 1',
    family: 'FOBA',
    specialization: { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '1', role_domaine: null },
    persistOi: false,
    fobaLevel: '1',
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  FOBA_2: {
    code: 'FOBA_2',
    label: 'FOBA 2',
    family: 'FOBA',
    specialization: { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '2', role_domaine: null },
    persistOi: false,
    fobaLevel: '2',
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  FOBA_3: {
    code: 'FOBA_3',
    label: 'FOBA 3',
    family: 'FOBA',
    specialization: { categorie: 'SPECIALISATION', domaine: 'FOBA', cible: '3', role_domaine: null },
    persistOi: false,
    fobaLevel: '3',
    newPersonStatus: 'NEW_PERSON',
    newPersonLabel: 'Nouvelle personne'
  },
  JSP_FLM_1: {
    code: 'JSP_FLM_1',
    label: 'JSP — Flm 1',
    family: 'JSP',
    persistOi: false,
    requiresSite: true,
    jspGrade: 'Flm 1',
    jspFlammeLabel: 'Flm 1',
    newPersonStatus: 'NEW_JSP',
    newPersonLabel: 'Nouveau JSP'
  },
  JSP_FLM_2: {
    code: 'JSP_FLM_2',
    label: 'JSP — Flm 2',
    family: 'JSP',
    persistOi: false,
    requiresSite: true,
    jspGrade: 'Flm 2',
    jspFlammeLabel: 'Flm 2',
    newPersonStatus: 'NEW_JSP',
    newPersonLabel: 'Nouveau JSP'
  },
  JSP_FLM_3: {
    code: 'JSP_FLM_3',
    label: 'JSP — Flm 3',
    family: 'JSP',
    persistOi: false,
    requiresSite: true,
    jspGrade: 'Flm 3',
    jspFlammeLabel: 'Flm 3',
    newPersonStatus: 'NEW_JSP',
    newPersonLabel: 'Nouveau JSP'
  }
});

const CONTEXT_ALIASES = Object.freeze({
  OI: 'GENERAL',
  PERSONNEL: 'GENERAL',
  PERSONNEL_GENERAL: 'GENERAL',
  GENERAL: 'GENERAL',
  PR: 'PAPR',
  PAPR: 'PAPR',
  AUTO_VL_DPS: 'AUTO_VL_DPS',
  AUTO_VL_DAP: 'AUTO_VL_DAP',
  AUTO_PL: 'AUTO_PL',
  'COND PL': 'AUTO_PL',
  COND_PL: 'AUTO_PL',
  FOBA_1: 'FOBA_1',
  FOBA_2: 'FOBA_2',
  FOBA_3: 'FOBA_3',
  JSP_FLM_1: 'JSP_FLM_1',
  JSP_FLM_2: 'JSP_FLM_2',
  JSP_FLM_3: 'JSP_FLM_3'
});

const STATUS_LABELS = Object.freeze({
  IDENTICAL: 'Identique',
  NEW_PERSON: 'Nouvelle personne',
  NEW_JSP: 'Nouveau JSP',
  MODIFIED: 'Personne modifiée',
  NEW_ASSIGNMENT: 'Nouvelle affectation',
  EXISTING_ASSIGNMENT: 'Affectation existante',
  ABSENT_DU_NOUVEL_IMPORT: 'Absent du nouvel import',
  ERROR: 'Erreur'
});

function clean(value){
  return String(value || '').trim();
}

function normalizeJspGrade(value){
  const raw = clean(value).toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if(!raw) return '';
  if(raw === 'FLM 1' || raw === 'FLAMME 1' || raw === 'FLM1') return 'Flm 1';
  if(raw === 'FLM 2' || raw === 'FLAMME 2' || raw === 'FLM2') return 'Flm 2';
  if(raw === 'FLM 3' || raw === 'FLAMME 3' || raw === 'FLM3') return 'Flm 3';
  return clean(value);
}

function resolveImportContext(raw){
  const key = clean(raw).toUpperCase().replace(/[\s-]+/g, '_');
  const aliased = CONTEXT_ALIASES[key] || CONTEXT_ALIASES[clean(raw).toUpperCase()];
  if(!aliased || !IMPORT_CONTEXTS[aliased]){
    const error = new Error('Contexte d’import invalide.');
    error.code = 'contexte_invalide';
    throw error;
  }
  return IMPORT_CONTEXTS[aliased];
}

function visibleImportContexts(){
  return Object.values(IMPORT_CONTEXTS).map((ctx) => ({
    code: ctx.code,
    label: ctx.label,
    requiresSite: Boolean(ctx.requiresSite)
  }));
}

function normalizeJspSite(value, allowed = JSP_IMPORT_SITES){
  const raw = clean(value).toUpperCase().replace(/\s+/g, ' ');
  if(!raw) return null;
  const compact = raw.replace(/^JSP\s+/, '');
  if(JSP_CADRE_NIVEAUX.includes(compact)) return null;
  const found = allowed.find((site) => {
    const code = String(site.code || site.label || '').toUpperCase();
    const siteCode = String(site.siteCode || site.niveau || site.niveau_code || '').toUpperCase();
    return code === raw || code === `JSP ${compact}` || siteCode === compact;
  });
  if(!found) return null;
  const siteCode = found.siteCode || found.niveau || found.niveau_code || compact;
  return {
    code: found.code || found.libelle || `JSP ${siteCode}`,
    label: found.label || found.libelle || found.code || `JSP ${siteCode}`,
    siteCode
  };
}

function jspSitesFromCibles(cibles){
  const rows = (cibles || []).filter((cible) => {
    const domaine = cible.domaineCode || cible.domaine_code || cible.domaine;
    const siteCode = String(cible.niveauCode || cible.niveau_code || '').toUpperCase();
    if(domaine !== 'JSP') return false;
    if(JSP_CADRE_NIVEAUX.includes(siteCode)) return false;
    return true;
  }).map((cible) => {
    const siteCode = String(cible.niveauCode || cible.niveau_code || '').toUpperCase();
    const label = cible.libelle || cible.label || `JSP ${siteCode}`;
    return { code: label, label, siteCode };
  });
  return rows.length ? rows : JSP_IMPORT_SITES.slice();
}

function contextAssignment(ctx, siteJsp){
  if(ctx.specialization){
    return Object.assign({}, ctx.specialization);
  }
  if(ctx.family === 'JSP'){
    const site = siteJsp && (siteJsp.code || siteJsp);
    return {
      categorie: 'OI',
      domaine: 'JSP',
      cible: typeof site === 'string' ? site : String(site || ''),
      role_domaine: 'PRINCIPAL'
    };
  }
  return null;
}

function normalizeFobaCible(cible){
  const match = String(cible || '').match(/([123])/);
  return match ? match[1] : clean(cible);
}

function normalizeAutoCible(cible){
  const raw = clean(cible).toUpperCase().replace(/\s+/g, ' ');
  if(raw === 'VL_DPS' || raw === 'COND VL DPS' || raw === 'COND VL — DPS' || raw === 'AUTO VL DPS') return 'VL_DPS';
  if(raw === 'VL_DAP' || raw === 'COND VL DAP' || raw === 'COND VL — DAP' || raw === 'AUTO VL DAP') return 'VL_DAP';
  if(raw === 'PL' || raw === 'COND PL' || raw === 'AUTO PL' || raw === 'AUTO_PL') return 'PL';
  return clean(cible);
}

function assignmentKey(assignment){
  const cible = assignment.domaine === 'FOBA'
    ? normalizeFobaCible(assignment.cible)
    : assignment.domaine === 'AUTO'
      ? normalizeAutoCible(assignment.cible)
      : assignment.cible;
  return `${assignment.categorie}|${assignment.domaine}|${cible}|${assignment.role_domaine || ''}`;
}

function assignmentMatchesContext(assignment, ctx, siteJsp){
  if(!assignment || assignment.date_inactif) return false;
  if(ctx.family === 'GENERAL'){
    return assignment.categorie === 'OI' && (assignment.domaine === 'DPS' || assignment.domaine === 'DAP');
  }
  const expected = contextAssignment(ctx, siteJsp);
  if(!expected) return false;
  return assignmentKey(assignment) === assignmentKey(expected);
}

function personMatchesJspPopulation(person, ctx){
  if(!person || ctx.family !== 'JSP') return false;
  return normalizeJspGrade(person.grade) === ctx.jspGrade;
}

function populationLabel(ctx, siteJsp){
  if(ctx.family === 'JSP'){
    const site = (siteJsp && (siteJsp.label || siteJsp.code)) || '';
    return `${site} — ${ctx.jspFlammeLabel}`;
  }
  return ctx.label;
}

function specializationLabel(assignment){
  if(!assignment) return '';
  if(assignment.domaine === 'PR') return 'PAPR';
  if(assignment.domaine === 'AUTO'){
    const cible = normalizeAutoCible(assignment.cible);
    if(cible === 'VL_DPS') return 'cond VL — DPS';
    if(cible === 'VL_DAP') return 'cond VL — DAP';
    if(cible === 'PL') return 'cond PL';
    return `AUTO ${assignment.cible}`;
  }
  if(assignment.domaine === 'FOBA') return `FOBA ${normalizeFobaCible(assignment.cible)}`;
  if(assignment.domaine === 'JSP') return assignment.cible || 'JSP';
  return [assignment.domaine, assignment.cible, assignment.role_domaine].filter(Boolean).join(' ');
}

function oiLabel(assignment){
  if(!assignment) return '';
  const role = assignment.role_domaine === 'PRINCIPAL'
    ? 'principal'
    : assignment.role_domaine === 'SECONDAIRE' ? 'secondaire' : '';
  return [assignment.domaine, assignment.cible, role].filter(Boolean).join(' ');
}

module.exports = {
  IMPORT_CONTEXTS,
  JSP_IMPORT_SITES,
  JSP_CADRE_NIVEAUX,
  STATUS_LABELS,
  resolveImportContext,
  visibleImportContexts,
  normalizeJspSite,
  normalizeJspGrade,
  jspSitesFromCibles,
  contextAssignment,
  normalizeFobaCible,
  normalizeAutoCible,
  assignmentKey,
  assignmentMatchesContext,
  personMatchesJspPopulation,
  populationLabel,
  specializationLabel,
  oiLabel
};
