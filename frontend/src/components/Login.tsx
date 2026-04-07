import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";

function Spinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

export default function Login() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const auth = useAuth();

  const blobs = useMemo(
    () => [
      { className: "bg-brand-500/30", style: { top: "-8%", left: "-10%", width: 420, height: 420 } },
      { className: "bg-brand-600/25", style: { bottom: "-12%", right: "-12%", width: 520, height: 520 } },
      { className: "bg-zinc-400/20", style: { top: "35%", right: "8%", width: 360, height: 360 } },
    ],
    []
  );

useEffect(() => {
    if (auth.user) nav("/inicio");
  }, [auth.user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await auth.login(user.trim(), password);
      nav("/inicio"); // Redirige al dashboard
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 403)
          setErr("Tu usuario está deshabilitado. Contacta al administrador.");
        else setErr("Usuario o contraseña incorrectos.");
      } else {
        setErr("Error inesperado. Revisa el backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* Fondo: gradiente animado */}
      <div className="absolute inset-0 bg-[radial-gradient(1100px_circle_at_10%_10%,rgba(249,115,22,0.22),transparent_55%),radial-gradient(900px_circle_at_90%_80%,rgba(234,88,12,0.20),transparent_55%),radial-gradient(800px_circle_at_40%_90%,rgba(161,161,170,0.18),transparent_55%)]" />

      {/* “Blobs” animados */}
      <div className="absolute inset-0">
        {blobs.map((b, i) => (
          <div
            key={i}
            className={`absolute rounded-full blur-3xl ${b.className} animate-float`}
            style={b.style as React.CSSProperties}
          />
        ))}
      </div>

      {/* Grid sutil */}
      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-size-[42px_42px]" />

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
  
            <img
              src="/logo_tsnetwork.png"
              alt="Login illustration"
              className="absolute -top--32 right-8 w-32 opacity-90 drop-shadow-xl hidden sm:block pointer-events-none"
            />

            {/* Header */}
            <div className="mb-6">
              <div className="gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80 w-32 text-center">
                <span className="rounded-full bg-brand-500" />
                CRM TS NETWORK
              </div>

              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-orange-400 opacity-85">
                Iniciar sesión
              </h1>

              <p className="mt-1 text-sm text-white/65">
                Acceso interno · Agentes y técnicos
              </p>
            </div>

            {/* Error */}
            {err && (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {err}
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-white/80">Usuario</label>
                <input
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none
                             focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/15"
                  placeholder="usuario"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none
                             focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/15"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-2xl bg-brand-600 px-4 py-3 font-bold text-white shadow-lg shadow-brand-600/20
                           transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:border-orange-500/50 hover:ring-2 hover:ring-orange-500/15"
              >
                <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(255,255,255,0.22),transparent_45%)]" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? <Spinner /> : null}
                  {loading ? "Ingresando..." : "Entrar"}
                </span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-white/45">
              © {new Date().getFullYear()} TS NETWORK · Solo personal autorizado
            </div>
          </div>

        </div>
      </div>

      {/* Animación CSS (sin libs) */}
      <style>{`
        @keyframes float {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          33%  { transform: translate3d(18px, -14px, 0) scale(1.03); }
          66%  { transform: translate3d(-12px, 10px, 0) scale(0.98); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
