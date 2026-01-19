
# Avalia JW Quiz - Quizzes Bíblicos e Teocráticos

Bem-vindo ao repositório do **Avalia JW Quiz**. Este é um aplicativo React focado em auxiliar no estudo bíblico e teocrático através de quizzes gerados por Inteligência Artificial (Google Gemini). Ideal para e Noite de Adoração em Família ou estudo pessoal.

## 🌟 Funcionalidades

-   **Temas Teocráticos:** Gere perguntas sobre personagens bíblicos, livros da Bíblia, história moderna e mais.
-   **Respeito ao Contexto:** A IA é instruída para gerar perguntas baseadas em fatos bíblicos.
-   **Modo Estudo:** Aprenda com explicações detalhadas para cada resposta.
-   **Biblioteca de Estudo:** Compartilhe seus quizzes com a congregação ou amigos (via Firebase).

---

## 🚀 Guia de Implementação e Instalação

Siga este guia para configurar o projeto na sua máquina.

### 1. Pré-requisitos
*   [Node.js](https://nodejs.org/) (v18+).
*   Editor de código (ex: VS Code).
*   Conta Google (para API Gemini e Firebase).

### 2. Clonar e Instalar

```bash
# Clone o repositório
git clone https://github.com/paulojacomelli/avalia-jw-quiz.git
cd avalia-jw-quiz

# Instale as dependências
npm install
```

---

## 🔑 Configuração das Credenciais

O app precisa de duas chaves para funcionar: **Google Gemini** (Cérebro do IA) e **Firebase** (Banco de Dados).

### A. Google Gemini API Key 🧠
1.  Acesse o [Google AI Studio](https://aistudio.google.com/).
2.  Clique em **"Get API key"** > **"Create API key"**.
3.  Copie a chave gerada (inicia com `AIza...`).

### B. Credenciais do Firebase 🔥
1.  Acesse o [Console do Firebase](https://console.firebase.google.com/).
2.  Crie um novo projeto.
3.  Adicione um **Web App** `</>` para obter o `firebaseConfig`.
4.  Ative o **Firestore Database** em modo de teste.

---

## ⚙️ Configuração do Ambiente

1.  Renomeie o arquivo `.env.example` para `.env.local`.
2.  Preencha com suas chaves:

```env
GEMINI_API_KEY=SuaChaveGeminiAqui
VITE_FIREBASE_API_KEY=SuaChaveFirebase
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
# ... demais configurações do Firebase
```

---

## ▶️ Rodando o Projeto

```bash
npm run dev
```
Acesse `http://localhost:5173`.

---

## 📜 Licença

Este projeto é distribuído sob a licença **GPLv3**.
Você é livre para usar, estudar e modificar o software, mantendo-o open source.
