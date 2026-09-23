'use strict';

const canonical = require('./_scope-canonical-foundations');
const { fingerprintPublicRule } = require('./_scope-public-engine');

const QUALIFICATION_DEFINITIONS_C3 = Object.freeze([
  { code: 'PAPR', label: 'PAPR', type: 'QUALIFICATION', domainCode: 'PR', sortOrder: 1 },
  { code: 'PABC', label: 'PABC', type: 'SPECIALITE', domainCode: 'PR', sortOrder: 2 },
  { code: 'MACHINISTE_EA', label: 'Machiniste EA', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 20 },
  { code: 'GRUTIER_A', label: 'Grutier A', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 21 },
  { code: 'GRUTIER_C', label: 'Grutier C', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 22 },
  { code: 'CARISTE', label: 'Cariste', type: 'QUALIFICATION', domainCode: 'AUTO', sortOrder: 23 },
  { code: 'VPC', label: 'VPC', type: 'SPECIALITE', domainCode: 'FOSPEC', sortOrder: 3 },
  { code: 'SANITAIRE', label: 'Sanitaire', type: 'SPECIALITE', domainCode: 'FOSPEC', sortOrder: 5 }
]);

const QUALIFICATION_ALIASES_C3 = Object.freeze([
  { domainCode: 'PR', alias: 'PR', qualificationCode: 'PAPR' },
  { domainCode: 'PR', alias: 'PAPR', qualificationCode: 'PAPR' },
  { domainCode: 'PR', alias: 'ABC', qualificationCode: 'PABC' },
  { domainCode: 'PR', alias: 'PRABC', qualificationCode: 'PABC' },
  { domainCode: 'PR', alias: 'PR-ABC', qualificationCode: 'PABC' },
  { domainCode: 'PR', alias: 'PABC', qualificationCode: 'PABC' },
  { domainCode: 'FOSPEC', alias: 'VPC', qualificationCode: 'VPC' },
  { domainCode: 'FOSPEC', alias: 'OP_VPC', qualificationCode: 'VPC' },
  { domainCode: 'FOSPEC', alias: 'OP VPC', qualificationCode: 'VPC' },
  { domainCode: 'FOSPEC', alias: 'OFSI', qualificationCode: 'OFSI' },
  { domainCode: 'FOSPEC', alias: 'NAC', qualificationCode: 'NAC' },
  { domainCode: 'FOSPEC', alias: 'ANTICHUTE', qualificationCode: 'ANTICHUTE' },
  { domainCode: 'FOSPEC', alias: 'SANITAIRE', qualificationCode: 'SANITAIRE' },
  { domainCode: 'AUTO', alias: 'MACHINISTE_EA', qualificationCode: 'MACHINISTE_EA' },
  { domainCode: 'AUTO', alias: 'GRUTIER_A', qualificationCode: 'GRUTIER_A' },
  { domainCode: 'AUTO', alias: 'GRUTIER_C', qualificationCode: 'GRUTIER_C' },
  { domainCode: 'AUTO', alias: 'CARISTE', qualificationCode: 'CARISTE' }
]);

const EVENT_ROLE_DEFINITIONS = Object.freeze([
  { code: 'FORMATEUR_PR', label: 'Formateur PR', domainCode: 'PR' },
  { code: 'FORMATEUR_MAISON_FEU', label: 'Formateur maison feu', domainCode: 'PR', aliases: ['FMF'] },
  { code: 'CHEF_PISTE', label: 'Chef de piste', domainCode: 'PR' },
  { code: 'MONITEUR_JSP', label: 'Moniteur JSP', domainCode: 'JSP' },
  { code: 'AIDE_MONITEUR_JSP', label: 'Aide-moniteur JSP', domainCode: 'JSP' },
  { code: 'MONITEUR_CONDUITE', label: 'Moniteur de conduite', domainCode: 'AUTO' },
  { code: 'FORMATEUR_C1_118', label: 'Formateur C1/118', domainCode: 'AUTO' },
  { code: 'FORMATEUR_EA', label: 'Formateur EA', domainCode: 'AUTO' }
]);

const baseDefinitions = canonical.COMPETENCE_DEFINITIONS.filter((row) => row.code !== 'OP_VPC');
const ALL_QUALIFICATION_DEFINITIONS = Object.freeze([
  ...baseDefinitions,
  ...QUALIFICATION_DEFINITIONS_C3.filter((row) => !baseDefinitions.some((base) => base.code === row.code))
]);
const ALL_QUALIFICATION_CODES = Object.freeze(ALL_QUALIFICATION_DEFINITIONS.map((row) => row.code));

const aliasRows = [
  ...canonical.COMPETENCE_ALIASES.map((row) => ({
    domainCode: row.domainCode,
    alias: row.alias,
    qualificationCode: row.competenceCode === 'OP_VPC' ? 'VPC' : row.competenceCode,
    legacyContext: row.legacyContext || null
  })),
  ...QUALIFICATION_ALIASES_C3
];
const aliasIndex = new Map(aliasRows.map((row) => [`${upper(row.domainCode)}/${upper(row.alias)}`, row]));
for(const row of ALL_QUALIFICATION_DEFINITIONS){
  aliasIndex.set(`${upper(row.domainCode)}/${upper(row.code)}`, {
    domainCode: row.domainCode, alias: row.code, qualificationCode: row.code, legacyContext: null
  });
}

function upper(value){
  return String(value || '').trim().toUpperCase();
}

function isoDate(value){
  const text = String(value || '').slice(0, 10);
  const parsed = new Date(`${text}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text
    ? text : null;
}

function personId(row){
  return String(row && (row.personneId || row.personne_id || row.id) || '');
}

function canonicalizeQualification(domainCode, legacyCode){
  const domain = upper(domainCode);
  const raw = upper(legacyCode);
  const alias = aliasIndex.get(`${domain}/${raw}`);
  if(!alias) return null;
  return {
    domainCode: domain,
    qualificationCode: alias.qualificationCode,
    legacyCode: raw,
    legacyContext: alias.legacyContext || null
  };
}

function mapLegacyQualificationAssignment(row, index = 0){
  const sourceType = upper(row && (row.sourceType || row.source_type || 'LEGACY_ASSIGNMENT'));
  if(['STATCOM', 'EVENT', 'EVENEMENT', 'QUO_VADIS', 'QV'].includes(sourceType)){
    return { mapped: false, status: 'REJECTED', reason: 'NON_PERSONAL_SOURCE' };
  }
  const category = upper(row && (row.categorie || row.category));
  if(category && category !== 'SPECIALISATION'){
    return { mapped: false, status: 'IGNORED', reason: 'NOT_A_PERSONAL_QUALIFICATION' };
  }
  const personneId = personId(row);
  const domainCode = upper(row && (row.domainCode || row.domaine_code || row.domaine));
  const legacyCode = upper(row && (row.targetCode || row.niveau_code || row.niveau || row.cible));
  const mapped = canonicalizeQualification(domainCode, legacyCode);
  if(!mapped) return { mapped: false, status: 'UNRESOLVED', reason: 'UNKNOWN_PERSONAL_QUALIFICATION', personneId, domainCode, legacyCode };
  const validFrom = isoDate(row && (row.validFrom || row.valid_from || row.date_debut || row.dateDebut || row.date_actif || row.dateActif));
  const rawTo = row && (row.validTo || row.valid_to || row.date_fin || row.dateFin || row.date_inactif || row.dateInactif);
  const validTo = rawTo ? isoDate(rawTo) : null;
  if(!personneId || !validFrom || (rawTo && !validTo) || (validTo && validFrom > validTo)){
    return { mapped: false, status: 'REVIEW_REQUIRED', reason: 'INVALID_IDENTITY_OR_DATES', personneId, domainCode, legacyCode };
  }
  return {
    mapped: true,
    qualification: {
      personneId, competenceCode: mapped.qualificationCode, validFrom, validTo, status: 'CONFIRMED'
    },
    evidence: {
      id: String(row.id || row.affectation_id || `legacy-${index + 1}`),
      sourceType, sourceEntity: 'scope_affectations', sourceId: String(row.id || row.affectation_id || `legacy-${index + 1}`),
      sourceImportBatchId: row.source_import_batch_id || row.sourceImportBatchId || null,
      sourceImportLineId: row.source_import_line_id || row.sourceImportLineId || null,
      legacyDomain: domainCode, legacyTarget: legacyCode, legacyCode,
      legacyContext: mapped.legacyContext, validFrom, validTo, confidence: 1
    }
  };
}

function overlaps(left, right){
  const leftTo = left.validTo || '9999-12-31';
  const rightTo = right.validTo || '9999-12-31';
  return left.validFrom <= rightTo && right.validFrom <= leftTo;
}

function covers(outer, inner){
  const outerTo = outer.validTo || '9999-12-31';
  const innerTo = inner.validTo || '9999-12-31';
  return outer.validFrom <= inner.validFrom && outerTo >= innerTo;
}

function validateQualificationLifecycleMutation({ qualification, nextStatus, qualifications = [], implications = [] } = {}){
  const target = qualification || {};
  const targetCode = upper(target.competenceCode || target.competence_code);
  const targetPersonId = personId(target);
  const targetId = target.personQualificationId || target.person_qualification_id || target.id;
  const next = upper(nextStatus || target.status);
  const errors = [];
  if(next === 'CONFIRMED'){
    for(const implication of implications){
      if(upper(implication.qualificationCode || implication.competenceCode) !== targetCode) continue;
      const requiredCode = upper(implication.impliedQualificationCode || implication.impliedCompetenceCode);
      const covered = qualifications.some((row) => personId(row) === targetPersonId
        && upper(row.status) === 'CONFIRMED'
        && upper(row.competenceCode || row.competence_code) === requiredCode
        && covers(
          { validFrom: row.validFrom || row.valid_from, validTo: row.validTo || row.valid_to || null },
          { validFrom: target.validFrom || target.valid_from, validTo: target.validTo || target.valid_to || null }
        ));
      if(!covered) errors.push({ code: 'MISSING_IMPLIED_QUALIFICATION', qualificationCode: targetCode, impliedQualificationCode: requiredCode });
    }
  }
  if(upper(target.status) === 'CONFIRMED' && next === 'INVALIDATED'){
    for(const implication of implications){
      if(upper(implication.impliedQualificationCode || implication.impliedCompetenceCode) !== targetCode) continue;
      const dependentCode = upper(implication.qualificationCode || implication.competenceCode);
      for(const dependent of qualifications.filter((row) => personId(row) === targetPersonId
        && upper(row.status) === 'CONFIRMED'
        && upper(row.competenceCode || row.competence_code) === dependentCode)){
        const replacement = qualifications.some((row) => {
          const rowId = row.personQualificationId || row.person_qualification_id || row.id;
          return rowId !== targetId && personId(row) === targetPersonId && upper(row.status) === 'CONFIRMED'
            && upper(row.competenceCode || row.competence_code) === targetCode
            && covers(
              { validFrom: row.validFrom || row.valid_from, validTo: row.validTo || row.valid_to || null },
              { validFrom: dependent.validFrom || dependent.valid_from, validTo: dependent.validTo || dependent.valid_to || null }
            );
        });
        if(!replacement) errors.push({ code: 'REQUIRED_BY_CONFIRMED_QUALIFICATION', qualificationCode: targetCode, dependentQualificationCode: dependentCode });
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateQualificationSupersession({ superseded, replacement, qualifications = [], implications = [] } = {}){
  const oldRow = superseded || {};
  const newRow = replacement || {};
  const oldId = oldRow.personQualificationId || oldRow.person_qualification_id || oldRow.id;
  const newId = newRow.personQualificationId || newRow.person_qualification_id || newRow.id;
  const supersedesId = newRow.supersedesPersonQualificationId || newRow.supersedes_person_qualification_id;
  const oldCode = upper(oldRow.competenceCode || oldRow.competence_code);
  const newCode = upper(newRow.competenceCode || newRow.competence_code);
  const errors = [];
  if(!oldId) errors.push({ code: 'SUPERSEDED_NOT_FOUND' });
  if(!newId) errors.push({ code: 'REPLACEMENT_NOT_FOUND' });
  if(oldId && newId && oldId === newId) errors.push({ code: 'SUPERSESSION_CYCLE' });
  if(upper(oldRow.status) !== 'CONFIRMED') errors.push({ code: 'SUPERSEDED_NOT_REPLACEABLE' });
  if(upper(newRow.status) !== 'REVIEW_REQUIRED') errors.push({ code: 'REPLACEMENT_NOT_REVIEW_REQUIRED' });
  if(personId(oldRow) !== personId(newRow)) errors.push({ code: 'SUPERSESSION_PERSON_MISMATCH' });
  if(oldCode !== newCode) errors.push({ code: 'SUPERSESSION_COMPETENCE_MISMATCH' });
  if(supersedesId !== oldId) errors.push({ code: 'SUPERSESSION_REFERENCE_MISMATCH' });
  const byId = new Map((qualifications || []).map((row) => [row.personQualificationId || row.person_qualification_id || row.id,row]));
  const visited = new Set();
  for(let cursor = oldRow; cursor; cursor = byId.get(cursor.supersedesPersonQualificationId || cursor.supersedes_person_qualification_id)){
    const cursorId = cursor.personQualificationId || cursor.person_qualification_id || cursor.id;
    if(cursorId === newId){ errors.push({ code: 'SUPERSESSION_CYCLE' }); break; }
    if(visited.has(cursorId)){ errors.push({ code: 'SUPERSESSION_CYCLE' }); break; }
    visited.add(cursorId);
  }
  const conflicting = (qualifications || []).some((row) => {
    const rowId = row.personQualificationId || row.person_qualification_id || row.id;
    return rowId !== oldId && rowId !== newId && upper(row.status) === 'CONFIRMED'
      && personId(row) === personId(newRow)
      && upper(row.competenceCode || row.competence_code) === newCode
      && overlaps(
        { validFrom: row.validFrom || row.valid_from,validTo: row.validTo || row.valid_to || null },
        { validFrom: newRow.validFrom || newRow.valid_from,validTo: newRow.validTo || newRow.valid_to || null }
      );
  });
  if(conflicting) errors.push({ code: 'THIRD_CONFIRMED_OVERLAP' });
  for(const implication of implications){
    if(upper(implication.impliedQualificationCode || implication.impliedCompetenceCode) !== oldCode) continue;
    const dependentCode = upper(implication.qualificationCode || implication.competenceCode);
    for(const dependent of (qualifications || []).filter((row) => upper(row.status) === 'CONFIRMED'
      && personId(row) === personId(oldRow)
      && upper(row.competenceCode || row.competence_code) === dependentCode)){
      if(!covers(
        { validFrom: newRow.validFrom || newRow.valid_from,validTo: newRow.validTo || newRow.valid_to || null },
        { validFrom: dependent.validFrom || dependent.valid_from,validTo: dependent.validTo || dependent.valid_to || null }
      )) errors.push({ code: 'DEPENDENT_QUALIFICATION_NOT_COVERED',dependentQualificationCode: dependentCode });
    }
  }
  const finalRows = (qualifications || []).map((row) => {
    const rowId = row.personQualificationId || row.person_qualification_id || row.id;
    if(rowId === oldId) return { ...row,status: 'INVALIDATED' };
    if(rowId === newId) return { ...row,status: 'CONFIRMED' };
    return row;
  });
  const replacementImplications = validateQualificationLifecycleMutation({
    qualification: newRow,nextStatus: 'CONFIRMED',qualifications: finalRows,implications
  });
  errors.push(...replacementImplications.errors);
  return { valid: errors.length === 0,errors,qualifications: errors.length ? qualifications : finalRows };
}

function buildPersonQualificationBackfill(assignments){
  const mappedRows = [];
  const diagnostics = [];
  for(const [index, row] of (assignments || []).entries()){
    const result = mapLegacyQualificationAssignment(row, index);
    if(result.mapped) mappedRows.push(result);
    else if(result.status !== 'IGNORED') diagnostics.push({ index, ...result });
  }
  const groups = new Map();
  for(const row of mappedRows){
    const key = `${row.qualification.personneId}/${row.qualification.competenceCode}`;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const qualifications = [];
  for(const [key, rows] of groups){
    rows.sort((left, right) => left.qualification.validFrom.localeCompare(right.qualification.validFrom));
    const intervals = [];
    for(const row of rows){
      const current = intervals[intervals.length - 1];
      if(current && overlaps(current, row.qualification)){
        current.validTo = !current.validTo || !row.qualification.validTo ? null
          : (current.validTo > row.qualification.validTo ? current.validTo : row.qualification.validTo);
        current.evidence.push(row.evidence);
      }else{
        intervals.push({ ...row.qualification, evidence: [row.evidence] });
      }
    }
    for(const interval of intervals){
      interval.personQualificationId = `PQ:${key}:${interval.validFrom}:${interval.validTo || 'OPEN'}`;
      qualifications.push(interval);
    }
  }
  for(const pabc of qualifications.filter((row) => row.competenceCode === 'PABC')){
    const papr = qualifications.find((row) => row.personneId === pabc.personneId && row.competenceCode === 'PAPR' && covers(row, pabc));
    if(!papr){
      pabc.status = 'REVIEW_REQUIRED';
      diagnostics.push({
        status: 'REVIEW_REQUIRED', reason: 'PABC_WITHOUT_COMPATIBLE_PAPR', personneId: pabc.personneId,
        competenceCode: 'PABC', validFrom: pabc.validFrom, validTo: pabc.validTo
      });
    }
  }
  qualifications.sort((left, right) => left.personQualificationId.localeCompare(right.personQualificationId));
  return { qualifications, diagnostics, complete: diagnostics.every((row) => row.status !== 'REVIEW_REQUIRED') };
}

function toCanonicalCompetenceFacts(rows, evidenceRows = [], implications = [{ qualificationCode: 'PABC', impliedQualificationCode: 'PAPR' }]){
  const evidenceByQualification = new Map();
  for(const evidence of evidenceRows){
    const key = evidence.personQualificationId || evidence.person_qualification_id;
    if(!evidenceByQualification.has(key)) evidenceByQualification.set(key, []);
    evidenceByQualification.get(key).push(evidence);
  }
  const confirmed = (rows || []).filter((row) => upper(row.status) === 'CONFIRMED');
  const usable = confirmed.filter((row) => (implications || []).every((implication) => {
    if(upper(row.competenceCode || row.competence_code) !== upper(implication.qualificationCode)) return true;
    return confirmed.some((required) => personId(required) === personId(row)
      && upper(required.competenceCode || required.competence_code) === upper(implication.impliedQualificationCode)
      && covers(
        { validFrom: required.validFrom || required.valid_from, validTo: required.validTo || required.valid_to || null },
        { validFrom: row.validFrom || row.valid_from, validTo: row.validTo || row.valid_to || null }
      ));
  }));
  return usable.map((row) => {
    const id = row.personQualificationId || row.person_qualification_id || row.id;
    const evidence = row.evidence || evidenceByQualification.get(id) || [];
    return {
      id, personCompetenceId: id, personneId: personId(row),
      competenceCode: upper(row.competenceCode || row.competence_code),
      validFrom: row.validFrom || row.valid_from, validTo: row.validTo || row.valid_to || null,
      temporalSource: 'CANONICAL_PERSON_QUALIFICATION', evidence
    };
  });
}

function deriveJspYouthRoleFacts(persons, assignments){
  const personById = new Map((persons || []).map((person) => [personId(person), person]));
  const rows = [];
  for(const assignment of assignments || []){
    const id = personId(assignment);
    const domain = upper(assignment.domainCode || assignment.domaine_code || assignment.domaine);
    const oiCode = upper(assignment.oiCode || assignment.oi_code || assignment.targetCode || assignment.niveau_code || assignment.cible);
    if(domain !== 'JSP' || !['G1', 'C1', 'B1'].includes(oiCode)) continue;
    const person = personById.get(id);
    const grade = upper(person && person.grade).replace(/[_-]+/g, ' ');
    if(!/^(FLM|FLAMME) [123]$/.test(grade)) continue;
    rows.push({
      id: `JSP-YOUTH:${assignment.id || assignment.affectation_id || rows.length + 1}`,
      personneId: id, role: 'JEUNE', oiCode,
      validFrom: assignment.validFrom || assignment.valid_from || assignment.date_debut || assignment.date_actif,
      validTo: assignment.validTo || assignment.valid_to || assignment.date_fin || assignment.date_inactif || null,
      temporalSource: 'DERIVED_JSP_ASSIGNMENT_AND_GRADE'
    });
  }
  return rows;
}

function definition(code, label, ownerCode, predicate){
  const expression = { op: 'ALL', children: [{ predicate: 'PERSON_ELIGIBLE_AT' }, predicate] };
  return Object.freeze({
    code, label, description: `Public canonique ${label}`, status: 'ACTIVE', ownerType: 'DOMAIN', ownerCode,
    domainHints: Object.freeze([ownerCode]),
    version: Object.freeze({
      versionNumber: 1, versionCode: 'C3-B-V1', status: 'ACTIVE', schemaVersion: 1, expression,
      fingerprint: fingerprintPublicRule(expression, { competenceCodes: ALL_QUALIFICATION_CODES })
    })
  });
}

const PUBLIC_DEFINITIONS_C3 = Object.freeze([
  definition('DPS-GEN', 'DPS général', 'DPS', { predicate: 'HAS_OI', domainCode: 'DPS', oiCodes: ['G1', 'C1', 'B1', 'B2'] }),
  definition('DAP-GEN', 'DAP général', 'DAP', { predicate: 'HAS_OI', domainCode: 'DAP', oiCodes: ['Y1', 'Y2', 'Y3', 'Y4'] }),
  definition('JSP-GEN', 'Jeunes JSP', 'JSP', { predicate: 'HAS_JSP_ROLE', roles: ['JEUNE'], oiCodes: ['G1', 'C1', 'B1'] }),
  definition('PR-PAPR', 'PR PAPR', 'PR', { predicate: 'HAS_COMPETENCE', competenceCodes: ['PAPR'] }),
  definition('PR-PABC', 'PR PABC', 'PR', { predicate: 'HAS_COMPETENCE', competenceCodes: ['PABC'] }),
  definition('FOSPEC-VPC', 'FOSPEC VPC', 'FOSPEC', { predicate: 'HAS_COMPETENCE', competenceCodes: ['VPC'] })
]);

const UNRESOLVED_PUBLICS_C3 = Object.freeze([
  { code: 'JSP-CAD', label: 'JSP cadets', description: 'Public JSP cadets en attente de données fiables', ownerCode: 'JSP', resolutionStatus: 'REVIEW_REQUIRED', reason: 'La date de naissance fiable manque au modèle Personne actuel.' },
  { code: 'PR-GEN', label: 'PR général', description: 'Public PR général non résolu', ownerCode: 'PR', resolutionStatus: 'AMBIGUOUS', reason: 'PR/GEN ne doit pas être assimilé à une qualification.' },
  { code: 'FOCA-GEN', label: 'FOCA général', description: 'Public FOCA général non résolu', ownerCode: 'FOCA', resolutionStatus: 'REVIEW_REQUIRED', reason: 'La taxonomie FOCA est en remaniement.' },
  { code: 'FOSPEC-GEN', label: 'FOSPEC général', description: 'Public FOSPEC général non résolu', ownerCode: 'FOSPEC', resolutionStatus: 'AMBIGUOUS', reason: 'FOSPEC/GEN est un périmètre statistique, pas une qualification.' },
  { code: 'FOCO-DPS', label: 'FOCO DPS', description: 'Dimension statistique FOCO DPS non résolue', ownerCode: 'FOCO', resolutionStatus: 'UNRESOLVED', reason: 'Dimension de formation continue, pas qualification.' },
  { code: 'FOCO-DAP', label: 'FOCO DAP', description: 'Dimension statistique FOCO DAP non résolue', ownerCode: 'FOCO', resolutionStatus: 'UNRESOLVED', reason: 'Dimension de formation continue, pas qualification.' },
  { code: 'FOCO-JSP', label: 'FOCO JSP', description: 'Cas FOCO JSP maintenu hors résolution', ownerCode: 'FOCO', resolutionStatus: 'UNRESOLVED', reason: 'JSP reste hors statistiques FOCO.' }
]);

module.exports = {
  QUALIFICATION_DEFINITIONS_C3, QUALIFICATION_ALIASES_C3, ALL_QUALIFICATION_DEFINITIONS,
  ALL_QUALIFICATION_CODES, EVENT_ROLE_DEFINITIONS, PUBLIC_DEFINITIONS_C3, UNRESOLVED_PUBLICS_C3,
  canonicalizeQualification, mapLegacyQualificationAssignment, buildPersonQualificationBackfill,
  toCanonicalCompetenceFacts, deriveJspYouthRoleFacts, validateQualificationLifecycleMutation,
  validateQualificationSupersession
};
