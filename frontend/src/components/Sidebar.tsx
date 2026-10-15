import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { Role } from "../types/auth";
import { useAuth } from "../auth/AuthContext";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Settings,
  FileHeadphone,
  Package,
  CircleDollarSign,
  ListTodo,
  CalendarClock,
  ClipboardCheck,
} from "lucide-react";

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: Role[];
};

const NAV: NavItem[] = [
  { label: "Inicio", path: "/inicio", icon: Home, roles: ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"] },
  { label: "Mis tareas", path: "/mis-tareas", icon: ClipboardCheck, roles: ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"] },
  { label: "Nuevo registro", path: "/nuevo-registro", icon: FileHeadphone, roles: ["administrador", "superadmin", "moderador", "usuario"] },
  { label: "Inventario", path: "/inventario", icon: Package, roles: ["administrador", "superadmin"] },
  { label: "Pagos", path: "/pagos", icon: CircleDollarSign, roles: ["administrador", "superadmin", "moderador", "usuario"] },
  { label: "Registros", path: "/registros", icon: ListTodo, roles: ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"] },
  { label: "Tareas", path: "/tareas-programadas", icon: CalendarClock, roles: ["usuario", "moderador", "administrador", "superadmin"] },
  { label: "Configuraci\u00f3n", path: "/configuracion", icon: Settings, roles: ["administrador", "superadmin"] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const role: Role = user?.rol ?? "invitado";
  const items = NAV.filter((item) => item.roles.includes(role));
  const puedeVerInventario = role === "administrador" || role === "superadmin";
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "";
  const [cantidadStockBajo, setCantidadStockBajo] = useState(0);

  useEffect(() => {
    if (!puedeVerInventario) return;

    const cargarStockBajo = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/productos`);
        if (!response.ok) return;
        const productos: Array<{ stock: number }> = await response.json();
        setCantidadStockBajo(productos.filter((producto) => Number(producto.stock) <= 3).length);
      } catch (error) {
        console.error("Error verificando stock:", error);
      }
    };

    void cargarStockBajo();
  }, [apiUrl, puedeVerInventario]);

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r md:w-60">
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-[var(--border)] px-2 md:justify-start md:px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-extrabold tracking-tight text-white shadow-sm">
          TS
        </div>
        <div className="ml-3 hidden min-w-0 md:block">
          <div className="truncate text-sm font-extrabold tracking-tight text-[var(--text-1)]">TS Network</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-3)]">CRM</div>
        </div>
      </div>

      <nav aria-label={"Navegaci\u00f3n principal"} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-4 md:px-3">
        <div className="mb-1 hidden px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-3)] md:block">
          Men&uacute; principal
        </div>

        {items.map((item) => {
          const Icon = item.icon;
          const alertaStock = item.path === "/inventario" && cantidadStockBajo > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => [
                "group relative flex h-11 items-center justify-center gap-3 rounded-lg px-2 text-sm font-semibold transition-colors md:justify-start md:px-3",
                isActive
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-1)]",
              ].join(" ")}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--primary)]" />}
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                  <span className="hidden truncate md:block">{item.label}</span>
                  {alertaStock && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--surface)] md:static md:ml-auto md:h-5 md:min-w-5 md:text-[10px]">
                      {cantidadStockBajo > 99 ? "99+" : cantidadStockBajo}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="hidden border-t border-[var(--border)] px-4 py-3 text-[10px] text-[var(--text-3)] md:block">
        Gesti&oacute;n interna TS Network
      </div>
    </aside>
  );
}
