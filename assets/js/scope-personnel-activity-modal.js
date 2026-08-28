/* SCOPE-PERSONNEL-STATUS-UX-2A — modale unique Gérer l’activité. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelActivityModal = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function clean(value){
    return String(value == null ? '' : value).trim();
  }

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function canConfirm(modal){
    if(!modal || modal.busy) return false;
    if(modal.mode === 'correct') return Boolean(clean(modal.date));
    if(modal.operation !== 'assignment' && modal.operation !== 'resignation') return false;
    if(!clean(modal.date)) return false;
    if(modal.operation === 'assignment'){
      const list = modal.affectations || [];
      if(!list.length) return false;
      if(list.length > 1 && !clean(modal.affectationId)) return false;
    }
    return true;
  }

  function close(){
    return null;
  }

  function selectOperation(modal, operation){
    const next = Object.assign({}, modal || {}, { operation: operation, error: '' });
    const list = next.affectations || [];
    if(operation === 'assignment' && list.length === 1){
      next.affectationId = list[0].id;
    }
    if(operation !== 'assignment') next.affectationId = '';
    return next;
  }

  function beginSubmit(modal){
    if(!canConfirm(modal)) return modal;
    if(modal.busy) return modal;
    return Object.assign({}, modal, { busy: true, error: '' });
  }

  function failSubmit(modal, message){
    return Object.assign({}, modal || {}, { busy: false, error: clean(message) || 'L’opération n’a pas pu être enregistrée.' });
  }

  function resolvedAffectationId(modal){
    const list = (modal && modal.affectations) || [];
    if(modal && modal.affectationId) return modal.affectationId;
    if(list.length === 1) return list[0].id;
    return '';
  }

  function confirmBody(modal){
    if(!canConfirm(modal) || (modal && modal.busy)) return null;
    const resignation = modal.mode !== 'correct' && modal.operation === 'resignation';
    return {
      personneId: modal.id,
      dateInactivite: modal.date,
      dateEffet: modal.date,
      commentaire: modal.comment || '',
      action: modal.mode === 'correct' ? 'correct' : (resignation ? 'inactivate' : 'close_assignment'),
      operation: modal.mode === 'correct' ? '' : (resignation ? 'RESIGNATION' : 'ASSIGNMENT'),
      affectationId: resignation || modal.mode === 'correct' ? undefined : resolvedAffectationId(modal)
    };
  }

  function actionCard(id, title, hint, selected, busy){
    return `<button type="button" class="scope-activity-card${selected ? ' is-selected' : ''}" data-activity-op="${escapeHtml(id)}" role="radio" aria-checked="${selected ? 'true' : 'false'}" ${busy ? 'disabled' : ''}>
      <span class="scope-activity-card-radio" aria-hidden="true"></span>
      <span class="scope-activity-card-text">
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(hint)}</em>
      </span>
    </button>`;
  }

  function render(modal){
    if(!modal) return '';
    const busy = Boolean(modal.busy);
    const confirmEnabled = canConfirm(modal);
    const identity = escapeHtml(modal.label || '—');
    const meta = [modal.nip ? `NIP ${modal.nip}` : '', modal.oiLabel || '']
      .filter(Boolean)
      .map(escapeHtml)
      .join(' · ');
    const error = modal.error
      ? `<p class="scope-activity-error" role="alert">${escapeHtml(modal.error)}</p>`
      : '';
    const closeBtn = `<button type="button" class="scope-activity-x" data-activity-cancel aria-label="Fermer">×</button>`;

    if(modal.mode === 'correct'){
      return `<div class="scope-activity-overlay" id="scope-activity-modal" data-activity-overlay>
        <div class="scope-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-activity-title">
          <header class="scope-activity-head">
            <h3 id="scope-activity-title">Corriger l’inactivité</h3>
            ${closeBtn}
          </header>
          <p class="scope-activity-identity"><strong>${identity}</strong>${meta ? `<span>${meta}</span>` : ''}</p>
          <div class="scope-activity-fields">
            <label for="scope-activity-date">Date d’effet</label>
            <input id="scope-activity-date" class="scope-activity-date" type="date" value="${escapeHtml(modal.date || '')}" ${busy ? 'disabled' : ''}>
            <p class="scope-activity-hint">À partir de cette date, la personne ne sera plus comptée dans les effectifs concernés.</p>
            <label for="scope-activity-comment">Commentaire</label>
            <textarea id="scope-activity-comment" rows="2" placeholder="Facultatif" ${busy ? 'disabled' : ''}>${escapeHtml(modal.comment || '')}</textarea>
          </div>
          ${error}
          <footer class="scope-activity-footer">
            <button type="button" class="scope-btn" data-activity-cancel ${busy ? 'disabled' : ''}>Annuler</button>
            <button type="button" class="scope-btn scope-btn-primary" data-activity-confirm ${confirmEnabled ? '' : 'disabled'}>${busy ? 'Enregistrement…' : 'Confirmer'}</button>
          </footer>
        </div>
      </div>`;
    }

    const assignments = modal.affectations || [];
    const showFields = modal.operation === 'assignment' || modal.operation === 'resignation';
    const showAssignmentPick = modal.operation === 'assignment' && assignments.length > 1;
    const onlyAssignment = modal.operation === 'assignment' && assignments.length === 1 ? assignments[0] : null;
    const fields = !showFields ? '' : `<div class="scope-activity-fields">
      ${modal.operation === 'resignation' ? `<p class="scope-activity-hint">Cette action clôturera l’ensemble des affectations actives de cette personne à la date indiquée.</p>` : ''}
      ${modal.operation === 'assignment' && !assignments.length ? `<p class="scope-activity-hint">Aucune affectation active à clôturer.</p>` : ''}
      ${onlyAssignment ? `<p class="scope-activity-hint">Affectation concernée : ${escapeHtml(onlyAssignment.label)}</p>` : ''}
      ${showAssignmentPick ? `<fieldset class="scope-activity-affs"><legend>Affectation</legend>${assignments.map((aff) => `<label class="scope-activity-aff"><input type="radio" name="scope-activity-aff" value="${escapeHtml(aff.id)}" ${String(modal.affectationId) === String(aff.id) ? 'checked' : ''} ${busy ? 'disabled' : ''}> ${escapeHtml(aff.label)}</label>`).join('')}</fieldset>` : ''}
      <label for="scope-activity-date">Date d’effet</label>
      <input id="scope-activity-date" class="scope-activity-date" type="date" value="${escapeHtml(modal.date || '')}" ${busy ? 'disabled' : ''}>
      <p class="scope-activity-hint">À partir de cette date, la personne ne sera plus comptée dans les effectifs concernés.</p>
      <label for="scope-activity-comment">Commentaire</label>
      <textarea id="scope-activity-comment" rows="2" placeholder="Facultatif" ${busy ? 'disabled' : ''}>${escapeHtml(modal.comment || '')}</textarea>
    </div>`;

    return `<div class="scope-activity-overlay" id="scope-activity-modal" data-activity-overlay>
      <div class="scope-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-activity-title">
        <header class="scope-activity-head">
          <h3 id="scope-activity-title">Gérer l’activité</h3>
          ${closeBtn}
        </header>
        <p class="scope-activity-identity"><strong>${identity}</strong>${meta ? `<span>${meta}</span>` : ''}</p>
        <p class="scope-activity-question" id="scope-activity-question">Que souhaitez-vous faire ?</p>
        <div class="scope-activity-cards" role="radiogroup" aria-labelledby="scope-activity-question">
          ${actionCard('assignment', 'Clôturer une affectation', 'Mettre fin à une affectation sans quitter le SDIS.', modal.operation === 'assignment', busy)}
          ${actionCard('resignation', 'Démission du SDIS', 'Mettre fin à l’ensemble de l’activité au sein du SDIS.', modal.operation === 'resignation', busy)}
        </div>
        ${fields}
        ${error}
        <footer class="scope-activity-footer">
          <button type="button" class="scope-btn" data-activity-cancel ${busy ? 'disabled' : ''}>Annuler</button>
          <button type="button" class="scope-btn scope-btn-primary" data-activity-confirm ${confirmEnabled ? '' : 'disabled'}>${busy ? 'Enregistrement…' : 'Confirmer'}</button>
        </footer>
      </div>
    </div>`;
  }

  return {
    canConfirm,
    close,
    selectOperation,
    beginSubmit,
    failSubmit,
    confirmBody,
    render,
    escapeHtml
  };
});
