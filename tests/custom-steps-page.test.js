'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
function response(value, ok = true) { return { ok, status: ok ? 200 : 400, json: async () => value }; }
async function eventually(predicate) {
  for (let n = 0; n < 100; n++) { if (predicate()) return; await new Promise(r => setTimeout(r, 10)); }
  throw Error('Timed out waiting for the custom steps page');
}

test('custom steps page starts an interview, streams the agent, and refreshes saved steps', async () => {
  const html = fs.readFileSync(path.join(root, 'public/custom-steps.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://127.0.0.1:3210/custom-steps.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, sockets = [], posts = [], written = [];
  const steps = [{ id: 'custom-release-notes', title: 'Release notes', description: 'Draft release notes.', role: 'service', inputs: ['implementation'], requiresApproval: false, skill: '# Release notes', usage: { initiatives: ['Payments'], dependents: [], artifacts: 0 } }];
  w.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    if (url === '/api/bootstrap') return response({ token: 't', customSteps: true, providers: { codex: false, claude: true, opencode: false } });
    if (url === '/api/custom-steps' && method === 'GET') return response(steps);
    if (url === '/api/custom-steps/session' && method === 'GET') return response(null);
    if (url === '/api/custom-steps/session' && method === 'POST') { const body = JSON.parse(options.body); posts.push(body); return response({ id: 'session-1', provider: body.provider, request: body.request, status: 'interviewing', step: null }); }
    throw Error(`Unexpected request: ${method} ${url}`);
  };
  class MockSocket {
    constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 0); }
    send() {}
    close() { this.readyState = 3; }
  }
  MockSocket.OPEN = 1;
  w.WebSocket = MockSocket;
  w.Terminal = class { loadAddon() {} open() {} reset() {} onData() {} focus() {} write(d) { written.push(d); } };
  w.FitAddon = { FitAddon: class { fit() {} } };
  w.eval(fs.readFileSync(path.join(root, 'public/custom-steps.js'), 'utf8'));
  const $ = s => w.document.querySelector(s);

  await eventually(() => $('#custom-list').textContent.includes('Release notes'));
  assert.match($('#custom-list').textContent, /In use by initiative “Payments”/);
  assert.equal($('#custom-list button').disabled, true, 'steps used by an initiative cannot be removed');
  assert.equal($('#custom-agent').value, 'claude', 'the first installed agent is selected');
  assert.equal($('#custom-agent option[value="codex"]').disabled, true);
  assert.equal($('#custom-start').disabled, false);

  $('#custom-start').click();
  assert.match($('#custom-status').textContent, /Describe the step/);
  assert.equal(posts.length, 0);

  $('#custom-request').value = 'Check migrations';
  $('#custom-start').click();
  await eventually(() => sockets.length === 1 && sockets[0].readyState === 1);
  assert.deepEqual(posts, [{ provider: 'claude', request: 'Check migrations' }]);
  assert.match(sockets[0].url, /id=session-1&token=t/);
  assert.equal($('#custom-terminal').hidden, false);
  assert.equal($('#custom-request').disabled, true);

  sockets[0].onmessage({ data: JSON.stringify({ type: 'output', data: 'What should it produce?' }) });
  assert.deepEqual(written, ['What should it produce?']);
  sockets[0].onmessage({ data: JSON.stringify({ type: 'custom-step-rejected', error: 'The step role must be one of: service' }) });
  assert.match($('#custom-status').textContent, /rejected/);
  steps.push({ id: 'custom-migration-check', title: 'Migration check', description: 'Check migrations.', role: 'service', inputs: [], requiresApproval: true, skill: '# Check', usage: { initiatives: [], dependents: [], artifacts: 0 } });
  sockets[0].onmessage({ data: JSON.stringify({ type: 'custom-step-saved', step: { id: 'custom-migration-check', title: 'Migration check' } }) });
  assert.match($('#custom-status').textContent, /Saved “Migration check”/);
  await eventually(() => $('#custom-list').textContent.includes('Migration check'));
  sockets[0].onmessage({ data: JSON.stringify({ type: 'exit', code: 0, step: { id: 'custom-migration-check', title: 'Migration check' } }) });
  assert.equal($('#custom-start').disabled, false);
  assert.equal($('#custom-stop').disabled, true);
});
