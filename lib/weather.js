const { calculateWaterRisk } = require('./rules');

const latitude = Number(process.env.WEATHER_LATITUDE || -16.7085);
const longitude = Number(process.env.WEATHER_LONGITUDE || -49.0925);
let cache = { expiresAt: 0, value: null };

function demoDashboard() {
  const conditions = { temperature: 31, humidity: 48, rainfall: 0, dryDays: 0 };
  return { city: 'Senador Canedo-GO', demo: true, source: 'dados demonstrativos (API indisponível)', updatedAt: new Date().toISOString(), conditions, risk: calculateWaterRisk(conditions) };
}

async function getDashboard() {
  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,rain&daily=precipitation_sum&timezone=America%2FSao_Paulo&forecast_days=8`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`weather status ${response.status}`);
    const data = await response.json();
    const rainfall = Number(data.current?.rain || 0);
    const dailyRain = Array.isArray(data.daily?.precipitation_sum) ? data.daily.precipitation_sum : [];
    let dryDays = 0;
    for (let index = dailyRain.length - 1; index >= 0; index -= 1) {
      if (Number(dailyRain[index]) > 1) break;
      dryDays += 1;
    }
    const conditions = {
      temperature: Number(data.current?.temperature_2m ?? 31),
      humidity: Number(data.current?.relative_humidity_2m ?? 48),
      rainfall,
      dryDays
    };
    const value = { city: 'Senador Canedo-GO', demo: false, source: 'Open-Meteo', updatedAt: new Date().toISOString(), conditions, risk: calculateWaterRisk(conditions) };
    cache = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
    return value;
  } catch {
    return demoDashboard();
  }
}

module.exports = { getDashboard };
