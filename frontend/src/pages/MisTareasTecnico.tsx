import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, MapPin, Phone, UserRoundCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Loading from "../components/Loading";

type Tarea = {
  idcita: number;
  nombre: string;
  dia: string;
  hora: string;
  hora_format: string;
  idagente: number;
  tipo: string;
  idestado: string;
  estado: string;
  color: string;
  telefono: string;
  direccion: string;
};

type SeccionKey = "hoy" | "manana" | "proximas" | "atrasadas";

const TAREAS_POR_PAGINA = 10;

function fechaKey(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function fechaCorta(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function minutos(hora: string) {
  const [hours, minutes] = (hora || "23:59").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function tipoLabel(tipo: string) {
  const value = (tipo || "").toLowerCase();
  if (value.includes("soporte")) return "Soporte";
  if (value.includes("internet")) return "Internet";
  if (value.includes("instalacion") || value.includes("desdecero")) return "Instalación";
  return "Cámaras";
}

async function copiarAlPortapapeles(texto: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copiado = document.execCommand("copy");
  textarea.remove();
  if (!copiado) throw new Error("No se pudo copiar la lista");
}

export default function MisTareasTecnico() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [seccionesCerradas, setSeccionesCerradas] = useState<Set<string>>(() => new Set());
  const [paginas, setPaginas] = useState<Record<SeccionKey, number>>({
    hoy: 1,
    manana: 1,
    proximas: 1,
    atrasadas: 1,
  });
  const [estadoCopia, setEstadoCopia] = useState<"idle" | "copiado" | "error">("idle");

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await fetch(`${API_URL}/api/tareas/registros`);
        if (!response.ok) throw new Error("No se pudieron cargar las tareas");
        const data = await response.json();
        setTareas(data.registros ?? []);
      } catch (error) {
        console.error("Error cargando tareas del técnico:", error);
      } finally {
        setLoading(false);
      }
    };
    void cargar();
  }, [API_URL]);

  const grupos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const hoyKey = fechaKey(hoy);
    const mananaKey = fechaKey(manana);
    const propias = tareas
      .filter((tarea) => Number(tarea.idagente) === Number(user?.id))
      .filter((tarea) => String(tarea.idestado) !== "9");
    const porFechaYHora = (a: Tarea, b: Tarea) =>
      a.dia.localeCompare(b.dia) || minutos(a.hora) - minutos(b.hora);

    return {
      hoy: propias.filter((tarea) => tarea.dia === hoyKey).sort(porFechaYHora),
      manana: propias.filter((tarea) => tarea.dia === mananaKey).sort(porFechaYHora),
      proximas: propias.filter((tarea) => tarea.dia > mananaKey).sort(porFechaYHora),
      atrasadas: propias
        .filter((tarea) => tarea.dia < hoyKey)
        .sort((a, b) => b.dia.localeCompare(a.dia) || minutos(a.hora) - minutos(b.hora)),
    };
  }, [tareas, user?.id]);

  const alternarSeccion = (key: string) => {
    setSeccionesCerradas((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(key)) siguientes.delete(key);
      else siguientes.add(key);
      return siguientes;
    });
  };

  const cambiarPagina = (seccion: SeccionKey, pagina: number) => {
    setPaginas((actuales) => ({ ...actuales, [seccion]: pagina }));
  };

  if (loading) return <Loading />;

  const secciones = [
    { key: "hoy", titulo: "Hoy", tareas: grupos.hoy, alerta: false },
    { key: "manana", titulo: "Mañana", tareas: grupos.manana, alerta: false },
    { key: "proximas", titulo: "Próximas", tareas: grupos.proximas, alerta: false },
    { key: "atrasadas", titulo: "Atrasadas", tareas: grupos.atrasadas, alerta: true },
  ] as const;

  const crearTextoLista = () => {
    const tareasDeHoy = grupos.hoy;
    const encabezado = [
      `*Tareas de hoy (${tareasDeHoy.length})*`,
      user?.fullname ? `Asignado a: ${user.fullname}` : "",
      `Fecha: ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`,
    ].filter(Boolean);

    if (tareasDeHoy.length === 0) {
      return [...encabezado, "", "No hay tareas para hoy."].join("\n");
    }

    const detalle = tareasDeHoy.map((tarea, indice) =>
      [
        `${indice + 1}. ${tarea.hora_format || tarea.hora || "Sin hora"} - *${tarea.nombre}*`,
        `   ${tipoLabel(tarea.tipo)} | ${tarea.estado}`,
        `   Tel: ${tarea.telefono || "Sin teléfono"}`,
        `   Dirección: ${tarea.direccion || "Sin dirección"}`,
      ].join("\n"),
    );

    return [...encabezado, "", ...detalle].join("\n");
  };

  const copiarLista = async () => {
    try {
      await copiarAlPortapapeles(crearTextoLista());
      setEstadoCopia("copiado");
    } catch (error) {
      console.error("Error copiando las tareas de hoy:", error);
      setEstadoCopia("error");
    }
    window.setTimeout(() => setEstadoCopia("idle"), 2500);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto px-1 pr-2 sm:pr-4">
      <section className="space-y-4 pb-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--bg-border)] pb-3">
          <div>
            <div className="flex items-center gap-2 text-orange-500 font-extrabold text-xs uppercase tracking-wider">
              <UserRoundCheck className="h-4 w-4" />
              <span>Mi Trabajo Diario</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)]">Mis Tareas Asignadas</h1>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs font-extrabold text-[var(--text-muted)]">{user?.fullname}</span>
            <button
              type="button"
              onClick={() => void copiarLista()}
              aria-label="Copiar tareas de hoy"
              title="Copiar tareas de hoy"
              className={`btn-secondary py-2 px-3 text-xs font-black transition ${
                estadoCopia === "copiado"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : ""
              }`}>
              {estadoCopia === "copiado" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{estadoCopia === "copiado" ? "¡Lista Copiada!" : estadoCopia === "error" ? "Error" : "Copiar Tareas de Hoy"}</span>
            </button>
          </div>
        </header>

        {secciones.map((seccion) => {
          const cerrada = seccionesCerradas.has(seccion.key);
          const totalPaginas = Math.max(1, Math.ceil(seccion.tareas.length / TAREAS_POR_PAGINA));
          const paginaActual = Math.min(paginas[seccion.key], totalPaginas);
          const inicioPagina = (paginaActual - 1) * TAREAS_POR_PAGINA;
          const tareasPaginadas = seccion.tareas.slice(inicioPagina, inicioPagina + TAREAS_POR_PAGINA);
          
          return (
            <section key={seccion.key} className="border-b border-[var(--bg-border)] pb-4 last:border-0">
              <button
                type="button"
                onClick={() => alternarSeccion(seccion.key)}
                aria-expanded={!cerrada}
                className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-[var(--color-primary-l)] transition cursor-pointer">
                {seccion.alerta ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                ) : (
                  <CalendarDays className="h-5 w-5 shrink-0 text-orange-500" />
                )}
                <h2 className={`flex-1 text-lg font-black ${seccion.alerta ? "text-red-500" : "text-[var(--text-primary)]"}`}>
                  {seccion.titulo}
                </h2>
                <span className="rounded-full bg-[var(--bg-surface-2)] border border-[var(--bg-border)] px-2.5 py-0.5 text-xs font-black text-[var(--text-primary)]">
                  {seccion.tareas.length}
                </span>
                <ChevronDown className={`h-5 w-5 text-[var(--text-muted)] transition-transform duration-200 ${cerrada ? "-rotate-90" : ""}`} />
              </button>

              {!cerrada && (seccion.tareas.length === 0 ? (
                <p className="px-3 py-4 text-xs font-semibold text-[var(--text-muted)] italic bg-[var(--bg-surface-2)] rounded-xl border border-[var(--bg-border)]">
                  No hay tareas programadas en este grupo.
                </p>
              ) : (
                <div className="space-y-3">
                  {tareasPaginadas.map((tarea) => (
                    <div
                      key={tarea.idcita}
                      onClick={() => navigate(`/inicio?dia=${tarea.dia}`, { state: { citaResaltada: String(tarea.idcita) } })}
                      style={{ borderLeftColor: tarea.color || '#ea580c', borderLeftWidth: '6px' }}
                      className={`card-event w-full rounded-2xl border-2 border-[var(--card-border)] p-3.5 sm:p-4 text-left transition hover:-translate-y-0.5 cursor-pointer shadow-sm ${
                        seccion.alerta ? "bg-red-500/[0.04] border-red-500/40" : ""
                      }`}>
                      
                      {/* FILA 1: HORA + FECHA + BADGE ESTADO */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--bg-border)] mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 dark:text-orange-300 bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 rounded-lg">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {tarea.hora_format || tarea.hora || "Sin hora"}
                          </span>
                          <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-2)] border border-[var(--bg-border)] px-2 py-0.5 rounded-md">
                            {fechaCorta(tarea.dia)}
                          </span>
                        </div>

                        <span
                          className="rounded-full px-3 py-1 text-xs font-black text-white text-center shadow-xs"
                          style={{ backgroundColor: tarea.color || '#ea580c' }}>
                          {tarea.estado}
                        </span>
                      </div>

                      {/* FILA 2: NOMBRE CLIENTE Y TIPO SERVICIO */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                        <h3 className="font-black text-base text-[var(--text-primary)] tracking-tight">
                          {tarea.nombre}
                        </h3>
                        <span className="inline-flex items-center text-xs font-black text-orange-500 uppercase tracking-wider">
                          {tipoLabel(tarea.tipo)}
                        </span>
                      </div>

                      {/* FILA 3: TELÉFONO Y DIRECCIÓN CON ICONOS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] font-semibold pt-2 border-t border-[var(--bg-border)]/60">
                        {tarea.telefono && (
                          <a
                            href={`tel:${tarea.telefono}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 hover:text-orange-500 transition">
                            <Phone className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                            <span className="break-all font-mono font-bold">{tarea.telefono}</span>
                          </a>
                        )}
                        {tarea.direccion && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                            <span className="break-words leading-tight">{tarea.direccion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {totalPaginas > 1 && (
                    <div className="flex flex-col gap-2 px-1 pt-2 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Mostrando {inicioPagina + 1}-{Math.min(inicioPagina + TAREAS_POR_PAGINA, seccion.tareas.length)} de {seccion.tareas.length}
                      </span>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <button
                          type="button"
                          aria-label={`Página anterior de ${seccion.titulo}`}
                          disabled={paginaActual === 1}
                          onClick={() => cambiarPagina(seccion.key, paginaActual - 1)}
                          className="btn-icon p-1.5 disabled:opacity-30">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-24 text-center font-bold text-[var(--text-primary)]">
                          Página {paginaActual} de {totalPaginas}
                        </span>
                        <button
                          type="button"
                          aria-label={`Página siguiente de ${seccion.titulo}`}
                          disabled={paginaActual === totalPaginas}
                          onClick={() => cambiarPagina(seccion.key, paginaActual + 1)}
                          className="btn-icon p-1.5 disabled:opacity-30">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          );
        })}
      </section>
    </div>
  );
}
