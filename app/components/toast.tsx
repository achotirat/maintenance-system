"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Toast = { id: string; msg: string };

const ToastContext = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-7 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[80] w-max max-w-[92vw] md:bottom-7">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-[#0f172a] text-white rounded-xl px-[18px] py-3 text-[13.5px] font-medium shadow-[0_8px_24px_rgba(0,0,0,.3)] animate-toast-in"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
