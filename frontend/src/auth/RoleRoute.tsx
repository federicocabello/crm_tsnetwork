import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "../types/auth";

export default function RoleRoute({
  allow,
  children,
}: {
  allow: Role[];
  children: JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!allow.includes(user.rol)) return <Navigate to="/inicio" replace />;

  return children;
}
