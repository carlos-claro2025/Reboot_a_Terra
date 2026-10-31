const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());
test.after(() => {
  const file = path.join(__dirname, '..', 'data', 'reports.json');
  if (!fs.existsSync(file)) return;
  const reports = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(reports.filter((report) => report.title !== 'Teste automatizado'), null, 2));
});

test('health endpoint returns service status', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test('rejects invalid community report', async () => {
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'vazamento', title: 'curto', description: 'curta' })
  });
  assert.equal(response.status, 400);
});

test('accepts a report with valid coordinates', async () => {
  const response = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'outro',
      title: 'Teste automatizado',
      description: 'Relato criado somente durante o teste automatizado.',
      neighborhood: 'Centro',
      lat: -16.7,
      lng: -49.09
    })
  });
  assert.equal(response.status, 201);
  const { report } = await response.json();
  assert.equal(report.lat, -16.7);
  assert.equal(report.lng, -49.09);
});
