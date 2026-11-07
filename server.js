const express = require("express");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const reportsFile = path.join(dataDir, "reports.json");

app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname, "public")));

const demoClimate = {
  city: "Senador Canedo",
  source: "Demonstração educativa — dados simulados",
  temperature: 35,
  humidity: 31,
  rainfall: 4,
  daysWithoutRain: 9,
  forecastRain: 2
};

function riskFromClimate(c) {
  let score = 0;
  if (c.daysWithoutRain >= 5) score += 2;
  if (c.daysWithoutRain >= 10) score += 2;
  if (c.temperature >= 34) score += 2;
  if (c.humidity <= 35) score += 2;
  if (c.rainfall < 10) score += 2;
  if (score <= 2) return { level: "normal", label: "Normal", score };
  if (score <= 5) return { level: "attention", label: "Atenção", score };
  if (score <= 7) return { level: "high", label: "Alto", score };
  return { level: "critical", label: "Crítico", score };
}

function irrigationRecommendation({ crop, temperature, humidity, forecastRain, hour }) {
  if (forecastRain >= 8) return `A chuva prevista pode atender parte da necessidade de ${crop}. Reavalie amanhã.`;
  if (hour >= 10 && hour <= 16) return "Evite irrigar entre 10h e 16h para reduzir a evaporação.";
  if (temperature >= 34 && humidity <= 35) return `Irrigue ${crop} antes das 8h, em ciclos curtos, e use cobertura do solo.`;
  return `Irrigue ${crop} nas primeiras horas da manhã e monitore a umidade do solo.`;
}

function interpretLeaf({ red, green, blue, crop }) {
  const dominance = green - Math.max(red, blue);
  if (dominance < 15) return `A imagem apresenta pouca dominância verde, o que pode indicar estresse hídrico, amarelecimento ou deficiência nutricional em ${crop}. Recomenda-se inspeção presencial e orientação agronômica.`;
  if (dominance < 35) return `A coloração sugere verde moderado em ${crop}. Monitore as folhas nos próximos dias e mantenha a irrigação recomendada.`;
  return `A imagem apresenta coloração verde saudável para ${crop}. Mantenha o plano de irrigação e o monitoramento de rotina.`;
}

function estimateConsumption({ residents, showers, laundry, hose }) {
  const people = Number(residents);
  if (!Number.isInteger(people) || people < 1 || people > 30) throw new Error("Número de moradores inválido.");
  const showerLiters = people * Number(showers || 1) * 60;
  const toiletLiters = people * 5 * 6;
  const laundryLiters = Number(laundry || 0) * 120 / 7;
  const cleaningLiters = hose ? 80 : 20;
  return Math.round(showerLiters + toiletLiters + laundryLiters + cleaningLiters);
}

function readReports() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(reportsFile)) fs.writeFileSync(reportsFile, "[]");
  return JSON.parse(fs.readFileSync(reportsFile, "utf8"));
}

function saveReports(reports) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
}

app.get("/api/dashboard", (_req, res) => {
  const risk = riskFromClimate(demoClimate);
  res.json({
    climate: demoClimate,
    risk,
    recommendation: "Evite lavar calçadas e veículos. Se tiver horta, irrigue antes das 8h.",
    disclaimer: "O modo demonstração usa dados simulados e não representa comunicado oficial."
  });
});

app.post("/api/consumption", (req, res) => {
  try {
    const liters = estimateConsumption(req.body);
    res.json({ litersPerDay: liters, message: "Estimativa educativa; não substitui a leitura do hidrômetro." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/irrigation", (req, res) => {
  const { crop, temperature, humidity, forecastRain, hour } = req.body;
  if (!crop || [temperature, humidity, forecastRain, hour].some((v) => !Number.isFinite(Number(v)))) {
    return res.status(400).json({ error: "Informe cultura, temperatura, umidade, chuva prevista e horário." });
  }
  res.json({ recommendation: irrigationRecommendation({
    crop: String(crop).slice(0, 60),
    temperature: Number(temperature),
    humidity: Number(humidity),
    forecastRain: Number(forecastRain),
    hour: Number(hour)
  }) });
});

app.get("/api/reports", (_req, res) => res.json({ reports: readReports() }));

app.post("/api/reports", (req, res) => {
  const { type, description, neighborhood } = req.body;
  const allowed = ["falta", "pressao", "vazamento", "outro"];
  if (!allowed.includes(type) || typeof description !== "string" || description.trim().length < 5) {
    return res.status(400).json({ error: "Tipo e descrição válida são obrigatórios." });
  }
  const reports = readReports();
  const report = {
    id: randomUUID(),
    type,
    description: description.trim().slice(0, 500),
    neighborhood: typeof neighborhood === "string" ? neighborhood.trim().slice(0, 80) : "",
    source: "Relato comunitário não confirmado",
    createdAt: new Date().toISOString()
  };
  reports.unshift(report);
  saveReports(reports.slice(0, 100));
  res.status(201).json(report);
});

app.post("/api/leaf-analysis", (req, res) => {
  const { red, green, blue, crop } = req.body;
  if ([red, green, blue].some((v) => !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 255)) {
    return res.status(400).json({ error: "Envie os valores médios de cor da imagem (0 a 255)." });
  }
  res.json({
    analysis: interpretLeaf({ red: Number(red), green: Number(green), blue: Number(blue), crop: String(crop || "cultura").slice(0, 60) }),
    disclaimer: "Heurística local de cor em modo demonstração. Não substitui diagnóstico agronômico."
  });
});

app.get("/api/about", (_req, res) => {
  res.json({
    sources: [
      { name: "Indicadores climáticos", type: "Demonstração educativa", note: "Valores simulados para representar o período seco." },
      { name: "Relatos comunitários", type: "Contribuição da comunidade", note: "Não confirmados; não representam comunicado oficial." },
      { name: "Mapa", type: "OpenStreetMap", note: "Dados e tiles sob Open Database License." }
    ],
    licenses: [
      { item: "Código-fonte", license: "MIT" },
      { item: "Documentação e dados próprios", license: "Creative Commons Atribuição 4.0" }
    ],
    ods: [
      { number: 6, title: "Água Potável e Saneamento", impact: "Reduz desperdício e protege a disponibilidade hídrica local." },
      { number: 11, title: "Cidades e Comunidades Sustentáveis", impact: "Fortalece a resiliência comunitária em períodos de escassez." },
      { number: 12, title: "Consumo e Produção Responsáveis", impact: "Incentiva hábitos de consumo consciente de água." },
      { number: 13, title: "Ação Contra a Mudança Global do Clima", impact: "Adapta a produção agrícola a eventos climáticos extremos." }
    ],
    limitations: "O índice hídrico é educativo e explicável. Não substitui órgãos oficiais, concessionária de água, leitura de hidrômetro ou orientação agronômica profissional."
  });
});

app.post("/api/assistant", (req, res) => {
  const message = String(req.body.message || "").toLowerCase();
  let answer = "Priorize consumo essencial, corrija vazamentos e siga comunicados oficiais. Esta orientação é educativa.";
  if (message.includes("irrig") || message.includes("horta")) answer = "Irrigue antes das 8h, evite o período mais quente e cubra o solo com palha.";
  if (message.includes("banho") || message.includes("consumo")) answer = "Reduza o tempo de banho, feche a torneira ao ensaboar e reutilize água sempre que for seguro.";
  if (message.includes("racionamento") || message.includes("falta")) answer = "Não confirmo racionamento sem fonte oficial. Consulte os canais da concessionária e da Prefeitura.";
  res.json({ answer, mode: "fallback local" });
});

if (require.main === module) app.listen(PORT, () => console.log(`Canedo Água Inteligente em http://localhost:${PORT}`));

module.exports = { app, riskFromClimate, irrigationRecommendation, estimateConsumption, interpretLeaf };
