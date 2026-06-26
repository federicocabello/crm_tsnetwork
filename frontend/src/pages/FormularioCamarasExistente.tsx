import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ClipboardList, Drill, Wrench, CircleDollarSign, Files, Home, Phone } from 'lucide-react';
import type { Usuarios } from "../types/auth";
import DatePicker from "react-datepicker";
import Cotizador from "./Cotizador";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { agendaDayClassName, dateKeyToDate, formatDateKey, isSelectableAgendaDate, isSundayKey } from "../utils/agendaFechas";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  domicilio: string;
};

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function FormularioCamarasExistente() {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Usuarios[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

        interface Presupuesto {
        cantidad: number;
        costo: string;
        precioFinal: string;
      }
  
      type Formulario = {
        fecha: string,
        asignado: string,
        presupuesto: Presupuesto,
      };
  
      const [formRegistro, setFormRegistro] = useState<Formulario>({
        fecha: '',
        asignado: user?.id || "",
        presupuesto: {} as Presupuesto,
      });

  const [opcionTipoInstalacion, setOpcionTipoInstalacion] = useState<"instalacion" | "soporte" | null>(null);

  const contenedorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const buscarClientes = async () => {
      const texto = busqueda.trim();

      if (texto.length < 2) {
        setResultados([]);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `${API_URL}/api/clientes/buscar?q=${encodeURIComponent(texto)}`
        );

        if (!res.ok) {
          console.error("Error buscando clientes:", res.status);
          setResultados([]);
          return;
        }

        const data: Cliente[] = await res.json();
        setResultados(data);
        setMostrarMenu(true);
      } catch (error) {
        console.error("Error de conexión:", error);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      buscarClientes();
    }, 300);

    return () => clearTimeout(timeout);
  }, [busqueda]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setMostrarMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

      const seleccionarCliente = (cliente: Cliente) => {
        setMostrarMenu(false);
        setClienteSeleccionado(cliente);
        setBusqueda(cliente.nombre);
      };

      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormRegistro((prev) => ({
          ...prev,
          [name]: value,
        }));
      };

      const handleInputChangeCliente = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (!clienteSeleccionado) return;
        setClienteSeleccionado((prev) => prev ? ({ ...prev, [name]: value }) : null);
      }
  
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
      }
    }
  
    const opcionClase = (activo: boolean) =>
      `rounded-xl border px-3 py-2 text-sm font-bold cursor-pointer transition-all
       ${
         activo
           ? "bg-orange-500 text-white border-orange-500"
           : "bg-zinc-950/40 text-white border-white/10 hover:border-orange-500/50"
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
          if (isSundayKey(formRegistro.fecha)) {
            alert("No se pueden agendar visitas los domingos.");
            return;
          }
    
          const datosCompletos = {
          datos: formRegistro,
          preguntas: respuestas,
          user: user,
          notas: notas,
          hora: hora,
          opcionTipoInstalacion: opcionTipoInstalacion,
          presupuesto: presupuesto,
          clienteSeleccionado: clienteSeleccionado,
          };
          try {
          const response = await fetch(`${API_URL}/api/nuevo-registro/camaras/tiene/existente`, {
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
          }
      };

      const [files, setFiles] = useState<File[]>([]);

  return (
    <div>
      <div ref={contenedorRef}>
        <label className="mb-1 block text-xs text-white/60">Buscar cliente</label>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setClienteSeleccionado(null);
          }}
          onFocus={() => {
            if (resultados.length > 0) setMostrarMenu(true);
          }}
          placeholder="Escribe nombre o teléfono..."
          className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
        />

        {mostrarMenu && resultados.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-60 w-1/4 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 shadow-lg">
            {resultados.map((cliente) => (
              <button
                type="button"
                key={cliente.id}
                onClick={() => seleccionarCliente(cliente)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-800"
              >
                <span className="text-sm font-semibold text-white">{cliente.nombre}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefono}</span>
                  {cliente.domicilio && (<span className="text-xs text-white/60 flex items-center gap-1"><Home className="w-3 h-3" />{cliente.domicilio}</span>)}
                </div>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-1 text-xs text-white/50">Buscando...</div>
        )}

        {clienteSeleccionado && (
        <div>
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300 my-3">
              Cliente seleccionado: <strong>{clienteSeleccionado.nombre}</strong> (ID {clienteSeleccionado.id})
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                placeholder="(+1) 000-0000"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
                value={clienteSeleccionado.telefono}
                onChange={handleInputChangeCliente}
              />
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs text-white/60">Dirección</label>
              <input
                type="text"
                name="domicilio"
                placeholder="Dirección"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 uppercase"
                value={clienteSeleccionado.domicilio}
                onChange={handleInputChangeCliente}
              />
            </div>
        </div>
        )}

        <div className="flex flex-col gap-1 mt-3">
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

      </div>

                    <div className="flex justify-between items-center gap-2 my-3">
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
        
                        <div className="flex items-center justify-around gap-2">
                            <div className="w-48 my-2">
                              <label className="text-xs text-white/60">Fecha de visita</label>
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
                                placeholderText="Seleccionar fecha"
                                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                                wrapperClassName="w-full"
                                calendarClassName="agenda-datepicker"
                              />
                            </div>
                            
                            <div className="w-32">
                              <label className="text-xs text-white/60">Horario</label>
                              <DatePicker
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="Hora"
                                dateFormat="h:mm aa"
                                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                                selected={horaMostrar}
                                onChange={handleHoraChange}
                              />
                            </div>

                            <div className="w-32">
                              <label className="text-xs text-white/60">Archivos</label>
                              <label className="flex items-center justify-center w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm cursor-pointer hover:border-orange-500/40 transition gap-1">
                                <Files className="h-4 w-4" />Seleccionar
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
                      <div className="text-xs text-white/60 my-1">
                        {files.map((f, i) => (
                          <div key={i}>📄 {f.name}</div>
                        ))}
                      </div>
                    )}
        
                    <div>
                      <label className="text-xs text-white/60">Asignar a</label>
                      <select className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full" name="asignado" onChange={handleInputChange}>
                            <option key={user?.id} value={user?.id} selected>{user?.fullname}</option>
                            {users.filter(u => u.id !== user?.id && u.habilitado == true).map((u) => (
                              <option key={u.id} value={u.id}>{u.fullname}</option>
                            ))}
                      </select>
                    </div>
        
                      {clienteSeleccionado && formRegistro.fecha && hora && opcionTipoInstalacion && (
                        <button className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-orange-600 cursor-pointer mt-3 w-full" disabled={loading} onClick={submitFormularioCamarasTiene}>
                          {loading ? "Guardando..." : "Guardar"}
                        </button>
                      )}

    </div>
  );
}
