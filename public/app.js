const $ = (s) => document.querySelector(s);
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
async function api(url, options) { const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "Não foi possível concluir."); return data; }
function formData(form) { const o = Object.fromEntries(new FormData(form).entries()); for (const k of Object.keys(o)) { if (o[k] !== "" && !Number.isNaN(Number(o[k])) && o[k] !== null) o[k] = Number(o[k]); } return o; }
async function loadDashboard() {
  $("#dashboard").innerHTML = "<div class='loading'>Carregando indicadores…</div>";
  const d = await api("/api/dashboard"); const c = d.climate; const r = d.risk;
  $("#dashboard").innerHTML = `<article class="metric risk ${esc(r.level)}"><span>Risco hídrico</span><strong>${esc(r.label)}</strong><small>${esc(d.recommendation)}</small></article><article class="metric"><span>Temperatura</span><strong>${esc(c.temperature)}°C</strong><small>Fonte: ${esc(c.source)}</small></article><article class="metric"><span>Umidade</span><strong>${esc(c.humidity)}%</strong><small>Chuva acumulada: ${esc(c.rainfall)} mm</small></article><article class="metric"><span>Sequência seca</span><strong>${esc(c.daysWithoutRain)} dias</strong><small>${esc(d.disclaimer)}</small></article>`;
  return d;
}
async function loadReports() {
  const { reports } = await api("/api/reports");
  $("#reports").innerHTML = reports.length ? reports.map(x => `<article class="report"><b>${esc(x.type)}</b> · ${esc(x.neighborhood || "bairro não informado")}<br>${esc(x.description)}<br><small>${esc(x.source)}</small></article>`).join("") : "<p class='muted'>Ainda não há relatos.</p>";
}
async function loadAbout() {
  const d = await api("/api/about");
  $("#about").innerHTML = `<h3>Fontes de dados</h3><ul>${d.sources.map(s => `<li><b>${esc(s.name)}</b> — ${esc(s.type)}. ${esc(s.note)}</li>`).join("")}</ul><h3>Licenças</h3><ul>${d.licenses.map(l => `<li>${esc(l.item)}: ${esc(l.license)}</li>`).join("")}</ul><h3>Impacto nos ODS</h3><div class="ods">${d.ods.map(o => `<article class="ods-card"><b>ODS ${esc(o.number)}</b><span>${esc(o.title)}</span><small>${esc(o.impact)}</small></article>`).join("")}</div><h3>Limitações</h3><p class="muted">${esc(d.limitations)}</p>`;
}
let climateCache = null;
async function ensureClimate() { if (!climateCache) { const d = await loadDashboard(); climateCache = d.climate; } return climateCache; }
$("#consumption").addEventListener("submit", async e => { e.preventDefault(); try { const d = await api("/api/consumption", {method:"POST",body:JSON.stringify(formData(e.target))}); $("#consumptionResult").textContent = `Estimativa: ${d.litersPerDay} litros/dia. ${d.message}`; } catch (x) { $("#consumptionResult").textContent = x.message; }});
$("#irrigation").addEventListener("submit", async e => { e.preventDefault(); try { const c = await ensureClimate(); const d = await api("/api/irrigation", {method:"POST",body:JSON.stringify({...formData(e.target),temperature:c.temperature,humidity:c.humidity,forecastRain:c.forecastRain ?? 2})}); $("#irrigationResult").textContent = d.recommendation; } catch (x) { $("#irrigationResult").textContent = x.message; }});
$("#report").addEventListener("submit", async e => { e.preventDefault(); try { await api("/api/reports", {method:"POST",body:JSON.stringify(formData(e.target))}); e.target.reset(); await loadReports(); } catch (x) { alert(x.message); }});
$("#assistant").addEventListener("submit", async e => { e.preventDefault(); const f=formData(e.target); const chat = $("#chat"); chat.innerHTML += `<div class="bubble user">${esc(f.message)}</div>`; try { const d=await api("/api/assistant",{method:"POST",body:JSON.stringify(f)}); chat.innerHTML += `<div class="bubble">${esc(d.answer)}</div>`; } catch (x) { chat.innerHTML += `<div class="bubble">${esc(x.message)}</div>`; } chat.scrollTop = chat.scrollHeight; e.target.reset(); });
function initMap() {
  if (typeof L === "undefined") { $("#mapResult").textContent = "Mapa indisponível: a biblioteca de mapas não carregou."; return; }
  const center = [-16.708, -49.091];
  const map = L.map("map").setView(center, 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    L.marker([lat, lng]).addTo(map).bindPopup(`Ponto selecionado: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
    $("#mapResult").textContent = `Ponto selecionado em Senador Canedo: latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}.`;
  });
}
async function analyzeLeaf(file, crop) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, 64, 64);
  const { data } = ctx.getImageData(0, 0, 64, 64);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  URL.revokeObjectURL(url);
  return api("/api/leaf-analysis", { method: "POST", body: JSON.stringify({ red: Math.round(r / n), green: Math.round(g / n), blue: Math.round(b / n), crop }) });
}
$("#leaf").addEventListener("submit", async e => {
  e.preventDefault();
  const file = e.target.photo.files[0];
  if (!file) { $("#leafResult").textContent = "Selecione uma imagem."; return; }
  try { const d = await analyzeLeaf(file, e.target.crop.value); $("#leafResult").textContent = `${esc(d.analysis)} ${esc(d.disclaimer)}`; }
  catch (x) { $("#leafResult").textContent = esc(x.message); }
});
ensureClimate().catch(console.error); loadReports().catch(console.error); loadAbout().catch(console.error); initMap();
