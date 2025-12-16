import React, { useState, useEffect, useRef } from 'react';
import { SetupForm } from './components/SetupForm';
import { QuizCard } from './components/QuizCard';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { generateQuizContent, generateReplacementQuestion } from './services/geminiService';
import { GeneratedQuiz, QuizConfig, Team, HintType, Difficulty, TTSConfig } from './types';
import { playSound, playTimerTick, setGlobalSoundState, playCountdownTick, playGoSound, startLoadingDrone, stopLoadingDrone, resumeAudioContext } from './utils/audio';
import { speakText, stopSpeech } from './utils/tts';
import { LOADING_MESSAGES } from './constants';

type GameState = 'SETUP' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_SUMMARY' | 'FINISHED';
type Theme = 'light' | 'dark';

function App() {
  const { isAuthenticated, apiKey, logout } = useAuth();
  
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [quizData, setQuizData] = useState<GeneratedQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // App Preferences (Global State)
  const [theme, setTheme] = useState<Theme>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0); 
  const [ttsEnabled, setTtsEnabled] = useState(false); // Global TTS Toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Game State
  const [gameState, setGameState] = useState<GameState>('SETUP');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState(60); 
  const [timeLeft, setTimeLeft] = useState(60);
  const [userAnswers, setUserAnswers] = useState<(number | string | null)[]>([]);
  const [isCurrentQuestionAnswered, setIsCurrentQuestionAnswered] = useState(false);
  
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

  // Audio/TTS Refs
  const questionReadRef = useRef(false);

  // --- Initialization ---

  useEffect(() => {
    const savedTheme = localStorage.getItem('jw-quiz-theme') as Theme;
    const savedSound = localStorage.getItem('jw-quiz-sound');
    const savedTTS = localStorage.getItem('jw-quiz-tts');
    
    if (savedTheme) setTheme(savedTheme);
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundEnabled(isEnabled);
      setGlobalSoundState(isEnabled);
    }
    if (savedTTS !== null) {
      setTtsEnabled(savedTTS === 'true');
    }

    // Listener to update state if user presses Esc
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('jw-quiz-theme', theme);
  }, [theme]);

  // Loading Sound Effect & Message Logic
  useEffect(() => {
    if (loading) {
      startLoadingDrone();
      // Pick a random message
      const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
      setLoadingMessage(randomMsg);
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
  // Ensure we stop speech if TTS is disabled globally
  useEffect(() => {
    if (!ttsEnabled) {
      stopSpeech();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    // Check both global toggle and config specific toggle (autoRead)
    const shouldRead = ttsEnabled && quizConfig?.tts.enabled && quizConfig.tts.autoRead;
    
    if (gameState === 'PLAYING' && quizData && shouldRead && !isCurrentQuestionAnswered && !isSkipping && cooldownTime === 0) {
      const timeout = setTimeout(() => {
        const q = quizData.questions[currentQuestionIndex];
        const teamIntro = quizConfig?.isTeamMode ? `Pergunta para ${teams[currentTeamIndex].name}. ` : "";
        
        let textToRead = `${teamIntro}${q.question}.`;
        
        if (q.options && q.options.length > 0) {
             textToRead += ` Alternativa A: ${q.options[0]}. Alternativa B: ${q.options[1]}. Alternativa C: ${q.options[2]}. Alternativa D: ${q.options[3]}.`;
        } else {
             textToRead += " Responda à pergunta.";
        }

        if (quizConfig?.tts) {
          // Pass apiKey for Gemini TTS support
          speakText(textToRead, quizConfig.tts, apiKey || undefined);
        }
      }, 500);
      return () => {
        clearTimeout(timeout);
        stopSpeech();
      };
    }
  }, [currentQuestionIndex, gameState, quizData, isCurrentQuestionAnswered, isSkipping, ttsEnabled, quizConfig, cooldownTime, apiKey]);

  // --- Keyboard Shortcuts (Spacebar & Enter to Next) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Allow Space or Enter
      if (e.code === 'Space' || e.key === 'Enter') {
        // Avoid scrolling/triggering if user is typing in a textarea/input
        const tagName = (e.target as HTMLElement).tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
        
        // Prevent action if in cooldown
        if (cooldownTime > 0) return;

        // Prevent page scroll for space and button clicks for enter to avoid double triggering
        e.preventDefault(); 

        // Context-aware action
        if (gameState === 'PLAYING' && isCurrentQuestionAnswered) {
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
  }, [gameState, isCurrentQuestionAnswered, isReviewing, reviewIndex, quizData, currentQuestionIndex, cooldownTime]);

  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setGlobalSoundState(newState);
    localStorage.setItem('jw-quiz-sound', String(newState));
  };

  const handleTTSToggle = () => {
    const newState = !ttsEnabled;
    setTtsEnabled(newState);
    localStorage.setItem('jw-quiz-tts', String(newState));
    if (!newState) stopSpeech();
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

  // Centralized Error Handling for API Calls
  const handleApiError = (err: any) => {
    const msg = err?.message || String(err);
    console.error("API Error:", msg);
    
    // Check for Quota Exceeded (429) or specific text
    if (msg.includes('quota') || msg.includes('429') || msg.includes('exceeded')) {
      setCooldownTime(60); // Set 60 seconds cooldown
      stopSpeech();
    } else {
      setError("Ocorreu um erro ao conectar com a IA. Verifique sua internet ou tente novamente.");
    }
  };

  const handleGenerate = async (config: QuizConfig) => {
    if (!apiKey) {
      setError("Erro de autenticação: API Key não encontrada.");
      return;
    }

    // Attempt to resume audio context on user gesture
    resumeAudioContext();

    // Ensure the generated config respects the current global TTS state
    const finalConfig = {
      ...config,
      tts: {
        ...config.tts,
        enabled: ttsEnabled // Sync with global toggle at start
      }
    };

    setLoading(true);
    setError(null);
    setQuizData(null);
    setQuizConfig(finalConfig);
    setTimeLimit(finalConfig.timeLimit);
    setHintsRemaining(finalConfig.maxHints);
    setCooldownTime(0);
    
    if (finalConfig.isTeamMode) {
      setTeams(finalConfig.teams.map((name, idx) => ({
        id: `team-${idx}`,
        name,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      })));
    } else {
      setTeams([{
        id: 'solo',
        name: 'Você',
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0
      }]);
    }

    try {
      const data = await generateQuizContent(apiKey, finalConfig);
      setQuizData(data);
      startCountdownSequence(finalConfig.timeLimit);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false); 
    }
  };

  const handleRestartSameSettings = () => {
    if (quizConfig) {
      stopSpeech();
      handleGenerate(quizConfig);
    }
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
    
    if ((isPlayPending || isReviewPending) && timeLeft > 0 && !isSkipping && cooldownTime === 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (quizConfig?.enableTimerSound && newTime > 0) {
             playTimerTick(newTime, timeLimit);
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && (isPlayPending || isReviewPending) && !isSkipping && cooldownTime === 0) {
      if (quizConfig?.enableTimerSound) playSound('timeUp');
      handleAnswer({ score: 0, isCorrect: false });
    }

    return () => clearInterval(interval);
  }, [timeLeft, gameState, isCurrentQuestionAnswered, quizConfig, timeLimit, isSkipping, cooldownTime, isReviewing, userAnswers, reviewIndex]);

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
    if (!isReviewing && ttsEnabled && quizConfig?.tts.enabled) {
      const feedback = result.score === 0 ? "Resposta incorreta." : (result.score === 1 ? "Resposta correta!" : `Parcialmente correto. ${result.score} pontos.`);
      // Pass apiKey for Gemini TTS support
      speakText(feedback, quizConfig.tts, apiKey || undefined);
    }

    // If in Play Mode, advance state
    if (!isReviewing) {
        setIsCurrentQuestionAnswered(true);
    }
  };

  const handleReplaceQuestion = async (index: number) => {
    if (!quizData || !quizConfig || !apiKey) return;
    setLoading(true);
    playSound('click');

    try {
        const oldQ = quizData.questions[index];
        const newQ = await generateReplacementQuestion(apiKey, quizConfig, oldQ.question);
        
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

  const handleReset = () => {
    stopSpeech();
    setQuizData(null);
    setError(null);
    setGameState('SETUP');
    setIsReviewing(false);
    setIsSkipping(false);
    setCooldownTime(0);
    setVoidedIndices(new Set());
  };

  const getTimerStyles = () => {
    if (isCurrentQuestionAnswered && !isReviewing) return 'bg-jw-hover text-gray-400';
    const percentage = (timeLeft / timeLimit) * 100;
    if (percentage > 50) return 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]';
    if (percentage > 20) return 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse';
    return 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-bounce';
  };

  // --- RENDERING ---

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (loading) {
     return (
       <div className="h-screen flex flex-col items-center justify-center bg-jw-dark text-jw-text transition-colors duration-300">
          <svg className="animate-spin h-16 w-16 text-jw-blue mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl animate-pulse font-medium tracking-wide">Preparando seu Quiz...</p>
          <p className="text-sm opacity-70 mt-4 max-w-md text-center italic px-4">
             "{loadingMessage}"
          </p>
       </div>
     )
  }

  // Quota Exceeded Full Screen Timer
  if (cooldownTime > 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
        <div className="bg-jw-card border border-red-500/30 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          
          <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-red-400">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
             </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-white">Limite de Uso da IA Atingido</h2>
          <p className="text-gray-400 mb-8 text-sm">
            Muitas requisições foram feitas em pouco tempo. O sistema precisa de uma pausa para restabelecer a conexão.
          </p>

          <div className="text-6xl font-mono font-bold text-jw-blue mb-8 tabular-nums">
             {cooldownTime}s
          </div>

          <button 
            onClick={() => setCooldownTime(0)} 
            className="text-sm text-gray-500 hover:text-white underline transition-colors"
          >
            Cancelar e Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'COUNTDOWN') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-jw-blue text-white transition-colors duration-300 z-50">
         <h2 className="text-2xl md:text-4xl font-light mb-4 opacity-80 uppercase tracking-widest">Sua vez</h2>
         <div className="text-4xl md:text-6xl font-bold mb-12 animate-fade-in-up bg-black/10 px-8 py-4 rounded-xl shadow-lg border border-black/10">
           {teams[currentTeamIndex]?.name || "Você"}
         </div>
         <div className="text-[8rem] md:text-[12rem] font-bold font-mono leading-none animate-pulse drop-shadow-2xl">
           {countdownValue}
         </div>
      </div>
    )
  }

  // Calculate if quiz is active to show in header or logic
  const isQuizActive = gameState !== 'SETUP';

  return (
    <div 
      className="h-screen flex flex-col font-sans bg-jw-dark text-jw-text overflow-hidden transition-colors duration-300" 
      style={{ zoom: zoomLevel }}
    >
      
      {/* GLOBAL HEADER WITH SETTINGS */}
      <header className="bg-jw-blue text-white h-auto py-2 shrink-0 flex flex-col md:flex-row items-center shadow-lg z-20 transition-colors gap-2 md:gap-0">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-between gap-y-2">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            <h1 className="text-base font-semibold tracking-wide truncate">JW Quiz Creator</h1>
          </div>

          {/* Settings Toolbar */}
          <div className="flex items-center gap-2 md:gap-4 ml-auto overflow-x-auto">
            {/* Zoom */}
            <div className="flex items-center gap-1 bg-black/10 rounded-lg px-1">
              <button 
                onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))} 
                className="w-8 h-8 flex items-center justify-center font-bold hover:bg-black/10 rounded"
                title="Diminuir"
              >
                -
              </button>
              <span className="text-xs font-mono w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button 
                onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} 
                className="w-8 h-8 flex items-center justify-center font-bold hover:bg-black/10 rounded"
                title="Aumentar"
              >
                +
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-black/20 mx-1"></div>

            {/* Toggle Group */}
            <div className="flex items-center gap-2">
               {/* Theme */}
               <button 
                 onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                 className="p-2 rounded-full hover:bg-black/10 transition-colors"
                 title="Tema Escuro/Claro"
               >
                 {theme === 'dark' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                 )}
               </button>

               {/* Sound */}
               <button 
                 onClick={handleSoundToggle}
                 className={`p-2 rounded-full hover:bg-black/10 transition-colors ${!soundEnabled && 'opacity-50'}`}
                 title="Efeitos Sonoros"
               >
                 {soundEnabled ? (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                 )}
               </button>

               {/* TTS Toggle */}
               <button 
                 onClick={handleTTSToggle}
                 className={`p-2 rounded-full hover:bg-black/10 transition-colors ${!ttsEnabled && 'opacity-50'}`}
                 title="Narração (TTS)"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
               </button>

               {/* Fullscreen Toggle */}
               <button
                 onClick={toggleFullscreen}
                 className="p-2 rounded-full hover:bg-black/10 transition-colors"
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
            </div>

            {/* New Quiz Button (Condensed) */}
            {isQuizActive && (
               <button 
                onClick={handleReset} 
                onMouseEnter={() => playSound('hover')} 
                className="ml-2 bg-black/10 hover:bg-black/20 p-2 rounded-lg transition-colors"
                title="Novo Quiz"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
               </button>
            )}
          </div>
        </div>
      </header>

      {/* GAME STATUS BAR (Round & Team) */}
      {gameState === 'PLAYING' && quizData && (
        <div className="bg-jw-card border-b border-gray-700/20 py-2 px-4 md:px-6 flex justify-between items-center text-xs md:text-sm shadow-sm z-10 overflow-x-auto scrollbar-hide">
          <span className="opacity-70 font-mono whitespace-nowrap mr-4">Rodada {currentRound}</span>
          <div className="flex gap-4">
             {teams.map((t, idx) => (
               <div key={t.id} className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all whitespace-nowrap ${idx === currentTeamIndex ? 'bg-jw-blue text-white font-bold ring-2 ring-offset-2 ring-offset-jw-dark ring-jw-blue' : 'opacity-50'}`}>
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

      {/* MAIN CONTENT */}
      <main className="flex-1 container mx-auto px-4 md:px-6 overflow-y-auto flex flex-col justify-center relative pb-20 scrollbar-thin scrollbar-thumb-gray-800">
        {error && <div className="max-w-xl mx-auto mb-6 bg-red-900/20 border border-red-800 text-red-300 p-4 rounded text-center"><p className="text-sm">{error}</p></div>}

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
             />
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
                 ttsConfig={quizConfig?.tts}
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
                    <div key={t.id} className="bg-jw-hover p-4 rounded-lg">
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
                         <div key={t.id} className={`flex-1 p-6 rounded-xl ${i === 0 && teams.length > 1 && teams[0].score > teams[1].score ? 'bg-yellow-500/10 border border-yellow-500/50' : 'bg-jw-hover'}`}>
                            <h4 className="text-xl font-bold mb-2">{t.name}</h4>
                            <div className="text-5xl font-bold text-jw-blue mb-2">{t.score} <span className="text-xl text-gray-500">/ {t.correctCount + t.wrongCount}</span></div>
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
                   <button onClick={handleReset} onMouseEnter={() => playSound('hover')} className="flex-1 py-3 px-6 bg-jw-blue text-white rounded-full font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2">Novo Quiz</button>
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
                        ttsConfig={quizConfig?.tts}
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

      {/* FAB Next */}
      {gameState === 'PLAYING' && isCurrentQuestionAnswered && (
         <div className="fixed bottom-8 right-4 md:right-8 z-50 animate-fade-in-up">
           <button onClick={handleNextQuestion} onMouseEnter={() => playSound('hover')} className="bg-jw-blue text-white font-bold py-3 px-6 md:px-8 rounded-full shadow-lg hover:bg-white hover:text-jw-blue transition-all transform active:scale-95 flex items-center gap-2 text-sm md:text-base">
             {(currentQuestionIndex < (quizData?.questions.length || 0) - 1) && ((currentQuestionIndex + 1) % (quizConfig?.questionsPerRound || 999) !== 0) ? 'Avançar' : 'Concluir Fase'}
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
           </button>
         </div>
      )}

      {/* Footer / Change Key */}
      <footer className="shrink-0 py-2 text-center text-[10px] opacity-40 hover:opacity-100 transition-opacity">
        <button onClick={logout} className="hover:text-red-400 underline">Alterar Chave API / Sair</button>
      </footer>
    </div>
  );
}

export default App;