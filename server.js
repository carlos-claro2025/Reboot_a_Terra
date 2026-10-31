const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  calculateWaterRisk,
  calculateConsumption,
  recommendIrrigation,
  localAssistant
} = require('./lib/rules');
const { ensureStorage, listReports, addReport, databaseConfigured } = require('./lib/storage');
const { getDashboard } = require('./lib/weather');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const requestWindow = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const now = Date.now();
  const key = req.ip || 'local';
  const current = requestWindow.get(key) || { count: 0, startedAt: now };
  if (now - current.startedAt >= RATE_WINDOW_MS) {
    current.count = 0;
    current.startedAt = now;
  }
  current.count += 1;
  requestWindow.set(key, current);
  if (current.count > RATE_LIMIT) return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'canedo-agua-inteligente', mode: databaseConfigured() ? 'postgres' : 'json-local' });
});

app.get('/api/dashboard', async (_req, res, next) => {
  try { res.json(await getDashboard()); } catch (error) { next(error); }
});

app.post('/api/consumption', (req, res, next) => {
  try { res.json({ result: calculateConsumption(req.body) }); } catch (error) { next(error); }
});

app.post('/api/irrigation', (req, res, next) => {
  try {
    const area = Number(req.body?.areaM2);
    if (!Number.isFinite(area) || area < 1 || area > 100000) throw badRequest('Informe uma área entre 1 e 100.000 m².');
    res.json({ result: recommendIrrigation(req.body) });
  } catch (error) { next(error); }
});

app.get('/api/reports', async (req, res, next) => {
  try { res.json({ reports: await listReports(req.query.type ? String(req.query.type) : null) }); } catch (error) { next(error); }
});

app.post('/api/reports', (req, res, next) => {
  try {
    const { type, title, description, neighborhood, lat, lng } = req.body || {};
    if (!['vazamento', 'falta-agua', 'qualidade', 'outro'].includes(type)) throw badRequest('Tipo de relato inválido.');
    if (!title || String(title).trim().length < 5) throw badRequest('Título deve ter pelo menos 5 caracteres.');
    if (!description || String(description).trim().length < 10) throw badRequest('Descrição deve ter pelo menos 10 caracteres.');
    const latitude = lat === undefined || lat === '' ? null : Number(lat);
    const longitude = lng === undefined || lng === '' ? null : Number(lng);
    if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
        (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
      throw badRequest('Localização inválida.');
    }
    const report = {
      id: crypto.randomUUID(),
      type,
      title: String(title).trim(),
      description: String(description).trim(),
      neighborhood: String(neighborhood || 'Senador Canedo').trim(),
      status: 'aberto',
      createdAt: new Date().toISOString(),
      lat: latitude,
      lng: longitude
    };
    await addReport(report);
    res.status(201).json({ report });
  } catch (error) { next(error); }
});

app.post('/api/assistant', (req, res, next) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (message.length > 500) throw badRequest('Mensagem muito longa.');
    res.json({
      answer: localAssistant(message),
      source: 'fallback-local',
      demo: true
    });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : error.message });
});

if (require.main === module) {
  ensureStorage()
    .then(() => app.listen(PORT, () => console.log(`Canedo Água Inteligente em http://localhost:${PORT}`)))
    .catch((error) => { console.error('Falha ao inicializar persistência:', error); process.exitCode = 1; });
}

module.exports = { app, ensureStorage };
