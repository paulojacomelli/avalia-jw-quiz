
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
  { value: 5, label: "5s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1 min" },
  { value: 90, label: "1m 30s" },
  { value: 120, label: "2 min" },
];

export const HINT_TYPE_OPTIONS = [
  { 
    value: HintType.STANDARD, 
    label: "Dica do Sistema", 
    icon: "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
  },
  { 
    value: HintType.ASK_AI, 
    label: "Pergunte ao Chat", 
    icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
  }
];

export const LOADING_MESSAGES = [
  "Lembre-se: O JW Quiz é para diversão. Para estudo sério, acesse jw.org.",
  "Dúvidas na resposta? Consulte sempre a 'Espada do Espírito' (a Bíblia)!",
  "Este app não substitui seu Estudo Pessoal. (Mas ajuda a testar a memória!)",
  "A fonte oficial é o 'Escravo Fiel'. Nós somos apenas o 'Quiz Fiel'.",
  "Não confie na nossa memória 100%. Confie em Jeová 100%.",
  "Encontrou um erro? Seja amoroso e nos avise. Ninguém é perfeito!",
  "Dica: Use este jogo para ter ideias para sua Adoração em Família.",
  "Aguardando o sinal... Tenha paciência, é um fruto do espírito!",
  "Carregando... Esperamos que seja mais rápido que achar o livro de Obadias.",
  "Conectando... Não desanime, 'quem perseverar até o fim será salvo'.",
  "Procurando o irmão do som para liberar o microfone...",
  "Estamos quase lá... Continue vigilante!",
  "Contando as cadeiras da assistência... aguarde.",
  "Arrumando o carrinho de publicações... só um instante.",
  "Carregando... (Aproveite para beber uma água, hidratar é importante).",
  "Afie sua mente e sua espiritualidade. O jogo já vai começar.",
  "Preparando perguntas... Você leu o texto diário hoje?",
  "Carregando novos desafios teocráticos...",
  "Recuperando dados... Tente lembrar o que foi dito na reunião de ontem!",
  "Dica Pro: Quem se prepara para a Sentinela acerta mais perguntas aqui."
];
