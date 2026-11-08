# 💧 Canedo Água Inteligente

## 🌟 Visão Geral
O **Canedo Água Inteligente** é um MVP (Produto Mínimo Viável) desenvolvido para enfrentar a escassez hídrica recorrente em Senador Canedo, GO, especialmente no período crítico entre agosto e outubro. O projeto transforma dados climáticos e relatos comunitários em informações acionáveis para a população e gestores públicos.

## 🚀 Funcionalidades Principais

### 📊 Dashboard de Risco Hídrico
- **Dados em Tempo Real**: Integração com a API Open-Meteo para monitoramento de temperatura e precipitação.
- **Análise de Risco**: Cálculo automático de risco hídrico baseado em dados climáticos atuais.
- **Recomendações Inteligentes**: Sugestões de irrigação e economia de água adaptadas ao clima do dia.

### 🤖 Assistente AI (Powered by Google Gemini)
- **Consultoria Especializada**: Chatbot treinado para responder dúvidas sobre gestão de água e crises hídricas especificamente para a região de Senador Canedo.
- **Respostas Práticas**: Orientações rápidas sobre como lidar com a falta de água e técnicas de preservação.

### 🗺️ Mapa de Relatos Comunitários
- **Crowdsourcing de Dados**: Sistema onde cidadãos podem reportar faltas de água em tempo real.
- **Geolocalização**: Integração com Leaflet.js para visualização espacial dos problemas.
- **Relatos Verificados**: Sistema de priorização para dados oficiais (SANESC/Defesa Civil).

### 🌿 Heurística de Análise de Folhas
- **Diagnóstico Visual**: Ferramenta que analisa a cor de folhas via upload de imagem para detectar estresse hídrico (amarelamento) usando a fórmula de contraste cromático.

## 🛠️ Arquitetura Técnica

### Stack Tecnológica
- **Frontend**: HTML5, CSS3 (Mobile-First), JavaScript (ES6+).
- **Backend**: Node.js com Express.
- **Banco de Dados**: Supabase (PostgreSQL) via API REST.
- **Inteligência Artificial**: Google Gemini Pro API.
- **Infraestrutura**: Docker & Render.

### Decisões de Engenharia
- **Conexão REST Pura**: Para garantir máxima estabilidade e compatibilidade entre o ambiente de hospedagem (Render) e o banco de dados (Supabase), a comunicação foi implementada via requisições HTTP REST, eliminando dependências de WebSockets e conflitos de versão de Node.js.
- **Segurança**: Implementação de `express-rate-limit` para proteção contra ataques de negação de serviço (DoS) e sanitização de inputs para prevenção de XSS.
- **Performance**: Uso de `node-cache` para reduzir chamadas repetitivas a APIs externas, melhorando o tempo de resposta do dashboard.

## 📦 Instalação e Deploy

### Variáveis de Ambiente Necessárias
```env
PORT=3000
GEMINI_API_KEY=sua_chave_gemini
SUPABASE_URL=seu_link_supabase
SUPABASE_KEY=sua_chave_anon_public
