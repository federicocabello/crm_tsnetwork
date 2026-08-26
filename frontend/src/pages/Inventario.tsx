import { useEffect, useRef, useState } from "react";
import { Package, Pencil, Save, X, Plus, Trash2, Search, TriangleAlert } from "lucide-react";
import Loading from "../components/Loading";
import { useAuth } from "../auth/AuthContext";

type Producto = {
  id: number;
  descrip: string;
  precio: number;
  stock: number;
  categoria: "internet" | "camaras" | "ambos";
};

type FiltroCategoria = "todos" | "internet" | "camaras" | "ambos";
type FiltroStock = "todos" | "bajo";

export default function Inventario() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<FiltroCategoria>("todos");
  const [stockFilter, setStockFilter] = useState<FiltroStock>("todos");
  const [mostrarAlertaStock, setMostrarAlertaStock] = useState(false);
  const alertaInicialEvaluada = useRef(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Producto>>({});

  // Add state
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Producto>>({
    descrip: "",
    precio: 0,
    stock: 0,
    categoria: "ambos",
  });

  const fetchProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/productos`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
        if (!alertaInicialEvaluada.current) {
          setMostrarAlertaStock(
            user?.rol !== "tecnico" &&
              data.some((producto: Producto) => Number(producto.stock) <= 3),
          );
          alertaInicialEvaluada.current = true;
        }
      }
    } catch (error) {
      console.error("Error fetching productos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleEdit = (p: Producto) => {
    setEditingId(p.id);
    setEditForm(p);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/productos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingId(null);
        fetchProductos();
      } else {
        alert("Error al actualizar producto");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAdd = async () => {
    if (!newProduct.descrip) {
      alert("La descripción es obligatoria");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        setAddingProduct(false);
        setNewProduct({
          descrip: "",
          precio: 0,
          stock: 0,
          categoria: "ambos",
        });
        fetchProductos();
      } else {
        alert("Error al agregar producto");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return;
    try {
      const res = await fetch(`${API_URL}/api/productos/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchProductos();
      } else {
        alert("Error al eliminar producto");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const filteredProductos = productos.filter((p) => {
    const coincideCategoria =
      categoryFilter === "todos" || p.categoria === categoryFilter;
    const coincideStock = stockFilter === "todos" || Number(p.stock) <= 3;
    return (
      coincideCategoria &&
      coincideStock &&
      (p.descrip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery))
    );
  });

  if (loading) return <Loading />;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-3">
      <div className="w-full cuadro shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-extrabold tracking-tight">Inventario</h1>
          </div>

          <button
            onClick={() => setAddingProduct(true)}
            className="flex shrink-0 items-center gap-2 boton bg-orange-500 text-white hover:bg-orange-600 px-3 py-1.5 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-zinc-900 p-1">
            {(["todos", "internet", "camaras", "ambos"] as FiltroCategoria[]).map(
              (categoria) => (
                <button
                  key={categoria}
                  onClick={() => setCategoryFilter(categoria)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    categoryFilter === categoria
                      ? "bg-orange-500 text-white"
                      : "text-white/60 hover:text-white"
                  }`}>
                  {categoria === "camaras" ? "Cámaras" : categoria}
                </button>
              ),
            )}
          </div>
          <button
            onClick={() => setStockFilter((actual) => actual === "bajo" ? "todos" : "bajo")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              stockFilter === "bajo"
                ? "border-red-500/60 bg-red-500/20 text-red-300"
                : "border-white/10 bg-zinc-900 text-white/60 hover:border-red-500/40 hover:text-red-300"
            }`}
            aria-pressed={stockFilter === "bajo"}>
            <TriangleAlert className="h-4 w-4" />
            Stock bajo
          </button>
          <div className="flex w-full items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-orange-500/50 transition-colors sm:w-auto">
            <Search className="w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar por descripción o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 sm:w-64"
            />
          </div>

        </div>
      </div>

      <div className="flex-1 min-h-0 cuadro overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="bg-zinc-900/50 text-xs uppercase text-white/80 font-black sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-4 py-3 w-1/2">Descripción</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Row for adding new product */}
              {addingProduct && (
                <tr className="border-b border-white/10 bg-white/5">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Descripción del producto"
                      className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500"
                      value={newProduct.descrip}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          descrip: e.target.value,
                        })
                      }
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newProduct.categoria || "ambos"}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          categoria: e.target.value as Producto["categoria"],
                        })
                      }
                      className="bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500">
                      <option value="internet">Internet</option>
                      <option value="camaras">Cámaras</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      className="w-24 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500 text-right"
                      value={newProduct.precio}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          precio: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      className="w-20 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500 text-right"
                      value={newProduct.stock}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          stock: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleAdd}
                        className="text-green-500 hover:text-green-400 p-1"
                        title="Guardar">
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAddingProduct(false);
                          setNewProduct({
                            descrip: "",
                            precio: 0,
                            stock: 0,
                            categoria: "ambos",
                          });
                        }}
                        className="text-zinc-400 hover:text-zinc-300 p-1"
                        title="Cancelar">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredProductos.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b transition-colors ${
                    Number(p.stock) <= 3
                      ? "border-red-500/20 bg-red-500/10 hover:bg-red-500/15"
                      : "border-white/5 hover:bg-white/5"
                  }`}>
                  {/* <td className="px-4 py-3">{p.id}</td> */}
                  <td className="px-4 py-3">
                    {editingId === p.id ? (
                      <input
                        type="text"
                        className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500"
                        value={editForm.descrip || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, descrip: e.target.value })
                        }
                      />
                    ) : (
                      p.descrip
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === p.id ? (
                      <select
                        value={editForm.categoria || "ambos"}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            categoria: e.target.value as Producto["categoria"],
                          })
                        }
                        className="bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500">
                        <option value="internet">Internet</option>
                        <option value="camaras">Cámaras</option>
                        <option value="ambos">Ambos</option>
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-xs font-semibold text-orange-200">
                        {p.categoria === "camaras"
                          ? "Cámaras"
                          : p.categoria === "ambos"
                            ? "Ambos"
                            : "Internet"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === p.id ? (
                      <input
                        type="number"
                        className="w-24 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500 text-right"
                        value={editForm.precio ?? 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            precio: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      `$${p.precio.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === p.id ? (
                      <input
                        type="number"
                        className="w-20 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-orange-500 text-right"
                        value={editForm.stock ?? 0}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            stock: parseInt(e.target.value, 10) || 0,
                          })
                        }
                      />
                    ) : Number(p.stock) <= 3 ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/15 px-2 py-1 font-black text-red-300">
                        <TriangleAlert className="h-3.5 w-3.5" />
                        {p.stock}
                      </span>
                    ) : p.stock}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === p.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(p.id)}
                          className="text-green-500 hover:text-green-400 p-1"
                          title="Guardar">
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-zinc-400 hover:text-zinc-300 p-1"
                          title="Cancelar">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-blue-500 hover:text-blue-400 p-1"
                          title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-500 hover:text-red-400 p-1"
                          title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProductos.length === 0 && !addingProduct && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-white/50">
                    {searchQuery
                      ? "No se encontraron productos que coincidan con la búsqueda."
                      : "No hay productos registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {mostrarAlertaStock && user?.rol !== "tecnico" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-lg border border-red-500/35 bg-zinc-900 shadow-2xl shadow-red-950/50">
            <div className="flex items-start gap-3 border-b border-red-500/20 bg-red-500/10 p-5">
              <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0 text-red-400" />
              <div>
                <h2 className="text-lg font-black text-red-300">Stock bajo</h2>
                <p className="mt-1 text-sm text-white/60">Hay productos con 3 unidades o menos disponibles.</p>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-4">
              <ul className="space-y-2">
                {productos.filter((p) => Number(p.stock) <= 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b border-white/5 px-2 py-2 text-sm last:border-0">
                    <span className="min-w-0 truncate text-white/80">{p.descrip}</span>
                    <span className="shrink-0 font-black text-red-300">{p.stock} unid.</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end border-t border-white/10 p-4">
              <button onClick={() => setMostrarAlertaStock(false)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
