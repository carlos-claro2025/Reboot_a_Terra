const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { fetchClimate } = require("./lib/climate");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const NodeCache = require("node-cache");
const winston = require("winston");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: "app.log" })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const reportsFile = path.join(dataDir, "reports.json");

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== "your_supabase_url" && process.env.SUPABASE_KEY && process.env.SUPABASE_KEY !== "your_supabase_anon_key") 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY) 
  : null;
const climateCache = new NodeCache({ stdTTL: 1800 });

app.use(express.json({ limit: "50kb" }));

app.use((err, req, res, next) => {
  Sentry.captureException(err);
  logger.error(`Erro não tratado: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Erro interno do servidor." });
});
app.use(express.static(path.join(__dirname, "public")));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Aguarde alguns minutos antes de tentar novamente." }
});
app.use("/api", apiLimiter);

const demoClimate = {
  city: "Senador Canedo",
  source: "Demonstração educativa — dados simulados",
  temperature: 35,
  humidity: 31,
  rainfall: 4,
  daysWithoutRain: 9,
  forecastRain: 2
};

function riskFromClimate(c) {  let score = 0;
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
  if (dominance < 15) return { text: `A imagem apresenta pouca dominância verde, o que pode indicar estresse hídrico, amarelecimento ou deficiência nutricional em ${crop}. Recomenda-se inspeção presencial e orientação agronômica.`, color: "red" };
  if (dominance < 35) return { text: `A coloração sugere verde moderado em ${crop}. Monitore as folhas nos próximos dias e mantenha a irrigação recomendada.`, color: "yellow" };
  return { text: `A imagem apresenta coloração verde saudável para ${crop}. Mantenha o plano de irrigação e o monitoramento de rotina.`, color: "green" };
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

async function readReports() {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function saveReports(report) {
  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }
  const { data, error } = await supabase.from("reports").insert([report]).select();
  if (error) throw error;
  return data[0];
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

function invalid(value, min, max) {
  return !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max;
}

function validateIrrigationBody(body) {
  const crop = String(body.crop || "").trim();
  if (!crop || crop.length > 80) return { error: "Informe a cultura (até 80 caracteres)." };
  if (invalid(body.temperature, -10, 60)) return { error: "Temperatura deve estar entre -10°C e 60°C." };
  if (invalid(body.humidity, 0, 100)) return { error: "Umidade deve estar entre 0% e 100%." };
  if (invalid(body.forecastRain, 0, 500)) return { error: "Chuva prevista deve estar entre 0mm e 500mm." };
  if (invalid(body.hour, 0, 23)) return { error: "Horário deve ser um número inteiro entre 0 e 23." };
  return {
    crop,
    temperature: Number(body.temperature),
    humidity: Number(body.humidity),
    forecastRain: Number(body.forecastRain),
    hour: Math.trunc(Number(body.hour))
  };
}

app.get("/api/dashboard", async (_req, res) => {
  try {
    const cachedClimate = climateCache.get("current_climate");
    if (cachedClimate) {
      const risk = riskFromClimate(cachedClimate);
      return res.json({
        climate: cachedClimate,
        risk,
        recommendation: "Evite lavar calçadas e veículos. Se tiver horta, irrigue antes das 8h.",
        disclaimer: "Dados abertos de tempo (cache). O índice é educativo e não representa comunicado oficial."
      });
    }

    const climate = await fetchClimate();
    climateCache.set("current_climate", climate);
    const risk = riskFromClimate(climate);
    res.json({
      climate,
      risk,
      recommendation: "Evite lavar calçadas e veículos. Se tiver horta, irrigue antes das 8h.",
      disclaimer: "Dados abertos de tempo. O índice é educativo e não representa comunicado oficial."
    });
  } catch (_error) {
    const risk = riskFromClimate(demoClimate);
    res.json({
      climate: demoClimate,
      risk,
      recommendation: "Evite lavar calçadas e veículos. Se tiver horta, irrigue antes das 8h.",
      disclaimer: "O modo demonstração usa dados simulados e não representa comunicado oficial."
    });
  }
});

app.post("/api/consumption", (req, res) => {
  try {
    const { residents, showers, laundry, hose } = req.body || {};
    if (invalid(residents, 1, 30)) return res.status(400).json({ error: "Informe o número de moradores entre 1 e 30." });
    if (invalid(showers, 0, 10)) return res.status(400).json({ error: "Informe o número de chuveiros entre 0 e 10." });
    if (invalid(laundry, 0, 10)) return res.status(400).json({ error: "Informe a frequência de lavagem de roupa entre 0 e 10 por semana." });

    const liters = estimateConsumption({
      residents: Math.trunc(Number(residents)),
      showers: Number(showers),
      laundry: Number(laundry),
      hose: hose === true
    });
    res.json({ litersPerDay: liters, message: "Estimativa educativa; não substitui a leitura do hidrômetro." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/irrigation", (req, res) => {
  const check = validateIrrigationBody(req.body || {});
  if (check.error) return res.status(400).json({ error: check.error });
  res.json({ recommendation: irrigationRecommendation(check) });
});

app.get("/api/reports", async (_req, res) => {
  try {
    const reports = await readReports();
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar relatos." });
  }
});

app.post("/api/reports", async (req, res) => {
  const { type, description, neighborhood } = req.body;
  const allowed = ["falta", "pressao", "vazamento", "outro"];
  if (!allowed.includes(type) || typeof description !== "string" || description.trim().length < 5) {
    return res.status(400).json({ error: "Tipo e descrição válida são obrigatórios." });
  }
  const report = {
    id: randomUUID(),
    type,
    description: description.trim().slice(0, 500),
    neighborhood: typeof neighborhood === "string" ? neighborhood.trim().slice(0, 80) : "",
    source: "Relato comunitário não confirmado",
    created_at: new Date().toISOString()
  };
  try {
    const savedReport = await saveReports(report);
    res.status(201).json(savedReport);
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar relato." });
  }
});

app.post("/api/leaf-analysis", (req, res) => {
  const { red, green, blue, crop } = req.body;
  if ([red, green, blue].some((v) => !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 255)) {
    return res.status(400).json({ error: "Envie os valores médios de cor da imagem (0 a 255)." });
  }
  const result = interpretLeaf({ red: Number(red), green: Number(green), blue: Number(blue), crop: String(crop || "cultura").slice(0, 60) });
  res.json({
    analysis: result.text,
    color: result.color,
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

app.post("/api/assistant", async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Mensagem vazia." });

  try {
    const climate = await fetchClimate().catch(() => demoClimate);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Você é o assistente inteligente do projeto "Canedo Água Inteligente" em Senador Canedo-GO.
Contexto climático atual:
- Temperatura: ${climate.temperature}°C
- Umidade: ${climate.humidity}%
- Chuva acumulada: ${climate.rainfall}mm
- Dias sem chuva: ${climate.daysWithoutRain}
- Previsão de chuva: ${climate.forecastRain}mm

Pergunta do usuário: ${message}
\nResponda de forma concisa, útil e educativa, focando em economia de água e resiliência hídrica.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ answer: response.text(), mode: "Gemini AI" });
  } catch (error) {
    logger.error("Erro no assistente Gemini:", error);
    res.json({ 
      answer: "Priorize consumo essencial, corrija vazamentos e siga comunicados oficiais. Esta orientação é educativa.", 
      mode: "fallback local" 
    });
  }
});

if (require.main === module) app.listen(PORT, () => logger.info(`Canedo Água Inteligente em http://localhost:${PORT}`));

module.exports = { app, riskFromClimate, irrigationRecommendation, estimateConsumption, interpretLeaf };
