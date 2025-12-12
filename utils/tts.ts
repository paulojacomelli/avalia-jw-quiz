// Text-to-Speech Utility using Web Speech API

export interface TTSOptions {
  gender: 'female' | 'male';
  rate: number;
  volume: number;
}

let synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices: SpeechSynthesisVoice[] = [];

// Load voices (async nature of browsers)
const loadVoices = () => {
  if (!synth) return;
  voices = synth.getVoices();
};

if (synth) {
  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
}

export const getAvailableVoices = () => {
  if (voices.length === 0 && synth) loadVoices();
  return voices.filter(v => v.lang.startsWith('pt'));
};

const findBestVoice = (gender: 'female' | 'male'): SpeechSynthesisVoice | null => {
  if (voices.length === 0 && synth) loadVoices();
  const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
  
  if (ptVoices.length === 0) return null;

  // Heuristic for gender based on name (common in browser voices)
  if (gender === 'male') {
    const male = ptVoices.find(v => v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('male'));
    return male || ptVoices[0];
  } else {
    const female = ptVoices.find(v => v.name.toLowerCase().includes('maria') || v.name.toLowerCase().includes('luciana') || v.name.toLowerCase().includes('female') || v.name.includes('Google'));
    return female || ptVoices[0];
  }
};

export const speakText = (text: string, options: TTSOptions) => {
  if (!synth) return;
  
  // Cancel current speech
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = findBestVoice(options.gender);
  
  if (voice) utterance.voice = voice;
  utterance.lang = 'pt-BR';
  utterance.rate = options.rate;
  utterance.volume = options.volume;
  utterance.pitch = 1; // Default pitch

  synth.speak(utterance);
};

export const stopSpeech = () => {
  if (synth) synth.cancel();
};

export const isSpeaking = () => {
  return synth ? synth.speaking : false;
};