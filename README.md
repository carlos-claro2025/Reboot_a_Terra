# Canedo Água Inteligente - MVP Hackathon

MVP em Node.js + Express para orientar moradores e pequenos produtores de Senador Canedo-GO no período seco. O dashboard usa dados demonstrativos simulados, sempre identificados como tais.

## 🚀 Funcionalidades
- **Painel de Risco Hídrico:** Monitoramento de temperatura, umidade e sequência seca.
- **Mapa Interativo:** Seleção de pontos geográficos para análise local.
- **Calculadora de Consumo:** Estimativa de gasto diário de água por residência.
- **Recomendação de Irrigação:** Sugestões baseadas em cultura (Alface, Tomate, Milho) e clima.
- **Análise de Folhas:** Heurística de cor para detecção de estresse hídrico via upload de foto.
- **Relatos Comunitários:** Sistema de crowdsourcing de faltas de água.
- **Assistente AI:** Chat para dúvidas sobre consumo e economia.
- **Transparência:** Página de fontes de dados, licenças e alinhamento com ODS 6, 11, 12 e 13.

## Executar

```bash
npm install
npm test
npm start
```

Abra `http://localhost:3000`.

## API

- `GET /api/dashboard`: indicadores e risco demonstrativo.
- `POST /api/consumption`: estima consumo com `residents`, `showers`, `laundry`, `hose`.
- `POST /api/irrigation`: recomenda irrigação com cultura e condições climáticas.
- `GET/POST /api/reports`: lista e registra relatos comunitários.
- `POST /api/leaf-analysis`: análise de cor de folha.
- `GET /api/about`: informações de ODS e fontes.
- `POST /api/assistant`: orientação local sem chave de IA.

Relatos são gravados em `data/reports.json`. Eles não são confirmação oficial de falta d’água. Integrações futuras devem ser implementadas no backend, com segredos em variáveis de ambiente.

## Escopo e limitações

O índice hídrico é explicável e educativo. Não substitui órgãos oficiais, concessionária, hidrômetro ou orientação agronômica. Uma evolução pode conectar fontes meteorológicas e comunicados oficiais, adicionar mapa geográfico e PWA offline.

## Licença

MIT.
