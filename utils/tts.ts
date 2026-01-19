import { generateSpeech } from '../services/geminiService';
import { playAudioData, stopCurrentAudio } from './audio';
import { TTSConfig, QuizQuestion } from '../types';

// State to track if we are currently speaking via Gemini Audio
let isSpeakingState = false;

// Fallback legacy Web Speech API for when API Key is missing (should rarely happen in this flow)
let synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

// Helper to construct consistent text for reading
export const getQuestionReadAloudText = (question: QuizQuestion, activeTeamName?: string): string => {
  const teamIntro = activeTeamName ? `Pergunta para ${activeTeamName}. ` : "";
  let textToRead = `${teamIntro}${question.question}.`;
  
  if (question.options && question.options.length > 0) {
    // Check if it is True/False to read naturally
    if (question.options.length === 2 && question.options[0] === "Verdadeiro") {
        textToRead += " Verdadeiro ou Falso?";
    } else {
        textToRead += ` Alternativa A: ${question.options[0]}. Alternativa B: ${question.options[1]}.`;
        if (question.options.length > 2) textToRead += ` Alternativa C: ${question.options[2]}.`;
        if (question.options.length > 3) textToRead += ` Alternativa D: ${question.options[3]}.`;
    }
  } else {
    textToRead += " Digite ou fale sua resposta.";
  }
  return textToRead;
};

export const speakText = async (text: string, config: TTSConfig, apiKey?: string, preGeneratedAudio?: string) => {
  // Stop any ongoing speech (both Gemini Audio and Browser TTS)
  stopSpeech();

  if (!text && !preGeneratedAudio) return;

  // 0. Use Pre-generated Audio if available (Instant Playback)
  // Only use pre-generated audio if the engine is set to Gemini (Natural)
  if (config.engine === 'gemini' && preGeneratedAudio) {
      try {
          isSpeakingState = true;
          await playAudioData(preGeneratedAudio, config.rate);
      } catch (e) {
          console.error("Error playing pre-generated audio", e);
      } finally {
          isSpeakingState = false;
      }
      return;
  }

  // 1. Prefer Gemini TTS if API Key is available AND Engine is set to Gemini
  if (config.engine === 'gemini' && apiKey) {
      try {
          isSpeakingState = true;
          // Generate speech using Gemini
          const audioBase64 = await generateSpeech(apiKey, text, config);
          
          if (audioBase64) {
             // Play the audio with the requested rate (speed)
             await playAudioData(audioBase64, config.rate);
          }
      } catch (error) {
          console.error("Gemini TTS Failed", error);
      } finally {
          isSpeakingState = false; 
      }
      return;
  }

  // 2. Fallback to Browser TTS (Legacy) or if Engine is set to 'browser'
  if (synth) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = config.rate; // Browser rate handles speed but keeps pitch somewhat stable
      utterance.volume = config.volume;
      
      // Force Male voice (Daniel priority) for Classic Voice
      const voices = synth.getVoices();
      
      // Hierarchy for Male Voice Selection:
      // 1. "Daniel" (Common male voice on many platforms)
      // 2. Explicit "Male" tag
      // 3. Known male names (Felipe, Luciano)
      // 4. Fallback: Any PT-BR that isn't explicitly female
      const maleVoice = voices.find(v => 
          v.lang.includes('pt') && 
          (
             v.name.toLowerCase().includes('daniel') || 
             v.name.toLowerCase().includes('male') || 
             v.name.toLowerCase().includes('felipe') || 
             v.name.toLowerCase().includes('luciano')
          )
      ) || voices.find(v => v.lang.includes('pt') && !v.name.toLowerCase().includes('female'));
      
      if (maleVoice) {
          utterance.voice = maleVoice;
      }

      utterance.onend = () => { isSpeakingState = false; };
      isSpeakingState = true;
      synth.speak(utterance);
  }
};

export const stopSpeech = () => {
  // Stop Gemini Audio
  stopCurrentAudio();
  isSpeakingState = false;

  // Stop Browser TTS
  if (synth) {
      synth.cancel();
  }
};

export const isSpeaking = () => {
  // Check both systems
  const browserSpeaking = synth ? synth.speaking : false;
  return browserSpeaking || isSpeakingState; 
};