/* SCOPE-PERSONNEL-IMPORT-UX-CLEANUP-1
   Libellés d’affectation sans répétition, preview limitée aux divergences. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelDisplay = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function clean(value){
    return String(value == null ? '' : value).trim();
  }

  function valuesEqual(a, b){
    return clean(a).toUpperCase() === clean(b).toUpperCase();
  }

  function compactAssignmentLabel(domaine, cible, extra){
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

  function formatAssignmentList(list){
    const labels = (list || []).map(formatAssignment).filter(Boolean);
    return labels.length ? labels.join(', ') : '';
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
      current = diff.principalChanges.map((change) => compactAssignmentLabel(change.domaine, change.before)).join(', ');
    }
    if(!proposed && Array.isArray(diff.principalChanges) && diff.principalChanges.length){
      proposed = diff.principalChanges.map((change) => compactAssignmentLabel(change.domaine, change.after)).join(', ');
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
    formatAssignment,
    formatAssignmentList,
    isStrictlyIdenticalPreviewRow,
    previewDetailRows,
    identityDiffFields,
    formatIdentitySide,
    assignmentSides
  };
});
