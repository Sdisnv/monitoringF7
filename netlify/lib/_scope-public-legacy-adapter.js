'use strict';

const canonical = require('./_scope-canonical-foundations');
const { isoDate } = require('./_scope-rules');

const AUTO_ALIASES = new Map(canonical.COMPETENCE_ALIASES.map((row) => [row.alias, row]));
const FOSPEC_CODES = new Set(canonical.COMPETENCE_DEFINITIONS.filter((row) => row.domainCode === 'FOSPEC').map((row) => row.code));

function upper(value){
  return String(value || '').trim().toUpperCase();
}

function personId(row){
  return row.personneId || row.personne_id || row.id || null;
}

function adaptLegacyPersonnelFacts(input){
  const source = input || {};
  const assignments = [];
  const competencies = [];
  const fobaLevels = [];
  const jspRoles = [];
  const unresolvedFacts = [];
  for(const [index, row] of (source.assignments || []).entries()){
    const domainCode = upper(row.domainCode || row.domaine_code || row.domaine);
    const targetCode = upper(row.targetCode || row.niveau_code || row.niveau);
    const rawFrom = row.validFrom || row.date_debut || row.dateDebut || row.date_actif || row.dateActif || null;
    const rawTo = row.validTo || row.date_fin || row.dateFin || row.date_inactif || row.dateInactif || null;
    const base = {
      id: row.id || row.affectation_id || `legacy-${index + 1}`,
      personneId: personId(row), validFrom: isoDate(rawFrom), validTo: rawTo ? isoDate(rawTo) : null,
      temporalSource: 'LEGACY_ASSIGNMENT', legacyCode: targetCode
    };
    if((canonical.DOMAIN_ORGANISATIONAL_UNITS[domainCode] || []).includes(targetCode)){
      assignments.push({ ...base, domainCode, oiCode: targetCode });
    }else if(domainCode === 'FOBA' && canonical.FOBA_LEVELS.some((item) => item.code === targetCode)){
      fobaLevels.push({ ...base, levelCode: targetCode });
    }else if(domainCode === 'AUTO' && AUTO_ALIASES.has(targetCode)){
      const alias = AUTO_ALIASES.get(targetCode);
      competencies.push({ ...base, competenceCode: alias.competenceCode, legacyContext: alias.legacyContext || null });
    }else if(domainCode === 'FOSPEC' && FOSPEC_CODES.has(targetCode)){
      competencies.push({ ...base, competenceCode: targetCode });
    }else if(domainCode === 'JSP' && row.jspRole){
      jspRoles.push({ ...base, role: upper(row.jspRole), oiCode: targetCode });
    }else{
      const classified = canonical.classifyLegacyTarget({ domaine_code: domainCode, niveau_code: targetCode });
      unresolvedFacts.push({ ...base, legacyKey: `${domainCode}/${targetCode}`, status: classified.classification === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'UNRESOLVED', reason: classified.reason });
    }
  }
  return {
    persons: source.persons || [], periods: source.periods || [], assignments, competencies, fobaLevels, jspRoles,
    complete: unresolvedFacts.length === 0, resolutionStatus: unresolvedFacts.some((row) => row.status === 'AMBIGUOUS') ? 'AMBIGUOUS' : unresolvedFacts.length ? 'UNRESOLVED' : 'COMPLETE',
    unresolvedFacts, warnings: unresolvedFacts.map((row) => `LEGACY_FACT_${row.status}:${row.legacyKey}`)
  };
}

module.exports = { adaptLegacyPersonnelFacts };
