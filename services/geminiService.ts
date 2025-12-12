import { GoogleGenAI, Type } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult } from "../types";

const getSystemInstruction = () => `
Você é um instrutor bíblico experiente, especializado exclusivamente nas publicações oficiais das Testemunhas de Jeová (site jw.org) e na Tradução do Novo Mundo das Escrituras Sagradas (TNM).

DIRETRIZES RÍGIDAS:
1. Fonte Única: Todo conteúdo DEVE ser verificável na TNM ou publicações oficiais (A Sentinela, Despertai!, livros de estudo).
2. Sem Especulação: Não inclua teorias pessoais ou materiais de outras denominações.
3. Precisão Doutrinária: As respostas devem refletir o entendimento ATUAL da organização.
4. Tom: Respeitoso, encorajador, sério e profissional.
5. Formato: Gere estritamente JSON.
6. Idioma: Português (Brasil).
7. Dicas (Hints): As dicas devem ser amigáveis e sutis. Devem ajudar a memória do usuário sem entregar a resposta de bandeja e sem exigir que ele vá pesquisar em uma publicação.
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
      return "História Bíblica e, especificamente, acontecimentos relacionados à História Moderna das Testemunhas de Jeová (do passado aos dias atuais). Baseie-se EXCLUSIVAMENTE em informações disponíveis no site jw.org (Anuários, Proclamadores, etc). Não use fontes seculares externas.";
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

const getHintStyleInstruction = (hintTypes: HintType[]) => {
  // Description map
  const descriptions: Record<HintType, string> = {
    [HintType.ASK_AI]: "N/A (Gerado dinamicamente)",
    [HintType.CONTEXT]: "Contexto (descreva a situação/cenário)",
    [HintType.LOCATION]: "Localização (pistas geográficas)",
    [HintType.TEMPORAL]: "Temporal (época, ano, sequência)",
    [HintType.ASSOCIATION]: "Associação (relacione com outro fato conhecido)",
    [HintType.ELIMINATION]: "Eliminação (diga o que NÃO é)",
    [HintType.KEYWORD]: "Palavra-chave (termo específico do texto)",
    [HintType.CHARACTER]: "Personagem (características de alguém envolvido)",
    [HintType.COMPARISON]: "Comparação (contraste com outro evento)",
    [HintType.RANDOM]: "Misto (qualquer estilo)"
  };

  const validTypes = hintTypes.filter(t => t !== HintType.ASK_AI);

  if (!validTypes || validTypes.length === 0 || (validTypes.length === 1 && validTypes[0] === HintType.RANDOM)) {
    return "Use uma variedade de estilos de dicas (contexto, palavra-chave, associação, etc) de forma imprevisível.";
  }

  const selectedDescriptions = validTypes
    .filter(t => t !== HintType.RANDOM)
    .map(t => `- ${descriptions[t]}`)
    .join("\n");

  return `Para cada pergunta, escolha ALEATORIAMENTE um dos seguintes estilos de dica (e apenas estes):\n${selectedDescriptions}`;
};

export const generateQuizContent = async (config: QuizConfig, historyToAvoid: string[] = []): Promise<GeneratedQuiz> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API não encontrada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const hintInstruction = getHintStyleInstruction(config.hintTypes);
  const formatInstruction = getFormatInstruction(config);
  
  // Format history for prompt, limiting length to avoid token limits
  const avoidPrompt = historyToAvoid.length > 0
    ? `IMPORTANTE - EVITE REPETIR AS SEGUINTES PERGUNTAS JÁ FEITAS: ${historyToAvoid.slice(-50).join('; ')}.`
    : '';

  const prompt = `
    Crie um quiz com ${config.count} perguntas.
    Tema: ${topicPrompt}.
    Dificuldade: ${config.difficulty}.
    ${formatInstruction}
    ${avoidPrompt}
    
    Para cada pergunta:
    1. Siga o formato estipulado acima.
    2. Forneça uma referência bíblica ou de publicação que prove a resposta (ex: "Salmo 83:18" ou "w22.05 p.10").
    3. Forneça uma EXPLICAÇÃO curta (justificativa) de por que a resposta correta é a certa.
    4. Forneça uma DICA (hint) curta e amigável.
       ESTILO DA DICA OBRIGATÓRIO: ${hintInstruction}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
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

  return JSON.parse(text) as GeneratedQuiz;
};

export const generateReplacementQuestion = async (config: QuizConfig, avoidQuestionText: string): Promise<QuizQuestion> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chave de API não encontrada.");

  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const hintInstruction = getHintStyleInstruction(config.hintTypes);
  const formatInstruction = getFormatInstruction(config);

  const prompt = `
    Gere APENAS UMA pergunta de substituição para um quiz.
    Tema: ${topicPrompt}.
    Dificuldade: ${config.difficulty}.
    IMPORTANTE: A pergunta NÃO PODE SER igual ou muito parecida com esta: "${avoidQuestionText}".
    ${formatInstruction}
    
    Estrutura:
    1. Enunciado.
    2. Alternativas (vazio se resposta livre).
    3. Índice da correta (-1 se livre).
    4. Referência.
    5. Explicação (Justificativa).
    6. Dica amigável (${hintInstruction}).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
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

  return JSON.parse(text) as QuizQuestion;
};

// Evaluate user's free text response
export const evaluateFreeResponse = async (question: string, modelAnswer: string, userAnswer: string): Promise<EvaluationResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chave de API não encontrada.");

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
  return JSON.parse(text) as EvaluationResult;
};

// New function for Strategic AI Hint
export const askAiAboutQuestion = async (question: QuizQuestion, userQuery: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chave de API não encontrada.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    O usuário está com dúvidas sobre a seguinte questão de um quiz bíblico (Testemunhas de Jeová):
    
    Pergunta: "${question.question}"
    Alternativas: ${JSON.stringify(question.options)}
    Resposta Correta (NÃO REVELE se o usuário ainda não respondeu, mas se ele estiver contestando, pode explicar): ${question.correctAnswerText || question.options[question.correctAnswerIndex]}
    Referência: ${question.reference}
    Justificativa/Explicação: ${question.explanation}

    O usuário perguntou: "${userQuery}"

    Sua tarefa:
    1. Aja como um instrutor amigável e socrático.
    2. Responda à dúvida do usuário. Se ele estiver contestando a resposta, explique com base na Bíblia ou lógica das publicações.
    3. Seja breve (máximo 2 ou 3 frases).
    4. Mantenha um tom calmo e educativo.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Desculpe, não consegui formular uma resposta agora.";
};

// Generate specific hint type on demand
export const generateHintByType = async (question: QuizQuestion, hintType: HintType): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chave de API não encontrada.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Preciso de uma dica específica para esta pergunta de quiz bíblico (JW.org):
    
    Pergunta: "${question.question}"
    Resposta Correta: ${question.correctAnswerText || question.options[question.correctAnswerIndex]}
    
    Gere uma dica do tipo: "${hintType}".
    
    Diretrizes:
    1. NÃO DÊ A RESPOSTA.
    2. Se o tipo for "Localização", fale sobre geografia.
    3. Se for "Palavra-Chave", destaque um termo grego/hebraico ou termo chave do versículo.
    4. Se for "Contexto", explique o que estava acontecendo na época.
    5. Seja breve (1 parágrafo curto).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Dica não disponível no momento.";
};