import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error';
export type ToastFunction = (message: string, type?: ToastType) => void;

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');

  const showToast = useCallback((msg: string, toastType: ToastType = 'success') => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    message,
    type,
    showToast,
    hideToast,
  };
}
