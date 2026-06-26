import { useEffect, useState } from "react";
import {
  X,
  Plus,
  Save,
  Trash2,
  PackageSearch,
  FileText,
  PencilRuler,
  ListChecks,
} from "lucide-react";
import CanvasDibujo from "./CanvasDibujo";
import FirmaModal from "./FirmaModal";

interface HojaInspeccionProps {
  idCita: number;
  idHoja?: number | null; // ID de la cotización (para pre-cargar artículos)
  onClose: () => void;
  onSaved: () => void;
}

interface Producto {
  id: number;
  descrip: string;
  stock: number;
  precio: number;
}

interface InspeccionItem {
  id?: number;
  producto_id: number;
  producto_descrip: string;
  producto_stock: number;
  cantidad: number;
  detalle: string;
}

export default function HojaInspeccion({
  idCita,
  idHoja,
  onClose,
  onSaved,
}: HojaInspeccionProps) {
  // const API_URL = import.meta.env.VITE_API_BASE_URL;
  const API_URL = "http://localhost:5000";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [items, setItems] = useState<InspeccionItem[]>([]);
  const [cargadoDeCotizacion, setCargadoDeCotizacion] = useState(false);

  const [selectedProducto, setSelectedProducto] = useState<number | "">("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [detalle, setDetalle] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"materiales" | "dibujo">(
    "materiales",
  );
  const [dibujoFile, setDibujoFile] = useState<File | null>(null);
  const [dibujoUrl, setDibujoUrl] = useState<string | null>(null);
  const [showFirmaModal, setShowFirmaModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carga productos del stock
        const resProductos = await fetch(`${API_URL}/api/productos`);
        if (resProductos.ok) {
          const dataProductos = await resProductos.json();
          setProductos(dataProductos);
        }
      } catch (error) {
        console.error("Error al cargar productos:", error);
      }

      // Intenta cargar inspección guardada (aislado para no bloquear carga de cotización)
      let inspeccionTieneItems = false;
      try {
        const resInspeccion = await fetch(
          `${API_URL}/api/inspeccion/${idCita}`,
        );
        if (resInspeccion.ok) {
          const dataInspeccion = await resInspeccion.json();
          if (dataInspeccion.dibujo) {
            setDibujoUrl(`${API_URL}${dataInspeccion.dibujo}`);
          }
          if (dataInspeccion.items && dataInspeccion.items.length > 0) {
            // Tiene items guardados en la inspección → úsalos y no cargar cotización
            setItems(dataInspeccion.items);
            inspeccionTieneItems = true;
          }
        }
      } catch (error) {
        console.error("Error al cargar inspección:", error);
      }

      // No hay items en inspección → pre-cargar desde la cotización si existe
      if (!inspeccionTieneItems && idHoja) {
        try {
          console.log("Cargando artículos desde cotización ID:", idHoja);
          const resCotizacion = await fetch(
            `${API_URL}/api/cotizacion/${idHoja}`,
          );
          if (resCotizacion.ok) {
            const dataCotizacion = await resCotizacion.json();
            console.log("Respuesta cotización:", dataCotizacion);
            if (
              dataCotizacion.productos &&
              dataCotizacion.productos.length > 0
            ) {
              // Mapear artículos de cotización al formato de inspección
              const itemsDeCotizacion: InspeccionItem[] =
                dataCotizacion.productos.map((p: any) => ({
                  producto_id: p.id,
                  producto_descrip: p.descrip,
                  producto_stock: 0,
                  cantidad: Math.ceil(p.cantidad) || 1,
                  detalle: "",
                }));
              setItems(itemsDeCotizacion);
              setCargadoDeCotizacion(true);
            } else {
              console.warn("La cotización no tiene productos:", dataCotizacion);
            }
          } else {
            console.error(
              "Error al obtener cotización, status:",
              resCotizacion.status,
            );
          }
        } catch (error) {
          console.error("Error al cargar cotización:", error);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [idCita, idHoja, API_URL]);

  const handleAddItem = () => {
    if (!selectedProducto || cantidad <= 0) return;

    const producto = productos.find((p) => p.id === Number(selectedProducto));
    if (!producto) return;

    const existingIndex = items.findIndex((i) => i.producto_id === producto.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].cantidad += cantidad;
      if (detalle) {
        newItems[existingIndex].detalle = newItems[existingIndex].detalle
          ? newItems[existingIndex].detalle + " | " + detalle
          : detalle;
      }
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          producto_id: producto.id,
          producto_descrip: producto.descrip,
          producto_stock: producto.stock,
          cantidad,
          detalle,
        },
      ]);
    }

    setCargadoDeCotizacion(false);
    setSelectedProducto("");
    setCantidad(1);
    setDetalle("");
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    setCargadoDeCotizacion(false);
  };

  // Abre el modal de firma antes de guardar
  const handleSave = () => {
    setShowFirmaModal(true);
  };

  // Se ejecuta después de que el cliente firma
  const handleSaveWithFirma = async (firmaBlob: Blob) => {
    setShowFirmaModal(false);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(items));
      if (dibujoFile) {
        formData.append("dibujo", dibujoFile);
      }
      // Adjuntar la firma como archivo PNG
      const firmaFile = new File([firmaBlob], "firma.png", {
        type: "image/png",
      });
      formData.append("firma", firmaFile);

      const res = await fetch(`${API_URL}/api/inspeccion/${idCita}`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        alert("Error al guardar la hoja de inspección");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error de conexión al guardar la hoja de inspección");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showFirmaModal && (
        <FirmaModal
          onConfirm={handleSaveWithFirma}
          onCancel={() => setShowFirmaModal(false)}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh]">
          {/* Header */}
          <div className="bg-zinc-800 px-4 py-3 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/30 shrink-0">
                <PackageSearch className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  Hoja de Inspección
                </h2>
                <p className="text-xs text-white/50">
                  Materiales para la instalación
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-white/10 shrink-0">
              <button
                onClick={() => setActiveTab("materiales")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "materiales"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
                }`}>
                <ListChecks className="w-4 h-4" />
                Materiales
              </button>
              <button
                onClick={() => setActiveTab("dibujo")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "dibujo"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
                }`}>
                <PencilRuler className="w-4 h-4" />
                Imagen
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : activeTab === "materiales" ? (
              <>
                {/* Add Item Form */}
                <div className="p-4 border-b border-white/10 bg-zinc-950/40 flex flex-col gap-3 shrink-0">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    Agregar material
                  </p>

                  {/* Producto selector */}
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1">
                      Producto
                    </label>
                    <select
                      value={selectedProducto}
                      onChange={(e) =>
                        setSelectedProducto(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50">
                      <option value="">Selecciona un producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.descrip} — Stock: {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad + Detalle en fila */}
                  <div className="flex gap-2">
                    <div className="w-24 shrink-0">
                      <label className="block text-xs font-semibold text-white/60 mb-1">
                        Cant.
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={cantidad}
                        onChange={(e) => setCantidad(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-white/60 mb-1">
                        Detalle (opcional)
                      </label>
                      <input
                        type="text"
                        value={detalle}
                        onChange={(e) => setDetalle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                        placeholder="Color, largo, etc."
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddItem}
                    disabled={!selectedProducto || cantidad <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" />
                    Agregar material
                  </button>
                </div>

                {/* Items list wrapper */}
                <div className="flex-1 flex flex-col min-h-0 p-4">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-white/30">
                      <PackageSearch className="w-10 h-10 mb-2 opacity-40" />
                      <p className="text-sm">No hay materiales cargados</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2 shrink-0">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                          Lista de materiales ({items.length})
                        </p>
                        {cargadoDeCotizacion && (
                          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                            <FileText className="w-3 h-3" />
                            Pre-cargado desde cotización
                          </span>
                        )}
                      </div>
                      {/* The scrollable list of items */}
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 bg-zinc-800/60 border border-white/8 rounded-xl p-3 shrink-0">
                            {/* Cantidad badge */}
                            <div className="shrink-0 bg-orange-500/15 border border-orange-500/30 rounded-lg px-2 py-1 text-center min-w-[2.5rem]">
                              <span className="text-orange-300 font-bold text-sm">
                                {item.cantidad}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm leading-tight">
                                {item.producto_descrip}
                              </p>
                              {item.detalle && (
                                <p className="text-white/50 text-xs mt-0.5 italic">
                                  {item.detalle}
                                </p>
                              )}
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="shrink-0 p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Dibujo Tab */
              <CanvasDibujo
                initialImage={dibujoUrl}
                onImageChange={(file) => setDibujoFile(file)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="bg-zinc-800 px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/20">
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
