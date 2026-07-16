"use client";

import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
  width = "420px",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/55 z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.3)] p-6 max-w-full animate-pop-in"
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}
