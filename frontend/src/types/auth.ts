export const ROLES = ["invitado", "usuario", "moderador", "administrador", "superadmin", "tecnico"] as const;
export type Role = typeof ROLES[number];

export type AuthUser = {
  id: string;
  user: string;
  fullname: string;
  rol: Role;
  habilitado: boolean;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export type Usuarios = {
  id: string;
  user: string;
  password: string;
  fullname: string;
  rol: Role;
  habilitado: boolean;
}
