import { useState } from "react";
import { ChevronDown } from "lucide-react";

const TAG_STYLES = {
  client: "bg-severity-low/15 text-severity-low",
  admin: "bg-accent-light text-accent",
};

export default function GuideCard({ guide }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = guide.icon;

  return (
    <div
      className={`bg-bg-card border rounded-xl overflow-hidden transition-shadow ${
        expanded ? "border-accent shadow-md" : "border-border shadow-sm hover:shadow-md"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-5 text-left cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 shrink-0 mt-0.5">
          <Icon size={20} className="text-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-text-primary">{guide.title}</h3>
            {guide.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  TAG_STYLES[tag] ?? "bg-bg-secondary text-text-secondary"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-text-secondary">{guide.description}</p>
        </div>

        <ChevronDown
          size={18}
          className={`text-text-muted shrink-0 mt-1 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4 ml-14">
          {guide.content.map((section, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold text-text-primary mb-1">
                {section.heading}
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
