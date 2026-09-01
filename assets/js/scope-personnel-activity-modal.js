/* SCOPE-PERSONNEL-STATUS-UX-2A / DESIGN-B2 — modale unique Gérer l’activité. */
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

  function sabbaticalActive(modal){
    return Boolean(modal && modal.sabbatical && modal.sabbatical.active === true);
  }

  function sabbaticalStart(modal){
    const leave = modal && modal.sabbatical;
    return clean(leave && (leave.dateDebut || leave.date_debut));
  }

  function canConfirm(modal){
    if(!modal || modal.busy) return false;
    if(modal.mode === 'correct') return Boolean(clean(modal.date));
    if(modal.operation === 'sabbatical'){
      const from = clean(modal.dateDebut);
      const to = clean(modal.dateFin);
      return Boolean(from && to && to >= from);
    }
    if(modal.operation === 'end_sabbatical'){
      const end = clean(modal.date);
      const start = sabbaticalStart(modal);
      if(!end) return false;
      if(start && end < start) return false;
      return Boolean(modal.sabbatical && (modal.sabbatical.id || modal.sabbatical.periodeId));
    }
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
    if(modal.operation === 'sabbatical'){
      return {
        personneId: modal.id,
        action: 'sabbatical',
        dateDebut: modal.dateDebut,
        dateFin: modal.dateFin,
        commentaire: modal.comment || ''
      };
    }
    if(modal.operation === 'end_sabbatical'){
      const leave = modal.sabbatical || {};
      return {
        personneId: modal.id,
        action: 'end_sabbatical',
        periodeId: leave.id || leave.periodeId || leave.periode_id,
        dateFin: modal.date,
        commentaire: modal.comment || ''
      };
    }
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

  function confirmLabel(modal){
    if(modal && modal.busy) return 'Enregistrement…';
    if(modal && modal.operation === 'sabbatical') return 'Confirmer le congé';
    if(modal && modal.operation === 'end_sabbatical') return 'Terminer le congé';
    return 'Confirmer';
  }

  function actionCard(id, title, hint, selected, busy, extraClass){
    return `<button type="button" class="scope-activity-card${selected ? ' is-selected' : ''}${extraClass ? ` ${extraClass}` : ''}" data-activity-op="${escapeHtml(id)}" role="radio" aria-checked="${selected ? 'true' : 'false'}" ${busy ? 'disabled' : ''}>
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
    const confirmClass = modal.operation === 'resignation' ? 'scope-btn scope-btn-danger' : 'scope-btn scope-btn-primary';

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

    const onLeave = sabbaticalActive(modal);
    const assignments = modal.affectations || [];
    const showAssignmentFields = modal.operation === 'assignment' || modal.operation === 'resignation';
    const showSabbaticalFields = modal.operation === 'sabbatical';
    const showEndFields = modal.operation === 'end_sabbatical';
    const showAssignmentPick = modal.operation === 'assignment' && assignments.length > 1;
    const onlyAssignment = modal.operation === 'assignment' && assignments.length === 1 ? assignments[0] : null;
    const assignmentFields = !showAssignmentFields ? '' : `<div class="scope-activity-fields">
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
    const sabbaticalFields = !showSabbaticalFields ? '' : `<div class="scope-activity-fields">
      <label for="scope-activity-date-from">DU</label>
      <input id="scope-activity-date-from" class="scope-activity-date" type="date" value="${escapeHtml(modal.dateDebut || '')}" ${busy ? 'disabled' : ''} required>
      <label for="scope-activity-date-to">AU</label>
      <input id="scope-activity-date-to" class="scope-activity-date" type="date" value="${escapeHtml(modal.dateFin || '')}" ${busy ? 'disabled' : ''} required>
      <label for="scope-activity-comment">Commentaire</label>
      <textarea id="scope-activity-comment" rows="2" placeholder="Facultatif" ${busy ? 'disabled' : ''}>${escapeHtml(modal.comment || '')}</textarea>
    </div>`;
    const endFields = !showEndFields ? '' : `<div class="scope-activity-fields">
      <label for="scope-activity-date">DATE DE FIN</label>
      <input id="scope-activity-date" class="scope-activity-date" type="date" value="${escapeHtml(modal.date || '')}" ${busy ? 'disabled' : ''} required>
      <label for="scope-activity-comment">Commentaire</label>
      <textarea id="scope-activity-comment" rows="2" placeholder="Facultatif" ${busy ? 'disabled' : ''}>${escapeHtml(modal.comment || '')}</textarea>
    </div>`;

    const cards = onLeave
      ? [
          actionCard('end_sabbatical', 'Terminer le congé sabbatique', 'Reprendre l’activité sans clôturer les affectations.', modal.operation === 'end_sabbatical', busy, 'scope-activity-card-end-leave'),
          actionCard('assignment', 'Clôturer une affectation', 'Mettre fin à une affectation sans quitter le SDIS.', modal.operation === 'assignment', busy),
          actionCard('resignation', 'Démission du SDIS', 'Mettre fin à l’ensemble de l’activité au sein du SDIS.', modal.operation === 'resignation', busy, 'scope-activity-card-danger')
        ].join('')
      : [
          actionCard('assignment', 'Clôturer une affectation', 'Mettre fin à une affectation sans quitter le SDIS.', modal.operation === 'assignment', busy),
          actionCard('sabbatical', 'Congé sabbatique', 'Suspendre temporairement l’activité sans clôturer les affectations.', modal.operation === 'sabbatical', busy),
          actionCard('resignation', 'Démission du SDIS', 'Mettre fin à l’ensemble de l’activité au sein du SDIS.', modal.operation === 'resignation', busy, 'scope-activity-card-danger')
        ].join('');

    return `<div class="scope-activity-overlay" id="scope-activity-modal" data-activity-overlay>
      <div class="scope-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-activity-title">
        <header class="scope-activity-head">
          <h3 id="scope-activity-title">Gérer l’activité</h3>
          ${closeBtn}
        </header>
        <p class="scope-activity-identity"><strong>${identity}</strong>${meta ? `<span>${meta}</span>` : ''}</p>
        <p class="scope-activity-question" id="scope-activity-question">Que souhaitez-vous faire ?</p>
        <div class="scope-activity-cards" role="radiogroup" aria-labelledby="scope-activity-question">
          ${cards}
        </div>
        ${assignmentFields}${sabbaticalFields}${endFields}
        ${error}
        <footer class="scope-activity-footer">
          <button type="button" class="scope-btn" data-activity-cancel ${busy ? 'disabled' : ''}>Annuler</button>
          <button type="button" class="${confirmClass}" data-activity-confirm ${confirmEnabled ? '' : 'disabled'}>${escapeHtml(confirmLabel(modal))}</button>
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
