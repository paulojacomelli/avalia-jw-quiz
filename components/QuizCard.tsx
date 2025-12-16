import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Modality, LiveServerMessage } from "@google/genai";
import { QuizQuestion, TTSConfig, HintType, QuizFormat, EvaluationResult } from '../types';
import { playSound, startLoadingDrone, stopLoadingDrone, getAudioContext, base64ToFloat32Array, float32ToBase64 } from '../utils/audio';
import { speakText, stopSpeech, isSpeaking } from '../utils/tts';
import { askAiAboutQuestion, evaluateFreeResponse } from '../services/geminiService';

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  showAnswerKey?: boolean;
  timeLeft?: number;
  onAnswer?: (result: { score: number, isCorrect: boolean, selectedIndex?: number | null, textAnswer?: string }) => void;
  forceSelectedOption?: number | null;
  isTimeUp?: boolean;
  hintsRemaining?: number; 
  onRevealHint?: () => void;
  activeTeamName?: string;
  ttsConfig?: TTSConfig;
  allowAskAi?: boolean;
  allowStandardHint?: boolean;
  onSkip?: () => void;
  isSkipping?: boolean;
  onVoid?: () => void;
  isVoided?: boolean;
  apiKey?: string | null;
}

type InputMethod = 'TEXT' | 'LIVE_VOICE';

export const QuizCard: React.FC<QuizCardProps> = ({ 
  question, 
  index, 
  total, 
  showAnswerKey = false,
  timeLeft,
  onAnswer,
  forceSelectedOption = null,
  isTimeUp = false,
  hintsRemaining = -1,
  onRevealHint,
  activeTeamName,
  ttsConfig,
  allowAskAi = false,
  allowStandardHint = true,
  onSkip,
  isSkipping = false,
  onVoid,
  isVoided = false,
  apiKey
}) => {
  // State for MC/TF
  const [internalSelectedOption, setInternalSelectedOption] = useState<number | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  
  // State for Open Ended - Input Method Toggle
  const [inputMethod, setInputMethod] = useState<InputMethod>('TEXT');

  // State for Open Ended - Text/Dictation
  const [textAnswer, setTextAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const recognitionRef = useRef<any>(null); // For SpeechRecognition

  // State for Open Ended - Live Voice
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING'>('IDLE');
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Hint State
  const [showHintOptions, setShowHintOptions] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // Ask AI State (Chat)
  const [showAskAi, setShowAskAi] = useState(false);
  const [askInput, setAskInput] = useState('');
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAskLoading, setIsAskLoading] = useState(false);

  // If forceSelectedOption is provided (Review Mode), use it. Otherwise use internal state.
  const selectedOption = forceSelectedOption !== null ? forceSelectedOption : internalSelectedOption;
  const isMultipleChoice = question.options && question.options.length > 0;
  
  // Determines if we are in "Review/Result" state for this card
  // Fix: Ensure this is strictly boolean by checking !!evaluationResult
  const isAnsweredOrFinished = hasConfirmed || isTimeUp || showAnswerKey || !!evaluationResult || forceSelectedOption !== null;

  useEffect(() => {
    // Reset all state on new question
    setInternalSelectedOption(null);
    setHasConfirmed(false);
    setShowHintOptions(false);
    setActiveHint(null);
    setShowAskAi(false);
    setAskInput('');
    setAskResponse(null);
    setTextAnswer('');
    setEvaluationResult(null);
    setIsEvaluating(false);
    setIsRecording(false);
    setInputMethod('TEXT');
    disconnectLiveSession();
  }, [question.id]);

  // Cleanup Live Session on unmount
  useEffect(() => {
    return () => disconnectLiveSession();
  }, []);

  // Loading Sound Effect Link
  useEffect(() => {
    if (isAskLoading || isEvaluating || isSkipping || isLiveConnecting) {
      startLoadingDrone();
    } else {
      stopLoadingDrone();
    }
  }, [isAskLoading, isEvaluating, isSkipping, isLiveConnecting]);

  // Auto-submit on Time Up
  useEffect(() => {
    if (isTimeUp && !hasConfirmed && !showAnswerKey) {
        disconnectLiveSession();
        handleConfirm();
    }
  }, [isTimeUp, hasConfirmed, showAnswerKey]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement).tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
      if (isAnsweredOrFinished || isSkipping) return;

      const key = e.key.toLowerCase();
      
      // Confirm with Enter OR Space
      if ((key === 'enter' || key === ' ') && internalSelectedOption !== null && !hasConfirmed && isMultipleChoice) {
          e.preventDefault(); // Prevent scrolling for space and default clicks for enter
          handleConfirm();
          return;
      }

      if (!isMultipleChoice) return;

      const mapping: Record<string, number> = {
        '1': 0, 'a': 0,
        '2': 1, 'b': 1,
        '3': 2, 'c': 2,
        '4': 3, 'd': 3
      };

      if (mapping[key] !== undefined && mapping[key] < question.options.length) {
        handleSelect(mapping[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswerKey, internalSelectedOption, hasConfirmed, isAnsweredOrFinished, isSkipping, isMultipleChoice, question.options.length]);

  const handleSelect = (idx: number) => {
    if (isAnsweredOrFinished || isSkipping) return; 
    playSound('click');
    setInternalSelectedOption(idx);
  };

  const handleConfirm = () => {
    if (internalSelectedOption === null && !isTimeUp) return;
    if (hasConfirmed) return; 

    setHasConfirmed(true);
    const idx = internalSelectedOption;
    const isCorrect = idx !== null && idx === question.correctAnswerIndex;
    if (onAnswer) onAnswer({ score: isCorrect ? 1 : 0, isCorrect, selectedIndex: idx });
  };

  // --- TRADITIONAL OPEN ENDED (TEXT/DICTATION) ---

  const handleSubmitFreeResponse = async () => {
    if (!textAnswer.trim() || isEvaluating || isSkipping || evaluationResult || !apiKey) return;
    setIsEvaluating(true);
    playSound('click');
    try {
      const result = await evaluateFreeResponse(apiKey, question.question, question.correctAnswerText || '', textAnswer);
      setEvaluationResult(result);
      if (onAnswer) onAnswer({ score: result.score, isCorrect: result.isCorrect, textAnswer: textAnswer });
    } catch (e) {
      alert("Erro ao avaliar resposta. Tente novamente.");
    } finally {
      setIsEvaluating(false);
    }
  };

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

  // --- LIVE CONVERSATION LOGIC ---

  const disconnectLiveSession = () => {
    if (liveSessionRef.current) {
        // Just let it close or ignore, API doesn't have strict 'close' on session obj yet in some versions,
        // but we can stop sending audio.
        liveSessionRef.current = null;
    }
    setIsLiveConnected(false);
    setIsLiveConnecting(false);
    setLiveStatus('IDLE');
    
    // Stop audio sources
    if (sourcesRef.current) {
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
    }
    nextStartTimeRef.current = 0;
  };

  const startLiveConversation = async () => {
    if (!apiKey) return;
    
    // Stop any TTS
    stopSpeech();
    
    setIsLiveConnecting(true);
    setLiveStatus('CONNECTING');
    playSound('click');

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Define tool for model to submit result
        const submitResultTool: FunctionDeclaration = {
            name: "submit_quiz_result",
            description: "Chame esta função APENAS quando o usuário der uma resposta definitiva e você a tiver avaliado. Isso encerrará o quiz.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER, description: "Nota de 0.0 a 1.0 (ex: 1.0 para correto, 0.0 para errado)" },
                    feedback: { type: Type.STRING, description: "Feedback curto para o usuário." }
                },
                required: ["score", "feedback"]
            }
        };

        const ctx = getAudioContext();
        audioContextRef.current = ctx;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: `
                    Você é um apresentador de Quiz Bíblico (JW). 
                    Pergunta Atual: "${question.question}".
                    Resposta Esperada: "${question.correctAnswerText}".
                    Explicação: "${question.explanation}".
                    
                    Seu objetivo: Interagir verbalmente com o usuário. 
                    1. Peça a resposta dele.
                    2. Se ele acertar ou errar, discuta brevemente.
                    3. Se ele acertar ou errar definitivamente, CHAME a função 'submit_quiz_result'.
                    4. Seja simpático, breve e encorajador.
                `,
                tools: [{ functionDeclarations: [submitResultTool] }]
            },
            callbacks: {
                onopen: () => {
                    console.log("Live Session Connected");
                    setIsLiveConnecting(false);
                    setIsLiveConnected(true);
                    setLiveStatus('LISTENING');

                    // Input Audio Processing
                    const source = ctx.createMediaStreamSource(stream);
                    const processor = ctx.createScriptProcessor(4096, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Simple downsampling not strictly needed if context is handled, but let's convert float32 to base64 PCM
                        const base64Data = float32ToBase64(inputData);
                        
                        sessionPromise.then(session => {
                            if (liveSessionRef.current !== session) return; // Stale session check
                            session.sendRealtimeInput({
                                mimeType: "audio/pcm;rate=" + ctx.sampleRate, // Send context rate
                                data: base64Data
                            });
                        });
                    };

                    source.connect(processor);
                    processor.connect(ctx.destination);
                },
                onmessage: (msg: LiveServerMessage) => {
                    // 1. Handle Tool Calls (Submission)
                    if (msg.toolCall) {
                        for (const call of msg.toolCall.functionCalls) {
                            if (call.name === 'submit_quiz_result') {
                                const args = call.args as any;
                                const result: EvaluationResult = {
                                    score: args.score,
                                    feedback: args.feedback,
                                    isCorrect: args.score > 0.6
                                };
                                
                                // Send simplistic response to model to close loop (though we are ending)
                                sessionPromise.then(session => {
                                    session.sendToolResponse({
                                        functionResponses: {
                                            name: call.name,
                                            id: call.id,
                                            response: { result: "ok" }
                                        }
                                    });
                                });

                                // Finalize in App
                                setEvaluationResult(result);
                                if (onAnswer) onAnswer({ 
                                    score: result.score, 
                                    isCorrect: result.isCorrect, 
                                    textAnswer: "(Respondido via Conversa ao Vivo)" 
                                });
                                disconnectLiveSession();
                            }
                        }
                    }

                    // 2. Handle Audio Output
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                         setLiveStatus('SPEAKING');
                         const ctx = audioContextRef.current;
                         const float32 = base64ToFloat32Array(audioData);
                         
                         // Create Buffer (Assuming 24kHz return from Gemini usually, but let's map)
                         const buffer = ctx.createBuffer(1, float32.length, 24000); 
                         buffer.getChannelData(0).set(float32);
                         
                         const source = ctx.createBufferSource();
                         source.buffer = buffer;
                         source.connect(ctx.destination);
                         
                         // Queueing logic
                         const currentTime = ctx.currentTime;
                         if (nextStartTimeRef.current < currentTime) {
                             nextStartTimeRef.current = currentTime;
                         }
                         source.start(nextStartTimeRef.current);
                         nextStartTimeRef.current += buffer.duration;
                         
                         sourcesRef.current.add(source);
                         source.onended = () => {
                             sourcesRef.current.delete(source);
                             if (sourcesRef.current.size === 0) {
                                 setLiveStatus('LISTENING');
                             }
                         };
                    }
                },
                onclose: () => {
                    console.log("Live Session Closed");
                    setIsLiveConnected(false);
                    setLiveStatus('IDLE');
                },
                onerror: (err) => {
                    console.error("Live Session Error", err);
                    alert("Erro na conexão ao vivo. Tente novamente.");
                    disconnectLiveSession();
                }
            }
        });
        
        // Store session reference to control flow
        sessionPromise.then(s => {
            liveSessionRef.current = s;
        });

    } catch (e) {
        console.error(e);
        setIsLiveConnecting(false);
        setLiveStatus('IDLE');
    }
  };

  // --- Hint Handling ---
  
  const handleMainHelpClick = () => {
    if (hintsRemaining === 0 && !activeHint && !showAskAi) return;

    if (allowStandardHint && allowAskAi) {
      setShowHintOptions(!showHintOptions);
      playSound('click');
    } else if (allowStandardHint) {
       activateStandardHint();
    } else if (allowAskAi) {
       activateChat();
    }
  };

  const activateStandardHint = () => {
    if (hintsRemaining === 0 && !activeHint) return;
    playSound('click');
    setActiveHint(question.hint);
    setShowHintOptions(false);
    setShowAskAi(false);
    if (onRevealHint) onRevealHint();
  };

  const activateChat = () => {
    if (hintsRemaining === 0 && !showAskAi) return;
    playSound('click');
    setShowAskAi(true);
    setActiveHint(null);
    setShowHintOptions(false);
    if (onRevealHint) onRevealHint();
  };

  const handleSubmitAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim() || !apiKey) return;
    setIsAskLoading(true);
    playSound('click');
    try {
      const response = await askAiAboutQuestion(apiKey, question, askInput);
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
      // Pass apiKey for Gemini TTS support
      speakText(textToRead, ttsConfig, apiKey || undefined);
    }
  };

  const getOptionStyle = (optIndex: number) => {
    const baseStyle = "group w-full p-3 md:p-4 rounded-lg text-left transition-all duration-200 text-sm md:text-base relative flex items-center";
    
    // 1. Review Mode (Show Answer Key)
    if (showAnswerKey) {
      // Highlight the correct answer GREEN
      if (optIndex === question.correctAnswerIndex) {
        return `${baseStyle} bg-green-900/30 border border-green-700 text-green-300`;
      }
      // Highlight the WRONG selection RED (Using selectedOption which gets forceSelectedOption)
      if (optIndex === selectedOption && selectedOption !== question.correctAnswerIndex) {
        return `${baseStyle} bg-red-900/30 border border-red-700 text-red-300`; 
      }
      // Fade out others
      return `${baseStyle} bg-jw-card border border-transparent opacity-50`;
    }

    // 2. Answering Phase (Confirmed or Time Up)
    if (hasConfirmed || isTimeUp) {
       if (optIndex === question.correctAnswerIndex) return `${baseStyle} bg-green-900/40 border border-green-600 text-green-200`;
       if (optIndex === selectedOption && selectedOption !== question.correctAnswerIndex) return `${baseStyle} bg-red-900/40 border border-red-800 text-red-200`;
       return `${baseStyle} bg-jw-card border border-transparent opacity-40`;
    }

    // 3. Selection Made (Before Confirm)
    if (internalSelectedOption === optIndex) {
        return `${baseStyle} bg-jw-blue text-white shadow-md transform scale-[1.01] border border-transparent`;
    }

    return `${baseStyle} bg-jw-card hover:bg-jw-hover text-jw-text border border-transparent hover:border-gray-500/50 ${isSkipping ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-full justify-center relative p-2 md:p-0">
      
      {/* Voided Overlay */}
      {isVoided && (
         <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl animate-fade-in pointer-events-none">
            <div className="bg-red-600/90 text-white px-8 py-4 rounded-lg shadow-2xl border border-red-400 transform -rotate-2">
               <h2 className="text-2xl font-black uppercase tracking-widest border-2 border-white p-2">Questão Anulada</h2>
               <p className="text-center text-sm font-medium mt-1">Ponto Atribuído</p>
            </div>
         </div>
      )}

      {/* Team Banner */}
      {activeTeamName && !showAnswerKey && (
        <div className="mb-4 inline-block self-start bg-jw-blue text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-fade-in shadow-sm">
          Vez de: {activeTeamName}
        </div>
      )}

      {/* Question Header */}
      <div className="mb-6 flex items-start gap-4 group/header relative z-10">
        <span className="font-mono mt-1 text-sm opacity-50">{index + 1}.</span>
        <div className="flex-1">
          <h3 className="text-lg md:text-2xl font-medium text-jw-text leading-relaxed">
            {question.question}
          </h3>
          {isAnsweredOrFinished && (
              <span className="block mt-2 text-sm opacity-50 italic animate-fade-in">Ref: {question.reference}</span>
          )}
          {showAnswerKey && !isMultipleChoice && (
             <div className="mt-2 text-sm text-green-300 bg-green-900/20 p-2 rounded">
                <strong>Gabarito:</strong> {question.correctAnswerText}
             </div>
          )}
        </div>
        
        {ttsConfig?.enabled && (
           <button 
             onClick={handleReadAloud}
             className="opacity-50 hover:opacity-100 p-2 rounded-full hover:bg-jw-hover transition-all shrink-0"
             title="Ler em voz alta"
           >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
           </button>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="pl-0 md:pl-8 min-h-[150px] relative z-10">
        {isMultipleChoice ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => !hasConfirmed && !isTimeUp && !isSkipping && internalSelectedOption !== idx && playSound('hover')}
                  className={getOptionStyle(idx)}
                  disabled={isAnsweredOrFinished || isSkipping || isVoided}
                >
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center text-sm mr-3 md:mr-4 shrink-0 transition-colors ${
                    (internalSelectedOption === idx || (showAnswerKey && idx === question.correctAnswerIndex))
                      ? 'bg-white text-jw-blue' 
                      : 'bg-gray-700/50 group-hover:bg-jw-text group-hover:text-jw-dark'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
            {!isAnsweredOrFinished && internalSelectedOption !== null && (
              <div className="flex justify-end animate-fade-in-up pt-2">
                 <button 
                   onClick={handleConfirm}
                   className="bg-jw-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-opacity-90 transition-transform active:scale-95 flex items-center gap-2"
                   onMouseEnter={() => playSound('hover')}
                 >
                   Confirmar Resposta
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                 </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
             {!evaluationResult && !showAnswerKey ? (
               <>
                 {/* Input Method Toggles */}
                 <div className="flex gap-4 mb-4 border-b border-gray-700/50 pb-2">
                    <button 
                      onClick={() => { setInputMethod('TEXT'); disconnectLiveSession(); }}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors ${inputMethod === 'TEXT' ? 'border-jw-blue text-jw-blue' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Texto / Ditado
                    </button>
                    <button 
                      onClick={() => setInputMethod('LIVE_VOICE')}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors ${inputMethod === 'LIVE_VOICE' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Conversa ao Vivo
                    </button>
                 </div>

                 {inputMethod === 'TEXT' ? (
                   <div className="relative animate-fade-in">
                     <textarea 
                       value={textAnswer}
                       onChange={(e) => setTextAnswer(e.target.value)}
                       placeholder="Digite sua resposta aqui..."
                       className="w-full h-32 md:h-40 bg-jw-hover border border-gray-600 rounded-lg p-4 text-sm md:text-base focus:ring-2 focus:ring-jw-blue outline-none resize-none"
                       disabled={isEvaluating || isTimeUp || isSkipping}
                     />
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
                 ) : (
                    <div className="relative animate-fade-in h-40 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-purple-500/30 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                        {!isLiveConnected ? (
                             <button 
                                onClick={startLiveConversation}
                                disabled={isLiveConnecting}
                                className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-all transform hover:scale-105"
                             >
                                {isLiveConnecting ? (
                                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                    </svg>
                                )}
                                <span className="absolute top-full mt-3 text-sm font-bold text-purple-300 w-32 whitespace-nowrap">
                                    {isLiveConnecting ? "Conectando..." : "Iniciar Conversa"}
                                </span>
                             </button>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${liveStatus === 'SPEAKING' ? 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.6)] scale-110' : 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.4)] animate-pulse'}`}>
                                    {liveStatus === 'SPEAKING' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white animate-bounce">
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-sm font-mono text-purple-200 animate-pulse">
                                    {liveStatus === 'SPEAKING' ? "IA Falando..." : "Ouvindo você..."}
                                </p>
                                <button 
                                    onClick={disconnectLiveSession} 
                                    className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                                >
                                    Encerrar Conexão
                                </button>
                            </div>
                        )}
                    </div>
                 )}

                 {inputMethod === 'TEXT' && (
                    <div className="flex justify-end mt-4">
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
                        ) : 'Confirmar e Enviar'}
                        </button>
                    </div>
                 )}
               </>
             ) : (
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

      {/* RESULTS SECTION */}
      {isAnsweredOrFinished && !showAnswerKey && (
         <div className="pl-0 md:pl-8 mt-6 animate-fade-in space-y-4 relative z-10">
           {isMultipleChoice && (
             <p className={`text-sm font-medium ${selectedOption === question.correctAnswerIndex ? 'text-green-400' : 'text-red-400'}`}>
               {isTimeUp && selectedOption === null ? 'Tempo Esgotado' : (selectedOption === question.correctAnswerIndex ? 'Resposta Correta' : 'Resposta Incorreta')}
             </p>
           )}
           {question.explanation && (
              <div className="bg-jw-hover/50 p-4 rounded-lg border-l-4 border-jw-blue text-sm leading-relaxed text-jw-text opacity-90">
                 <strong className="block text-xs uppercase tracking-wider opacity-60 mb-1">Por que?</strong>
                 {question.explanation}
              </div>
           )}
           <div className="flex gap-2">
             <button 
               onClick={() => { setShowAskAi(true); playSound('click'); }} 
               className="text-xs bg-jw-card hover:bg-jw-hover border border-gray-600 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-jw-blue"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.322-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
               Tirar Dúvida
             </button>
           </div>
         </div>
      )}
      
      {/* ACTIONS & HINTS SECTION */}
      {!isAnsweredOrFinished && (
        <div className="pl-0 md:pl-8 mt-6 relative z-10">
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            
            {/* Help Button (Context Aware) */}
            {(allowStandardHint || allowAskAi) && (
               <div className="relative">
                  <button 
                    onClick={handleMainHelpClick}
                    onMouseEnter={() => !isSkipping && playSound('hover')}
                    disabled={(hintsRemaining === 0 && !activeHint && !showAskAi) || isSkipping || isEvaluating}
                    className={`flex items-center text-sm py-2 px-4 rounded-full bg-jw-card border border-gray-700 hover:border-jw-blue transition-colors ${(hintsRemaining === 0 && !activeHint && !showAskAi) || isSkipping || isLiveConnected ? 'opacity-40 cursor-not-allowed' : 'opacity-80 hover:opacity-100 shadow-sm'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                    {activeHint ? 'Esconder Dica' : (showAskAi ? 'Fechar Chat' : 'Ajuda')}
                  </button>

                  {/* Simple Hint Selection Menu (Only if both enabled) */}
                  {showHintOptions && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-jw-card border border-gray-700 rounded-lg shadow-xl overflow-hidden z-20 animate-fade-in">
                       <button onClick={activateStandardHint} className="w-full text-left px-4 py-3 hover:bg-jw-hover text-sm border-b border-gray-700/50 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                          Dica Padrão
                       </button>
                       <button onClick={activateChat} className="w-full text-left px-4 py-3 hover:bg-jw-hover text-sm flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                          Perguntar ao Chat
                       </button>
                    </div>
                  )}
               </div>
            )}

            {/* Skip Button */}
            {onSkip && (
               <button
                 onClick={onSkip}
                 onMouseEnter={() => !isSkipping && playSound('hover')}
                 disabled={isSkipping || isEvaluating || isLiveConnected}
                 className={`flex items-center text-sm py-2 px-4 rounded-full bg-jw-card border border-red-900/50 hover:border-red-500 text-red-300 transition-colors ${isSkipping || isLiveConnected ? 'opacity-50 cursor-not-allowed' : 'opacity-80 hover:opacity-100 shadow-sm'}`}
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

            {hintsRemaining !== -1 && (
               <span className="text-xs font-mono opacity-50 ml-auto md:ml-0">
                 Dicas: {hintsRemaining}
               </span>
            )}
          </div>

          {/* Active Hint Display */}
          {activeHint && (
            <div className="w-full mt-4 text-sm text-blue-300 bg-blue-900/20 p-4 rounded-lg border border-blue-900/50 animate-fade-in relative">
              <button 
                onClick={() => setActiveHint(null)} 
                className="absolute top-2 right-2 opacity-50 hover:opacity-100 p-1"
                title="Fechar dica"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <span className="font-bold mr-1 block mb-1 text-blue-200">Dica:</span> 
              {activeHint}
            </div>
          )}
        </div>
      )}

      {/* Chat Interface (Standard Ask AI) */}
      {showAskAi && (
        <div className="w-full mt-4 bg-jw-hover/50 p-4 rounded-lg border border-gray-700/50 animate-fade-in relative pl-0 md:pl-8 z-10">
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

      {/* Review Mode Actions (Bottom) */}
      {showAnswerKey && onVoid && !isVoided && (
         <div className="mt-8 pt-4 border-t border-gray-700/30 flex justify-end relative z-20">
            <button 
               onClick={onVoid}
               className="text-jw-blue hover:text-white hover:bg-jw-blue border border-jw-blue text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full transition-all"
               title="Gerar uma nova pergunta para tentar responder novamente"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
               </svg>
               Contestar / Substituir
            </button>
         </div>
      )}
    </div>
  );
};