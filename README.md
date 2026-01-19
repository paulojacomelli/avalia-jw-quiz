
# Avalia Quiz & Avalia JW Quiz - Guia para Desenvolvedores

Bem-vindo ao repositório do projeto **Avalia**. Este repositório contém dois aplicativos React independentes, mas estruturalmente similares, focados em gerar quizzes educacionais utilizando Inteligência Artificial (Google Gemini).

-   📂 **`avalia-quiz`**: Versão para conhecimentos gerais (Acadêmico, Entretenimento, etc.).
-   📂 **`avalia-jw-quiz`**: Versão temática bíblica e teocrática.

---

## 🚀 Guia de Implementação e Instalação (Passo a Passo)

Siga este guia para configurar o ambiente de desenvolvimento, obter suas credenciais e rodar os projetos na sua máquina.

### 1. Pré-requisitos
Certifique-se de ter instalado em sua máquina:
*   [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada).
*   Um editor de código (como o [VS Code](https://code.visualstudio.com/)).
*   Uma conta no Google (para acessar o Google AI Studio e Firebase).

### 2. Clonar e Instalar Dependências

Abra seu terminal e rode os comandos:

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/avalia.git
cd avalia

# Instale as dependências
npm install
```

---

## 🔑 Como Obter as Credenciais (API Keys)

Para que o aplicativo funcione, você precisará de duas configurações principais: **Google Gemini API** (para gerar as perguntas) e **Firebase** (para salvar e compartilhar quizzes).

### A. Google Gemini API Key 🧠
A "inteligência" do app vem do modelo Gemini.

1.  Acesse o [Google AI Studio](https://aistudio.google.com/).
2.  Faça login com sua conta Google.
3.  Clique no botão **"Get API key"** (no canto superior esquerdo ou menu).
4.  Clique em **"Create API key"**.
5.  Selecione um projeto existente ou crie um novo no Google Cloud console quando solicitado.
6.  Copie a chave gerada (começa com `AIza...`).
7.  **Guarde essa chave**, você a usará no arquivo `.env.local`.

### B. Credenciais do Firebase 🔥
O Firebase é usado como banco de dados para salvar os quizzes gerados e permitir o modo "Biblioteca da Comunidade".

1.  Acesse o [Console do Firebase](https://console.firebase.google.com/).
2.  Clique em **"Adicionar projeto"** e dê um nome (ex: `meu-avalia-quiz`).
3.  Desative o Google Analytics (opcional, simplifica a criação) e clique em **"Criar projeto"**.
4.  **Configurar o Web App:**
    *   No painel do projeto, clique no ícone de **Web** `</>` (logo abaixo do nome do projeto).
    *   Dê um apelido para o app e clique em **"Registrar app"**.
    *   O Firebase mostrará um código com `firebaseConfig`. **COPIE os valores** dentro desse objeto (apiKey, authDomain, projectId, etc.). Você precisará deles em breve.
5.  **Configurar o Firestore (Banco de Dados):**
    *   No menu lateral esquerdo, vá em **Criação > Firestore Database**.
    *   Clique em **"Criar banco de dados"**.
    *   Escolha um local (ex: `nam5 (us-central)` ou `sao-paulo`).
    *   **Importante:** Comece no **modo de teste** (permite leitura/escrita por 30 dias) ou configure as regras de segurança apropriadas para produção.

---

## ⚙️ Configuração do Ambiente (.env)

Agora que você tem as chaves, vamos configurar o projeto.

1.  Na pasta do projeto que deseja rodar (ex: `avalia-quiz` ou `avalia-jw-quiz`), localize o arquivo `.env.example`.
2.  Duplique este arquivo e renomeie a cópia para `.env.local`.
    *   *Nota: O arquivo `.env.local` é ignorado pelo Git para não expor suas senhas.*
3.  Abra o `.env.local` e preencha com suas credenciais:

```env
# Sua chave do Google AI Studio
GEMINI_API_KEY=AIzaSy...SuaChaveAqui...

# Suas credenciais do Console do Firebase
VITE_FIREBASE_API_KEY=AIzaSy...SuaChaveFirebase...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sku-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456...
VITE_FIREBASE_MEASUREMENT_ID=G-XYZ...
```

---

## ▶️ Rodando o Projeto

Com tudo configurado, basta iniciar o servidor de desenvolvimento:

```bash
# Para rodar o Avalia Quiz (Geral)
cd avalia-quiz
npm run dev

# Para rodar o Avalia JW Quiz (Bíblico)
cd avalia-jw-quiz
npm run dev
```

O terminal mostrará um link (geralmente `http://localhost:5173` ou similar). Clique para abrir no seu navegador.

---

## 📦 Build para Produção

Se quiser hospedar o site na internet (Vercel, Netlify, etc.):

1.  Execute:
    ```bash
    npm run build
    ```
2.  Isso criará uma pasta `dist` com os arquivos otimizados.
3.  Faça o deploy dessa pasta `dist`. Lembre-se de configurar as mesmas **Variáveis de Ambiente** no painel do seu serviço de hospedagem (Vercel/Netlify), copiando os valores do seu `.env.local`.

---

## 📜 Licença

Este projeto é distribuído sob a licença **GPLv3**. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.

Isso significa que você é livre para usar, estudar, compartilhar e modificar o software, desde que as versões modificadas também sejam livres e open source sob a mesma licença.
