# Canedo Água Inteligente

MVP funcional, local e em português para apoiar decisões sobre água em Senador Canedo-GO.

## Rodar localmente

Requisitos: Node.js 18 ou superior.

```bash
npm install
npm start
```

Abra `http://localhost:3000`. Para desenvolvimento, use `npm run dev`. Os testes rodam com `npm test`.

## Arquitetura

- `server.js`: servidor Express e API REST.
- `lib/rules.js`: regras determinísticas de risco hídrico, consumo, irrigação e assistente local.
- `lib/storage.js`: persistência PostgreSQL no Wasmer, com fallback JSON local.
- `lib/weather.js`: dados atuais via Open-Meteo com cache de 10 minutos e fallback demonstrativo.
- `public/`: frontend estático responsivo (HTML, CSS e JavaScript).
- `data/reports.json`: persistência local dos relatos comunitários.

O projeto usa Open-Meteo no backend para dados atuais quando disponível, sem chave obrigatória, e retorna dados demonstrativos quando a rede falha. No Wasmer, `app.yaml` pode provisionar PostgreSQL; localmente, sem as variáveis `DB_*`, a aplicação usa JSON. O assistente tem fallback local por regras e não expõe segredos no navegador.

O frontend também funciona como PWA: pode ser instalado no celular e possui cache offline para a interface e fallback local para cálculos, relatos e orientações. A comunidade oferece lista e mapa esquemático sem depender de um provedor de mapas; quando há coordenadas, cada relato pode abrir no OpenStreetMap.

## Endpoints

- `GET /api/health`: saúde do serviço.
- `GET /api/dashboard`: condições e risco hídrico explicável.
- `POST /api/consumption`: calcula consumo residencial.
- `POST /api/irrigation`: recomenda volume, duração e frequência de irrigação.
- `GET /api/reports`: lista relatos; aceita filtro `?type=`.
- `POST /api/reports`: cria relato com `type`, `title`, `description` e `neighborhood`.
- `POST /api/assistant`: responde orientação local com `{ "message": "..." }`.

Relatos aceitam opcionalmente `lat` e `lng`. A API aplica validação de coordenadas, cabeçalhos básicos de segurança e um limite simples de 60 requisições por minuto por endereço IP.

## Configuração operacional

O `app.yaml` configura PostgreSQL gerenciado no Wasmer na região `ca-beau1` e um health check em `/api/health`. As variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME` e `DB_PASSWORD` são injetadas pelo Wasmer. Localmente, sem elas, a aplicação usa `data/reports.json`.

Opcionalmente, defina `WEATHER_LATITUDE` e `WEATHER_LONGITUDE` para ajustar o ponto consultado na Open-Meteo. A consulta tem cache de 10 minutos e fallback demonstrativo.

Para deploy:

```bash
wasmer deploy --build-remote
```

O Wasmer também oferece conexão com GitHub para deploy automático da branch `main`, secrets em `Settings > Environment Vars`, domínio personalizado em `Domains` e logs pela CLI:

```bash
wasmer app logs carlosklaro/canedo-agua-inteligente --watch
```

## Próximos passos que ainda exigem configuração

- Implementar autenticação/moderação de usuários (Wasmer não fornece login final pronto).
- Configurar domínio próprio, política de privacidade e termos de uso.
- Ativar monitoramento externo e alertas de disponibilidade.

## Limitações e fontes

Este é um MVP demonstrativo: não representa dados oficiais em tempo real, não substitui orientação da concessionária ou de profissionais e as fórmulas são aproximações educativas. Os valores de consumo foram inspirados em referências públicas de uso doméstico e a lógica climática é uma heurística transparente para prototipação. Uma evolução deve integrar pluviômetros, dados oficiais e autenticação/moderação dos relatos.

## Licença

MIT. Consulte o arquivo `LICENSE`.
