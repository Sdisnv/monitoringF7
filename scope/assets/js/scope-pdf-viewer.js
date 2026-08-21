/* SCOPE-REPORT-1 — aperçu PDF intégré. Le blob aperçu est le fichier téléchargé. */
(function (root) {
  'use strict';

  let overlay = null;
  let objectUrl = null;
  let current = { blob: null, filename: 'SCOPE_Rapport.pdf', pages: 1, sha256: '' };
  let page = 1;
  let zoom = 'page-width';

  function revoke() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function srcFor(pageNum, zoomLevel) {
    if (!objectUrl) objectUrl = URL.createObjectURL(current.blob);
    return `${objectUrl}#page=${pageNum}&zoom=${zoomLevel}`;
  }

  function sync() {
    if (!overlay) return;
    const frame = overlay.querySelector('.scope-pdf-frame');
    const label = overlay.querySelector('.scope-pdf-page-label');
    const prev = overlay.querySelector('[data-pdf-prev]');
    const next = overlay.querySelector('[data-pdf-next]');
    if (label) label.textContent = `Page ${page} / ${current.pages || 1}`;
    if (frame) frame.src = srcFor(page, zoom);
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= (current.pages || 1);
  }

  function close() {
    revoke();
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.body.classList.remove('scope-pdf-open');
  }

  function download() {
    if (!current.blob) return;
    const url = URL.createObjectURL(current.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.filename || 'SCOPE_Rapport.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function open(payload) {
    close();
    current = {
      blob: payload.blob || (payload.buffer ? new Blob([payload.buffer], { type: 'application/pdf' }) : null),
      filename: payload.filename || 'SCOPE_Rapport.pdf',
      pages: Number(payload.pages || 1) || 1,
      sha256: payload.sha256 || ''
    };
    page = 1;
    zoom = 'page-width';
    overlay = document.createElement('div');
    overlay.className = 'scope-pdf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Aperçu du rapport PDF');
    overlay.innerHTML = `
      <div class="scope-pdf-dialog">
        <div class="scope-pdf-toolbar">
          <strong class="scope-pdf-title">${String(current.filename).replace(/[<>]/g, '')}</strong>
          <div class="scope-pdf-actions">
            <button type="button" class="scope-btn" data-pdf-prev>Page précédente</button>
            <span class="scope-pdf-page-label">Page 1 / 1</span>
            <button type="button" class="scope-btn" data-pdf-next>Page suivante</button>
            <button type="button" class="scope-btn" data-pdf-zoom-out aria-label="Réduire">−</button>
            <button type="button" class="scope-btn" data-pdf-zoom-in aria-label="Agrandir">+</button>
            <button type="button" class="scope-btn scope-btn-primary" data-pdf-download>Télécharger</button>
            <button type="button" class="scope-btn" data-pdf-close>Fermer</button>
          </div>
        </div>
        <div class="scope-pdf-stage">
          <iframe class="scope-pdf-frame" title="Aperçu PDF SCOPE"></iframe>
        </div>
      </div>
    `;
    overlay.querySelector('[data-pdf-prev]').addEventListener('click', () => { if (page > 1) { page -= 1; sync(); } });
    overlay.querySelector('[data-pdf-next]').addEventListener('click', () => { if (page < current.pages) { page += 1; sync(); } });
    overlay.querySelector('[data-pdf-zoom-in]').addEventListener('click', () => { zoom = zoom === 'page-width' ? '100' : '125'; sync(); });
    overlay.querySelector('[data-pdf-zoom-out]').addEventListener('click', () => { zoom = 'page-width'; sync(); });
    overlay.querySelector('[data-pdf-download]').addEventListener('click', download);
    overlay.querySelector('[data-pdf-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.classList.add('scope-pdf-open');
    sync();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) {
      e.preventDefault();
      close();
    }
  });

  root.ScopePdfViewer = { open, close, download };
})(typeof window !== 'undefined' ? window : globalThis);
