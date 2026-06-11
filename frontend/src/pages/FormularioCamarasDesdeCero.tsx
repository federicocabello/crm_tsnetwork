import { useState, useEffect } from "react";
import { CircleDollarSign, SearchAlert, ClipboardList, Files } from 'lucide-react';
import { useAuth } from "../auth/AuthContext";
import type { Usuarios } from "../types/auth";
import DatePicker from "react-datepicker";
import Cotizador from "./Cotizador";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

export default function FormularioCamarasDesdeCero() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const [users, setUsers] = useState<Usuarios[]>([]);

  interface Presupuesto {
  cantidad: number;
  costo: string;
  precioFinal: string;
}

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
    `rounded-xl border px-3 py-2 text-sm font-bold cursor-pointer transition-all
     ${
       activo
         ? "bg-orange-500 text-white border-orange-500"
         : "bg-zinc-950/40 text-white border-white/10 hover:border-orange-500/50"
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
          setLoading(true);

          const datosCompletos = {
            datos: formRegistro,
            preguntas: respuestas,
            user: user,
            notas: notas,
            hora: hora,
            presupuesto: presupuesto,
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
          }
        };

    const [alerta, setAlerta] = useState<string | null>(null);

  const handleBlur = async () => {
  if (!formRegistro.telefono) return;

  try {
    const response = await fetch(`/api/clientes/buscar-telefono?telefono=${encodeURIComponent(formRegistro.telefono)}`);

    const data = await response.json();

    if (data.existe) {
      setAlerta(`Número de teléfono ya registrado con el cliente: ${data.cliente.nombre}`);
    } else {
      setAlerta(null);
    }
  } catch (error) {
    console.error("Error al buscar el teléfono:", error);
    setAlerta("Hubo un error al buscar el teléfono.");
  }}

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
            </div>
      <div>
        <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1 mb-2">
          <ClipboardList className="w-4 h-4" /><span>Datos de la instalación</span>
        </h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Lugar</label>
          <div className="flex justify-between">
            <div
              onClick={() => handleRespuestaChange("lugar", "casa")}
              className={opcionClase(respuestas.lugar == "casa")}>
              Casa
            </div>
            <div
              onClick={() => handleRespuestaChange("lugar", "negocio")}
              className={opcionClase(respuestas.lugar == "negocio")}>
              Negocio
            </div>
            <div
              onClick={() => handleRespuestaChange("lugar", "traila")}
              className={opcionClase(respuestas.lugar == "traila")}>
              Tráila
            </div>
            <div
              onClick={() => handleRespuestaChange("lugar", "foodtruck")}
              className={opcionClase(respuestas.lugar == "foodtruck")}>
              Foodtruck
            </div>
            <div
              onClick={() => handleRespuestaChange("lugar", "apartamento")}
              className={opcionClase(respuestas.lugar == "apartamento")}>
              Apartamento
            </div>
          </div>
        </div>
        {respuestas.lugar == "foodtruck" && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: preguntar si cuenta con internet y monitor.{" "}
            <strong className="text-red-500">
              Sin internet no podemos proceder con la instalación.
            </strong>
          </div>
        )}
        {respuestas.lugar == "apartamento" && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: es necesario obtener el permiso del arrendador{" "}
            <strong className="text-red-500">
              para perforar el techo o las paredes
            </strong>{" "}
            antes de realizar cualquier instalación.
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Audio</label>
          <div className="flex gap-1">
            <div
              onClick={() => handleRespuestaChange("audio", "si")}
              className={opcionClase(respuestas.audio == "si")}>
              Sí
            </div>
            <div
              onClick={() => handleRespuestaChange("audio", "no")}
              className={opcionClase(respuestas.audio == "no")}>
              No
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Área</label>
          <div className="flex gap-1">
            <div
              onClick={() => handleRespuestaChange("area", "interior")}
              className={opcionClase(respuestas.area == "interior")}>
              Interior
            </div>
            <div
              onClick={() => handleRespuestaChange("area", "exterior")}
              className={opcionClase(respuestas.area == "exterior")}>
              Exterior
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Monitor</label>
          <div className="flex gap-1">
            <div
              onClick={() => handleRespuestaChange("monitor", "si")}
              className={opcionClase(respuestas.monitor == "si")}>
              Sí
            </div>
            <div
              onClick={() => handleRespuestaChange("monitor", "no")}
              className={opcionClase(respuestas.monitor == "no")}>
              No
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Ático</label>
            <div className="flex gap-1">
              <div
                onClick={() => handleRespuestaChange("atico", "espacioso")}
                className={opcionClase(respuestas.atico == "espacioso")}>
                Espacioso
              </div>
              <div
                onClick={() => handleRespuestaChange("atico", "espuma")}
                className={opcionClase(respuestas.atico == "espuma")}>
                Espuma (FOAM)
              </div>
              <div
                onClick={() => handleRespuestaChange("atico", "no tiene")}
                className={opcionClase(respuestas.atico == "no tiene")}>
                No tiene
              </div>
            </div>
          </div>

        </div>
        {respuestas.atico && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: con{" "}
            <strong className="text-red-500">insulación normal</strong>{" "}
            (fibra/lana), el cable puede pasarse sin romper paredes, lo que
            facilita una instalación rápida y estándar. Con{" "}
            <strong className="text-red-500">insulación de espuma</strong>,
            bloquea el paso del cable, haciendo la instalación más compleja y
            requiriendo perforaciones o canaletas externas.
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Estructura</label>
            <div className="flex gap-1">
              <div
                onClick={() => handleRespuestaChange("estructura", "movil")}
                className={opcionClase(respuestas.estructura == "movil")}>
                Móvil
              </div>
              <div
                onClick={() => handleRespuestaChange("estructura", "standard")}
                className={opcionClase(respuestas.estructura == "standard")}>
                Standard
              </div>
              <div
                onClick={() => handleRespuestaChange("estructura", "casona")}
                className={opcionClase(respuestas.estructura == "casona")}>
                Casona
              </div>
            </div>
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

        {respuestas.estructura && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: en caso de que la casa sea nueva y{" "}
            <strong className="text-red-500">no aparezca en el mapa</strong>,
            pedir fotos de la misma{" "}
            <strong className="text-red-500">
              completa de frente, atrás y costados.
            </strong>
          </div>
        )}
      </div>

        <div className="flex items-center justify-around gap-2">
            <div className="w-48">
              <label className="text-xs text-white/60">Fecha de visita</label>
                <input type="date" name="fecha" className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer" value={formRegistro.fecha} onChange={handleInputChange} />
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
              <div className="text-xs text-white/60">
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

      {formRegistro.nombre && formRegistro.telefono && formRegistro.fecha && hora && (
        <button className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-orange-600 cursor-pointer" disabled={loading} onClick={submitFormularioCamarasDesdeCero}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      )}

      {openPresupuesto && (
        <Cotizador
          onClose={handleCloseModal}
          setCotizacion={handleSubmitPresupuesto}
        />
      )}
    </div>
  )}
