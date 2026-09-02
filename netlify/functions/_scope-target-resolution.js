'use strict';

function clean(value){
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
}

function normalizeTargetCode(domaine, cible){
  const domain = clean(domaine).toUpperCase();
  let value = clean(cible);
  const upper = value.toUpperCase().replace(/\//g, ' ');
  if(!domain || !upper) return value;
  const withoutDomain = upper.startsWith(`${domain} `)
    ? upper.slice(domain.length).trim()
    : upper;
  if(domain === 'FOBA' || domain === 'FOCA'){
    const m = (withoutDomain || upper).match(/([123])/);
    return m ? m[1] : value;
  }
  if(domain === 'DPS'){
    const m = withoutDomain.match(/^(G1|C1|B1|B2|GEN)\b/);
    return m ? m[1] : value;
  }
  if(domain === 'DAP'){
    const m = withoutDomain.match(/^(Y1|Y2|Y3|Y4|GEN)\b/);
    return m ? m[1] : value;
  }
  if(domain === 'JSP'){
    const m = withoutDomain.match(/^(G1|C1|B1|CAD|GEN)\b/);
    return m ? m[1] : value;
  }
  if(domain === 'AUTO'){
    if(/\bPL\b/.test(upper)) return 'PL';
    if(/\bVL\b/.test(upper)) return 'VL';
    return upper === 'GEN' ? 'GEN' : value;
  }
  if(domain === 'PR' || domain === 'PAPR'){
    const m = withoutDomain.replace(/^PAPR\s+/, '').match(/^(G1|C1|B1|B2|GEN)\b/);
    return m ? m[1] : value;
  }
  if(domain === 'FOSPEC'){
    return withoutDomain === 'GEN' || upper === 'FOSPEC' ? 'GEN' : value;
  }
  return value;
}

function matchesAssignmentToEventTarget(assignment, eventTarget){
  if(!assignment || !eventTarget) return false;
  const assignmentDomain = clean(assignment.domaine || assignment.domaine_code).toUpperCase();
  const targetDomain = clean(eventTarget.domaine_code || eventTarget.domaine).toUpperCase();
  if(!assignmentDomain || assignmentDomain !== targetDomain) return false;
  const assignmentTarget = normalizeTargetCode(assignmentDomain, assignment.cible || assignment.niveau_code);
  const eventCode = normalizeTargetCode(targetDomain, eventTarget.niveau_code || eventTarget.cible);
  if(String(assignmentTarget).toUpperCase() === String(eventCode).toUpperCase()) return true;
  return String(eventCode).toUpperCase() === 'GEN';
}

function pgNormalizeExpression(domaineSql, cibleSql){
  return `case
    when upper(${domaineSql}) in ('FOBA','FOCA')
      then coalesce((regexp_match(upper(replace(${cibleSql}, '/', ' ')), '([123])'))[1], upper(${cibleSql}))
    when upper(${domaineSql}) = 'JSP'
      then regexp_replace(upper(replace(${cibleSql}, '/', ' ')), '^JSP\\s+', '')
    when upper(${domaineSql}) in ('DPS','DAP','PR')
      then regexp_replace(upper(replace(${cibleSql}, '/', ' ')), '^(DPS|DAP|PR|PAPR)\\s+', '')
    when upper(${domaineSql}) = 'AUTO' and upper(${cibleSql}) like '%PL%'
      then 'PL'
    when upper(${domaineSql}) = 'AUTO' and upper(${cibleSql}) like '%VL%'
      then 'VL'
    when upper(${domaineSql}) = 'FOSPEC'
      then 'GEN'
    else upper(${cibleSql})
  end`;
}

function pgCibleJoinCondition(alias = 'a'){
  const aDomain = `${alias}.domaine`;
  const aCible = `${alias}.cible`;
  const normalized = pgNormalizeExpression(aDomain, aCible);
  return `c.domaine_code = ${aDomain}
    and (
      upper(c.niveau_code) = ${normalized}
      or upper(c.libelle) = upper(${aCible})
      or upper(c.libelle) = upper(concat(${aDomain}, ' ', ${aCible}))
      or (${aDomain} in ('PR','AUTO','FOSPEC') and c.niveau_code = 'GEN')
    )`;
}

module.exports = {
  normalizeTargetCode,
  matchesAssignmentToEventTarget,
  pgCibleJoinCondition
};
