import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, RefreshCw, UserCheck, X, XCircle } from "lucide-react";
import { ApiError, api } from "../lib/api";

type EstadoPostulacion = "pendiente" | "aprobado" | "rechazado";

type Postulacion = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  experiencia: string | null;
  respuestas: Record<string, string>;
  estado: EstadoPostulacion;
  comentarios: string | null;
  tecnico_usuario_id: number | null;
  tecnico_user: string | null;
  fecha_postulacion: string;
  fecha_evaluacion: string | null;
};

const estadoClass: Record<EstadoPostulacion, string> = {
  pendiente: "border-yellow-500/30 bg-yellow-500/10 text-yellow-100",
  aprobado: "border-green-500/30 bg-green-500/10 text-green-100",
  rechazado: "border-red-500/30 bg-red-500/10 text-red-100",
};

export default function ReclutamientoAdmin() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [seleccionada, setSeleccionada] = useState<Postulacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState("");
  const [credenciales, setCredenciales] = useState({ user: "", password: "" });

  const resumen = useMemo(() => ({
    pendientes: postulaciones.filter((p) => p.estado === "pendiente").length,
    aprobadas: postulaciones.filter((p) => p.estado === "aprobado").length,
    rechazadas: postulaciones.filter((p) => p.estado === "rechazado").length,
  }), [postulaciones]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Postulacion[]>("/api/reclutamiento/postulaciones");
      setPostulaciones(data);
      if (seleccionada) setSeleccionada(data.find((p) => p.id === seleccionada.id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las postulaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrir(postulacion: Postulacion) {
    setSeleccionada(postulacion);
    setComentarios(postulacion.comentarios || "");
    setCredenciales({ user: postulacion.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase(), password: "" });
  }

  async function evaluar(estado: "aprobado" | "rechazado") {
    if (!seleccionada) return;
    setGuardando(true);
    setError(null);
    try {
      await api(`/api/reclutamiento/postulaciones/${seleccionada.id}/evaluar`, {
        method: "POST",
        body: JSON.stringify({ estado, comentarios, ...credenciales }),
      });
      await cargar();
      setSeleccionada(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo evaluar la postulacion.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="cuadro h-full overflow-auto">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1>Reclutamiento</h1>
          <p className="text-sm text-white/50">Postulaciones tecnicas recibidas desde el formulario publico.</p>
        </div>
        <button onClick={cargar} className="boton inline-flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3"><p className="text-xs text-yellow-100/70">Pendientes</p><strong className="text-2xl">{resumen.pendientes}</strong></div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3"><p className="text-xs text-green-100/70">Aprobadas</p><strong className="text-2xl">{resumen.aprobadas}</strong></div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3"><p className="text-xs text-red-100/70">Rechazadas</p><strong className="text-2xl">{resumen.rechazadas}</strong></div>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-300" /></div>
      ) : postulaciones.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/55">No hay postulaciones todavia.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/10 text-left text-white/70">
              <tr><th className="px-4 py-3">Postulante</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody>
              {postulaciones.map((postulacion) => (
                <tr key={postulacion.id} className="border-t border-white/10">
                  <td className="px-4 py-3"><strong>{postulacion.nombre}</strong><p className="text-xs text-white/45">{postulacion.direccion}</p></td>
                  <td className="px-4 py-3"><p>{postulacion.email}</p><p className="text-xs text-white/45">{postulacion.telefono}</p></td>
                  <td className="px-4 py-3 text-white/60">{postulacion.fecha_postulacion}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${estadoClass[postulacion.estado]}`}>{postulacion.estado}</span></td>
                  <td className="px-4 py-3 text-right"><button className="boton inline-flex items-center justify-center border border-orange-500/30 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20" onClick={() => abrir(postulacion)}><Eye className="h-4 w-4" /> Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-black">{seleccionada.nombre}</h2><p className="text-sm text-white/50">{seleccionada.email} - {seleccionada.telefono}</p></div>
              <button className="boton border border-white/10 bg-white/5 hover:bg-white/10" onClick={() => setSeleccionada(null)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs text-white/45">Direccion</p><p className="font-semibold">{seleccionada.direccion}</p></div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs text-white/45">Estado</p><p className="font-semibold capitalize">{seleccionada.estado}</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3"><p className="text-xs text-white/45">Experiencia</p><p className="whitespace-pre-wrap text-sm">{seleccionada.experiencia || "Sin experiencia registrada."}</p></div>

            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs text-white/45">Respuestas</p>
              <div className="space-y-2">
                {Object.entries(seleccionada.respuestas || {}).map(([key, value]) => <div key={key} className="rounded-lg bg-black/20 p-2"><p className="text-xs font-bold uppercase text-orange-200">{key.replace(/_/g, " ")}</p><p className="text-sm text-white/80">{value}</p></div>)}
              </div>
            </div>

            <label className="mt-4 block text-sm font-bold">Comentarios de evaluacion<textarea className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-normal outline-none focus:border-orange-400" value={comentarios} onChange={(e) => setComentarios(e.target.value)} /></label>

            {seleccionada.estado !== "aprobado" && (
              <div className="mt-4 grid gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3 md:grid-cols-2">
                <label className="text-sm font-bold">Usuario tecnico<input className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 font-normal outline-none focus:border-orange-400" value={credenciales.user} onChange={(e) => setCredenciales((prev) => ({ ...prev, user: e.target.value }))} /></label>
                <label className="text-sm font-bold">Contrasena<input className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 font-normal outline-none focus:border-orange-400" value={credenciales.password} onChange={(e) => setCredenciales((prev) => ({ ...prev, password: e.target.value }))} /></label>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button disabled={guardando} onClick={() => evaluar("rechazado")} className="boton inline-flex items-center justify-center border border-red-500/30 bg-red-600/20 text-red-100 hover:bg-red-600/30 disabled:opacity-60"><XCircle className="h-4 w-4" /> Rechazar</button>
              <button disabled={guardando} onClick={() => evaluar("aprobado")} className="boton inline-flex items-center justify-center border border-green-500/30 bg-green-600/20 text-green-100 hover:bg-green-600/30 disabled:opacity-60">{guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Contratar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
