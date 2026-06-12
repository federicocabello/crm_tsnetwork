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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(249,115,22,0.2),transparent_34%),radial-gradient(circle_at_88%_72%,rgba(234,88,12,0.16),transparent_36%),linear-gradient(145deg,rgba(9,9,11,0.4),rgba(24,24,27,0.15)_45%,rgba(9,9,11,0.65))]" />

        {/* Grid técnico */}
        <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(to_right,rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:46px_46px]" />
        <div className="absolute inset-0 opacity-[0.16] bg-[repeating-linear-gradient(115deg,transparent_0px,transparent_78px,rgba(249,115,22,0.18)_79px,transparent_80px)]" />

        <div className="minimal-network absolute inset-0">
          <span className="net-link link-a" />
          <span className="net-link link-b" />
          <span className="net-link link-c" />
          <span className="net-link link-d" />

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
        </div>

        {/* Líneas de red */}
        <svg
          className="network-map absolute inset-0 h-full w-full opacity-80"
          viewBox="0 0 1200 760"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="networkTrace" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(249,115,22,0)" />
              <stop offset="48%" stopColor="rgba(249,115,22,0.72)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
            <filter id="orangeGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="network-paths" fill="none" stroke="url(#networkTrace)" strokeWidth="2" filter="url(#orangeGlow)">
            <path pathLength="1" d="M-40 190 C150 125 280 165 410 250 S700 375 910 250 S1150 145 1260 210" />
            <path pathLength="1" d="M-20 510 C170 455 290 540 455 450 S730 275 920 405 S1100 585 1240 500" />
            <path pathLength="1" d="M115 735 C235 560 345 500 520 520 S775 650 960 565 S1160 430 1245 360" />
            <path pathLength="1" d="M200 -30 C280 120 385 205 520 245 S700 285 790 405 S900 620 1015 790" />
            <path pathLength="1" d="M-50 340 C135 325 260 315 390 360 S560 470 710 430 S940 320 1265 335" />
          </g>

          <g className="network-dots">
            <circle cx="120" cy="190" r="5" />
            <circle cx="315" cy="185" r="4" />
            <circle cx="505" cy="300" r="6" />
            <circle cx="750" cy="350" r="4" />
            <circle cx="980" cy="230" r="6" />
            <circle cx="205" cy="520" r="5" />
            <circle cx="455" cy="450" r="5" />
            <circle cx="690" cy="430" r="4" />
            <circle cx="915" cy="405" r="5" />
            <circle cx="1080" cy="555" r="4" />
            <circle cx="355" cy="590" r="4" />
            <circle cx="605" cy="545" r="6" />
            <circle cx="875" cy="610" r="5" />
          </g>
        </svg>

        {/* Paquetes de datos moviéndose */}
        <div className="data-packets absolute inset-0">
          <span className="packet packet-1" />
          <span className="packet packet-2" />
          <span className="packet packet-3" />
          <span className="packet packet-4" />
          <span className="packet packet-5" />
        </div>

        <div className="signal-rings absolute inset-0">
          <span className="signal signal-1" />
          <span className="signal signal-2" />
          <span className="signal signal-3" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.68),transparent_36%,transparent_64%,rgba(9,9,11,0.72))]" />
        {/* Brillo suave encima */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(249,115,22,0.08)_46%,transparent_68%)] animate-scan" />
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

        @keyframes floatDevice {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -12px, 0);
          }
        }

        @keyframes activeNode {
          0%, 100% {
            transform: scale(1);
            opacity: 0.55;
            box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.22);
          }

          50% {
            transform: scale(1.45);
            opacity: 1;
            box-shadow: 0 0 28px 7px rgba(249, 115, 22, 0.18);
          }
        }

        @keyframes dataTravel {
          0% {
            left: -18%;
            opacity: 0;
          }

          18% {
            opacity: 1;
          }

          82% {
            opacity: 1;
          }

          100% {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes wifiPulse {
          0%, 100% {
            opacity: 0.2;
            transform: translateX(-50%) scale(0.82);
          }

          50% {
            opacity: 0.9;
            transform: translateX(-50%) scale(1);
          }
        }

        .minimal-network {
          pointer-events: none;
        }

        .net-link {
          position: absolute;
          height: 2px;
          width: 34vw;
          overflow: hidden;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.07);
          transform-origin: left center;
        }

        .net-link::after {
          content: "";
          position: absolute;
          top: 0;
          left: -18%;
          width: 18%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.95), rgba(255, 255, 255, 0.7), transparent);
          box-shadow: 0 0 18px rgba(249, 115, 22, 0.75);
          animation: dataTravel 3.8s linear infinite;
        }

        .link-a {
          top: 24%;
          left: 9%;
          transform: rotate(15deg);
        }

        .link-b {
          top: 42%;
          right: 5%;
          width: 38vw;
          transform: rotate(-18deg);
        }

        .link-c {
          bottom: 23%;
          left: 15%;
          width: 42vw;
          transform: rotate(-7deg);
        }

        .link-d {
          top: 64%;
          right: 18%;
          width: 26vw;
          transform: rotate(25deg);
        }

        .link-b::after {
          animation-delay: 1s;
        }

        .link-c::after {
          animation-delay: 2s;
        }

        .link-d::after {
          animation-delay: 2.8s;
        }

        .net-node {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: rgb(249, 115, 22);
          border: 1px solid rgba(255, 255, 255, 0.55);
          animation: activeNode 2.8s ease-in-out infinite;
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

        .device {
          position: absolute;
          display: block;
          opacity: 0.78;
          filter: drop-shadow(0 0 18px rgba(249, 115, 22, 0.28));
          animation: floatDevice 5.8s ease-in-out infinite;
        }

        .camera-device {
          top: 18%;
          right: 17%;
          width: 84px;
          height: 48px;
          animation-delay: .8s;
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
          animation-duration: 6.6s;
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

        @keyframes drawNetwork {
          0% {
            stroke-dashoffset: 1;
            opacity: 0.18;
          }

          45% {
            opacity: 0.95;
          }

          100% {
            stroke-dashoffset: -1;
            opacity: 0.18;
          }
        }

        @keyframes signalWave {
          0% {
            transform: translate(-50%, -50%) scale(0.45);
            opacity: 0.42;
          }

          100% {
            transform: translate(-50%, -50%) scale(1.55);
            opacity: 0;
          }
        }

        .network-paths path {
          stroke-dasharray: 0.14 0.86;
          animation: drawNetwork 7.5s ease-in-out infinite;
        }

        .network-paths path:nth-child(2) {
          animation-delay: -1.4s;
        }

        .network-paths path:nth-child(3) {
          animation-delay: -2.8s;
        }

        .network-paths path:nth-child(4) {
          animation-delay: -4.2s;
        }

        .network-paths path:nth-child(5) {
          animation-delay: -5.6s;
        }

        .network-dots circle {
          fill: rgba(249, 115, 22, 0.92);
          stroke: rgba(255, 255, 255, 0.5);
          stroke-width: 1.4;
          filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.75));
          transform-box: fill-box;
          transform-origin: center;
          animation: pulseNode 3.4s ease-in-out infinite;
        }

        .network-dots circle:nth-child(2n) {
          animation-delay: -1.1s;
        }

        .network-dots circle:nth-child(3n) {
          animation-delay: -2.2s;
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

        .packet-5 {
          top: 15%;
          left: 0;
          animation: movePacketDiagonal 11s linear infinite;
          animation-delay: 5s;
        }

        .signal {
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 9999px;
          border: 1px solid rgba(249, 115, 22, 0.22);
          box-shadow: inset 0 0 24px rgba(249, 115, 22, 0.08), 0 0 26px rgba(249, 115, 22, 0.1);
          animation: signalWave 4.8s ease-out infinite;
        }

        .signal-1 {
          top: 29%;
          left: 42%;
        }

        .signal-2 {
          top: 53%;
          left: 76%;
          animation-delay: 1.5s;
        }

        .signal-3 {
          top: 73%;
          left: 26%;
          animation-delay: 3s;
        }

      `}</style>
    </div>
  );
}
