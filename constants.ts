import { Difficulty, TopicMode, HintType, QuizFormat } from './types';

export const BIBLE_BOOKS = [
  // Hebrew Scriptures
  "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", 
  "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester",
  "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cântico de Salomão",
  "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel",
  "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias",
  // Christian Greek Scriptures
  "Mateus", "Marcos", "Lucas", "João", "Atos",
  "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses",
  "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus",
  "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
];

export const DIFFICULTY_OPTIONS = [
  { value: Difficulty.EASY, label: "Fácil" },
  { value: Difficulty.MEDIUM, label: "Médio" },
  { value: Difficulty.HARD, label: "Difícil" },
];

export const MODE_OPTIONS = [
  { value: TopicMode.GENERAL, label: "Geral" },
  { value: TopicMode.BOOK, label: "Livros da Bíblia" },
  { value: TopicMode.HISTORY, label: "A História" },
  { value: TopicMode.SPECIFIC, label: "Assunto Específico" },
];

export const FORMAT_OPTIONS = [
  { value: QuizFormat.MULTIPLE_CHOICE, label: "Múltipla Escolha" },
  { value: QuizFormat.TRUE_FALSE, label: "Verdadeiro ou Falso" },
  { value: QuizFormat.OPEN_ENDED, label: "Resposta Livre (IA)" },
];

export const TIME_OPTIONS = [
  { value: 30, label: "30s" },
  { value: 60, label: "1 min" },
  { value: 90, label: "1m 30s" },
  { value: 120, label: "2 min" },
];

export const HINT_TYPE_OPTIONS = [
  { 
    value: HintType.RANDOM, 
    label: "Aleatória", 
    icon: "M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
  },
  { 
    value: HintType.ASK_AI, 
    label: "Pergunte ao Chat", 
    icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
  },
  { 
    value: HintType.CONTEXT, 
    label: "Contexto", 
    icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
  },
  { 
    value: HintType.LOCATION, 
    label: "Local", 
    icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
  },
  { 
    value: HintType.TEMPORAL, 
    label: "Tempo", 
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  { 
    value: HintType.ASSOCIATION, 
    label: "Assoc.", 
    icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
  },
  { 
    value: HintType.ELIMINATION, 
    label: "Elimin.", 
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
  },
  { 
    value: HintType.KEYWORD, 
    label: "Palavra", 
    icon: "M9.568 3a6.58 6.58 0 011.911 10.43L2.3 22.617a.64.64 0 01-.892-.016l-1.39-1.425a.64.64 0 01-.005-.882L9.123 11.22A6.578 6.578 0 019.568 3zM15 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
  },
  { 
    value: HintType.CHARACTER, 
    label: "Pessoa", 
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
  },
  { 
    value: HintType.COMPARISON, 
    label: "Comp.", 
    icon: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
  },
];