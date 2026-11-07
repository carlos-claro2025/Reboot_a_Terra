# Canedo Água Inteligente — Apresentação de Hackathon

Próximo passo para um MVP público de monitoramento hídrico em Senador Canedo-GO.

---

## Slide 1 — Título

- **Canedo Água Inteligente**
- MVP de monitoramento e economia de água para Senador Canedo-GO
- Hackathon: protótipo funcional, sem fins comerciais
- Repositório: `carlos-claro2025/Reboot_a_Terra` (MIT)

---

## Slide 2 — O Problema

- Escassez hídrica em Senador Canedo-GO, com maior gravidade entre **agosto e outubro** (início da estação seca).
- Moradores recebem informações desconexas sobre vazamentos, pressão e racionamento.
- Pequenos produtores buscam orientação prática para irrigar sem desperdiçar água.
- Faltam canais transparentes de **relatos comunitários** e de fonte de dados.

---

## Slide 3 — A Solução

- Painel simples no navegador com indicadores de risco hídrico.
- Calculadora de consumo residencial por linha (chuveiro, tanque, jardim).
- Recomendação de irrigação por cultura (alface, tomate, milho).
- Análise de folha por imagem (heurística de cor, sem custo de IA em cloud).
- Assistente de orientações e relatórios de incidentes (vazamentos, falta, pressão).

---

## Slide 4 — Arquitetura

- **Backend:** Node.js + Express, rotas JSON sob `/api`.
- **Frontend:** HTML, CSS e JavaScript nativos, sem framework.
- **Dados:** armazenamento em JSON local (`data/reports.json`) — sem banco de dados.
- **Mapa:** Leaflet + OpenStreetMap (licença ODbL).
- **PWA:** manifest, service worker e ícone — funciona offline.

---

## Slide 5 — Demonstração (Endpoints)

- `GET /api/dashboard` — visão geral (dados reais da Open-Meteo, com fallback de demonstração).
- `POST /api/consumption` — estimativa de litros por dia.
- `POST /api/irrigation` — recomendação de irrigação.
- `GET/POST /api/reports` — relatórios comunitários.
- `POST /api/leaf-analysis` — análise de folha.
- `POST /api/assistant` — orientações básicas.
- `GET /api/health` — verificação de saúde para deploy.

---

## Slide 6 — Dados e Fontes Abertas

- **Open-Meteo** — API gratuita e aberta de tempo e clima (sem chave).
- **OpenStreetMap** — base de dados e tiles sob ODbL.
- **Conteúdo próprio** — documentação e apresentação sob CC BY 4.0.
- **Código** — MIT.
- Todas as fontes são creditadas na página “Sobre”.

---

## Slide 7 — Impacto nos ODS

- **ODS 6** — Água potável e saneamento: reduz desperdício e protege a disponibilidade hídrica local.
- **ODS 11** — Cidades e comunidades sustentáveis: fortalece a resiliência comunitária em períodos de escassez.
- **ODS 12** — Consumo e produção responsáveis: incentiva hábitos de consumo consciente de água.
- **ODS 13** — Ação contra a mudança global do clima: adapta a produção agrícola a eventos extremos.

---

## Slide 8 — Limites Éticos

- O índice hídrico é **educativo e explicável** — não substitui fontes oficiais.
- Não faz previsões de racionamento nem prognósticos climáticos de autoridade.
- Relatos comunitários são **não confirmados** e não caracterizam ocorrência oficial.
- Análise de folha é heurística de cor; não substitui diagnóstico agronômico.
- Fontes e limitações sempre exibidas no produto.

---

## Slide 9 — Próximos Passos

- Integrar comunicados oficiais da concessionária e da Prefeitura.
- Mapa geográfico com pontos de relatos e radares de chuva.
- Métricas de impacto de água economizada por usuário.
- Versionamento de dados e exportação de relatórios.
- Hospedagem estável (Docker + CI) e observabilidade (logs, health checks).

---

## Slide 10 — Equipe e Contato

- Desenvolvimento: time do repositório `Reboot_a_Terra`.
- Protótipo em ambiente educativo, sem fins comerciais.
- Contribuições abertas via GitHub.
- Agradecimentos aos moradores e produtores de Senador Canedo que inspiram o projeto.

---

## Observações para a demonstração

- Rodar `npm install && npm test && npm start`.
- Se o ambiente estiver offline, o painel usa dados de demonstração e o disclaimer de simulação é exibido.
- O link da apresentação é o `docs/apresentacao.md` do repositório.
