import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useChatSTT() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<unknown>(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback((onResult?: (text: string) => void) => {
    if (!isSupported) return;

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: SpeechRecognitionEvent) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) {
        setTranscript('');
        onResult?.(final);
      } else {
        setTranscript(interim);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isSupported]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current as { stop: () => void } | null;
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setTranscript('');
  }, []);

  const toggle = useCallback((onResult?: (text: string) => void) => {
    if (isListening) {
      stop();
    } else {
      start(onResult);
    }
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current as { stop: () => void } | null;
      if (recognition) recognition.stop();
    };
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    start,
    stop,
    toggle,
  };
}
