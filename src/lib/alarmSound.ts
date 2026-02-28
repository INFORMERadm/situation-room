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
