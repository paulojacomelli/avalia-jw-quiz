<div align="center">
<img width="1200" height="475" alt="JW Quiz Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# JW Quiz - Powered by Gemini
### Teste seus conhecimentos teocráticos com Inteligência Artificial
</div>

---

## 📖 Sobre o Projeto

O **JW Quiz** é um aplicativo interativo de perguntas e respostas focado em conhecimento bíblico e história teocrática. Utilizando a tecnologia da **Google Gemini API**, o app gera perguntas dinâmicas, feedbacks baseados na *Tradução do Novo Mundo* e oferece uma experiência de aprendizado envolvente.

> **Nota:** Este aplicativo é um projeto pessoal para fins de entretenimento e reforço de memória. Ele **não** é um software oficial da *Watch Tower Bible and Tract Society of Pennsylvania*. Para doutrina e publicações oficiais, visite sempre [jw.org](https://www.jw.org).

## ✨ Funcionalidades

### 🧠 Inteligência Artificial e Conteúdo
- **Geração Dinâmica:** Perguntas criadas em tempo real pelo Gemini, garantindo grande variedade.
- **Base Teocrática:** Conteúdo alinhado com a Tradução do Novo Mundo e publicações das Testemunhas de Jeová. (Aviso: Por ser gerado por IA, não é 100% infalível; sempre confira na Bíblia).
- **Personalização de Tópicos:** Escolha entre **Geral**, **Livros da Bíblia**, **História da Organização** ou defina um **Assunto Específico**.
- **Nível de Criatividade:** Ajuste o comportamento da IA entre "Conservador" (mais formal) e "Criativo" para variar o estilo das perguntas.

### 🎮 Modos de Jogo e Estrutura
- **Formatos Variados:** Jogue no estilo **Múltipla Escolha**, **Verdadeiro ou Falso** ou **Resposta Livre** (avaliada pela IA).
- **Modo Competição (Times):** Ideal para a Adoração em Família! Crie times (ex: Time A vs Time B), defina nomes personalizados e jogue em grupo.
- **Gerenciamento de Tempo:** É possível **ativar ou desativar o temporizador** conforme a necessidade. Escolha entre várias opções de tempo (5s, 30s, 60s, 90s, 2m, etc.) para aumentar a emoção.
- **Efeitos Sonoros (SFX):** O jogo conta com sons interativos para acertos, erros e transições, tornando a experiência muito mais dinâmica e divertida.

### 🆘 Sistema de Ajuda e Feedback
- **Ajudas Configuráveis:** Defina um limite de dicas permitidas por partida.
- **Interatividade:**
  - **Dica do Sistema:** Uma pista direta gerada automaticamente.
  - **Pergunte ao Chat:** Um chat interativo onde você pode tirar dúvidas específicas sobre a questão com a IA antes de responder.
- **Contestar Pergunta:** Encontrou uma imprecisão? Substitua a pergunta imediatamente sem afetar a pontuação.
- **Loading Screens Interativas:** Frases de encorajamento e curiosidades teocráticas enquanto a IA processa.

---

## 🚀 Como Rodar Localmente (Run Locally)

Siga os passos abaixo para executar o projeto em sua máquina.

**Pré-requisitos:** Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

### 1. Instale as Dependências

Abra o terminal na pasta do projeto e execute:

```bash
npm install

```

### 2. Inicie o AppExecute o comando de desenvolvimento para iniciar o servidor local:
Execute o comando de desenvolvimento para iniciar o servidor local:

```bash
npm run dev

```

O aplicativo estará disponível no seu navegador (geralmente em `http://localhost:3000`).

### 3. Configure a API Key
Ao abrir o aplicativo no navegador, você verá uma **Tela de Autenticação**. Basta inserir sua **Google Gemini API Key** neste campo para liberar o acesso e começar a gerar os quizzes.
> **Onde conseguir a chave?** Gere sua API Key gratuitamente no [Google AI Studio](https://aistudio.google.com/api-keys).

---

## 🛠️ Tecnologias Utilizadas

### Front-end & Interface
- **React 19:** Biblioteca JavaScript moderna para construção de interfaces (via esm.sh).
- **Tailwind CSS:** Framework de utilitários CSS para estilização rápida e design responsivo.
- **HTML5 & CSS3:** Estrutura semântica e estilização customizada (com variáveis CSS e Dark Mode).
- **Google Fonts (Inter):** Tipografia otimizada para legibilidade em interfaces de usuário.

### Inteligência Artificial
- **Google Gemini API:** Modelo de IA Generativa.
- **Google GenAI SDK:** Biblioteca oficial (`@google/genai`) para integração direta via JavaScript.

### Core & Ferramentas
- **TypeScript / JavaScript:** Lógica da aplicação.
- **Vite:** Build tool para inicialização rápida.
- **Node.js:** Ambiente de desenvolvimento.

## 🤝 Contribuição
Sugestões de novas funcionalidades e relatos de bugs técnicos no código são muito bem-vindos! Sinta-se à vontade para abrir uma *Issue*.

---

<div align="center">
Desenvolvido por <b>Paulo Jacomelli</b>
</div>
