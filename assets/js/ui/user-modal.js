/* Monitoring F7 v66.0 — helper UI pour modales utilisateur locales. */
(function(){
  'use strict';

  function ensure(){
    let modal = document.getElementById('f7UserLocalModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'f7UserLocalModal';
    modal.className = 'f7-user-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.display = 'none';
    modal.innerHTML = '<div class="f7-user-modal-card"><div class="f7-user-modal-head"><h3 id="f7UserLocalModalTitle">Profil local Monitoring F7</h3><button type="button" id="f7UserLocalModalClose" class="f7-user-modal-close" aria-label="Fermer">×</button></div><div id="f7UserLocalModalBody" class="f7-user-modal-body"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', event => { if(event.target === modal) close(); });
    modal.querySelector('#f7UserLocalModalClose')?.addEventListener('click', close);
    return modal;
  }

  function close(){
    const modal = document.getElementById('f7UserLocalModal');
    if(modal) modal.style.display = 'none';
  }

  function open(title, html){
    const modal = ensure();
    const titleEl = modal.querySelector('#f7UserLocalModalTitle');
    const body = modal.querySelector('#f7UserLocalModalBody');
    if(titleEl) titleEl.textContent = String(title || 'Monitoring F7');
    if(body) body.innerHTML = String(html || '');
    modal.style.display = 'flex';
    return modal;
  }

  window.MonitoringUserModal = Object.freeze({ ensure, open, close });
})();

