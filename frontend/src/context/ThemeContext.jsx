import { createContext, useContext, useState, useEffect, useCallback } from "react";

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

/**
 * Apply the .dark class on <html> without triggering layout transitions
 * by temporarily disabling them via a utility class.
 */
function applyTheme(isDark) {
  const html = document.documentElement;
  // Disable transitions during theme switch to prevent jank
  html.classList.add("disable-transitions");
  html.classList.toggle("dark", isDark);
  // Re-enable transitions on the next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.classList.remove("disable-transitions");
    });
  });
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getStoredTheme);
  const [resolved, setResolved] = useState(() =>
    mode === "system" ? resolveSystemTheme() : mode
  );

  // Apply .dark class on <html> and resolve system mode
  useEffect(() => {
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => {
        const next = e.matches ? "dark" : "light";
        setResolved(next);
        applyTheme(next === "dark");
      };
      // Apply current system preference
      const current = mq.matches ? "dark" : "light";
      setResolved(current);
      applyTheme(current === "dark");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    setResolved(mode);
    applyTheme(mode === "dark");
  }, [mode]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const cycleTheme = useCallback(() => {
    setMode((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  }, []);

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
