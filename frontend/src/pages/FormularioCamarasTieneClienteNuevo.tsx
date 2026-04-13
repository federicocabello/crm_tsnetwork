import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { ClipboardList, Drill, Wrench } from 'lucide-react';
import type { Usuarios } from "../types/auth";
import DatePicker from "react-datepicker";
import Loading from "../components/Loading";
import "react-datepicker/dist/react-datepicker.css";

export default function FormularioCamarasTieneClienteNuevo() {
    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const { user } = useAuth();
    const [loading, setLoading] = useState<boolean>(false);
    const [users, setUsers] = useState<Usuarios[]>([]);
    const [opcionTipoInstalacion, setOpcionTipoInstalacion] = useState<"instalacion" | "soporte" | null>(null);

    type Formulario = {
      nombre: string;
      direccion: string;
      telefono: string;
      email: string;
      fecha: string,
      asignado: string,
      modelocamara: string,
    };

    const [formRegistro, setFormRegistro] = useState<Formulario>({
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      fecha: '',
      asignado: user?.id || "",
      modelocamara: '',
    });

    const [notas, setNotas] = useState("")

    type Preguntas = {
        atico: "espacioso" | "espuma" | "no tiene" | null;
        cableado: "red" | "coaxial" | "no tiene" | null;
    }
    
    const [respuestas, setRespuestas] = useState<Preguntas>({
        atico: null,
        cableado: null,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        };
        try {
        const response = await fetch(`${API_URL}/api/nuevo-registro/camaras/tiene/nuevo`, {
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
                placeholder="(956) 000-0000"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
                value={formRegistro.telefono}
                onChange={handleInputChange}
              />
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
              <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">Modelo de cámara y NVR</label>
              <input
                type="text"
                name="modelocamara"
                placeholder="Modelos"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 uppercase"
                value={formRegistro.modelocamara}
                onChange={handleInputChange}
              />
              </div>

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

            <div>
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

              {formRegistro.nombre && formRegistro.telefono && formRegistro.fecha && hora && opcionTipoInstalacion && (
                <button className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-orange-600 cursor-pointer" disabled={loading} onClick={submitFormularioCamarasTiene}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              )}

          </div>
        )}