// Simple Web Audio API synthesizer for UI sounds
// Designed to be lightweight, pleasant, and professional

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;
let isSoundEnabled = true;

const getContext = () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const setGlobalSoundState = (enabled: boolean) => {
  isSoundEnabled = enabled;
};

// Removed Loading Drone (Continuous sounds can be problematic on mobile/browsers)
export const startLoadingDrone = () => { /* No-op */ };
export const stopLoadingDrone = () => { /* No-op */ };

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
        // Ascending major arpeggio (Success sound)
        {
            const notes = [523.25, 659.25, 783.99]; // C, E, G
            notes.forEach((freq, i) => {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + (i * 0.08));
                osc.connect(gain);
                gain.connect(context.destination);
                gain.gain.setValueAtTime(0, now + (i * 0.08));
                gain.gain.linearRampToValueAtTime(0.1, now + (i * 0.08) + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.4);
                osc.start(now + (i * 0.08));
                osc.stop(now + (i * 0.08) + 0.4);
            });
        }
        break;

      case 'wrong':
        // Soft low thud (Not a harsh buzzer)
        {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
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

// Woodblock sound for timer ticking
export const playTimerTick = (timeLeft: number, totalTime: number) => {
  if (!isSoundEnabled) return;

  try {
    const context = getContext();
    const now = context.currentTime;
    
    // Increase pitch slightly as time runs out
    const baseFreq = 800;
    const urgency = Math.max(0, (totalTime - timeLeft) / totalTime); // 0 to 1
    const frequency = baseFreq + (urgency * 200);

    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.connect(gain);
    gain.connect(context.destination);
    
    // Short snappy envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
    
    // Double tick for last 5 seconds
    if (timeLeft <= 5) {
        const osc2 = context.createOscillator();
        const gain2 = context.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(frequency, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(context.destination);
        gain2.gain.setValueAtTime(0, now + 0.5);
        gain2.gain.linearRampToValueAtTime(0.1, now + 0.505);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.start(now + 0.5);
        osc2.stop(now + 0.55);
    }

  } catch (e) {
    console.warn("Timer audio failed", e);
  }
};