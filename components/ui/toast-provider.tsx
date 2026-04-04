"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Toast from "./toast";

export type ToastType = "success" | "error";

type ToastPayload = { message: string; type: ToastType; id: number };

type ToastContextValue = {
  showToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [exiting, setExiting] = useState(false);

  const showToast = useCallback((message: string, type: ToastType) => {
    setExiting(false);
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);
    const exitTimer = window.setTimeout(() => setExiting(true), 3000);
    const removeTimer = window.setTimeout(() => {
      setToast(null);
      setExiting(false);
    }, 3300);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? <Toast message={toast.message} type={toast.type} exiting={exiting} /> : null}
    </ToastContext.Provider>
  );
}
