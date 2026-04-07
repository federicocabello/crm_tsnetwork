import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser, LoginResponse } from "../types/auth";
import { ApiError, api, clearToken, getToken, setToken } from "../lib/api";

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    console.log("Token al cargar:", token);

    if (!token) {
      setIsLoading(false);
      return; // ⚠ No hay token → no hacemos fetch
    }

    // Si hay token, validamos la sesión
    api<{ user: AuthUser }>("/api/me")
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          clearToken();
          setUser(null);
        } else {
          console.error("Fallo /api/me (NO cierro sesión):", e);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(u: string, p: string) {
    const data = await api<LoginResponse>("/api/login", {
      method: "POST",
      body: JSON.stringify({ user: u, password: p }),
      headers: { "Content-Type": "application/json" },
    });

    setToken(data.access_token);
    setUser(data.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
