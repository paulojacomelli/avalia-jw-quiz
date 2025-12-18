<div align="center">
<img width="1200" height="475" alt="Avalia JW Quiz Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Avalia JW Quiz – Powered by Gemini
### Teste seus conhecimentos teocráticos com Inteligência Artificial
</div>

---

## 📖 Sobre o Projeto

O **Avalia JW Quiz** é um aplicativo interativo de perguntas e respostas focado em conhecimento bíblico e história teocrática. Utilizando a tecnologia da **Google Gemini API**, o app gera perguntas dinâmicas, feedbacks baseados na *Tradução do Novo Mundo* e oferece uma experiência de aprendizado envolvente.

> **Nota:** Este aplicativo é um projeto pessoal para fins de entretenimento e reforço de memória. Ele **não** é um software oficial da *Watch Tower Bible and Tract Society of Pennsylvania*. Para ensinamentos e publicações oficiais, visite sempre [jw.org](https://www.jw.org).

## ✨ Funcionalidades

### 🧠 Inteligência Artificial e Conteúdo
- **Geração Dinâmica:** Perguntas criadas em tempo real pelo Gemini, garantindo grande variedade.
- **Base Teocrática:** Conteúdo alinhado com a Tradução do Novo Mundo e publicações das Testemunhas de Jeová.  
  *(Aviso: Por ser gerado por IA, não é 100% infalível; sempre confira na Bíblia.)*
- **Personalização de Tópicos:** Escolha entre **Geral**, **Livros da Bíblia**, **História da Organização** ou defina um **Assunto Específico**.
- **Nível de Criatividade:** Ajuste o comportamento da IA entre "Conservador" (mais formal) e "Criativo" para variar o estilo das perguntas.

### 🎮 Modos de Jogo e Estrutura
- **Formatos Variados:** Jogue no estilo **Múltipla Escolha**, **Verdadeiro ou Falso** ou **Resposta Livre** (avaliada pela IA).
- **Modo Competição (Times):** Ideal para a Adoração em Família! Crie times (ex: Time A vs Time B), defina nomes personalizados e jogue em grupo.
- **Gerenciamento de Tempo:** É possível **ativar ou desativar o temporizador** conforme a necessidade. Escolha entre várias opções de tempo (5s, 30s, 60s, 90s, 2m, etc.).
- **Efeitos Sonoros (SFX):** Sons interativos para acertos, erros e transições, tornando a experiência mais dinâmica.

### 🆘 Sistema de Ajuda e Feedback
- **Ajudas Configuráveis:** Defina um limite de dicas permitidas por partida.
- **Interatividade:**
  - **Dica do Sistema:** Uma pista direta gerada automaticamente.
  - **Pergunte ao Chat:** Chat interativo para tirar dúvidas específicas sobre a questão antes de responder.
- **Contestar Pergunta:** Substitua a pergunta imediatamente sem afetar a pontuação.
- **Loading Screens Interativas:** Frases de encorajamento e curiosidades teocráticas enquanto a IA processa.

---

## 🚀 Como Rodar Localmente (Run Locally)

**Pré-requisitos:** Ter o [Node.js](https://nodejs.org/) instalado.

### 1. Instale as Dependências
```bash
npm install
```

### 2. Inicie o App
```bash
npm run dev
```
O aplicativo estará disponível no navegador (geralmente em http://localhost:3000).

### 3. Configure a API Key
Ao abrir o aplicativo, insira sua **Google Gemini API Key** na tela de autenticação.

A chave pode ser gerada gratuitamente no [**Google AI Studio**](https://aistudio.google.com/api-keys).

---

## 📦 Compilação, PWA e Deploy

### 1. Configurando PWA (Instalável)

```bash
npm install vite-plugin-pwa --save-dev
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Avalia JW Quiz',
        short_name: 'Avalia JW',
        description: 'Teste seus conhecimentos teocráticos com IA',
        theme_color: '#5b3c88',
        background_color: '#121212',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
```

### 2. Build de Produção
```bash
npm run build
```

### 3. Publicação
Hospede o conteúdo da pasta **dist** em qualquer servidor de arquivos estáticos  
(Vercel, Netlify, GitHub Pages, Hostinger, Locaweb, etc).

---

## 🛠️ Tecnologias Utilizadas

**Front-end**
- React 19
- Tailwind CSS
- HTML5 & CSS3
- Google Fonts (Inter)

**Inteligência Artificial**
- Google Gemini API
- Google GenAI SDK (@google/genai)

**Core**
- TypeScript / JavaScript
- Vite
- Node.js

---

## 🤝 Contribuição

Sugestões de melhorias e relatos de bugs técnicos são bem-vindos via *Issues*.

<div align="center"> Desenvolvido por <b>Paulo Jacomelli</b> </div>
