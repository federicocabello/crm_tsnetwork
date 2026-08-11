import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  ListTodo,
  MapPin,
  Phone,
  Search,
  User,
  X,
} from "lucide-react";
import Loading from "../components/Loading";
import { useAuth } from "../auth/AuthContext";

type RegistroTarea = {
  idcita: number;
  idcliente: number;
  nombre: string;
  dia: string;
  hora: string;
  hora_format: string;
  notas: string | null;
  idagente: number;
  fullname: string;
  tipo: string;
  idestado: string;
  estado: string;
  color: string;
  telefono: string;
  direccion: string;
};

type EstadoCita = {
  id: string;
  estado: string;
  color: string;
};

type Usuario = {
  id: number;
  fullname: string;
};

type RegistrosResponse = {
  registros: RegistroTarea[];
  estados: EstadoCita[];
  usuarios: Usuario[];
};

type FiltroTipo = string;

function formatDate(dateKey: string) {
  if (!dateKey) return "Sin fecha";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString("es-AR", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function getTipoLabel(tipo: string) {
  const value = (tipo || "").toLowerCase();
  if (value.includes("soporte")) return "Soporte";
  if (value.includes("instalacion") || value.includes("instalación") || value.includes("desdecero")) return "Instalacion";
  if (value.includes("internet")) return "Internet";
  if (value.includes("camara")) return "Camaras";
  return tipo || "Registro";
}

function getTareaKey(label: string) {
  return (label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "registro";
}

function normalizarBusqueda(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isTipo(registro: RegistroTarea, filtro: FiltroTipo) {
  const notas = (registro.notas || "").trim();

  if (filtro === "todos") return true;
  if (filtro === "con-nota") return Boolean(notas);
  return getTareaKey(getTipoLabel(registro.tipo)) === filtro;
}

function isOverdue(registro: RegistroTarea) {
  if (!registro.dia) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = registro.dia.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setHours(0, 0, 0, 0);
  return date < today && String(registro.idestado) !== "9";
}

export default function Registros() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<RegistroTarea[]>([]);
  const [estados, setEstados] = useState<EstadoCita[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [estado, setEstado] = useState("todos");
  const [agente, setAgente] = useState("todos");

  useEffect(() => {
    const cargarRegistros = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/tareas/registros`);
        if (!res.ok) throw new Error("No se pudieron cargar los registros");
        const data: RegistrosResponse = await res.json();
        setRegistros(data.registros ?? []);
        setEstados(data.estados ?? []);
        setUsuarios(data.usuarios ?? []);
      } catch (error) {
        console.error("Error cargando registros:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarRegistros();
  }, [API_URL]);

  const registrosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(query);
    const palabras = q.split(/\s+/).filter(Boolean);
    const querySoloDigitos = query.replace(/\D/g, "");
    const esBusquedaTelefonica = Boolean(querySoloDigitos) && /^[\d\s()+.-]+$/.test(query.trim());

    return registros
      .filter((registro) => {
        if (user?.rol === "tecnico" && Number(registro.idagente) !== Number(user.id)) return false;
        if (!isTipo(registro, tipo)) return false;
        if (estado !== "todos" && String(registro.idestado) !== estado) return false;
        if (agente !== "todos" && String(registro.idagente) !== agente) return false;
        if (!q) return true;

        const nombreCompleto = normalizarBusqueda(registro.nombre);
        const domicilioCompleto = normalizarBusqueda(registro.direccion);
        if (
          palabras.every((palabra) => nombreCompleto.includes(palabra)) ||
          palabras.every((palabra) => domicilioCompleto.includes(palabra))
        ) {
          return true;
        }

        const telefonoSoloDigitos = String(registro.telefono || "").replace(/\D/g, "");
        if (esBusquedaTelefonica && telefonoSoloDigitos.includes(querySoloDigitos)) return true;

        return [
          registro.notas,
          registro.fullname,
          registro.estado,
          registro.tipo,
        ]
          .filter(Boolean)
          .some((value) => normalizarBusqueda(value).includes(q));
      })
      .sort((a, b) => {
        const fechaA = `${a.dia || ""} ${a.hora || "00:00"}`;
        const fechaB = `${b.dia || ""} ${b.hora || "00:00"}`;
        return fechaB.localeCompare(fechaA);
      });
  }, [agente, estado, query, registros, tipo, user]);



  const limpiarFiltros = () => {
    setQuery("");
    setTipo("todos");
    setEstado("todos");
    setAgente("todos");
  };

  if (loading) return <Loading />;

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-4">
      <section className="space-y-4 pb-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 xl:flex-row xl:items-center xl:justify-between">
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-orange-300">
              <ListTodo className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wide">Registros</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Registros</h1>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_170px_200px_auto]">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-orange-500/40">
              <Search className="h-4 w-4 shrink-0 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente, telefono, direccion o nota"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
            </label>

            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500/40">
              <option value="todos">Todos los registros</option>
              <option value="instalacion">Instalacion</option>
              <option value="soporte">Soporte</option>
            </select>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500/40">
              <option value="todos">Todos los estados</option>
              {estados.map((item) => (
                <option key={item.id} value={item.id}>{item.estado}</option>
              ))}
            </select>

            <select
              value={agente}
              onChange={(e) => setAgente(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500/40">
              <option value="todos">Todos los agentes</option>
              {usuarios.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white/75 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200">
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>

        {registrosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55">
            <Filter className="mx-auto mb-3 h-8 w-8 text-white/35" />
            No hay registros para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {registrosFiltrados.map((registro) => {
              const atrasada = isOverdue(registro);

              return (
                <article
                  key={registro.idcita}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/inicio?dia=${registro.dia}`, { state: { citaResaltada: String(registro.idcita) } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/inicio?dia=${registro.dia}`, { state: { citaResaltada: String(registro.idcita) } });
                  }}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 transition hover:border-orange-500/25 hover:bg-white/[0.07]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-orange-200">
                          {getTipoLabel(registro.tipo)}
                        </span>
                        <span
                          className="rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white"
                          style={{ backgroundColor: `${registro.color}55`, borderColor: registro.color }}>
                          {registro.estado}
                        </span>
                        {atrasada && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-red-200">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Vencida
                          </span>
                        )}
                      </div>

                      <div className="mt-3 truncate text-lg font-black text-white">
                        {registro.nombre}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2 text-sm font-bold text-white">
                        <CalendarDays className="h-4 w-4 text-orange-300" />
                        {formatDate(registro.dia)}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-2 text-xs font-semibold text-white/55">
                        <Clock className="h-3.5 w-3.5" />
                        {registro.hora_format || registro.hora}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/70 md:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2">
                      <User className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="truncate">{registro.fullname}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2">
                      <Phone className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="truncate">{registro.telefono || "Sin telefono"}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 md:col-span-2">
                      <MapPin className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="truncate">{registro.direccion || "Sin direccion"}</span>
                    </div>
                  </div>

                  {registro.notas?.trim() ? (
                    <p className="mt-3 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm leading-relaxed text-white/75">
                      {registro.notas}
                    </p>
                  ) : (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/30 px-3 py-2 text-xs font-semibold text-white/40">
                      <CheckCircle2 className="h-4 w-4" />
                      Sin notas cargadas
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
