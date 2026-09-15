import { useEffect, useMemo, useState } from "react";
import { FileDown, History, Trash2, X } from "lucide-react";
import { api, getToken } from "../lib/api";

interface Producto {
  id: number;
  descrip: string;
  precio: number;
  stock: number;
  categoria: "internet" | "camaras" | "ambos";
}

type CategoriaServicio = "internet" | "camaras";

interface RowData {
  cantidad: number;
  costo: string;
  precioFinal: string;
}

interface Props {
  onClose: (arg0: boolean) => void;
  setCotizacion?: (data: any) => void;
  cotizacionInicial?: { productos: Record<number, RowData>; descuento: number } | Record<number, RowData> | null;
  idCotizacion?: number | null;
  modo?: "nuevo" | "editar";
  onSaved?: () => void;
  idCita?: number | null;
  idCliente?: number | null;
  bloqueada?: boolean;
  categoriaServicio?: CategoriaServicio;
}

export default function Cotizador({
  onClose,
  setCotizacion,
  cotizacionInicial = null,
  idCotizacion = null,
  modo = "nuevo",
  onSaved,
  idCita = null,
  bloqueada = false,
  categoriaServicio,
}: Props) {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";

  const [data, setData] = useState<Producto[]>([]);
  const [rows, setRows] = useState<Record<number, RowData>>(() => cotizacionInicial && "productos" in cotizacionInicial ? cotizacionInicial.productos : cotizacionInicial ?? {});
  const [search, setSearch] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [descuento, setDescuento] = useState(() => cotizacionInicial && "productos" in cotizacionInicial ? Math.max(Number(cotizacionInicial.descuento) || 0, 0) : 0);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState<number | "actual" | null>(null);

  const [versiones, setVersiones] = useState<Array<{ id: number; version: number; subtotal: number; descuento: number; total: number; creado_por: string; creado_en: string; comentario?: string; productos: Array<{ producto_id: number | null; nombre_producto: string; cantidad: number; precio_final: number }> }>>([]);
  const [versionEnEdicion, setVersionEnEdicion] = useState<number | null>(null);
  const [eliminandoVersion, setEliminandoVersion] = useState<number | null>(null);

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
    if (bloqueada) return;

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
  if (bloqueada || guardando) return;

  const productos = Object.fromEntries(
    Object.entries(rows).filter(([, row]) => Number(row.cantidad) > 0),
  );

  if (Object.keys(productos).length === 0) {
    alert("Agregá al menos un producto con una cantidad mayor a cero.");
    return;
  }

  if (modo === "nuevo" && !idCita) {
    setCotizacion?.({ productos, descuento });
    onClose(false);
    return;
  }

  setGuardando(true);
  try {
    const esNueva = modo === "nuevo";
    const url = esNueva
      ? `${API_URL}/api/cotizacion/nueva`
      : `${API_URL}/api/cotizaciones/${idCotizacion}`;
    const descuentoAplicado = Number(descuento) > 0 ? Number(descuento) : null;
    const body = esNueva
      ? { cita: idCita, productos, ...(descuentoAplicado ? { descuento: descuentoAplicado } : {}) }
      : { productos, ...(descuentoAplicado ? { descuento: descuentoAplicado } : {}) };

    await api(url.replace(API_URL || "", ""), {
      method: esNueva ? "POST" : "PUT",
      body: JSON.stringify(body),
    });

    await Promise.resolve(onSaved?.());
    alert(esNueva ? "Cotización guardada correctamente." : "Cotización actualizada correctamente.");
    onClose(false);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo guardar la cotización.";
    console.error("Error guardando cotización:", error);
    alert(mensaje);
  } finally {
    setGuardando(false);
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
      setDescuento(Math.max(Number(cotizacion.descuento) || 0, 0));

      const rowsCargadas: Record<number, RowData> = {};

      cotizacion.productos.forEach((item: any) => {
          rowsCargadas[Number(item.id)] = {
          cantidad: Number(item.cantidad),
          costo: item.costo ? String(item.costo) : "0.00",
          precioFinal: String(item.precioFinal ?? "0.00"),
        };
      });


      setRows(rowsCargadas);
    } catch (error) {
      console.error("Error cargando cotización:", error);
    }
  };

  fetchApi();
  fetchCotizacion();
}, [API_URL, modo, idCotizacion, idCita]);

  const filteredData = useMemo(() => {
    let baseData = categoriaServicio
      ? data.filter(
          (item) =>
            item.categoria === categoriaServicio ||
            item.categoria === "ambos" ||
            Boolean(rows[item.id]?.cantidad),
        )
      : data;
    if (bloqueada) {
      baseData = data.filter((item) => rows[item.id] && rows[item.id].cantidad > 0);
    }

    if (!search.trim()) return baseData;

    return baseData.filter((item) =>
      item.descrip.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search, bloqueada, rows, categoriaServicio]);

  const subtotalGeneral = useMemo(() => {
    const total = Object.values(rows).reduce((acc, row) => {
      return acc + (parseFloat(row.precioFinal) || 0);
    }, 0);

    return total.toFixed(2);
  }, [rows]);

  const totalGeneral = Math.max(Number(subtotalGeneral) - descuento, 0).toFixed(2);

  const cargarHistorial = async () => {
    if (!idCotizacion) return;
    setCargandoHistorial(true);
    try {
      const resultado = await api<{ versiones: typeof versiones }>(
        `/api/cotizaciones/${idCotizacion}/historial`,
      );
      setVersiones(resultado.versiones || []);

      setMostrarHistorial(true);
    } catch (error) {
      console.error("Error cargando historial:", error);
      alert("No se pudo cargar el historial de la cotización.");
    } finally {
      setCargandoHistorial(false);
    }
  };
  const eliminarVersion = async (version: (typeof versiones)[number]) => {
    if (!idCotizacion || eliminandoVersion !== null) return;
    if (!window.confirm(`¿Eliminar la versión ${version.version}? Esta acción no modifica la cotización actual.`)) return;

    setEliminandoVersion(version.id);
    try {
      await api(`/api/cotizaciones/${idCotizacion}/versiones/${version.id}`, {
        method: "DELETE",
      });
      setVersiones((actuales) => actuales.filter((item) => item.id !== version.id));
      if (versionEnEdicion === version.version) {
        setVersionEnEdicion(null);
      }
    } catch (error) {
      console.error("Error eliminando versión:", error);
      alert(error instanceof Error ? error.message : "No se pudo eliminar la versión.");
    } finally {
      setEliminandoVersion(null);
    }
  };
  const editarVersion = (version: (typeof versiones)[number]) => {
    if (bloqueada) return;

    const rowsVersion: Record<number, RowData> = {};
    version.productos.forEach((producto) => {
      if (producto.producto_id === null) return;
      const cantidad = Number(producto.cantidad) || 0;
      const productoActual = data.find((item) => item.id === producto.producto_id);
      const calculo = calculate(Number(productoActual?.precio) || 0, cantidad);
      rowsVersion[producto.producto_id] = {
        cantidad,
        costo: calculo.costo,
        precioFinal: Number(producto.precio_final || 0).toFixed(2),
      };
    });

    if (Object.keys(rowsVersion).length === 0) {
      alert("Esta version no tiene productos disponibles para editar.");
      return;
    }

    setRows(rowsVersion);
    setDescuento(Math.max(Number(version.descuento) || 0, 0));
    setVersionEnEdicion(version.version);
    setSearch("");
    setMostrarHistorial(false);
  };
  const exportarPdf = async (versionId?: number, versionParaNueva?: (typeof versiones)[number]) => {
    if (!idCotizacion || generandoPdf) return;

    const ventana = window.open("", "_blank");
    setGenerandoPdf(versionId ?? "actual");
    try {
      if (versionParaNueva && !bloqueada) {
        const productos = Object.fromEntries(
          versionParaNueva.productos
            .filter((producto) => producto.producto_id !== null)
            .map((producto) => [
              String(producto.producto_id),
              {
                cantidad: Number(producto.cantidad) || 0,
                costo: "0.00",
                precioFinal: Number(producto.precio_final || 0).toFixed(2),
              },
            ]),
        );
        if (Object.keys(productos).length === 0) {
          throw new Error("La version no tiene productos disponibles.");
        }

        const descuentoVersion = Math.max(Number(versionParaNueva.descuento) || 0, 0);
        await api(`/api/cotizaciones/${idCotizacion}`, {
          method: "PUT",
          body: JSON.stringify({
            productos,
            ...(descuentoVersion > 0 ? { descuento: descuentoVersion } : {}),
          }),
        });
        setRows(productos as Record<number, RowData>);
        setDescuento(descuentoVersion);
        setVersionEnEdicion(null);
        versionId = undefined;
        await Promise.resolve(onSaved?.());
      } else if (!versionId && versionEnEdicion !== null && !bloqueada) {
        const productos = Object.fromEntries(
          Object.entries(rows).filter(([, row]) => Number(row.cantidad) > 0),
        );
        if (Object.keys(productos).length === 0) {
          throw new Error("La cotizacion debe tener al menos un producto.");
        }

        const descuentoAplicado = Number(descuento) > 0 ? Number(descuento) : null;
        await api(`/api/cotizaciones/${idCotizacion}`, {
          method: "PUT",
          body: JSON.stringify({
            productos,
            ...(descuentoAplicado ? { descuento: descuentoAplicado } : {}),
          }),
        });
        await Promise.resolve(onSaved?.());
        setVersionEnEdicion(null);
      }

      const token = getToken();
      const response = await fetch(`/api/cotizaciones/${idCotizacion}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(versionId ? { version_id: versionId } : {}),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "No se pudo generar el PDF.");
      }

      const pdfUrl = URL.createObjectURL(await response.blob());
      if (ventana) {
        ventana.location.href = pdfUrl;
      } else {
        window.location.href = pdfUrl;
      }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
      if (versionParaNueva && mostrarHistorial) {
        await cargarHistorial();
      }

    } catch (error) {
      ventana?.close();
      console.error("Error generando PDF:", error);
      alert(error instanceof Error ? error.message : "No se pudo generar el PDF.");
    } finally {
      setGenerandoPdf(null);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto bg-black/80 p-2 backdrop-blur-sm sm:p-4">
      <div className="my-auto flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl sm:h-[90vh] sm:rounded-3xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-zinc-900/80 px-4 py-3 sm:items-center sm:px-6 sm:py-4">
          <div>
            <h1 className="text-xl font-bold text-white">Nueva cotización</h1>
            <p className="text-sm text-white/50">
              {bloqueada
                ? "Esta cotizacion ya fue confirmada y no se puede modificar."
                : "Selecciona productos y cantidades para generar el presupuesto."}
            </p>
            {versionEnEdicion !== null && <span className="mt-1 inline-flex rounded-md border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-200">Basada en la versión {versionEnEdicion}</span>}
          </div>

          <button
            onClick={() => onClose(false)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Buscador */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              {categoriaServicio && (
                <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs font-bold text-orange-200">
                  Mostrando: {categoriaServicio === "camaras" ? "Cámaras" : "Internet"}
                </span>
              )}
            <div className="relative w-full sm:max-w-md">
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
            </div>

            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60 sm:block">
              Productos: {filteredData.length}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[900px] text-sm">
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
                            disabled={bloqueada || guardando}
                            value={row?.cantidad ?? ""}
                            title={
                              bloqueada
                                ? "No se puede modificar una instalacion confirmada"
                                : undefined
                            }
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
        <div className="shrink-0 border-t border-white/10 bg-zinc-900/80 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-end gap-4">
              <div><p className="text-xs uppercase tracking-wide text-white/40">Subtotal</p><p className="text-sm font-bold text-white/65">${subtotalGeneral}</p></div>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-white/40">Descuento</span>
                <input type="number" min={0} step={1} disabled={bloqueada || guardando} value={descuento} onChange={(event) => setDescuento(Math.max(Number(event.target.value) || 0, 0))} className="w-28 rounded-lg border border-white/15 bg-white px-3 py-1.5 text-right text-sm font-bold text-black" />
              </label>
              <div><p className="text-xs uppercase tracking-wide text-white/40">Total general</p><p className="text-3xl font-black text-white">${totalGeneral}</p></div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {modo === "editar" && idCotizacion && Object.values(rows).some((row) => Number(row.cantidad) > 0) && (
                <>
                  <button type="button" onClick={cargarHistorial} disabled={cargandoHistorial} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"><History className="h-4 w-4" />{cargandoHistorial ? "Cargando..." : "Historial"}</button>
                  <button type="button" onClick={() => exportarPdf()} disabled={generandoPdf !== null} className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"><FileDown className="h-4 w-4" />{generandoPdf === "actual" ? "Generando..." : "Exportar a PDF"}</button>
                </>
              )}
              <button
                onClick={() => onClose(false)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </button>

              <button
                onClick={sendCotizacion}
                disabled={bloqueada || guardando}
                className={`rounded-xl px-6 py-3 text-sm font-black text-white shadow-lg transition ${
                  (bloqueada || guardando)
                    ? "cursor-not-allowed bg-zinc-700 text-white/45 shadow-none"
                    : "bg-orange-600 shadow-orange-600/20 hover:bg-orange-700"
                }`}
              >
                {bloqueada ? "Cotizacion confirmada" : guardando ? "Guardando..." : "Guardar cotización"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mostrarHistorial && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/75 p-3" onClick={() => setMostrarHistorial(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div><h2 className="font-black text-white">Historial de cotización</h2><p className="text-xs text-white/45">Cada versión es de solo lectura.</p></div>
              <button type="button" onClick={() => setMostrarHistorial(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/75 transition hover:border-white/30 hover:bg-white/10 hover:text-white" title="Cerrar historial"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[calc(85vh-4rem)] space-y-3 overflow-y-auto p-4">
              {versiones.length === 0 ? <p className="text-sm text-white/50">Todavía no hay versiones registradas.</p> : versiones.map((version) => (
                <details key={version.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-orange-300">Versión {version.version}</strong><p className="text-xs text-white/50">{version.creado_en} · {version.creado_por}</p></div><div className="text-right text-sm"><p className="text-white/50">Descuento: ${Number(version.descuento).toFixed(2)}</p><strong className="text-white">Total: ${Number(version.total).toFixed(2)}</strong></div></div>
                  </summary>
                  <div className="mt-3 divide-y divide-white/10 border-t border-white/10 pt-2">{version.productos.map((producto, index) => <div key={`${version.id}-${producto.producto_id ?? index}`} className="flex justify-between gap-3 py-2 text-sm"><span className="text-white/80">{producto.nombre_producto}</span><span className="shrink-0 text-white/50">Cant. {producto.cantidad}</span></div>)}</div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
                    <button type="button" onClick={() => eliminarVersion(version)} disabled={eliminandoVersion !== null || generandoPdf !== null} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" />{eliminandoVersion === version.id ? "Eliminando..." : "Eliminar versión"}</button>
                    {!bloqueada && <button type="button" onClick={() => editarVersion(version)} disabled={generandoPdf !== null} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">Editar esta versión</button>}
                    <button type="button" onClick={() => exportarPdf(version.id, version)} disabled={generandoPdf !== null} className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"><FileDown className="h-4 w-4" />{generandoPdf === version.id ? "Generando..." : `Exportar versión ${version.version}`}</button>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
