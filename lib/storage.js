const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const reportsFile = path.join(dataDir, 'reports.json');
let pool;
let databaseReady;

function databaseConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_PORT && process.env.DB_NAME && process.env.DB_USERNAME && process.env.DB_PASSWORD);
}

function demoReports() {
  return [
    { id: 'demo-1', type: 'vazamento', title: 'Vazamento na calçada', description: 'Água acumulando próximo à praça central.', neighborhood: 'Centro', status: 'aberto', createdAt: '2026-01-15T12:00:00.000Z', lat: -16.7085, lng: -49.0925 },
    { id: 'demo-2', type: 'falta-agua', title: 'Baixa pressão', description: 'Pressão baixa no período da manhã.', neighborhood: 'Jardim Todos os Santos', status: 'em análise', createdAt: '2026-01-16T12:00:00.000Z', lat: -16.692, lng: -49.086 }
  ];
}

function ensureDataFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(reportsFile)) fs.writeFileSync(reportsFile, JSON.stringify(demoReports(), null, 2));
}

function readLocalReports() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
}

function writeLocalReports(reports) {
  ensureDataFile();
  fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
}

async function getPool() {
  if (!databaseConfigured()) return null;
  if (!pool) {
    const pg = require('pg');
    pool = new pg.Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 5
    });
  }
  return pool;
}

async function ensureStorage() {
  const db = await getPool();
  if (!db) {
    ensureDataFile();
    return { mode: 'json' };
  }
  if (!databaseReady) {
    databaseReady = db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        neighborhood TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'aberto',
        created_at TIMESTAMPTZ NOT NULL,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION
      );
      CREATE INDEX IF NOT EXISTS reports_type_idx ON reports(type);
      CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
      CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC);
    `).then(async () => {
      const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM reports');
      if (rows[0].count === 0) {
        for (const report of demoReports()) {
          await db.query(
            `INSERT INTO reports (id,type,title,description,neighborhood,status,created_at,lat,lng)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
            [report.id, report.type, report.title, report.description, report.neighborhood, report.status, report.createdAt, report.lat, report.lng]
          );
        }
      }
    });
  }
  await databaseReady;
  return { mode: 'postgres' };
}

async function listReports(type) {
  const db = await getPool();
  if (!db) {
    const reports = readLocalReports();
    return type ? reports.filter((report) => report.type === type) : reports;
  }
  await ensureStorage();
  const result = await db.query(
    `SELECT id,type,title,description,neighborhood,status,created_at AS "createdAt",lat,lng
     FROM reports ${type ? 'WHERE type = $1' : ''} ORDER BY created_at DESC`,
    type ? [type] : []
  );
  return result.rows;
}

async function addReport(report) {
  const db = await getPool();
  if (!db) {
    writeLocalReports([report, ...readLocalReports()]);
    return report;
  }
  await ensureStorage();
  await db.query(
    `INSERT INTO reports (id,type,title,description,neighborhood,status,created_at,lat,lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [report.id, report.type, report.title, report.description, report.neighborhood, report.status, report.createdAt, report.lat, report.lng]
  );
  return report;
}

module.exports = { ensureStorage, listReports, addReport, databaseConfigured };
