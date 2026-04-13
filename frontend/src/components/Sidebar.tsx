import { NavLink } from "react-router-dom";
import type { Role } from "../types/auth";
import { useAuth } from "../auth/AuthContext";
import type { LucideIcon } from "lucide-react";
import { Home, Settings, FileHeadphone } from "lucide-react";

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

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-16 border-r border-white/10 bg-white/5 backdrop-blur-xl">
      <nav className="p-3 space-y-2">
        {items.map((it) => {
          const Icon = it.icon;

          return (
            <NavLink
              key={it.path}
              to={it.path}
              title={it.label}
              className={({ isActive }) =>
                [
                  "group relative flex items-center justify-center rounded-xl p-2",
                  "border transition-all",
                  isActive
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "border-transparent text-white/70 hover:bg-white/10 hover:text-orange-300",
                ].join(" ")
              }>
              <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
