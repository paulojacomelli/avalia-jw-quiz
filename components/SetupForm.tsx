import React, { useState, useEffect } from 'react';
import { BIBLE_BOOKS, DIFFICULTY_OPTIONS, MODE_OPTIONS, HINT_TYPE_OPTIONS, FORMAT_OPTIONS } from '../constants';
import { Difficulty, QuizConfig, TopicMode, HintType, TTSConfig, QuizFormat } from '../types';
import { playSound } from '../utils/audio';
import { stopSpeech } from '../utils/tts';

interface SetupFormProps {
  onGenerate: (config: QuizConfig) => void;
  isLoading: boolean;
  ttsEnabled: boolean;
  // Props for external step control (Tour/Guide)
  forcedStep?: number;
  onStepChange?: (step: number) => void;
  // History Props
  usedTopics?: string[];
  onClearHistory?: () => void;
  isPrebuiltQuiz?: boolean;
  availableThemes?: Record<string, string[]>;
}
export const SetupForm: React.FC<SetupFormProps> = ({
  onGenerate,
  isLoading,
  ttsEnabled,
  forcedStep,
  onStepChange,
  usedTopics = [],
  onClearHistory,
  isPrebuiltQuiz = false,
  availableThemes = {}
}) => {
  // --- Wizard State ---
  const [internalStep, setInternalStep] = useState(1);
  const TOTAL_STEPS = 3;

  // Use internal state unless forcedStep is provided
  const currentStep = forcedStep !== undefined ? forcedStep : internalStep;

  // Sync internal state if forcedStep changes
  useEffect(() => {
    if (forcedStep !== undefined) {
      setInternalStep(forcedStep);
    }
  }, [forcedStep]);

  const updateStep = (newStep: number) => {
    setInternalStep(newStep);
    if (onStepChange) onStepChange(newStep);
  };

  // --- Quiz Config ---
  const [mode, setMode] = useState<TopicMode>(TopicMode.GENERAL);
  const [book, setBook] = useState<string>(BIBLE_BOOKS[0]);
  const [specificTopic, setSpecificTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [temperature, setTemperature] = useState<number>(1.0); // Default balanced temperature
  const [quizFormat, setQuizFormat] = useState<QuizFormat>(QuizFormat.MULTIPLE_CHOICE);
  const [count, setCount] = useState<number>(10);
  const [questionsPerRound, setQuestionsPerRound] = useState<number>(5);

  // --- Timer ---
  const [enableTimer, setEnableTimer] = useState<boolean>(true);
  const [enableTimerSound, setEnableTimerSound] = useState<boolean>(true);
  const [timeLimit, setTimeLimit] = useState<number>(60);

  // --- Hints ---
  const [maxHints, setMaxHints] = useState<number>(3);
  const [hintTypes, setHintTypes] = useState<HintType[]>([HintType.STANDARD]);

  // --- Teams ---
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>(['Time A', 'Time B']);

  // Ensure questionsPerRound doesn't exceed total count
  useEffect(() => {
    if (questionsPerRound > count) {
      setQuestionsPerRound(count);
    }
  }, [count, questionsPerRound]);

  const validateStep1 = () => {
    if (mode === TopicMode.SPECIFIC && !specificTopic.trim()) {
      alert("Por favor, digite o assunto específico.");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;

    playSound('click');
    if (currentStep < TOTAL_STEPS) {
      updateStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    playSound('click');
    if (currentStep > 1) updateStep(currentStep - 1);
  };

  const handleFinalSubmit = () => {
    stopSpeech();
    onGenerate({
      mode,
      book: mode === TopicMode.BOOK ? book : undefined,
      specificTopic: mode === TopicMode.SPECIFIC ? specificTopic : undefined,
      difficulty,
      temperature,
      quizFormat,
      count,
      enableTimer,
      enableTimerSound,
      timeLimit: enableTimer ? timeLimit : 0,
      maxHints,
      hintTypes: hintTypes.length > 0 ? hintTypes : [HintType.STANDARD],
      isTeamMode,
      teams: isTeamMode ? teamNames : [],
      questionsPerRound: isTeamMode ? questionsPerRound : count,
      // Default placeholder tts config, will be overridden by App.tsx global state
      tts: {
        enabled: false,
        autoRead: true,
        engine: 'gemini',
        gender: 'female',
        rate: 1.5,
        volume: 1.0
      }
    });
  };

  // Handle "Enter" key on the form
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < TOTAL_STEPS) {
      handleNextStep();
    } else {
      handleFinalSubmit();
    }
  };

  const toggleHintType = (type: HintType) => {
    setHintTypes(prev => {
      if (prev.includes(type)) {
        // Prevent deselecting all options, must have at least one
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Team Management
  const addTeam = () => {
    if (teamNames.length < 4) setTeamNames([...teamNames, `Time ${String.fromCharCode(65 + teamNames.length)}`]);
  };
  const removeTeam = () => {
    if (teamNames.length > 2) setTeamNames(teamNames.slice(0, -1));
  };
  const updateTeamName = (index: number, name: string) => {
    const newNames = [...teamNames];
    newNames[index] = name;
    setTeamNames(newNames);
  };

  return (
    <div id="setup-form-container" className="w-full max-w-2xl mx-auto bg-jw-card p-4 md:p-8 rounded-xl shadow-2xl border border-gray-700/30 transition-colors duration-300">

      {/* WIZARD PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">
          <span className={currentStep >= 1 ? 'text-jw-blue' : ''}>{isPrebuiltQuiz ? '1. Iniciar' : '1. Conteúdo'}</span>
          <span className={currentStep >= 2 ? 'text-jw-blue' : ''}>2. Configurações</span>
          <span className={currentStep >= 3 ? 'text-jw-blue' : ''}>3. Ajudas</span>
        </div>
        <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-jw-blue transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={onFormSubmit} className="space-y-6">

        {/* STEP 1: CONTEÚDO */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            {isPrebuiltQuiz ? (
              <>
                <div id="field-mode">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 italic text-jw-blue">Biblioteca da Comunidade: Escolha um Tema</label>
                  <div className="grid grid-cols-2 gap-4">
                    {MODE_OPTIONS.filter(opt =>
                      availableThemes[opt.value] !== undefined || Object.keys(availableThemes).length === 0
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseEnter={() => playSound('hover')}
                        onClick={() => setMode(opt.value)}
                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${mode === opt.value
                          ? 'bg-jw-blue border-jw-blue text-white shadow-[0_0_20px_rgba(91,60,136,0.3)] transform scale-[1.02]'
                          : 'border-gray-700/20 bg-jw-hover/50 text-gray-400 dark:text-gray-500 hover:border-gray-500/50'
                          }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 mb-3 ${mode === opt.value ? 'text-white' : 'opacity-60'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                        </svg>
                        <span className={`text-sm font-bold ${mode === opt.value ? 'text-white' : ''}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {mode === TopicMode.BOOK && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Livros Disponíveis na Biblioteca</label>
                    <select
                      value={book}
                      onChange={(e) => setBook(e.target.value)}
                      className="w-full p-3 rounded-lg bg-jw-hover border border-gray-400 dark:border-gray-600 text-jw-text focus:ring-2 focus:ring-jw-blue outline-none"
                    >
                      {BIBLE_BOOKS.filter(b =>
                        !availableThemes[TopicMode.BOOK] || availableThemes[TopicMode.BOOK].includes(b)
                      ).map((b) => (<option key={b} value={b} className="bg-jw-card">{b}</option>))}
                    </select>
                  </div>
                )}

                <p className="text-center text-xs opacity-50 mt-4">
                  Clique em "Próximo" para configurar as equipes e o tempo!
                </p>
              </>
            ) : (
              <>
                {/* Mode */}
                <div id="field-mode">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Escolha um Tema Principal</label>
                  <div className="grid grid-cols-2 gap-4">
                    {MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseEnter={() => playSound('hover')}
                        onClick={() => setMode(opt.value)}
                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${mode === opt.value
                          ? 'bg-jw-blue border-jw-blue text-white shadow-[0_0_20px_rgba(91,60,136,0.3)] transform scale-[1.02]'
                          : 'border-gray-700/20 bg-jw-hover/50 text-gray-400 dark:text-gray-500 hover:border-gray-500/50'
                          }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 mb-3 ${mode === opt.value ? 'text-white' : 'opacity-60'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                        </svg>
                        <span className={`text-sm font-bold ${mode === opt.value ? 'text-white' : ''}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Book/Topic Selection */}
                {mode === TopicMode.BOOK && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Selecione o Livro</label>
                    <select
                      value={book}
                      onChange={(e) => setBook(e.target.value)}
                      className="w-full p-3 rounded-lg bg-jw-hover border border-gray-400 dark:border-gray-600 text-jw-text focus:ring-2 focus:ring-jw-blue outline-none"
                    >
                      {BIBLE_BOOKS.map((b) => (<option key={b} value={b} className="bg-jw-card">{b}</option>))}
                    </select>
                  </div>
                )}

                {mode === TopicMode.SPECIFIC && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Qual o assunto?</label>
                    <input
                      type="text"
                      value={specificTopic}
                      onChange={(e) => setSpecificTopic(e.target.value)}
                      placeholder="Ex: O Sermão do Monte, A Vida de Davi..."
                      className="w-full p-3 rounded-lg bg-jw-hover border border-gray-400 dark:border-gray-600 text-jw-text focus:ring-2 focus:ring-jw-blue outline-none"
                      autoFocus
                    />
                  </div>
                )}

                {/* Difficulty */}
                <div id="field-difficulty">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Dificuldade</label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex-1 cursor-pointer group" onMouseEnter={() => playSound('hover')}>
                        <input type="radio" name="difficulty" value={opt.value} checked={difficulty === opt.value} onChange={() => setDifficulty(opt.value)} className="sr-only" />
                        <div className={`text-center py-2 rounded-lg text-sm border transition-all ${difficulty === opt.value ? 'bg-jw-blue text-white font-bold border-transparent shadow-md' : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 group-hover:border-jw-blue'}`}>
                          {opt.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Temperature Slider */}
                <div className="animate-fade-in" id="field-temperature">
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                      Criatividade
                    </label>
                    <span className="text-sm font-mono font-bold text-jw-blue bg-jw-blue/10 px-2 py-0.5 rounded">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                    <span>Conservador</span>
                    <span>Equilibrado</span>
                    <span>Criativo</span>
                  </div>
                </div>

                {/* Quiz Format */}
                <div id="field-format">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Formato</label>
                  <div className="flex gap-2">
                    {FORMAT_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex-1 cursor-pointer group" onMouseEnter={() => playSound('hover')}>
                        <input type="radio" name="quizFormat" value={opt.value} checked={quizFormat === opt.value} onChange={() => setQuizFormat(opt.value as QuizFormat)} className="sr-only" />
                        <div className={`text-center py-2 rounded-lg text-sm border transition-all ${quizFormat === opt.value ? 'bg-jw-blue text-white font-bold border-transparent shadow-md' : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 group-hover:border-jw-blue'}`}>
                          {opt.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: CONFIGURAÇÕES */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Team Mode Toggle */}
            <div id="field-team-mode" className="flex items-center justify-between p-4 bg-jw-hover/30 rounded-lg border border-gray-700/30">
              <div>
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">Modo Competição (Times)</span>
                <span className="text-xs opacity-60">Jogar com amigos ou em família</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamMode(!isTeamMode)}
                onMouseEnter={() => playSound('hover')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isTeamMode ? 'bg-jw-blue' : 'bg-gray-500'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTeamMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {isTeamMode && (
              <div className="animate-fade-in bg-jw-hover/30 p-4 rounded-lg space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase">Nomes dos Times</label>
                {teamNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 w-4">{idx + 1}</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateTeamName(idx, e.target.value)}
                      className="flex-1 bg-jw-card border border-gray-400 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-jw-text focus:ring-1 focus:ring-jw-blue"
                      placeholder={`Nome do Time ${idx + 1}`}
                    />
                  </div>
                ))}
                <div className="flex gap-2 text-xs pt-1">
                  {teamNames.length < 4 && <button type="button" onClick={addTeam} className="text-jw-blue hover:underline font-semibold">+ Adicionar</button>}
                  {teamNames.length > 2 && <button type="button" onClick={removeTeam} className="text-red-400 hover:underline font-semibold">- Remover</button>}
                </div>
              </div>
            )}

            {/* Questions & Rounds */}
            <div className={`grid gap-6 ${isTeamMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              <div id="field-count">
                <div className="flex justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Total de Perguntas</label>
                  <span className="text-sm font-bold text-jw-blue bg-jw-blue/10 px-2 py-0.5 rounded">{count}</span>
                </div>
                <input
                  type="range" min="1" max="50" value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none"
                />
                {isPrebuiltQuiz && <span className="text-[10px] text-jw-blue block mt-1 font-medium">Na biblioteca, você pode reduzir o total de perguntas, mas não exceder o limite do arquivo original.</span>}
              </div>

              {isTeamMode && (
                <div className="animate-fade-in">
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Perguntas p/ Rodada</label>
                    <span className="text-sm font-bold text-jw-blue bg-jw-blue/10 px-2 py-0.5 rounded">{questionsPerRound}</span>
                  </div>
                  <input
                    type="range" min="1" max={count} value={questionsPerRound}
                    onChange={(e) => setQuestionsPerRound(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none"
                  />
                </div>
              )}
            </div>

            {/* Timer Toggle */}
            <div id="field-timer" className="flex items-center justify-between p-4 bg-jw-hover/30 rounded-lg border border-gray-700/30">
              <div>
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">Usar Temporizador</span>
              </div>
              <div className="flex items-center gap-4">
                {enableTimer && (
                  <select
                    value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="bg-jw-card border border-gray-500 rounded text-xs p-1"
                  >
                    <option value="5">5s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                    <option value="90">90s</option>
                    <option value="120">2m</option>
                  </select>
                )}
                <button
                  type="button" onClick={() => setEnableTimer(!enableTimer)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableTimer ? 'bg-jw-blue' : 'bg-gray-500'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableTimer ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: AJUDAS */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in" id="field-hints">
            {/* Hints Config */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Limite de Dicas</label>
                <span className="text-sm font-bold text-jw-blue">{maxHints}</span>
              </div>
              <input
                type="range" min="0" max="10" value={maxHints}
                onChange={(e) => setMaxHints(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Tipos de Ajuda Disponíveis</label>
              <div className="grid grid-cols-2 gap-3">
                {HINT_TYPE_OPTIONS.map((opt) => {
                  const isSelected = hintTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleHintType(opt.value)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${isSelected
                        ? 'bg-jw-blue text-white border-transparent shadow-md'
                        : 'bg-jw-hover border-transparent text-gray-500 dark:text-gray-400 hover:text-jw-text hover:border-gray-500'
                        }`}
                      title={opt.label}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 mb-2 ${isSelected ? 'text-white' : 'opacity-70'}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                      </svg>
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="text-xs opacity-70 mt-1">
                        {opt.value === HintType.STANDARD ? "Dica direta gerada automaticamente" : "Chat interativo para tirar dúvidas"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION BUTTONS */}
        <div className="flex gap-4 pt-4 border-t border-gray-700/30">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex-1 py-3 bg-jw-hover text-jw-text font-bold rounded-full hover:bg-opacity-80 transition-colors"
            >
              Voltar
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-3 bg-jw-blue text-white font-bold rounded-full hover:bg-opacity-90 transition-colors shadow-lg"
            >
              Próximo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isLoading}
              onMouseEnter={() => playSound('hover')}
              className="flex-1 py-3 bg-jw-text text-jw-dark font-bold rounded-full hover:bg-opacity-90 transition-transform transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center shadow-lg text-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-jw-dark border-t-transparent rounded-full animate-spin"></div> Gerando...</span>
              ) : (
                "Iniciar Quiz"
              )}
            </button>
          )}
        </div>
      </form>

      {/* HISTORY SECTION (Screenshot 4) */}
      {currentStep === 1 && usedTopics.length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-700/30 animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Temas de Quiz Recentemente Explorados</h3>
            <button
              type="button"
              onClick={onClearHistory}
              onMouseEnter={() => playSound('hover')}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-colors"
            >
              Limpar Histórico
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {usedTopics.map((topic, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMode(TopicMode.SPECIFIC);
                  setSpecificTopic(topic);
                  playSound('click');
                }}
                className="px-3 py-1.5 rounded-lg bg-jw-hover/50 border border-gray-700/30 text-xs font-medium text-gray-400 hover:text-jw-blue hover:border-jw-blue/50 transition-all"
              >
                {topic}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] italic text-gray-500 leading-relaxed">
            * O JW Quiz rotaciona automaticamente estas instruções internas para garantir que você sempre aprenda algo novo e variado.
          </p>
        </div>
      )}
    </div>
  );
};