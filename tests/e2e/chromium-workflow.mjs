import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Opening the action popup programmatically does not grant activeTab in headless
// Chrome. Only this disposable copy receives <all_urls>; production stays unchanged.
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'snapmark-chromium-'));
const extension = path.join(temp, 'extension');
const profile = path.join(temp, 'profile');
const downloads = path.join(temp, 'downloads');
const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html style="scroll-behavior:smooth"><body style="margin:0">
    <div style="height:45px;background:#ff0000" id="top">TOP</div>
    <main style="height:3000px;background:#fff"><p id="selection">Text to capture with the context action.</p>
    <img id="image" width="60" height="60" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='green'/%3E%3C/svg%3E"></main></body></html>`);
});
await fs.cp(path.resolve('dist'), extension, { recursive: true });
await fs.mkdir(downloads, { recursive: true });
const manifestPath = path.join(extension, 'manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
assert.equal(manifest.host_permissions, undefined, 'production manifest must not grant host permissions');
manifest.host_permissions = ['<all_urls>'];
await fs.writeFile(manifestPath, JSON.stringify(manifest));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 900, height: 700 },
    acceptDownloads: true, downloadsPath: downloads,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(worker.url()).host;
  const source = await context.newPage();
  await source.goto(`http://127.0.0.1:${server.address().port}/`);
  const cdp = await context.newCDPSession(source);

  async function popupEval(expression) {
    await source.bringToFront();
    const existing = (await cdp.send('Target.getTargets')).targetInfos.find((target) => target.url === `chrome-extension://${id}/popup.html`);
    if (existing) await cdp.send('Target.closeTarget', { targetId: existing.targetId });
    await worker.evaluate(() => chrome.action.openPopup());
    let popup;
    for (let attempt = 0; attempt < 40 && !popup; attempt++) {
      popup = (await cdp.send('Target.getTargets')).targetInfos.find((target) => target.url === `chrome-extension://${id}/popup.html`);
      if (!popup) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(popup, 'extension popup should open');
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: popup.targetId, flatten: false });
    let sequence = 0;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++sequence;
      const timer = setTimeout(() => { cdp.off('Target.receivedMessageFromTarget', handler); reject(new Error('Popup CDP request timed out')); }, 5000);
      const handler = (event) => {
        if (event.sessionId !== sessionId) return;
        const result = JSON.parse(event.message);
        if (result.id !== requestId) return;
        clearTimeout(timer); cdp.off('Target.receivedMessageFromTarget', handler);
        if (result.error || result.result?.exceptionDetails) reject(new Error(JSON.stringify(result.error ?? result.result.exceptionDetails)));
        else resolve(result.result?.result?.value);
      };
      cdp.on('Target.receivedMessageFromTarget', handler);
      cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id: requestId, method, params }) }).catch(reject);
    });
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await send('Runtime.evaluate', { expression: "!!document.querySelector('#btn-capture-fullpage')", returnByValue: true })) break;
      if (attempt === 39) throw new Error('Popup did not become ready');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  }

  async function capture(expression, mode) {
    const opened = context.waitForEvent('page', { timeout: 30000 });
    // Avoid an unhandled rejection if popup setup itself fails first.
    void opened.catch(() => {});
    await popupEval(expression);
    const editor = await opened;
    await editor.waitForURL((url) => url.pathname.endsWith('/editor.html') && url.searchParams.get('mode') === mode);
    await editor.locator('#editor-canvas').waitFor({ state: 'visible' });
    await editor.waitForFunction(() => document.querySelector('#editor-canvas')?.width > 0);
    return editor;
  }

  await source.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  assert.equal(await source.evaluate(() => window.scrollY), 900);
  const editor = await capture("document.querySelector('#btn-capture-fullpage').click(); 'started'", 'fullpage');
  assert.equal(await source.evaluate(() => window.scrollY), 900, 'source scroll restored after full-page capture');
  const topPixel = await editor.locator('#editor-canvas').evaluate((canvas) => Array.from(canvas.getContext('2d').getImageData(100, 25, 1, 1).data));
  assert.ok(topPixel[0] > 200 && topPixel[1] < 60, `first captured frame should show red page top: ${topPixel}`);

  const canvas = editor.locator('#editor-canvas');
  async function drag(x1, y1, x2, y2) {
    const rect = await canvas.boundingBox();
    assert.ok(rect);
    await editor.mouse.move(rect.x + x1, rect.y + y1); await editor.mouse.down();
    await editor.mouse.move(rect.x + x2, rect.y + y2, { steps: 4 }); await editor.mouse.up();
  }
  async function sample(x, y) {
    return await canvas.evaluate((element, point) => {
      const scale = element.width / element.getBoundingClientRect().width;
      return Array.from(element.getContext('2d').getImageData(Math.round(point.x * scale), Math.round(point.y * scale), 1, 1).data);
    }, { x, y });
  }
  async function bluePixelsNear(x, y) {
    return await canvas.evaluate((element, point) => {
      const scale = element.width / element.getBoundingClientRect().width;
      const size = Math.round(20 * scale);
      const data = element.getContext('2d').getImageData(Math.round((point.x - 10) * scale), Math.round((point.y - 10) * scale), size, size).data;
      let blue = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 130 && data[i + 1] > 70 && data[i + 2] > 180) blue++;
      return blue;
    }, { x, y });
  }
  const arrowBefore = await sample(165, 125);
  await drag(70, 100, 260, 150);
  assert.notDeepEqual(await sample(165, 125), arrowBefore, 'arrow must change pixels on its shaft');
  await editor.locator('#tool-line').click();
  const lineBefore = await sample(170, 210);
  await drag(70, 210, 270, 210);
  assert.notDeepEqual(await sample(170, 210), lineBefore, 'line must change pixels on its shaft');
  assert.ok(await bluePixelsNear(270, 210) > 0, 'selected line must show a blue endpoint handle');
  await canvas.click({ position: { x: 25, y: 270 } });
  assert.equal(await bluePixelsNear(270, 210), 0, 'empty click must remove the endpoint handle');
  await editor.locator('#tool-text').click();
  await canvas.click({ position: { x: 100, y: 300 } });
  const text = editor.locator('#active-text-input');
  await text.waitFor({ state: 'visible' });
  await text.fill('Tekst Chromium');
  await text.press('Enter');
  await canvas.dblclick({ position: { x: 110, y: 310 } });
  await editor.locator('#active-text-input').waitFor({ state: 'visible' });
  assert.equal(await editor.locator('#active-text-input').inputValue(), 'Tekst Chromium');
  await editor.locator('#active-text-input').fill('Tekst poprawiony');
  await editor.locator('#active-text-input').press('Enter');
  // Inject an API rejection in this test page to exercise the failure UI without
  // changing real browser settings or writing to a user's download directory.
  await editor.evaluate(() => {
    window.originalDownload = chrome.downloads.download;
    chrome.downloads.download = async () => { throw new Error('test failure'); };
  });
  await editor.locator('#btn-download-png').click();
  await editor.locator('#download-status').filter({ hasText: 'Failed to download PNG' }).waitFor({ state: 'visible' });
  assert.equal(editor.isClosed(), false, 'failed download must leave the editor open');
  assert.notDeepEqual(await sample(165, 125), arrowBefore, 'arrow must survive download failure');
  assert.notDeepEqual(await sample(170, 210), lineBefore, 'line must survive download failure');
  await canvas.dblclick({ position: { x: 110, y: 310 } });
  await editor.locator('#active-text-input').waitFor({ state: 'visible' });
  assert.equal(await editor.locator('#active-text-input').inputValue(), 'Tekst poprawiony', 'text must survive download failure');
  await editor.locator('#active-text-input').press('Enter');
  await editor.evaluate(() => { chrome.downloads.download = window.originalDownload; });
  const closed = editor.waitForEvent('close', { timeout: 15000 });
  await editor.locator('#btn-download-png').click();
  await closed;
  const downloaded = await worker.evaluate(() => chrome.downloads.search({}));
  const finished = downloaded.find((item) => item.state === 'complete');
  assert.ok(finished, 'PNG completion must be recorded');
  const png = await fs.readFile(finished.filename);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'download must be a PNG');
  const exportedPixels = await source.evaluate(async (base64) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const scale = image.width / 900;
    const pixels = [[165, 125], [170, 210]].map(([x, y]) => Array.from(ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data));
    const textRegion = ctx.getImageData(Math.round(90 * scale), Math.round(290 * scale), Math.round(180 * scale), Math.round(60 * scale)).data;
    let nonwhite = 0;
    for (let i = 0; i < textRegion.length; i += 4) if (textRegion[i] < 200 || textRegion[i + 1] < 200 || textRegion[i + 2] < 200) nonwhite++;
    return { pixels, nonwhite };
  }, png.toString('base64'));
  assert.notDeepEqual(exportedPixels.pixels[0], arrowBefore, 'exported PNG must contain the arrow');
  assert.notDeepEqual(exportedPixels.pixels[1], lineBefore, 'exported PNG must contain the line');
  assert.ok(exportedPixels.nonwhite > 50, 'exported PNG must contain the text annotation');
  console.log('[Chromium] Full-page top, scroll restoration, annotations, text edit and completed-download tab closure passed.');

  const viewport = await capture("document.querySelector('#btn-capture-viewport').click(); 'started'", 'viewport');
  await Promise.all([viewport.waitForEvent('close'), viewport.locator('#btn-close-editor').click()]);
  console.log('[Chromium] Viewport capture and explicit tab closure passed.');

  await source.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const areaOpened = context.waitForEvent('page', { timeout: 15000 });
  await popupEval("document.querySelector('#btn-capture-selection').click(); 'started'");
  await source.locator('[data-snapmark-area-overlay]').waitFor({ state: 'visible' });
  await source.mouse.move(100, 100); await source.mouse.down(); await source.mouse.move(250, 220, { steps: 4 }); await source.mouse.up();
  const area = await areaOpened;
  await area.waitForURL((url) => url.searchParams.get('mode') === 'selection');
  await area.locator('#editor-canvas').waitFor({ state: 'visible' });
  await Promise.all([area.waitForEvent('close'), area.locator('#btn-close-editor').click()]);
  console.log('[Chromium] Interactive area selection passed.');

  await popupEval("document.querySelector('#btn-capture-selection').click(); 'started'");
  await source.locator('[data-snapmark-area-overlay]').waitFor({ state: 'visible' });
  await source.keyboard.press('Escape');
  await source.locator('[data-snapmark-area-overlay]').waitFor({ state: 'detached' });
  console.log('[Chromium] Interactive area cancellation passed.');

  await source.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  const pageCount = context.pages().length;
  await popupEval(`(async () => {
    document.querySelector('#btn-capture-fullpage').click();
    for (let i = 0; i < 30; i++) {
      if (document.querySelector('#scroll-progress-text')?.textContent.includes('Frame 1 of')) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    document.querySelector('#btn-cancel-scroll').click();
    return 'cancelled';
  })()`);
  await source.waitForFunction(() => window.scrollY === 900 && !document.querySelector('[data-snapmark-scroll-style]'), null, { timeout: 10000 });
  assert.equal(context.pages().length, pageCount, 'cancelled full-page capture must not open an editor');
  console.log('[Chromium] Full-page cancellation and scroll restoration passed.');

  // Simulate a capture API error in the real worker and verify cleanup on-page.
  await worker.evaluate(() => {
    globalThis.originalCaptureVisibleTab = chrome.tabs.captureVisibleTab;
    chrome.tabs.captureVisibleTab = async () => { throw new Error('synthetic capture failure'); };
  });
  const failure = JSON.parse(await popupEval("(async () => JSON.stringify(await chrome.runtime.sendMessage({type:'SNAPMARK_TRIGGER_CAPTURE',mode:'fullpage'})))()"));
  assert.equal(failure.ok, false);
  assert.match(failure.error, /synthetic capture failure/);
  await source.waitForFunction(() => window.scrollY === 900 && !document.querySelector('[data-snapmark-scroll-style]'), null, { timeout: 10000 });
  await worker.evaluate(() => { chrome.tabs.captureVisibleTab = globalThis.originalCaptureVisibleTab; });
  console.log('[Chromium] Full-page error cleanup and scroll restoration passed (API error injected).');

  await source.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await source.evaluate(() => { const node = document.querySelector('#selection').firstChild; const range = document.createRange(); range.selectNodeContents(node); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); });
  const textCapture = await capture("chrome.runtime.sendMessage({type:'SNAPMARK_TRIGGER_CAPTURE',mode:'selection',interactiveArea:false}); 'started'", 'selection');
  await Promise.all([textCapture.waitForEvent('close'), textCapture.locator('#btn-close-editor').click()]);
  const imageSrc = await source.locator('#image').getAttribute('src');
  const imageCapture = await capture(`chrome.runtime.sendMessage({type:'SNAPMARK_TRIGGER_CAPTURE',mode:'image',srcUrl:${JSON.stringify(imageSrc)}}); 'started'`, 'image');
  await Promise.all([imageCapture.waitForEvent('close'), imageCapture.locator('#btn-close-editor').click()]);
  console.log('[Chromium] Text selection and image capture handlers passed.');

  const empty = await context.newPage();
  await empty.goto(`chrome-extension://${id}/editor.html?state=empty`);
  await empty.locator('#editor-empty-state').waitFor({ state: 'visible' });
  await empty.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 10; canvas.height = 10;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'paste.png', { type: 'image/png' }));
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });
  await empty.locator('#editor-canvas').waitFor({ state: 'visible' });
  await empty.close();
  console.log('[Chromium] Synthetic clipboard-image paste passed (system clipboard untouched).');
} finally {
  if (context) await context.close();
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
