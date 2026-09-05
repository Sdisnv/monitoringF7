'use strict';

const display = require('../../assets/js/scope-personnel-display.js');
const refs = require('../../assets/js/scope-personnel-referentials.js');

const ORDERS = Object.freeze({
  DPS: Object.freeze(['G1', 'C1', 'B1', 'B2']),
  DAP: Object.freeze(['Y1', 'Y2', 'Y3', 'Y4']),
  JSP: Object.freeze(['G1', 'C1', 'B1']),
  FOSPEC_SUBDOMAINES: Object.freeze(['PR', 'AUTO']),
  PR_SPECIALISATIONS: Object.freeze(['GEN', 'ABC']),
  AUTO_SPECIALISATIONS: Object.freeze(['VL', 'PL'])
});

const FORMATION_DOMAINES = Object.freeze(['DPS', 'DAP', 'JSP', 'FOSPEC', 'FOBA', 'FOCA']);
const AUTO_VL_PERIMETERS = Object.freeze(['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);
const AUTO_PL_PERIMETERS = Object.freeze(['G1', 'C1', 'B1', 'B2']);

function clean(value){
  return String(value == null ? '' : value).trim();
}

function normalizeDomaine(raw){
  const text = clean(raw).toUpperCase();
  if(text === 'PAPR') return 'PR';
  return text || 'JSP';
}

function normalizePerimeter(raw){
  const text = clean(raw).toUpperCase().replace(/^JSP\s+/, '').replace(/^DPS\s+/, '');
  return text === 'TOUS' || text === 'GLOBAL' ? '' : text;
}

function fospecSpecialisationLabel(subdomain, code){
  const sub = clean(subdomain).toUpperCase();
  const value = clean(code).toUpperCase();
  if(sub === 'PR') return value === 'ABC' ? 'PAPR ABC' : 'PAPR';
  if(sub === 'AUTO') return value === 'PL' ? 'Cond PL' : 'Cond VL';
  return value;
}

function perimeterLabel(domain, code, options = {}){
  const d = normalizeDomaine(domain);
  const value = normalizePerimeter(code);
  if(!value) return d === 'JSP' ? 'Tous les sites' : 'Global';
  if(d === 'JSP') return `JSP ${value}`;
  if(d === 'PR' || (d === 'FOSPEC' && clean(options.sousDomaine).toUpperCase() === 'PR')) return `DPS ${value}`;
  if(d === 'FOSPEC' && clean(options.sousDomaine).toUpperCase() === 'AUTO'){
    return value.startsWith('Y') ? `DAP ${value}` : `DPS ${value}`;
  }
  if(d === 'DAP') return `DAP ${value}`;
  return `${d} ${value}`;
}

function rankIn(order, value){
  const idx = order.indexOf(clean(value).toUpperCase());
  return idx >= 0 ? idx : 999;
}

function comparePerimeter(a, b, domain){
  const d = normalizeDomaine(domain);
  const order = ORDERS[d] || ORDERS.DPS;
  return rankIn(order, a) - rankIn(order, b);
}

function compareName(a, b){
  return `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr', { sensitivity: 'base', numeric: true });
}

function compareInstitutional(a, b, options = {}){
  const grade = refs.compareGrades(b.grade, a.grade);
  if(grade) return grade;
  const name = compareName(a, b);
  if(name) return name;
  const site = comparePerimeter(a.siteCode || a.code || a.site || a.perimeter, b.siteCode || b.code || b.site || b.perimeter, options.domain);
  if(site) return site;
  return clean(a.nip || a.personneId).localeCompare(clean(b.nip || b.personneId), 'fr', { numeric: true });
}

function effectiveFospecDomaine(domaineCode, sousDomaineCode){
  const d = normalizeDomaine(domaineCode);
  const sub = clean(sousDomaineCode).toUpperCase();
  return d === 'FOSPEC' && (sub === 'PR' || sub === 'AUTO') ? sub : d;
}

function acceptedEventDomains(domaineCode, sousDomaineCode){
  const d = normalizeDomaine(domaineCode);
  const sub = clean(sousDomaineCode).toUpperCase();
  if(d === 'FOSPEC' && (sub === 'PR' || sub === 'AUTO')) return new Set([sub]);
  if(d === 'FOSPEC') return new Set(['PR', 'AUTO']);
  return new Set([d]);
}

function autoPerimeterCodes(specialisationCode){
  const spec = clean(specialisationCode).toUpperCase();
  if(spec === 'PL') return AUTO_PL_PERIMETERS.slice();
  return AUTO_VL_PERIMETERS.slice();
}

function participationFactKey({ eventId, pKey, effectiveDomaineCode, sousDomaineCode, specialisationCode, perimeterCode } = {}){
  const effective = effectiveFospecDomaine(effectiveDomaineCode, sousDomaineCode);
  if(effective === 'PR'){
    return ['PR', pKey, clean(specialisationCode || 'GEN').toUpperCase()].join('::');
  }
  return [eventId, pKey, effective, clean(specialisationCode).toUpperCase(), clean(perimeterCode).toUpperCase()].join('::');
}

module.exports = {
  ORDERS,
  FORMATION_DOMAINES,
  AUTO_VL_PERIMETERS,
  AUTO_PL_PERIMETERS,
  clean,
  normalizeDomaine,
  normalizePerimeter,
  fospecSpecialisationLabel,
  perimeterLabel,
  compareInstitutional,
  effectiveFospecDomaine,
  acceptedEventDomains,
  autoPerimeterCodes,
  participationFactKey,
  classifyJspRole: display.classifyJspRole
};
