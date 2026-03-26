let audioCtx: AudioContext | null = null;
let userHasInteracted = false;

function ensureInteractionListener() {
  if (userHasInteracted) return;
  const handler = () => {
    userHasInteracted = true;
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler, { once: false });
  document.addEventListener('keydown', handler, { once: false });
}

ensureInteractionListener();

function getAudioContext(): AudioContext | null {
  if (!userHasInteracted) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playNewsAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = i === 0 ? 740 : 880;

    const start = now + i * 0.1;
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

    osc.start(start);
    osc.stop(start + 0.07);
  }
}

export function playStrikeAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  for (let rep = 0; rep < 3; rep++) {
    const baseTime = now + rep * 0.35;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, baseTime);
    osc.frequency.linearRampToValueAtTime(880, baseTime + 0.15);

    gain.gain.setValueAtTime(0.15, baseTime);
    gain.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.25);

    osc.start(baseTime);
    osc.stop(baseTime + 0.26);
  }
}

export function playChatNotification() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const freqs = [523, 659, 784];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = freq;

    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

    osc.start(start);
    osc.stop(start + 0.16);
  });
}

export function playAlertNotification() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  for (let rep = 0; rep < 2; rep++) {
    const baseTime = now + rep * 0.3;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'triangle';
    osc1.frequency.value = 988;
    gain1.gain.setValueAtTime(0.14, baseTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.2);
    osc1.start(baseTime);
    osc1.stop(baseTime + 0.21);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.value = 1319;
    gain2.gain.setValueAtTime(0.12, baseTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.25);
    osc2.start(baseTime + 0.1);
    osc2.stop(baseTime + 0.26);
  }
}
