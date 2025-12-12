import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, TTSConfig, HintType, QuizFormat, EvaluationResult } from '../types';
import { HINT_TYPE_OPTIONS } from '../constants';
import { playSound } from '../utils/audio';
import { speakText, stopSpeech, isSpeaking } from '../utils/tts';
import { askAiAboutQuestion, generateHintByType, evaluateFreeResponse } from '../services/geminiService';

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  showAnswerKey?: boolean;
  timeLeft?: number;
  onAnswer?: (result: { score: number, isCorrect: boolean, selectedIndex?: number | null, textAnswer?: string }) => void;
  forceSelectedOption?: number | null;
  isTimeUp?: boolean;
  onContest?: () => void;
  hintsRemaining?: number; 
  onRevealHint?: () => void;
  activeTeamName?: string;
  ttsConfig?: TTSConfig;
  allowAskAi?: boolean;
  onSkip?: () => void;
  isSkipping?: boolean;
}

export const QuizCard: React.FC<QuizCardProps> = ({ 
  question, 
  index, 
  total, 
  showAnswerKey = false,
  timeLeft,
  onAnswer,
  forceSelectedOption = null,
  isTimeUp = false,
  onContest,
  hintsRemaining = -1,
  onRevealHint,
  activeTeamName,
  ttsConfig,
  allowAskAi = false,
  onSkip,
  isSkipping = false
}) => {
  // State for MC/TF
  const [internalSelectedOption, setInternalSelectedOption] = useState<number | null>(null);
  
  // State for Open Ended
  const [textAnswer, setTextAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const recognitionRef = useRef<any>(null); // For SpeechRecognition

  // Hint State
  const [showHintSelection, setShowHintSelection] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [activeHintTypeLabel, setActiveHintTypeLabel] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  // Ask AI State (Chat)
  const [showAskAi, setShowAskAi] = useState(false);
  const [askInput, setAskInput] = useState('');
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAskLoading, setIsAskLoading] = useState(false);

  const selectedOption = forceSelectedOption !== null ? forceSelectedOption : internalSelectedOption;
  const isMultipleChoice = question.options && question.options.length > 0;
  
  // Determines if we are in "Review/Result" state for this card
  const isAnsweredOrFinished = selectedOption !== null || isTimeUp || showAnswerKey || evaluationResult;

  useEffect(() => {
    // Reset all state on new question
    setInternalSelectedOption(null);
    setShowHintSelection(false);
    setActiveHint(null);
    setActiveHintTypeLabel(null);
    setShowAskAi(false);
    setAskInput('');
    setAskResponse(null);
    setTextAnswer('');
    setEvaluationResult(null);
    setIsEvaluating(false);
    setIsRecording(false);
  }, [question.id]);

  // Handle MC Selection
  const handleSelect = (idx: number) => {
    if (showAnswerKey || selectedOption !== null || isTimeUp || isSkipping) return; 
    playSound('click');
    setInternalSelectedOption(idx);
    
    // For MC/TF, score is binary (1 or 0) based on index match
    const isCorrect = idx === question.correctAnswerIndex;
    if (onAnswer) onAnswer({ score: isCorrect ? 1 : 0, isCorrect, selectedIndex: idx });
  };

  // Handle Free Response Submission
  const handleSubmitFreeResponse = async () => {
    if (!textAnswer.trim() || isEvaluating || isSkipping || evaluationResult) return;
    
    setIsEvaluating(true);
    playSound('click');
    
    try {
      const result = await evaluateFreeResponse(question.question, question.correctAnswerText || '', textAnswer);
      setEvaluationResult(result);
      // Pass the score to the parent
      if (onAnswer) onAnswer({ score: result.score, isCorrect: result.isCorrect, textAnswer: textAnswer });
    } catch (e) {
      alert("Erro ao avaliar resposta. Tente novamente.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle Microphone
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta entrada de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTextAnswer(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleToggleHintMenu = () => {
    if (showHintSelection) {
      setShowHintSelection(false);
    } else {
      if (hintsRemaining === 0 && !activeHint && !showAskAi) return;
      playSound('click');
      setShowHintSelection(true);
    }
  };

  const handleSelectHintType = async (type: HintType) => {
    if (hintsRemaining === 0 && !activeHint) return; 

    playSound('click');
    setShowHintSelection(false); 

    if (type === HintType.ASK_AI) {
      setShowAskAi(true);
      setActiveHint(null);
      if (onRevealHint) onRevealHint();
      return;
    }

    if (type === HintType.RANDOM) {
      setActiveHint(question.hint);
      setActiveHintTypeLabel('Dica do Quiz');
      setShowAskAi(false);
      if (onRevealHint) onRevealHint();
      return;
    }

    setIsHintLoading(true);
    setActiveHint(null);
    setActiveHintTypeLabel(HINT_TYPE_OPTIONS.find(t => t.value === type)?.label || 'Dica');
    setShowAskAi(false);
    if (onRevealHint) onRevealHint();

    try {
      const generatedHint = await generateHintByType(question, type);
      setActiveHint(generatedHint);
    } catch (e) {
      setActiveHint("Não foi possível gerar esta dica agora. Tente a dica padrão.");
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleSubmitAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;

    setIsAskLoading(true);
    playSound('click');
    
    try {
      const response = await askAiAboutQuestion(question, askInput);
      setAskResponse(response);
    } catch (error) {
      setAskResponse("Desculpe, não consegui conectar ao chat agora.");
    } finally {
      setIsAskLoading(false);
    }
  };

  const handleReadAloud = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ttsConfig) return;
    
    if (isSpeaking()) {
      stopSpeech();
    } else {
      const teamIntro = activeTeamName ? `Pergunta para ${activeTeamName}. ` : "";
      let textToRead = `${teamIntro}${question.question}.`;
      
      if (isMultipleChoice) {
        textToRead += ` Alternativa A: ${question.options[0]}. Alternativa B: ${question.options[1]}. Alternativa C: ${question.options[2]}. Alternativa D: ${question.options[3]}.`;
      } else {
        textToRead += " Digite ou fale sua resposta.";
      }
      speakText(textToRead, ttsConfig);
    }
  };

  const getOptionStyle = (optIndex: number) => {
    const baseStyle = "group w-full p-3 md:p-4 rounded-lg text-left transition-all duration-200 text-sm md:text-base relative flex items-center";
    
    if (showAnswerKey) {
      if (optIndex === question.correctAnswerIndex) return `${baseStyle} bg-green-900/30 border border-green-700 text-green-300`;
      return `${baseStyle} bg-jw-card border border-transparent opacity-50`;
    }

    if (selectedOption !== null || isTimeUp) {
       if (optIndex === question.correctAnswerIndex) return `${baseStyle} bg-green-900/40 border border-green-600 text-green-200`;
       if (optIndex === selectedOption && selectedOption !== question.correctAnswerIndex) return `${baseStyle} bg-red-900/40 border border-red-800 text-red-200`;
       return `${baseStyle} bg-jw-card border border-transparent opacity-40`;
    }

    return `${baseStyle} bg-jw-card hover:bg-jw-hover text-jw-text border border-transparent hover:border-gray-500/50 ${isSkipping ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  const availableHintOptions = HINT_TYPE_OPTIONS.filter(opt => {
    if (opt.value === HintType.ASK_AI && !allowAskAi) return false;
    return true;
  });

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-full justify-center relative p-2 md:p-0">
      
      {/* Team Banner */}
      {activeTeamName && !showAnswerKey && (
        <div className="mb-4 inline-block self-start bg-jw-blue/10 border border-jw-blue text-jw-blue px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-fade-in">
          Vez de: {activeTeamName}
        </div>
      )}

      {/* Question Header */}
      <div className="mb-6 flex items-start gap-4 group/header">
        <span className="font-mono mt-1 text-sm opacity-50">{index + 1}.</span>
        <div className="flex-1">
          <h3 className="text-lg md:text-2xl font-medium text-jw-text leading-relaxed">
            {question.question}
          </h3>
          {/* Show reference immediately if answering is done, not just on answer key */}
          {isAnsweredOrFinished && (
              <span className="block mt-2 text-sm opacity-50 italic">Ref: {question.reference}</span>
          )}
          {showAnswerKey && !isMultipleChoice && (
             <div className="mt-2 text-sm text-green-300 bg-green-900/20 p-2 rounded">
                <strong>Gabarito:</strong> {question.correctAnswerText}
             </div>
          )}
        </div>
        
        {/* TTS Button */}
        {ttsConfig?.enabled && (
           <button 
             onClick={handleReadAloud}
             className="opacity-50 hover:opacity-100 p-2 rounded-full hover:bg-jw-hover transition-all shrink-0"
             title="Ler em voz alta"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
             </svg>
           </button>
        )}
      </div>

      {/* CONTENT AREA: Options OR Text Input */}
      <div className="pl-0 md:pl-8 min-h-[150px]">
        {isMultipleChoice ? (
          /* Multiple Choice / True False */
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                onMouseEnter={() => !selectedOption && !isTimeUp && !isSkipping && playSound('hover')}
                className={getOptionStyle(idx)}
                disabled={showAnswerKey || selectedOption !== null || isTimeUp || isSkipping}
              >
                <span className={`w-8 h-8 rounded-md flex items-center justify-center text-sm mr-3 md:mr-4 shrink-0 transition-colors ${
                  (selectedOption === idx || (showAnswerKey && idx === question.correctAnswerIndex))
                    ? 'bg-jw-text text-jw-dark' 
                    : 'bg-gray-700/50 group-hover:bg-jw-text group-hover:text-jw-dark'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </button>
            ))}
          </div>
        ) : (
          /* Free Response Area */
          <div className="space-y-4 animate-fade-in">
             {!evaluationResult && !showAnswerKey ? (
               <>
                 <div className="relative">
                   <textarea 
                     value={textAnswer}
                     onChange={(e) => setTextAnswer(e.target.value)}
                     placeholder="Digite sua resposta aqui..."
                     className="w-full h-32 md:h-40 bg-jw-hover border border-gray-600 rounded-lg p-4 text-sm md:text-base focus:ring-2 focus:ring-jw-blue outline-none resize-none"
                     disabled={isEvaluating || isTimeUp || isSkipping}
                   />
                   
                   {/* Microphone Button */}
                   <button 
                     onClick={toggleRecording}
                     className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-jw-card text-gray-400 hover:text-jw-blue'}`}
                     title="Falar resposta"
                     disabled={isEvaluating || isTimeUp || isSkipping}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill={isRecording ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                     </svg>
                   </button>
                 </div>
                 
                 <div className="flex justify-end">
                    <button 
                       onClick={handleSubmitFreeResponse}
                       disabled={!textAnswer.trim() || isEvaluating || isTimeUp || isSkipping}
                       className="px-6 py-2 bg-jw-blue text-white rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                       {isEvaluating ? (
                         <>
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Avaliando...
                         </>
                       ) : 'Enviar Resposta'}
                    </button>
                 </div>
               </>
             ) : (
               /* Result View for Open Ended */
               <div className="bg-jw-card p-4 md:p-6 rounded-lg border border-gray-700">
                  <div className="text-sm opacity-60 mb-2">Sua resposta:</div>
                  <div className="mb-4 italic">"{textAnswer || (forceSelectedOption as any)}"</div>
                  
                  {evaluationResult && (
                    <div className={`p-4 rounded border ${evaluationResult.score > 0.6 ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">{evaluationResult.score > 0.6 ? 'Correto' : 'Incorreto'}</span>
                        <span className="text-sm font-mono bg-black/30 px-2 py-1 rounded">Nota: {(evaluationResult.score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-sm">{evaluationResult.feedback}</p>
                    </div>
                  )}
                  
                  {showAnswerKey && (
                     <div className="mt-4 pt-4 border-t border-gray-700/50 text-sm">
                        <span className="font-bold text-jw-blue">Gabarito esperado:</span> {question.correctAnswerText}
                     </div>
                  )}
               </div>
             )}
          </div>
        )}
      </div>

      {/* RESULTS & EXPLANATION SECTION */}
      {isAnsweredOrFinished && !showAnswerKey && (
         <div className="pl-0 md:pl-8 mt-6 animate-fade-in space-y-4">
           {/* Status Message */}
           {isMultipleChoice && (
             <p className={`text-sm font-medium ${selectedOption === question.correctAnswerIndex ? 'text-green-400' : 'text-red-400'}`}>
               {isTimeUp && selectedOption === null ? 'Tempo Esgotado' : (selectedOption === question.correctAnswerIndex ? 'Resposta Correta' : 'Resposta Incorreta')}
             </p>
           )}

           {/* Explanation Box */}
           {question.explanation && (
              <div className="bg-jw-hover/50 p-4 rounded-lg border-l-4 border-jw-blue text-sm leading-relaxed text-jw-text opacity-90">
                 <strong className="block text-xs uppercase tracking-wider opacity-60 mb-1">Por que?</strong>
                 {question.explanation}
              </div>
           )}

           {/* Action Buttons for Result Phase */}
           <div className="flex gap-2">
             <button 
               onClick={() => { setShowAskAi(true); playSound('click'); }} 
               className="text-xs bg-jw-card hover:bg-jw-hover border border-gray-600 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-jw-blue"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
               Tirar Dúvida / Contestar no Chat
             </button>
           </div>
         </div>
      )}
      
      {/* Hints & Actions Section (Only valid BEFORE answering) */}
      {!isAnsweredOrFinished && (
        <div className="pl-0 md:pl-8 mt-6">
          
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            {/* Main Hint Toggle Button */}
            <button 
              onClick={handleToggleHintMenu}
              onMouseEnter={() => !isSkipping && playSound('hover')}
              disabled={(hintsRemaining === 0 && !activeHint && !showAskAi) || isSkipping || isEvaluating}
              className={`flex items-center text-sm py-2 px-4 rounded-full bg-jw-card border border-gray-700 hover:border-jw-blue transition-colors ${(hintsRemaining === 0 && !activeHint && !showAskAi) || isSkipping ? 'opacity-40 cursor-not-allowed' : 'opacity-80 hover:opacity-100 shadow-sm'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
              {showHintSelection ? 'Cancelar' : 'Ajuda'}
            </button>

            {/* Skip Question Button */}
            {onSkip && (
               <button
                 onClick={onSkip}
                 onMouseEnter={() => !isSkipping && playSound('hover')}
                 disabled={isSkipping || isEvaluating}
                 className={`flex items-center text-sm py-2 px-4 rounded-full bg-jw-card border border-red-900/50 hover:border-red-500 text-red-300 transition-colors ${isSkipping ? 'opacity-50 cursor-not-allowed' : 'opacity-80 hover:opacity-100 shadow-sm'}`}
                 title="Pular esta pergunta e receber uma mais difícil (não pontua)"
               >
                 {isSkipping ? (
                    <>
                      <div className="w-3 h-3 mr-2 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
                      Pulando...
                    </>
                 ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" /></svg>
                      Pular
                    </>
                 )}
               </button>
            )}

            {/* Hint Count */}
            {hintsRemaining !== -1 && (
               <span className="text-xs font-mono opacity-50 ml-auto md:ml-0">
                 Dicas: {hintsRemaining}
               </span>
            )}
          </div>

          {/* Hint Selection Menu */}
          {showHintSelection && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 animate-fade-in bg-jw-card p-4 rounded-xl border border-gray-700/50 shadow-xl z-20 absolute w-full left-0">
              <div className="col-span-full mb-2 text-xs uppercase tracking-wide opacity-50 font-bold">Escolha o tipo de ajuda:</div>
              
              {availableHintOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectHintType(opt.value)}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-jw-hover hover:bg-jw-blue hover:text-white transition-colors text-xs text-center border border-transparent hover:border-jw-blue"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mb-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                  </svg>
                  {opt.value === HintType.RANDOM ? 'Dica Original' : opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Loading Indicator for Hint */}
          {isHintLoading && (
             <div className="mt-4 flex items-center gap-2 text-sm opacity-70 animate-pulse">
                <div className="w-4 h-4 border-2 border-jw-blue border-t-transparent rounded-full animate-spin"></div>
                Gerando dica específica...
             </div>
          )}

          {/* Active Hint Display */}
          {activeHint && !isHintLoading && (
            <div className="w-full mt-4 text-sm text-blue-300 bg-blue-900/20 p-4 rounded-lg border border-blue-900/50 animate-fade-in relative">
              <button 
                onClick={() => setActiveHint(null)} 
                className="absolute top-2 right-2 opacity-50 hover:opacity-100 p-1"
                title="Fechar dica"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <span className="font-bold mr-1 block mb-1 text-blue-200">{activeHintTypeLabel || 'Dica'}:</span> 
              {activeHint}
            </div>
          )}
        </div>
      )}

      {/* Chat Interface (Always available if toggled) */}
      {showAskAi && (
        <div className="w-full mt-4 bg-jw-hover/50 p-4 rounded-lg border border-gray-700/50 animate-fade-in relative pl-0 md:pl-8">
            <button 
              onClick={() => { setShowAskAi(false); setAskResponse(null); }} 
              className="absolute top-2 right-2 opacity-50 hover:opacity-100 p-1"
              title="Fechar Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="font-bold text-sm mb-2 text-jw-blue flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              Chat com Instrutor Virtual
            </div>

            {!askResponse ? (
              <form onSubmit={handleSubmitAskAi} className="flex gap-2">
                <input 
                  type="text" 
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder={isAnsweredOrFinished ? "Ex: Por que a opção B está errada?" : "Ex: O que significa a palavra 'X'?"}
                  className="flex-1 bg-jw-card border border-gray-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-jw-blue outline-none placeholder-gray-500"
                  disabled={isAskLoading}
                />
                <button 
                  type="submit" 
                  disabled={isAskLoading || !askInput.trim()}
                  className="bg-jw-blue text-white px-4 py-2 rounded text-sm hover:bg-opacity-90 disabled:opacity-50"
                  onMouseEnter={() => playSound('hover')}
                >
                  {isAskLoading ? '...' : 'Enviar'}
                </button>
              </form>
            ) : (
              <div className="text-sm">
                <div className="mb-2 font-medium opacity-60">Sua pergunta: "{askInput}"</div>
                {/* High contrast container */}
                <div className="text-indigo-900 dark:text-indigo-100 bg-indigo-50 dark:bg-indigo-900/40 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700/50 shadow-inner leading-relaxed">
                  <span className="font-bold mr-1 text-indigo-700 dark:text-indigo-300">🤖 Resposta:</span> {askResponse}
                </div>
                <button 
                    onClick={() => { setAskResponse(null); setAskInput(''); }}
                    className="mt-2 text-xs opacity-50 hover:opacity-100 underline"
                >
                  Fazer outra pergunta
                </button>
              </div>
            )}
        </div>
      )}

      {/* Contest Button (Only on Answer Key view) */}
      {showAnswerKey && onContest && (
        <div className="mt-6 pl-0 md:pl-8 border-t border-gray-700/30 pt-4 flex justify-end">
          <button onClick={onContest} onMouseEnter={() => playSound('hover')} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors opacity-70 hover:opacity-100" title="Acha que esta pergunta está incorreta?">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            Contestar / Substituir
          </button>
        </div>
      )}
    </div>
  );
};