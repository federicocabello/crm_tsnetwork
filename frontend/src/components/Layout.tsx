import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthContext";
import WorldClock from "./WorldClock";

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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-white">
      {user?.rol != "tecnico" && <Sidebar />}

      <div
        className={`${user?.rol != "tecnico" ? "ml-16 " : ""}h-full min-h-0 flex flex-col`}>
        <header className="sticky top-0 z-10 border-b border-white/10 bg-white/5 backdrop-blur">
          <div className="w-full px-4 py-3 flex items-center justify-between gap-3">
            <WorldClock />
            <img
              src="/logo_tsnetwork.png"
              alt="Login illustration"
              className={`hidden md:block w-32 opacity-90 drop-shadow-xl pointer-events-none`}
            />
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold">{user?.fullname}</div>

                <span
                  className={[
                    "inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide",
                    "animate-role-glow",
                    roleBadgeClass(user?.rol),
                  ].join(" ")}>
                  <RoleIcon />
                  <span className="ml-1 capitalize">{user?.rol}</span>
                </span>
              </div>

              <button
                onClick={() => {
                  logout();
                  nav("/login");
                }}
                className="boton border-white/10 bg-red-600  hover:bg-red-700 transition-all">
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex-1 min-h-0 overflow-hidden pl-4 pt-4 pb-4">
          <div className="absolute inset-0 pointer-events-none">
            <img
              src="/gif_fondo_1.gif"
              alt="Telecom background"
              className="h-full w-full object-cover opacity-10"
              hidden
            />
          </div>
          {/* bg-zinc-900 p-4 border border-white/10 shadow-lg shadow-black/20 */}
          <div className="relative z-10 h-full min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
