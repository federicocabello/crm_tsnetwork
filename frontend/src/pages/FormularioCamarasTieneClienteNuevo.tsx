import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { ClipboardList, Drill, Wrench, CircleDollarSign, SearchAlert, Files, Loader2, Save } from 'lucide-react';
import type { Usuarios } from "../types/auth";
import DatePicker from "react-datepicker";
import Cotizador from "./Cotizador";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { agendaDayClassName, dateKeyToDate, formatDateKey, isSelectableAgendaDate, isSundayKey } from "../utils/agendaFechas";

export default function FormularioCamarasTieneClienteNuevo() {
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const { user } = useAuth();
    const [loading, setLoading] = useState<boolean>(false);
    const guardadoEnCurso = useRef(false);
    const navigate = useNavigate();
    const [users, setUsers] = useState<Usuarios[]>([]);
    const [opcionTipoInstalacion, setOpcionTipoInstalacion] = useState<"instalacion" | "soporte" | null>(null);

    type Presupuesto = Record<number, {
  cantidad: number;
  costo: string;
  precioFinal: string;
}>

    type Formulario = {
      nombre: string;
      direccion: string;
      telefono: string;
      email: string;
      fecha: string,
      asignado: string,
      presupuesto: Presupuesto,
    };

    const [formRegistro, setFormRegistro] = useState<Formulario>({
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      fecha: '',
      asignado: user?.id || "",
      presupuesto: {} as Presupuesto,
    });

    const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
    const [openPresupuesto, setOpenPresupuesto] = useState(false);

    const handleSubmitPresupuesto = (data: Presupuesto) => {
    setPresupuesto(data);
  };

  const handleCloseModal = (close: boolean) => {
    setOpenPresupuesto(close);
  };

    const [notas, setNotas] = useState("")

    type Preguntas = {
        atico: "espacioso" | "espuma" | "no tiene" | null;
        cableado: "red" | "coaxial" | "no tiene" | null;
        modelonvr?: string;
    }
    
    const [respuestas, setRespuestas] = useState<Preguntas>({
        atico: null,
        cableado: null,
        modelonvr: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormRegistro((prevState) => ({
        ...prevState,
        [name]: value,
      }));
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
    
    useEffect(() => {
      cargarUsuarios();
    }, []);

    const [horaMostrar, setHoraMostrar] = useState<Date | null>(null);
    const [hora, setHora] = useState("");

  const handleHoraChange = ( date: Date | null) => {
    setHoraMostrar(date);
  if (date) {
    const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    setHora(formattedTime);
  }}

  const opcionClase = (activo: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-xs font-extrabold cursor-pointer transition-all ${
      activo
        ? "bg-orange-600 text-white border-orange-600 shadow-md"
        : "bg-[var(--bg-surface-2)] text-[var(--text-primary)] border-[var(--bg-border)] hover:border-orange-500 hover:text-orange-500"
    }`;

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

    const submitFormularioCamarasTiene = async (e: React.FormEvent) => {
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
        opcionTipoInstalacion: opcionTipoInstalacion,
        presupuesto: presupuesto,
        };
        try {
        const response = await fetch(`${API_URL}/api/nuevo-registro/camaras/tiene/nuevo`, {
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

          navigate("/inicio");
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
    const [files, setFiles] = useState<File[]>([]);

    return (
            <div className="flex flex-col gap-3">

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">Nombre</label>
              <input
                type="text"
                name="nombre"
                placeholder="Nombre completo"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 uppercase"
                value={formRegistro.nombre}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">Dirección</label>
              <input
                type="text"
                name="direccion"
                placeholder="Dirección"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 uppercase"
                value={formRegistro.direccion}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                placeholder="(+1) 000-0000"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
                value={formRegistro.telefono}
                onChange={handleInputChange}
                onBlur={handleBlur}
              />
              {alerta && (
              <div className="text-red-500 text-xs flex items-center"><SearchAlert className="w-4 h-4 mr-1" />{alerta}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">Email</label>
              <input
                type="email"
                name="email"
                placeholder="correo@email.com"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 lowercase"
                value={formRegistro.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex flex-col gap-1">
              <textarea
                name="notas"
                placeholder="Notas..."
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
              {opcionTipoInstalacion == "instalacion" && (
                <div className="text-xs italic transition-all mt-1 text-white/60">ACLARACIÓN: preguntar si utiliza alguna aplicación y <strong className="text-red-500">solicitar credenciales.</strong> Apuntarlo en "Notas".</div>
                )}
            </div>
            

            <div className="flex justify-between items-center gap-2 mt-2">
            <button className={`p-1! text-xs! w-full flex items-center justify-center gap-1 ${
                  opcionTipoInstalacion == "instalacion"
                    ? "bg-green-600 text-white border"
                    : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }`} onClick={() => setOpcionTipoInstalacion("instalacion")}>
                    <Drill className="h-4 w-4" />
                    Instalación</button>
            
            <button className={`p-1! text-xs! w-full flex items-center justify-center gap-1 ${
                  opcionTipoInstalacion == "soporte"
                    ? "bg-green-600 text-white border"
                    : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }`} onClick={() => setOpcionTipoInstalacion("soporte")}>
                <Wrench className="h-4 w-4" />
                Soporte</button>
          </div>

            {opcionTipoInstalacion == "instalacion" && (
                <div>
              <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1 mb-2">
                <ClipboardList className="w-4 h-4" /><span>Datos de la instalación</span>
              </h2>
            
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div>
                  <label className="text-xs text-white/60">Modelo de cámara y NVR</label>
                  <input
                    type="text"
                    name="modelocamara"
                    placeholder="Modelos"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 uppercase"
                    value={respuestas.modelonvr}
                    onChange={(e) => setRespuestas((prev) => ({ ...prev, modelonvr: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col justify-end">
            <button
              onClick={() => setOpenPresupuesto(true)}
              className="boton bg-green-600 hover:bg-green-800 cursor-pointer flex gap-1 items-center">
              <CircleDollarSign className="h-4 w-4" />
              Presupuesto
            </button>
            </div>
              </div>

              {openPresupuesto && (
                      <Cotizador
                        onClose={handleCloseModal}
                        setCotizacion={handleSubmitPresupuesto}
  cotizacionInicial={presupuesto}
                        categoriaServicio="camaras"
                      />
                    )}

                <div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-white/60">Ático</label>
                        <div className="flex gap-1">
                        <div
                            onClick={() => setRespuestas((prev) => ({ ...prev, atico: "espacioso" }))}
                            className={opcionClase(respuestas.atico == "espacioso")}
                        >
                            Espacioso
                        </div>
                        <div
                            onClick={() => setRespuestas((prev) => ({ ...prev, atico: "espuma" }))}
                            className={opcionClase(respuestas.atico == "espuma")}
                        >
                            Espuma (FOAM)
                        </div>
                        <div
                            onClick={() => setRespuestas((prev) => ({ ...prev, atico: "no tiene" }))}
                            className={opcionClase(respuestas.atico == "no tiene")}
                        >
                            No tiene
                        </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-white/60">Cableado</label>
                    <div className="flex gap-1">
                    <div
                        onClick={() => setRespuestas((prev) => ({ ...prev, cableado: "red" }))}
                        className={opcionClase(respuestas.cableado == "red")}
                    >
                        Red
                    </div>
                    <div
                        onClick={() => setRespuestas((prev) => ({ ...prev, cableado: "coaxial" }))}
                        className={opcionClase(respuestas.cableado == "coaxial")}
                    >
                        Coaxial
                    </div>
                    <div
                        onClick={() => setRespuestas((prev) => ({ ...prev, cableado: "no tiene" }))}
                        className={opcionClase(respuestas.cableado == "no tiene")}
                    >
                        No tiene, hay que cablear
                    </div>
                    </div>
                </div>

            </div>
            </div>
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
          disabled={loading || !formRegistro.nombre || !formRegistro.telefono || !formRegistro.fecha || !hora || !opcionTipoInstalacion || telefonoDuplicado || validandoTelefono}
          onClick={submitFormularioCamarasTiene}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-orange-600/20 transition w-full mt-2">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /><span>Guardando Registro...</span></>
          ) : (
            <><Save className="h-4 w-4" /><span>Guardar Registro de Cliente</span></>
          )}
        </button>

      </div>
    )}
