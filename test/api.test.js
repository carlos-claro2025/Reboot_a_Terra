const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchClimate, computeDaysWithoutRain } = require("../lib/climate");
const { app } = require("../server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

test("contagem de dias sem chuva conta só dias secos consecutivos no final da série", () => {
  assert.equal(computeDaysWithoutRain([4, 0, 0.3, 12]), 0);
  assert.equal(computeDaysWithoutRain([12, 0, 0.3, 0]), 3);
  assert.equal(computeDaysWithoutRain([0, 0, 0]), 3);
  assert.equal(computeDaysWithoutRain([10, 0]), 1);
  assert.equal(computeDaysWithoutRain([]), 0);
});

test("fetchClimate normaliza dados da Open-Meteo e rotule a fonte", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      current: { temperature_2m: 33.4, relative_humidity_2m: 28 },
      daily: { precipitation_sum: [5, 0, 0.5, 0] }
    })
  });
  const climate = await fetchClimate({ fetchImpl });
  assert.equal(climate.city, "Senador Canedo");
  assert.equal(climate.temperature, 33.4);
  assert.equal(climate.humidity, 28);
  assert.equal(climate.rainfall, 0);
  assert.equal(climate.daysWithoutRain, 3);
  assert.equal(climate.source, "Open-Meteo (dados abertos)");
});

test("fetchClimate falha quando a API responde com erro", async () => {
  const fetchImpl = async () => ({ ok: false, status: 500 });
  await assert.rejects(() => fetchClimate({ fetchImpl }), /erro 500/);
});

test("fetchClimate falha quando o tempo é excedido", async () => {
  const fetchImpl = (url, options) => new Promise((resolve, reject) => {
    setTimeout(() => reject(Object.assign(new Error("abortado"), { name: "AbortError" })), 50);
  });
  await assert.rejects(() => fetchClimate({ fetchImpl, timeoutMs: 10 }));
});

test("GET /api/health responde 200 com status ok", async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  } finally {
    server.close();
  }
});

test("GET /api/dashboard usa dados de demonstração quando a rede falha", async () => {
  const original = globalThis.fetch;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("rede indisponível simulada"); };
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await realFetch(`${base}/api/dashboard`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.climate.city, "Senador Canedo");
    assert.match(body.climate.source, /Demonstração educativa/);
    assert.ok(body.risk.label);
  } finally {
    globalThis.fetch = original;
    server.close();
  }
});

test("POST /api/consumption rejeita campos fora do limite com 400", async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/consumption`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ residents: 99, showers: 1 })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /moradores/);
  } finally {
    server.close();
  }
});

test("POST /api/irrigation rejeita horário inválido com 400", async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/api/irrigation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crop: "milho", temperature: 32, humidity: 30, forecastRain: 0, hour: 26 })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /Horário/);
  } finally {
    server.close();
  }
});
