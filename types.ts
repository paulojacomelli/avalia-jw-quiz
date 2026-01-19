
export enum Difficulty {
  EASY = 'Fácil',
  MEDIUM = 'Médio',
  HARD = 'Difícil'
}

export enum TopicMode {
  GENERAL = 'Geral',
  BOOK = 'Livros da Bíblia',
  HISTORY = 'A História',
  SPECIFIC = 'Assunto Específico'
}

export enum QuizFormat {
  MULTIPLE_CHOICE = 'Múltipla Escolha',
  TRUE_FALSE = 'Verdadeiro ou Falso',
  OPEN_ENDED = 'Resposta Livre (IA)'
}

export enum HintType {
  STANDARD = 'Dica Padrão',
  ASK_AI = 'Pergunte ao Chat'
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // Opções para Múltipla Escolha (4) ou VF (2), vazio para Resposta Livre
  correctAnswerIndex: number; // Índice da resposta correta (0-3 ou 0-1) - Ignorado na Resposta Livre
  correctAnswerText?: string; // Texto da resposta canônica (usado na validação da Resposta Livre)
  reference: string; // Ex: "Mateus 24:14" ou "w23.01 p. 5"
  hint: string; // Dica amigável para ajudar o jogador
  explanation: string; // Explicação breve e didática do porquê a resposta é correta
  audioBase64?: string; // Áudio da pergunta pré-gerado via TTS, codificado em Base64
}

export interface Team {
  id: string;
  name: string;
  color: string; // Código Hexadecimal para a identidade visual da equipe
  score: number;
  correctCount: number;
  wrongCount: number;
  hintsUsed: number;
}

export interface TTSConfig {
  enabled: boolean;
  autoRead: boolean;
  engine: 'browser' | 'gemini'; // Define qual motor de voz será usado (Navegador ou Google Gemini)
  gender: 'female' | 'male'; // Preferência do gênero da voz
  rate: number; // Velocidade da fala (0.5 a 2.0)
  volume: number; // Volume do áudio (0.0 a 1.0)
}

export interface QuizConfig {
  mode: TopicMode;
  book?: string;
  specificTopic?: string; // Tópico específico digitado pelo usuário
  difficulty: Difficulty;
  temperature: number; // Nível de criatividade da IA (0.0 a 1.0)
  quizFormat: QuizFormat;
  count: number;
  timeLimit: number; // Tempo limite em segundos por pergunta
  maxHints: number; // Quantidade de dicas permitidas por partida
  hintTypes: HintType[]; // Tipos de dicas selecionados pelo usuário
  enableTimer: boolean; // Se o temporizador visual deve ser exibido
  enableTimerSound: boolean; // Se o som de ticking do relógio deve ser tocado

  // Configuração de Equipes
  isTeamMode: boolean;
  teams: string[]; // Lista com os nomes das equipes

  // Configuração de Rodadas
  questionsPerRound: number; // Intervalo de perguntas para exibir o resumo parcial

  // Configuração de TTS (Voz)
  tts: TTSConfig;

  // Histórico para evitar repetições
  usedTopics?: string[];
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
  keywords: string[]; // Palavras-chave temáticas dinâmicas para aumentar a entropia nas próximas gerações
  focalTheme?: string;
}

export interface EvaluationResult {
  score: number; // Pontuação de 0.0 a 1.0
  feedback: string;
  isCorrect: boolean;
}

export interface ApiErrorDetail {
  title: string;
  message: string;
  solution: string;
  code: string;
}
