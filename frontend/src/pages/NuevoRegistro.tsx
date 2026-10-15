import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Speech } from "../types/speech";
import Loading from "../components/Loading";
import SortableSpeechCard from "../components/SortableSpeechCard";
import FormularioCamarasDesdeCero from "../pages/FormularioCamarasDesdeCero";
import FormularioCamarasTieneClienteNuevo from "../pages/FormularioCamarasTieneClienteNuevo";
import FormularioCamarasTieneClienteExistente from "../pages/FormularioCamarasExistente";
import { NotebookTabs, Cctv, Globe, Save, Pencil, X, SquarePlus, Trash2, FileVideoCamera, Video, MessageSquareCode, Layers, Search, ChevronDown } from 'lucide-react';

import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

export default function NuevoRegistro() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";
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
  const [guiaSearch, setGuiaSearch] = useState("");
  const [expandedSpeechId, setExpandedSpeechId] = useState<number | null>(null);

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
        const data: Speech[] = await res.json();
        const orderedData = data.sort((a, b) => a.orden - b.orden);
        setSpeechItems(orderedData);
        setExpandedSpeechId(orderedData[0]?.id ?? null);
        setGuiaSearch("");
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
    if (!isEditing) setGuiaSearch("");
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
    setExpandedSpeechId(nuevoSpeech.id);
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
    if (expandedSpeechId === id) setExpandedSpeechId(null);

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

  const servicioLabel = selectedOption === "camaras" ? "Cámaras" : "Internet";
  const tipoRegistroLabel = selectedOption === "internet"
    ? opcionInternet === "clientenuevo"
      ? "Cliente nuevo"
      : "Cliente existente"
    : opcionCamaras === "desdecero"
      ? "Instalación desde cero"
      : opcionCamaras === "tieneclientenuevo"
        ? "Cliente nuevo con cámaras"
        : "Cliente existente con cámaras";

  const normalizedGuiaSearch = guiaSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const visibleSpeechItems =
    isEditing || !normalizedGuiaSearch
      ? speechItems
      : speechItems.filter((item) =>
          (item.titulo + " " + item.descripcion)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(normalizedGuiaSearch),
        );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 overflow-x-hidden pb-6">
      <header className="page-header mb-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <NotebookTabs className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="page-title">Nuevo registro</h1>
            <p className="page-subtitle">
              Registra al cliente, define el servicio y agenda la visita desde un solo lugar.
            </p>
          </div>
        </div>
      </header>

      <section className="card space-y-4" aria-label="Tipo de registro">
        <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-end">
          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-[var(--text-1)]">Servicio</p>
              <p className="text-[11px] text-[var(--text-3)]">Selecciona la línea de atención.</p>
            </div>
            <div className="tabs w-full" role="tablist" aria-label="Servicio">
              <button
                type="button"
                role="tab"
                aria-selected={selectedOption === "camaras"}
                onClick={() => handleSelection("camaras")}
                className={`tab flex-1 justify-center ${selectedOption === "camaras" ? "active" : ""}`}>
                <Cctv className="h-4 w-4" />
                <span>Cámaras</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedOption === "internet"}
                onClick={() => handleSelection("internet")}
                className={`tab flex-1 justify-center ${selectedOption === "internet" ? "active" : ""}`}>
                <Globe className="h-4 w-4" />
                <span>Internet</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-[var(--text-1)]">Tipo de registro</p>
              <p className="text-[11px] text-[var(--text-3)]">El formulario se adapta a la situación del cliente.</p>
            </div>

            {selectedOption === "camaras" ? (
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de registro de cámaras">
                <button
                  type="button"
                  role="radio"
                  aria-checked={opcionCamaras === "desdecero"}
                  onClick={() => setOpcionCamaras("desdecero")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    opcionCamaras === "desdecero"
                      ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}>
                  <FileVideoCamera className="h-4 w-4 shrink-0" />
                  <span>Instalación desde cero</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={opcionCamaras === "tieneclientenuevo"}
                  onClick={() => setOpcionCamaras("tieneclientenuevo")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    opcionCamaras === "tieneclientenuevo"
                      ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}>
                  <Video className="h-4 w-4 shrink-0" />
                  <span>Cliente nuevo con cámaras</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={opcionCamaras === "tieneclienteexistente"}
                  onClick={() => setOpcionCamaras("tieneclienteexistente")}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    opcionCamaras === "tieneclienteexistente"
                      ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}>
                  <Video className="h-4 w-4 shrink-0" />
                  <span>Cliente existente con cámaras</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de registro de internet">
                <button
                  type="button"
                  role="radio"
                  aria-checked={opcionInternet === "clientenuevo"}
                  onClick={() => setOpcionInternet("clientenuevo")}
                  className={`flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    opcionInternet === "clientenuevo"
                      ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}>
                  Cliente nuevo
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={opcionInternet === "clienteexistente"}
                  onClick={() => setOpcionInternet("clienteexistente")}
                  className={`flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    opcionInternet === "clienteexistente"
                      ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
                  }`}>
                  Cliente existente
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="tabs w-full xl:hidden" role="tablist" aria-label="Vista de nuevo registro">
        <button
          type="button"
          role="tab"
          aria-selected={vistaMobile === "formulario"}
          onClick={() => setVistaMobile("formulario")}
          className={`tab flex-1 justify-center ${vistaMobile === "formulario" ? "active" : ""}`}>
          <Layers className="h-4 w-4" />
          <span>Formulario</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vistaMobile === "speech"}
          onClick={() => setVistaMobile("speech")}
          className={`tab flex-1 justify-center ${vistaMobile === "speech" ? "active" : ""}`}>
          <MessageSquareCode className="h-4 w-4" />
          <span>Guía ({speechItems.length})</span>
        </button>
      </div>

      {/* ───────────────── MAIN TWO-COLUMN RESPONSIVE LAYOUT ───────────────── */}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-stretch">
        <div className={`${vistaMobile === "formulario" ? "block" : "hidden"} min-w-0 xl:block`}>
          <section className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--text-2)]">
                  {selectedOption === "camaras" ? <Cctv className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[var(--text-1)]">Datos del nuevo registro</h2>
                  <p className="mt-0.5 text-xs text-[var(--text-3)]">
                    Completa la información del cliente, el servicio y la visita.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="badge badge-primary">{servicioLabel}</span>
                <span className="badge">{tipoRegistroLabel}</span>
              </div>
            </div>

            {selectedOption === "camaras" && opcionCamaras === "desdecero" && (
              <FormularioCamarasDesdeCero key="camaras-desde-cero" tipoRegistro="camaras" />
            )}

            {selectedOption === "camaras" && opcionCamaras === "tieneclientenuevo" && (
              <FormularioCamarasTieneClienteNuevo />
            )}

            {selectedOption === "camaras" && opcionCamaras === "tieneclienteexistente" && (
              <FormularioCamarasTieneClienteExistente tipoRegistro="camaras" />
            )}

            {selectedOption === "internet" && opcionInternet === "clientenuevo" && (
              <FormularioCamarasDesdeCero key="internet-nuevo" tipoRegistro="internet" />
            )}

            {selectedOption === "internet" && opcionInternet === "clienteexistente" && (
              <FormularioCamarasTieneClienteExistente key="internet-existente" tipoRegistro="internet" />
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: SPEECH CARDS INTERACTIVE GRID */}
        <aside className={`${vistaMobile === "speech" ? "block" : "hidden"} min-w-0 xl:sticky xl:top-20 xl:block`}>
          <section className="card flex min-h-0 flex-col gap-4 xl:h-full">
            <div className="shrink-0 space-y-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <MessageSquareCode className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-[var(--text-1)]">Guía comercial</h2>
                    <span className="badge">
                      {normalizedGuiaSearch
                        ? visibleSpeechItems.length + "/" + speechItems.length
                        : speechItems.length}
                    </span>
                    {isEditing && <span className="badge badge-primary">Editando</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-3)]">
                    Argumentos y preguntas de apoyo para {servicioLabel.toLowerCase()}.
                  </p>
                </div>
              </div>

              {!isEditing && speechItems.length > 4 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    type="search"
                    value={guiaSearch}
                    onChange={(event) => setGuiaSearch(event.target.value)}
                    placeholder="Buscar guiones..."
                    aria-label="Buscar en la guia comercial"
                    className="input h-10 w-full pl-9 pr-9 text-xs"
                  />
                  {guiaSearch && (
                    <button
                      type="button"
                      onClick={() => setGuiaSearch("")}
                      aria-label="Limpiar busqueda"
                      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--text-1)]">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => cancelarEditor(true)}
                        className="btn-secondary flex-1 px-3 py-2 text-xs"
                        title="Descartar cambios de los guiones">
                        <X className="h-4 w-4" />
                        <span>Cancelar</span>
                      </button>
                      <button
                        type="button"
                        onClick={guardarCambios}
                        disabled={saving}
                        className="btn-primary flex-1 px-3 py-2 text-xs"
                        title="Guardar cambios de los guiones">
                        <Save className="h-4 w-4" />
                        <span>{saving ? "Guardando..." : "Guardar"}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cancelarEditor(false)}
                      className="btn-secondary w-full px-3 py-2 text-xs"
                      title="Editar guía comercial">
                      <Pencil className="h-4 w-4" />
                      <span>Editar guía</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div
              className="min-h-0 max-h-[60dvh] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] xl:max-h-none xl:flex-1"
              role="region"
              aria-label="Guiones de la guia comercial"
              tabIndex={0}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loading />
                </div>
              ) : speechItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] px-4 py-8 text-center">
                  <MessageSquareCode className="mx-auto h-6 w-6 text-[var(--text-3)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--text-1)]">Sin guiones disponibles</p>
                  <p className="mt-1 text-xs text-[var(--text-3)]">Agrega el primer guion para este servicio.</p>
                </div>
              ) : visibleSpeechItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] px-4 py-8 text-center">
                  <Search className="mx-auto h-6 w-6 text-[var(--text-3)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--text-1)]">No hay coincidencias</p>
                  <p className="mt-1 text-xs text-[var(--text-3)]">Prueba con otra palabra.</p>
                </div>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={visibleSpeechItems.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 gap-2.5 [&_.card-event]:max-h-none! [&_.card-event]:overflow-visible! [&_.card-event>div:last-child]:overflow-visible! [&_.card-event>div:last-child]:pr-0!">
                    {visibleSpeechItems.map((item) => (
                      <SortableSpeechCard key={item.id} item={item} isEditing={isEditing}>
                        {isEditing ? (
                          <>
                            <input
                              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-2 text-sm font-semibold text-[var(--text-1)]"
                              value={item.titulo}
                              onChange={(e) => handleChangeTitulo(e, item.id)}
                            />
                            <textarea
                              ref={(el) => {
                                textareasRef.current[item.id] = el;
                                if (el) requestAnimationFrame(() => autoResize(el));
                              }}
                              className="w-full resize-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2.5 font-sans text-xs text-[var(--text-1)]"
                              value={item.descripcion}
                              onChange={(e) => {
                                handleChangeDescripcion(e, item.id);
                                autoResize(e.currentTarget);
                              }}
                              rows={3}
                            />
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSpeechId((current) =>
                                  current === item.id ? null : item.id,
                                )
                              }
                              aria-expanded={
                                expandedSpeechId === item.id ||
                                Boolean(normalizedGuiaSearch)
                              }
                              aria-controls={"guia-" + item.id}
                              className="flex w-full items-center gap-3 rounded-lg px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold tracking-tight text-[var(--text-1)]">
                                  {item.titulo}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                                  Guion {item.orden}
                                </span>
                              </span>
                              <ChevronDown
                                className={
                                  "h-4 w-4 shrink-0 text-[var(--text-3)] transition-transform " +
                                  (expandedSpeechId === item.id ||
                                  Boolean(normalizedGuiaSearch)
                                    ? "rotate-180"
                                    : "")
                                }
                              />
                            </button>

                            {(expandedSpeechId === item.id ||
                              Boolean(normalizedGuiaSearch)) && (
                              <div
                                id={"guia-" + item.id}
                                className="border-t border-[var(--border)] pt-3">
                                <div
                                  className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-2)]"
                                  dangerouslySetInnerHTML={{
                                    __html: formatBoldStars(item.descripcion),
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {isEditing && (
                          <div className="mt-2 flex justify-end border-t border-[var(--border)] pt-2">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="btn-danger px-2.5 py-1.5 text-xs">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </SortableSpeechCard>
                    ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {canEdit && isEditing && (
              <button
                type="button"
                onClick={agregarSpeech}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--primary-border)] bg-[var(--primary-soft)] px-4 py-3 text-xs font-semibold text-[var(--primary)] transition-colors hover:border-[var(--primary)]">
                <SquarePlus className="h-4 w-4" />
                <span>Agregar guion</span>
              </button>
            )}
          </section>
        </aside>
      </div>

    </div>
  );
}
