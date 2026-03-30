import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast, ToastType } from './toast';

export interface ShowToastOptions {
  noTruncate?: boolean;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    options?: ShowToastOptions,
  ) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    duration: number;
    noTruncate?: boolean;
  } | null>(null);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      duration: number = 3000,
      options?: ShowToastOptions,
    ) => {
      setToast({
        message,
        type,
        duration,
        noTruncate: options?.noTruncate,
      });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          noTruncate={toast.noTruncate}
          onHide={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

