"use client";

import { useEffect, useState } from "react";

export function DarkModeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      title="Toggle dark mode"
      className={`border border-[#34335c] bg-transparent rounded-lg px-2.5 py-1.5 text-sm ${className}`}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
