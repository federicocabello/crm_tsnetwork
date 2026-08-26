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
  {
    label: "Inicio",
    path: "/inicio",
    icon: Home,
    roles: ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"],
  },
  {
    label: "Mis tareas",
    path: "/mis-tareas",
    icon: ClipboardCheck,
    roles: ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"],
  },
  {
    label: "Nuevo Registro",
    path: "/nuevo-registro",
    icon: FileHeadphone,
    roles: ["administrador", "superadmin", "moderador", "usuario"],
  },
  {
    label: "Inventario",
    path: "/inventario",
    icon: Package,
    roles: ["administrador", "superadmin"],
  },
  {
    label: "Pagos",
    path: "/pagos",
    icon: CircleDollarSign,
    roles: ["administrador", "superadmin", "moderador", "usuario"],
  },
  {
    label: "Registros",
    path: "/registros",
    icon: ListTodo,
    roles: ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"],
  },
  {
    label: "Tareas",
    path: "/tareas-programadas",
    icon: CalendarClock,
    roles: ["usuario", "moderador", "administrador", "superadmin"],
  },
  {
    label: "Configuracion",
    path: "/configuracion",
    icon: Settings,
    roles: ["administrador", "superadmin"],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const role: Role = user?.rol ?? "invitado";
  const items = NAV.filter((i) => i.roles.includes(role));
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [cantidadStockBajo, setCantidadStockBajo] = useState(0);

  useEffect(() => {
    if (!items.some((item) => item.path === "/inventario")) return;

    const cargarStockBajo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/productos`);
        if (!response.ok) return;
        const productos: Array<{ stock: number }> = await response.json();
        setCantidadStockBajo(
          productos.filter((producto) => Number(producto.stock) <= 3).length,
        );
      } catch (error) {
        console.error("Error verificando stock:", error);
      }
    };

    void cargarStockBajo();
  }, [API_URL, role]);

  return (
    <aside
      className="fixed left-0 top-0 z-20 h-screen w-16 border-r backdrop-blur-xl"
      style={{
        background: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}>
      {/* Logo mark at top */}
      <div className="flex h-14 items-center justify-center border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
          style={{ background: "var(--color-primary)" }}>
          TS
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-2 mt-1">
        {items.map((it) => {
          const Icon = it.icon;
          const alertaStock = it.path === "/inventario" && cantidadStockBajo > 0;

          return (
            <div key={it.path} className="relative group">
              <NavLink
                to={it.path}
                title={it.label}
                className={({ isActive }) =>
                  [
                    "relative flex items-center justify-center rounded-xl p-2.5 transition-all duration-200",
                    "border",
                    alertaStock
                      ? "animate-pulse border-red-500/60 bg-red-500/15 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:bg-red-500/25"
                      : isActive
                      ? "border-orange-500/40 bg-orange-500/15 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                      : "border-transparent hover:border-white/10 hover:bg-white/8 hover:text-orange-300",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                style={({ isActive }) =>
                  !alertaStock && !isActive
                    ? { color: "var(--text-muted)" }
                    : {}
                }>
                <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />

                {/* Stock badge */}
                {alertaStock && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-[var(--bg-base)]">
                    {cantidadStockBajo > 9 ? "9+" : cantidadStockBajo}
                  </span>
                )}
              </NavLink>

              {/* Tooltip on hover */}
              <div
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--bg-border)",
                  boxShadow: "var(--shadow)",
                }}>
                {it.label}
                {alertaStock && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                    {cantidadStockBajo} bajo stock
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
