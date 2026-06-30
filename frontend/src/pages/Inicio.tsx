import { useEffect, useMemo, useState } from "react";
import type { Usuarios } from "../types/auth";
import { useAuth } from "../auth/AuthContext";
import {
  FilePlusCorner,
  Cctv,
  Globe,
  Home,
  Phone,
  User,
  TriangleAlert,
  Wrench,
  Pencil,
  ListChevronsUpDown,
  ListChevronsDownUp,
  FileInput,
  File,
  Folder,
  FolderOpen,
  UserRoundSearch,
  CircleCheck,
  X,
  FileText,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
//npm install react-datepicker
import { darkenColor } from "../utils/colores";
import Cotizador from "./Cotizador";
import HojaInspeccion from "../components/HojaInspeccion";
import HojaInstalacion from "../components/HojaInstalacion";
import ModalEditarRegistro from "../components/ModalEditarRegistro";
import GaleriaCita from "../components/GaleriaCita";
import EditarDetalles from "../components/EditarDetalles";
import Loading from "../components/Loading";
import { useNavigate } from "react-router-dom";
import ModalConfirm from "../components/ModalConfirm";
import FormatearNumero from "../components/FormatearNumero";

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
  tipo_hoja?: string;
  tiene_hoja: number;
  idinspeccion: string;
  tiene_inspeccion: number;
  detalles: boolean;
  preguntas?: { pregunta: string; respuesta: string }[];
  mostrarImagenes: boolean;
};

type ClienteInspeccion = {
  nombre: string;
  direccion: string;
  telefono: string;
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
};

type CuotaAlerta = {
  idcuota: number;
  idpago: number;
  idcliente: number;
  cliente: string;
  idcita: number | null;
  monto: number;
  interes: number;
  vencimiento: string;
  dias: number;
};

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

function isSundayDate(date: Date) {
  return date.getDay() === 0;
}

function isSundayKey(dateKey: string) {
  return isSundayDate(fromDateKey(dateKey));
}

function getSelectableDateKey(dateKey: string) {
  return isSundayKey(dateKey) ? addDays(dateKey, 1) : dateKey;
}

function addDaysSkippingSunday(dateKey: string, delta: number) {
  let nextKey = addDays(dateKey, delta);

  while (isSundayKey(nextKey)) {
    nextKey = addDays(nextKey, delta > 0 ? 1 : -1);
  }

  return nextKey;
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

function formatShortDate(dateKey: string) {
  const d = fromDateKey(dateKey);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export default function Inicio() {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const todayKey = useMemo(
    () => getSelectableDateKey(toDateKey(new Date())),
    [],
  );

  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [selectedDayNuevaCita, setSelectedDayNuevaCita] =
    useState<string>(todayKey);
  const [openModalConfirm, setOpenModalConfirm] = useState(false);
  const [idHojaConfirmar, setIdHojaConfirmar] = useState<number | null>(null);
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [openCotizacion, setOpenCotizacion] = useState(false);
  const [openInspeccion, setOpenInspeccion] = useState(false);
  const [idCitaInspeccion, setIdCitaInspeccion] = useState<number | null>(null);
  const [idHojaInspeccion, setIdHojaInspeccion] = useState<number | null>(null);
  const [inspeccionBloqueada, setInspeccionBloqueada] = useState(false);
  const [clienteInspeccion, setClienteInspeccion] =
    useState<ClienteInspeccion | null>(null);
  const abrirHojaInspeccion = (item: AgendaItem) => {
    setOpenInspeccion(true);
    setInspeccionBloqueada(item.tipo_hoja === "instalacion_confirmada");
    setIdCitaInspeccion(Number(item.idcita));
    setIdHojaInspeccion(item.idhoja ? parseInt(item.idhoja) : null);
    setClienteInspeccion({
      nombre: item.nombre || "",
      direccion: item.direccion || "",
      telefono: item.telefono || "",
    });
  };

  const [openInstalacion, setOpenInstalacion] = useState(false);
  const [idCitaInstalacion, setIdCitaInstalacion] = useState<number | null>(null);
  const [idHojaInstalacion, setIdHojaInstalacion] = useState<number | null>(null);
  const [clienteInstalacion, setClienteInstalacion] = useState<ClienteInspeccion | null>(null);
  
  const abrirHojaInstalacion = (item: AgendaItem) => {
    setOpenInstalacion(true);
    setIdCitaInstalacion(Number(item.idcita));
    setIdHojaInstalacion(item.idhoja ? parseInt(item.idhoja) : null);
    setClienteInstalacion({
      nombre: item.nombre || "",
      direccion: item.direccion || "",
      telefono: item.telefono || "",
    });
  };

  const [inspeccionItemsMap, setInspeccionItemsMap] = useState<
    Record<string, { items: any[]; visible: boolean }>
  >({});
  const [idCotizacion, setIdCotizacion] = useState<number | null>(null);
  const [cotizacionBloqueada, setCotizacionBloqueada] = useState(false);
  const [modoCotizacion, setModoCotizacion] = useState<"nuevo" | "editar">(
    "nuevo",
  );
  const [idCitaSeleccionada, setIdCitaSeleccionada] = useState<string | null>(
    null,
  );
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [items, setItems] = useState<AgendaItem[]>([]);

  const dayItems = useMemo(() => {
    return items
      .filter((i) => {
        if (i.dia !== selectedDay) return false;
        if (user?.rol === "tecnico" && Number(i.idagente) !== Number(user?.id)) return false;
        return true;
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [items, selectedDay, user]);

  const [citasEstados, setCitasEstados] = useState<CitasEstados[]>([]);

  type InicioResponse = {
    usuarios: Usuarios[];
    citas: AgendaItem[];
    citas_estados: CitasEstados[];
    dias: string[];
    cuotas_alertas: CuotaAlerta[];
  };

  const [loading, setLoading] = useState(true);
  const [loading2, setLoading2] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [cuotasAlertas, setCuotasAlertas] = useState<CuotaAlerta[]>([]);

  const cuotasVencidas = useMemo(
    () => cuotasAlertas.filter((cuota) => Number(cuota.dias) < 0),
    [cuotasAlertas],
  );
  const cuotasHoy = useMemo(
    () => cuotasAlertas.filter((cuota) => Number(cuota.dias) === 0),
    [cuotasAlertas],
  );
  const cuotasProximas = useMemo(
    () => cuotasAlertas.filter((cuota) => Number(cuota.dias) > 0),
    [cuotasAlertas],
  );

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
        setCuotasAlertas(data.cuotas_alertas ?? []);
        setLoading(false);
      } else {
        console.error("Error al traer datos. Código:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión con el backend:", error);
    }
  };

  function goPrev() {
    setSelectedDay((d) => addDaysSkippingSunday(d, -1));
  }

  function goNext() {
    setSelectedDay((d) => addDaysSkippingSunday(d, 1));
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

  function abrirConfirmarInstalacion(idHoja: string) {
    setIdHojaConfirmar(Number(idHoja));
    setOpenModalConfirm(true);
  }

  async function handleConfirmInstalacion() {
    if (!idHojaConfirmar) {
      setOpenModalConfirm(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/cotizaciones/${idHojaConfirmar}/confirmar-instalacion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await res.json();

      if (res.ok) {
        setOpenModalConfirm(false);
        setIdHojaConfirmar(null);
        cargarInicio();
        return;
      }

      alert(data.error || "No se pudo confirmar la instalacion");
    } catch (error) {
      console.error("Error confirmando instalacion:", error);
      alert("Error de conexion al confirmar la instalacion");
    }

    setOpenModalConfirm(false);
  }

  function handleCancelModal() {
    setOpenModalConfirm(false);
    setIdHojaConfirmar(null);
  }

  useEffect(() => {
    const chequearStock = async () => {
      try {
        const res = await fetch(`${API_URL}/api/productos`);
        if (res.ok) {
          const prods = await res.json();
          const pocos = prods.filter((p: any) => p.stock <= 3);
          if (pocos.length > 0) {
            setLowStockProducts(pocos);
          }
        }
      } catch (error) {
        console.error("Error verificando stock:", error);
      }
    };

    chequearStock();
  }, []);

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

  const toggleInspeccionItems = async (idcita: string) => {
    if (inspeccionItemsMap[idcita]) {
      setInspeccionItemsMap((prev) => ({
        ...prev,
        [idcita]: { ...prev[idcita], visible: !prev[idcita].visible },
      }));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/inspeccion/${idcita}`);
      if (res.ok) {
        const data = await res.json();
        setInspeccionItemsMap((prev) => ({
          ...prev,
          [idcita]: { items: data.items ?? [], visible: true },
        }));
      }
    } catch (e) {
      console.error("Error cargando items de inspección:", e);
    }
  };

  const guardarCita = async (data: AgendaItem): Promise<void> => {
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
            : i,
        ),
      );

      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.idcita === id ? { ...i, detalles: !i.detalles } : i)),
    );
  };

  const toggleImagenes = (id: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.idcita === id) {
          return { ...item, mostrarImagenes: !item.mostrarImagenes };
        }
        return item;
      }),
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
          nuevoModelo,
        }),
      });

      const data = await res.json();

      if (res.ok) {
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
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Number | null>(
    null,
  );

  const buscarClientes = async (q: string) => {
    if (!q) {
      setResultados([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/clientes/buscar/info?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) throw new Error("Error al buscar clientes");
      const data = await res.json();
      setResultados(data.clientes);
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

  const [buscarCitasCliente, setBuscarCitasCliente] = useState<BuscarCitas[]>(
    [],
  );
  const [nombreClienteSeleccionado, setNombreClienteSeleccionado] =
    useState<string>("");

  const seleccionarCliente = async (idCliente: number, nombre: string) => {
    setClienteSeleccionado(idCliente);
    setLoading2(true);

    try {
      const res = await fetch(
        `${API_URL}/api/clientes/buscar/citas/${idCliente}`,
      );
      if (!res.ok) {
        console.error("Error al traer citas del cliente:", res.status);
        return;
      }

      const data = await res.json();
      setBuscarCitasCliente(data.citas);
      setNombreClienteSeleccionado(nombre);
      setLoading2(false);
    } catch (error) {
      console.error("Error de conexión con el backend:", error);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 xl:flex-row overflow-y-auto">
      <div className="w-full shrink-0 xl:h-full xl:w-1/4 xl:overflow-y-auto xl:pr-1">
        <div className="w-full cuadro">
          <div className="flex flex-col gap-3 text-center mb-3">
            <div className="text-lg sm:text-xl font-extrabold tracking-tight capitalize">
              {formatHeader(selectedDay)}
            </div>
          </div>

          <div className="flex items-center justify-around gap-2 flex-wrap">
            <button
              onClick={goPrev}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 cursor-pointer sm:text-sm">
              ← Anterior
            </button>
            <button
              onClick={goToday}
              className="rounded-xl border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-xs font-bold text-orange-100 hover:bg-orange-500/20 cursor-pointer sm:text-sm">
              Hoy
            </button>
            <button
              onClick={goNext}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 cursor-pointer sm:text-sm">
              Siguiente →
            </button>

            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-xs text-white/60">Ir a</span>
              <DatePicker
                selected={fromDateKey(selectedDay)}
                onChange={(date: Date | null) => {
                  if (!date || isSundayDate(date)) return;
                  setSelectedDay(toDateKey(date));
                }}
                filterDate={(date: Date) => !isSundayDate(date)}
                dayClassName={(date: Date) =>
                  isSundayDate(date) ? "datepicker-sunday-blocked" : ""
                }
                dateFormat="MM/dd/yyyy"
                className="w-24 bg-transparent text-sm outline-none sm:w-28"
              />
            </div>
          </div>
        </div>

        {user?.rol?.toLowerCase() !== "tecnico" && (
          <div
            className="mt-3 grid grid-cols-1 gap-3 w-full cuadro shrink-0"
            hidden>
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
                    <DatePicker
                      selected={fromDateKey(selectedDayNuevaCita)}
                      onChange={(date: Date | null) => {
                        if (!date || isSundayDate(date)) return;
                        setSelectedDayNuevaCita(toDateKey(date));
                      }}
                      filterDate={(date: Date) => !isSundayDate(date)}
                      dayClassName={(date: Date) =>
                        isSundayDate(date) ? "datepicker-sunday-blocked" : ""
                      }
                      dateFormat="MM/dd/yyyy"
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
                      <label className="block text-xs text-white/60 mb-1 ">
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
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 w-full cuadro shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold flex items-center gap-1">
              <UserRoundSearch className="w-4 h-4" />
              Buscar cliente
            </div>
            {(query || resultados.length > 0 || clienteSeleccionado) && (
              <button
                type="button"
                title="Limpiar busqueda"
                onClick={() => {
                  setQuery("");
                  setResultados([]);
                  setClienteSeleccionado(null);
                  setBuscarCitasCliente([]);
                  setNombreClienteSeleccionado("");
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 p-0 text-white/60 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-200">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="text"
              className="min-w-0 bg-zinc-900 text-white placeholder:text-white/60 border border-white/10 focus:border-orange-500/40 text-sm p-2 rounded-lg w-full uppercase"
              placeholder="Nombre, teléfono o domicilio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
                    onClick={() => {
                      seleccionarCliente(c.id, c.nombre);
                    }}>
                    <span>{c.nombre}</span>
                    <span hidden={!esSeleccionado}>
                      <CircleCheck className="w-4 h-4" />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {loading2 ? (
            <Loading />
          ) : (
            clienteSeleccionado && (
              <div className="mt-2 rounded-lg bg-zinc-950/30 text-sm">
                <div className="font-bold text-center italic p-2 bg-zinc-800 rounded-t-lg border border-white/10">
                  Citas de <strong>{nombreClienteSeleccionado}</strong>
                </div>
                {buscarCitasCliente.length > 0 ? (
                  <ul className="max-h-64 overflow-auto rounded-b-lg border border-white/10 xl:max-h-56">
                    {buscarCitasCliente.map((cita) => {
                      const esDomingo = isSundayKey(cita.dia_original);

                      return (
                        <li
                          key={cita.id}
                          className={`p-3 text-white flex flex-wrap gap-2 items-center justify-between transition-all sm:p-4 ${
                            esDomingo
                              ? "cursor-not-allowed border-l-4 border-red-500 bg-red-500/10 text-red-200"
                              : "cursor-pointer hover:bg-orange-500/70 hover:text-white"
                          }`}
                          onClick={() => {
                            if (esDomingo) return;
                            setSelectedDay(cita.dia_original);
                          }}>
                          <span className="min-w-0 break-words text-base font-bold sm:text-lg">
                            {cita.dia}
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-xs font-bold text-center w-20 transition-all ${
                              esDomingo
                                ? "border-red-300/50 bg-red-700/70 text-red-50"
                                : "border-white bg-green-700"
                            }`}>
                            {esDomingo ? "Domingo" : cita.hora}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-white/60">
                    No hay citas para este cliente.
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {cuotasAlertas.length > 0 && user?.rol != "tecnico" && (
          <div className="mt-3 w-full cuadro shrink-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold flex min-w-0 items-center gap-1">
                <TriangleAlert className="w-4 h-4 text-orange-400" />
                Cuotas por vencer
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-white/60">
                {cuotasAlertas.length}
              </span>
            </div>

            {cuotasAlertas.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-zinc-950/30 p-3 text-xs text-white/50">
                No hay cuotas vencidas ni próximas.
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    titulo: "Vencidas",
                    items: cuotasVencidas,
                    color: "border-red-500/25 bg-red-500/10 text-red-300",
                    scroll: true,
                  },
                  {
                    titulo: "Vencen hoy",
                    items: cuotasHoy,
                    color:
                      "border-yellow-500/25 bg-yellow-500/10 text-yellow-200",
                    scroll: false,
                  },
                  {
                    titulo: "Por vencer",
                    items: cuotasProximas,
                    color: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
                    scroll: true,
                  },
                ].map((grupo) => (
                  <div key={grupo.titulo}>
                    <div
                      className={`mb-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${grupo.color}`}>
                      {grupo.titulo} · {grupo.items.length}
                    </div>

                    {grupo.items.length > 0 && (
                      <div
                        className={`${grupo.scroll ? "max-h-36 overflow-y-auto" : ""} rounded-lg border border-white/10`}>
                        {grupo.items.map((cuota) => (
                          <button
                            key={cuota.idcuota}
                            onClick={() =>
                              navigate(`/clientes/${cuota.idcliente}`)
                            }
                            className="w-full border-b border-white/5 bg-zinc-950/30 px-3 py-2 text-left text-xs transition hover:bg-white/5 last:border-b-0">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <span className="truncate font-bold text-white">
                                {cuota.cliente}
                              </span>
                              <span className="shrink-0 font-bold text-orange-300">
                                <FormatearNumero numero={Number(cuota.monto)} />
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2 text-white/45">
                              <span>{formatShortDate(cuota.vencimiento)}</span>
                              <span>
                                {Number(cuota.dias) < 0
                                  ? `${Math.abs(Number(cuota.dias))} días tarde`
                                  : Number(cuota.dias) === 0
                                    ? "Hoy"
                                    : `en ${cuota.dias} días`}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-[28rem] w-full min-w-0 flex-col cuadro xl:min-h-0 xl:w-3/4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold tracking-tight">
            Eventos del día
          </h2>
          <span className="flex flex-wrap items-center gap-2 sm:gap-3">
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

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-0 xl:min-h-0 xl:pr-2">
          {dayItems.length === 0 ? (
            loading ? (
              <Loading />
            ) : (
              <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-white/60">
                No hay eventos para este día.
              </div>
            )
          ) : (
            dayItems.map((it) =>
              user?.rol === "tecnico" ? (
                /* ────────── TARJETA SOLO LECTURA (técnico) ────────── */
                <div
                  key={it.idcita}
                  className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3 transition">
                  <div>
                    {/* Fila 1: estado (badge solo lectura) + tipo de instalación */}
                    <div className="mb-2 flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {/* Badge de hora (solo lectura) */}
                        <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-200 w-20 justify-center">
                          {it.hora_format}
                        </span>

                        {/* Badge de estado (solo lectura) */}
                        <span
                          className="rounded-full text-xs font-bold py-0.5 px-1.5 text-center border-2"
                          style={{
                            backgroundColor: it.color,
                            borderColor: darkenColor(it.color, 0.5),
                          }}>
                          {it.estado}
                        </span>

                        {(it.tipo == "camarasdesdecero" ||
                          it.tipo == "camaras-tiene-nuevo-instalacion" ||
                          it.tipo == "camaras-tiene-existente-instalacion") && (
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <div className="rounded-full text-xs font-bold py-0.5 px-1.5 text-center border-2 border-blue-700 bg-blue-500 flex justify-center items-center gap-1">
                              <Cctv className="h-4 w-4" />
                              <span>INSTALACIÓN DE CÁMARAS</span>
                            </div>
                            {(it.tipo == "camaras-tiene-nuevo-instalacion" ||
                              it.tipo ==
                                "camaras-tiene-existente-instalacion") && (
                              <span className="text-xs text-yellow-500 font-bold italic flex items-center gap-1">
                                <TriangleAlert className="h-4 w-4" />
                                Ya tiene cámaras instaladas
                              </span>
                            )}
                          </div>
                        )}

                        {(it.tipo == "camaras-tiene-nuevo-soporte" ||
                          it.tipo == "camaras-tiene-existente-soporte") && (
                          <div className="rounded-full text-xs font-bold py-0.5 px-1.5 text-center border-2 border-green-700 bg-green-500 flex justify-center items-center gap-1">
                            <Wrench className="h-4 w-4" />
                            <span>SOPORTE</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 lg:text-right">
                        <span className="text-xs italic text-white/60">
                          Asignado a <strong>{it.fullname}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Fila 2: nombre, teléfono, dirección, hoja de inspección */}
                    <div>
                      <div className="flex min-w-0 flex-wrap gap-1.5 items-center">
                        <div className="min-w-0 text-sm font-extrabold flex items-center gap-1">
                          <User className="h-4 w-4 shrink-0" />
                          {it.nombre}
                        </div>
                        {it.telefono && (
                          <div className="min-w-0 text-sm flex items-center gap-1 break-words">
                            • <Phone className="h-4 w-4" /> {it.telefono}
                          </div>
                        )}
                        {it.direccion && (
                          <div className="min-w-0 text-sm flex items-center gap-1 break-words">
                            • <Home className="h-4 w-4" /> {it.direccion}
                          </div>
                        )}

                        {/* Hoja de Inspección - única acción permitida */}
                        {(it.tipo == "camarasdesdecero" ||
                          it.tipo == "camaras-tiene-nuevo-instalacion" ||
                          it.tipo == "camaras-tiene-existente-instalacion") &&
                          (it.tiene_inspeccion ? (
                            <div className="text-sm flex items-center gap-1">
                              •<File className="h-4 w-4 text-blue-500" />
                              <span
                                className="text-blue-500 font-bold hover:underline cursor-pointer"
                                onClick={() => {
                                  abrirHojaInspeccion(it);
                                }}>
                                Ver / editar hoja inspección
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm flex items-center gap-1">
                              •<FileInput className="h-4 w-4 text-blue-400" />
                              <span
                                className="hover:underline cursor-pointer text-blue-400 font-bold"
                                onClick={() => {
                                  abrirHojaInspeccion(it);
                                }}>
                                Crear hoja inspección
                              </span>
                            </div>
                          ))}

                        {/* Hoja de Instalación - solo cuando ya fue confirmada */}
                        {it.tiene_hoja === 1 && it.tipo_hoja === "instalacion_confirmada" && (
                          <div className="text-sm flex items-center gap-1">
                            •<FileText className="h-4 w-4 text-orange-400" />
                            <span
                              className="text-orange-400 font-bold hover:underline cursor-pointer"
                              onClick={() => abrirHojaInstalacion(it)}>
                              Ver Hoja / Firma
                            </span>
                          </div>
                        )}
                      </div>

                      {it.notas && (
                        <div className="text-sm text-white/80 my-2 whitespace-pre-wrap w-full">
                          {it.notas}
                        </div>
                      )}

                      {/* Items de inspección expandibles */}
                      {it.tiene_inspeccion ? (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleInspeccionItems(it.idcita)}
                            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors mb-1">
                            <ListChevronsUpDown className="h-3.5 w-3.5" />
                            {inspeccionItemsMap[it.idcita]?.visible
                              ? "Ocultar materiales"
                              : "Ver materiales"}
                          </button>

                          {inspeccionItemsMap[it.idcita]?.visible && (
                            <div className="rounded-xl border border-white/8 overflow-hidden bg-zinc-900/50">
                              {inspeccionItemsMap[it.idcita].items.length ===
                              0 ? (
                                <p className="p-3 text-xs text-white/40 italic">
                                  Sin materiales cargados
                                </p>
                              ) : (
                                inspeccionItemsMap[it.idcita].items.map(
                                  (item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-2 px-3 py-2 border-b border-white/5 last:border-b-0">
                                      <span className="shrink-0 bg-orange-500/15 border border-orange-500/30 rounded-md px-1.5 py-0.5 text-xs font-bold text-orange-300">
                                        ×{item.cantidad}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-white truncate">
                                          {item.producto_descrip}
                                        </p>
                                        {item.detalle && (
                                          <p className="text-xs text-white/40 italic truncate">
                                            {item.detalle}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ),
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Ver archivos */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className="text-xs hover:underline text-white/60 cursor-pointer transition-all flex items-center gap-1 mt-1"
                          onClick={() => toggleImagenes(it.idcita)}>
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

                    {it.mostrarImagenes && (
                      <div className="mt-2">
                        <GaleriaCita idCita={it.idcita} color={it.color} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ────────── TARJETA COMPLETA (otros roles) ────────── */
                <div
                  key={it.idcita}
                  className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3 transition">
                  <div>
                    <div className="mb-2 flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                          disabled={it.idestado == "9" ? true : false}
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
                            .filter((estado) => estado.estado !== "YA INSTALÓ")
                            .map((estado) => (
                              <option
                                key={estado.id}
                                value={estado.id}
                                className="font-bold bg-white text-black">
                                {estado.estado}
                              </option>
                            ))}
                        </select>

                        {(it.tipo == "camarasdesdecero" ||
                          it.tipo == "camaras-tiene-nuevo-instalacion" ||
                          it.tipo == "camaras-tiene-existente-instalacion") && (
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-blue-700 bg-blue-500 flex justify-center items-center gap-1">
                              <Cctv className="h-4 w-4" />
                              <span>INSTALACIÓN DE CÁMARAS</span>
                            </div>
                            {(it.tipo == "camaras-tiene-nuevo-instalacion" ||
                              it.tipo ==
                                "camaras-tiene-existente-instalacion") && (
                              <span className="text-xs text-yellow-500 font-bold italic flex items-center gap-1">
                                <TriangleAlert className="h-4 w-4" />
                                Ya tiene cámaras instaladas
                              </span>
                            )}
                          </div>
                        )}

                        {(it.tipo == "camaras-tiene-nuevo-soporte" ||
                          it.tipo == "camaras-tiene-existente-soporte") && (
                          <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-green-700 bg-green-500 flex justify-center items-center gap-1">
                            <Wrench className="h-4 w-4" />
                            <span>SOPORTE</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 lg:text-right">
                        <span className="text-xs italic text-white/60">
                          Asignado a <strong>{it.fullname}</strong>
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-col justify-between gap-2 xl:flex-row xl:items-center">
                        <div className="flex min-w-0 flex-wrap gap-1.5 items-center">
                          <div
                            className="min-w-0 text-sm font-extrabold flex items-center gap-1 cursor-pointer hover:scale-103 transition-all hover:underline hover:text-orange-500"
                            onClick={() =>
                              navigate(`/clientes/${it.idcliente}`)
                            }>
                            <User className="h-4 w-4 shrink-0" />
                            {it.nombre}
                          </div>
                          {it.telefono && (
                            <div className="min-w-0 text-sm flex items-center gap-1 break-words">
                              • <Phone className="h-4 w-4" /> {it.telefono}
                            </div>
                          )}
                          {it.direccion && (
                            <div className="min-w-0 text-sm flex items-center gap-1 break-words">
                              • <Home className="h-4 w-4" /> {it.direccion}
                            </div>
                          )}

                          {(it.tipo == "camarasdesdecero" ||
                            it.tipo == "camaras-tiene-nuevo-instalacion" ||
                            it.tipo ==
                              "camaras-tiene-existente-instalacion") && (
                            <>
                              {it.tiene_inspeccion ? (
                                <div className="text-sm flex items-center gap-1">
                                  •<File className="h-4 w-4 text-blue-500" />
                                  <span
                                    className="text-blue-500 font-bold hover:underline cursor-pointer"
                                    onClick={() => {
                                      abrirHojaInspeccion(it);
                                    }}>
                                    Ver hoja inspección
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm flex items-center gap-1">
                                  •
                                  <FileInput className="h-4 w-4 text-blue-400" />
                                  <span
                                    className="hover:underline cursor-pointer text-blue-400 font-bold"
                                    onClick={() => {
                                      abrirHojaInspeccion(it);
                                    }}>
                                    Crear hoja inspección
                                  </span>
                                </div>
                              )}

                              {it.tiene_hoja ? (
                                <div className="text-sm flex items-center gap-1">
                                  •<File className="h-4 w-4 text-green-500" />
                                  <span
                                    className="text-green-500 font-bold hover:underline cursor-pointer"
                                    onClick={() => {
                                      setOpenCotizacion(true);
                                      setIdCotizacion(parseInt(it.idhoja));
                                      setModoCotizacion("editar");
                                      setCotizacionBloqueada(
                                        String(it.idestado) === "9",
                                      );
                                    }}>
                                    Ver cotización
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm flex items-center gap-1">
                                  •
                                  <FileInput className="h-4 w-4 text-red-500" />
                                  <span
                                    className="hover:underline cursor-pointer text-red-600 font-bold"
                                    onClick={() => {
                                      setOpenCotizacion(true);
                                      setIdCotizacion(null);
                                      setModoCotizacion("nuevo");
                                      setIdCitaSeleccionada(it.idcita);
                                      setCotizacionBloqueada(false);
                                    }}>
                                    Agregar cotización
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => abrirEditar(it)}
                            className="boton flex shrink-0 items-center justify-center border py-0.5! ml-0 hover:bg-white hover:text-black italic sm:ml-1">
                            <Pencil className="h-3 w-3" />
                            Editar registro
                          </button>
                        </div>
                        {it.tiene_hoja &&
                        it.tipo_hoja !== "instalacion_confirmada" ? (
                          <div className="shrink-0">
                            <button
                              onClick={() =>
                                abrirConfirmarInstalacion(it.idhoja)
                              }
                              className="group flex w-full items-center justify-center gap-1.5 rounded-full border border-green-400/30 bg-green-500/15 px-3 py-1 text-xs font-extrabold text-green-200 shadow-sm shadow-green-500/10 transition-all hover:border-green-300/70 hover:bg-green-500/25 hover:text-white hover:shadow-green-500/20 sm:w-auto">
                              <CircleCheck className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                              Confirmar Instalación
                            </button>
                          </div>
                        ) : it.tiene_hoja && it.tipo_hoja === "instalacion_confirmada" && user?.rol === "tecnico" ? (
                          <div className="shrink-0">
                            <button
                              onClick={() => abrirHojaInstalacion(it)}
                              className="group flex w-full items-center justify-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-xs font-extrabold text-orange-200 shadow-sm shadow-orange-500/10 transition-all hover:border-orange-300/70 hover:bg-orange-500/25 hover:text-white hover:shadow-orange-500/20 sm:w-auto">
                              <FileText className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                              Ver Hoja / Firma
                            </button>
                          </div>
                        ) : ""}
                      </div>

                      {it.notas && (
                        <div className="text-sm text-white/80 my-2 whitespace-pre-wrap w-full">
                          {it.notas}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {(it.tipo == "camarasdesdecero" ||
                          it.tipo == "camaras-tiene-nuevo-instalacion" ||
                          it.tipo == "camaras-tiene-existente-instalacion") && (
                          <div
                            className="text-xs hover:underline text-white/60 cursor-pointer flex items-center gap-1 mt-1"
                            onClick={() => toggleDetalles(it.idcita)}>
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
                          </div>
                        )}

                        <div
                          className="text-xs hover:underline text-white/60 cursor-pointer transition-all flex items-center gap-1 mt-1"
                          onClick={() => toggleImagenes(it.idcita)}>
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
                          it
                            .preguntas!.filter(
                              (pregunta) => pregunta.pregunta !== "modelonvr",
                            )
                            .map((pregunta, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition"
                                style={{
                                  backgroundColor: darkenColor(it.color, 0.8),
                                  borderColor: darkenColor(it.color, 0.2),
                                }}>
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

                        {it.preguntas?.some(
                          (p) => p.pregunta === "modelonvr",
                        ) && (
                          <div
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition hover:scale-[1.03] cursor-pointer hover:bg-green-700! hover:border-green-900!"
                            style={{
                              backgroundColor: darkenColor(it.color, 0.8),
                              borderColor: darkenColor(it.color, 0.2),
                            }}
                            onClick={editarNvr(
                              it.preguntas!.find(
                                (p) => p.pregunta === "modelonvr",
                              )!.respuesta,
                              it.idcita,
                            )}>
                            <span className="text-white/70">
                              Modelo de NVR:
                            </span>
                            <span className="text-white font-bold uppercase">
                              {
                                it.preguntas!.find(
                                  (p) => p.pregunta === "modelonvr",
                                )!.respuesta
                              }
                            </span>
                          </div>
                        )}

                        <div
                          onClick={() => handleSeleccionarCita(it.idcita)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition hover:scale-[1.03] cursor-pointer text-white border-white bg-orange-700">
                          <Pencil className="h-3 w-3" />
                          Editar detalles
                        </div>
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
              ),
            )
          )}
        </div>
        {openCotizacion && (
          <Cotizador
            onClose={setOpenCotizacion}
            idCotizacion={idCotizacion}
            modo={modoCotizacion}
            idCita={Number(idCitaSeleccionada)}
            onSaved={cargarInicio}
            bloqueada={cotizacionBloqueada}
          />
        )}

        {openInspeccion && idCitaInspeccion && (
          <HojaInspeccion
            idCita={idCitaInspeccion}
            idHoja={idHojaInspeccion}
            cliente={clienteInspeccion}
            onClose={() => {
              setOpenInspeccion(false);
              setIdCitaInspeccion(null);
              setIdHojaInspeccion(null);
              setClienteInspeccion(null);
            }}
            onSaved={cargarInicio}
            bloqueada={inspeccionBloqueada}
          />
        )}

        {openInstalacion && idCitaInstalacion && idHojaInstalacion && (
          <HojaInstalacion
            idCita={idCitaInstalacion}
            idHoja={idHojaInstalacion}
            cliente={clienteInstalacion}
            onClose={() => {
              setOpenInstalacion(false);
              setIdCitaInstalacion(null);
              setIdHojaInstalacion(null);
              setClienteInstalacion(null);
            }}
            onSaved={cargarInicio}
          />
        )}

        {modalDetalles && (
          <EditarDetalles
            idCita={String(idCitaSeleccionada)}
            onClose={cerrarModalDetalles}
          />
        )}
        {openModalConfirm && (
          <ModalConfirm
            descripcion="Se actualizará el stock"
            message="¿Estás seguro de que deseas confirmar esta cotización?"
            onConfirm={handleConfirmInstalacion}
            onCancel={handleCancelModal}
          />
        )}

        {lowStockProducts.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-red-500/30 rounded-3xl w-full max-w-md shadow-2xl shadow-red-500/10 overflow-hidden">
              <div className="bg-red-500/10 p-6 flex flex-col items-center border-b border-red-500/20">
                <div className="bg-red-500/20 p-3 rounded-full mb-3">
                  <TriangleAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-black text-red-400">
                  Alerta Stock
                </h2>
                <p className="text-sm text-red-200/70 text-center mt-2">
                  Los siguientes productos están a punto de agotarse.
                </p>
              </div>
              <div className="p-6 max-h-[40vh] overflow-y-auto">
                <ul className="space-y-3">
                  {lowStockProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-white/5">
                      <span className="text-white/80 font-medium">
                        {p.descrip}
                      </span>
                      <span className="font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg text-sm">
                        {p.stock} unid.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 border-t border-white/10 bg-zinc-950/50 flex justify-end">
                <button
                  onClick={() => setLowStockProducts([])}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition-colors">
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
        <style>{`
          .react-datepicker {
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgb(24, 24, 27);
            color: white;
            font-family: inherit;
          }

          .react-datepicker__header {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgb(39, 39, 42);
          }

          .react-datepicker__current-month,
          .react-datepicker-time__header,
          .react-datepicker-year-header,
          .react-datepicker__day-name,
          .react-datepicker__day {
            color: rgba(255, 255, 255, 0.86);
          }

          .react-datepicker__day:hover {
            background: rgba(249, 115, 22, 0.22);
          }

          .react-datepicker__day--selected,
          .react-datepicker__day--keyboard-selected {
            background: rgb(249, 115, 22);
            color: white;
          }

          .react-datepicker__day--disabled,
          .datepicker-sunday-blocked {
            border-radius: 9999px;
            background: rgba(239, 68, 68, 0.12);
            color: rgba(248, 113, 113, 0.72);
            cursor: not-allowed;
            text-decoration: line-through;
          }

          .react-datepicker__day--disabled:hover,
          .datepicker-sunday-blocked:hover {
            background: rgba(239, 68, 68, 0.12);
          }
        `}</style>
      </div>
    </div>
  );
}
