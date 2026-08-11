import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { Role } from "../types/auth";
import { useAuth } from "../auth/AuthContext";
import type { LucideIcon } from "lucide-react";
import { Home, Settings, FileHeadphone, Package, CircleDollarSign, ListTodo } from "lucide-react";

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
    roles: [
      "invitado",
      "usuario",
      "moderador",
      "administrador",
      "superadmin",
      "tecnico",
    ],
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
    label: "Configuración",
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
    <aside className="fixed left-0 top-0 z-30 h-screen w-16 border-r border-white/10 bg-white/5 backdrop-blur-xl">
      <nav className="p-3 space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          const alertaStock =
            it.path === "/inventario" && cantidadStockBajo > 0;

          return (
            <NavLink
              key={it.path}
              to={it.path}
              title={it.label}
              className={({ isActive }) =>
                [
                  "group relative flex items-center justify-center rounded-xl p-2",
                  "border transition-all",
                  alertaStock
                    ? "animate-pulse border-red-500/70 bg-red-500/20 text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.35)] hover:bg-red-500/30 hover:text-red-200"
                    : "",
                  isActive
                    ? alertaStock
                      ? ""
                      : "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : alertaStock
                      ? ""
                      : "border-transparent text-white/70 hover:bg-white/10 hover:text-orange-300",
                ].join(" ")
              }>
              <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
              {alertaStock && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-zinc-950">
                  {cantidadStockBajo > 9 ? "9+" : cantidadStockBajo}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
