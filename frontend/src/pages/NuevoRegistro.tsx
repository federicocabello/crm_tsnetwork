import { useState, useRef, useLayoutEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Speech } from "../types/speech";
import Loading from "../components/Loading";
import SortableSpeechCard from "../components/SortableSpeechCard";
import FormularioCamarasDesdeCero from "../pages/FormularioCamarasDesdeCero";
import FormularioCamarasTieneClienteNuevo from "../pages/FormularioCamarasTieneClienteNuevo";
import FormularioCamarasTieneClienteExistente from "../pages/FormularioCamarasExistente";
import { NotebookTabs, Cctv, Globe, Save, Pencil, X, SquarePlus, Trash2, FileVideoCamera, Video } from 'lucide-react';

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

  const [deletedSpeech, setDeletedSpeech] = useState<string[]>([]);

  const canEdit = ["moderador", "administrador", "superadmin"].includes(
    user?.rol ?? "invitado",
  );

  const [isEditing, setIsEditing] = useState(false);

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

  const [saving, setSaving] = useState(false);

  const cancelarEditor = async (condicional: boolean) => {
    setIsEditing((v) => !v);
    if (condicional) {
      filtrarSpeech(selectedOption!);
      iniciarLayout();
    }
  };

  const generateUniqueId = () => Math.floor(Math.random() * 1000000); // Ejemplo simple

  const agregarSpeech = async () => {
    const nuevoSpeech: Speech = {
      id: generateUniqueId(),  // Generar un ID único (puedes usar una función para eso)
      titulo: "Titulo nuevo speech",
      descripcion: "Descripción...",
      img: "",  // Aquí puedes asignar la URL o nombre de la imagen
      tipo: "default",  // Asignar un valor a 'tipo' como 'default' o cualquier otro tipo que uses
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
    setDeletedSpeech((prev) => [...prev, String(id)]);
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
              }`} hidden>
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

        {(opcionCamaras == "tiene" || opcionCamaras == "tieneclientenuevo" || opcionCamaras == "tieneclienteexistente") && (
          <div className="flex justify-between items-center gap-2 mb-3">
            <button className={`p-1! text-xs! w-full ${
                  opcionCamaras == "tieneclientenuevo"
                    ? "bg-green-600 text-white border"
                    : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }`} onClick={() => setOpcionCamaras("tieneclientenuevo")}>Cliente nuevo</button>
            
            <button className={`p-1! text-xs! w-full ${
                  opcionCamaras == "tieneclienteexistente"
                    ? "bg-green-600 text-white border"
                    : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                }`} onClick={() => setOpcionCamaras("tieneclienteexistente")}>Cliente existente</button>
          </div>
        )}

        {opcionCamaras == "desdecero" && (
          <FormularioCamarasDesdeCero />
        )}

        {(opcionCamaras == "tieneclientenuevo") && (
          <FormularioCamarasTieneClienteNuevo />
        )}

        {(opcionCamaras == "tieneclienteexistente") && (
          <FormularioCamarasTieneClienteExistente />
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

                  {(user?.rol == "moderador" ||
                    user?.rol == "administrador" ||
                    user?.rol == "superadmin") &&
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
        <div className="fixed bottom-2 right-8 flex flex-col gap-3 z-50">
          
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
