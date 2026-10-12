'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const pdfjs = require('pdfjs-dist/build/pdf.js');
const { generateQuoVadisProgrammeReport } = require('../netlify/lib/_scope-report-service');
const { claims, options, exportPayload } = require('./scope-qv-roadmap-export-proof');

async function readPages(buffer) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer),
    useSystemFonts: true, verbosity: 0 }).promise;
  try {
    const pages = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      pages.push({ view: page.view, items: (await page.getTextContent()).items.filter((item) => item.str) });
    }
    return pages;
  } finally {
    await document.destroy();
  }
}

function itemFor(page, value) {
  const item = page.items.find((item) => item.str === value);
  assert.ok(item, `PDF text missing: ${value}`);
  return item;
}

for (const mode of ['annual', 'compact', 'monthly']) {
  test(`QV-EXPORT-001 ${mode}: exact occurrence title then theme on the next line`, async () => {
    const payload = exportPayload(mode, [' ', ' Base ', '', null]);
    const before = structuredClone(payload);
    const result = await generateQuoVadisProgrammeReport(null, payload, claims, options);
    const pages = await readPages(result.buffer);
    assert.equal(pages.length, 1);
    const title = itemFor(pages[0], 'Exercice PR 1.1');
    const theme = itemFor(pages[0], 'Base');
    assert.equal(title.transform[4], theme.transform[4]);
    const lineGap = title.transform[5] - theme.transform[5];
    assert.ok(lineGap > 0 && lineGap < 12, `Theme must immediately follow title (${lineGap})`);
    assert.deepEqual(payload, before);
    assert.equal(result.pages, pages.length);
    assert.equal(result.meta.rows, payload.rows.length);
    assert.equal(result.sha256, crypto.createHash('sha256').update(result.buffer).digest('hex'));
    assert.equal(result.filename, mode === 'monthly' ? 'SCOPE_QUO_VADIS_2027-04_Planning_mensuel.pdf'
      : mode === 'compact' ? 'SCOPE_QUO_VADIS_2027_Liste_compacte.pdf'
        : 'SCOPE_QUO_VADIS_2027_Planning_annuel.pdf');
    assert.ok(Math.abs(pages[0].view[2] - (mode === 'monthly' ? 595.28 : 841.89)) < 0.01);
    assert.ok(Math.abs(pages[0].view[3] - (mode === 'monthly' ? 841.89 : 595.28)) < 0.01);
  });

  test(`QV-EXPORT-001 ${mode}: blank or absent themes keep a single title line`, async () => {
    const payload = exportPayload(mode, [' ', '', null]);
    payload.rows.push({ ...payload.rows[0], activite: 'Exercice PR 1.2' });
    delete payload.rows[1].themes;
    const result = await generateQuoVadisProgrammeReport(null, payload, claims, options);
    const pages = await readPages(result.buffer);
    const first = itemFor(pages[0], 'Exercice PR 1.1');
    const second = itemFor(pages[0], 'Exercice PR 1.2');
    assert.equal(first.transform[4], second.transform[4]);
    const rowGap = first.transform[5] - second.transform[5];
    assert.ok(rowGap > 0 && rowGap <= (mode === 'monthly' ? 35.01 : 17.01), `Unexpected blank theme line (${rowGap})`);
    assert.ok(!pages[0].items.some((item) => item.str === 'Base' || /^Exercice PR 1\.[12]\s+[-·]/.test(item.str)));
    assert.equal(result.meta.rows, 2);
  });
}

test('QV-EXPORT-001: explicit themes preserve session suffixes and separators already in the title', async () => {
  const payload = exportPayload('annual', [' Base ', '', 'Consolidation 2']);
  payload.rows[0].activite = 'Exercice PR 1.6 · matin';
  const pages = await readPages((await generateQuoVadisProgrammeReport(null, payload, claims, options)).buffer);
  const title = itemFor(pages[0], payload.rows[0].activite);
  const theme = itemFor(pages[0], 'Base · Consolidation 2');
  assert.equal(title.transform[4], theme.transform[4]);
  assert.ok(title.transform[5] > theme.transform[5]);
});

test('QV-EXPORT-001: the existing pagination keeps each title and theme together', async () => {
  const payload = exportPayload();
  const row = payload.rows[0];
  payload.rows = Array.from({ length: 40 }, (_, index) => ({ ...row,
    id: `QV-EXPORT-001:${index}`, activite: `Exercice PR 1.${index + 1}`, themes: [`Base ${index + 1}`] }));
  const before = structuredClone(payload);
  const result = await generateQuoVadisProgrammeReport(null, payload, claims, options);
  const pages = await readPages(result.buffer);
  assert.ok(pages.length > 1);
  for (const row of payload.rows) {
    const page = pages.find((page) => page.items.some((item) => item.str === row.activite));
    assert.ok(page, row.activite);
    const title = itemFor(page, row.activite);
    const theme = itemFor(page, row.themes[0]);
    assert.equal(title.transform[4], theme.transform[4]);
    assert.ok(title.transform[5] > theme.transform[5]);
  }
  assert.equal(result.pages, pages.length);
  assert.equal(result.meta.rows, payload.rows.length);
  assert.deepEqual(payload, before);
});
