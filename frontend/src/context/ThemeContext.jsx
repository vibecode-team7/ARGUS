import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(undefined);

const STORAGE_KEY = "argus-theme";

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    /* localStorage unavailable */
  }
  return "light";
}

/**
 * Apply the .dark class on <html> without triggering layout transitions
 * by temporarily disabling them via a utility class.
 */
function applyTheme(isDark) {
  const html = document.documentElement;
  html.classList.add("disable-transitions");
  html.classList.toggle("dark", isDark);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.classList.remove("disable-transitions");
    });
  });
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getStoredTheme);

  // Apply .dark class on <html>
  useEffect(() => {
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
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
