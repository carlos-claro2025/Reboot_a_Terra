const $ = (selector) => document.querySelector(selector);
const formData = (form) => Object.fromEntries(new FormData(form).entries());

async function request(url, options = {}) {
  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
  } catch (error) {
    return staticFallback(url, options, error);
  }
}

const demoDashboard = {
  city: 'Senador Canedo-GO',
  demo: true,
  updatedAt: new Date().toISOString(),
  conditions: { temperature: 31, humidity: 48, rainfall: 0, dryDays: 8 },
  risk: { score: 71, level: 'alto', recommendation: 'Priorize o uso essencial, verifique vazamentos e regue no início da manhã.', explanation: ['Temperatura de 31.0 °C', 'umidade relativa de 48%', '8 dia(s) sem chuva', 'sem chuva significativa recente'] }
};

const demoReports = [
  { id: 'demo-1', type: 'vazamento', title: 'Vazamento na calçada', description: 'Água acumulando próximo à praça central.', neighborhood: 'Centro', status: 'aberto', lat: -16.7085, lng: -49.0925 },
  { id: 'demo-2', type: 'falta-agua', title: 'Baixa pressão', description: 'Pressão baixa no período da manhã.', neighborhood: 'Jardim Todos os Santos', status: 'em análise', lat: -16.692, lng: -49.086 }
];

async function staticFallback(url, options, originalError) {
  const body = options.body ? JSON.parse(options.body) : {};
  if (url === '/api/dashboard') return demoDashboard;
  if (url === '/api/consumption') {
    const residents = Number(body.residents || 1);
    const total = Math.round(residents * Number(body.showerMinutes || 8) * 9 + residents * 4 * 6 + Number(body.laundryLoads || 3) * 120 + 10 * 3 + Number(body.gardenLiters || 0));
    return { result: { totalLiters: total, estimatedM3: Number((total / 1000).toFixed(2)), tip: 'Estimativa local em modo demonstração.' } };
  }
  if (url === '/api/irrigation') {
    const liters = Math.round(Number(body.areaM2 || 10) * 5 * (Number(body.rainDays || 0) <= 1 ? 0.35 : 1));
    return { result: { liters, minutes: Math.max(5, Math.round(liters / 8)), frequency: 'A cada 2 dias', warning: 'Estimativa local em modo demonstração.' } };
  }
  if (url === '/api/reports' && (!options.method || options.method === 'GET')) {
    return { reports: JSON.parse(localStorage.getItem('canedo-reports') || JSON.stringify(demoReports)) };
  }
  if (url === '/api/reports' && options.method === 'POST') {
    const reports = JSON.parse(localStorage.getItem('canedo-reports') || JSON.stringify(demoReports));
    const report = { ...body, id: `local-${Date.now()}`, status: 'aberto' };
    localStorage.setItem('canedo-reports', JSON.stringify([report, ...reports]));
    return { report };
  }
  if (url === '/api/assistant') {
    const text = String(body.message || '').toLowerCase();
    const answer = text.includes('vazamento')
      ? 'Feche os registros e observe o hidrômetro por 15 minutos. Se continuar marcando, procure um encanador.'
      : text.includes('irrig')
        ? 'Regue no início da manhã ou após as 17h e confira a umidade do solo.'
        : 'Banhos curtos, máquina cheia e conserto de vazamentos reduzem o consumo doméstico.';
    return { answer, source: 'fallback-local', demo: true };
  }
  throw originalError;
}

async function loadDashboard() {
  const data = await request('/api/dashboard');
  $('#risk-score').textContent = data.risk.score;
  $('#risk-meter').style.width = `${data.risk.score}%`;
  $('#risk-level').textContent = data.risk.level;
  $('#risk-recommendation').textContent = data.risk.recommendation;
  $('#risk-explanation').innerHTML = data.risk.explanation.map((item) => `<span>✓ ${item}</span>`).join('');
  $('#temperature').textContent = data.conditions.temperature;
  $('#humidity').textContent = data.conditions.humidity;
  $('#rainfall').textContent = data.conditions.rainfall;
  $('#dry-days').textContent = data.conditions.dryDays;
  $('#updated-at').textContent = `Atualizado às ${new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

$('#consumption-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const { result } = await request('/api/consumption', { method: 'POST', body: JSON.stringify(formData(event.target)) });
    $('#consumption-result').textContent = `${result.totalLiters} L/dia estimados (${result.estimatedM3} m³). ${result.tip}`;
  } catch (error) { $('#consumption-result').textContent = error.message; }
});

$('#irrigation-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const { result } = await request('/api/irrigation', { method: 'POST', body: JSON.stringify(formData(event.target)) });
    $('#irrigation-result').textContent = `${result.liters} L por irrigação · ${result.minutes} min · ${result.frequency}. ${result.warning}`;
  } catch (error) { $('#irrigation-result').textContent = error.message; }
});

function reportIcon(type) {
  return type === 'vazamento' ? '💧' : type === 'falta-agua' ? '🚰' : type === 'qualidade' ? '🧪' : '📍';
}

async function loadReports() {
  const { reports } = await request('/api/reports');
  $('#reports-list').innerHTML = reports.map((report) => `<div class="report-item"><div class="report-icon">${reportIcon(report.type)}</div><div><h3>${escapeHtml(report.title)}</h3><p>${escapeHtml(report.description)}</p><small>${escapeHtml(report.neighborhood)} · ${report.status}${report.lat && report.lng ? ` · <a target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/?mlat=${report.lat}&mlon=${report.lng}#map=17/${report.lat}/${report.lng}">ver localização</a>` : ''}</small></div></div>`).join('');
  $('#reports-map').innerHTML = `<div class="map-grid">${reports.map((report) => `<article class="map-pin" style="--x:${Math.max(8, Math.min(92, ((Number(report.lng) + 49.12) * 294)))}%;--y:${Math.max(8, Math.min(92, ((-16.67 - Number(report.lat)) * 294)))}%"><span>${reportIcon(report.type)}</span><strong>${escapeHtml(report.title)}</strong><small>${escapeHtml(report.neighborhood)}</small></article>`).join('')}</div><p class="field-help">Mapa esquemático; abra “ver localização” para navegar no OpenStreetMap.</p>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

$('#show-report').addEventListener('click', () => $('#report-form').classList.remove('hidden'));
$('#cancel-report').addEventListener('click', () => $('#report-form').classList.add('hidden'));
$('#list-view').addEventListener('click', () => { $('#reports-list').classList.remove('hidden'); $('#reports-map').classList.add('hidden'); $('#list-view').classList.add('active'); $('#map-view').classList.remove('active'); });
$('#map-view').addEventListener('click', () => { $('#reports-list').classList.add('hidden'); $('#reports-map').classList.remove('hidden'); $('#map-view').classList.add('active'); $('#list-view').classList.remove('active'); });
$('#report-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#report-message');
  try {
    await request('/api/reports', { method: 'POST', body: JSON.stringify(formData(event.target)) });
    message.textContent = 'Relato enviado com sucesso.';
    event.target.reset();
    await loadReports();
  } catch (error) { message.textContent = error.message; }
});

$('#assistant-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = event.target.elements.message;
  const text = input.value.trim();
  if (!text) return;
  $('#chat-messages').insertAdjacentHTML('beforeend', `<div class="message user">${escapeHtml(text)}</div>`);
  input.value = '';
  try {
    const { answer } = await request('/api/assistant', { method: 'POST', body: JSON.stringify({ message: text }) });
    $('#chat-messages').insertAdjacentHTML('beforeend', `<div class="message bot">${escapeHtml(answer)}</div>`);
    $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
  } catch (error) { $('#chat-messages').insertAdjacentHTML('beforeend', `<div class="message bot">${escapeHtml(error.message)}</div>`); }
});

Promise.all([loadDashboard(), loadReports()]).catch((error) => console.error(error));
