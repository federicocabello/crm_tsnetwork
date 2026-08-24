import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Globe,
  ListTodo,
  MapPin,
  Phone,
  Plus,
  Repeat2,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import Loading from "../components/Loading";
import { useAuth } from "../auth/AuthContext";
import { getToken } from "../lib/api";

type Categoria = "general" | "internet" | "camaras";
type Frecuencia = "semanal" | "mensual";
type Usuario = { id: number; fullname: string };
type Tarea = {
  id: string;
  origen: "cita" | "programada";
  nombre: string;
  telefono: string;
  direccion: string;
  tarea: string;
  categoria: Categoria;
  dia: string;
  hora: string;
  hora_format: string;
  fullname: string;
  frecuencia: Frecuencia | null;
};
type Configuracion = {
  id: number;
  tarea: string;
  cliente: string | null;
  categoria: Categoria;
  frecuencia: Frecuencia;
  fecha_inicio: string;
  fecha_fin: string | null;
  hora: string;
  fullname: string;
};
type Formulario = {
  tarea: string;
  cliente: string;
  telefono: string;
  direccion: string;
  categoria: Categoria;
  frecuencia: Frecuencia;
  fecha_inicio: string;
  fecha_fin: string;
  hora: string;
  asignado: string;
};

const fechaKey = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
const moverDias = (dias: number) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fechaKey(fecha);
};
const hoyKey = fechaKey(new Date());
const TAREAS_POR_PAGINA = 10;
const inicial: Formulario = {
  tarea: "",
  cliente: "",
  telefono: "",
  direccion: "",
  categoria: "general",
  frecuencia: "semanal",
  fecha_inicio: fechaKey(new Date()),
  fecha_fin: "",
  hora: "09:00",
  asignado: "",
};
const claseEntrada =
  "mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-normal outline-none focus:border-orange-500/50";

function fechaLegible(valor: string) {
  const [anio, mes, dia] = valor.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

const etiquetaCategoria = (valor: Categoria) =>
  valor === "internet"
    ? "Internet"
    : valor === "camaras"
      ? "Cámaras"
      : "General";

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

export default function TareasResumen() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const administra =
    user?.rol === "administrador" || user?.rol === "superadmin";
  const [desde, setDesde] = useState(moverDias(-7));
  const [hasta, setHasta] = useState(moverDias(120));
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<"todas" | Categoria>("todas");
  const [soloDelDia, setSoloDelDia] = useState(true);
  const [soloRecurrentes, setSoloRecurrentes] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState<Formulario>(inicial);
  const [estadoCopia, setEstadoCopia] = useState<"idle" | "copiado" | "error">("idle");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/api/tareas-programadas?desde=${desde}&hasta=${hasta}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudieron cargar las tareas");
      setTareas(data.tareas ?? []);
      setConfiguraciones(data.configuraciones ?? []);
      setUsuarios(data.usuarios ?? []);
      setFormulario((actual) => ({
        ...actual,
        asignado: actual.asignado || String(data.usuarios?.[0]?.id || ""),
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar las tareas",
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL, desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(
    () =>
      tareas.filter((item) => {
        if (soloDelDia && item.dia !== hoyKey) return false;
        if (categoria !== "todas" && item.categoria !== categoria) return false;
        if (soloRecurrentes && item.origen !== "programada") return false;
        const texto = query.trim().toLowerCase();
        return (
          !texto ||
          [
            item.nombre,
            item.telefono,
            item.direccion,
            item.tarea,
            item.fullname,
          ].some((valor) =>
            String(valor || "")
              .toLowerCase()
              .includes(texto),
          )
        );
      }),
    [categoria, query, soloDelDia, soloRecurrentes, tareas],
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(visibles.length / TAREAS_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * TAREAS_POR_PAGINA;
  const tareasPaginadas = visibles.slice(
    inicioPagina,
    inicioPagina + TAREAS_POR_PAGINA,
  );

  const crearTextoLista = () => {
    const tareasDeHoy = tareas.filter((item) => item.dia === hoyKey);
    const encabezado = [
      `*Tareas de hoy (${tareasDeHoy.length})*`,
      `Fecha: ${new Date().toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}`,
    ];

    if (tareasDeHoy.length === 0) {
      return [...encabezado, "", "No hay tareas para hoy."].join("\n");
    }

    const detalle = tareasDeHoy.map((item, indice) =>
      [
        `${indice + 1}. ${item.hora_format || item.hora || "Sin hora"} - *${item.nombre || "Sin cliente"}*`,
        `   ${item.tarea} | ${etiquetaCategoria(item.categoria)}`,
        `   Responsable: ${item.fullname || "Sin asignar"}`,
        `   Tel: ${item.telefono || "Sin teléfono"}`,
        `   Dirección: ${item.direccion || "Sin dirección"}`,
      ].join("\n"),
    );

    return [...encabezado, "", ...detalle].join("\n");
  };

  const copiarLista = async () => {
    try {
      await copiarAlPortapapeles(crearTextoLista());
      setEstadoCopia("copiado");
    } catch (err) {
      console.error("Error copiando las tareas de hoy:", err);
      setEstadoCopia("error");
    }
    window.setTimeout(() => setEstadoCopia("idle"), 2500);
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/tareas-programadas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken() || ""}`,
        },
        body: JSON.stringify(formulario),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo guardar la tarea");
      setModal(false);
      setFormulario({ ...inicial, asignado: formulario.asignado });
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la tarea",
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (item: Configuracion) => {
    if (!confirm(`¿Eliminar la recurrencia “${item.tarea}”?`)) return;
    try {
      const response = await fetch(
        `${API_URL}/api/tareas-programadas/${item.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken() || ""}` },
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo eliminar la tarea");
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar la tarea",
      );
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-4">
      <section className="space-y-4 pb-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-orange-300">
                <ListTodo className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Vista resumida
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black">Tareas</h1>
              <p className="mt-1 text-sm text-white/50">
                Citas de clientes y actividades recurrentes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copiarLista()}
                disabled={loading}
                aria-label="Copiar tareas de hoy"
                title="Copiar tareas de hoy"
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${estadoCopia === "copiado" ? "border-green-500/40 bg-green-500/15 text-green-300" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}>
                {estadoCopia === "copiado" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {estadoCopia === "copiado" ? "Copiado" : estadoCopia === "error" ? "Error" : "Copiar"}
              </button>
              {administra && (
                <button
                  onClick={() => setModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-black hover:bg-orange-500">
                  <Plus className="h-4 w-4" />
                  Nueva tarea recurrente
                </button>
              )}
              <span className="sr-only" role="status" aria-live="polite">
                {estadoCopia === "copiado" ? "Tareas de hoy copiadas" : estadoCopia === "error" ? "No se pudo copiar la lista" : ""}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px_auto_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPagina(1);
                }}
                placeholder="Cliente, teléfono, dirección o tarea"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <input
              aria-label="Desde"
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setSoloDelDia(false);
                setPagina(1);
              }}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
            />
            <input
              aria-label="Hasta"
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setSoloDelDia(false);
                setPagina(1);
              }}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
            />
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value as "todas" | Categoria);
                setPagina(1);
              }}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm">
              <option value="todas">Todas las áreas</option>
              <option value="internet">Internet</option>
              <option value="camaras">Cámaras</option>
              <option value="general">General</option>
            </select>
            <button
              onClick={() => {
                setSoloDelDia((valor) => !valor);
                setPagina(1);
              }}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${soloDelDia ? "border-orange-400/50 bg-orange-500/20 text-orange-100" : "border-white/10 bg-white/5 text-white/65"}`}>
              <CalendarDays className="h-4 w-4" />
              {soloDelDia ? "Hoy" : "Todo el rango"}
            </button>
            <button
              onClick={() => {
                setSoloRecurrentes((valor) => !valor);
                setPagina(1);
              }}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${soloRecurrentes ? "border-purple-400/50 bg-purple-500/20 text-purple-200" : "border-white/10 bg-white/5 text-white/65"}`}>
              <Repeat2 className="h-4 w-4" />
              Recurrentes
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}
        {administra && configuraciones.length > 0 && (
          <section className="rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] p-4">
            <h2 className="flex items-center gap-2 font-black text-purple-100">
              <Repeat2 className="h-4 w-4" />
              Recurrencias configuradas
            </h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {configuraciones.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/35 p-3">
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-black">{item.tarea}</div>
                    <div className="mt-1 text-xs text-white/45">
                      {item.frecuencia} · {item.hora} · {item.fullname}
                    </div>
                  </div>
                  <button
                    onClick={() => void eliminar(item)}
                    title="Eliminar recurrencia"
                    className="rounded-lg p-2 text-red-300 hover:bg-red-500/15">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {loading ? (
          <Loading />
        ) : visibles.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/45">
            {soloDelDia
              ? "No hay tareas para hoy."
              : "No hay tareas en el rango seleccionado."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="hidden grid-cols-[150px_minmax(210px,1fr)_minmax(230px,1.2fr)_150px] gap-4 border-b border-white/10 bg-zinc-900/70 px-4 py-3 text-xs font-black uppercase text-white/45 lg:grid">
              <span>Fecha</span>
              <span>Cliente</span>
              <span>Tarea</span>
              <span>Área</span>
            </div>
            {tareasPaginadas.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-0 lg:grid-cols-[150px_minmax(210px,1fr)_minmax(230px,1.2fr)_150px] lg:items-center lg:gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-orange-200">
                    <CalendarDays className="h-4 w-4" />
                    {fechaLegible(item.dia)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                    <Clock className="h-3.5 w-3.5" />
                    {item.hora_format || item.hora}
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 font-black">
                    <User className="h-4 w-4 text-white/40" />
                    <span className="truncate">
                      {item.nombre || "Tarea interna"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <Phone className="h-3.5 w-3.5" />
                    {item.telefono || "Sin teléfono"}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-white/55">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{item.direccion || "Sin dirección"}</span>
                  </div>
                </div>
                <div>
                  <div className="font-bold">{item.tarea}</div>
                  <div className="mt-1 text-xs text-white/45">
                    Responsable: {item.fullname}
                  </div>
                  {item.frecuencia && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[11px] font-black uppercase text-purple-200">
                      <Repeat2 className="h-3 w-3" />
                      {item.frecuencia}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${item.categoria === "internet" ? "border-orange-400/30 bg-orange-500/10 text-orange-200" : item.categoria === "camaras" ? "border-blue-400/30 bg-blue-500/10 text-blue-200" : "border-white/15 bg-white/5 text-white/65"}`}>
                  {item.categoria === "internet" ? (
                    <Globe className="h-3.5 w-3.5" />
                  ) : item.categoria === "camaras" ? (
                    <Camera className="h-3.5 w-3.5" />
                  ) : (
                    <ListTodo className="h-3.5 w-3.5" />
                  )}
                  {etiquetaCategoria(item.categoria)}
                </span>
              </article>
            ))}
            <div className="flex flex-col gap-3 border-t border-white/10 bg-zinc-950/25 px-4 py-3 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando {inicioPagina + 1}-
                {Math.min(inicioPagina + TAREAS_POR_PAGINA, visibles.length)} de{" "}
                {visibles.length}
              </span>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  aria-label="Pagina anterior"
                  disabled={paginaActual === 1}
                  onClick={() => setPagina(Math.max(1, paginaActual - 1))}
                  className="rounded-lg border border-white/10 p-2 text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-28 text-center font-bold text-white/70">
                  Pagina {paginaActual} de {totalPaginas}
                </span>
                <button
                  type="button"
                  aria-label="Pagina siguiente"
                  disabled={paginaActual === totalPaginas}
                  onClick={() =>
                    setPagina(Math.min(totalPaginas, paginaActual + 1))
                  }
                  className="rounded-lg border border-white/10 p-2 text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardar}
            className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">Nueva tarea recurrente</h2>
                <p className="mt-1 text-sm text-white/45">
                  Aparecerá automáticamente en Tareas y en la agenda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-lg p-2 text-white/55 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Campo titulo="Tarea *" clase="md:col-span-2">
                <input
                  required
                  value={formulario.tarea}
                  onChange={(e) =>
                    setFormulario({ ...formulario, tarea: e.target.value })
                  }
                  placeholder="Ej. Pasar por el buzón"
                  className={claseEntrada}
                />
              </Campo>
              <Campo titulo="Cliente o contacto">
                <input
                  value={formulario.cliente}
                  onChange={(e) =>
                    setFormulario({ ...formulario, cliente: e.target.value })
                  }
                  placeholder="Opcional"
                  className={claseEntrada}
                />
              </Campo>
              <Campo titulo="Teléfono">
                <input
                  value={formulario.telefono}
                  onChange={(e) =>
                    setFormulario({ ...formulario, telefono: e.target.value })
                  }
                  placeholder="Opcional"
                  className={claseEntrada}
                />
              </Campo>
              <Campo titulo="Dirección" clase="md:col-span-2">
                <input
                  value={formulario.direccion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, direccion: e.target.value })
                  }
                  placeholder="Opcional"
                  className={claseEntrada}
                />
              </Campo>
              <Campo titulo="Área">
                <select
                  value={formulario.categoria}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      categoria: e.target.value as Categoria,
                    })
                  }
                  className={claseEntrada}>
                  <option value="general">General</option>
                  <option value="internet">Internet</option>
                  <option value="camaras">Cámaras</option>
                </select>
              </Campo>
              <Campo titulo="Responsable *">
                <select
                  required
                  value={formulario.asignado}
                  onChange={(e) =>
                    setFormulario({ ...formulario, asignado: e.target.value })
                  }
                  className={claseEntrada}>
                  <option value="">Selecciona</option>
                  {usuarios.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullname}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo titulo="Frecuencia *">
                <select
                  value={formulario.frecuencia}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      frecuencia: e.target.value as Frecuencia,
                    })
                  }
                  className={claseEntrada}>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </Campo>
              <Campo titulo="Hora *">
                <input
                  required
                  type="time"
                  value={formulario.hora}
                  onChange={(e) =>
                    setFormulario({ ...formulario, hora: e.target.value })
                  }
                  className={claseEntrada}
                />
              </Campo>
              <Campo titulo="Fecha inicial *">
                <input
                  required
                  type="date"
                  value={formulario.fecha_inicio}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      fecha_inicio: e.target.value,
                    })
                  }
                  className={claseEntrada}
                />
              </Campo>
              <Campo titulo="Fecha final">
                <input
                  type="date"
                  min={formulario.fecha_inicio}
                  value={formulario.fecha_fin}
                  onChange={(e) =>
                    setFormulario({ ...formulario, fecha_fin: e.target.value })
                  }
                  className={claseEntrada}
                />
                <span className="mt-1 block text-xs font-normal text-white/35">
                  Vacía: repetición indefinida.
                </span>
              </Campo>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/65">
                Cancelar
              </button>
              <button
                disabled={guardando}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-black disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar recurrencia"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Campo({
  titulo,
  clase = "",
  children,
}: {
  titulo: string;
  clase?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`text-sm font-bold ${clase}`}>
      {titulo}
      {children}
    </label>
  );
}
