import { useEffect, useMemo, useState } from "react";
import type { Usuarios } from "../types/auth";
import { useAuth } from "../auth/AuthContext";
import { FilePlusCorner, Cctv, Globe } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
//npm install react-datepicker
import { darkenColor } from "../utils/colores";

type AgendaItem = {
  idcita: string;
  idcliente: number;
  nombre: string;
  dia: string;
  hora: string;
  hora_format: string,
  notas: string,
  idagente: number;
  fullname: string;
  tipo: string;
  idestado: string,
  estado: string;
  color: string
};

type CitasEstados = {
  id: string,
  estado: string,
  color: string,
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

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [selectedDayNuevaCita, setSelectedDayNuevaCita] = useState<string>(todayKey);

  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

   
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
    };

const cargarInicio = async () => {
  try {
    const res = await fetch(`${API_URL}/api/inicio`);

    if (res.status === 200) {
      const data: InicioResponse = await res.json();
      setUsers(data.usuarios);
      setItems(data.citas);
      setCitasEstados(data.citas_estados);
      console.log(data.citas_estados)
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

  const [selectedOption, setSelectedOption] = useState<"camaras" | "internet" | null>(null);
  const handleSelection = (option: "camaras" | "internet") => {
    setSelectedOption((prev) => (prev === option ? null : option)); 
  };

  const [selectedOptionEventos, setSelectedOptionEventos] = useState<"my" | "all" | null>(null);
  const handleSelectionEventos = (option: "my" | "all") => {
    setSelectedOptionEventos((prev) => (prev === option ? null : option)); 
  }

  useEffect(() => {
    
    if (user.rol == "tecnico"){
      setSelectedOptionEventos("my");
    } else {
      setSelectedOptionEventos("all");
    }

    cargarInicio();
  }, [selectedDay]);

  const [hora, setHora] = useState<Date | null>(new Date());
  const handleHoraChange = (idcita: string, date: Date | null) => {
  if (date) {
    const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 cursor-pointer"
            >
              ← Anterior
            </button>
            <button
              onClick={goToday}
              className="rounded-xl border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-sm font-bold text-orange-100 hover:bg-orange-500/20 cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={goNext}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 cursor-pointer"
            >
              Siguiente →
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-xs text-white/60">Ir a</span>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </div>
          </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 w-full cuadro shrink-0" hidden>

        <div className="flex justify-between items-center">
        <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1">
          <FilePlusCorner className="w-4 h-4"/><span>Nueva tarea</span>
        </h2>
        
        <div className="flex gap-3">
          <button
              onClick={() => handleSelection("camaras")}
              className={`boton flex gap-1 justify-center items-center ${
                selectedOption == "camaras"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-gray-800 hover:bg-gray-400"
              }`}
            >
              <Cctv className="w-4 h-4" />
              Cámaras
            </button>
          <button
            onClick={() => handleSelection("internet")}
            className={`boton flex gap-1 justify-center items-center ${
              selectedOption == "internet"
                ? "bg-green-500 text-white"
                : "bg-gray-300 text-gray-800 hover:bg-gray-400"
            }`}
          >
            <Globe className="w-4 h-4" />
            Internet
          </button>
        </div>

      </div>
          {selectedOption && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between gap-2">

                <div className="w-full">
                  <label className="block text-xs text-white/60 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={selectedDayNuevaCita}
                    onChange={(e) => setSelectedDayNuevaCita(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                  />
                </div>

                <div className="w-full">
                <label className="block text-xs text-white/60 mb-1">Hora</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={20}
                  placeholder="Detalles, tareas, pendientes, etc."
                  className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
                />
              </div>

                {user.rol == "moderador" || user.rol == "administrador" || user.rol == "superadmin" && (
                <div>
                  <label className="block text-xs text-white/60 mb-1">Asignado a</label>
                  <select className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full">
                    <option key={user?.id} value={user?.id} selected>{user?.fullname}</option>
                    {users.filter(u => u.id !== user?.id).map((u) => (
                      <option key={u.id} value={u.id}>{u.fullname}</option>
                    ))}
                  </select>
                </div>
                )}

              <div className="flex items-center gap-2">
                <button
                  className="flex-1 boton bg-orange-500 text-white hover:bg-orange-600"
                >
                </button>

              </div>
            </div>
            )}
      </div>
      </div>

          <div className="flex-1 min-h-0 cuadro flex flex-col w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold tracking-tight">Eventos del día</h2>
              <span className="flex items-center gap-3">
                <button onClick={() => handleSelectionEventos("my")} className={`boton border border-white/10 ${
                  selectedOptionEventos == "my"
                  ? "bg-orange-600 hover:bg-white/20"
                  : "hover:bg-orange-600 bg-white/20"
                }`}>
                  Mis eventos</button>
                {user.rol == "moderador" || user.rol == "administrador" || user.rol == "superadmin" && (
                  <button onClick={() => handleSelectionEventos("all")} className={`boton border border-white/10 ${
                    selectedOptionEventos == "all"
                    ? "bg-orange-600 hover:bg-white/20"
                    : "hover:bg-orange-600 bg-white/20"
                  }`}>
                    Todos los eventos</button>
                )}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mt-3 pr-2 items-start">
              {dayItems.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-white/60">
                  No hay eventos para este día.
                </div>
              ) : (
                dayItems.map((it) => (
                  <div
                    key={it.idcita}
                    className="rounded-2xl border border-white/10 bg-zinc-950/30 p-3 hover:bg-zinc-950/40 transition"
                  >
                    <div>
                      <div className="flex justify-between items-start">
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
                          <div className="text-sm font-extrabold">{it.nombre}</div>
                          <select value={it.idestado} className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2" style={{ backgroundColor: it.color, borderColor: darkenColor(it.color, 0.5), }} title="Cambiar estado" onChange={(e) => cambiarEstado(it.idcita, e.target.value)}>
                            <option value={it.idestado} className="font-bold bg-white text-black">{it.estado}</option>
                            {citasEstados.filter((estado) => estado.id !== it.idestado).map((estado) => (
                              <option key={estado.id} value={estado.id} className="font-bold bg-white text-black">{estado.estado}</option>
                            ))}
                          </select>

                          {it.tipo == "camarasdesdecero" && (
                            <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-blue-700 bg-blue-500 flex justify-center items-center gap-1"><Cctv className="h-4 w-4" /><span>INSTALACIÓN DE CÁMARAS</span></div>
                          )}
                        </div>
                        
                        <div>
                          <span className="text-xs italic text-white/60">Asginado a <strong>{it.fullname}</strong></span>
                        </div>
                      </div>

                      <div>
                          <div className="text-sm text-white/80 mt-1 whitespace-pre-wrap w-full">{it.notas}</div>
                        </div>
                      
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
  );
}
