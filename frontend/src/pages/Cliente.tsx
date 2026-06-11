import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";
import { Mail, User, CalendarFold, Cctv, Wrench, TriangleAlert, List, Clock, House, ClipboardPlus } from "lucide-react";
import { darkenColor } from "../utils/colores";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Loading from "../components/Loading";
import type { Usuarios } from "../types/auth";
import FormatearNumero from "../components/FormatearNumero";
import PlanDePagos from "../components/PlanDePagos";

  type Cita = {
    idcita: number;
    dia: string;
    hora: string;
    tipo: string;
    notas: string;
    telefono: string;
    domicilio: string;
    asignado: string;
    estado: string;
    color: string;
    dia_format: string;
    hora_format: string;
    hora_24: string;
    idestado: string;
    idasignado: string;
  };

  type Cliente = {
    idcliente: number;
    nombre: string;
    email: string;
  };

export default function Cliente() {
    const { idCliente } = useParams<{ idCliente: string }>();
    //const { user } = useAuth();
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<Usuarios[]>([]);
    const [estados, setEstados] = useState<{id: string, estado: string}[]>([]);
    
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [citas, setCitas] = useState<Cita[]>([]);

    const [citaSeleccionada, setCitaSeleccionada] = useState(0);
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [notas, setNotas] = useState("");
    const [fecha, setFecha] = useState("");
    const [horario, setHorario] = useState("");

    const [hora, setHora] = useState<Date | null>(null);

    const [asignado, setAsignado] = useState("");
    const [estado, setEstado] = useState("");

    const [deudaTotal, setDeudaTotal] = useState<number>(0);

    const [cuotas, setCuotas] = useState<{idcuota: number, monto: number, interes: number, pagado: boolean, vencimiento: string, fecha_pago: string, idmetodo: number, metodo: string}[]>([]);

    const setearCitaSeleccionada = async (cita: Cita) => {
      setCitaSeleccionada(cita.idcita);
      setTelefono(cita.telefono);
      setDireccion(cita.domicilio);
      setFecha(cita.dia_format);
      setNotas(cita.notas);
      setAsignado(cita.idasignado);
      setEstado(cita.idestado);

      if (cita.hora_24) {
        const [h, m] = cita.hora_24.split(":").map(Number);
        const nuevaHora = new Date();
        nuevaHora.setHours(h, m, 0, 0);
        setHora(nuevaHora);
        setHorario(cita.hora_24);
      } else {
        setHora(new Date());
        const now = new Date();
        setHorario(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
      }

      try {
        const res = await fetch(`${API_URL}/api/clientes/pagos/${cita.idcita}`);

        if (!res.ok) {
          console.error("Error al traer los pagos. Código:", res.status);
          return;
        }
          const data = await res.json();
          setCuotas(data.cuotas);

      } catch (error) {
        alert("Error de conexión con el backend.");
        console.error("Error de conexión con el backend:", error);
      }
    };

    const cargarInicioCliente = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/clientes/${idCliente}`);

        if (!res.ok) {
          console.error("Error al traer datos. Código:", res.status);
          return;
        }

        const data = await res.json();
        console.log("Datos recibidos del backend:", data);

        setCliente(data.cliente);
        setCitas(data.citas);
        setUsers(data.users);
        setEstados(data.estados);
        setDeudaTotal(data.deuda_total ? data.deuda_total : 0);

      } catch (error) {
        alert("Error de conexión con el backend.");
        console.error("Error de conexión con el backend:", error);
      }
      setLoading(false);
    };

    useEffect(() => {
      cargarInicioCliente();
    }, [idCliente]);

    const actualizarCita = async () => {
      try {
        const res = await fetch(`${API_URL}/api/citas/actualizar/${citaSeleccionada}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            telefono,
            direccion,
            notas,
            fecha,
            horario,
            asignado,
            estado,
          })
        });

        if (!res.ok) {
          console.error("Error al actualizar la cita. Código:", res.status);
          return;
        }

      } catch (error) {
        console.error("Error al actualizar la cita:", error);
        alert("Error al actualizar la cita. Por favor, inténtalo de nuevo.");
      }
      finally {
        alert("Cita actualizada correctamente.");
        cargarInicioCliente();
      }
    };

    const [mostrarPlanPagos, setMostrarPlanPagos] = useState(false);

 return (
    <div className="flex gap-4 items-start">
      {loading && <Loading />}
      <div className="w-full" hidden={loading}>
        <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 shadow-md mb-4 flex justify-between items-center">
        <div>
          <div className="text-2xl font-bold text-orange-500 flex items-center gap-1"><User className="h-6 w-6" />{cliente?.nombre}</div>
          {cliente?.email && (
            <div className="text-white/60 flex gap-1 text-sm items-center">
              <Mail className="h-4 w-4" />{cliente.email}
            </div>
          )}
        </div>
        
        <div
          className={`text-white px-3 py-1 rounded-lg font-bold border-2 flex flex-col items-center justify-center
            ${
              deudaTotal > 0
                ? "bg-yellow-600 border-yellow-700"
                : "bg-green-600 border-green-700"
            }
          `}
        >
          {deudaTotal > 0 ? (
            <>
              <div className="text-xs">DEUDA TOTAL</div>
              <div className="text-2xl"><FormatearNumero numero={deudaTotal} /></div>
            </>
          ) : (
            <div className="text-sm font-bold">SIN DEUDAS</div>
          )}
        </div>

        </div>

        <div>
            {citas.length === 0 ? (
              <div className="text-white/60">Este cliente no tiene citas registradas.</div>
            ) : (
              <div
                className={`grid gap-4 overflow-auto ${
                  citaSeleccionada > 0
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-5"
                }`}
              >
                {citas.map((cita) => (
                  <div key={cita.idcita} className={`bg-zinc-900 border rounded-xl p-4 shadow transition-all cursor-pointer
                    ${cita.idcita === citaSeleccionada
                      ? "border-orange-500 shadow-orange-500 hover:shadow-orange-500"
                      : "border-white/10 hover:border-orange-500 hover:shadow-xs"
                    }`} onClick={() => setearCitaSeleccionada(cita)}>
                    <div className=" flex flex-col gap-2">
                        <div className="text-white font-bold flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-200 text-center"><CalendarFold className="h-4 w-4" />{cita.dia}</div>
                          <div className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-200 text-center"><Clock className="h-4 w-4" />{cita.hora}</div>
                        </div>

                        {(cita.tipo == "camarasdesdecero" || cita.tipo == "camaras-tiene-nuevo-instalacion" || cita.tipo == "camaras-tiene-existente-instalacion") && (
                        <div>
                          <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-blue-700 bg-blue-500 flex justify-center items-center gap-1 w-full">
                            <Cctv className="h-4 w-4" />
                            <span>INSTALACIÓN DE CÁMARAS</span>
                          </div>
                          {(cita.tipo == "camaras-tiene-nuevo-instalacion" || cita.tipo == "camaras-tiene-existente-instalacion") && (<div className="text-xs text-yellow-500 font-bold italic flex items-center gap-1 justify-center mt-2"><TriangleAlert className="h-4 w-4" />Ya tiene cámaras instaladas</div>)}
                        </div>
                      )}

                      {(cita.tipo == "camaras-tiene-nuevo-soporte" || cita.tipo == "camaras-tiene-existente-soporte") && (
                        <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 border-green-700 bg-green-500 flex justify-center items-center gap-1 w-full">
                          <Wrench className="h-4 w-4" />
                          <span>SOPORTE</span>
                        </div>
                      )}

                      <div className="rounded-full text-xs font-bold py-0.5 px-1.5 cursor-pointer text-center border-2 flex justify-center items-center gap-1 w-full" style={{backgroundColor: cita.color, borderColor: darkenColor(cita.color, 0.5),}}>
                        {cita.estado}
                      </div>

                      {cita.domicilio.trim() && (
                        <div className="text-white text-sm flex gap-1 items-center justify-center font-bold italic"><House className="h-4 w-4" />
                          {cita.domicilio}
                        </div>
                      )}

                      {cita.notas.trim() && (
                        <div className="text-white/50 text-sm whitespace-pre-wrap"><strong>Notas:</strong> {cita.notas}</div>
                      )}
                      <hr className="text-white/10" />
                      <div className="text-xs italic text-white/60">
                        Asignado a <strong>{cita.asignado}</strong>
                      </div>
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      
      {citaSeleccionada > 0 && (
      <div className="w-full overflow-auto">
        {cuotas.length === 0 ? (
          !mostrarPlanPagos ? (
            <div className="bg-cyan-600 border-2 border-cyan-700 rounded-xl p-2 transition-all w-48 mb-4 flex items-center justify-center gap-1 cursor-pointer hover:bg-cyan-700 hover:border-cyan-800" onClick={() => setMostrarPlanPagos(true)}>
              <ClipboardPlus className="h-4 w-4" />
              <span className="text-sm">Agregar plan de pagos</span>
            </div>
          ) : (
            <div className="mb-4 w-full">
              <PlanDePagos idCliente={idCliente} idCita={citaSeleccionada} />
            </div>
          )
        ) : (
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 transition-all w-full mb-4">
            aca van los pagos
          </div>
        )}
        
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 transition-all w-full">
          <div className="text-white font-bold flex items-center gap-1 text-2xl justify-center"><List className="h-6 w-6" />Detalles de la cita</div>
            {citas.filter(cita => cita.idcita === citaSeleccionada).map(cita => (
              <div key={cita.idcita} className="flex flex-col gap-2 mt-2">

                <div className="flex items-center justify-around gap-4">
                  <div className="w-full">
                    <div>
                      <label className="text-xs text-white/60">Teléfono</label>
                      <input
                        name="telefono"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/60">Dirección</label>
                      <input
                        name="direccion"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 uppercase"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <div>
                      <label className="text-xs text-white/60">Asignar a</label>
                      <select className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full" onChange={(e) => setAsignado(e.target.value)}>
                        <option key={cita.idasignado} value={cita.idasignado} selected>{cita.asignado}</option>
                        {users.filter(u => u.id !== cita.idasignado).map((u) => (
                          <option key={u.id} value={u.id}>{u.fullname}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-white/60">Tipo</label>
                      <select className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full" onChange={(e) => setEstado(e.target.value)}>
                        <option key={cita.idestado} value={cita.idestado} selected>{cita.estado}</option>
                        {estados.filter(e => e.id !== cita.idestado).map((estado) => (
                          <option key={estado.id} value={estado.id}>
                            {estado.estado}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                    <label className="text-xs text-white/60">Notas</label>
                    <textarea
                    name="notas"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                    />
                </div>

                <div className="flex justify-between">

                  <div className="flex items-end gap-2">
                    <div>
                        <label className="text-xs text-white/60">Fecha</label>
                        <input
                            type="date"
                            name="dia_format"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                        />
                    </div>

                    <div>
                      <label className="text-xs text-white/60">Hora</label>
                      <div>
                        <DatePicker
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Hora"
                          dateFormat="h:mm aa"
                          className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 w-32"
                          title="Cambiar hora"
                          selected={hora ?? undefined}
                          onChange={(date: Date | null) => {
                            if (!date) return;
                            setHora(date);
                            const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2,"0")}`;
                            setHorario(formattedTime);
                          }}
                        />
                      </div>
                    </div>

                  </div>

                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => setCitaSeleccionada(0)}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10">
                        Cancelar
                      </button>

                      <button
                        onClick={() => actualizarCita()}
                        className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">
                        Guardar cambios
                      </button>
                    </div>

                </div>
            
              </div>
            ))}
        </div>
        </div>
      )}
    
  </div>
  );
}