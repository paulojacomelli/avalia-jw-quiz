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
  options: string[]; // 4 options for Multiple Choice, 2 for True/False, empty for Open Ended
  correctAnswerIndex: number; // 0-3 or 0-1 (ignored for Open Ended)
  correctAnswerText?: string; // Canonical answer for Open Ended mode
  reference: string; // e.g., "Mateus 24:14" or "w23.01 p. 5"
  hint: string; // Friendly clue
  explanation: string; // Brief justification for the answer
}

export interface Team {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  hintsUsed: number;
}

export interface TTSConfig {
  enabled: boolean;
  autoRead: boolean;
  gender: 'female' | 'male';
  rate: number; // 0.5 to 2
  volume: number; // 0 to 1
}

export interface QuizConfig {
  mode: TopicMode;
  book?: string;
  specificTopic?: string; // New field for user typed topic
  difficulty: Difficulty;
  quizFormat: QuizFormat;
  count: number;
  timeLimit: number; // Seconds per question
  maxHints: number; // Number of hints allowed
  hintTypes: HintType[]; // Array of selected hint styles
  enableTimer: boolean; // Toggle for timer
  enableTimerSound: boolean; // Toggle for timer ticking sound
  
  // Team Mode
  isTeamMode: boolean;
  teams: string[]; // Names of teams
  
  // Rounds
  questionsPerRound: number; // How many questions before a partial summary

  // TTS
  tts: TTSConfig;
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
}

export interface EvaluationResult {
  score: number; // 0.0 to 1.0
  feedback: string;
  isCorrect: boolean;
}