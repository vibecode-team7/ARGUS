import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Skip to content */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Offset for fixed sidebar on desktop */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main
          id="main-content"
          role="main"
          className="flex-1 p-4 md:p-6"
          aria-live="polite"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
