/* SCOPE-AUTO-SPECIALISATIONS-PRIORITE-1
   Libellés métier centralisés + règle AUTO PL > VL DPS (effectif uniquement). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelDisplay = api;
  root.ScopePersonnelDisplay = api;
  root.ScopePersonnelDisplay = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SPECIALIZATION_SEPARATOR = ', ';
  const SPECIALIZATION_ORDER = Object.freeze(['FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'cond VL', 'cond PL', 'JSP']);
  const SPECIALIZATION_CODE_LABELS = Object.freeze({
    FOBA_1: 'FOBA 1',
    FOBA_2: 'FOBA 2',
    FOBA_3: 'FOBA 3',
    PAPR: 'PAPR',
    PR: 'PAPR',
    AUTO_VL_DPS: 'cond VL',
    AUTO_VL_DAP: 'cond VL',
    AUTO_PL: 'cond PL',
    JSP: 'JSP'
  });
  const MSG_PL_PRIORITY = 'cond PL prioritaire pour l’effectif cond VL DPS';
  const MSG_PL_WITHOUT_DPS = 'Conducteur PL sans affectation DPS active';

  function clean(value){
    return String(value == null ? '' : value).trim();
  }

  function valuesEqual(a, b){
    return clean(a).toUpperCase() === clean(b).toUpperCase();
  }

  function assignmentParts(assignment){
    if(!assignment) return { domaine: '', cible: '' };
    if(typeof assignment === 'string'){
      const raw = clean(assignment).replace(/\//g, ' ').replace(/\s+/g, ' ');
      const compact = raw.toUpperCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
      if(SPECIALIZATION_CODE_LABELS[compact]){
        const mapped = compact === 'PR' ? 'PAPR' : compact;
        if(mapped.indexOf('FOBA_') === 0) return { domaine: 'FOBA', cible: mapped.slice(5) };
        if(mapped === 'PAPR') return { domaine: 'PR', cible: 'PR' };
        if(mapped === 'AUTO_VL_DPS') return { domaine: 'AUTO', cible: 'VL_DPS' };
        if(mapped === 'AUTO_VL_DAP') return { domaine: 'AUTO', cible: 'VL_DAP' };
        if(mapped === 'AUTO_PL') return { domaine: 'AUTO', cible: 'PL' };
        if(mapped === 'JSP') return { domaine: 'JSP', cible: '' };
      }
      const upper = raw.toUpperCase();
      if(upper === 'COND VL' || upper === 'COND VL — DPS' || upper === 'COND VL - DPS' || upper === 'COND VL DPS'){
        return { domaine: 'AUTO', cible: 'VL_DPS' };
      }
      if(upper === 'COND VL — DAP' || upper === 'COND VL - DAP' || upper === 'COND VL DAP'){
        return { domaine: 'AUTO', cible: 'VL_DAP' };
      }
      if(upper === 'COND PL') return { domaine: 'AUTO', cible: 'PL' };
      if(upper === 'PAPR' || upper === 'PR') return { domaine: 'PR', cible: 'PR' };
      const parts = raw.split(' ').filter(Boolean);
      return { domaine: parts[0] || '', cible: parts.slice(1).join(' ') };
    }
    return {
      domaine: clean(assignment.domaine || assignment.domaineCode || assignment.domaine_code || ''),
      cible: clean(assignment.cible || assignment.niveauCode || assignment.niveau_code || '')
    };
  }

  function normalizeAutoCible(cible){
    const raw = clean(cible).toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if(raw === 'VL DPS' || raw === 'COND VL DPS' || raw === 'AUTO VL DPS' || raw === 'VL_DPS') return 'VL_DPS';
    if(raw === 'VL DAP' || raw === 'COND VL DAP' || raw === 'AUTO VL DAP' || raw === 'VL_DAP') return 'VL_DAP';
    if(raw === 'PL' || raw === 'COND PL' || raw === 'AUTO PL' || raw === 'AUTO_PL') return 'PL';
    return clean(cible);
  }

  function normalizeFobaCible(cible){
    const match = String(cible || '').match(/([123])/);
    return match ? match[1] : clean(cible);
  }

  function specializationCode(assignment){
    const parts = assignmentParts(assignment);
    const domaine = parts.domaine.toUpperCase();
    if(domaine === 'PR' || domaine === 'PAPR') return 'PAPR';
    if(domaine === 'AUTO'){
      const cible = normalizeAutoCible(parts.cible);
      if(cible === 'VL_DPS') return 'AUTO_VL_DPS';
      if(cible === 'VL_DAP') return 'AUTO_VL_DAP';
      if(cible === 'PL') return 'AUTO_PL';
      return '';
    }
    if(domaine === 'FOBA'){
      const level = normalizeFobaCible(parts.cible);
      if(level === '1' || level === '2' || level === '3') return `FOBA_${level}`;
      return '';
    }
    const raw = typeof assignment === 'string' ? clean(assignment).toUpperCase().replace(/[\s-]+/g, '_') : '';
    if(SPECIALIZATION_CODE_LABELS[raw] && raw !== 'JSP') return raw === 'PR' ? 'PAPR' : raw;
    return '';
  }

  function specializationUserLabel(assignmentOrCode){
    if(assignmentOrCode == null || assignmentOrCode === '') return '';
    if(typeof assignmentOrCode === 'string' && SPECIALIZATION_CODE_LABELS[assignmentOrCode]){
      return SPECIALIZATION_CODE_LABELS[assignmentOrCode];
    }
    const code = specializationCode(assignmentOrCode);
    return code ? (SPECIALIZATION_CODE_LABELS[code] || '') : '';
  }

  function assignmentDateValue(assignment, keys){
    if(!assignment || typeof assignment === 'string') return '';
    for(let i = 0; i < keys.length; i += 1){
      if(assignment[keys[i]]) return clean(assignment[keys[i]]).slice(0, 10);
    }
    return '';
  }

  function isAssignmentActiveAt(assignment, date){
    if(!assignment) return false;
    const day = clean(date).slice(0, 10);
    const start = assignmentDateValue(assignment, ['date_actif', 'dateActif', 'date_debut', 'dateDebut']);
    const end = assignmentDateValue(assignment, ['date_inactif', 'dateInactif', 'date_fin', 'dateFin']);
    if(!day) return !end;
    if(start && start > day) return false;
    if(end && end < day) return false;
    return true;
  }

  function isAutoVlDps(assignment){ return specializationCode(assignment) === 'AUTO_VL_DPS'; }
  function isAutoVlDap(assignment){ return specializationCode(assignment) === 'AUTO_VL_DAP'; }
  function isAutoPl(assignment){ return specializationCode(assignment) === 'AUTO_PL'; }

  function isDpsOi(assignment){
    if(!assignment || typeof assignment === 'string') return assignmentParts(assignment).domaine.toUpperCase() === 'DPS';
    const domaine = assignmentParts(assignment).domaine.toUpperCase();
    if(domaine !== 'DPS') return false;
    const cat = String(assignment.categorie || assignment.category || 'OI').toUpperCase();
    return cat === 'OI' || cat === '';
  }

  function hasActiveAutoPl(assignments, date){
    return (assignments || []).some((row) => isAutoPl(row) && isAssignmentActiveAt(row, date));
  }

  function hasActiveAutoVlDps(assignments, date){
    return (assignments || []).some((row) => isAutoVlDps(row) && isAssignmentActiveAt(row, date));
  }

  function hasActiveAutoVlDap(assignments, date){
    return (assignments || []).some((row) => isAutoVlDap(row) && isAssignmentActiveAt(row, date));
  }

  function hasActiveDpsOi(assignments, date){
    return (assignments || []).some((row) => isDpsOi(row) && isAssignmentActiveAt(row, date));
  }

  function countsInVlDpsEffectif(assignments, date){
    return hasActiveAutoVlDps(assignments, date) && !hasActiveAutoPl(assignments, date);
  }

  function countsInPlEffectif(assignments, date){
    return hasActiveAutoPl(assignments, date) && hasActiveDpsOi(assignments, date);
  }

  function countsInVlDapEffectif(assignments, date){
    return hasActiveAutoVlDap(assignments, date);
  }

  function isEffectiveCondVlDps(assignments, date){
    return countsInVlDpsEffectif(assignments, date);
  }

  function vlDpsPriorityNote(assignments, date){
    if(hasActiveAutoVlDps(assignments, date) && hasActiveAutoPl(assignments, date)) return MSG_PL_PRIORITY;
    return '';
  }

  function evaluateAutoSpecializations(assignments, date, importCode){
    const hasPl = hasActiveAutoPl(assignments, date);
    const hasVlDps = hasActiveAutoVlDps(assignments, date);
    const hasDps = hasActiveDpsOi(assignments, date);
    const infos = [];
    const anomalies = [];
    if(hasPl && hasVlDps && importCode !== 'AUTO_VL_DAP'){
      infos.push(MSG_PL_PRIORITY);
    }
    if(hasPl && !hasDps){
      anomalies.push(MSG_PL_WITHOUT_DPS);
    }
    return {
      infos,
      anomalies,
      plPriorityForVlDps: hasPl && hasVlDps,
      plWithoutActiveDps: hasPl && !hasDps,
      countsInVlDpsEffectif: countsInVlDpsEffectif(assignments, date),
      countsInPlEffectif: countsInPlEffectif(assignments, date),
      countsInVlDapEffectif: countsInVlDapEffectif(assignments, date)
    };
  }

  function countsInImportPopulation(assignments, resolved, date){
    const code = resolved && resolved.code;
    if(code === 'AUTO_VL_DPS') return countsInVlDpsEffectif(assignments, date);
    if(code === 'AUTO_PL') return countsInPlEffectif(assignments, date);
    return true;
  }

  function sortSpecializationLabels(labels){
    return labels.slice().sort((a, b) => {
      const ia = SPECIALIZATION_ORDER.indexOf(a);
      const ib = SPECIALIZATION_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'fr');
    });
  }

  function formatSpecializations(list, options){
    const opts = options || {};
    const date = opts.date;
    const labels = [];
    const seen = new Set();
    (list || []).forEach((item) => {
      if(date && !isAssignmentActiveAt(item, date)) return;
      const label = specializationUserLabel(item);
      if(!label || seen.has(label)) return;
      seen.add(label);
      labels.push(label);
    });
    const ordered = sortSpecializationLabels(labels);
    const text = ordered.join(SPECIALIZATION_SEPARATOR);
    const note = opts.withPriorityNote === false ? '' : vlDpsPriorityNote(list, date);
    return { text, note, labels: ordered };
  }

  function compactAssignmentLabel(domaine, cible, extra){
    const spec = specializationUserLabel({ domaine, cible });
    if(spec) return [spec, clean(extra)].filter(Boolean).join(' ');
    const domain = clean(domaine);
    const target = clean(cible).replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
    const rest = clean(extra);
    let core = '';
    if(!domain && !target) core = '';
    else if(!target) core = domain;
    else if(!domain) core = target;
    else {
      const d = domain.toUpperCase();
      const t = target.toUpperCase();
      if(t === d) core = domain;
      else if(t.startsWith(`${d} `) || t.startsWith(`${d}/`)) core = target;
      else core = `${domain} ${target}`;
    }
    return [core, rest].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  function assignmentRoleSuffix(assignment){
    const role = assignment && (assignment.role_domaine || assignment.roleDomaine || '');
    if(role === 'SECONDAIRE') return 'secondaire';
    return '';
  }

  function formatAssignment(assignment){
    if(!assignment) return '';
    const spec = specializationUserLabel(assignment);
    if(spec) return spec;
    if(typeof assignment === 'string'){
      const parts = clean(assignment).replace(/\//g, ' ').split(/\s+/).filter(Boolean);
      if(parts.length >= 2) return compactAssignmentLabel(parts[0], parts.slice(1).join(' '));
      return clean(assignment);
    }
    const domaine = assignment.domaine || assignment.domaineCode || assignment.domaine_code || '';
    const cible = assignment.cible || assignment.niveauCode || assignment.niveau_code || '';
    const fromParts = compactAssignmentLabel(domaine, cible, assignmentRoleSuffix(assignment));
    if(fromParts) return fromParts;
    return compactAssignmentLabel('', assignment.label || '', assignmentRoleSuffix(assignment));
  }

  function formatOtherAffectations(list, options){
    const spec = formatSpecializations(list, options);
    const seen = new Set(spec.labels);
    const rest = [];
    (list || []).forEach((item) => {
      if(specializationUserLabel(item)) return;
      const label = formatAssignment(item);
      if(!label || seen.has(label)) return;
      seen.add(label);
      rest.push(label);
    });
    const text = [spec.text, rest.join(SPECIALIZATION_SEPARATOR)].filter(Boolean).join(SPECIALIZATION_SEPARATOR);
    return { text, note: spec.note, labels: spec.labels.concat(rest) };
  }

  function formatAssignmentList(list){
    return formatOtherAffectations(list, { withPriorityNote: false }).text;
  }

  function previewStatus(row){
    return String((row && (row.statut || row.status)) || '');
  }

  function hasAnomaly(row){
    if(!row) return false;
    if((row.errors || []).length) return true;
    if((row.warnings || []).length) return true;
    if((row.messages || []).length && previewStatus(row) === 'ERROR') return true;
    return false;
  }

  function needsUserDecision(row){
    const status = previewStatus(row);
    if(status === 'CONFLIT' || status === 'ERROR' || status === 'ERREUR') return true;
    if(status === 'ABSENT_DU_NOUVEL_IMPORT' || status === 'ABSENT_DU_FICHIER') return true;
    if(status === 'ARCHIVE_RETROUVE') return true;
    const decision = String((row && row.decision) || '').toUpperCase();
    return decision === 'EXAMINER';
  }

  function isStrictlyIdenticalPreviewRow(row){
    const status = previewStatus(row);
    if(status !== 'IDENTICAL' && status !== 'INCHANGE') return false;
    if(hasAnomaly(row) || needsUserDecision(row)) return false;
    if((row.infos || []).length) return false;
    return true;
  }

  function previewDetailRows(rows){
    return (rows || []).filter((row) => !isStrictlyIdenticalPreviewRow(row));
  }

  function identityDiffFields(row){
    const identity = (row && row.diff && row.diff.identity) || {};
    const person = (row && row.diff && row.diff.person) || {};
    const n = (row && row.normalized) || {};
    return [
      { key: 'grade', label: 'Grade' },
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' }
    ].map((field) => {
      const current = (identity[field.key] && identity[field.key].current)
        || (person[field.key] && person[field.key].before)
        || '';
      const proposed = (identity[field.key] && identity[field.key].proposed)
        || (person[field.key] && person[field.key].after)
        || n[field.key]
        || '';
      return {
        key: field.key,
        label: field.label,
        current: clean(current),
        proposed: clean(proposed),
        changed: !valuesEqual(current, proposed)
      };
    }).filter((field) => field.changed);
  }

  function formatIdentitySide(row, side){
    const status = previewStatus(row);
    const diffs = identityDiffFields(row);
    if(!diffs.length) return '—';
    if((status === 'NEW_PERSON' || status === 'NEW_JSP' || status === 'NOUVEAU') && side === 'current'){
      return '—';
    }
    return diffs.map((field) => {
      const value = side === 'current' ? field.current : field.proposed;
      return `${field.label} : ${value || '—'}`;
    }).join(' · ');
  }

  function assignmentSides(row){
    const diff = (row && row.diff) || {};
    const pop = diff.population || {};
    let current = '';
    let proposed = '';
    if(pop.oiSite && (pop.oiSite.current || pop.oiSite.proposed)){
      current = formatAssignment(pop.oiSite.current);
      proposed = formatAssignment(pop.oiSite.proposed);
    }
    if(pop.specialization && (pop.specialization.current || pop.specialization.proposed)){
      current = current || formatAssignment(pop.specialization.current);
      proposed = proposed || formatAssignment(pop.specialization.proposed);
    }
    if(!current && Array.isArray(diff.principalChanges) && diff.principalChanges.length){
      current = diff.principalChanges.map((change) => compactAssignmentLabel(change.domaine, change.before)).join(SPECIALIZATION_SEPARATOR);
    }
    if(!proposed && Array.isArray(diff.principalChanges) && diff.principalChanges.length){
      proposed = diff.principalChanges.map((change) => compactAssignmentLabel(change.domaine, change.after)).join(SPECIALIZATION_SEPARATOR);
    }
    if(!current){
      current = formatAssignmentList(diff.missingAssignments || [])
        || formatAssignmentList(diff.existingAssignments || []);
    }
    if(!proposed){
      proposed = formatAssignmentList(diff.newAssignments || [])
        || formatAssignmentList((row.normalized && row.normalized.assignments) || []);
    }
    current = current || '—';
    proposed = proposed || '—';
    if(valuesEqual(current, proposed)){
      return { current: '—', proposed: '—' };
    }
    return { current, proposed };
  }

  return {
    compactAssignmentLabel,
    compactAssignmentLabel: compactAssignmentLabel,
    formatAssignment,
    formatAssignment: formatAssignment,
    formatAssignmentList,
    formatAssignmentList: formatAssignmentList,
    formatSpecializations,
    formatOtherAffectations,
    specializationUserLabel,
    specializationUserLabel: specializationUserLabel,
    specializationCode,
    specializationCode: specializationCode,
    isAutoVlDps,
    isAutoVlDap,
    isAutoPl,
    hasActiveAutoPl,
    hasActiveAutoVlDps,
    hasActiveAutoVlDap,
    hasActiveDpsOi,
    countsInVlDpsEffectif,
    countsInPlEffectif,
    countsInVlDapEffectif,
    isEffectiveCondVlDps,
    vlDpsPriorityNote,
    evaluateAutoSpecializations,
    evaluateAutoSpecializations: evaluateAutoSpecializations,
    countsInImportPopulation,
    countsInImportPopulation: countsInImportPopulation,
    isAssignmentActiveAt,
    isAssignmentActiveAt: isAssignmentActiveAt,
    isAutoVlDps: isAutoVlDps,
    countsInVlDpsEffectif: countsInVlDpsEffectif,
    countsInImportPopulation: countsInImportPopulation,
    SPECIALIZATION_SEPARATOR,
    SPECIALIZATION_ORDER,
    SPECIALIZATION_CODE_LABELS,
    MSG_PL_PRIORITY,
    MSG_PL_WITHOUT_DPS,
    isStrictlyIdenticalPreviewRow,
    isStrictlyIdenticalPreviewRow: isStrictlyIdenticalPreviewRow,
    previewDetailRows,
    previewDetailRows: previewDetailRows,
    identityDiffFields,
    identityDiffFields: identityDiffFields,
    formatIdentitySide,
    formatIdentitySide: formatIdentitySide,
    assignmentSides,
    assignmentSides: assignmentSides
  };
});
