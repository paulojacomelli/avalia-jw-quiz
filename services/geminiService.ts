import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult, TTSConfig } from "../types";
import { getQuestionReadAloudText } from "../utils/tts";

// --- ENTROPIA E VARIABILIDADE ---
// Now handled dynamically via keyword exclusion in the prompt

const cleanJson = (text: string): string => {
  if (!text) return "";
  return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
};

const getSystemInstruction = () => `
Você é um instrutor bíblico experiente, especializado exclusivamente nas publicações oficiais das Testemunhas de Jeová (site jw.org) e na Tradução do Novo Mundo das Escrituras Sagradas (TNM).

DIRETRIZES DE LINGUAGEM E DIFICULDADE:
1. Linguagem Simples: Use frases curtas, diretas e vocabulário acessível. Evite termos excessivamente arcaicos ou construções gramaticais complexas. As perguntas devem ser fáceis de ler e entender rapidamente.
2. Dificuldade por Profundidade: A dificuldade (Fácil, Médio, Difícil) não deve vir da complexidade do texto, mas sim da profundidade ou raridade do tema:
   - Fácil: Temas centrais, histórias muito conhecidas e ensinos básicos.
   - Médio: Detalhes específicos de relatos bíblicos, profecias intermediárias ou história organizacional.
   - Difícil: Temas profundos, detalhes raros, cronologia bíblica complexa ou pontos específicos de "A Sentinela" e livros de estudo.

DIRETRIZES RÍGIDAS:
1. Fonte Única: Todo conteúdo DEVE ser verificável na TNM ou publicações oficiais.
2. Sem Especulação: Não inclua teorias pessoais.
3. Precisão Doutrinária: As respostas devem refletir o entendimento ATUAL da organização.
4. Formato: Gere estritamente JSON.
5. Dicas: Devem ser extremamente concisas (máximo 1 frase).
`;

const getTopicPrompt = (config: QuizConfig) => {
  switch (config.mode) {
    case TopicMode.GENERAL: return "Temas variados sobre a Bíblia e vida cristã.";
    case TopicMode.HISTORY: return "História Moderna das Testemunhas de Jeová (1870 até hoje).";
    case TopicMode.SPECIFIC: return `Assunto Específico: "${config.specificTopic}".`;
    case TopicMode.BOOK:
    default: return `Livro bíblico de ${config.book}`;
  }
};

const getFormatInstruction = (config: QuizConfig) => {
  if (config.quizFormat === QuizFormat.TRUE_FALSE) return `FORMATO: VERDADEIRO OU FALSO. options: ["Verdadeiro", "Falso"].`;
  if (config.quizFormat === QuizFormat.OPEN_ENDED) return `FORMATO: RESPOSTA LIVRE. options: []. correctAnswerIndex: -1. Preencha correctAnswerText.`;
  return `FORMATO: MÚLTIPLA ESCOLHA. 4 alternativas.`;
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "Reply 'OK'." });
    return !!(response && response.text);
  } catch (error) { return false; }
};

export const generateQuizContent = async (apiKey: string, config: QuizConfig, globalExclusions: string[] = []): Promise<GeneratedQuiz> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);

  const allExclusions = Array.from(new Set([...(config.usedTopics || []), ...globalExclusions]));

  const exclusionList = allExclusions.length > 0
    ? `PROIBIDO: Não aborde temas diretamente relacionados a estas palavras-chave: ${allExclusions.join(', ')}.`
    : '';

  const prompt = `
    Crie um quiz com ${config.count} perguntas originais.
    Tema Base: ${topicPrompt}.
    Dificuldade Solicitada: ${config.difficulty} (Lembre-se: dificuldade baseada na profundidade do tema, com texto de leitura simples).
    ${formatInstruction}
    ${exclusionList}
    VARIAÇÃO: Escolha um subtema criativo e específico dentro do tema base que ainda não tenha sido explorado.
    PALAVRAS-CHAVE: Ao final, extraia APENAS UM termo (keyword) principal que defina o foco deste quiz para controle de entropia futura.
    REGRAS DE ORIGINALIDADE: Busque detalhes interessantes e não óbvios conforme a dificuldade solicitada.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: config.temperature,
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
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
        },
        required: ["title", "questions"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar conteúdo.");
  try {
    const parsed = JSON.parse(cleanJson(text)) as GeneratedQuiz;
    parsed.focalTheme = parsed.keywords?.[0] || "Dinâmico";
    return parsed;
  } catch (e) { throw new Error("Erro ao processar resposta da IA."); }
};

export const generateReplacementQuestion = async (apiKey: string, config: QuizConfig, avoidQuestionText: string): Promise<QuizQuestion> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);
  const prompt = `Gere APENAS UMA pergunta de substituição inédita. Tema: ${topicPrompt}. Dificuldade: ${config.difficulty}. PROIBIDO: Não pode ser igual a: "${avoidQuestionText}". ${formatInstruction}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: config.temperature,
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
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
  if (!text) throw new Error("Falha ao gerar pergunta.");
  try {
    const question = JSON.parse(cleanJson(text)) as QuizQuestion;
    question.id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return question;
  } catch (e) { throw new Error("Erro ao processar substituição."); }
};

export const evaluateFreeResponse = async (apiKey: string, question: string, modelAnswer: string, userAnswer: string): Promise<EvaluationResult> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Avalie a resposta: Pergunta: "${question}", Resposta Correta: "${modelAnswer}", Usuário: "${userAnswer}". JSON: {score, feedback, isCorrect}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          isCorrect: { type: Type.BOOLEAN }
        },
        required: ["score", "feedback", "isCorrect"]
      }
    }
  });
  return JSON.parse(cleanJson(response.text));
};

export const askAiAboutQuestion = async (apiKey: string, question: QuizQuestion, userQuery: string): Promise<string> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Dúvida sobre: ${question.question} (${question.reference}). Pergunta do usuário: "${userQuery}". Responda brevemente como instrutor JW.`;
  const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
  return response.text || "Sem resposta.";
};

export const generateSpeech = async (apiKey: string, text: string, config: TTSConfig): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const voiceName = config.gender === 'male' ? 'Fenrir' : 'Kore';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) { return null; }
};

export const preGenerateQuizAudio = async (apiKey: string, quiz: GeneratedQuiz, ttsConfig: TTSConfig, teamNames: string[] = []): Promise<GeneratedQuiz> => {
  if (!apiKey) return quiz;
  const updatedQuestions = [...quiz.questions];
  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    let activeTeamName = teamNames.length > 0 ? teamNames[i % teamNames.length] : "";
    const textToRead = getQuestionReadAloudText(q, activeTeamName);
    try {
      const audioBase64 = await generateSpeech(apiKey, textToRead, ttsConfig);
      if (audioBase64) updatedQuestions[i].audioBase64 = audioBase64;
    } catch (e) { }
  }
  return { ...quiz, questions: updatedQuestions };
}