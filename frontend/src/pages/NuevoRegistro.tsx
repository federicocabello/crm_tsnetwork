import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Speech } from "../types/speech";
import Loading from "../components/Loading";
import SortableSpeechCard from "../components/SortableSpeechCard";
import FormularioCamarasDesdeCero from "../pages/FormularioCamarasDesdeCero";
import FormularioCamarasTieneClienteNuevo from "../pages/FormularioCamarasTieneClienteNuevo";
import FormularioCamarasTieneClienteExistente from "../pages/FormularioCamarasExistente";
import { NotebookTabs, Cctv, Globe, Save, Pencil, X, SquarePlus, Trash2, FileVideoCamera, Video, Sparkles, MessageSquareCode, Layers } from 'lucide-react';

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
  const [selectedOption, setSelectedOption] = useState<"camaras" | "internet">("camaras");
  const [opcionCamaras, setOpcionCamaras] = useState<"tiene" | "desdecero" | "tieneclientenuevo" | "tieneclienteexistente">("desdecero");
  const [opcionInternet, setOpcionInternet] = useState<"clientenuevo" | "clienteexistente">("clientenuevo");
  const [speechItems, setSpeechItems] = useState<Speech[]>([]);
  const textareasRef = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [deletedSpeech, setDeletedSpeech] = useState<string[]>([]);

  const canEdit = ["moderador", "administrador", "superadmin"].includes(
    user?.rol ?? "invitado",
  );

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    filtrarSpeech("camaras");
  }, []);

  const handleSelection = (option: "camaras" | "internet") => {
    setSelectedOption(option);
    if (option === "camaras" && (!opcionCamaras || opcionCamaras === "tiene")) setOpcionCamaras("desdecero");
    if (option === "internet" && !opcionInternet) setOpcionInternet("clientenuevo");
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

  const generateUniqueId = () => Math.floor(Math.random() * 1000000);

  const agregarSpeech = async () => {
    const nuevoSpeech: Speech = {
      id: generateUniqueId(),
      titulo: "Nuevo Título de Speech",
      descripcion: "Escribe aquí los argumentos o respuestas de venta...",
      img: "",
      tipo: "default",
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
    const idOriginalStr = String(id);

    setSpeechItems((prev) => prev.filter((item) => item.id !== id));

    setDeletedSpeech((prev) =>
      prev.includes(idOriginalStr) ? prev : [...prev, idOriginalStr],
    );
  };

  function formatBoldStars(text: string): string {
    return text.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  }

  async function guardarCambios() {
    if (!selectedOption) return;
    setSaving(true);
    try {
      const payload = {
        filtro: selectedOption,
        speeches: speechItems.map((item, index) => ({
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          orden: index + 1,
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

  const [vistaMobile, setVistaMobile] = useState<"formulario" | "speech">("formulario");

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden pb-16 lg:pb-0">
      {/* ───────────────── TOP HERO HEADER CARD ───────────────── */}
      <div className="cuadro rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[var(--card-border)] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-600/30">
              <NotebookTabs className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight">Nuevo Registro de Cliente</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Agenda nuevos servicios y consulta los guiones comerciales interactivos para llamadas.
          </p>
        </div>

        {/* SERVICE SEGMENT SELECTOR */}
        <div className="flex items-center gap-2 bg-[var(--bg-surface-2)] p-1.5 rounded-2xl border border-[var(--bg-border)] shrink-0 self-start md:self-auto w-full sm:w-auto">
          <button
            onClick={() => handleSelection("camaras")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedOption === "camaras"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]"
                : "text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10"
            }`}>
            <Cctv className="w-4 h-4" />
            <span>Cámaras</span>
          </button>

          <button
            onClick={() => handleSelection("internet")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedOption === "internet"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]"
                : "text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10"
            }`}>
            <Globe className="w-4 h-4" />
            <span>Internet</span>
          </button>
        </div>
      </div>

      {/* MOBILE TOGGLE SWITCHER (Only visible on mobile screens < lg when a service is selected) */}
      {selectedOption && (
        <div className="flex lg:hidden bg-[var(--bg-surface-2)] p-1 rounded-2xl border-2 border-[var(--card-border)] w-full shadow-sm">
          <button
            onClick={() => setVistaMobile("formulario")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              vistaMobile === "formulario"
                ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                : "text-[var(--text-muted)] hover:text-orange-500"
            }`}>
            <Layers className="w-4 h-4" />
            <span>Formulario</span>
          </button>
          <button
            onClick={() => setVistaMobile("speech")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              vistaMobile === "speech"
                ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                : "text-[var(--text-muted)] hover:text-orange-500"
            }`}>
            <MessageSquareCode className="w-4 h-4" />
            <span>Guiones Comercial ({speechItems.length})</span>
          </button>
        </div>
      )}

      {/* ───────────────── MAIN TWO-COLUMN RESPONSIVE LAYOUT ───────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 w-full min-w-0">
        
        {/* LEFT COLUMN: FORM CONTAINER */}
        <div className={`cuadro w-full lg:w-[420px] xl:w-[460px] shrink-0 border-2 border-[var(--card-border)] overflow-y-auto max-h-[calc(100vh-170px)] pr-1.5 scrollbar-thin ${
          selectedOption && vistaMobile !== "formulario" ? "hidden lg:block" : "block"
        }`}>
          <div className="pb-3 mb-3 border-b border-[var(--bg-border)] flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Opciones del Servicio</span>
            </span>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--bg-border)]">
              {selectedOption ? selectedOption.toUpperCase() : "SELECCIONA SERVICIO"}
            </span>
          </div>

          {!selectedOption && (
            <div className="py-8 text-center px-4 space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold">Selecciona Cámaras o Internet</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Haz clic en uno de los botones superiores para desplegar los formularios de agendamiento y cotización.
              </p>
            </div>
          )}

          {selectedOption === "camaras" && (
            <div className="flex flex-col gap-2 my-2">
              <div className="grid grid-cols-2 gap-2 bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--bg-border)]">
                <button
                  className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    opcionCamaras === "desdecero"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-blue-600"
                  }`}
                  onClick={() => setOpcionCamaras("desdecero")}>
                  <FileVideoCamera className="w-4 h-4 shrink-0" />
                  <span>Desde cero</span>
                </button>
                <button
                  className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    opcionCamaras === "tiene" ||
                    opcionCamaras === "tieneclientenuevo" ||
                    opcionCamaras === "tieneclienteexistente"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-emerald-600"
                  }`}
                  onClick={() => setOpcionCamaras("tiene")}>
                  <Video className="w-4 h-4 shrink-0" />
                  <span>Ya tiene cámaras</span>
                </button>
              </div>
            </div>
          )}

          {(opcionCamaras === "tiene" || opcionCamaras === "tieneclientenuevo" || opcionCamaras === "tieneclienteexistente") && (
            <div className="grid grid-cols-2 gap-2 my-2 bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--bg-border)]">
              <button className={`p-2 rounded-lg text-xs font-bold transition ${
                    opcionCamaras === "tieneclientenuevo"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-emerald-600"
                  }`} onClick={() => setOpcionCamaras("tieneclientenuevo")}>Cliente nuevo</button>
              
              <button className={`p-2 rounded-lg text-xs font-bold transition ${
                    opcionCamaras === "tieneclienteexistente"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-emerald-600"
                  }`} onClick={() => setOpcionCamaras("tieneclienteexistente")}>Cliente existente</button>
            </div>
          )}

          {opcionCamaras === "desdecero" && selectedOption === "camaras" && (
            <FormularioCamarasDesdeCero key="camaras-desde-cero" tipoRegistro="camaras" />
          )}

          {selectedOption === "internet" && (
            <div className="grid grid-cols-2 gap-2 my-2 bg-[var(--bg-surface-2)] p-1 rounded-xl border border-[var(--bg-border)]">
              <button className={`p-2 rounded-lg text-xs font-bold transition ${
                    opcionInternet === "clientenuevo"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-emerald-600"
                  }`} onClick={() => setOpcionInternet("clientenuevo")}>Cliente nuevo</button>
              
              <button className={`p-2 rounded-lg text-xs font-bold transition ${
                    opcionInternet === "clienteexistente"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-emerald-600"
                  }`} onClick={() => setOpcionInternet("clienteexistente")}>Cliente existente</button>
            </div>
          )}

          {selectedOption === "internet" && opcionInternet === "clientenuevo" && (
            <FormularioCamarasDesdeCero key="internet-nuevo" tipoRegistro="internet" />
          )}

          {selectedOption === "internet" && opcionInternet === "clienteexistente" && (
            <FormularioCamarasTieneClienteExistente key="internet-existente" tipoRegistro="internet" />
          )}

          {(opcionCamaras === "tieneclientenuevo") && (
            <FormularioCamarasTieneClienteNuevo />
          )}

          {(opcionCamaras === "tieneclienteexistente") && (
            <FormularioCamarasTieneClienteExistente tipoRegistro="camaras" />
          )}
        </div>

        {/* RIGHT COLUMN: SPEECH CARDS INTERACTIVE GRID */}
        <div className={`flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-170px)] pr-1.5 scrollbar-thin ${
          selectedOption && vistaMobile !== "speech" ? "hidden lg:block" : "block"
        }`}>
          {!selectedOption ? (
            <div className="cuadro border-2 border-dashed border-[var(--bg-border)] rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 min-h-[380px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-500 shadow-inner">
                <MessageSquareCode className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black tracking-tight">Guiones Comerciales y Speech de Venta</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md leading-relaxed">
                Selecciona <strong>Cámaras</strong> o <strong>Internet</strong> en la parte superior para desplegar los argumentos de venta, preguntas frecuentes y speech estructurados durante llamadas telefónicas.
              </p>
            </div>
          ) : loading ? (
            <div className="cuadro flex items-center justify-center py-20 min-h-[350px]">
              <Loading />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white text-xs font-black">
                    <MessageSquareCode className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Speech Comercial ({selectedOption.toUpperCase()}) — {speechItems.length} Cards
                  </h2>
                </div>
                {isEditing && (
                  <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/30 animate-pulse">
                    Modo Edición Activo
                  </span>
                )}
              </div>

              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}>
                <SortableContext
                  items={speechItems.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {speechItems.map((item) => (
                      <SortableSpeechCard
                        key={item.id}
                        item={item}
                        isEditing={isEditing}>
                        
                        {/* TITULO DE LA CARD */}
                        <div className="mb-1">
                          {isEditing ? (
                            <input
                              className="w-full font-black text-sm text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--bg-border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500 transition"
                              value={item.titulo}
                              onChange={(e) => handleChangeTitulo(e, item.id)}
                            />
                          ) : (
                            <h3 className="font-extrabold text-sm text-[var(--text-primary)] tracking-tight">
                              {item.titulo}
                            </h3>
                          )}
                        </div>

                        {/* DESCRIPCION DE LA CARD CON OVERFLOW Y MAX-HEIGHT */}
                        {!isEditing ? (
                          <div
                            className="text-xs text-[var(--text-secondary)] leading-relaxed opacity-95 whitespace-pre-wrap max-h-52 overflow-y-auto pr-1 scrollbar-thin"
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
                            className="w-full text-xs text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--bg-border)] rounded-lg p-2.5 outline-none focus:border-orange-500 transition font-sans resize-none max-h-52 overflow-y-auto scrollbar-thin"
                            value={item.descripcion}
                            onChange={(e) => {
                              handleChangeDescripcion(e, item.id);
                              autoResize(e.currentTarget);
                            }}
                            rows={3}
                          />
                        )}

                        {/* ACCION BORRAR (EN EDICION) */}
                        {isEditing && (
                          <div className="pt-2 mt-auto flex justify-end border-t border-[var(--bg-border)]">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-xs text-red-500 hover:text-white bg-red-500/10 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-bold">
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </SortableSpeechCard>
                    ))}

                    {/* BOTON AGREGAR CARD (SOLO EN MODO EDICION) */}
                    {canEdit && isEditing && (
                      <div
                        className="cuadro border-2 border-dashed border-orange-500/60 hover:border-orange-500 bg-orange-500/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] min-h-[140px]"
                        onClick={() => agregarSpeech()}>
                        <SquarePlus className="w-7 h-7 text-orange-500" />
                        <span className="text-sm font-black text-orange-500">Agregar Nuevo Speech</span>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────── FLOATING ACTION BAR (EDIT/SAVE) ───────────────── */}
      {canEdit && selectedOption && (
        <div className="sticky bottom-0 left-0 right-0 sm:fixed sm:bottom-6 sm:right-6 sm:left-auto z-50 flex items-center justify-end gap-2.5 bg-[var(--card-bg)]/95 backdrop-blur-md border-t sm:border-2 border-[var(--card-border)] p-3 sm:p-2 sm:rounded-2xl shadow-2xl">
          <button
            onClick={() => cancelarEditor(isEditing)}
            className={`btn-secondary py-2.5 px-4 rounded-xl font-black text-xs transition shadow-md ${
              isEditing ? "bg-orange-600 text-white border-orange-600" : ""
            }`}
            title={isEditing ? "Salir del modo editor" : "Activar modo editor"}>
            {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            <span>{isEditing ? "Cancelar" : "Editar Guiones"}</span>
          </button>

          {isEditing && (
            <button
              onClick={guardarCambios}
              disabled={saving}
              className="btn-primary py-2.5 px-4 rounded-xl font-black text-xs shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              title="Guardar cambios">
              <Save className="w-4 h-4" />
              <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
