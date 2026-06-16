import { useEffect, useState } from "react";
import { CirclePlus, Pencil } from "lucide-react";
import { darkenColor } from "../utils/colores";
import Loading from "../components/Loading";

type MetodoPago = {
  id: number;
  metodo: string;
  color: string;
};

export default function ConfiguracionPagos() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarMetodos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pagos/metodos`);

      if (!res.ok) {
        console.error("Error al traer metodos de pago. Codigo:", res.status);
        return;
      }

      const data = await res.json();
      setMetodos(data);
    } catch (err) {
      console.error("Error de conexion al traer metodos de pago:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetodos();
  }, []);

  const crearMetodo = async () => {
    const metodo = prompt("Nombre del metodo de pago:");
    if (!metodo) return;

    try {
      const res = await fetch(`${API_URL}/api/pagos/metodos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo,
          color: "#f97316",
        }),
      });

      if (!res.ok) {
        console.error("Error al crear metodo de pago. Codigo:", res.status);
        return;
      }

      cargarMetodos();
    } catch (err) {
      console.error("Error de conexion al crear metodo de pago:", err);
    }
  };

  const guardarMetodo = async (id: number, metodo: string, color: string) => {
    if (!metodo) return;

    try {
      const res = await fetch(`${API_URL}/api/pagos/metodos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo,
          color,
        }),
      });

      if (!res.ok) {
        console.error("Error al actualizar metodo de pago. Codigo:", res.status);
        return;
      }

    } catch (err) {
      console.error("Error de conexion al actualizar metodo de pago:", err);
    }
  };

  const cambiarNombreMetodo = async (metodo: MetodoPago) => {
    const nuevoMetodo = prompt("Nombre del metodo de pago:", metodo.metodo);
    if (!nuevoMetodo) return;

    const metodoNormalizado = nuevoMetodo.trim().toUpperCase();
    if (!metodoNormalizado) return;

    await guardarMetodo(metodo.id, metodoNormalizado, metodo.color || "#f97316");
    cargarMetodos();
  };

  const cambiarColorMetodo = async (metodo: MetodoPago, color: string) => {
    setMetodos((prev) =>
      prev.map((item) =>
        item.id === metodo.id ? { ...item, color } : item
      )
    );

    await guardarMetodo(metodo.id, metodo.metodo, color);
  };

  return (
    <div className="cuadro">
      <div className="flex gap-3 items-center">
        <h1>Métodos de pago</h1>
        <div
          onClick={crearMetodo}
          className="text-xs rounded-full py-1 px-2 border-2 font-bold bg-orange-500 hover:bg-orange-600 border-orange-800 cursor-pointer flex gap-1 items-center"
        >
          <CirclePlus className="h-5 w-5" />
          Agregar método
        </div>
      </div>

      {loading ? (
        <div className="flex w-full items-center justify-center py-8">
          <Loading />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {metodos.map((metodo) => (
            <div className="flex items-center gap-2" key={metodo.id}>
              <div
                className="text-xs rounded-full py-1 px-2 border-2 font-bold"
                style={{
                  backgroundColor: metodo.color,
                  borderColor: darkenColor(metodo.color, 0.5),
                }}
              >
                {metodo.metodo}
              </div>
              <input
                type="color"
                value={metodo.color || "#f97316"}
                className="cursor-pointer"
                title="Cambiar color"
                onChange={(e) => cambiarColorMetodo(metodo, e.target.value)}
              />
              <Pencil
                className="h-4 w-4 text-blue-500 hover:text-white hover:scale-120 transition-all cursor-pointer"
                onClick={() => cambiarNombreMetodo(metodo)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
