import { useState, useEffect, useRef } from "react";
import { CircleDollarSign, SearchAlert, ClipboardList, Files, Loader2, Save } from 'lucide-react';
import { useAuth } from "../auth/AuthContext";
import type { Usuarios } from "../types/auth";
import DatePicker from "react-datepicker";
import Cotizador from "./Cotizador";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { agendaDayClassName, dateKeyToDate, formatDateKey, isSelectableAgendaDate, isSundayKey } from "../utils/agendaFechas";

type FormularioCamarasDesdeCeroProps = {
  tipoRegistro?: "camaras" | "internet";
};

type EstadoCita = {
  id: string;
  estado: string;
  color?: string;
};

export default function FormularioCamarasDesdeCero({ tipoRegistro = "camaras" }: FormularioCamarasDesdeCeroProps) {
  const esInternet = tipoRegistro === "internet";
  const [estadoInternet, setEstadoInternet] = useState("");
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const guardadoEnCurso = useRef(false);
  const navigate = useNavigate();
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [citasEstados, setCitasEstados] = useState<EstadoCita[]>([]);

  type Presupuesto = { productos: Record<number, { cantidad: number; costo: string; precioFinal: string }>; descuento: number }

type SiNo = "si" | "no" | null;

type Lugar = "casa" | "negocio" | "traila" | "foodtruck" | "apartamento" | null;
type Area = "interior" | "exterior" | null;
type Atico = "espacioso" | "espuma" | "no tiene" | null;
type Estructura = "movil" | "standard" | "casona" | null;

type Formulario = {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  fecha: string;
  asignado: string | "";
};

type Preguntas = {
  lugar: Lugar;
  audio: SiNo;
  area: Area;
  atico: Atico;
  monitor: SiNo;
  estructura: Estructura;
};

const [formRegistro, setFormRegistro] = useState<Formulario>({
  nombre: "",
  direccion: "",
  telefono: "",
  email: "",
  fecha: "",
  asignado: user?.id || "",
});

const [respuestas, setRespuestas] = useState<Preguntas>({
  lugar: null,
  audio: null,
  area: null,
  atico: null,
  monitor: null,
  estructura: null,
});

  const opcionClase = (activo: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-xs font-extrabold cursor-pointer transition-all ${
      activo
        ? "bg-orange-600 text-white border-orange-600 shadow-md"
        : "bg-[var(--bg-surface-2)] text-[var(--text-primary)] border-[var(--bg-border)] hover:border-orange-500 hover:text-orange-500"
    }`;

    const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
    const [openPresupuesto, setOpenPresupuesto] = useState(false);

  const handleSubmitPresupuesto = (data: Presupuesto) => {
    setPresupuesto(data );
  };

  const handleCloseModal = (close: boolean) => {
    setOpenPresupuesto(close);
  };

    const cargarUsuarios = async () => {
      try {
        const res = await fetch(`${API_URL}/api/usuarios`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data: Usuarios[] = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      }
    };
    
    const cargarEstados = async () => {
      try {
        const res = await fetch(`${API_URL}/api/configuracion`);
        if (res.ok) {
          const data = await res.json();
          setCitasEstados(data.citas_estados || []);
        }
      } catch (error) {
        console.error("Error al cargar estados de cita:", error);
      }
    };

    useEffect(() => {
      cargarUsuarios();
      cargarEstados();
    }, []);

    const [horaMostrar, setHoraMostrar] = useState<Date | null>(null);
    const [hora, setHora] = useState("");

    const handleHoraChange = ( date: Date | null) => {
      setHoraMostrar(date);
    if (date) {
      const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      setHora(formattedTime);
    }}

    const subirArchivos = async (idCita: number | string) => {
      if (files.length === 0) return;

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("archivos", file);
      });

      const res = await fetch(`${API_URL}/api/citas/${idCita}/archivos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Error de conexión subiendo archivos:", error);
      }
    };

      const submitFormularioCamarasDesdeCero = async (e: React.FormEvent) => {
          e.preventDefault();
          if (guardadoEnCurso.current) return;
          if (isSundayKey(formRegistro.fecha)) {
            alert("No se pueden agendar visitas los domingos.");
            return;
          }
          guardadoEnCurso.current = true;
          setLoading(true);

          const datosCompletos = {
            datos: formRegistro,
            preguntas: respuestas,
            user: user,
            notas: notas,
            hora: hora,
            presupuesto: presupuesto,
            tipoRegistro: tipoRegistro,
            estadoCita: estadoInternet,
          };

          try {
            const response = await fetch(`${API_URL}/api/nuevo-registro/guardar`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(datosCompletos),
            });

            const data = await response.json();

            if (response.ok) {
              console.log("Formulario enviado correctamente");

              if (data.id_cita) {
                await subirArchivos(data.id_cita);
              }

              navigate(`/inicio`);
            } else {
              console.log("Hubo un error al enviar el formulario", data);
            }
          } catch (error) {
            console.error("Error en la conexión con el backend", error);
          } finally {
            guardadoEnCurso.current = false;
            setLoading(false);
          }
        };
    const [alerta, setAlerta] = useState<string | null>(null);
    const [telefonoDuplicado, setTelefonoDuplicado] = useState(false);
    const [validandoTelefono, setValidandoTelefono] = useState(false);

    const validarTelefono = async () => {
      const telefono = formRegistro.telefono.replace(/\D/g, "");
      if (!telefono) {
        setTelefonoDuplicado(false);
        setAlerta(null);
        return;
      }

      setValidandoTelefono(true);
      try {
        const response = await fetch(`/api/clientes/buscar-telefono?telefono=${encodeURIComponent(telefono)}`);
        const data = await response.json();
        const existe = Boolean(data.existe);
        setTelefonoDuplicado(existe);
        setAlerta(existe ? `Número de teléfono ya registrado con el cliente: ${data.cliente.nombre}` : null);
      } catch (error) {
        console.error("Error al buscar el teléfono:", error);
        setTelefonoDuplicado(false);
        setAlerta("Hubo un error al buscar el teléfono.");
      } finally {
        setValidandoTelefono(false);
      }
    };

    useEffect(() => {
      setTelefonoDuplicado(false);
      setAlerta(null);
      if (!formRegistro.telefono.replace(/\D/g, "")) return;

      setValidandoTelefono(true);
      const timer = window.setTimeout(() => {
        void validarTelefono();
      }, 400);
      return () => {
        window.clearTimeout(timer);
        setValidandoTelefono(false);
      };
    }, [formRegistro.telefono]);

    const handleBlur = () => {
      void validarTelefono();
    };
    const [notas, setNotas] = useState("")

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormRegistro((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    };

    const handleRespuestaChange = <K extends keyof Preguntas>(
      key: K,
      value: Preguntas[K]
    ) => {
      setRespuestas((prev) => ({
        ...prev,
        [key]: value,
      }));
    };

    const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[var(--text-muted)]">Nombre</label>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-3 py-2 text-sm outline-none focus:border-orange-500 uppercase"
          value={formRegistro.nombre}
          onChange={handleInputChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[var(--text-muted)]">Dirección</label>
        <input
          type="text"
          name="direccion"
          placeholder="Dirección"
          className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-3 py-2 text-sm outline-none focus:border-orange-500 uppercase"
          value={formRegistro.direccion}
          onChange={handleInputChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[var(--text-muted)]">Teléfono</label>
        <input
          type="tel"
          name="telefono"
          placeholder="(+1) 000-0000"
          className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-3 py-2 text-sm outline-none focus:border-orange-500"
          value={formRegistro.telefono}
          onChange={handleInputChange}
          onBlur={handleBlur}
        />
        {alerta && (
          <div className="text-red-500 text-xs flex items-center font-bold mt-1"><SearchAlert className="w-4 h-4 mr-1 shrink-0" />{alerta}</div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[var(--text-muted)]">Email</label>
        <input
          type="email"
          name="email"
          placeholder="correo@email.com"
          className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-3 py-2 text-sm outline-none focus:border-orange-500 lowercase"
          value={formRegistro.email}
          onChange={handleInputChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-[var(--text-muted)]">Notas</label>
        <textarea
          name="notas"
          placeholder="Notas adicionales..."
          rows={3}
          className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-3 py-2 text-sm outline-none focus:border-orange-500 resize-none font-sans"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      {!esInternet && (
        <>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5 mb-2 border-b border-[var(--bg-border)] pb-1.5 text-orange-500">
              <ClipboardList className="w-4 h-4" /><span>Datos de la instalación</span>
            </h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-muted)]">Lugar</label>
              <div className="flex flex-wrap gap-1.5">
                <div onClick={() => handleRespuestaChange("lugar", "casa")} className={opcionClase(respuestas.lugar == "casa")}>Casa</div>
                <div onClick={() => handleRespuestaChange("lugar", "negocio")} className={opcionClase(respuestas.lugar == "negocio")}>Negocio</div>
                <div onClick={() => handleRespuestaChange("lugar", "traila")} className={opcionClase(respuestas.lugar == "traila")}>Tráila</div>
                <div onClick={() => handleRespuestaChange("lugar", "foodtruck")} className={opcionClase(respuestas.lugar == "foodtruck")}>Foodtruck</div>
                <div onClick={() => handleRespuestaChange("lugar", "apartamento")} className={opcionClase(respuestas.lugar == "apartamento")}>Apartamento</div>
              </div>
            </div>
            {respuestas.lugar == "foodtruck" && (
              <div className="text-xs italic mt-1.5 text-[var(--text-muted)] bg-[var(--bg-surface-2)] p-2 rounded-lg border border-[var(--bg-border)]">
                ACLARACIÓN: preguntar si cuenta con internet y monitor. <strong className="text-red-500">Sin internet no podemos proceder.</strong>
              </div>
            )}
            {respuestas.lugar == "apartamento" && (
              <div className="text-xs italic mt-1.5 text-[var(--text-muted)] bg-[var(--bg-surface-2)] p-2 rounded-lg border border-[var(--bg-border)]">
                ACLARACIÓN: es necesario obtener el permiso del arrendador <strong className="text-red-500">para perforar</strong> antes de realizar la instalación.
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-muted)]">Audio</label>
              <div className="flex gap-1">
                <div onClick={() => handleRespuestaChange("audio", "si")} className={opcionClase(respuestas.audio == "si")}>Sí</div>
                <div onClick={() => handleRespuestaChange("audio", "no")} className={opcionClase(respuestas.audio == "no")}>No</div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-muted)]">Área</label>
              <div className="flex gap-1">
                <div onClick={() => handleRespuestaChange("area", "interior")} className={opcionClase(respuestas.area == "interior")}>Interior</div>
                <div onClick={() => handleRespuestaChange("area", "exterior")} className={opcionClase(respuestas.area == "exterior")}>Exterior</div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[var(--text-muted)]">Monitor</label>
              <div className="flex gap-1">
                <div onClick={() => handleRespuestaChange("monitor", "si")} className={opcionClase(respuestas.monitor == "si")}>Sí</div>
                <div onClick={() => handleRespuestaChange("monitor", "no")} className={opcionClase(respuestas.monitor == "no")}>No</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--text-muted)]">Ático</label>
                <div className="flex flex-wrap gap-1">
                  <div onClick={() => handleRespuestaChange("atico", "espacioso")} className={opcionClase(respuestas.atico == "espacioso")}>Espacioso</div>
                  <div onClick={() => handleRespuestaChange("atico", "espuma")} className={opcionClase(respuestas.atico == "espuma")}>Espuma (FOAM)</div>
                  <div onClick={() => handleRespuestaChange("atico", "no tiene")} className={opcionClase(respuestas.atico == "no tiene")}>No tiene</div>
                </div>
              </div>
            </div>
            {respuestas.atico && (
              <div className="text-xs italic mt-1.5 text-[var(--text-muted)] bg-[var(--bg-surface-2)] p-2 rounded-lg border border-[var(--bg-border)]">
                ACLARACIÓN: con <strong className="text-red-500">insulación normal</strong> se facilita la instalación. Con <strong className="text-red-500">insulación de espuma</strong>, requiere canaletas externas.
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--text-muted)]">Estructura</label>
                <div className="flex flex-wrap gap-1">
                  <div onClick={() => handleRespuestaChange("estructura", "movil")} className={opcionClase(respuestas.estructura == "movil")}>Móvil</div>
                  <div onClick={() => handleRespuestaChange("estructura", "standard")} className={opcionClase(respuestas.estructura == "standard")}>Standard</div>
                  <div onClick={() => handleRespuestaChange("estructura", "casona")} className={opcionClase(respuestas.estructura == "casona")}>Casona</div>
                </div>
              </div>

              <button
                onClick={() => setOpenPresupuesto(true)}
                className="btn-primary py-2 px-3 text-xs font-black self-end">
                <CircleDollarSign className="h-4 w-4" />
                Presupuesto
              </button>
            </div>

            {respuestas.estructura && (
              <div className="text-xs italic mt-1.5 text-[var(--text-muted)] bg-[var(--bg-surface-2)] p-2 rounded-lg border border-[var(--bg-border)]">
                ACLARACIÓN: si no aparece en el mapa, pedir fotos de la casa <strong className="text-red-500">frente, atrás y costados</strong>.
              </div>
            )}
          </div>
        </>
      )}

      {esInternet && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-[var(--text-muted)]">Estado de Cita</label>
          <select
            value={estadoInternet}
            onChange={(e) => setEstadoInternet(e.target.value)}
            className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-3 py-2 text-sm outline-none focus:border-orange-500">
            <option value="">Seleccionar estado</option>
            {citasEstados.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.estado}
              </option>
            ))}
          </select>
        </div>
      )}

      {esInternet && (
        <button
          onClick={() => setOpenPresupuesto(true)}
          className="btn-primary py-2 px-4 text-xs font-black justify-center w-full">
          <CircleDollarSign className="h-4 w-4" />
          Cotización / Presupuesto
        </button>
      )}

      {/* FILA DE FECHA, HORA Y ARCHIVOS - 100% RESPONSIVA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--bg-border)]">
        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Fecha Visita</label>
          <DatePicker
            selected={dateKeyToDate(formRegistro.fecha)}
            onChange={(date: Date | null) => {
              setFormRegistro((prev) => ({
                ...prev,
                fecha: date ? formatDateKey(date) : "",
              }));
            }}
            filterDate={isSelectableAgendaDate}
            dayClassName={agendaDayClassName}
            dateFormat="MM/dd/yyyy"
            placeholderText="Seleccionar"
            className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-2.5 py-2 text-xs font-bold outline-none focus:border-orange-500 cursor-pointer"
            wrapperClassName="w-full"
            calendarClassName="agenda-datepicker"
          />
        </div>
        
        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Horario</label>
          <DatePicker
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Hora"
            dateFormat="h:mm aa"
            className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] text-[var(--text-primary)] px-2.5 py-2 text-xs font-bold outline-none focus:border-orange-500 cursor-pointer"
            selected={horaMostrar}
            onChange={handleHoraChange}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Archivos</label>
          <label className="flex items-center justify-center w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] px-2.5 py-2 text-xs font-bold cursor-pointer hover:border-orange-500 transition gap-1">
            <Files className="h-4 w-4 text-orange-500" />Adjuntar
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {if (e.target.files) {setFiles(Array.from(e.target.files));}}}
            />
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface-2)] p-2 rounded-lg border border-[var(--bg-border)] space-y-1">
          {files.map((f, i) => (
            <div key={i} className="truncate">📄 {f.name}</div>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Asignar A</label>
        <select className="capitalize bg-[var(--bg-input)] border border-[var(--bg-border)] text-[var(--text-primary)] p-2 rounded-xl text-xs font-bold cursor-pointer w-full" name="asignado" onChange={handleInputChange}>
          <option key={user?.id} value={user?.id} selected>{user?.fullname}</option>
          {users.filter(u => u.id !== user?.id && u.habilitado == true).map((u) => (
            <option key={u.id} value={u.id}>{u.fullname}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={loading || !formRegistro.nombre || !formRegistro.telefono || !formRegistro.fecha || !hora || (esInternet && !estadoInternet) || telefonoDuplicado || validandoTelefono}
        onClick={submitFormularioCamarasDesdeCero}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-orange-600/20 transition w-full mt-2">
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /><span>Guardando Registro...</span></>
        ) : (
          <><Save className="h-4 w-4" /><span>Guardar Registro de Cliente</span></>
        )}
      </button>

      {openPresupuesto && (
        <Cotizador
          onClose={handleCloseModal}
          setCotizacion={handleSubmitPresupuesto}
  cotizacionInicial={presupuesto}
          categoriaServicio={tipoRegistro === "internet" ? "internet" : "camaras"}
        />
      )}
    </div>
  )}
