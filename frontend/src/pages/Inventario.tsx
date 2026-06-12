import { useEffect, useState } from "react";
import { Package, Pencil, Save, X, Plus, Trash2, Search } from "lucide-react";
import Loading from "../components/Loading";

type Producto = {
  id: number;
  descrip: string;
  precio: number;
  stock: number;
};

export default function Inventario() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Producto>>({});

  // Add state
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Producto>>({
    descrip: "",
    precio: 0,
    stock: 0,
  });

  const fetchProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/productos`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
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
        setNewProduct({ descrip: "", precio: 0, stock: 0 });
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

  const filteredProductos = productos.filter(
    (p) =>
      p.descrip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toString().includes(searchQuery),
  );

  if (loading) return <Loading />;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-3">
      <div className="w-full cuadro shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl font-extrabold tracking-tight">Inventario</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-orange-500/50 transition-colors">
            <Search className="w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar por descripción o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 w-64"
            />
          </div>

          <button
            onClick={() => setAddingProduct(true)}
            className="flex items-center gap-2 boton bg-orange-500 text-white hover:bg-orange-600 px-3 py-1.5 text-sm">
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 cuadro overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="bg-zinc-900/50 text-xs uppercase text-white/60 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-4 py-3 w-1/2">Descripción</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Row for adding new product */}
              {addingProduct && (
                <tr className="border-b border-white/10 bg-white/5">
                  <td className="px-4 py-3 text-white/30">-</td>
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
                          setNewProduct({ descrip: "", precio: 0, stock: 0 });
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
                  className="border-b border-white/5 hover:bg-white/5 transition-colors">
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
                    ) : (
                      p.stock
                    )}
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
    </div>
  );
}
