import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError } from "../lib/api";

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-white" />;
}

export default function Login() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (auth.user) navigate("/inicio");
  }, [auth.user, navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await auth.login(user.trim(), password);
      navigate("/inicio");
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError) {
        setError(
          caughtError.status === 403
            ? "Tu usuario est\u00e1 deshabilitado. Contacta al administrador."
            : "Usuario o contrase\u00f1a incorrectos.",
        );
      } else {
        setError("No fue posible conectar con el sistema. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,88,12,0.09),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(234,88,12,0.05),transparent_30%)]" />

      <button
        type="button"
        onClick={toggleTheme}
        className="btn-icon absolute right-4 top-4 z-10 bg-[var(--surface)] sm:right-6 sm:top-6"
        aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-extrabold text-white shadow-sm">TS</div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-[var(--text-1)]">TS Network</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-3)]">CRM</div>
          </div>
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="mb-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mb-1 text-xl font-bold text-[var(--text-1)]">Iniciar sesi&oacute;n</h1>
            <p className="mb-0 text-sm text-[var(--text-3)]">Ingresa tus credenciales para continuar.</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-user" className="mb-1.5 block text-xs font-semibold text-[var(--text-2)]">Usuario</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  id="login-user"
                  value={user}
                  onChange={(event) => setUser(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      passwordRef.current?.focus();
                    }
                  }}
                  className="input h-11 w-full pl-10 pr-3"
                  placeholder="Tu usuario"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-[var(--text-2)]">Contrase&ntilde;a</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  id="login-password"
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input h-11 w-full pl-10 pr-3"
                  placeholder={"Tu contrase\u00f1a"}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full py-3">
              {loading && <Spinner />}
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <p className="mb-0 mt-6 text-center text-xs text-[var(--text-3)]">
            Solo para personal autorizado de TS Network
          </p>
        </section>

        <p className="mb-0 mt-5 text-center text-xs text-[var(--text-3)]">
          {new Date().getFullYear()} TS Network
        </p>
      </main>
    </div>
  );
}
