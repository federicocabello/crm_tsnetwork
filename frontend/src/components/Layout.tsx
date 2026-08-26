import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../context/ThemeContext";
import WorldClock from "./WorldClock";
import { Sun, Moon, LogOut } from "lucide-react";

function roleBadgeClass(role?: string) {
  switch (role) {
    case "superadmin":
      return "bg-orange-600/25 text-orange-300 border border-orange-500/50";
    case "administrador":
      return "bg-orange-500/20 text-orange-300 border border-orange-500/40";
    case "moderador":
      return "bg-orange-400/20 text-orange-200 border border-orange-400/40";
    case "usuario":
      return "bg-orange-300/15 text-orange-200 border border-orange-300/30";
    default:
      return "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30";
  }
}

function RoleIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-orange-300"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/inicio": "Inicio",
  "/nuevo-registro": "Nuevo Registro",
  "/inventario": "Inventario",
  "/pagos": "Pagos",
  "/registros": "Registros",
  "/tareas-programadas": "Tareas",
  "/mis-tareas": "Mis Tareas",
  "/configuracion": "Configuracion",
  "/perfil-tecnico": "Mi Perfil",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] ?? "";

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <Sidebar />

      <div className="ml-16 h-full min-h-0 flex flex-col">
        {/* ─── Header ─────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-30 backdrop-blur-xl border-b"
          style={{
            background: "var(--header-bg)",
            borderColor: "var(--bg-border)",
          }}>
          <div className="w-full px-3 py-2 flex items-center justify-between gap-2">
            {/* Left: clock + page title */}
            <div className="flex items-center gap-2 shrink-0">
              <WorldClock />
              {pageTitle && (
                <span
                  className="hidden md:block text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{
                    background: "var(--color-primary-l)",
                    color: "var(--color-primary)",
                  }}>
                  {pageTitle}
                </span>
              )}
            </div>

            {/* Center: logo */}
            <img
              src="/logo_tsnetwork.png"
              alt="TS Network"
              className="hidden lg:block w-24 opacity-90 drop-shadow-md pointer-events-none shrink-0"
            />

            {/* Right: user info + theme toggle + logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* User info */}
              <div
                className={`text-right leading-tight max-w-[110px] sm:max-w-none truncate ${
                  user?.rol === "tecnico"
                    ? "cursor-pointer hover:opacity-85 transition-all select-none"
                    : ""
                }`}
                onClick={() =>
                  user?.rol === "tecnico" && nav("/perfil-tecnico")
                }
                title={
                  user?.rol === "tecnico"
                    ? "Ir a mi perfil de capacitacion"
                    : undefined
                }>
                <div className="text-xs sm:text-sm font-extrabold truncate">{user?.fullname}</div>
                <span
                  className={[
                    "hidden sm:inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide",
                    "animate-role-glow",
                    roleBadgeClass(user?.rol),
                  ].join(" ")}>
                  <RoleIcon />
                  <span className="ml-1 capitalize">{user?.rol}</span>
                </span>
              </div>

              {/* Theme toggle */}
              <button
                id="theme-toggle"
                onClick={toggleTheme}
                title={
                  theme === "dark"
                    ? "Cambiar a tema claro"
                    : "Cambiar a tema oscuro"
                }
                className="btn-icon shrink-0 p-2">
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-500" />
                )}
              </button>

              {/* Logout button */}
              <button
                id="logout-btn"
                onClick={() => {
                  logout();
                  nav("/login");
                }}
                title="Cerrar sesion"
                className="btn-danger flex items-center justify-center gap-1 py-1.5 px-2.5 sm:px-3 text-xs font-black shrink-0 z-20 cursor-pointer shadow-sm">
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main content ─────────────────────────────────── */}
        <main className="relative flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 md:p-6">
          <div className="relative w-full pb-20">{children}</div>
        </main>
      </div>
    </div>
  );
}
