import type { Role } from "../types/auth";

export type NavItem = {
  label: string;
  path: string;
  roles: Role[];
};

export const NAV: NavItem[] = [
  { label: "Inicio", path: "/incio", roles: ["invitado","usuario","moderador","administrador","superadmin", "tecnico"] },
  { label: "Configuracion",   path: "/configuracion", roles: ["administrador","superadmin"] }
];
