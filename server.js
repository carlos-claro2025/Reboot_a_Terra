const express = require("express");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

const app = express();
app.set("trust proxy", 1); // ESSENCIAL PARA RENDER/HEROKU/FLY.io
app.use(express.json());
app.use(express.static("public"));

const cache = new NodeCache({ stdTTL: 600 });

// Supabase Config
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Gemini AI Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." }
});
app.use("/api/", limiter);

// --- API ROUTES ---

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/dashboard", async (req, res) => {
  try {
    let climate = cache.get("climate");
    if (!climate) {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-16.708&longitude=-49.091&current=temperature_2m,relative_humidity_2m&daily=precipitation_sum&timezone=auto");
      const data = await response.json();
      climate = {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        rainfall: data.daily.precipitation_sum[0],
        daysWithoutRain: 0, // Simplificado para MVP
        source: "Open-Meteo (Real-time)"
      };
      cache.set("climate", climate);
    }
    
    const risk = {
      level: "moderate",
      label: "Risco Moderado",
      recommendation: "Mantenha a irrigação controlada e evite desperdícios."
    };
    
    res.json({ climate, risk, disclaimer: "Dados para fins educativos." });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar dados climáticos." });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ reports: data });
  } catch (e) {
    res.status(500).json({ error: "Erro ao carregar relatos." });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const { type, neighborhood, description, source } = req.body;
    const { data, error } = await supabase.from("reports").insert([{ type, neighborhood, description, source, verified: false }]).select();
    if (error) throw error;
    res.status(201).json({ message: "Relato registrado!" });
  } catch (e) {
    res.status(500).json({ error: "Erro ao salvar relato." });
  }
});

app.post("/api/consumption", (req, res) => {
  const { residents, showers, laundry, hose } = req.body;
  const total = (residents * 110) + (showers * 60) + (laundry * 100) + (hose * 500);
  res.json({ litersPerDay: total, message: total > 1000 ? "Consumo elevado. Considere reduzir o uso de mangueiras." : "Consumo dentro da média." });
});

app.post("/api/irrigation", async (req, res) => {
  const { crop, temperature, humidity } = req.body;
  let rec = "Irrigação normal.";
  if (temperature > 30 && humidity < 40) rec = "Aumente a frequência de irrigação devido ao calor extremo.";
  if (humidity > 80) rec = "Reduza a irrigação para evitar fungos.";
  res.json({ recommendation: `Para ${crop}: ${rec}` });
});

app.post("/api/leaf-analysis", (req, res) => {
  const { red, green, blue, crop } = req.body;
  let color = "green", analysis = "Folha saudável.";
  if (green < red || green < blue) {
    color = "yellow";
    analysis = "Sinais iniciais de estresse hídrico (amarelamento).";
  }
  if (red > green * 1.5) {
    color = "red";
    analysis = "Estresse hídrico severo. Irrigação imediata necessária.";
  }
  res.json({ color, analysis, disclaimer: "Análise heurística. Consulte um agrônomo." });
});

app.get("/api/about", (req, res) => {
  res.json({
    sources: [{ name: "Open-Meteo", type: "API", note: "Dados meteorológicos abertos." }],
    licenses: [{ item: "Código", license: "MIT" }],
    ods: [{ number: 6, title: "Água Limpa e Saneamento", impact: "Monitoramento de escassez." }],
    limitations: "MVP educativo. Não substitui órgãos oficiais."
  });
});

app.post("/api/assistant", async (req, res) => {
  try {
    const { message } = req.body;
    const prompt = `Você é um assistente especializado em gestão hídrica em Senador Canedo-GO. Responda de forma curta e útil: ${message}`;
    const result = await model.generateContent(prompt);
    res.json({ answer: result.response.text() });
  } catch (e) {
    res.status(500).json({ error: "Erro na IA." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));