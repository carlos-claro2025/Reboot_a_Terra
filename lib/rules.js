function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateWaterRisk(input = {}) {
  const temperature = num(input.temperature, 30);
  const humidity = clamp(num(input.humidity, 55), 0, 100);
  const rainfall = Math.max(0, num(input.rainfall, 0));
  const dryDays = Math.max(0, Math.round(num(input.dryDays ?? input.lastRainDays, 0)));
  const heatPressure = clamp((temperature - 25) * 4, 0, 40);
  const humidityPressure = clamp((60 - humidity) * 0.35, 0, 20);
  const rainRelief = clamp(rainfall * 2.5, 0, 25);
  const dryPressure = clamp(dryDays * 2.2, 0, 35);
  const score = Math.round(clamp(25 + heatPressure + humidityPressure + dryPressure - rainRelief, 0, 100));
  const level = score >= 70 ? 'alto' : score >= 40 ? 'moderado' : 'baixo';
  const recommendation = score >= 70
    ? 'Priorize o uso essencial, verifique vazamentos e regue no início da manhã.'
    : score >= 40
      ? 'Monitore o consumo e prefira irrigação curta no início da manhã ou à noite.'
      : 'Condições favoráveis. Mantenha o uso consciente e aproveite a chuva quando possível.';
  return {
    score,
    level,
    recommendation,
    explanation: [
      `Temperatura de ${temperature.toFixed(1)} °C`,
      `umidade relativa de ${humidity.toFixed(0)}%`,
      `${dryDays} dia(s) sem chuva`,
      rainfall > 0 ? `${rainfall.toFixed(1)} mm de chuva recente` : 'sem chuva significativa recente'
    ]
  };
}

function calculateConsumption(input = {}) {
  const residents = clamp(Math.round(num(input.residents, 1)), 1, 20);
  const showersPerPerson = clamp(num(input.showersPerPerson, 1), 0, 10);
  const showerMinutes = clamp(num(input.showerMinutes, 8), 1, 60);
  const flushesPerPerson = clamp(num(input.flushesPerPerson, 4), 0, 20);
  const laundryLoads = clamp(num(input.laundryLoads, 3), 0, 30);
  const dishesMinutes = clamp(num(input.dishesMinutes, 10), 0, 120);
  const gardenLiters = clamp(num(input.gardenLiters, 0), 0, 5000);
  const shower = residents * showersPerPerson * showerMinutes * 9;
  const toilet = residents * flushesPerPerson * 6;
  const laundry = laundryLoads * 120;
  const dishes = dishesMinutes * 3;
  const total = Math.round(shower + toilet + laundry + dishes + gardenLiters);
  const perResident = Math.round(total / residents);
  return {
    totalLiters: total,
    perResidentLiters: perResident,
    estimatedM3: Number((total / 1000).toFixed(2)),
    breakdown: {
      banho: Math.round(shower),
      vaso: Math.round(toilet),
      lavanderia: Math.round(laundry),
      louca: Math.round(dishes),
      jardim: Math.round(gardenLiters)
    },
    tip: perResident > 180
      ? 'Seu consumo estimado está acima da referência de 180 L por pessoa/dia.'
      : 'Seu consumo estimado está dentro de uma faixa consciente.'
  };
}

const CROP_WATER_MM = { horta: 5, gramado: 4, flores: 3, cafe: 4.5, milho: 4, soja: 4 };

function recommendIrrigation(input = {}) {
  const areaM2 = clamp(num(input.areaM2, 10), 1, 100000);
  const crop = String(input.crop || 'horta').toLowerCase();
  const soil = String(input.soil || 'media').toLowerCase();
  const temperature = num(input.temperature, 30);
  const humidity = clamp(num(input.humidity, 55), 0, 100);
  const rainDays = Math.max(0, num(input.rainDays, 0));
  const baseMm = CROP_WATER_MM[crop] || CROP_WATER_MM.horta;
  const soilFactor = soil === 'arenosa' ? 1.2 : soil === 'argilosa' ? 0.85 : 1;
  const climateFactor = clamp(1 + (temperature - 28) * 0.025 - (humidity - 55) * 0.006, 0.7, 1.4);
  const rainFactor = rainDays <= 1 ? 0.35 : rainDays <= 3 ? 0.7 : 1;
  const liters = Math.round(areaM2 * baseMm * soilFactor * climateFactor * rainFactor);
  return {
    liters,
    minutes: Math.max(5, Math.round(liters / 8)),
    frequency: rainDays <= 1 ? 'A cada 2 dias' : rainDays <= 3 ? 'A cada 3 dias' : 'Diariamente, com pouca duração',
    bestTime: 'Antes das 9h ou após as 17h',
    rationale: `Estimativa para ${areaM2} m² de ${crop}, solo ${soil}, ajustada por clima e chuva recente.`,
    warning: rainDays <= 1
      ? 'Há chuva recente: confira a umidade do solo antes de ligar.'
      : 'Evite irrigar sob sol forte para reduzir perdas por evaporação.'
  };
}

function localAssistant(message = '') {
  const text = String(message).trim().toLowerCase();
  if (!text) return 'Escreva sua dúvida sobre água, consumo, chuva ou irrigação.';
  if (text.includes('vazamento')) return 'Feche os registros e observe o hidrômetro por 15 minutos. Se continuar marcando, procure um encanador e registre o ponto na Comunidade.';
  if (text.includes('irrig') || text.includes('planta')) return 'Regue no início da manhã ou após as 17h. Use o módulo de irrigação e confira a umidade do solo.';
  if (text.includes('chuva') || text.includes('cisterna')) return 'Capte água de chuva com sistema seguro, descarte a primeira água e nunca use água não tratada para beber.';
  if (text.includes('econom') || text.includes('consumo')) return 'Banhos curtos, máquina cheia e conserto de vazamentos são ações que mais reduzem o consumo doméstico.';
  return 'Posso orientar sobre economia de água, vazamentos, chuva e irrigação.';
}

module.exports = { calculateWaterRisk, calculateConsumption, recommendIrrigation, localAssistant };
