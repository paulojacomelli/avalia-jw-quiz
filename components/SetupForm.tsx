import React, { useState, useEffect } from 'react';
import { BIBLE_BOOKS, DIFFICULTY_OPTIONS, MODE_OPTIONS, HINT_TYPE_OPTIONS, FORMAT_OPTIONS } from '../constants';
import { Difficulty, QuizConfig, TopicMode, HintType, TTSConfig, QuizFormat } from '../types';
import { playSound } from '../utils/audio';
import { speakText, stopSpeech } from '../utils/tts';

interface SetupFormProps {
  onGenerate: (config: QuizConfig) => void;
  isLoading: boolean;
  ttsEnabled: boolean; // Received from App global state
  onClearHistory?: () => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ 
  onGenerate, 
  isLoading,
  ttsEnabled,
  onClearHistory
}) => {
  // --- Wizard State ---
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 3;

  // --- Quiz Config ---
  const [mode, setMode] = useState<TopicMode>(TopicMode.GENERAL);
  const [book, setBook] = useState<string>(BIBLE_BOOKS[0]);
  const [specificTopic, setSpecificTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [quizFormat, setQuizFormat] = useState<QuizFormat>(QuizFormat.MULTIPLE_CHOICE);
  const [count, setCount] = useState<number>(10);
  const [questionsPerRound, setQuestionsPerRound] = useState<number>(5);
  
  // --- Timer ---
  const [enableTimer, setEnableTimer] = useState<boolean>(true);
  const [enableTimerSound, setEnableTimerSound] = useState<boolean>(true);
  const [timeLimit, setTimeLimit] = useState<number>(60);
  
  // --- Hints ---
  const [maxHints, setMaxHints] = useState<number>(3);
  const [hintTypes, setHintTypes] = useState<HintType[]>([HintType.RANDOM]);

  // --- Teams ---
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [teamNames, setTeamNames] = useState<string[]>(['Time A', 'Time B']);

  // --- TTS Config (Local config, but 'enabled' synced with prop at generate time) ---
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    enabled: ttsEnabled,
    autoRead: true,
    gender: 'female',
    rate: 1.0,
    volume: 1.0
  });

  // Sync local config enabled state with prop if needed, 
  // though primarily we use the prop to show/hide the config section
  useEffect(() => {
    setTtsConfig(prev => ({ ...prev, enabled: ttsEnabled }));
  }, [ttsEnabled]);

  // Ensure questionsPerRound doesn't exceed total count
  useEffect(() => {
    if (questionsPerRound > count) {
      setQuestionsPerRound(count);
    }
  }, [count, questionsPerRound]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopSpeech();
    onGenerate({
      mode,
      book: mode === TopicMode.BOOK ? book : undefined,
      specificTopic: mode === TopicMode.SPECIFIC ? specificTopic : undefined,
      difficulty,
      quizFormat,
      count,
      enableTimer,
      enableTimerSound,
      timeLimit: enableTimer ? timeLimit : 0,
      maxHints,
      hintTypes: hintTypes.length > 0 ? hintTypes : [HintType.RANDOM],
      isTeamMode,
      teams: isTeamMode ? teamNames : [],
      questionsPerRound: isTeamMode ? questionsPerRound : count,
      tts: ttsConfig
    });
  };

  const nextStep = () => {
    // Validation before moving from Step 1
    if (currentStep === 1) {
      if (mode === TopicMode.SPECIFIC && !specificTopic.trim()) {
        alert("Por favor, digite o assunto específico.");
        return;
      }
    }
    playSound('click');
    if (currentStep < TOTAL_STEPS) setCurrentStep(c => c + 1);
  };

  const prevStep = () => {
    playSound('click');
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const toggleHintType = (type: HintType) => {
    if (type === HintType.RANDOM) {
      setHintTypes([HintType.RANDOM]);
      return;
    }
    setHintTypes(prev => {
      const withoutRandom = prev.filter(t => t !== HintType.RANDOM);
      if (prev.includes(type)) {
        const newVal = withoutRandom.filter(t => t !== type);
        return newVal.length === 0 ? [HintType.RANDOM] : newVal;
      } else {
        return [...withoutRandom, type];
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

  const testVoice = () => {
    speakText("Olá, este é um teste do leitor de tela.", ttsConfig);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-jw-card p-4 md:p-8 rounded-xl shadow-2xl border border-gray-700/30 transition-colors duration-300">
      
      {/* WIZARD PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">
          <span className={currentStep >= 1 ? 'text-jw-blue' : ''}>1. Conteúdo</span>
          <span className={currentStep >= 2 ? 'text-jw-blue' : ''}>2. Estrutura</span>
          <span className={currentStep >= 3 ? 'text-jw-blue' : ''}>3. Ajudas</span>
        </div>
        <div className="h-2 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-jw-blue transition-all duration-300 ease-out" 
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* STEP 1: CONTEÚDO */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Mode */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Sobre o que será o Quiz?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseEnter={() => playSound('hover')}
                    onClick={() => setMode(opt.value)}
                    className={`py-3 px-2 rounded-lg text-xs md:text-sm border transition-all ${
                      mode === opt.value 
                        ? 'bg-jw-blue text-white font-bold shadow-md border-transparent transform scale-[1.02]' 
                        : 'border-gray-400 dark:border-gray-600 bg-jw-hover text-gray-600 dark:text-gray-300 hover:border-jw-blue'
                    }`}
                  >
                    {opt.label}
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
            <div>
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
            
             {/* Quiz Format */}
            <div>
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
          </div>
        )}

        {/* STEP 2: ESTRUTURA */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Team Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-jw-hover/30 rounded-lg border border-gray-700/30">
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
               <div>
                 <div className="flex justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Total de Perguntas</label>
                    <span className="text-sm font-bold text-jw-blue bg-jw-blue/10 px-2 py-0.5 rounded">{count}</span>
                 </div>
                 <input 
                   type="range" min="1" max="50" value={count} 
                   onChange={(e) => setCount(parseInt(e.target.value))} 
                   className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none" 
                 />
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
            <div className="flex items-center justify-between p-4 bg-jw-hover/30 rounded-lg border border-gray-700/30">
              <div>
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">Usar Temporizador</span>
              </div>
              <div className="flex items-center gap-4">
                 {enableTimer && (
                   <select 
                    value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="bg-jw-card border border-gray-500 rounded text-xs p-1"
                   >
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

        {/* STEP 3: AJUDAS & ACESSIBILIDADE */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
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
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Estilos Permitidos</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {HINT_TYPE_OPTIONS.map((opt) => {
                  const isSelected = hintTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleHintType(opt.value)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 aspect-square ${
                        isSelected
                          ? 'bg-jw-blue text-white border-transparent shadow-md'
                          : 'bg-jw-hover border-transparent text-gray-500 dark:text-gray-400 hover:text-jw-text hover:border-gray-500'
                      }`}
                      title={opt.label}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 mb-1 ${isSelected ? 'text-white' : 'opacity-70'}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                      </svg>
                      <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TTS Config */}
            <div className="pt-4 border-t border-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Leitor de Tela (IA)</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${ttsEnabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/30 text-gray-500'}`}>
                  {ttsEnabled ? 'Ativado (Topo)' : 'Desativado (Topo)'}
                </span>
              </div>
              
              {!ttsEnabled && (
                 <p className="text-xs text-gray-500 mb-4 bg-gray-800/20 p-2 rounded">
                   Para configurar a voz, ative a narração no cabeçalho superior.
                 </p>
              )}

              {ttsEnabled && (
                <div className="animate-fade-in bg-jw-hover/30 p-4 rounded-lg space-y-4 border border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Ler automaticamente ao iniciar</label>
                    <input type="checkbox" checked={ttsConfig.autoRead} onChange={(e) => setTtsConfig({...ttsConfig, autoRead: e.target.checked})} className="accent-jw-blue w-4 h-4" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Voz</label>
                       <div className="flex rounded-lg overflow-hidden border border-gray-400 dark:border-gray-600">
                          <button type="button" onClick={() => setTtsConfig({...ttsConfig, gender: 'female'})} className={`flex-1 py-1 text-xs ${ttsConfig.gender === 'female' ? 'bg-jw-blue text-white' : 'bg-jw-card text-jw-text'}`}>Fem</button>
                          <button type="button" onClick={() => setTtsConfig({...ttsConfig, gender: 'male'})} className={`flex-1 py-1 text-xs ${ttsConfig.gender === 'male' ? 'bg-jw-blue text-white' : 'bg-jw-card text-jw-text'}`}>Masc</button>
                       </div>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Velocidade</label>
                       <input type="range" min="0.5" max="2" step="0.1" value={ttsConfig.rate} onChange={(e) => setTtsConfig({...ttsConfig, rate: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-jw-blue touch-none" />
                     </div>
                  </div>
                  <button type="button" onClick={testVoice} className="text-xs text-jw-blue underline font-medium">Testar voz</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NAVIGATION BUTTONS */}
        <div className="flex gap-4 pt-4 border-t border-gray-700/30">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 py-3 bg-jw-hover text-jw-text font-bold rounded-full hover:bg-opacity-80 transition-colors"
            >
              Voltar
            </button>
          )}
          
          {currentStep < TOTAL_STEPS ? (
             <button
               type="button"
               onClick={nextStep}
               className="flex-1 py-3 bg-jw-blue text-white font-bold rounded-full hover:bg-opacity-90 transition-colors shadow-lg"
             >
               Próximo
             </button>
          ) : (
            <button
              type="submit"
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

        {/* Clear History Button (Footer) */}
        {onClearHistory && (
          <div className="text-center pt-2">
             <button 
                type="button" 
                onClick={onClearHistory} 
                className="text-xs text-red-400 hover:text-red-300 underline opacity-60 hover:opacity-100 transition-opacity"
             >
               Limpar Histórico de Perguntas
             </button>
          </div>
        )}
      </form>
    </div>
  );
};