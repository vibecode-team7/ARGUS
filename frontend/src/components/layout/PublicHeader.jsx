import { Link } from "react-router";
import { Shield, LogIn } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-bg-primary/80 backdrop-blur-sm border-b border-border md:px-6">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">ARGUS</h1>
          <p className="text-[10px] uppercase tracking-widest text-text-muted">
            Shadow AI Scanner
          </p>
        </div>
      </Link>

      <Link
        to="/login"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium
          hover:bg-accent-hover transition-colors"
      >
        <LogIn size={16} />
        Login
      </Link>
    </header>
  );
}
