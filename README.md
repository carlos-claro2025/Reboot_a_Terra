# Canedo Água Inteligente - MVP Hackathon

MVP em Node.js + Express para orientar moradores e pequenos produtores de Senador Canedo-GO no período seco. O dashboard usa dados demonstrativos simulados, sempre identificados como tais.

## 🚀 Funcionalidades
- **Painel de Risco Hídrico:** Monitoramento de temperatura, umidade e sequência seca com dados reais da Open-Meteo (com fallback de demonstração offline).
- **Mapa Interativo:** Seleção de pontos geográficos para análise local.
- **Calculadora de Consumo:** Estimativa de gasto diário de água por residência.
- **Recomendação de Irrigação:** Sugestões baseadas em cultura (Alface, Tomate, Milho) e clima.
- **Análise de Folhas:** Heurística de cor para detecção de estresse hídrico via upload de foto.
- **Relatos Comunitários:** Sistema de crowdsourcing de faltas de água.
- **Assistente AI:** Chat para dúvidas sobre consumo e economia.
- **Transparência:** Página de fontes de dados, licenças e alinhamento com ODS 6, 11, 12 e 13.
- **Limite de requisições (rate limiting):** 100 requisições a cada 15 min por IP nas rotas `/api`.

## Executar

```bash
npm install
npm test
npm start
```

Abra `http://localhost:3000`.

### Docker (imagem pronta para deploy/hackathon)

```bash
docker build -t canedo-agua-inteligente .
docker run -p 3000:3000 canedo-agua-inteligente
```

### Integração de dados (Open-Meteo)

O painel busca dados reais de tempo para Senador Canedo (latitude -16.708, longitude -49.091) na **Open-Meteo** — API gratuita e aberta, sem chave. Se a rede falhar, expirar (5s) ou a API errar, o servidor usa os dados de demonstração. A fonte é sempre rotulada no campo `source`.

## CI

Há um workflow `.github/workflows/ci.yml` que roda `npm ci` e `npm test` no Node 20 a cada push/PR para a branch `main`.

## API

- `GET /api/dashboard`: indicadores e risco (dados reais, com fallback de demonstração offline).
- `GET /api/health`: verificação de saúde para deploy.
- `POST /api/consumption`: estima consumo com `residents`, `showers`, `laundry`, `hose`.
- `POST /api/irrigation`: recomenda irrigação com cultura e condições climáticas.
- `GET/POST /api/reports`: lista e registra relatos comunitários.
- `POST /api/leaf-analysis`: análise de cor de folha.
- `GET /api/about`: informações de ODS e fontes.
- `POST /api/assistant`: orientação local sem chave de IA.

Relatos são gravados em `data/reports.json`. Eles não são confirmação oficial de falta d’água. Integrações futuras devem ser implementadas no backend, com segredos em variáveis de ambiente.

## Documentação

- [Apresentação de hackathon (slides)](docs/apresentacao.md)

## Escopo e limitações

O índice hídrico é explicável e educativo. Não substitui órgãos oficiais, concessionária, hidrômetro ou orientação agronômica. Uma evolução pode conectar fontes meteorológicas e comunicados oficiais, adicionar mapa geográfico e PWA offline.

## Licença

MIT.
