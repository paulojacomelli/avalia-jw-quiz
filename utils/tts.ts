import { generateSpeech } from '../services/geminiService';
import { playAudioData, stopCurrentAudio } from './audio';
import { TTSConfig } from '../types';

// State to track if we are currently speaking via Gemini Audio
let isSpeakingState = false;

// Fallback legacy Web Speech API for when API Key is missing (should rarely happen in this flow)
let synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

export const speakText = async (text: string, config: TTSConfig, apiKey?: string) => {
  // Stop any ongoing speech (both Gemini Audio and Browser TTS)
  stopSpeech();

  if (!text) return;

  // 1. Prefer Gemini TTS if API Key is available
  if (apiKey) {
      try {
          isSpeakingState = true;
          // Generate speech using Gemini
          const audioBase64 = await generateSpeech(apiKey, text, config);
          
          if (audioBase64) {
             // Play the audio with the requested rate (speed)
             // Default rate in app is 1.5 per request
             await playAudioData(audioBase64, config.rate);
          }
      } catch (error) {
          console.error("Gemini TTS Failed", error);
      } finally {
          // Note: playAudioData is async but fires and forgets the source.onended
          // Ideally we track the buffer source state in audio.ts, but for simple toggling this suffices.
          // We set this to false immediately after dispatching play, 
          // or we could track it via the audio context.
          // For now, let's assume 'speaking' is true while processing, 
          // but effective playback happens in audio.ts.
          isSpeakingState = false; 
      }
      return;
  }

  // 2. Fallback to Browser TTS (Legacy)
  if (synth) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = config.rate;
      utterance.volume = config.volume;
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
  // Note: audio.ts tracks `currentTtsSource` internally, 
  // but we don't expose it directly here. 
  // For UI toggles, stopping blindly is usually safer than checking state.
  return browserSpeaking || isSpeakingState; 
};
