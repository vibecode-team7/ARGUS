import { Cpu, Code, Plug } from "lucide-react";

const CATEGORY_CONFIG = {
  local_llm: {
    label: "Local LLM",
    Icon: Cpu,
  },
  ai_ide: {
    label: "AI IDE",
    Icon: Code,
  },
  mcp_server: {
    label: "MCP Server",
    Icon: Plug,
  },
};

/**
 * @param {string} category
 * @returns {string} Display label
 */
export function getCategoryLabel(category) {
  return CATEGORY_CONFIG[category]?.label ?? category;
}

/**
 * @param {string} category
 * @returns {import("lucide-react").LucideIcon} Lucide icon component
 */
export function getCategoryIcon(category) {
  return CATEGORY_CONFIG[category]?.Icon ?? Cpu;
}
