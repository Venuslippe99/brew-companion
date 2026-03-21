import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, FlaskConical, Plus, BookOpen, MessageCircle } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/batches", icon: FlaskConical, label: "Batches" },
  { to: "/new-batch", icon: Plus, label: "New", isAction: true },
  { to: "/guides", icon: BookOpen, label: "Guides" },
  { to: "/assistant", icon: MessageCircle, label: "Assistant" },
];

function MobileNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border pb-safe lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          if (item.isAction) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 active:scale-95 transition-transform">
                  <item.icon className="h-5 w-5" />
                </div>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function DesktopSidebar() {
  const location = useLocation();
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-sidebar border-r border-sidebar-border z-40">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-semibold text-sidebar-foreground tracking-tight">
          Kombloom
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Kombucha Companion</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label === "New" ? "New Batch" : item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
        >
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="lg:pl-64 pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
