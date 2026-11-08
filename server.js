require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.set('trust proxy', 1);

const cache = new NodeCache({ stdTTL: 3600 });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.get('/api/reports', async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Credenciais do Supabase ausentes');
    const response = await axios.get(`${SUPABASE_URL}/rest/v1/reports?select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    res.json(response.data);
  } catch (error) {
    console.error('[Supabase Error]:', error.message);
    res.status(500).json({ error: 'Banco de dados offline ou erro de conexão' });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Credenciais do Supabase ausentes');
    await axios.post(`${SUPABASE_URL}/rest/v1/reports`, req.body, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });
    res.status(201).json({ message: 'Relato salvo com sucesso!' });
  } catch (error) {
    console.error('[Supabase Error]:', error.message);
    res.status(500).json({ error: 'Erro ao salvar relato no banco de dados' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  const cacheKey = 'climate_data';
  const cachedData = cache.get(cacheKey);
  if (cachedData) return res.json(cachedData);
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=-16.75&longitude=-49.12&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto');
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados climáticos' });
  }
});

app.post('/api/ai', async (req, res) => {
  try {
    const { prompt } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(`Você é um especialista em gestão de água em Senador Canedo, GO. Responda de forma curta e prática: ${prompt}`);
    res.json({ text: (await result.response).text() });
  } catch (error) {
    res.status(500).json({ error: 'Assistente AI temporariamente offline' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
