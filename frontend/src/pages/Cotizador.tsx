import { useEffect, useMemo, useState } from "react";

interface Producto {
  id: number;
  descrip: string;
  precio: number;
  stock: number;
}

interface RowData {
  cantidad: number;
  costo: string;
  precioFinal: string;
}

interface Props {
  onClose: (arg0: boolean) => void;
  setCotizacion?: (data: any) => void;
  idCotizacion?: number | null;
  modo?: "nuevo" | "editar";
  onSaved?: () => void;
  idCita?: number | null;
}

export default function Cotizador({
  onClose,
  setCotizacion,
  idCotizacion = null,
  modo = "nuevo",
  onSaved,
  idCita = null,
}: Props) {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [data, setData] = useState<Producto[]>([]);
  const [rows, setRows] = useState<Record<number, RowData>>({});
  const [search, setSearch] = useState("");

  const roundUp = (num: number) => Math.ceil(num * 100) / 100;

  const calculate = (price: number, cantidad: number) => {
    const total = roundUp(price * cantidad);
    const taxas = roundUp(total * 0.0825);
    const totalTazas = roundUp(total + taxas);
    const precioFinalTazas = roundUp(totalTazas + totalTazas * 0.4);

    return {
      costo: totalTazas.toFixed(2),
      precioFinal: precioFinalTazas.toFixed(2),
    };
  };

  const handleChange = (id: number, price: number, cantidad: number) => {
    let safeCantidad = Number.isNaN(cantidad) ? 0 : cantidad;

    if (cantidad < 0) {
      alert("El número debe ser mayor a 0");
      safeCantidad = 0;
      return;
    }

    const result = calculate(price, safeCantidad);

    setRows((prev) => ({
      ...prev,
      [id]: {
        cantidad: safeCantidad,
        ...result,
      },
    }));
  };

async function sendCotizacion() {
  if (modo === "nuevo") {
    // Caso 1: cotizador usado dentro de formulario, antes de crear cita
    if (!idCita) {
      setCotizacion?.(rows);
      onClose(false);
      return;
    }

    // Caso 2: cotizador desde agenda, cita ya existe en DB
    try {
      const res = await fetch(`${API_URL}/api/cotizacion/nueva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cita: idCita,
          productos: rows,
        }),
      });

      if (res.ok) {
        onSaved?.();
        onClose(false);
      } else {
        console.error("Error al crear cotización:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión creando cotización:", error);
    }

    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/cotizaciones/${idCotizacion}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos: rows }),
    });

    if (res.ok) {
      onSaved?.();
      onClose(false);
    } else {
      console.error("Error al guardar cotización:", res.status);
    }
  } catch (error) {
    console.error("Error de conexión guardando cotización:", error);
  }
}

useEffect(() => {
  const fetchApi = async () => {
    try {
      const response = await fetch(`${API_URL}/api/productos`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const datos = await response.json();
      setData(datos);
    } catch {
      alert("Ocurrió un error");
    }
  };

  const fetchCotizacion = async () => {
    if (modo !== "editar" || !idCotizacion) return;

    try {
      const res = await fetch(`${API_URL}/api/cotizacion/${idCotizacion}`);

      if (!res.ok) {
        console.error("Error al traer cotización:", res.status);
        return;
      }

      const cotizacion = await res.json();

      console.log("Cotización recibida:", cotizacion);

      const rowsCargadas: Record<number, RowData> = {};

      cotizacion.productos.forEach((item: any) => {
          rowsCargadas[Number(item.id)] = {
          cantidad: Number(item.cantidad),
          costo: item.costo ? String(item.costo) : "0.00",
          precioFinal: String(item.precioFinal ?? "0.00"),
        };
      });

      console.log("Rows cargadas:", rowsCargadas);

      setRows(rowsCargadas);
    } catch (error) {
      console.error("Error cargando cotización:", error);
    }
  };

  fetchApi();
  fetchCotizacion();
}, [API_URL, modo, idCotizacion]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    return data.filter((item) =>
      item.descrip.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const totalGeneral = useMemo(() => {
    const total = Object.values(rows).reduce((acc, row) => {
      return acc + (parseFloat(row.precioFinal) || 0);
    }, 0);

    return total.toFixed(2);
  }, [rows]);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">Nueva cotización</h1>
            <p className="text-sm text-white/50">
              Selecciona productos y cantidades para generar el presupuesto.
            </p>
          </div>

          <button
            onClick={() => onClose(false)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* Buscador */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10"
              />

              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                🔍
              </span>
            </div>

            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60 sm:block">
              Productos: {filteredData.length}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full min-w-900px text-sm">
              <thead className="sticky top-0 z-10 bg-orange-600 text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Costo + Tax</th>
                  <th className="px-4 py-3">Precio final</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10 bg-zinc-950">
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-white/50"
                    >
                      No se encontraron productos.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const row = rows[item.id];

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-white/0.03"
                      >
                        <td className="px-4 py-3 font-semibold text-white">
                          {item.descrip}
                        </td>

                        <td className="px-4 py-3 text-white/80">
                          ${Number(item.precio).toFixed(2)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              item.stock > 0
                                ? "bg-green-500/10 text-green-300"
                                : "bg-red-500/10 text-red-300"
                            }`}
                          >
                            {item.stock}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <input
                            className="w-24 rounded-xl border border-white/10 bg-white px-3 py-2 text-center text-sm font-bold text-black outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                            type="number"
                            min={0}
                            value={row?.cantidad ?? ""}
                            onChange={(e) =>
                              handleChange(
                                item.id,
                                item.precio,
                                e.target.valueAsNumber
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-3 font-medium text-white/80">
                          ${row?.costo || "0.00"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-300">
                            ${row?.precioFinal || "0.00"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-zinc-900/80 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">
                Total general
              </p>
              <p className="text-3xl font-black text-white">${totalGeneral}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onClose(false)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </button>

              <button
                onClick={sendCotizacion}
                className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
              >
                Guardar cotización
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}