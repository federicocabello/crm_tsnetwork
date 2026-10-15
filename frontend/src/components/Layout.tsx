import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/inicio": { title: "Inicio", subtitle: "Agenda y actividad del equipo" },
  "/nuevo-registro": { title: "Nuevo registro", subtitle: "Alta de clientes y solicitudes" },
  "/inventario": { title: "Inventario", subtitle: "Productos, existencias y movimientos" },
  "/pagos": { title: "Pagos", subtitle: "Facturaci\u00f3n, cobros y vencimientos" },
  "/registros": { title: "Registros", subtitle: "Seguimiento de solicitudes" },
  "/tareas-programadas": { title: "Tareas", subtitle: "Planificaci\u00f3n del equipo" },
  "/mis-tareas": { title: "Mis tareas", subtitle: "Trabajo asignado y progreso" },
  "/configuracion": { title: "Configuraci\u00f3n", subtitle: "Preferencias y administraci\u00f3n" },
  "/perfil-tecnico": { title: "Mi perfil", subtitle: "Informaci\u00f3n y capacitaci\u00f3n" },
};

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/clientes/")) {
    return { title: "Cliente", subtitle: "Detalle, historial y documentos" };
  }
  return PAGE_TITLES[pathname] ?? { title: "TS Network", subtitle: "Gestion interna" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const page = getPageMeta(location.pathname);

  return (
    <div className="app-shell h-dvh overflow-hidden">
      <Sidebar />

      <div className="ml-16 flex h-full min-h-0 flex-col md:ml-60">
        <header className="app-header sticky top-0 z-30 h-16 shrink-0 border-b backdrop-blur-md">
          <div className="flex h-full w-full items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
            <div className="min-w-0">
              <h1 className="m-0 truncate text-base font-bold text-[var(--text-1)] sm:text-lg">{page.title}</h1>
              <p className="hidden truncate text-xs text-[var(--text-3)] sm:block">{page.subtitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                className="btn-icon"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => user?.rol === "tecnico" && navigate("/perfil-tecnico")}
                className={`hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 sm:flex ${user?.rol === "tecnico" ? "hover:bg-[var(--surface-raised)]" : "cursor-default"}`}
                title={user?.rol === "tecnico" ? "Ir a mi perfil" : undefined}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="max-w-36 text-left leading-tight">
                  <span className="block truncate text-xs font-bold text-[var(--text-1)]">{user?.fullname}</span>
                  <span className="block truncate text-[10px] capitalize text-[var(--text-3)]">{user?.rol}</span>
                </span>
              </button>

              <button
                id="logout-btn"
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                title="Cerrar sesion"
                className="btn-danger"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        <main className="app-content relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="relative mx-auto w-full max-w-[1600px] pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
