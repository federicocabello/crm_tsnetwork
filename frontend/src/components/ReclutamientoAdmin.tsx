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
  pendiente: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]",
  aprobado: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
  rechazado: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
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
    <div className="cuadro min-w-0">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1>Reclutamiento</h1>
          <p className="text-sm text-[var(--text-3)]">Postulaciones tecnicas recibidas desde el formulario publico.</p>
        </div>
        <button onClick={cargar} className="boton inline-flex items-center justify-center border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)]">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-soft)] p-3"><p className="text-xs text-[var(--warning)]">Pendientes</p><strong className="text-2xl text-[var(--text-1)]">{resumen.pendientes}</strong></div>
        <div className="rounded-lg border border-[var(--success)] bg-[var(--success-soft)] p-3"><p className="text-xs text-[var(--success)]">Aprobadas</p><strong className="text-2xl text-[var(--text-1)]">{resumen.aprobadas}</strong></div>
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-3"><p className="text-xs text-[var(--danger)]">Rechazadas</p><strong className="text-2xl text-[var(--text-1)]">{resumen.rechazadas}</strong></div>
      </div>

      {error && <p className="mb-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" /></div>
      ) : postulaciones.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-8 text-center text-[var(--text-3)]">No hay postulaciones todavia.</div>
      ) : (
        <div className="table-wrap">
          <table className="table table-mobile-cards min-w-full sm:min-w-[760px]">
            <thead className="bg-[var(--surface-raised)] text-left text-[var(--text-2)]">
              <tr><th className="px-4 py-3">Postulante</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody>
              {postulaciones.map((postulacion) => (
                <tr key={postulacion.id} className="border-t border-[var(--border)]">
                  <td data-label="Postulante" className="px-4 py-3"><div className="min-w-0"><strong>{postulacion.nombre}</strong><p className="text-xs text-[var(--text-3)]">{postulacion.direccion}</p></div></td>
                  <td data-label="Contacto" className="px-4 py-3"><div className="min-w-0"><p className="break-all">{postulacion.email}</p><p className="text-xs text-[var(--text-3)]">{postulacion.telefono}</p></div></td>
                  <td data-label="Fecha" className="px-4 py-3 text-[var(--text-3)]">{postulacion.fecha_postulacion}</td>
                  <td data-label="Estado" className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${estadoClass[postulacion.estado]}`}>{postulacion.estado}</span></td>
                  <td data-label="Acciones" className="px-4 py-3 text-right"><button className="boton inline-flex items-center justify-center border border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)] hover:border-[var(--primary)]" onClick={() => abrir(postulacion)}><Eye className="h-4 w-4" /> Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div role="dialog" aria-modal="true" aria-label={`Evaluar a ${seleccionada.nombre}`} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:max-h-[90dvh] sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-black">{seleccionada.nombre}</h2><p className="text-sm text-[var(--text-3)]">{seleccionada.email} - {seleccionada.telefono}</p></div>
              <button className="boton border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-raised)]" onClick={() => setSeleccionada(null)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3"><p className="text-xs text-[var(--text-3)]">Direccion</p><p className="font-semibold">{seleccionada.direccion}</p></div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3"><p className="text-xs text-[var(--text-3)]">Estado</p><p className="font-semibold capitalize">{seleccionada.estado}</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3"><p className="text-xs text-[var(--text-3)]">Experiencia</p><p className="whitespace-pre-wrap text-sm">{seleccionada.experiencia || "Sin experiencia registrada."}</p></div>

            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
              <p className="mb-2 text-xs text-[var(--text-3)]">Respuestas</p>
              <div className="space-y-2">
                {Object.entries(seleccionada.respuestas || {}).map(([key, value]) => <div key={key} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2"><p className="text-xs font-bold uppercase text-[var(--primary)]">{key.replace(/_/g, " ")}</p><p className="text-sm text-[var(--text-2)]">{value}</p></div>)}
              </div>
            </div>

            <label className="mt-4 block text-sm font-bold">Comentarios de evaluacion<textarea className="mt-2 min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 font-normal outline-none focus:border-orange-400" value={comentarios} onChange={(e) => setComentarios(e.target.value)} /></label>

            {seleccionada.estado !== "aprobado" && (
              <div className="mt-4 grid gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3 md:grid-cols-2">
                <label className="text-sm font-bold">Usuario tecnico<input className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-normal outline-none focus:border-orange-400" value={credenciales.user} onChange={(e) => setCredenciales((prev) => ({ ...prev, user: e.target.value }))} /></label>
                <label className="text-sm font-bold">Contrasena<input type="password" autoComplete="new-password" className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-normal outline-none focus:border-orange-400" value={credenciales.password} onChange={(e) => setCredenciales((prev) => ({ ...prev, password: e.target.value }))} /></label>
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button disabled={guardando} onClick={() => evaluar("rechazado")} className="btn-danger w-full sm:w-auto"><XCircle className="h-4 w-4" /> Rechazar</button>
              <button disabled={guardando} onClick={() => evaluar("aprobado")} className="boton inline-flex w-full items-center justify-center border border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success)] hover:text-[var(--text-inverse)] disabled:opacity-60 sm:w-auto">{guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Contratar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
