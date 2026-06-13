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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(249,115,22,0.14),transparent_30%),radial-gradient(circle_at_88%_72%,rgba(234,88,12,0.1),transparent_32%),linear-gradient(145deg,rgba(9,9,11,0.62),rgba(24,24,27,0.18)_45%,rgba(9,9,11,0.78))]" />

        {/* Grid técnico */}
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="minimal-network absolute inset-0">
          <span className="net-link link-a" />
          <span className="net-link link-b" />
          <span className="net-link link-c" />
          <span className="net-link link-d" />
          <span className="net-link link-e" />

          <span className="net-node node-a" />
          <span className="net-node node-b" />
          <span className="net-node node-c" />
          <span className="net-node node-d" />
          <span className="net-node node-e" />

          <span className="device camera-device">
            <span className="camera-body" />
            <span className="camera-lens" />
            <span className="camera-arm" />
          </span>

          <span className="device router-device">
            <span className="router-base" />
            <span className="wifi-arc arc-1" />
            <span className="wifi-arc arc-2" />
            <span className="wifi-arc arc-3" />
          </span>

          <span className="signal-ring signal-a" />
          <span className="signal-ring signal-b" />
        </div>

        {/* Líneas de red */}
        

        {/* Paquetes de datos moviéndose */}
        <div className="data-streams absolute inset-0">
          <span className="stream stream-a" />
          <span className="stream stream-b" />
          <span className="stream stream-c" />
          <span className="stream stream-d" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.68),transparent_36%,transparent_64%,rgba(9,9,11,0.72))]" />
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
        @keyframes floatDevice {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -6px, 0);
          }
        }

        @keyframes activeNode {
          0%, 100% {
            transform: scale(1);
            opacity: 0.45;
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.12);
          }

          50% {
            transform: scale(1.18);
            opacity: 0.78;
            box-shadow: 0 0 18px 4px rgba(249, 115, 22, 0.12);
          }
        }

        @keyframes dataTravel {
          0% {
            left: -18%;
            opacity: 0;
          }

          18% {
            opacity: 0.65;
          }

          82% {
            opacity: 0.65;
          }

          100% {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes wifiPulse {
          0%, 100% {
            opacity: 0.16;
            transform: translateX(-50%) scale(0.9);
          }

          50% {
            opacity: 0.46;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes streamTravel {
          0% {
            transform: translate3d(-22vw, 0, 0) rotate(var(--stream-rotate));
            opacity: 0;
          }

          18% {
            opacity: 0.82;
          }

          78% {
            opacity: 0.82;
          }

          100% {
            transform: translate3d(120vw, 0, 0) rotate(var(--stream-rotate));
            opacity: 0;
          }
        }

        @keyframes signalBreath {
          0% {
            transform: translate(-50%, -50%) scale(0.72);
            opacity: 0;
          }

          28% {
            opacity: 0.36;
          }

          100% {
            transform: translate(-50%, -50%) scale(1.45);
            opacity: 0;
          }
        }

        .minimal-network {
          pointer-events: none;
        }

        .data-streams {
          pointer-events: none;
          opacity: 0.82;
        }

        .stream {
          position: absolute;
          left: 0;
          width: 160px;
          height: 2px;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.84), rgba(255, 255, 255, 0.42), transparent);
          box-shadow: 0 0 18px rgba(249, 115, 22, 0.42);
          transform-origin: center;
          animation: streamTravel 8.5s linear infinite;
          --stream-rotate: 0deg;
        }

        .stream-a {
          top: 18%;
          --stream-rotate: 13deg;
        }

        .stream-b {
          top: 37%;
          animation-delay: 2s;
          animation-duration: 10s;
          --stream-rotate: -9deg;
        }

        .stream-c {
          bottom: 28%;
          animation-delay: 4.4s;
          animation-duration: 9.2s;
          --stream-rotate: 8deg;
        }

        .stream-d {
          bottom: 13%;
          animation-delay: 6.2s;
          animation-duration: 11s;
          --stream-rotate: -15deg;
        }

        .net-link {
          position: absolute;
          height: 2px;
          width: 30vw;
          overflow: hidden;
          border-radius: 9999px;
          background: rgba(249, 115, 22, 0.1);
          transform-origin: left center;
        }

        .net-link::after {
          content: "";
          position: absolute;
          top: 0;
          left: -18%;
          width: 14%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.82), rgba(255, 255, 255, 0.48), transparent);
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.46);
          animation: dataTravel 6.4s linear infinite;
        }

        .link-a {
          top: 24%;
          left: 9%;
          transform: rotate(15deg);
        }

        .link-b {
          top: 42%;
          right: 5%;
          width: 32vw;
          transform: rotate(-18deg);
        }

        .link-c {
          bottom: 23%;
          left: 15%;
          width: 34vw;
          transform: rotate(-7deg);
        }

        .link-d {
          top: 64%;
          right: 18%;
          width: 28vw;
          transform: rotate(25deg);
        }

        .link-e {
          top: 15%;
          right: 30%;
          width: 22vw;
          transform: rotate(-25deg);
        }

        .link-b::after {
          animation-delay: 2.4s;
        }

        .link-c::after {
          animation-delay: 4.8s;
        }

        .link-d::after {
          animation-delay: 1.4s;
        }

        .link-e::after {
          animation-delay: 3.5s;
        }

        .net-node {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: rgba(249, 115, 22, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.4);
          animation: activeNode 4.8s ease-in-out infinite;
        }

        .node-a {
          top: 21%;
          left: 13%;
        }

        .node-b {
          top: 31%;
          left: 41%;
          animation-delay: .7s;
        }

        .node-c {
          top: 40%;
          right: 21%;
          animation-delay: 1.4s;
        }

        .node-d {
          bottom: 20%;
          left: 34%;
          animation-delay: 2.1s;
        }

        .node-e {
          bottom: 34%;
          right: 13%;
          animation-delay: 2.8s;
        }

        .signal-ring {
          position: absolute;
          width: 210px;
          height: 210px;
          border: 1px solid rgba(249, 115, 22, 0.22);
          border-radius: 9999px;
          box-shadow: inset 0 0 24px rgba(249, 115, 22, 0.08), 0 0 22px rgba(249, 115, 22, 0.12);
          animation: signalBreath 5.8s ease-out infinite;
        }

        .signal-a {
          top: 32%;
          left: 43%;
        }

        .signal-b {
          top: 66%;
          left: 74%;
          width: 170px;
          height: 170px;
          animation-delay: 2.6s;
        }

        .device {
          position: absolute;
          display: block;
          opacity: 0.64;
          filter: drop-shadow(0 0 18px rgba(249, 115, 22, 0.24));
          animation: floatDevice 8s ease-in-out infinite;
        }

        .camera-device {
          top: 18%;
          right: 17%;
          width: 84px;
          height: 48px;
          animation-delay: 1.2s;
        }

        .camera-body {
          position: absolute;
          inset: 9px 21px 9px 0;
          border: 1px solid rgba(249, 115, 22, 0.58);
          border-radius: 8px;
          background: rgba(24, 24, 27, 0.72);
        }

        .camera-lens {
          position: absolute;
          top: 17px;
          left: 16px;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          border: 2px solid rgba(249, 115, 22, 0.8);
          background: rgba(255, 255, 255, 0.08);
        }

        .camera-arm {
          position: absolute;
          right: 0;
          top: 20px;
          width: 26px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(249, 115, 22, 0.48);
        }

        .router-device {
          bottom: 18%;
          left: 17%;
          width: 98px;
          height: 72px;
          animation-duration: 9s;
        }

        .router-base {
          position: absolute;
          left: 23px;
          bottom: 7px;
          width: 52px;
          height: 16px;
          border: 1px solid rgba(249, 115, 22, 0.58);
          border-radius: 7px;
          background: rgba(24, 24, 27, 0.74);
        }

        .wifi-arc {
          position: absolute;
          left: 50%;
          bottom: 23px;
          border: 2px solid rgba(249, 115, 22, 0.7);
          border-bottom: 0;
          border-radius: 999px 999px 0 0;
          transform: translateX(-50%);
          animation: wifiPulse 2.4s ease-in-out infinite;
        }

        .arc-1 {
          width: 28px;
          height: 14px;
        }

        .arc-2 {
          width: 50px;
          height: 25px;
          bottom: 22px;
          animation-delay: .35s;
        }

        .arc-3 {
          width: 74px;
          height: 37px;
          bottom: 21px;
          animation-delay: .7s;
        }

      `}</style>
    </div>
  );
}
