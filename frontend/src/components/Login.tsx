import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (auth.user) nav("/inicio");
  }, [auth.user, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await auth.login(user.trim(), password);
      nav("/inicio");
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 403) {
          setErr("Tu usuario está deshabilitado. Contacta al administrador.");
        } else {
          setErr("Usuario o contraseña incorrectos.");
        }
      } else {
        setErr("Error inesperado. Revisa el backend.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* Fondo tecnológico: red de internet */}
      <div className="absolute inset-0 bg-zinc-950">
        {/* Gradientes base */}
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_15%,rgba(249,115,22,0.22),transparent_55%),radial-gradient(800px_circle_at_85%_75%,rgba(234,88,12,0.18),transparent_55%),radial-gradient(700px_circle_at_50%_100%,rgba(113,113,122,0.18),transparent_60%)]" />

        {/* Grid técnico */}
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />

        {/* Líneas de red */}
        <div className="network-lines absolute inset-0 opacity-70">
          <span className="line line-1" />
          <span className="line line-2" />
          <span className="line line-3" />
          <span className="line line-4" />
          <span className="line line-5" />
        </div>

        {/* Nodos */}
        <div className="network-nodes absolute inset-0">
          <span className="node node-1" />
          <span className="node node-2" />
          <span className="node node-3" />
          <span className="node node-4" />
          <span className="node node-5" />
          <span className="node node-6" />
          <span className="node node-7" />
        </div>

        {/* Paquetes de datos moviéndose */}
        <div className="data-packets absolute inset-0">
          <span className="packet packet-1" />
          <span className="packet packet-2" />
          <span className="packet packet-3" />
          <span className="packet packet-4" />
        </div>

        {/* Brillo suave encima */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(249,115,22,0.07)_45%,transparent_70%)] animate-scan" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
            <img
              src="/logo_tsnetwork.png"
              alt="TS Network"
              className="absolute top-16 right-8 w-32 opacity-90 drop-shadow-xl hidden sm:block pointer-events-none"
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
                <label className="text-sm font-semibold text-white/80">
                  Usuario
                </label>
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
                <label className="text-sm font-semibold text-white/80">
                  Contraseña
                </label>
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

      {/* Animaciones CSS */}
      <style>{`
        @keyframes pulseNode {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.45);
            opacity: 0.75;
          }

          50% {
            transform: scale(1.35);
            box-shadow: 0 0 28px 8px rgba(249, 115, 22, 0.2);
            opacity: 1;
          }
        }

        @keyframes movePacketHorizontal {
          0% {
            transform: translateX(-12vw);
            opacity: 0;
          }

          15% {
            opacity: 1;
          }

          85% {
            opacity: 1;
          }

          100% {
            transform: translateX(112vw);
            opacity: 0;
          }
        }

        @keyframes movePacketDiagonal {
          0% {
            transform: translate(-10vw, 12vh);
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          100% {
            transform: translate(110vw, -35vh);
            opacity: 0;
          }
        }

        @keyframes scan {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }

          35% {
            opacity: 1;
          }

          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .animate-scan {
          animation: scan 8s ease-in-out infinite;
        }

        .network-lines .line {
          position: absolute;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(249, 115, 22, 0.45),
            rgba(255, 255, 255, 0.18),
            transparent
          );
          transform-origin: left center;
          filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.35));
        }

        .line-1 {
          width: 52vw;
          top: 22%;
          left: 8%;
          transform: rotate(12deg);
        }

        .line-2 {
          width: 46vw;
          top: 36%;
          right: 6%;
          transform: rotate(-18deg);
        }

        .line-3 {
          width: 58vw;
          bottom: 26%;
          left: 12%;
          transform: rotate(-8deg);
        }

        .line-4 {
          width: 38vw;
          top: 62%;
          right: 18%;
          transform: rotate(23deg);
        }

        .line-5 {
          width: 42vw;
          top: 48%;
          left: 28%;
          transform: rotate(0deg);
        }

        .network-nodes .node {
          position: absolute;
          width: 11px;
          height: 11px;
          border-radius: 9999px;
          background: rgba(249, 115, 22, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.45);
          box-shadow: 0 0 18px rgba(249, 115, 22, 0.75);
          animation: pulseNode 3.4s ease-in-out infinite;
        }

        .node-1 {
          top: 18%;
          left: 12%;
          animation-delay: 0s;
        }

        .node-2 {
          top: 28%;
          left: 42%;
          animation-delay: .4s;
        }

        .node-3 {
          top: 18%;
          right: 18%;
          animation-delay: .8s;
        }

        .node-4 {
          top: 52%;
          left: 20%;
          animation-delay: 1.2s;
        }

        .node-5 {
          top: 60%;
          right: 26%;
          animation-delay: 1.6s;
        }

        .node-6 {
          bottom: 18%;
          left: 38%;
          animation-delay: 2s;
        }

        .node-7 {
          bottom: 24%;
          right: 12%;
          animation-delay: 2.4s;
        }

        .data-packets .packet {
          position: absolute;
          width: 48px;
          height: 2px;
          border-radius: 9999px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.9),
            rgba(249, 115, 22, 0.9),
            transparent
          );
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.65);
        }

        .packet-1 {
          top: 25%;
          left: 0;
          animation: movePacketHorizontal 6s linear infinite;
        }

        .packet-2 {
          top: 48%;
          left: 0;
          animation: movePacketHorizontal 8s linear infinite;
          animation-delay: 1.5s;
        }

        .packet-3 {
          bottom: 24%;
          left: 0;
          animation: movePacketHorizontal 7s linear infinite;
          animation-delay: 3s;
        }

        .packet-4 {
          top: 72%;
          left: 0;
          animation: movePacketDiagonal 9s linear infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}