
// Simple Web Audio API synthesizer for UI sounds
// Designed to be lightweight, pleasant, and professional

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;
let isSoundEnabled = true;

// Variable for loading beat interval
let loadingInterval: any = null;
// Variable for current TTS audio element to allow stopping
let currentTtsAudio: HTMLAudioElement | null = null;

const getContext = () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export const resumeAudioContext = () => {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(err => console.warn(err));
  } else if (!ctx) {
    getContext();
  }
};

export const getAudioContext = () => getContext();

export const setGlobalSoundState = (enabled: boolean) => {
  isSoundEnabled = enabled;
};

// --- WAV Helper ---
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // write the PCM samples
  const length = samples.length;
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

// --- LIVE API AUDIO UTILS ---

export function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert Int16 (PCM) to Float32
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

export function float32ToBase64(data: Float32Array): string {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values
    let s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to play standard base64 audio (WAV/MP3/PCM wrapped) with playback rate control
// Uses HTMLAudioElement to preserve pitch when changing speed
export const playAudioData = async (base64String: string, rate: number = 1.0) => {
  stopCurrentAudio();
  if (!base64String) return;
  
  try {
      // Decode base64 to bytes
      const binaryString = atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }

      let blob: Blob;

      // Check if it already has a RIFF header (WAV)
      if (len > 4 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF') {
          blob = new Blob([bytes], { type: 'audio/wav' });
      } else {
          // Assume Raw PCM 16-bit 24kHz (Gemini Standard)
          // Convert bytes to Float32Array
          const float32 = new Float32Array(bytes.length / 2);
          const dataView = new DataView(bytes.buffer);
          for (let i = 0; i < float32.length; i++) {
               // PCM is signed 16-bit, Little Endian
               const int16 = dataView.getInt16(i * 2, true);
               float32[i] = int16 / 32768.0;
          }
          // Wrap in WAV container
          blob = createWavBlob(float32, 24000);
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // Critical: HTMLAudioElement preserves pitch by default when changing playbackRate
      audio.playbackRate = rate; 
      // audio.preservesPitch = true; // Default is true, explicit setting not strictly needed but good for clarity if supported types allowed it
      
      currentTtsAudio = audio;
      
      await audio.play();
      
      audio.onended = () => {
          if (currentTtsAudio === audio) {
              currentTtsAudio = null;
          }
          URL.revokeObjectURL(url);
      };

  } catch (error) {
      console.error("Audio Playback Error:", error);
  }
}

export const stopCurrentAudio = () => {
    if (currentTtsAudio) {
        currentTtsAudio.pause();
        currentTtsAudio.currentTime = 0;
        currentTtsAudio = null;
    }
}

// Spaced beat sound for loading state (Batida espaçada)
export const startLoadingDrone = () => {
  if (!isSoundEnabled) return;
  
  // If already playing, do nothing
  if (loadingInterval) return;

  try {
    const context = getContext();
    
    const playBeat = () => {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      // Deep thud sound (Heartbeat style)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      // Short impactful envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.4);
      
      // Optional: Add a very faint high tick for texture
      const osc2 = context.createOscillator();
      const gain2 = context.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(2000, now);
      osc2.connect(gain2);
      gain2.connect(context.destination);
      gain2.gain.setValueAtTime(0.01, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc2.start(now);
      osc2.stop(now + 0.05);
    };

    // Play immediately then loop
    playBeat();
    loadingInterval = setInterval(playBeat, 1200); // 1.2 seconds spacing

  } catch (e) {
    console.warn("Loading sound failed", e);
  }
};

export const stopLoadingDrone = () => {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
};

export const playCountdownTick = (count: number) => {
  if (!isSoundEnabled) return;
  try {
    const context = getContext();
    const now = context.currentTime;
    
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    // Woodblock style sound
    osc.type = 'sine';
    // Higher pitch as count goes down
    osc.frequency.setValueAtTime(800 + ((4-count) * 200), now); 
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    // Short, percussive envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch(e) {}
};

export const playTimerTick = (currentTime: number, totalTime: number) => {
  if (!isSoundEnabled) return;
  try {
    const context = getContext();
    const now = context.currentTime;
    
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    // Tick sound - higher pitch/urgency when time is running out (less than 10s)
    const isUrgent = currentTime <= 10;
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isUrgent ? 1000 : 800, now);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    // Very short blip
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  } catch(e) {}
};

export const playGoSound = () => {
  if (!isSoundEnabled) return;
  try {
    const context = getContext();
    const now = context.currentTime;
    
    // Play a bright major chord
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C Major
    
    frequencies.forEach((freq, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.05 + (i * 0.02)); // Strum effect
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.8);
    });
  } catch(e) {}
};

export const playSound = (type: 'click' | 'correct' | 'wrong' | 'next' | 'timeUp' | 'hover') => {
  if (!isSoundEnabled) return;

  try {
    const context = getContext();
    const now = context.currentTime;

    switch (type) {
      case 'hover':
        // Very subtle high frequency tick
        {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
        }
        break;

      case 'click':
        // Crisp UI click
        {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        }
        break;

      case 'correct':
        // Victory Sound: Bright Major Chord Arpeggio (C-E-G-C)
        {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((freq, i) => {
                const osc = context.createOscillator();
                const gain = context.createGain();
                
                // Mix Sine and Triangle for body and chime
                osc.type = i % 2 === 0 ? 'sine' : 'triangle'; 
                osc.frequency.setValueAtTime(freq, now + (i * 0.05));
                
                osc.connect(gain);
                gain.connect(context.destination);
                
                // Envelope
                gain.gain.setValueAtTime(0, now + (i * 0.05));
                // Quick Attack
                gain.gain.linearRampToValueAtTime(0.1, now + (i * 0.05) + 0.05); 
                // Long Decay
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.05) + 0.8);
                
                osc.start(now + (i * 0.05));
                osc.stop(now + (i * 0.05) + 0.9);
            });
        }
        break;

      case 'wrong':
        // Failure Sound: Descending "Womp Womp" Style
        {
            // First tone (higher drop)
            const osc1 = context.createOscillator();
            const gain1 = context.createGain();
            osc1.type = 'sawtooth';
            // Low pass filter to remove harshness
            const filter1 = context.createBiquadFilter();
            filter1.type = 'lowpass';
            filter1.frequency.value = 800;
            
            osc1.frequency.setValueAtTime(400, now);
            osc1.frequency.linearRampToValueAtTime(200, now + 0.2);
            
            osc1.connect(filter1);
            filter1.connect(gain1);
            gain1.connect(context.destination);
            
            gain1.gain.setValueAtTime(0.1, now);
            gain1.gain.linearRampToValueAtTime(0, now + 0.2);
            
            osc1.start(now);
            osc1.stop(now + 0.25);

            // Second tone (lower drop, longer)
            const osc2 = context.createOscillator();
            const gain2 = context.createGain();
            osc2.type = 'sawtooth';
            const filter2 = context.createBiquadFilter();
            filter2.type = 'lowpass';
            filter2.frequency.value = 800;

            osc2.frequency.setValueAtTime(350, now + 0.25);
            osc2.frequency.linearRampToValueAtTime(100, now + 0.6);
            
            osc2.connect(filter2);
            filter2.connect(gain2);
            gain2.connect(context.destination);
            
            gain2.gain.setValueAtTime(0.1, now + 0.25);
            gain2.gain.linearRampToValueAtTime(0, now + 0.6);
            
            osc2.start(now + 0.25);
            osc2.stop(now + 0.65);
        }
        break;

      case 'next':
        // Slide up (whoosh)
        {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        break;

      case 'timeUp':
        // Descending tones
        {
            const notes = [440, 392, 349];
            notes.forEach((freq, i) => {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + (i * 0.15));
                gain.gain.setValueAtTime(0.1, now + (i * 0.15));
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.15) + 0.3);
                osc.start(now + (i * 0.15));
                osc.stop(now + (i * 0.15) + 0.3);
            });
        }
        break;
    }
  } catch (e) {
    console.warn("Audio play failed", e);
  }
};
