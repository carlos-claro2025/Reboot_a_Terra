# 💧 Canedo Água Inteligente.
> **Solução Inteligente para Gestão Hídrica em Senador Canedo-GO**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google_Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

---

## 🌟 Sobre o Projeto
O **Canedo Água Inteligente** é um MVP desenvolvido para o Hackathon, focado em mitigar os impactos da escassez hídrica em Senador Canedo-GO, especialmente no período crítico entre agosto e outubro. A plataforma une dados climáticos em tempo real, inteligência artificial e colaboração comunitária para apoiar moradores e pequenos produtores.

## 🚀 Funcionalidades Principais

### 📊 Monitoramento & Análise
- **Painel de Risco Hídrico:** Dados reais da **Open-Meteo** com fallback inteligente para modo offline.
- **Análise de Folhas 🍃:** Heurística de cor para detecção de estresse hídrico via upload de foto.
- **Mapa Interativo 🗺️:** Visualização e filtragem de pontos geográficos de escassez.

### 💡 Ferramentas de Apoio
- **Assistente AI 🤖:** Chat inteligente via **Google Gemini** para orientações agronômicas e de economia.
- **Calculadora de Consumo 🚰:** Estimativa de gasto diário residencial personalizada.
- **Guia de Irrigação 🌽:** Recomendações baseadas na cultura (Alface, Tomate, Milho) e clima atual.

### 🤝 Colaboração & Transparência
- **Relatos Comunitários:** Sistema de crowdsourcing para mapear faltas de água em tempo real.
- **Alinhamento Global:** Projeto conectado aos ODS 6, 11, 12 e 13 da ONU.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | API REST e Lógica de Negócio |
| **Frontend** | HTML5, CSS3, JS (Vanilla) | Interface Responsiva e PWA |
| **Banco de Dados** | Supabase (PostgreSQL) | Armazenamento de Relatos Comunitários |
| **IA** | Google Gemini API | Assistente Virtual Especializado |
| **Clima** | Open-Meteo API | Dados Meteorológicos em Tempo Real |
| **DevOps** | Docker + GitHub Actions | Containerização e CI/CD |

---

## ⚙️ Como Executar

### Pré-requisitos
- Node.js v20+
- Conta no Supabase e Google AI Studio (para chaves de API)

### Instalação e Setup
1. **Clone o repositório:**
   ```bash
   git clone https://github.com/carlos-claro2025/Reboot_a_Terra.git
   cd Reboot_a_Terra
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz:
   ```env
   SUPABASE_URL=sua_url_supabase
   SUPABASE_KEY=sua_chave_supabase
   GEMINI_API_KEY=sua_chave_gemini
   SENTRY_DSN=seu_dsn_sentry
   ```

4. **Inicie o servidor:**
   ```bash
   npm start
   ```
   Acesse: `http://localhost:3000`

### 🐳 Execução via Docker
```bash
docker build -t canedo-agua-inteligente .
docker run -p 3000:3000 canedo-agua-inteligente
```

---

## 📖 Documentação Adicional
- [📄 Apresentação do Hackathon (Slides)](docs/apresentacao.md)

## ⚖️ Licença
Este projeto está sob a licença **MIT**.
