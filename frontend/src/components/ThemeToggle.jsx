import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const MODES = [
  { key: "system", Icon: Monitor, label: "System theme" },
  { key: "light", Icon: Sun, label: "Light theme" },
  { key: "dark", Icon: Moon, label: "Dark theme" },
];

export default function ThemeToggle() {
  const { mode, cycleTheme } = useTheme();
  const current = MODES.find((m) => m.key === mode) ?? MODES[0];

  return (
    <button
      onClick={cycleTheme}
      aria-label={current.label}
      title={current.label}
      className="flex items-center justify-center w-9 h-9 rounded-lg
        bg-bg-secondary border border-border
        text-text-secondary hover:text-text-primary hover:border-border-hover
        transition-colors cursor-pointer"
    >
      <current.Icon size={18} />
    </button>
  );
}
