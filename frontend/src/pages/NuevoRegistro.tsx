import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Usuarios } from "../types/auth";
import type { Speech } from "../types/speech";
import Loading from "../components/Loading";
import SortableSpeechCard from "../components/SortableSpeechCard";
import FormularioCamarasDesdeCero from "../pages/FormularioCamarasDesdeCero";
import {
  NotebookTabs,
  Cctv,
  Globe,
  Save,
  Pencil,
  X,
  SquarePlus,
  Trash2,
  FileVideoCamera,
  Video,
  ClipboardList,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

export default function NuevoRegistro() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<
    "camaras" | "internet" | null
  >(null);
  const [opcionCamaras, setOpcionCamaras] = useState<
    "tiene" | "desdecero" | "tieneclientenuevo" | "tieneclienteexistente" | null
  >(null);
  const [speechItems, setSpeechItems] = useState<Speech[]>([]);
  const textareasRef = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [users, setUsers] = useState<Usuarios[]>([]);

  const [deletedSpeech, setDeletedSpeech] = useState<string[]>([]);

  const canEdit = ["moderador", "administrador", "superadmin"].includes(
    user?.rol ?? "invitado",
  );

  const [isEditing, setIsEditing] = useState(false);

  const [horaMostrar, setHoraMostrar] = useState<Date | null>(null);
  const [hora, setHora] = useState("");

  const handleHoraChange = (date: Date | null) => {
    setHoraMostrar(date);
    if (date) {
      const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
      setHora(formattedTime);
    }
  };

  type Formulario = {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
    fecha: string;
    asignado: string;
  };

  const [formRegistro, setFormRegistro] = useState<Formulario>({
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
    fecha: "",
    asignado: user?.id || "",
  });

  const [notas, setNotas] = useState("");
  const [presupuesto, setPresupuesto] = useState({});

  const [formDataCamaras, setFormDataCamaras] = useState({
    lugar: null,
    cantidad: "",
    audio: null,
    area: null,
    atico: null,
    monitor: null,
    estructura: null,
    presupuesto: "",
  });

  const handleFormularioSubmit = (data: FormData) => {
    setFormDataCamaras(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formDataCamaras.presupuesto);

    // Combina los datos de ambos formularios en un solo objeto
    const datosCompletos = {
      datos: formRegistro,
      preguntas: formDataCamaras,
      user: user,
      tipocita: selectedOption,
      tipocitacamaras: opcionCamaras,
      notas: notas,
      hora: hora,
    };
    console.log(datosCompletos);
    try {
      const response = await fetch(`${API_URL}/api/nuevo-registro/guardar`, {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormRegistro((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSelection = (option: "camaras" | "internet") => {
    setSelectedOption((prev) => (prev === option ? null : option));
    filtrarSpeech(option);
  };

  const filtrarSpeech = async (filtro: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/nuevo-registro/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filtro }),
      });

      if (res.ok) {
        const data: any[] = await res.json();
        setSpeechItems(data.sort((a, b) => a.orden - b.orden));
      } else {
        console.error("Error al filtrar speech. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión con el backend:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDescripcion = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    id: number,
  ) => {
    const updatedSpeechItems = speechItems.map((item) =>
      item.id == id ? { ...item, descripcion: e.target.value } : item,
    );
    setSpeechItems(updatedSpeechItems);
  };

  const handleChangeTitulo = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: number,
  ) => {
    const updatedSpeechItems = speechItems.map((item) =>
      item.id == id ? { ...item, titulo: e.target.value } : item,
    );
    setSpeechItems(updatedSpeechItems);
  };

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }

  const iniciarLayout = async () => {
    if (!selectedOption) return;

    requestAnimationFrame(() => {
      Object.values(textareasRef.current).forEach((ta) => {
        if (ta) autoResize(ta);
      });
    });
  };

  useLayoutEffect(() => {
    iniciarLayout();
  }, [speechItems, selectedOption]);

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

  const [saving, setSaving] = useState(false);

  const cancelarEditor = async (condicional: boolean) => {
    setIsEditing((v) => !v);
    if (condicional) {
      filtrarSpeech(selectedOption!);
      iniciarLayout();
    }
  };

  const agregarSpeech = async () => {
    const nuevoSpeech = {
      //id: Date.now(),
      titulo: "Titulo nuevo speech",
      descripcion: "Descripción...",
      img: "",
      seccion: selectedOption!,
      orden: Math.max(...speechItems.map((s) => s.orden), 0) + 1,
    };

    setSpeechItems((prev) => [...prev, nuevoSpeech]);
  };

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSpeechItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const moved = arrayMove(prev, oldIndex, newIndex);

      return moved.map((it, idx) => ({ ...it, orden: idx + 1 }));
    });
  }

  const removeItem = (id: number) => {
    setSpeechItems((prev) => prev.filter((x) => x.id !== id));
    setDeletedSpeech((prev) => [...prev, id]);
  };

  function formatBoldStars(text: string) {
    if (!text) return "";
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escaped
      .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  }

  async function guardarCambios() {
    if (!selectedOption) return;
    setSaving(true);
    try {
      const payload = {
        seccion: selectedOption,
        items: speechItems.map((s) => ({
          id: s.id,
          titulo: s.titulo,
          descripcion: s.descripcion,
          img: s.img ?? "",
          orden: s.orden,
        })),
        deletedSpeech,
      };

      const res = await fetch(`${API_URL}/api/nuevo-registro/speech/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Error guardando:", res.status);
        return;
      }

      filtrarSpeech(selectedOption);
      iniciarLayout();
      setDeletedSpeech([]);
      setIsEditing(false);
    } catch (err) {
      console.error("Error de conexión:", err);
    }
    setSaving(false);
  }

  return (
    <div className="h-full min-h-0 flex gap-3">
      <div className="cuadro w-1/4 shrink-0 cuadro min-h-0 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1">
            <NotebookTabs className="w-4 h-4" />
            <span>Nuevo registro</span>
          </h2>

          <div className="flex gap-3 items-center">
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

        {selectedOption == "camaras" && (
          <div className="flex my-3 gap-2">
            <button
              className={`boton w-full p-1! text-xs! border flex gap-2 items-center justify-center ${
                opcionCamaras == "desdecero"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-gray-800 hover:bg-gray-400"
              }`}
              onClick={() => setOpcionCamaras("desdecero")}>
              <FileVideoCamera className="w-5 h-5" />
              <span>Instalación desde cero</span>
            </button>
            <button
              className={`boton w-full p-1! text-xs! border flex gap-2 items-center justify-center ${
                opcionCamaras == "tiene" ||
                opcionCamaras == "tieneclientenuevo" ||
                opcionCamaras == "tieneclienteexistente"
                  ? "bg-green-600 text-white"
                  : "bg-gray-300 text-gray-800 hover:bg-gray-400"
              }`}
              onClick={() => setOpcionCamaras("tiene")}>
              <Video className="w-5 h-5" />
              <span>Ya tiene cámaras instaladas</span>
            </button>
          </div>
        )}

        {(opcionCamaras == "tiene" ||
          opcionCamaras == "tieneclientenuevo" ||
          opcionCamaras == "tieneclienteexistente") && (
          <div className="flex justify-between items-center gap-2">
            <button
              className={`p-1! text-xs! w-full ${
                opcionCamaras == "tieneclientenuevo"
                  ? "bg-green-600 text-white border"
                  : "bg-gray-300 text-gray-800 hover:bg-gray-400"
              }`}
              onClick={() => setOpcionCamaras("tieneclientenuevo")}>
              Cliente nuevo
            </button>

            <button
              className={`p-1! text-xs! w-full ${
                opcionCamaras == "tieneclienteexistente"
                  ? "bg-green-600 text-white border"
                  : "bg-gray-300 text-gray-800 hover:bg-gray-400"
              }`}
              onClick={() => setOpcionCamaras("tieneclienteexistente")}>
              Cliente existente
            </button>
          </div>
        )}

        {opcionCamaras == "desdecero" && (
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
            </div>

            <div>
              <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1 mb-3">
                <ClipboardList className="w-4 h-4" />
                <span>Datos de la instalación</span>
              </h2>
              <FormularioCamarasDesdeCero onChange={handleFormularioSubmit} />
            </div>

            <div>
              <label className="text-xs text-white/60">
                Fecha y hora de visita
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  name="fecha"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40 cursor-pointer"
                  value={formRegistro.fecha}
                  onChange={handleInputChange}
                />
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
              <select
                className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full"
                name="asignado"
                onChange={handleInputChange}>
                <option key={user?.id} value={user?.id} selected>
                  {user?.fullname}
                </option>
                {users
                  .filter((u) => u.id !== user?.id && u.habilitado == true)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullname}
                    </option>
                  ))}
              </select>
            </div>
            {formRegistro.nombre &&
              formRegistro.direccion &&
              formRegistro.telefono &&
              formRegistro.fecha &&
              hora &&
              formDataCamaras.lugar &&
              formDataCamaras.audio &&
              formDataCamaras.area &&
              formDataCamaras.monitor &&
              formDataCamaras.atico &&
              // formDataCamaras.cantidad &&
              formDataCamaras.estructura && (
                <button
                  className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-orange-600 cursor-pointer"
                  onClick={handleSubmit}
                  disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              )}
          </div>
        )}
      </div>

      {selectedOption &&
        (loading ? (
          <div className="w-full flex items-center justify-center">
            <Loading />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}>
              <SortableContext
                items={speechItems.map((s) => s.id)}
                strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-2 gap-2">
                  {speechItems.map((item) => (
                    <SortableSpeechCard
                      key={item.id}
                      item={item}
                      isEditing={isEditing}>
                      <input
                        className="speech-titulo"
                        value={item.titulo}
                        disabled={!isEditing}
                        onChange={(e) => {
                          handleChangeTitulo(e, item.id);
                        }}
                      />
                      {!isEditing ? (
                        <div
                          className="speech-descripcion whitespace-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: formatBoldStars(item.descripcion),
                          }}
                        />
                      ) : (
                        <textarea
                          ref={(el) => {
                            textareasRef.current[item.id] = el;
                            if (el) requestAnimationFrame(() => autoResize(el));
                          }}
                          className="speech-descripcion"
                          value={item.descripcion}
                          onChange={(e) => {
                            handleChangeDescripcion(e, item.id);
                            autoResize(e.currentTarget);
                          }}
                          rows={1}
                        />
                      )}

                      <span
                        hidden={!isEditing}
                        className="transition-all mt-auto">
                        <Trash2
                          className="w-6 h-6 text-white/30 hover:text-red-500 drop-shadow-xs drop-shadow-white hover:drop-shadow-red-500 cursor-pointer transition-all mt-2 ml-auto"
                          onClick={() => removeItem(item.id)}
                        />
                      </span>
                    </SortableSpeechCard>
                  ))}

                  {(user.rol == "moderador" ||
                    user.rol == "administrador" ||
                    user.rol == "superadmin") &&
                    isEditing && (
                      <div
                        className="shadow-lg shadow-black/20 bg-zinc-900 rounded-2xl border border-white/10 hover:border-orange-500 p-4 flex items-center justify-center gap-1 cursor-pointer inset-shadow-sm hover:inset-shadow-orange-500 transition-all font-bold hover:text-orange-500"
                        onClick={() => agregarSpeech()}>
                        <SquarePlus className="w-5 h-5" />
                        <span className="text-normal">Nuevo speech</span>
                      </div>
                    )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ))}

      {canEdit && selectedOption && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          {/* Toggle editor */}
          <button
            onClick={() => cancelarEditor(isEditing)}
            className={[
              "rounded-2xl px-4 py-3 shadow-xl border border-white/10 backdrop-blur",
              "flex items-center gap-2 font-extrabold cursor-pointer",
              isEditing
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-white/10 text-white hover:bg-white/15",
            ].join(" ")}
            title={isEditing ? "Salir del modo editor" : "Activar modo editor"}>
            {isEditing ? (
              <X className="w-5 h-5" />
            ) : (
              <Pencil className="w-5 h-5" />
            )}
            {isEditing ? "Cancelar" : "Editar"}
          </button>

          {/* Guardar */}
          {isEditing && (
            <button
              onClick={guardarCambios}
              disabled={saving}
              className={[
                "rounded-2xl px-4 py-3 shadow-xl border border-white/10 backdrop-blur",
                "flex items-center gap-2 font-extrabold cursor-pointer",
                saving
                  ? "bg-zinc-700 text-white/70 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700",
              ].join(" ")}
              title="Guardar cambios">
              <Save className="w-5 h-5" />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
