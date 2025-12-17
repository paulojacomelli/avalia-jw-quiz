import React, { useState, useEffect, useRef } from 'react';
import { SetupForm } from './components/SetupForm';
import { QuizCard } from './components/QuizCard';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { generateQuizContent, generateReplacementQuestion, preGenerateQuizAudio } from './services/geminiService';
import { GeneratedQuiz, QuizConfig, Team, HintType, Difficulty, TTSConfig } from './types';
import { playSound, playTimerTick, setGlobalSoundState, playCountdownTick, playGoSound, startLoadingDrone, stopLoadingDrone, resumeAudioContext } from './utils/audio';
import { speakText, stopSpeech, getQuestionReadAloudText } from './utils/tts';
import { LOADING_MESSAGES, TUTORIAL_CONFIG, TUTORIAL_DATA } from './constants';
import { TourOverlay, TourStep } from './components/TourOverlay';

type GameState = 'SETUP' | 'READY_CHECK' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_SUMMARY' | 'FINISHED';
type Theme = 'light' | 'dark' | 'system';

// Palette for Teams: Blue, Red, Green, Amber
const TEAM_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
const DEFAULT_COLOR = '#5b3c88'; // JW Purple

// Structured Error Interface
interface ApiErrorDetail {
  title: string;
  message: string;
  solution: string;
  code: string;
}

function App() {
  const { isAuthenticated, apiKey, logout } = useAuth();
  
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [quizData, setQuizData] = useState<GeneratedQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Replaced generic string error with structured object
  const [errorDetail, setErrorDetail] = useState<ApiErrorDetail | null>(null);
  
  // App Preferences (Global State) - Default to System
  const [theme, setTheme] = useState<Theme>('system');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0); 
  const [isFullscreen, setIsFullscreen] = useState(false);

  // TTS Global State
  const [ttsEnabled, setTtsEnabled] = useState(false); 
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    enabled: false,
    autoRead: true,
    engine: 'gemini', // Default to Natural
    gender: 'female', 
    rate: 1.5, // Requested speed
    volume: 1.0
  });
  
  // TTS Menu State
  const [isTTSMenuOpen, setIsTTSMenuOpen] = useState(false);
  const ttsMenuRef = useRef<HTMLDivElement>(null);

  // Game State
  const [gameState, setGameState] = useState<GameState>('SETUP');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(60); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [userAnswers, setUserAnswers] = useState<(number | string | null)[]>([]);
  const [isCurrentQuestionAnswered, setIsCurrentQuestionAnswered] = useState(false);
  
  // Tutorial State
  const [isTutorialMode, setIsTutorialMode] = useState(false);

  // Setup Form State (Lifted Up for Guide Control)
  const [setupStep, setSetupStep] = useState(1);

  // Guide Tour State
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Skip State
  const [isSkipping, setIsSkipping] = useState(false);
  
  // Voided Questions State
  const [voidedIndices, setVoidedIndices] = useState<Set<number>>(new Set());
  
  // Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  // Round State
  const [currentRound, setCurrentRound] = useState(1);

  // Hint State
  const [hintsRemaining, setHintsRemaining] = useState<number>(-1);

  // Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  
  // Countdown State
  const [countdownValue, setCountdownValue] = useState(3);
  
  // API Quota Cooldown State
  const [cooldownTime, setCooldownTime] = useState(0);

  // Loading Message State
  const [loadingMessage, setLoadingMessage] = useState("");

  // Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<'RESET' | 'LOGOUT' | null>(null);

  // Audio/TTS Refs
  const questionReadRef = useRef(false);

  // --- TOUR CONFIGURATION ---
  const TOUR_STEPS: TourStep[] = [
    {
      title: "Bem-vindo ao Guia",
      content: "Vamos fazer um tour rápido para você aprender a configurar e utilizar todos os recursos do JW Quiz. Clique em 'Próximo' para começar.",
      position: 'center'
    },
    {
      targetId: 'btn-theme',
      title: "Tema Visual",
      content: "Alterne entre modo Claro, Escuro ou Automático (Sistema) para maior conforto visual.",
      position: 'bottom'
    },
    {
      targetId: 'btn-sound',
      title: "Efeitos Sonoros",
      content: "Ative ou desative os sons de clique, acerto, erro e contagem regressiva.",
      position: 'bottom'
    },
    {
      targetId: 'btn-tts',
      title: "Narração (TTS)",
      content: "Escolha entre 'Voz Clássica' (navegador) ou 'Voz Natural' (IA) para ler as perguntas automaticamente. Você também pode desativar a leitura.",
      position: 'bottom'
    },
    {
      targetId: 'btn-zoom',
      title: "Zoom da Interface",
      content: "Aumente ou diminua o tamanho dos textos e botões para melhorar a acessibilidade.",
      position: 'bottom'
    },
    {
      targetId: 'btn-fullscreen',
      title: "Tela Cheia",
      content: "Entre em modo imersivo para evitar distrações durante o quiz.",
      position: 'bottom'
    },
    {
      targetId: 'btn-home',
      title: "Reiniciar",
      content: "Volte para a tela inicial a qualquer momento para configurar um novo jogo.",
      position: 'bottom'
    },
    // Setup - Tab 1
    {
      targetId: 'field-mode',
      title: "Passo 1: Tema",
      content: "Escolha o escopo do seu quiz. 'Geral' abrange tópicos variados. 'Livros' foca em um livro bíblico específico. 'Assunto Específico' permite que você digite qualquer tema teocrático.",
      position: 'top',
      onEnter: () => setSetupStep(1)
    },
    {
      targetId: 'field-difficulty',
      title: "Dificuldade",
      content: "Ajuste a profundidade das perguntas. 'Difícil' tende a pedir detalhes mais específicos e raciocínios doutrinários.",
      position: 'top'
    },
    {
      targetId: 'field-temperature',
      title: "Criatividade",
      content: "Define o nível de variedade. 'Conservador' segue padrões mais previsíveis. 'Criativo' gera perguntas mais inesperadas e variadas.",
      position: 'top'
    },
    {
      targetId: 'field-format',
      title: "Formato",
      content: "Escolha entre Múltipla Escolha, Verdadeiro/Falso ou Resposta Livre (onde você escreve e a IA avalia).",
      position: 'top'
    },
    // Setup - Tab 2
    {
      targetId: 'field-team-mode',
      title: "Passo 2: Modo Competição",
      content: "Ative para adicionar times e manter um placar separado. Ótimo para Adoração em Família.",
      position: 'top',
      onEnter: () => setSetupStep(2)
    },
    {
      targetId: 'field-count',
      title: "Quantidade",
      content: "Defina quantas perguntas terá o quiz. Se estiver em times, você pode definir também quantas perguntas ocorrem por rodada.",
      position: 'top'
    },
    {
      targetId: 'field-timer',
      title: "Temporizador",
      content: "Adicione pressão de tempo para deixar o jogo mais dinâmico.",
      position: 'top'
    },
    // Setup - Tab 3
    {
      targetId: 'setup-form-container', 
      title: "Passo 3: Ajudas",
      content: "Configure quantas dicas podem ser usadas. 'Dica do Sistema' mostra uma pista simples. 'Perguntar ao Chat' permite conversar com a IA para tirar dúvidas.",
      position: 'top',
      onEnter: () => setSetupStep(3)
    },
    {
      title: "Ações Especiais & Contestar",
      content: "Às vezes a IA erra! Na última pergunta deste Tutorial, colocamos um erro de propósito. Quando chegar na tela de placar final, clique em 'Revisar Respostas' e use o botão 'Contestar' para corrigir a pergunta ruim.",
      position: 'center',
      onEnter: () => setSetupStep(1) // Reset form visual state
    },
    {
      title: "Vamos Praticar!",
      content: "Agora que você conhece a interface, vamos iniciar um Modo Tutorial rápido para você jogar uma partida de teste. Clique em 'Vamos lá' para começar.",
      position: 'center'
    }
  ];

  // --- Initialization ---

  useEffect(() => {
    const savedTheme = localStorage.getItem('jw-quiz-theme') as Theme;
    const savedSound = localStorage.getItem('jw-quiz-sound');
    const savedTTS = localStorage.getItem('jw-quiz-tts');
    const savedEngine = localStorage.getItem('jw-quiz-tts-engine');
    
    if (savedTheme) setTheme(savedTheme);
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundEnabled(isEnabled);
      setGlobalSoundState(isEnabled);
    }
    
    // Restore TTS Settings
    const isTTSActive = savedTTS === 'true';
    setTtsEnabled(isTTSActive);
    
    // Apply logic for engine/gender/rate based on saved engine or default
    const initialEngine = (savedEngine === 'browser' ? 'browser' : 'gemini');
    updateTTSConfigState(initialEngine, isTTSActive);

    // Listener to update state if user presses Esc
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Click outside listener for TTS Menu
    const handleClickOutside = (event: MouseEvent) => {
      if (ttsMenuRef.current && !ttsMenuRef.current.contains(event.target as Node)) {
        setIsTTSMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
        if (isDark) {
            root.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            root.classList.remove('dark');
            document.body.classList.remove('dark');
        }
    };

    if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        applyTheme(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    } else {
        applyTheme(theme === 'dark');
    }

    localStorage.setItem('jw-quiz-theme', theme);
  }, [theme]);

  // Loading Sound Effect & Message Logic
  useEffect(() => {
    if (loading) {
      startLoadingDrone();
      // Pick a random message only if not overriding with specific status
      if (!loadingMessage.includes("narração")) {
        const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
        setLoadingMessage(randomMsg);
      }
    } else {
      stopLoadingDrone();
    }
  }, [loading]);

  // Countdown Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (gameState === 'COUNTDOWN') {
      playCountdownTick(countdownValue);
      
      interval = setInterval(() => {
        setCountdownValue((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0; 
          }
          const newVal = prev - 1;
          playCountdownTick(newVal);
          return newVal;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN' && countdownValue === 0) {
      playGoSound();
      setGameState('PLAYING');
    }
  }, [countdownValue, gameState]);

  // Cooldown Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownTime]);

  // --- TTS Logic ---
  
  // Helper to centralize TTS config updates based on engine rules
  const updateTTSConfigState = (engine: 'browser' | 'gemini', enabled: boolean) => {
     const newConfig: TTSConfig = {
        enabled: enabled,
        autoRead: true,
        engine: engine,
        // Voz Clássica (Browser) = Male (Daniel), Voz Natural (Gemini) = Female (Kore)
        gender: engine === 'browser' ? 'male' : 'female',
        rate: 1.5, // Fixed 1.5x speed as requested
        volume: 1.0
     };
     setTtsConfig(newConfig);
     // Persist engine choice
     localStorage.setItem('jw-quiz-tts-engine', engine);
  };

  // Ensure we stop speech if TTS is disabled globally
  useEffect(() => {
    if (!ttsEnabled) {
      stopSpeech();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    // Check both global toggle and config specific toggle (autoRead)
    // Note: quizConfig.tts is a snapshot at generation time, but we should respect global toggle
    const shouldRead = ttsEnabled && ttsConfig.autoRead;
    
    if (gameState === 'PLAYING' && quizData && shouldRead && !isCurrentQuestionAnswered && !isSkipping && cooldownTime === 0) {
      const timeout = setTimeout(() => {
        const q = quizData.questions[currentQuestionIndex];
        const teamIntro = quizConfig?.isTeamMode ? teams[currentTeamIndex].name : undefined;
        
        // Reconstruct text for fallback or if needed, but pass audioBase64 if present
        const textToRead = getQuestionReadAloudText(q, teamIntro);

        // Always use the latest global ttsConfig for playback
        speakText(textToRead, ttsConfig, apiKey || undefined, q.audioBase64);
        
      }, 500);
      return () => {
        clearTimeout(timeout);
        stopSpeech();
      };
    }
  }, [currentQuestionIndex, gameState, quizData, isCurrentQuestionAnswered, isSkipping, ttsEnabled, ttsConfig, cooldownTime, apiKey]);

  // --- Keyboard Shortcuts (Spacebar & Enter to Next) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Allow Space or Enter
      if (e.code === 'Space' || e.key === 'Enter') {
        // Avoid scrolling/triggering if user is typing in a textarea/input
        const tagName = (e.target as HTMLElement).tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
        
        // Prevent action if in cooldown or error state
        if (cooldownTime > 0 || errorDetail) return;
        
        // Prevent if modal is open
        if (pendingAction) return;

        // Prevent page scroll for space and button clicks for enter to avoid double triggering
        e.preventDefault(); 

        // Context-aware action
        if (gameState === 'READY_CHECK') {
          handleConfirmStart();
        } else if (gameState === 'PLAYING' && isCurrentQuestionAnswered) {
          handleNextQuestion();
        } else if (gameState === 'ROUND_SUMMARY') {
          handleNextRound();
        } else if (isReviewing && reviewIndex < (quizData?.questions.length || 0) - 1) {
           setReviewIndex(prev => prev + 1);
           playSound('click');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, isCurrentQuestionAnswered, isReviewing, reviewIndex, quizData, currentQuestionIndex, cooldownTime, errorDetail, pendingAction]);

  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setGlobalSoundState(newState);
    localStorage.setItem('jw-quiz-sound', String(newState));
  };

  const handleThemeToggle = () => {
    playSound('click');
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  };
  
  const handleTTSSelection = (selection: 'browser' | 'gemini' | 'off') => {
      playSound('click');
      if (selection === 'off') {
          setTtsEnabled(false);
          localStorage.setItem('jw-quiz-tts', 'false');
          stopSpeech();
      } else {
          setTtsEnabled(true);
          // Removed undefined setTtsEngine call.
          // State is managed via ttsConfig and ttsEnabled.
          localStorage.setItem('jw-quiz-tts', 'true');
          updateTTSConfigState(selection, true);
      }
      setIsTTSMenuOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // --- TUTORIAL HANDLER ---
  const handleStartTutorial = () => {
    playSound('click');
    setLoading(true);
    setLoadingMessage("Preparando tutorial...");
    
    // Simulate brief loading for UX
    setTimeout(() => {
        // Setup Tutorial Mode
        setIsTutorialMode(true);
        // Ensure tutorial uses current TTS config state if enabled globally, but for consistency we use the hardcoded structure 
        // patched with current global TTS enabled state if needed, though quizConfig.tts is mostly a record.
        const tutorialConfig = {
            ...TUTORIAL_CONFIG,
            tts: {
                ...TUTORIAL_CONFIG.tts,
                enabled: ttsEnabled // Match global state to avoid confusion
            }
        };
        setQuizConfig(tutorialConfig);
        setQuizData(TUTORIAL_DATA);
        
        // Setup Dummy Team
        setTeams([{
            id: 'solo',
            name: 'Aluno',
            color: '#10b981', // Tutorial green
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            hintsUsed: 0
        }]);
        
        // Initial States
        setTimeLimit(TUTORIAL_CONFIG.timeLimit);
        setHintsRemaining(TUTORIAL_CONFIG.maxHints);
        setCooldownTime(0);
        
        setGameState('READY_CHECK');
        setLoading(false);
    }, 800);
  };

  // --- ROBUST ERROR HANDLING ---

  const parseApiError = (err: any): ApiErrorDetail => {
    const msg = (err?.message || String(err)).toLowerCase();
    
    // 429: Quota Exceeded
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) {
        return {
            code: '429',
            title: 'Limite de Uso Excedido',
            message: 'A cota gratuita da API do Google foi atingida temporariamente. Muitas requisições em pouco tempo.',
            solution: 'O sistema entrará em pausa automática por 60 segundos. Aguarde o contador.'
        };
    }
    // 400/403: Invalid Key or Permission
    if (msg.includes('400') || msg.includes('403') || msg.includes('key') || msg.includes('permission') || msg.includes('unauthenticated')) {
        return {
            code: '403',
            title: 'Chave de API Inválida',
            message: 'A chave fornecida foi rejeitada pelo Google. Ela pode estar incorreta, expirada ou o projeto no Google Cloud pode estar sem permissão.',
            solution: 'Tente fazer logout e inserir a chave novamente. Verifique se a chave está ativa no Google AI Studio.'
        };
    }
    // 500/503: Server Errors
    if (msg.includes('500') || msg.includes('503') || msg.includes('overloaded') || msg.includes('internal') || msg.includes('unavailable')) {
        return {
            code: '503',
            title: 'Serviço Indisponível',
            message: 'Os servidores da IA do Google estão instáveis ou sobrecarregados neste momento.',
            solution: 'Isso é temporário. Aguarde alguns instantes e tente novamente.'
        };
    }
    // Safety Blocks
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harmful') || msg.includes('filter')) {
        return {
            code: 'SAFETY',
            title: 'Conteúdo Bloqueado',
            message: 'A IA recusou gerar este conteúdo devido aos filtros de segurança automáticos.',
            solution: 'Tente mudar o tema ou a formulação do tópico para algo mais específico.'
        };
    }
    // Network Errors
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('failed to fetch')) {
        return {
            code: 'NET',
            title: 'Erro de Conexão',
            message: 'Não foi possível conectar aos servidores do Google.',
            solution: 'Verifique sua conexão com a internet (Wi-Fi/Dados).'
        };
    }
    
    // Default / Unknown
    return {
        code: 'UNKNOWN',
        title: 'Erro Desconhecido',
        message: `Ocorreu um erro inesperado: ${msg.substring(0, 150)}...`,
        solution: 'Tente novamente. Se o erro persistir, recarregue a página.'
    };
  }

  const handleApiError = (err: any) => {
    const parsed = parseApiError(err);
    console.error("Parsed Error:", parsed);
    
    // Special handling for Quota - activate cooldown timer
    if (parsed.code === '429') {
        setCooldownTime(60);
        stopSpeech();
    } else {
        setErrorDetail(parsed); 
    }
    setLoading(false);
  };

  const handleGenerate = async (config: QuizConfig) => {
    // 1. Trigger loading UI immediately
    setLoading(true);
    setLoadingMessage("Gerando perguntas..."); // Initial message
    setErrorDetail(null);
    setQuizData(null);

    // Ensure we have a key (defensive check)
    if (!apiKey) {
      setLoading(false);
      setErrorDetail({
        code: 'NO_KEY',
        title: 'Chave Ausente',
        message: 'A chave de API não foi encontrada.',
        solution: 'Faça login novamente.'
      });
      return;
    }

    // Attempt to resume audio context safely
    try {
        resumeAudioContext();
    } catch (e) {
        console.warn("Could not resume audio context", e);
    }

    // INJECT THE GLOBAL TTS CONFIG INTO THE QUIZ CONFIG
    const finalConfig = {
      ...config,
      tts: ttsConfig
    };

    setQuizConfig(finalConfig);
    setTimeLimit(finalConfig.timeLimit);
    setHintsRemaining(finalConfig.maxHints);
    setCooldownTime(0);
    
    let tempTeams: Team[] = [];
    if (finalConfig.isTeamMode) {
      tempTeams = finalConfig.teams.map((name, idx) => ({
        id: `team-${idx}`,
        name,
        color: TEAM_COLORS[idx % TEAM_COLORS.length], // Assign color from palette
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      }));
    } else {
      tempTeams = [{
        id: 'solo',
        name: 'Você',
        color: DEFAULT_COLOR,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      }];
    }
    setTeams(tempTeams);

    try {
      let data = await generateQuizContent(apiKey, finalConfig);
      
      // --- PRE-GENERATE AUDIO IF TTS IS ENABLED ---
      if (ttsEnabled && finalConfig.tts.engine === 'gemini') {
          setLoadingMessage("Gerando narração com IA (isso pode levar alguns segundos)...");
          // Extract just team names for the generator
          const teamNameList = tempTeams.map(t => t.name);
          data = await preGenerateQuizAudio(apiKey, data, finalConfig.tts, finalConfig.isTeamMode ? teamNameList : []);
      }

      setQuizData(data);
      setGameState('READY_CHECK');
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false); 
    }
  };

  const handleRestartSameSettings = () => {
    if (quizConfig) {
        if (isTutorialMode) {
            handleStartTutorial();
        } else {
            stopSpeech();
            handleGenerate(quizConfig);
        }
    }
  };

  const handleConfirmStart = () => {
    if (!quizConfig) return;
    playSound('click');
    resumeAudioContext(); // Double check audio context is active on this click
    startCountdownSequence(quizConfig.timeLimit);
  };

  const startCountdownSequence = (limit: number) => {
    setGameState('COUNTDOWN');
    setCountdownValue(3);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setTimeLeft(limit);
    setIsCurrentQuestionAnswered(false);
    setIsReviewing(false);
    setReviewIndex(0);
    setCurrentTeamIndex(0);
    setCurrentRound(1);
    setIsSkipping(false);
    setVoidedIndices(new Set()); // Reset voided questions
  };

  const resetTimer = () => {
    setTimeLeft(timeLimit);
    setIsCurrentQuestionAnswered(false);
  };

  useEffect(() => {
    if (quizConfig && !quizConfig.enableTimer) return;

    let interval: ReturnType<typeof setInterval>;

    const isReviewPending = isReviewing && userAnswers[reviewIndex] === null;
    const isPlayPending = gameState === 'PLAYING' && !isCurrentQuestionAnswered;
    
    if ((isPlayPending || isReviewPending) && timeLeft > 0 && !isSkipping && cooldownTime === 0 && !errorDetail) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (quizConfig?.enableTimerSound && newTime > 0) {
             playTimerTick(newTime, timeLimit);
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && (isPlayPending || isReviewPending) && !isSkipping && cooldownTime === 0 && !errorDetail) {
      if (quizConfig?.enableTimerSound) playSound('timeUp');
      handleAnswer({ score: 0, isCorrect: false });
    }

    return () => clearInterval(interval);
  }, [timeLeft, gameState, isCurrentQuestionAnswered, quizConfig, timeLimit, isSkipping, cooldownTime, isReviewing, userAnswers, reviewIndex, errorDetail]);

  // Handle answers (from both Playing and Review modes)
  const handleAnswer = (result: { score: number, isCorrect: boolean, selectedIndex?: number | null, textAnswer?: string }) => {
    stopSpeech();
    
    const targetIndex = isReviewing ? reviewIndex : currentQuestionIndex;
    const targetTeamIdx = isReviewing ? (reviewIndex % teams.length) : currentTeamIndex;

    // Audio Feedback
    if (result.isCorrect || result.score > 0.6) playSound('correct');
    else playSound('wrong');

    // Update Teams Score
    setTeams(prevTeams => prevTeams.map((team, index) => {
      if (index !== targetTeamIdx) return team;
      return {
        ...team,
        score: parseFloat((team.score + result.score).toFixed(1)),
        correctCount: result.isCorrect ? team.correctCount + 1 : team.correctCount,
        wrongCount: !result.isCorrect ? team.wrongCount + 1 : team.wrongCount
      };
    }));

    // Update User Answers
    const newAnswers = [...userAnswers];
    if (result.selectedIndex !== undefined) {
      newAnswers[targetIndex] = result.selectedIndex;
    } else {
      newAnswers[targetIndex] = result.textAnswer || "Respondido";
    }
    setUserAnswers(newAnswers);

    // TTS Feedback (Only in play mode generally, or if config allows)
    // Fixed: Now respects global ttsEnabled even in Tutorial Mode
    if (!isReviewing && ttsEnabled) {
      const feedback = result.score === 0 ? "Resposta incorreta." : (result.score === 1 ? "Resposta correta!" : `Parcialmente correto. ${result.score} pontos.`);
      // Pass apiKey for Gemini TTS support
      speakText(feedback, ttsConfig, apiKey || undefined);
    }

    // If in Play Mode, advance state
    if (!isReviewing) {
        setIsCurrentQuestionAnswered(true);
    }
  };

  const handleReplaceQuestion = async (index: number) => {
    if (!quizData || !quizConfig || !apiKey) return;
    setLoading(true);
    setLoadingMessage("Substituindo pergunta...");
    playSound('click');

    try {
        const oldQ = quizData.questions[index];
        const newQ = await generateReplacementQuestion(apiKey, quizConfig, oldQ.question);
        
        // --- Generate audio for the replacement question if needed ---
        if (ttsEnabled && ttsConfig.engine === 'gemini') {
            setLoadingMessage("Gerando áudio da nova pergunta...");
            const teamName = quizConfig.isTeamMode ? teams[index % teams.length].name : undefined;
            
            // Generate single item audio via batch function for simplicity
            const miniQuiz = { title: "", questions: [newQ] };
            const processedMini = await preGenerateQuizAudio(apiKey, miniQuiz, ttsConfig, quizConfig.isTeamMode ? [teams[index % teams.length].name] : []);
            newQ.audioBase64 = processedMini.questions[0].audioBase64;
        }

        const teamIdx = index % teams.length;
        const previousAnswer = userAnswers[index];
        
        // Revert score stats for this question so the user can "Try Again" with the new question
        let wasCorrect = false;
        let scoreToRevert = 0;

        // Determine if previous answer was correct to deduct stats
        if (oldQ.options && oldQ.options.length > 0) {
            // MC
            if (previousAnswer === oldQ.correctAnswerIndex) {
                wasCorrect = true;
                scoreToRevert = 1;
            }
        }

        if (wasCorrect) {
             setTeams(prev => prev.map((t, i) => {
                if (i !== teamIdx) return t;
                return {
                    ...t,
                    score: parseFloat((t.score - scoreToRevert).toFixed(1)),
                    correctCount: Math.max(0, t.correctCount - 1)
                }
             }));
        } else {
             // If it was counted as wrong, remove from wrong count
             if (previousAnswer !== null && previousAnswer !== undefined) {
                 setTeams(prev => prev.map((t, i) => {
                    if (i !== teamIdx) return t;
                    return {
                        ...t,
                        wrongCount: Math.max(0, t.wrongCount - 1)
                    }
                 }));
             }
        }

        // Update Data
        const newQuestions = [...quizData.questions];
        newQuestions[index] = newQ;
        setQuizData({...quizData, questions: newQuestions});

        // Reset Answer for this index
        const newUserAnswers = [...userAnswers];
        newUserAnswers[index] = null; // Reset to allow answering
        setUserAnswers(newUserAnswers);
        
        // Reset Timer
        setTimeLeft(timeLimit);

    } catch (e: any) {
        handleApiError(e);
    } finally {
        setLoading(false);
    }
  };

  const handleUseHint = () => {
    if (hintsRemaining > 0) {
      setHintsRemaining(prev => prev - 1);
      setTeams(prevTeams => prevTeams.map((team, index) => {
        if (index !== currentTeamIndex) return team;
        return { ...team, hintsUsed: team.hintsUsed + 1 };
      }));
    }
  };

  const getNextDifficulty = (currentDiff: Difficulty): Difficulty => {
    if (currentDiff === Difficulty.EASY) return Difficulty.MEDIUM;
    if (currentDiff === Difficulty.MEDIUM) return Difficulty.HARD;
    return Difficulty.HARD;
  };

  const handleSkipQuestion = async () => {
    if (!quizData || !quizConfig || isSkipping || !apiKey) return;

    stopSpeech();
    setIsSkipping(true);
    playSound('click');

    try {
      const currentQ = quizData.questions[currentQuestionIndex];
      const nextDiff = getNextDifficulty(quizConfig.difficulty);
      const tempConfig = { ...quizConfig, difficulty: nextDiff };
      const newQuestion = await generateReplacementQuestion(apiKey, tempConfig, currentQ.question);
      
      // We are skipping, so we don't necessarily need audio for the next one immediately if we just want to show it,
      // but consistent UX says we should.
       if (ttsEnabled && ttsConfig.engine === 'gemini') {
             const teamName = quizConfig.isTeamMode ? teams[currentTeamIndex % teams.length].name : undefined;
             const miniQuiz = { title: "", questions: [newQuestion] };
             const processedMini = await preGenerateQuizAudio(apiKey, miniQuiz, ttsConfig, quizConfig.isTeamMode ? [teamName || ""] : []);
             newQuestion.audioBase64 = processedMini.questions[0].audioBase64;
       }

      const newQuestions = [...quizData.questions];
      newQuestions[currentQuestionIndex] = newQuestion;
      
      setQuizData({
        ...quizData,
        questions: newQuestions
      });

      resetTimer();
      setIsCurrentQuestionAnswered(false);
      
    } catch (e: any) {
      handleApiError(e);
      // If quota exceeded, we stop skipping state, otherwise allow retry
      setIsSkipping(false);
    } finally {
      if (cooldownTime === 0) setIsSkipping(false);
    }
  };

  const handleNextQuestion = () => {
    stopSpeech();
    playSound('next');
    if (!quizData || !quizConfig) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < quizData.questions.length && nextIndex % quizConfig.questionsPerRound === 0) {
      setGameState('ROUND_SUMMARY');
      return;
    }

    if (nextIndex < quizData.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      if (quizConfig.isTeamMode) {
        setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
      }
      resetTimer();
    } else {
      setGameState('FINISHED');
      setIsReviewing(false); 
      setReviewIndex(0);
    }
  };

  const handleNextRound = () => {
    playSound('click');
    if (quizConfig?.isTeamMode) {
      setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
    }
    setCurrentRound(prev => prev + 1);
    setCurrentQuestionIndex(prev => prev + 1);
    resetTimer();
    setGameState('COUNTDOWN');
    setCountdownValue(3);
  };

  // --- ACTIONS WITH CONFIRMATION ---

  const handleResetRequest = () => {
    if (gameState === 'SETUP') {
        // No confirmation needed if already in setup
        executeReset();
    } else {
        setPendingAction('RESET');
    }
  };

  const handleLogoutRequest = () => {
    setPendingAction('LOGOUT');
  };

  const executeReset = () => {
    stopSpeech();
    setQuizData(null);
    setErrorDetail(null);
    setGameState('SETUP');
    setIsReviewing(false);
    setIsSkipping(false);
    setCooldownTime(0);
    setVoidedIndices(new Set());
    setIsTutorialMode(false); 
    setSetupStep(1); 
    setLoading(false);
    setPendingAction(null);
  };

  const executeLogout = () => {
    logout();
    setPendingAction(null);
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
  };

  const getTimerStyles = () => {
    if (isCurrentQuestionAnswered && !isReviewing) return 'bg-jw-hover text-gray-400';
    const percentage = (timeLeft / timeLimit) * 100;
    if (percentage > 50) return 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]';
    if (percentage > 20) return 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse';
    return 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-bounce';
  };
  
  // Get text for current TTS status
  const getTTSStatusText = () => {
      if (!ttsEnabled) return "Sem Narração";
      if (ttsConfig.engine === 'browser') return "Voz Clássica";
      return "Voz Natural";
  };
  
  const getTTSStatusIcon = () => {
      if (!ttsEnabled) return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-70">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
      );
      return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
      );
  };

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Calculate if quiz is active to show in header or logic
  const isQuizActive = gameState !== 'SETUP';

  return (
    <div 
      className="h-screen flex flex-col font-sans bg-jw-dark text-jw-text overflow-hidden transition-colors duration-300" 
      style={{ zoom: zoomLevel }}
    >
      {/* LOADING SCREEN OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[60] bg-[#121212] flex flex-col items-center justify-center animate-fade-in text-center px-4 cursor-wait">
            <div className="relative mb-8">
               {/* Background ring */}
               <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-gray-800 rounded-full"></div>
               {/* Spinning indicator */}
               <div className="w-16 h-16 md:w-20 md:h-20 border-[6px] border-t-jw-blue border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-6 tracking-wide">Preparando seu Quiz...</h2>
            <p className="text-gray-400 text-sm md:text-base max-w-lg italic font-serif opacity-80 leading-relaxed animate-pulse">
               "{loadingMessage}"
            </p>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {pendingAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-jw-card max-w-sm w-full rounded-2xl shadow-2xl border border-gray-600/50 overflow-hidden transform transition-all scale-100">
                <div className="p-6">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className={`p-4 rounded-full mb-4 ${pendingAction === 'LOGOUT' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-jw-text mb-2">
                            {pendingAction === 'LOGOUT' ? 'Sair do Aplicativo?' : 'Reiniciar Quiz?'}
                        </h3>
                        <p className="text-sm opacity-70 leading-relaxed">
                            {pendingAction === 'LOGOUT' 
                                ? 'Deseja realmente sair e remover a chave de API deste dispositivo? Você precisará inseri-la novamente.' 
                                : 'Todo o progresso do jogo atual será perdido e você voltará para a tela inicial.'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={cancelPendingAction}
                            className="flex-1 py-3 bg-jw-hover text-jw-text rounded-lg font-medium hover:bg-opacity-80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={pendingAction === 'LOGOUT' ? executeLogout : executeReset}
                            className={`flex-1 py-3 text-white rounded-lg font-bold shadow-lg hover:bg-opacity-90 transition-colors ${pendingAction === 'LOGOUT' ? 'bg-red-600' : 'bg-jw-blue'}`}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TOUR OVERLAY */}
      <TourOverlay 
        steps={TOUR_STEPS} 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => {
            setIsGuideOpen(false);
            setTimeout(handleStartTutorial, 100);
        }}
      />

      {/* ERROR MODAL */}
      {errorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-jw-card max-w-md w-full rounded-2xl shadow-2xl border border-red-500/30 overflow-hidden">
                <div className="bg-red-900/20 p-6 border-b border-red-500/20 flex items-start gap-4">
                    <div className="p-3 bg-red-500/20 rounded-full shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-red-200">{errorDetail.title}</h3>
                        <p className="text-red-300/70 text-sm font-mono mt-1">Código: {errorDetail.code}</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-jw-text opacity-90 leading-relaxed">{errorDetail.message}</p>
                    <div className="bg-jw-hover p-4 rounded-lg text-sm opacity-80 border border-gray-600/30">
                        <strong>Sugestão:</strong> {errorDetail.solution}
                    </div>
                    <button 
                        onClick={() => setErrorDetail(null)}
                        className="w-full py-3 bg-jw-blue hover:bg-opacity-90 text-white font-bold rounded-lg transition-colors shadow-lg"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* GLOBAL HEADER WITH SETTINGS */}
      <header className="bg-jw-blue text-white h-16 shrink-0 flex items-center shadow-lg z-20 transition-colors relative">
        <div className="container mx-auto px-4 flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            <h1 className="text-base font-semibold tracking-wide truncate">JW Quiz Creator</h1>
            {isTutorialMode && (
                <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ml-2 animate-fade-in shadow-sm hidden md:inline-block">
                    Modo Tutorial
                </span>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* Guide/Tutorial Button (Combined) */}
            {!isQuizActive && (
              <button
                onClick={() => { setIsGuideOpen(true); playSound('click'); }}
                className="p-2 rounded-full hover:bg-black/10 transition-colors opacity-90 hover:opacity-100"
                title="Guia Interativo e Tutorial"
              >
                <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center font-bold text-xs">
                    ?
                </div>
              </button>
            )}

            {/* 1. Theme Toggle */}
            <button 
               id="btn-theme"
               onClick={handleThemeToggle}
               className="p-2 rounded-full hover:bg-black/10 transition-colors opacity-90 hover:opacity-100"
               title={`Tema: ${theme === 'system' ? 'Automático' : (theme === 'dark' ? 'Escuro' : 'Claro')}`}
             >
               {theme === 'dark' ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
               ) : theme === 'light' ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
               )}
            </button>

            {/* 2. Sound Toggle */}
            <button 
               id="btn-sound"
               onClick={handleSoundToggle}
               className={`p-2 rounded-full hover:bg-black/10 transition-colors opacity-90 hover:opacity-100 ${!soundEnabled && 'opacity-60'}`}
               title="Efeitos Sonoros"
             >
               {soundEnabled ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
               )}
            </button>

            {/* 3. TTS Selection Menu */}
            <div id="btn-tts" className="relative" ref={ttsMenuRef}>
               <button 
                  onClick={() => setIsTTSMenuOpen(!isTTSMenuOpen)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg border border-white/10"
               >
                  {getTTSStatusIcon()}
                  <span className="text-sm font-semibold hidden md:inline">{getTTSStatusText()}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 ml-1 transition-transform duration-200 ${isTTSMenuOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
               </button>

               {/* Dropdown Menu */}
               {isTTSMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in origin-top-right">
                     
                     <button 
                       onClick={() => handleTTSSelection('browser')}
                       className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 flex items-center justify-between"
                     >
                        <span>Voz Clássica</span>
                        {ttsEnabled && ttsConfig.engine === 'browser' && <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                     </button>
                     
                     <button 
                       onClick={() => handleTTSSelection('gemini')}
                       className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 flex items-center justify-between"
                     >
                        <span>Voz Natural</span>
                        {ttsEnabled && ttsConfig.engine === 'gemini' && <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                     </button>

                     <div className="h-px bg-gray-700 my-1"></div>

                     <button 
                       onClick={() => handleTTSSelection('off')}
                       className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 flex items-center justify-between"
                     >
                        <span className="font-medium">Desativar</span>
                        {!ttsEnabled && <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                     </button>

                  </div>
               )}
            </div>

            {/* 3.5 Zoom Controls */}
             <div id="btn-zoom" className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/10 mr-1">
               <button 
                 onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.05))}
                 className="p-1 hover:bg-white/20 rounded transition-colors text-white/90"
                 title="Diminuir (Zoom Out)"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
               </button>
               <span className="text-[10px] font-mono opacity-60 min-w-[3ch] text-center hidden md:inline-block">
                 {Math.round(zoomLevel * 100)}%
               </span>
               <button 
                 onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.05))}
                 className="p-1 hover:bg-white/20 rounded transition-colors text-white/90"
                 title="Aumentar (Zoom In)"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
               </button>
             </div>

            {/* 4. Fullscreen Toggle */}
            <button
               id="btn-fullscreen"
               onClick={toggleFullscreen}
               className="p-2 rounded-full hover:bg-black/10 transition-colors opacity-90 hover:opacity-100"
               title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
               {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
               ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
               )}
            </button>

            {/* 5. Restart / Home Button (ALWAYS VISIBLE) */}
             <button 
               id="btn-home"
               onClick={handleResetRequest} 
               onMouseEnter={() => playSound('hover')} 
               className="p-2 rounded-full hover:bg-black/10 transition-colors text-white opacity-90 hover:opacity-100"
               title="Voltar ao Início"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
               </svg>
             </button>
            
          </div>
        </div>
      </header>

      {/* GAME STATUS BAR (Round & Team) */}
      {gameState === 'PLAYING' && quizData && (
        <div className="bg-jw-card border-b border-gray-700/20 py-2 px-4 md:px-6 flex justify-between items-center text-xs md:text-sm shadow-sm z-10 overflow-x-auto scrollbar-hide">
          <span className="opacity-70 font-mono whitespace-nowrap mr-4">Rodada {currentRound}</span>
          <div className="flex gap-4">
             {teams.map((t, idx) => (
               <div 
                 key={t.id} 
                 className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all whitespace-nowrap border-2 ${idx === currentTeamIndex ? 'text-white font-bold ring-2 ring-offset-2 ring-offset-jw-dark' : 'opacity-50 border-transparent bg-transparent'}`}
                 style={{ 
                    backgroundColor: idx === currentTeamIndex ? t.color : 'transparent',
                    borderColor: idx === currentTeamIndex ? t.color : 'transparent',
                    '--tw-ring-color': t.color
                 } as React.CSSProperties}
               >
                 <span>{t.name}</span>
                 <span className="bg-black/20 px-1.5 rounded">{t.score}</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      {gameState === 'PLAYING' && quizData && (
        <div className="container mx-auto px-4 md:px-6 pt-4 shrink-0 relative">
          <div className="flex items-center justify-between mb-2">
             <div className="flex-1 flex gap-1 h-1 mr-4 md:mr-20">
                {quizData.questions.map((_, idx) => {
                  let bgColor = 'bg-jw-hover'; 
                  if (idx < currentQuestionIndex) bgColor = 'bg-jw-blue';
                  if (idx === currentQuestionIndex) bgColor = theme === 'dark' ? 'bg-white' : 'bg-gray-800';
                  return (<div key={idx} className={`flex-1 rounded-full h-full ${bgColor} transition-colors duration-300`}></div>)
                })}
             </div>
             <div className="flex items-center text-xs font-mono opacity-60"><span>{currentQuestionIndex + 1}/{quizData.questions.length}</span></div>
          </div>
        </div>
      )}

      {/* TIMER */}
      {quizConfig?.enableTimer && (gameState === 'PLAYING' || (isReviewing && userAnswers[reviewIndex] === null)) && (
         <div className={`fixed top-24 right-4 md:right-6 px-3 py-1 md:px-4 md:py-2 rounded-full font-bold text-sm md:text-lg shadow-lg transition-all duration-300 z-40 flex items-center gap-2 ${getTimerStyles()}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-mono">{timeLeft}s</span>
         </div>
      )}

      {/* SCROLLABLE WRAPPER FOR MAIN CONTENT AND FOOTER */}
      <div className="flex-1 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent relative z-0">
          
          {/* MAIN CONTENT */}
          <main className="flex-1 container mx-auto px-4 md:px-6 flex flex-col justify-center relative pb-10 min-h-[max-content]">
            
            {/* SETUP */}
            {gameState === 'SETUP' && (
              <div className="flex flex-col items-center animate-fade-in py-6 md:py-10">
                 <div className="text-center mb-6 md:mb-10 max-w-2xl px-2">
                   <h2 className="text-3xl md:text-4xl font-bold text-jw-text mb-4 tracking-tight">Teste seu Conhecimento</h2>
                   <p className="text-sm md:text-lg opacity-70">Selecione os parâmetros abaixo para gerar um quiz personalizado.</p>
                 </div>
                 <SetupForm 
                    onGenerate={handleGenerate} 
                    isLoading={loading} 
                    ttsEnabled={ttsEnabled}
                    forcedStep={setupStep} // FIXED: Always pass setupStep
                    onStepChange={(step) => setSetupStep(step)} // Sync state
                 />
              </div>
            )}

            {/* READY CHECK (CONFIRMATION SCREEN) */}
            {gameState === 'READY_CHECK' && quizData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-[#1e1e1e] p-8 rounded-2xl shadow-2xl text-center border border-gray-800 max-w-sm w-full flex flex-col items-center">
                        
                        {/* Check Icon */}
                        <div className="w-12 h-12 rounded-full border-2 border-jw-blue flex items-center justify-center mb-6 text-jw-blue shadow-[0_0_15px_rgba(91,60,136,0.3)]">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-6">Tudo pronto?</h2>

                        <div className="w-full mb-8">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TEMA</span>
                             <h3 className="text-lg font-medium text-gray-200 mt-2 leading-tight">
                                {quizData.title}
                             </h3>
                        </div>

                        <button 
                            onClick={handleConfirmStart}
                            className="w-full py-3 bg-jw-blue text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Estou Pronto 
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                        </button>
                        
                    </div>
                </div>
            )}

            {/* COUNTDOWN */}
            {gameState === 'COUNTDOWN' && (
                 <div 
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in transition-colors duration-500"
                    style={{ backgroundColor: teams[currentTeamIndex]?.color || '#5b3c88' }}
                 >
                    <div key={countdownValue} className="text-[12rem] md:text-[16rem] font-black text-white/20 animate-ping absolute scale-150">
                       {countdownValue > 0 ? countdownValue : "JÁ!"}
                    </div>
                    <div key={`static-${countdownValue}`} className="text-[8rem] md:text-[10rem] font-black text-white relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-bounce-short">
                       {countdownValue > 0 ? countdownValue : "JÁ!"}
                    </div>
                    <div className="mt-8 flex flex-col items-center">
                        <p className="text-xl opacity-80 uppercase tracking-[0.5em] font-light text-white mb-2">Prepare-se</p>
                        <div className="text-4xl font-bold text-white bg-black/20 px-6 py-2 rounded-xl">
                            {teams[currentTeamIndex]?.name}
                        </div>
                    </div>
                 </div>
            )}

            {/* PLAYING */}
            {gameState === 'PLAYING' && quizData && (
              <div className="w-full animate-fade-in relative h-full flex flex-col">
                 <div className="flex-1 flex flex-col justify-center">
                   <QuizCard 
                     key={quizData.questions[currentQuestionIndex].id}
                     question={quizData.questions[currentQuestionIndex]}
                     index={currentQuestionIndex}
                     total={quizData.questions.length}
                     timeLeft={timeLeft}
                     onAnswer={handleAnswer}
                     isTimeUp={quizConfig?.enableTimer && timeLeft === 0}
                     hintsRemaining={hintsRemaining}
                     onRevealHint={handleUseHint}
                     activeTeamName={quizConfig?.isTeamMode ? teams[currentTeamIndex].name : undefined}
                     activeTeamColor={quizConfig?.isTeamMode ? teams[currentTeamIndex].color : undefined}
                     ttsConfig={ttsConfig}
                     allowAskAi={quizConfig?.hintTypes.includes(HintType.ASK_AI)}
                     allowStandardHint={quizConfig?.hintTypes.includes(HintType.STANDARD)}
                     onSkip={handleSkipQuestion}
                     isSkipping={isSkipping}
                     apiKey={apiKey}
                   />
                 </div>
              </div>
            )}

            {/* ROUND SUMMARY */}
            {gameState === 'ROUND_SUMMARY' && (
               <div className="animate-fade-in py-10 w-full max-w-3xl mx-auto flex flex-col items-center justify-center">
                 <div className="bg-jw-card p-6 md:p-10 rounded-2xl shadow-2xl text-center border border-gray-700/50 w-full">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-jw-blue">Fim da Rodada {currentRound}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {teams.map(t => (
                        <div key={t.id} className="bg-jw-hover p-4 rounded-lg border-l-4" style={{ borderLeftColor: t.color }}>
                          <h3 className="font-bold text-lg mb-2">{t.name}</h3>
                          <div className="text-4xl font-bold text-jw-text mb-1">{t.score}</div>
                          <div className="text-xs opacity-60">pontos</div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleNextRound} 
                      onMouseEnter={() => playSound('hover')}
                      className="bg-jw-blue text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform w-full md:w-auto"
                    >
                      Próxima Rodada
                    </button>
                 </div>
               </div>
            )}

            {/* FINISHED */}
            {gameState === 'FINISHED' && quizData && (
              <div className="animate-fade-in py-10 w-full max-w-5xl mx-auto flex flex-col items-center">
                 {!isReviewing && (
                   <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                     {/* Overall Score */}
                     <div className="bg-jw-card border border-jw-hover rounded-2xl p-6 md:p-8 text-center shadow-xl md:col-span-2">
                        <h3 className="opacity-60 uppercase tracking-widest text-sm font-bold mb-4">Placar Final</h3>
                        <div className="flex flex-col md:flex-row gap-6 justify-center">
                          {teams.map((t, i) => (
                             <div 
                                key={t.id} 
                                className={`flex-1 p-6 rounded-xl border-t-4 ${i === 0 && teams.length > 1 && teams[0].score > teams[1].score ? 'bg-yellow-500/10 border-yellow-500' : 'bg-jw-hover'}`}
                                style={{ borderTopColor: t.color }}
                             >
                                <h4 className="text-xl font-bold mb-2">{t.name}</h4>
                                <div className="text-5xl font-bold mb-2" style={{ color: t.color }}>{t.score} <span className="text-xl text-gray-500">/ {t.correctCount + t.wrongCount}</span></div>
                                <div className="space-y-1 text-sm opacity-70">
                                   <p>Acertos: {t.correctCount}</p>
                                   <p>Erros: {t.wrongCount}</p>
                                   <p>Dicas usadas: {t.hintsUsed}</p>
                                   <p>Aproveitamento: {Math.round((t.correctCount / (t.correctCount + t.wrongCount || 1)) * 100)}%</p>
                                </div>
                             </div>
                          ))}
                        </div>
                     </div>
                   </div>
                 )}

                 {!isReviewing && (
                    <div className="flex flex-col md:flex-row gap-4 w-full max-w-lg">
                       <button onClick={() => { setIsReviewing(true); setReviewIndex(0); }} onMouseEnter={() => playSound('hover')} className="flex-1 py-3 px-6 bg-jw-card border border-gray-500/30 text-jw-text rounded-full font-medium hover:bg-jw-hover transition-colors flex items-center justify-center gap-2">Revisar Respostas</button>
                       <button onClick={handleRestartSameSettings} onMouseEnter={() => playSound('hover')} className="flex-1 py-3 px-6 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg">Jogar Novamente</button>
                       <button onClick={handleResetRequest} onMouseEnter={() => playSound('hover')} className="flex-1 py-3 px-6 bg-jw-blue text-white rounded-full font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2">Novo Quiz</button>
                    </div>
                 )}

                 {isReviewing && (
                   <div className="w-full flex flex-col h-full animate-fade-in-up">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-jw-text">Revisão: Pergunta {reviewIndex + 1}</h2>
                        <button onClick={() => setIsReviewing(false)} onMouseEnter={() => playSound('hover')} className="opacity-60 hover:opacity-100 text-jw-text flex items-center gap-1">Fechar</button>
                     </div>
                     <div className="flex-1 flex flex-col justify-center">
                        <QuizCard 
                            key={quizData.questions[reviewIndex].id} // Added key to force re-mount on replacement
                            question={quizData.questions[reviewIndex]} 
                            index={reviewIndex} 
                            total={quizData.questions.length}
                            showAnswerKey={userAnswers[reviewIndex] !== null && userAnswers[reviewIndex] !== undefined}
                            forceSelectedOption={typeof userAnswers[reviewIndex] === 'number' ? userAnswers[reviewIndex] as number : null} 
                            ttsConfig={ttsConfig}
                            onVoid={() => handleReplaceQuestion(reviewIndex)}
                            onAnswer={handleAnswer}
                            apiKey={apiKey}
                        />
                     </div>
                     <div className="flex justify-between items-center mt-8 pb-4">
                        <button onClick={() => { playSound('click'); if(reviewIndex>0) setReviewIndex(i=>i-1)}} onMouseEnter={() => playSound('hover')} disabled={reviewIndex === 0} className="px-6 py-3 bg-jw-hover text-jw-text rounded-full font-medium hover:bg-opacity-80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">Anterior</button>
                        <button onClick={() => setIsReviewing(false)} onMouseEnter={() => playSound('hover')} className="opacity-50 hover:opacity-100 text-sm font-medium transition-opacity">Voltar</button>
                        <button onClick={() => { playSound('click'); if(reviewIndex<quizData.questions.length-1) setReviewIndex(i=>i+1)}} onMouseEnter={() => playSound('hover')} disabled={reviewIndex === quizData.questions.length - 1} className="px-6 py-3 bg-jw-hover text-jw-text rounded-full font-medium hover:bg-opacity-80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">Próximo</button>
                     </div>
                   </div>
                 )}
              </div>
            )}
          </main>

          {/* Footer / Change Key (Now scrolls with content) */}
          <footer className="w-full shrink-0 py-6 text-center text-[10px] opacity-40 hover:opacity-100 transition-opacity flex flex-col gap-1 pb-24 md:pb-12">
            <button onClick={handleLogoutRequest} className="hover:text-red-400 underline">Alterar Chave API / Sair</button>
            <span>Versão: 1.0.3</span>
          </footer>
      </div>

      {/* FAB Next */}
      {gameState === 'PLAYING' && isCurrentQuestionAnswered && (
         <div className="fixed bottom-8 right-4 md:right-8 z-50 animate-fade-in-up">
           <button onClick={handleNextQuestion} onMouseEnter={() => playSound('hover')} className="bg-jw-blue text-white font-bold py-3 px-6 md:px-8 rounded-full shadow-lg hover:bg-white hover:text-jw-blue transition-all transform active:scale-95 flex items-center gap-2 text-sm md:text-base">
             {(currentQuestionIndex < (quizData?.questions.length || 0) - 1) && ((currentQuestionIndex + 1) % (quizConfig?.questionsPerRound || 999) !== 0) ? 'Avançar' : 'Concluir Fase'}
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
           </button>
         </div>
      )}
    </div>
  );
}

export default App;