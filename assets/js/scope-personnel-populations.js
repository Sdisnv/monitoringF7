/* SCOPE-POPULATIONS-METIER-LOCK-1R1
   Population nominative à une date — distincte de la participation.

   POPULATION : qui peut figurer dans l’effectif d’un événement à D.
   PARTICIPATION : statut (présent, excusé, dispensé, …) une fois l’effectif fixé.

   Ce module ne calcule aucun statut de présence.
   DISPENSÉ est un statut de participation ; il n’appartient pas à ce service.
*/
(function (root, factory) {
  const display = typeof require === 'function'
    ? require('./scope-personnel-display.js')
    : (root && root.ScopePersonnelDisplay);
  const temporal = typeof require === 'function'
    ? require('./scope-personnel-temporal.js')
    : (root && root.ScopePersonnelTemporal);
  const api = factory(display, temporal);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelPopulations = api;
})(typeof window !== 'undefined' ? window : globalThis, function (display, temporal) {
  'use strict';

  const ORIGINE_CALCULEE = 'CALCULEE';
  const ORIGINE_MANUELLE = 'MANUELLE';

  function clean(value){
    return String(value == null ? '' : value).trim();
  }

  function assignmentsOf(person){
    if(!person) return [];
    return person.affectationsOuvertes || person.affectations || person.assignments || [];
  }

  function personEligibleAtDate(person, date){
    if(temporal && temporal.personActiveAtDate) return temporal.personActiveAtDate(person, date);
    return assignmentsOf(person).some((row) => display.isAssignmentActiveAt(row, date));
  }

  function assignmentRole(assignment){
    const role = String(assignment && (assignment.role_domaine || assignment.roleDomaine) || '').toUpperCase();
    return role === 'SECONDAIRE' ? 'SECONDAIRE' : 'PRINCIPAL';
  }

  function oiQueryLabel(domaine, cible){
    const domain = clean(domaine).toUpperCase();
    const raw = clean(cible).replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
    if(!raw) return domain;
    if(raw.toUpperCase().indexOf(domain + ' ') === 0 || raw.toUpperCase() === domain) return raw;
    return `${domain} ${raw}`;
  }

  function matchingOiAssignments(person, domaine, cible, date){
    const wanted = oiQueryLabel(domaine, cible);
    return assignmentsOf(person).filter((row) => {
      if(!display.isAssignmentActiveAt(row, date)) return false;
      if(!display.isOperationalOiAssignment(row)) return false;
      const label = display.operationalOiLabel(row);
      if(!cible){
        const parts = String(label || '').split(' ');
        return String(parts[0] || '').toUpperCase() === clean(domaine).toUpperCase();
      }
      return display.personMatchesOiFilter({ affectations: [row] }, wanted, date);
    });
  }

  function populationAutoCode(cible){
    const raw = clean(cible).toUpperCase().replace(/[_-]+/g, ' ');
    if(raw === 'VL DPS' || raw.indexOf('VL DPS') >= 0 || raw === 'VL_DPS') return 'VL_DPS';
    if(raw.indexOf('DAP') >= 0) return 'VL_DAP';
    if(raw.indexOf('DPS') >= 0) return 'VL_DPS';
    if(raw.indexOf('PL') >= 0) return 'PL';
    if(display.specializationCode({ domaine: 'AUTO', cible })){
      const code = display.specializationCode({ domaine: 'AUTO', cible });
      if(code === 'AUTO_VL_DPS') return 'VL_DPS';
      if(code === 'AUTO_VL_DAP') return 'VL_DAP';
      if(code === 'AUTO_PL') return 'PL';
    }
    return raw;
  }

  function belongsToPopulationAtDate(person, query){
    const q = query || {};
    const date = clean(q.date).slice(0, 10);
    if(!date || !personEligibleAtDate(person, date)) return false;
    const assignments = assignmentsOf(person);
    const domaine = clean(q.domaine).toUpperCase();
    const cible = clean(q.cible);
    const jspRole = clean(q.jspRole || q.roleJsp).toUpperCase();
    if(domaine === 'DPS' || domaine === 'DAP'){
      return matchingOiAssignments(person, domaine, cible, date).length > 0;
    }
    if(domaine === 'JSP'){
      if(jspRole === 'JEUNE' || jspRole === 'MONITEUR'){
        if(display.classifyJspRole(person, assignments, date) !== jspRole) return false;
      }
      return matchingOiAssignments(person, 'JSP', cible, date).length > 0;
    }
    if(domaine === 'PR' || domaine === 'PAPR'){
      return assignments.some((row) => display.specializationCode(row) === 'PAPR' && display.isAssignmentActiveAt(row, date));
    }
    if(domaine === 'AUTO'){
      const code = populationAutoCode(cible);
      if(code === 'VL_DPS') return display.countsInVlDpsEffectif(assignments, date);
      if(code === 'VL_DAP') return display.countsInVlDapEffectif(assignments, date);
      if(code === 'PL') return display.countsInPlEffectif(assignments, date);
      return false;
    }
    if(domaine === 'FOBA'){
      const wanted = display.specializationCode({ domaine: 'FOBA', cible: cible || '1' });
      return assignments.some((row) => display.specializationCode(row) === wanted && display.isAssignmentActiveAt(row, date));
    }
    return false;
  }

  function relevantAssignments(person, query, date){
    const domaine = clean(query.domaine).toUpperCase();
    const cible = clean(query.cible);
    const assignments = assignmentsOf(person);
    if(domaine === 'DPS' || domaine === 'DAP' || domaine === 'JSP'){
      return matchingOiAssignments(person, domaine === 'JSP' ? 'JSP' : domaine, cible, date);
    }
    if(domaine === 'PR' || domaine === 'PAPR'){
      return assignments.filter((row) => display.specializationCode(row) === 'PAPR' && display.isAssignmentActiveAt(row, date));
    }
    if(domaine === 'AUTO'){
      const code = populationAutoCode(cible);
      return assignments.filter((row) => {
        if(!display.isAssignmentActiveAt(row, date)) return false;
        const spec = display.specializationCode(row);
        if(code === 'VL_DPS') return spec === 'AUTO_VL_DPS';
        if(code === 'VL_DAP') return spec === 'AUTO_VL_DAP';
        if(code === 'PL') return spec === 'AUTO_PL';
        return false;
      });
    }
    if(domaine === 'FOBA'){
      const wanted = display.specializationCode({ domaine: 'FOBA', cible: cible || '1' });
      return assignments.filter((row) => display.specializationCode(row) === wanted && display.isAssignmentActiveAt(row, date));
    }
    return [];
  }

  function inclusionFor(person, query, date, matched){
    const domaine = clean(query.domaine).toUpperCase();
    const roles = [...new Set(matched.map(assignmentRole))];
    const jspRole = display.classifyJspRole(person, assignmentsOf(person), date);
    let kind = 'AFFECTATION_ACTIVE';
    if(domaine === 'DPS' || domaine === 'DAP' || domaine === 'JSP'){
      kind = roles.indexOf('SECONDAIRE') >= 0 && roles.indexOf('PRINCIPAL') < 0
        ? 'OI_SECONDAIRE'
        : roles.indexOf('PRINCIPAL') >= 0 && roles.indexOf('SECONDAIRE') >= 0
          ? 'OI_PRINCIPAL_ET_SECONDAIRE'
          : 'OI_PRINCIPAL';
    } else if(domaine === 'PR' || domaine === 'PAPR'){
      kind = 'SPECIALISATION_PAPR';
    } else if(domaine === 'AUTO'){
      kind = 'SPECIALISATION_AUTO';
    } else if(domaine === 'FOBA'){
      kind = 'SPECIALISATION_FOBA';
    }
    if(domaine === 'JSP' && jspRole) kind = jspRole === 'MONITEUR' ? 'JSP_MONITEUR' : 'JSP_JEUNE';
    return {
      kind,
      domaine: domaine === 'PAPR' ? 'PR' : domaine,
      cible: clean(query.cible),
      roles: roles.length ? roles : null,
      jspRole: domaine === 'JSP' ? jspRole : null
    };
  }

  function compactAssignment(assignment){
    return {
      id: assignment.id || null,
      categorie: assignment.categorie || assignment.category || '',
      domaine: assignment.domaine || '',
      cible: assignment.cible || '',
      role: assignmentRole(assignment),
      dateActif: assignment.dateActif || assignment.date_actif || '',
      dateInactif: assignment.dateInactif || assignment.date_inactif || null
    };
  }

  function oiSplit(person, date){
    const principal = [];
    const secondaires = [];
    assignmentsOf(person).forEach((row) => {
      if(!display.isOperationalOiAssignment(row) || !display.isAssignmentActiveAt(row, date)) return;
      const label = display.operationalOiLabel(row);
      if(!label) return;
      if(assignmentRole(row) === 'SECONDAIRE'){
        if(secondaires.indexOf(label) < 0) secondaires.push(label);
      } else if(principal.indexOf(label) < 0){
        principal.push(label);
      }
    });
    return { oiPrincipal: principal[0] || '', oiSecondaires: secondaires };
  }

  function describePopulationMember(person, query, date){
    const matched = relevantAssignments(person, query, date);
    const oi = oiSplit(person, date);
    return {
      personneId: person.personneId || person.id || null,
      nip: person.nip || '',
      grade: person.grade || '',
      nom: person.nom || '',
      prenom: person.prenom || '',
      oiPrincipal: oi.oiPrincipal,
      oiSecondaires: oi.oiSecondaires,
      specializations: display.formatSpecializations(assignmentsOf(person), { date }).labels,
      affectationsPertinentes: matched.map(compactAssignment),
      inclusion: inclusionFor(person, query, date, matched),
      jspRole: display.classifyJspRole(person, assignmentsOf(person), date),
      origine: ORIGINE_CALCULEE
    };
  }

  function resolvePopulationAtDate(people, query){
    const q = query || {};
    const date = clean(q.date).slice(0, 10);
    const domaine = clean(q.domaine).toUpperCase();
    const cible = clean(q.cible);
    const jspRole = clean(q.jspRole || q.roleJsp).toUpperCase();
    const seen = new Set();
    const personnes = [];
    const anomalies = [];
    (people || []).forEach((person) => {
      const assignments = assignmentsOf(person);
      const nip = clean(person.nip);
      if(display.hasActiveAutoPl(assignments, date) && !display.hasActiveDpsOi(assignments, date)){
        if(nip && !anomalies.some((row) => row.nip === nip && row.code === 'PL_SANS_DPS')){
          anomalies.push({ nip, code: 'PL_SANS_DPS', message: 'cond PL sans DPS actif' });
        }
      }
      if(!belongsToPopulationAtDate(person, { domaine, cible, date, jspRole })) return;
      if(!nip || seen.has(nip)) return;
      seen.add(nip);
      personnes.push(describePopulationMember(person, { domaine, cible, jspRole }, date));
    });
    return {
      kind: 'POPULATION',
      date,
      domaine: domaine === 'PAPR' ? 'PR' : domaine,
      cible,
      jspRole: jspRole || null,
      count: personnes.length,
      personnes,
      anomalies
    };
  }

  function addExistingPersonToPopulation(population, person, date){
    const current = population || resolvePopulationAtDate([], { date });
    const nip = clean(person && person.nip);
    if(!nip) return { ok: false, reason: 'nip_obligatoire', population: current };
    if(!personEligibleAtDate(person, date)) return { ok: false, reason: 'personne_inactive_a_date', population: current };
    if(current.personnes.some((row) => row.nip === nip)){
      return { ok: true, added: false, reason: 'deja_presente', population: current };
    }
    const member = describePopulationMember(person, {
      domaine: current.domaine,
      cible: current.cible,
      jspRole: current.jspRole
    }, date);
    member.origine = ORIGINE_MANUELLE;
    member.inclusion = {
      kind: 'AJOUT_MANUEL',
      domaine: current.domaine,
      cible: current.cible,
      roles: null,
      jspRole: null
    };
    const personnes = current.personnes.concat([member]);
    return {
      ok: true,
      added: true,
      population: Object.assign({}, current, { personnes, count: personnes.length })
    };
  }

  return {
    ORIGINE_CALCULEE,
    ORIGINE_MANUELLE,
    belongsToPopulationAtDate,
    resolvePopulationAtDate,
    describePopulationMember,
    addExistingPersonToPopulation
  };
});
