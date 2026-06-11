import { useEffect, useMemo, useState } from "react";
import type { Usuarios } from "../types/auth";
import { useAuth } from "../auth/AuthContext";
import { FilePlusCorner, Cctv, Globe, Home, Phone, User, TriangleAlert, Wrench, Pencil, ListChevronsUpDown, ListChevronsDownUp, FileInput, File, Folder, FolderOpen, UserRoundSearch, CircleCheck } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
//npm install react-datepicker
import { darkenColor } from "../utils/colores";
import Cotizador from "./Cotizador";
import ModalEditarRegistro from "../components/ModalEditarRegistro";
import GaleriaCita from "../components/GaleriaCita";
import EditarDetalles from "../components/EditarDetalles";
import Loading from "../components/Loading";
import { useNavigate } from "react-router-dom";

type AgendaItem = {
  idcita: string;
  idcliente: number;
  nombre: string;
  dia: string;
  hora: string;
  hora_format: string;
  notas: string;
  idagente: number;
  fullname: string;
  tipo: string;
  idestado: string;
  estado: string;
  color: string;
  telefono: string;
  direccion: string;
  idhoja: string;
  tiene_hoja: number;
  detalles: boolean;
  preguntas?: { pregunta: string; respuesta: string }[];
  mostrarImagenes: boolean;
};

type CitasEstados = {
  id: string;
  estado: string;
  color: string;
};

type Cliente = {
  id: number;
  nombre: string;
};

type BuscarCitas = {
  id: string;
  dia: string;
  hora: string;
  dia_original: string;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDays(dateKey: string, delta: number) {
  const d = fromDateKey(dateKey);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

function formatHeader(dateKey: string) {
  const d = fromDateKey(dateKey);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Inicio() {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [selectedDayNuevaCita, setSelectedDayNuevaCita] = useState<string>(todayKey);

  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [openCotizacion, setOpenCotizacion] = useState(false);
  const [idCotizacion, setIdCotizacion] = useState<number | null>(null);
  const [modoCotizacion, setModoCotizacion] = useState<"nuevo" | "editar">("nuevo");
  const [idCitaSeleccionada, setIdCitaSeleccionada] = useState<string | null>(null);
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [items, setItems] = useState<AgendaItem[]>([]);

  const dayItems = useMemo(() => {
    return items
      .filter((i) => i.dia === selectedDay)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [items, selectedDay]);

  const [citasEstados, setCitasEstados] = useState<CitasEstados[]>([]);

  type InicioResponse = {
    usuarios: Usuarios[];
    citas: AgendaItem[];
    citas_estados: CitasEstados[];
    dias: string[];
  };

  const [loading, setLoading] = useState(true);
  const [loading2, setLoading2] = useState(false);

  const cargarInicio = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/inicio`);

      if (res.status === 200) {
        const data: InicioResponse = await res.json();
        const citasConDetalles = data.citas.map((cita) => ({
          ...cita,
          detalles: false,
        }));

        setUsers(data.usuarios);
        setItems(citasConDetalles);
        setCitasEstados(data.citas_estados);
        setLoading(false);
        
      } else {
        console.error("Error al traer datos. Código:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión con el backend:", error);
    }
  };

  function goPrev() {
    setSelectedDay((d) => addDays(d, -1));
  }

  function goNext() {
    setSelectedDay((d) => addDays(d, 1));
  }

  function goToday() {
    setSelectedDay(todayKey);
  }

  const [selectedOption, setSelectedOption] = useState<
    "camaras" | "internet" | null
  >(null);
  const handleSelection = (option: "camaras" | "internet") => {
    setSelectedOption((prev) => (prev === option ? null : option));
  };

  const [selectedOptionEventos, setSelectedOptionEventos] = useState<
    "my" | "all" | null
  >(null);
  const handleSelectionEventos = (option: "my" | "all") => {
    setSelectedOptionEventos((prev) => (prev === option ? null : option));
  };

  useEffect(() => {
    if (user?.rol == "tecnico") {
      setSelectedOptionEventos("my");
    } else {
      setSelectedOptionEventos("all");
    }

    cargarInicio();
  }, [selectedDay]);

  const [hora, setHora] = useState<Date | null>(new Date());
  const handleHoraChange = (idcita: string, date: Date | null) => {
    if (date) {
      const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
      cambiarHora(idcita, formattedTime);
      setHora(date);
    }
  };
  const cambiarHora = async (idcita: string, nuevaHora: string) => {
    try {
      const res = await fetch(`${API_URL}/api/agenda/cambiar-hora`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcita, nuevaHora }),
      });

      if (res.ok) {
        cargarInicio();
      } else {
        console.error("Error al cambiar hora. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al cambiar hora:", err);
    }
  };

  const cambiarEstado = async (idcita: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`${API_URL}/api/agenda/cambiar-estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcita, nuevoEstado }),
      });

      if (res.ok) {
        cargarInicio();
      } else {
        console.error("Error al cambiar el estado. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al cambiar estado:", err);
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);

  const abrirEditar = (item: AgendaItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const guardarCita = async (data: AgendaItem): Promise<void> => {
    console.log("Guardar:", data);

    try {
      const res = await fetch(`${API_URL}/api/agenda/editar-cita`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setModalOpen(false);
        cargarInicio();
      } else {
        console.error("Error al cambiar el estado. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al cambiar estado:", err);
    }
  };

  const toggleDetalles = async (id: string) => {
    const item = items.find((i) => i.idcita === id);
    if (item && !item.preguntas) {
      const res = await fetch(`${API_URL}/api/citas_preguntas/${id}`);
      const data = await res.json();

      setItems((prev) =>
        prev.map((i) =>
          i.idcita === id
            ? {
                ...i,
                preguntas: data,
                detalles: true,
              }
            : i
        )
      );

      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.idcita === id
          ? { ...i, detalles: !i.detalles }
          : i
      )
    );
  };

  const toggleImagenes = (id: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.idcita === id) {
          return { ...item, mostrarImagenes: !item.mostrarImagenes };
        }
        return item;
      })
    );
  };

  const [modalDetalles, setModalDetalles] = useState<boolean>(false);

  const handleSeleccionarCita = (idCita: string) => {
    setIdCitaSeleccionada(idCita);
    setModalDetalles(true);
  };

  function cerrarModalDetalles() {
    setModalDetalles(false);
    cargarInicio();
  }

  const editarNvr = (modelo: string, idcita: string) => async () => {
    const nuevoModelo = prompt("Editar modelo de NVR", modelo);

    if (nuevoModelo === null) return;

    try {
      const res = await fetch(`${API_URL}/api/editar_modelo_nvr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idcita: idcita, 
          nuevoModelo 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("Modelo actualizado:", data);
        cargarInicio();
      } else {
        console.error("Error al editar modelo NVR:", data);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  };

  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Number | null>(null);

  const buscarClientes = async (q: string) => {
    console.log("Buscando clientes con query:", q);
    if (!q) {
      setResultados([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/clientes/buscar/info?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Error al buscar clientes");
      const data = await res.json();
      setResultados(data.clientes);
      console.log("Resultados obtenidos:", data.clientes);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      buscarClientes(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);


  const [buscarCitasCliente, setBuscarCitasCliente] = useState<BuscarCitas[]>([]);
  const [nombreClienteSeleccionado, setNombreClienteSeleccionado] = useState<string>("");

  const seleccionarCliente = async (idCliente: number, nombre: string) => {
    setClienteSeleccionado(idCliente);
    setLoading2(true);

    try {
    const res = await fetch(`${API_URL}/api/clientes/buscar/citas/${idCliente}`);
    if (!res.ok) {
      console.error("Error al traer citas del cliente:", res.status);
      return;
    }

    const data = await res.json();
    console.log("Datos de citas del cliente:", data);
    setBuscarCitasCliente(data.citas);
    setNombreClienteSeleccionado(nombre);
    setLoading2(false);
    } catch (error) {
      console.error("Error de conexión con el backend:", error);
    }
  }

  return (
    <div className="w-full h-full min-h-0 flex gap-3">
      <div className="w-1/4 h-full shrink-0">
        <div className="w-full cuadro">
          <div className="flex flex-col gap-3 text-center mb-3">
            <div className="text-lg sm:text-xl font-extrabold tracking-tight capitalize">
              {formatHeader(selectedDay)}
            </div>
          </div>

          <div className="flex justify-center items-center gap-2">
            <button
              onClick={goPrev}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 cursor-pointer">
              ← Anterior
            </button>
            <button
              onClick={goToday}
              className="rounded-xl border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-sm font-bold text-orange-100 hover:bg-orange-500/20 cursor-pointer">
              Hoy
            </button>
            <button
              onClick={goNext}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 cursor-pointer">
              Siguiente →
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-xs text-white/60">Ir a</span>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => (setSelectedDay(e.target.value))}
                //onChange={(e) => console.log("Selected day:", e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div
          className="mt-3 grid grid-cols-1 gap-3 w-full cuadro shrink-0" hidden>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1">
              <FilePlusCorner className="w-4 h-4" />
              <span>Nueva tarea</span>
            </h2>

            <div className="flex gap-3">
              <button
                onClick={() => handleSelection("camaras")}
                className={`boton flex gap-1 justify-center items-center ${
                  selectedOption == "camaras"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }`}>
                <Cctv className="w-4 h-4" />
                Cámaras
              </button>
              <button
                onClick={() => handleSelection("internet")}
                className={`boton flex gap-1 justify-center items-center ${
                  selectedOption == "internet"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }`}>
                <Globe className="w-4 h-4" />
                Internet
              </button>
            </div>
          </div>
          {selectedOption && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between gap-2">
                <div className="w-full">
                  <label className="block text-xs text-white/60 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={selectedDayNuevaCita}
                    onChange={(e) => setSelectedDayNuevaCita(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-xs text-white/60 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={20}
                  placeholder="Detalles, tareas, pendientes, etc."
                  className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
                />
              </div>

              {user?.rol == "moderador" ||
                user?.rol == "administrador" ||
                (user?.rol == "superadmin" && (
                  <div>
                    <label className="block text-xs text-white/60 mb-1">
                      Asignado a
                    </label>
                    <select className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full">
                      <option key={user?.id} value={user?.id} selected>
                        {user?.fullname}
                      </option>
                      {users
                        .filter((u) => u.id !== user?.id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullname}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}

              <div className="flex items-center gap-2">
                <button className="flex-1 boton bg-orange-500 text-white hover:bg-orange-600"></button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 w-full cuadro shrink-0">
          <div className="font-bold flex items-center gap-1"><UserRoundSearch className="w-4 h-4" />Buscar cliente</div>
          <div className="flex items-center gap-2">
            <input type="text" className="bg-zinc-900 text-white placeholder:text-white/60 border border-white/10 focus:border-orange-500/40 text-sm p-2 rounded-lg w-full uppercase" placeholder="Nombre, teléfono o domicilio" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {resultados?.length > 0 && (
            <ul className="bg-zinc-800 mt-2 max-h-60 overflow-y-auto rounded-lg border border-white/10 text-xs">
              {resultados.map((c) => {
                const esSeleccionado = c.id === clienteSeleccionado;
                return (
                <li
                  key={c.id}
                  //className="p-2 text-white hover:bg-orange-600 hover:text-white/90 cursor-pointer"
                  className={`p-2 text-white cursor-pointer flex items-center gap-2 transition-all ${
                    esSeleccionado
                      ? "bg-green-600 text-white font-bold"
                      : "hover:bg-orange-600 hover:text-white/90"
                  }`}
                  onClick={() => {seleccionarCliente(c.id, c.nombre)}}
                >
                  <span>{c.nombre}</span>
                  <span hidden={!esSeleccionado}><CircleCheck className="w-4 h-4" /></span>
                </li>
                )}
              )}
            </ul>
          )}
      
          {loading2 ? (
            <Loading />
          ) : (
            clienteSeleccionado && (
              <div className="mt-2 rounded-lg bg-zinc-950/30 text-sm">
                <div className="font-bold text-center italic p-2 bg-zinc-800 rounded-t-lg border border-white/10">Citas de <strong>{nombreClienteSeleccionado}</strong></div>
                {buscarCitasCliente.length > 0 ? (
                  <ul className="overflow-auto border border-white/10">
                    {buscarCitasCliente.map((cita) => (
                      <li key={cita.id} className="p-4 text-white hover:bg-orange-500/70 hover:text-white cursor-pointer flex gap-2 items-center justify-between transition-all"
                      onClick={() => setSelectedDay(cita.dia_original)}
                      //onClick={() => console.log("Seleccionar cita con ID:", cita.dia_original)}
                      >
                        <span className="font-bold text-lg">{cita.dia}</span>
                        <span className="rounded-full border border-white bg-green-700 px-2 py-1 text-xs font-bold text-center w-20 transition-all">{cita.hora}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-white/60">No hay citas para este cliente.</div>
                )}
              </div>
            )
          )}

        </div>
      </div>

      <div className="flex-1 min-h-0 cuadro flex flex-col w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-tight">
            Eventos del día
          </h2>
          <span className="flex items-center gap-3">
            <button
              onClick={() => handleSelectionEventos("my")}
              className={`boton border border-white/10 ${
                selectedOptionEventos == "my"
                  ? "bg-orange-600 hover:bg-white/20"
                  : "hover:bg-orange-600 bg-white/20"
              }`}>
              Mis eventos
            </button>
            {user?.rol == "moderador" ||
              user?.rol == "administrador" ||
              (user?.rol == "superadmin" && (
                <button
                  onClick={() => handleSelectionEventos("all")}
                  className={`boton border border-white/10 ${
                    selectedOptionEventos == "all"
                      ? "bg-orange-600 hover:bg-white/20"
                      : "hover:bg-orange-600 bg-white/20"
                  }`}>
                  Todos los eventos
                </button>
              ))}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-3 pr-2 items-start">
          {dayItems.length === 0 ? (
            loading ? <Loading /> : (
            <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-white/60">
              No hay eventos para este día.
            </div>
            )
          ) : (
            dayItems.map((it) => (
              <div
                key={it.idcita}
                className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3 transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <DatePicker
                        value={it.hora_format}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Hora"
                        dateFormat="h:mm aa"
                        className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-200 text-center w-20 cursor-pointer"
                        title="Cambiar hora"
                        selected={hora}
                        onChange={handleHoraChange.bind(null, it.idcita)}
                      />
                      <select
                        value={it.idestado}
                        className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2"
                        style={{
                          backgroundColor: it.color,
                          borderColor: darkenColor(it.color, 0.5),
                        }}
                        title="Cambiar estado"
                        onChange={(e) =>
                          cambiarEstado(it.idcita, e.target.value)
                        }>
                        <option
                          value={it.idestado}
                          className="font-bold bg-white text-black">
                          {it.estado}
                        </option>
                        {citasEstados
                          .filter((estado) => estado.id !== it.idestado)
                          .map((estado) => (
                            <option
                              key={estado.id}
                              value={estado.id}
                              className="font-bold bg-white text-black">
                              {estado.estado}
                            </option>
                          ))}
                      </select>

                      {(it.tipo == "camarasdesdecero" || it.tipo == "camaras-tiene-nuevo-instalacion" || it.tipo == "camaras-tiene-existente-instalacion") && (
                        <div className="flex items-center gap-2">
                          <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-blue-700 bg-blue-500 flex justify-center items-center gap-1">
                            <Cctv className="h-4 w-4" />
                            <span>INSTALACIÓN DE CÁMARAS</span>
                          </div>
                          {(it.tipo == "camaras-tiene-nuevo-instalacion" || it.tipo == "camaras-tiene-existente-instalacion") && (<span className="text-xs text-yellow-500 font-bold italic flex items-center gap-1"><TriangleAlert className="h-4 w-4" />Ya tiene cámaras instaladas</span>)}
                        </div>
                      )}

                      {(it.tipo == "camaras-tiene-nuevo-soporte" || it.tipo == "camaras-tiene-existente-soporte") && (
                          <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-green-700 bg-green-500 flex justify-center items-center gap-1">
                            <Wrench className="h-4 w-4" />
                            <span>SOPORTE</span>
                          </div>
                      )}

                    </div>

                    <div>
                      <span className="text-xs italic text-white/60">
                        Asignado a <strong>{it.fullname}</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex gap-1 items-center">
                      <div className="text-sm font-extrabold flex items-center gap-1 cursor-pointer hover:scale-103 transition-all hover:underline hover:text-orange-500" onClick={() => navigate(`/clientes/${it.idcliente}`)}><User className="h-4 w-4" />{it.nombre}</div>
                      {it.telefono && (<div className="text-sm flex items-center gap-1">• <Phone className="h-4 w-4" /> {it.telefono}</div>)}
                      {it.direccion && (<div className="text-sm flex items-center gap-1">• <Home className="h-4 w-4" /> {it.direccion}</div>)}

                      {(it.tipo == "camarasdesdecero" || it.tipo == "camaras-tiene-nuevo-instalacion" || it.tipo == "camaras-tiene-existente-instalacion") && (
                        it.tiene_hoja ? (
                          <div className="text-sm flex items-center gap-1">•<File className="h-4 w-4 text-green-500" /><span className="text-green-500 font-bold hover:underline cursor-pointer" onClick={() => {
                            setOpenCotizacion(true);
                            setIdCotizacion(parseInt(it.idhoja));
                            setModoCotizacion("editar");
                          }}>Ver cotización</span></div>
                          ) : (
                          <div className="text-sm flex items-center gap-1">•<FileInput className="h-4 w-4 text-red-500" /><span className="hover:underline cursor-pointer text-red-600 font-bold" onClick={() => {
                            setOpenCotizacion(true);
                            setIdCotizacion(null);
                            setModoCotizacion("nuevo");
                            setIdCitaSeleccionada(it.idcita);
                          }}>Agregar cotización</span></div>
                        )
                      )}
                      <button onClick={() => abrirEditar(it)} className="boton flex items-center justify-center border py-0.5! ml-1 hover:bg-white hover:text-black italic"><Pencil className="h-3 w-3" />Editar registro</button>
                    </div>
                    
                    {it.notas && (
                    <div className="text-sm text-white/80 my-2 whitespace-pre-wrap w-full">
                      {it.notas}
                    </div>
                    )}

                    <div className="flex items-center gap-2">
                      {(it.tipo == "camarasdesdecero" || it.tipo == "camaras-tiene-nuevo-instalacion" || it.tipo == "camaras-tiene-existente-instalacion") && (
                          <div
                            className="text-xs hover:underline text-white/60 cursor-pointer flex items-center gap-1 mt-1"
                            onClick={() => toggleDetalles(it.idcita)}
                          >
                            {it.detalles ? (
                              <>
                                <ListChevronsDownUp className="h-4 w-4" />
                                Ocultar detalles
                              </>
                            ) : (
                              <>
                                <ListChevronsUpDown className="h-4 w-4" />
                                Ver detalles
                              </>
                            )}
                          </div>)}

                          <div
                            className="text-xs hover:underline text-white/60 cursor-pointer transition-all flex items-center gap-1 mt-1"
                            onClick={() => toggleImagenes(it.idcita)}
                          >
                            {it.mostrarImagenes ? (
                              <>
                                <FolderOpen className="h-4 w-4" />
                                Ocultar archivos
                              </>
                            ) : (
                              <>
                                <Folder className="h-4 w-4" />
                                Ver archivos
                              </>
                            )}
                          </div>
                    </div>

                  </div>

                  {it.detalles && (
                    <div className=" mt-2 flex flex-wrap gap-2 items-center">
                      {(it.preguntas?.length ?? 0) > 0 ? (
                        it.preguntas!
                        .filter((pregunta) => pregunta.pregunta !== "modelonvr")
                        .map((pregunta, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition"
                            style={{
                              backgroundColor: darkenColor(it.color, 0.8),
                              borderColor: darkenColor(it.color, 0.2),
                            }}
                          >
                            <span className="text-white/70 capitalize">
                              {pregunta.pregunta}:
                            </span>
                            <span className="text-white font-bold uppercase">
                              {pregunta.respuesta}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs italic text-white/40">
                          Sin detalles
                        </div>
                      )}

                      {it.preguntas?.some((p) => p.pregunta === "modelonvr") && (
                        <div
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition hover:scale-[1.03] cursor-pointer hover:bg-green-700! hover:border-green-900!"
                            style={{
                              backgroundColor: darkenColor(it.color, 0.8),
                              borderColor: darkenColor(it.color, 0.2),
                            }}
                            onClick={editarNvr(it.preguntas!.find((p) => p.pregunta === "modelonvr")!.respuesta, it.idcita)}
                          >
                            <span className="text-white/70">
                              Modelo de NVR:
                            </span>
                            <span className="text-white font-bold uppercase">
                              {it.preguntas!.find((p) => p.pregunta === "modelonvr")!.respuesta}
                            </span>
                          </div>
                        )}

                      <div onClick={() => handleSeleccionarCita(it.idcita)} className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition hover:scale-[1.03] cursor-pointer text-white border-white bg-orange-700"><Pencil className="h-3 w-3" />Editar detalles</div>
                      </div>
                    )}

                  {it.mostrarImagenes && (
                    <div className="mt-2">
                      <GaleriaCita idCita={it.idcita} color={it.color} />
                    </div>
                  )}

                  <ModalEditarRegistro
                    open={modalOpen}
                    item={selectedItem}
                    onClose={() => setModalOpen(false)}
                    onSave={guardarCita}
                  />
                </div>
              </div>
            ))
          )}
        </div>
          {openCotizacion && (
            <Cotizador
              onClose={setOpenCotizacion}
              idCotizacion={idCotizacion}
              modo={modoCotizacion}
              idCita={Number(idCitaSeleccionada)}
              onSaved={cargarInicio}
            />
          )}

          {modalDetalles && (
            <EditarDetalles
              idCita={String(idCitaSeleccionada)}
              onClose={cerrarModalDetalles}
            />
          )}
      </div>
    </div>
  );
}
