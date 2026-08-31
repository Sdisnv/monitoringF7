/* SCOPE-UX-EVENT-2 — aperçu PDF canvas (PDF.js). Le blob aperçu est le fichier téléchargé. */
(function (root) {
  'use strict';

  function viewerScriptSrc() {
    const scripts = root.document ? root.document.getElementsByTagName('script') : [];
    for (let i = scripts.length - 1; i >= 0; i -= 1) {
      const src = scripts[i].src || '';
      if (src.indexOf('scope-pdf-viewer.js') !== -1) return src;
    }
    return '';
  }

  function workerSrc() {
    const src = viewerScriptSrc();
    if (src) return new URL('../vendor/pdfjs/pdf.worker.min.js', src).href;
    return 'assets/vendor/pdfjs/pdf.worker.min.js';
  }

  function standardFontDataUrl() {
    const src = viewerScriptSrc();
    if (src) return new URL('../vendor/pdfjs/standard_fonts/', src).href;
    return 'assets/vendor/pdfjs/standard_fonts/';
  }

  let overlay = null;
  let current = { blob: null, filename: 'SCOPE_Rapport.pdf', pages: 1, sha256: '' };
  let pdfDoc = null;
  let renderTask = null;
  let page = 1;
  let zoom = 'page-width';

  function pdfjs() {
    return root.pdfjsLib;
  }

  function cancelRender() {
    if (!renderTask) return;
    try { renderTask.cancel(); } catch (_error) { /* ignore */ }
    renderTask = null;
  }

  function destroyDoc() {
    cancelRender();
    if (pdfDoc && typeof pdfDoc.destroy === 'function') {
      try { pdfDoc.destroy(); } catch (_error) { /* ignore */ }
    }
    pdfDoc = null;
  }

  function close() {
    destroyDoc();
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

  function syncButtons() {
    if (!overlay) return;
    const label = overlay.querySelector('.scope-pdf-page-label');
    const prev = overlay.querySelector('[data-pdf-prev]');
    const next = overlay.querySelector('[data-pdf-next]');
    const pages = (pdfDoc && pdfDoc.numPages) || current.pages || 1;
    if (label) label.textContent = `Page ${page} / ${pages}`;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= pages;
  }

  async function paint() {
    if (!overlay || !pdfDoc) return;
    const canvas = overlay.querySelector('.scope-pdf-canvas');
    const stage = overlay.querySelector('.scope-pdf-stage');
    if (!canvas || !stage) return;
    cancelRender();
    const pageObj = await pdfDoc.getPage(page);
    const unscaled = pageObj.getViewport({ scale: 1 });
    const available = Math.max(240, stage.clientWidth - 32);
    const fit = available / unscaled.width;
    const scale = zoom === 'page-width' ? fit : (zoom === '100' ? 1 : 1.25);
    const viewport = pageObj.getViewport({ scale });
    const context = canvas.getContext('2d', { alpha: false });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    renderTask = pageObj.render({
      canvasContext: context,
      viewport,
      background: 'rgb(255,255,255)'
    });
    try {
      await renderTask.promise;
    } catch (error) {
      if (error && error.name === 'RenderingCancelledException') return;
      throw error;
    } finally {
      renderTask = null;
    }
    syncButtons();
  }

  async function loadDocument() {
    const lib = pdfjs();
    if (!lib) {
      const stage = overlay && overlay.querySelector('.scope-pdf-stage');
      if (stage) stage.innerHTML = '<p class="scope-pdf-error">Aperçu PDF indisponible (PDF.js manquant).</p>';
      return;
    }
    lib.GlobalWorkerOptions.workerSrc = workerSrc();
    const data = new Uint8Array(await current.blob.arrayBuffer());
    destroyDoc();
    pdfDoc = await lib.getDocument({
      data,
      standardFontDataUrl: standardFontDataUrl()
    }).promise;
    current.pages = pdfDoc.numPages || 1;
    page = 1;
    await paint();
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
          <canvas class="scope-pdf-canvas" aria-label="Page du rapport PDF"></canvas>
        </div>
      </div>
    `;
    overlay.querySelector('[data-pdf-prev]').addEventListener('click', () => {
      if (page > 1) { page -= 1; paint(); }
    });
    overlay.querySelector('[data-pdf-next]').addEventListener('click', () => {
      const pages = (pdfDoc && pdfDoc.numPages) || current.pages || 1;
      if (page < pages) { page += 1; paint(); }
    });
    overlay.querySelector('[data-pdf-zoom-in]').addEventListener('click', () => {
      zoom = zoom === 'page-width' ? '100' : '125';
      paint();
    });
    overlay.querySelector('[data-pdf-zoom-out]').addEventListener('click', () => {
      zoom = 'page-width';
      paint();
    });
    overlay.querySelector('[data-pdf-download]').addEventListener('click', download);
    overlay.querySelector('[data-pdf-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.classList.add('scope-pdf-open');
    syncButtons();
    if (!current.blob) return;
    loadDocument().catch((error) => {
      const stage = overlay && overlay.querySelector('.scope-pdf-stage');
      if (stage) stage.innerHTML = `<p class="scope-pdf-error">Impossible d’afficher le PDF. Utilisez Télécharger. ${String(error && error.message || '')}</p>`;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) {
      e.preventDefault();
      close();
    }
  });

  root.ScopePdfViewer = { open, close, download };
})(typeof window !== 'undefined' ? window : globalThis);
