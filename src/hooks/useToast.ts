import { useState, useCallback, useRef } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'info' | 'success';
}

export function useToast(duration = 4000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const show = useCallback((message: string, type: Toast['type'] = 'error') => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, [duration]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
