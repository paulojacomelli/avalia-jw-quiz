import { GoogleGenAI, Type } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult } from "../types";

// --- ENTROPIA E VARIABILIDADE ---
// Esta lista precisa estar aqui para o 'getEntropy' funcionar
const HIDDEN_THEMES = [
  "Foque em profecias menores e seus cumprimentos.",
  "Foque em detalhes geográficos e viagens missionárias.",
  "Foque em mulheres de fé do Antigo e Novo Testamento.",
  "Foque em detalhes da Lei Mosaica e seus princípios.",
  "Foque em ilustrações e parábolas de Jesus menos citadas.",
  "Foque na construção do Tabernáculo e do Templo.",
  "Foque nos Reis de Judá e Israel (bons e maus).",
  "Foque nos Profetas Menores (Oseias a Malaquias).",
  "Foque em qualidades (Fruto do Espírito) e aplicação prática.",
  "Foque em animais, plantas e medidas usadas na Bíblia.",
  "Foque em números bíblicos e cronologia.",
  "Misture tudo, mas dê preferência a personagens 'coadjuvantes' da Bíblia."
];

// Função para pegar um tema aleatório e injetar ruído
const getEntropy = () => {
  const randomIndex = Math.floor(Math.random() * HIDDEN_THEMES.length);
  const timestamp = Date.now(); // Garante que o prompt nunca seja idêntico
  return {
    theme: HIDDEN_THEMES[randomIndex],
    seed: timestamp
  };
};

// Utility to strip markdown code blocks if present
const cleanJson = (text: string): string => {
  if (!text) return "";
  // Remove ```json ... ``` or ``` ... ```
  return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
};

const getSystemInstruction = () => `
Você é um instrutor bíblico experiente, especializado exclusivamente nas publicações oficiais das Testemunhas de Jeová (site jw.org) e na Tradução do Novo Mundo das Escrituras Sagradas (TNM).

DIRETRIZES RÍGIDAS:
1. Fonte Única: Todo conteúdo DEVE ser verificável na TNM ou publicações oficiais (A Sentinela, Despertai!, livros de estudo).
2. Sem Especulação: Não inclua teorias pessoais ou materiais de outras denominações.
3. Precisão Doutrinária: As respostas devem refletir o entendimento ATUAL da organização.
4. Tom: Respeitoso, encorajador, sério e profissional.
5. Formato: Gere estritamente JSON.
6. Idioma: Português (Brasil).
7. Dicas (Hints): As dicas devem ser EXTREMAMENTE CONCISAS e DIRETAS (máximo 1 frase curta). Elas devem ajudar o usuário a lembrar da resposta sem dá-la de bandeja.
8. Explicação (Explanation): Ao justificar a resposta, seja breve, lógico e use o texto bíblico ou o raciocínio da publicação como base.

INSTRUÇÕES DE DIFICULDADE:
- Fácil: Fatos básicos, personagens famosos, textos muito conhecidos.
- Médio: Detalhes de relatos, princípios aplicados, cronologia básica.
- Difícil: Profecias profundas, detalhes menores da Lei, raciocínios doutrinários complexos (ex: tipos e antítipos conforme entendimento atual), contexto histórico específico.
`;

const getTopicPrompt = (config: QuizConfig) => {
  switch (config.mode) {
    case TopicMode.GENERAL:
      return "Temas variados sobre a Bíblia e vida cristã (Conhecimento Exato).";
    case TopicMode.HISTORY:
      return "História Moderna das Testemunhas de Jeová e o desenvolvimento da sua organização terrestre. IMPORTANTE: NÃO inclua perguntas de história bíblica geral (como reis de Israel, apóstolos ou profetas antigos), exceto se for sobre a interpretação profética moderna deles. Foque EXCLUSIVAMENTE em: Datas importantes (ex: 1879, 1914, 1919), Congressos históricos, Biografias de irmãos da história moderna (ex: C.T. Russell, J.F. Rutherford, N.H. Knorr), Lançamento de publicações importantes, Batalhas jurídicas, Construção de Betéis e Expansão da obra mundial. Fonte exclusiva: jw.org (Livro Proclamadores, Anuários, Fé em Ação).";
    case TopicMode.SPECIFIC:
      return `Assunto Específico: "${config.specificTopic}". Crie perguntas EXCLUSIVAMENTE focadas neste tema ou assunto. Se o assunto for uma pessoa, lugar ou evento, explore detalhes bíblicos sobre isso.`;
    case TopicMode.BOOK:
    default:
      return `Livro bíblico de ${config.book}`;
  }
};

const getFormatInstruction = (config: QuizConfig) => {
  if (config.quizFormat === QuizFormat.TRUE_FALSE) {
    return `
    FORMATO DAS PERGUNTAS: VERDADEIRO OU FALSO.
    - O campo 'question' deve ser uma AFIRMAÇÃO DECLARATIVA (não uma pergunta interrogativa) que pode ser julgada como verdadeira ou falsa.
    - O campo 'options' DEVE conter EXATAMENTE duas strings nesta ordem: ["Verdadeiro", "Falso"].
    - O campo 'correctAnswerIndex' deve ser 0 (para Verdadeiro) ou 1 (para Falso).
    `;
  } else if (config.quizFormat === QuizFormat.OPEN_ENDED) {
    return `
    FORMATO DAS PERGUNTAS: RESPOSTA LIVRE.
    - O campo 'question' deve ser uma pergunta interrogativa clara que exija uma explicação curta ou uma resposta factual direta.
    - O campo 'options' deve ser uma lista vazia [].
    - O campo 'correctAnswerIndex' deve ser -1.
    - O campo 'correctAnswerText' DEVE ser preenchido com a resposta correta e uma breve explicação concisa para servir de gabarito.
    `;
  } else {
    // Default: Multiple Choice
    return `
    FORMATO DAS PERGUNTAS: MÚLTIPLA ESCOLHA.
    - O campo 'question' deve ser uma pergunta interrogativa clara.
    - O campo 'options' DEVE conter EXATAMENTE 4 alternativas.
    - Apenas uma alternativa deve estar correta.
    `;
  }
};

// Validate Key Function
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Minimal request to check validity. We expect a text response.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Reply 'OK' if you can read this.",
    });
    
    // If we get a response and it has text, the key is valid and the model is accessible
    if (response && response.text) {
        return true;
    }
    return false;
  } catch (error) {
    console.warn("Key validation failed:", error);
    return false;
  }
};

export const generateQuizContent = async (apiKey: string, config: QuizConfig): Promise<GeneratedQuiz> => {
  if (!apiKey) {
    throw new Error("Chave de API não fornecida.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);
  
  // Entropia
  const entropy = getEntropy();
  const entropyInstruction = config.mode === TopicMode.GENERAL 
    ? `VARIAÇÃO OBRIGATÓRIA: O foco deste quiz deve ser: ${entropy.theme}` 
    : "";

  const prompt = `
    Crie um quiz com ${config.count} perguntas.
    Tema: ${topicPrompt}.
    Dificuldade: ${config.difficulty}.
    ${formatInstruction}

    ${entropyInstruction}
    Seed de Aleatoriedade: ${entropy.seed}

    EVITE CLICHÊS: Não faça perguntas óbvias demais (ex: Quem matou Golias?). Não repita o mesmo personagem no mesmo quiz.
    
    Para cada pergunta:
    1. Siga o formato estipulado acima.
    2. Forneça uma referência bíblica ou de publicação que prove a resposta (ex: "Salmo 83:18" ou "w22.05 p.10").
    3. Forneça uma EXPLICAÇÃO curta (justificativa) de por que a resposta correta é a certa.
    4. Forneça uma DICA (hint) CURTA e CONCISA. O próprio sistema deve identificar automaticamente qual o melhor tipo de dica (contexto, palavra-chave, localização, etc) para a pergunta e fornecê-la diretamente.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: config.temperature, // Using user-defined temperature
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Um título criativo para o quiz baseado no tema" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Um ID único simples, ex: q1" },
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Lista de opções (2 ou 4 dependendo do formato, vazia para Resposta Livre)"
                },
                correctAnswerIndex: { type: Type.INTEGER, description: "Índice base zero ou -1" },
                correctAnswerText: { type: Type.STRING, description: "Texto da resposta correta para Resposta Livre" },
                reference: { type: Type.STRING, description: "Texto base ou publicação fonte para prova" },
                explanation: { type: Type.STRING, description: "Justificativa lógica ou bíblica da resposta correta" },
                hint: { type: Type.STRING, description: "Pequena ajuda amigável para raciocinar sobre a resposta" }
              },
              required: ["id", "question", "options", "correctAnswerIndex", "reference", "explanation", "hint"]
            }
          }
        },
        required: ["title", "questions"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar conteúdo.");

  // Clean and parse
  try {
    return JSON.parse(cleanJson(text)) as GeneratedQuiz;
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Erro ao processar resposta da IA.");
  }
};

export const generateReplacementQuestion = async (apiKey: string, config: QuizConfig, avoidQuestionText: string): Promise<QuizQuestion> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");

  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);

  const prompt = `
    Gere APENAS UMA pergunta de substituição para um quiz.
    Tema: ${topicPrompt}.
    Dificuldade: ${config.difficulty}.
    IMPORTANTE: A pergunta NÃO PODE SER igual ou muito parecida com esta: "${avoidQuestionText}".
    
    EVITE CLICHÊS: Busque um detalhe interessante e não óbvio.
    ${formatInstruction}
    
    Estrutura:
    1. Enunciado.
    2. Alternativas (vazio se resposta livre).
    3. Índice da correta (-1 se livre).
    4. Referência.
    5. Explicação (Justificativa).
    6. Dica CURTA e CONCISA (O sistema escolhe o melhor tipo de dica para o contexto).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: config.temperature, // Using user-defined temperature
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Novo ID único" },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswerIndex: { type: Type.INTEGER },
          correctAnswerText: { type: Type.STRING },
          reference: { type: Type.STRING },
          explanation: { type: Type.STRING },
          hint: { type: Type.STRING }
        },
        required: ["id", "question", "options", "correctAnswerIndex", "reference", "explanation", "hint"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar pergunta substituta.");

  try {
    const question = JSON.parse(cleanJson(text)) as QuizQuestion;
    // Overwrite the ID to ensure uniqueness, forcing React to re-mount components
    question.id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return question;
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Erro ao processar substituição.");
  }
};

// Evaluate user's free text response
export const evaluateFreeResponse = async (apiKey: string, question: string, modelAnswer: string, userAnswer: string): Promise<EvaluationResult> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Aja como um instrutor de quiz bíblico (Testemunhas de Jeová).
    Avalie a resposta do usuário comparando-a com a resposta modelo.
    
    Pergunta: "${question}"
    Resposta Modelo (Gabarito): "${modelAnswer}"
    Resposta do Usuário: "${userAnswer}"

    Sua tarefa:
    1. Atribua uma pontuação de 0.0 a 1.0 (permita fracionados, ex: 0.5 se estiver parcialmente correto ou incompleto).
    2. Forneça um feedback curto e amigável explicando a nota. Se estiver errado, explique o correto suavemente.
    3. Seja flexível com ortografia, mas rigoroso com o sentido doutrinário.

    Responda em JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "0.0 a 1.0" },
          feedback: { type: Type.STRING, description: "Explicação curta" },
          isCorrect: { type: Type.BOOLEAN, description: "True se score > 0.6" }
        },
        required: ["score", "feedback", "isCorrect"]
      }
    }
  });

  const text = response.text;
  if (!text) return { score: 0, feedback: "Erro na avaliação.", isCorrect: false };
  
  try {
    return JSON.parse(cleanJson(text)) as EvaluationResult;
  } catch(e) {
    return { score: 0, feedback: "Erro ao ler avaliação.", isCorrect: false };
  }
};

// New function for Strategic AI Hint
export const askAiAboutQuestion = async (apiKey: string, question: QuizQuestion, userQuery: string): Promise<string> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    O usuário está com dúvidas sobre a seguinte questão de um quiz bíblico (Testemunhas de Jeová).
    Esta questão refere-se a: ${question.reference}.
    
    Pergunta: "${question.question}"
    Alternativas: ${JSON.stringify(question.options)}
    Resposta Correta (NÃO REVELE se o usuário ainda não respondeu, mas se ele estiver contestando, pode explicar): ${question.correctAnswerText || question.options[question.correctAnswerIndex]}
    Referência: ${question.reference}
    Justificativa/Explicação: ${question.explanation}

    O usuário perguntou: "${userQuery}"

    Sua tarefa:
    1. Aja como um instrutor amigável e socrático.
    2. Responda à dúvida do usuário baseando-se no entendimento oficial da organização.
    3. Seja breve (máximo 2 ou 3 frases).
    4. Mantenha um tom calmo e educativo.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Desculpe, não consegui formular uma resposta agora.";
};