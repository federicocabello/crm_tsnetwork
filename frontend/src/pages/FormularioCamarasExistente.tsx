import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ClipboardList, Drill, Wrench, CircleDollarSign } from 'lucide-react';
import type { Usuarios } from "../types/auth";
import DatePicker from "react-datepicker";
import Cotizador from "./Cotizador";
import "react-datepicker/dist/react-datepicker.css";

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
        presupuesto: '',
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
    setClienteSeleccionado(cliente);
    setBusqueda(cliente.nombre);
    setMostrarMenu(false);

  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormRegistro((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
      const [presupuesto, setPresupuesto] = useState([]);
      const [openPresupuesto, setOpenPresupuesto] = useState(false);
  
      const handleSubmitPresupuesto = (data) => {
      setPresupuesto(data);
    };
  
    const handleCloseModal = (close) => {
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
    }}
  
    const opcionClase = (activo: boolean) =>
      `rounded-xl border px-3 py-2 text-sm font-bold cursor-pointer transition-all
       ${
         activo
           ? "bg-orange-500 text-white border-orange-500"
           : "bg-zinc-950/40 text-white border-white/10 hover:border-orange-500/50"
       }`;
  
      const submitFormularioCamarasTiene = async (e: React.FormEvent) => {
          e.preventDefault();
    
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
  
          if (response.ok) {
              console.log("Formulario enviado correctamente");
              window.location.href = "/inicio";
          } else {
              console.log("Hubo un error al enviar el formulario");
          }
          } catch (error) {
          console.error("Error en la conexión con el backend", error);
          }
      };

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
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 shadow-lg">
            {resultados.map((cliente) => (
              <button
                type="button"
                key={cliente.id}
                onClick={() => seleccionarCliente(cliente)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-800"
              >
                <span className="text-sm font-semibold text-white">
                  {cliente.nombre}
                </span>
                <span className="text-xs text-white/60">
                  {cliente.telefono} {cliente.domicilio && (`- ${cliente.domicilio}`)}
                </span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-1 text-xs text-white/50">Buscando...</div>
        )}

        {clienteSeleccionado && (
        <div>

            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300 mt-3">
            Cliente seleccionado: <strong>{clienteSeleccionado.nombre}</strong> (ID {clienteSeleccionado.id})
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
                      onChange={handleSubmitPresupuesto}
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
        
                    <div className="my-2">
                      <label className="text-xs text-white/60">Fecha y hora de visita</label>
                      <div className="flex gap-2">
                        <input type="date" name="fecha" className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer" value={formRegistro.fecha} onChange={handleInputChange} />
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
                    </div>
        
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