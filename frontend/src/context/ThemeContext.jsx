import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(undefined);

const STORAGE_KEY = "argus-theme";

/**
 * @returns {"system" | "light" | "dark"}
 */
function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* localStorage unavailable */
  }
  return "system";
}

/**
 * Resolve "system" to an actual "light" or "dark" based on OS preference.
 */
function resolveSystemTheme() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getStoredTheme);
  const [resolved, setResolved] = useState(() =>
    mode === "system" ? resolveSystemTheme() : mode
  );

  // Apply .dark class on <html> and resolve system mode
  useEffect(() => {
    const html = document.documentElement;

    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => {
        const next = e.matches ? "dark" : "light";
        setResolved(next);
        html.classList.toggle("dark", next === "dark");
      };
      handler(mq);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    setResolved(mode);
    html.classList.toggle("dark", mode === "dark");
  }, [mode]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const cycleTheme = () => {
    setMode((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
