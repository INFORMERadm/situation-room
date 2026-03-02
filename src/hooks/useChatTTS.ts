import { useState, useCallback, useRef } from 'react';

export function useChatTTS() {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, messageId: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (speakingMessageId === messageId) {
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
  }, []);

  return {
    speakingMessageId,
    speak,
    stop,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}
