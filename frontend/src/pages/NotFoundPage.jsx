import { Link } from "react-router";
import { ShieldOff, ArrowLeft } from "lucide-react";
import SeoHead from "../components/SeoHead";

export default function NotFoundPage() {
  return (
    <>
      <SeoHead title="Page Not Found" noIndex />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-bg-secondary mb-6">
          <ShieldOff size={40} className="text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">404 — Page Not Found</h1>
        <p className="text-text-secondary mb-6 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-accent text-white font-medium text-sm
            hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    </>
  );
}
