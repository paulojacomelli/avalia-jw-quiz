import { Difficulty, TopicMode, HintType, QuizFormat, GeneratedQuiz, QuizConfig } from './types';

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
  { value: TopicMode.GENERAL, label: "Geral", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
  { value: TopicMode.BOOK, label: "Livros da Bíblia", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { value: TopicMode.HISTORY, label: "A História", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: TopicMode.SPECIFIC, label: "Assunto Específico", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
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

// --- TUTORIAL DATA ---

export const TUTORIAL_CONFIG: QuizConfig = {
  mode: TopicMode.GENERAL,
  difficulty: Difficulty.EASY,
  temperature: 1.0,
  quizFormat: QuizFormat.MULTIPLE_CHOICE,
  count: 4,
  timeLimit: 120,
  maxHints: 99,
  hintTypes: [HintType.STANDARD, HintType.ASK_AI],
  enableTimer: true,
  enableTimerSound: true,
  isTeamMode: false,
  teams: [],
  questionsPerRound: 4,
  tts: {
    enabled: true,
    autoRead: true,
    engine: 'browser', // Use browser for tutorial to be safe/fast
    gender: 'female',
    rate: 1.2,
    volume: 1.0
  }
};

export const TUTORIAL_DATA: GeneratedQuiz = {
  title: "Modo Treinamento: Comece o Jogo",
  keywords: ["treinamento", "tutorial"],
  questions: [
    {
      id: "tut-1",
      question: "Bem-vindo ao JW Quiz! Esta é uma pergunta de Múltipla Escolha. Para responder, você deve clicar na opção correta abaixo. Vamos testar?",
      options: [
        "Esta é a opção errada.",
        "Esta também está incorreta.",
        "Clique AQUI! Esta é a resposta certa.",
        "Não clique nesta."
      ],
      correctAnswerIndex: 2,
      reference: "Manual do Usuário",
      hint: "A resposta correta pede explicitamente para você clicar nela.",
      explanation: "Em perguntas de múltipla escolha, apenas uma alternativa é a correta. Ao acertar, você ganha pontos e avança."
    },
    {
      id: "tut-2",
      question: "Você pode usar 'Dicas' se estiver com dúvida. Tente clicar no botão de 'Ajuda' abaixo para ver uma dica sobre esta pergunta antes de responder.",
      options: [
        "Verdadeiro",
        "Falso"
      ],
      correctAnswerIndex: 0,
      reference: "Recursos do App",
      hint: "Parabéns! Você encontrou a dica. A resposta é 'Verdadeiro'.",
      explanation: "Cada ajuda utilizada consome um uso do seu limite. Use com sabedoria! Além da Dica Padrão, você pode perguntar ao Chat IA."
    },
    {
      id: "tut-3",
      question: "Este é o modo 'Resposta Livre'. Aqui você pode digitar sua resposta ou usar o microfone para falar. A Inteligência Artificial lerá sua resposta e dará uma nota. Tente escrever 'Jeová' abaixo.",
      options: [],
      correctAnswerIndex: -1,
      correctAnswerText: "Jeová",
      reference: "Salmo 83:18",
      hint: "O nome divino.",
      explanation: "Na resposta livre, a avaliação é feita por IA, considerando o sentido da resposta, não apenas a ortografia exata."
    },
    {
      id: "tut-4-wrong",
      question: "ATENÇÃO: Esta é uma pergunta com ERRO PROPOSITAL. Quem construiu a Arca para sobreviver ao Dilúvio?",
      options: [
        "Moisés (Errado, mas marcado como certo pelo sistema)",
        "Rei Davi",
        "Apóstolo Paulo",
        "Salomão"
      ],
      correctAnswerIndex: 0,
      reference: "Gênesis 6 (Erro Simulado)",
      hint: "A resposta certa seria Noé, mas ele não está nas opções. Responda qualquer coisa e avance.",
      explanation: "EXCELENTE! Você notou que a resposta está errada (foi Moisés quem escreveu Gênesis, mas Noé fez a arca). Na tela de placar final, clique em 'REVISAR RESPOSTAS', vá até esta pergunta e use o botão 'CONTESTAR' para pedir à IA uma nova pergunta válida."
    }
  ]
};