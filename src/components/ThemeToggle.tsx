"use client";

import { useEffect, useState } from "react";

/** Bascule thème sombre / clair (mémorisé dans un cookie, appliqué sur <html data-theme>). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);
  useEffect(() => { setLight(document.documentElement.dataset.theme === "light"); }, []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
    document.cookie = `va_theme=${next ? "light" : "dark"}; path=/; max-age=31536000; samesite=lax`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#f2f2f7" : "#050505");
  };
  return (
    <button type="button" onClick={toggle} aria-label={light ? "Passer en thème sombre" : "Passer en thème clair"} title={light ? "Thème sombre" : "Thème clair"}
      className={`grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:text-fog ${className}`}>
      {light ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      )}
    </button>
  );
}
