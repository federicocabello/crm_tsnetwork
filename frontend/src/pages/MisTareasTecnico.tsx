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
    <div className="h-full min-h-0 overflow-y-auto px-1 pr-3 sm:pr-4">
      <section className="space-y-3 pb-6">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2 text-orange-300">
              <UserRoundCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase">Mi trabajo</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">Mis tareas</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="max-w-40 truncate text-right text-xs font-semibold text-white/50 sm:max-w-none sm:text-sm">{user?.fullname}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copiarLista()}
                aria-label="Copiar tareas de hoy"
                title="Copiar tareas de hoy"
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition active:scale-95 ${estadoCopia === "copiado" ? "border-green-500/40 bg-green-500/15 text-green-300" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}>
                {estadoCopia === "copiado" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{estadoCopia === "copiado" ? "Copiado" : estadoCopia === "error" ? "Error" : "Copiar"}</span>
              </button>
            </div>
            <span className="sr-only" role="status" aria-live="polite">
              {estadoCopia === "copiado" ? "Tareas de hoy copiadas" : estadoCopia === "error" ? "No se pudo copiar la lista" : ""}
            </span>
          </div>
        </header>

        {secciones.map((seccion) => {
          const cerrada = seccionesCerradas.has(seccion.key);
          const totalPaginas = Math.max(1, Math.ceil(seccion.tareas.length / TAREAS_POR_PAGINA));
          const paginaActual = Math.min(paginas[seccion.key], totalPaginas);
          const inicioPagina = (paginaActual - 1) * TAREAS_POR_PAGINA;
          const tareasPaginadas = seccion.tareas.slice(inicioPagina, inicioPagina + TAREAS_POR_PAGINA);
          return (
            <section key={seccion.key} className="border-b border-white/10 pb-3 last:border-0">
              <button
                type="button"
                onClick={() => alternarSeccion(seccion.key)}
                aria-expanded={!cerrada}
                className="mb-2 flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left active:bg-white/5">
                {seccion.alerta ? <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" /> : <CalendarDays className="h-5 w-5 shrink-0 text-orange-300" />}
                <h2 className={`flex-1 text-lg font-black ${seccion.alerta ? "text-red-300" : "text-white"}`}>{seccion.titulo}</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-black text-white/60">{seccion.tareas.length}</span>
                <ChevronDown className={`h-5 w-5 text-white/45 transition-transform ${cerrada ? "-rotate-90" : ""}`} />
              </button>

              {!cerrada && (seccion.tareas.length === 0 ? (
                <p className="px-1 py-3 text-sm text-white/40">No hay tareas en este grupo.</p>
              ) : (
                <div className="space-y-2">
                  {tareasPaginadas.map((tarea) => (
                    <button
                      key={tarea.idcita}
                      type="button"
                      onClick={() => navigate(`/inicio?dia=${tarea.dia}`, { state: { citaResaltada: String(tarea.idcita) } })}
                      className={`grid min-h-11 w-full grid-cols-1 gap-3 rounded-lg border p-3 text-left transition active:bg-white/10 md:grid-cols-[100px_minmax(180px,1fr)_160px_minmax(180px,1fr)] md:items-center ${seccion.alerta ? "border-red-500/25 bg-red-500/[0.07]" : "border-white/10 bg-white/5"}`}>
                      <span className="flex items-center justify-between gap-3 md:block">
                        <span className="inline-flex items-center gap-2 text-sm font-black text-orange-200">
                          <Clock className="h-4 w-4" />
                          {tarea.hora_format || tarea.hora || "Sin hora"}
                        </span>
                        <span className="text-xs font-bold text-white/45 md:mt-1 md:block">{fechaCorta(tarea.dia)}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block break-words font-black text-white">{tarea.nombre}</span>
                        <span className="text-xs font-bold text-white/45">{tipoLabel(tarea.tipo)}</span>
                      </span>
                      <span className="justify-self-start rounded-full border px-2 py-1 text-[11px] font-black text-white md:justify-self-auto" style={{ borderColor: tarea.color, backgroundColor: `${tarea.color}55` }}>{tarea.estado}</span>
                      <span className="min-w-0 space-y-1 text-xs text-white/55">
                        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{tarea.telefono || "Sin teléfono"}</span></span>
                        <span className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{tarea.direccion || "Sin dirección"}</span></span>
                      </span>
                    </button>
                  ))}
                  {totalPaginas > 1 && (
                    <div className="flex flex-col gap-2 px-1 pt-1 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Mostrando {inicioPagina + 1}-{Math.min(inicioPagina + TAREAS_POR_PAGINA, seccion.tareas.length)} de {seccion.tareas.length}
                      </span>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <button
                          type="button"
                          aria-label={`Página anterior de ${seccion.titulo}`}
                          disabled={paginaActual === 1}
                          onClick={() => cambiarPagina(seccion.key, paginaActual - 1)}
                          className="rounded-lg border border-white/10 p-2 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-24 text-center font-bold text-white/70">
                          Página {paginaActual} de {totalPaginas}
                        </span>
                        <button
                          type="button"
                          aria-label={`Página siguiente de ${seccion.titulo}`}
                          disabled={paginaActual === totalPaginas}
                          onClick={() => cambiarPagina(seccion.key, paginaActual + 1)}
                          className="rounded-lg border border-white/10 p-2 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
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