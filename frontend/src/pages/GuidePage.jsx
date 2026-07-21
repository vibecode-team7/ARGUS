import { useState, useMemo } from "react";
import { Shield, BookOpen } from "lucide-react";
import PublicHeader from "../components/layout/PublicHeader";
import GuideCard from "../components/GuideCard";
import SeoHead from "../components/SeoHead";
import guides from "../lib/guides";

const TAGS = ["all", "client", "admin"];

export default function GuidePage() {
  const [activeTag, setActiveTag] = useState("all");

  const filtered = useMemo(
    () =>
      activeTag === "all"
        ? guides
        : guides.filter((g) => g.tags.includes(activeTag)),
    [activeTag]
  );

  return (
    <>
      <SeoHead title="Guides" description="Deploy, configure, and use the ARGUS Shadow AI Scanner — for end users and administrators." />
      <div className="min-h-screen bg-bg-primary">
      <PublicHeader />

      {/* Hero */}
      <section className="px-4 pt-16 pb-10 text-center md:px-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mx-auto mb-4">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight sm:text-4xl">
          ARGUS Guides
        </h1>
        <p className="mt-3 text-text-secondary max-w-xl mx-auto">
          Everything you need to deploy, configure, and use the ARGUS Shadow AI
          Scanner — for both end users and administrators.
        </p>
      </section>

      {/* Tag filter */}
      <div className="flex items-center justify-center gap-2 px-4 pb-8 md:px-6">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors cursor-pointer ${
              activeTag === tag
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border"
            }`}
          >
            {tag === "all" ? "All Guides" : tag}
          </button>
        ))}
      </div>

      {/* Guide cards */}
      <div className="max-w-3xl mx-auto px-4 pb-16 md:px-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-text-muted">
            <BookOpen size={32} className="mb-3" />
            <p className="text-sm">No guides found for this tag.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
