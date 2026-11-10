'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const stages = [
  { id: 'discovery', title: 'Discovery & Q&A', artifacts: ['discovery'] },
  { id: 'planning', title: 'Technical plan', artifacts: ['plan', 'test-data'] },
  { id: 'implementation', title: 'Implementation PR', artifacts: ['plan', 'test-data'] },
];
const sessions = {
  A: [{ id: 'session-a', stage: 'discovery', provider: 'claude', status: 'running', created: '2026-01-01T00:00:00Z', native_id: 'native-a', cwd: '/a' }],
  B: [{ id: 'session-b', stage: 'implementation', provider: 'claude', status: 'running', created: '2026-01-02T00:00:00Z', native_id: 'native-b', cwd: '/b' }],
};
function response(value) { return { ok: true, status: 200, json: async () => value, text: async () => '' }; }
async function eventually(predicate) {
  for (let n = 0; n < 100; n++) { if (predicate()) return; await new Promise(r => setTimeout(r, 10)); }
  throw Error('Timed out waiting for the workspace UI');
}

test('switching initiatives shows the destination sessions and attaches the correct step', async () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://127.0.0.1:3210/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, sockets = [];
  const boot = { token: 'test', workflowCustomization: true, captureRecovery: true, explicitPrReview: true, stages, kinds: ['discovery','plan','test-data','implementation'], roles: [], providers: { claude: true } };
  const changes = ['A', 'B'].map(id => ({ id, title: `Initiative ${id}`, description: '' }));
  w.fetch = async url => {
    if (url === '/api/bootstrap') return response(boot);
    if (url === '/api/changes') return response(changes);
    const match = String(url).match(/^\/api\/changes\/([AB])(?:\/(.*))?$/);
    if (match) {
      const [, id, rest] = match;
      if (!rest) return response({ ...changes.find(c => c.id === id), workflow: stages.map(s => s.id), stages: [], repos: [], artifacts: [], approval: null, sessions: sessions[id] });
      if (rest === 'overlaps') return response([]);
      if (rest === 'shell') return response(null);
      if (rest.startsWith('artifacts/')) return response([]);
    }
    if (String(url).match(/^\/api\/sessions\/.*\/capture$/)) return response(null);
    throw Error(`Unexpected request: ${url}`);
  };
  class MockSocket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 0); }
    send(data) { this.sent.push(data); }
    close() { this.readyState = 3; setTimeout(() => this.onclose?.(), 0); }
  }
  w.WebSocket = MockSocket;
  w.Terminal = class { constructor() { this.options = {}; } loadAddon() {} open() {} reset() {} onData(fn) { this.input = fn; } attachCustomKeyEventHandler() {} focus() {} };
  w.FitAddon = { FitAddon: class { fit() {} } };
  w.ResizeObserver = class { observe() {} };
  w.mermaid = { initialize() {}, mermaidAPI: { defaultConfig: { secure: [] } } };
  w.DOMPurify = { sanitize: x => x };
  w.marked = { parse: x => x };
  w.eval(fs.readFileSync(path.join(root, 'public/terminal-keys.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(root, 'public/app.js'), 'utf8'));
  try {
    await eventually(() => w.document.querySelector('[data-change="A"]'));
    w.document.querySelector('[data-change="A"]').click();
    await eventually(() => w.document.querySelector('#history-list').textContent.includes('native-a'));
    w.document.querySelector('[data-tab="history"]').click();
    w.document.querySelector('[data-attach="session-a"]').click();
    await eventually(() => sockets.length === 1 && sockets[0].readyState === 1);
    w.document.querySelector('[data-tab="history"]').click();
    w.document.querySelector('[data-change="B"]').click();
    await eventually(() => w.document.querySelector('#title').textContent === 'Initiative B' && w.document.querySelector('#history-list').textContent.includes('native-b'));
    assert.equal(sockets[0].readyState, 3, 'switching initiatives detaches A');
    assert.equal(w.document.querySelector('#history-list').textContent.includes('native-a'), false);
    assert.equal(w.document.querySelector('#history').hidden, false, 'History remains visible after switching');
    w.document.querySelector('[data-attach="session-b"]').click();
    await eventually(() => sockets.length === 2 && sockets[1].readyState === 1);
    assert.match(sockets[1].url, /id=session-b/);
    assert.equal(w.document.querySelector('#stage-title').textContent, 'Implementation PR');
    assert.equal(w.document.querySelector('#handoff').hidden, false);
  } finally { dom.window.close(); }
});
