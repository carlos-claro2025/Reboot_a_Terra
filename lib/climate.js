"use strict";

/**
 * Integração com a API gratuita Open-Meteo (dados abertos, sem chave).
 * A API não requer autenticação e é usada para trazer dados reais de tempo
 * para Senador Canedo-GO, com fallback para dados de demonstração no servidor.
 */

const SITE = {
  city: "Senador Canedo",
  latitude: -16.708,
  longitude: -49.091,
  timezone: "America/Sao_Paulo"
};

/** Um dia é considerado seco quando a precipitação acumulada fica abaixo desse valor (mm). */
const DRY_DAY_MM = 1;

/** Contagem de dias consecutivos sem chuva a partir da extremidade da série (hoje em diante). */
function computeDaysWithoutRain(precipitationSums) {
  const series = (precipitationSums || []).map((value) => Number(value));
  let dryStreak = 0;
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index];
    if (!Number.isFinite(value) || value < DRY_DAY_MM) {
      dryStreak += 1;
      continue;
    }
    break;
  }
  return dryStreak;
}

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Busca dados climáticos reais para a região e normaliza para o formato usado
 * pelo dashboard.
 *
 * @param {object} [options]
 * @param {string} [options.city]
 * @param {number} [options.latitude]
 * @param {number} [options.longitude]
 * @param {number} [options.timeoutMs] tempo máximo de espera pela rede (padrão 5s).
 * @param {Function} [options.fetchImpl] implementação de fetch (testes podem injetar).
 * @throws {Error} quando a rede falha, o tempo expira ou a API responde com erro.
 */
async function fetchClimate({
  city = SITE.city,
  latitude = SITE.latitude,
  longitude = SITE.longitude,
  timezone = SITE.timezone,
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch não está disponível neste ambiente.");
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("past_days", "7");
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m");
  url.searchParams.set("daily", "precipitation_sum");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response || !response.ok) {
      const status = response && response.status;
      throw new Error(`Open-Meteo respondeu com erro ${status || "desconhecido"}.`);
    }

    const payload = await response.json();
    const current = (payload && payload.current) || {};
    const daily = (payload && payload.daily) || {};
    const precipitation = daily.precipitation_sum || [];

    const rainfall = round1(toFiniteNumber(precipitation[precipitation.length - 1], 0));

    return {
      city,
      source: "Open-Meteo (dados abertos)",
      temperature: round1(toFiniteNumber(current.temperature_2m, 0)),
      humidity: Math.round(toFiniteNumber(current.relative_humidity_2m, 0)),
      rainfall,
      daysWithoutRain: computeDaysWithoutRain(precipitation),
      forecastRain: Math.round(rainfall),
      fetchedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { SITE, fetchClimate, computeDaysWithoutRain };
