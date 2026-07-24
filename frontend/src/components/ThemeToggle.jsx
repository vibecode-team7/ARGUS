import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { mode, cycleTheme } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      onClick={cycleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex items-center justify-center w-9 h-9 rounded-lg
        bg-bg-secondary border border-border
        text-text-secondary hover:text-text-primary hover:border-border-hover
        transition-colors cursor-pointer"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
