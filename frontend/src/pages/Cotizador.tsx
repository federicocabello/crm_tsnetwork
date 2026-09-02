import { useEffect, useMemo, useState } from "react";
import { FileDown, History, X } from "lucide-react";
import { api } from "../lib/api";

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

interface ClienteCotizacion {
  nombre: string;
  telefono: string;
  direccion: string;
  email: string;
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
  idCliente = null,
  bloqueada = false,
  categoriaServicio,
}: Props) {
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [data, setData] = useState<Producto[]>([]);
  const [rows, setRows] = useState<Record<number, RowData>>(() => cotizacionInicial && "productos" in cotizacionInicial ? cotizacionInicial.productos : cotizacionInicial ?? {});
  const [search, setSearch] = useState("");
  const [clienteCotizacion, setClienteCotizacion] = useState<ClienteCotizacion | null>(null);
  const [fechaCita, setFechaCita] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [descuento, setDescuento] = useState(() => cotizacionInicial && "productos" in cotizacionInicial ? Math.max(Number(cotizacionInicial.descuento) || 0, 0) : 0);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [versiones, setVersiones] = useState<Array<{ id: number; version: number; subtotal: number; descuento: number; total: number; creado_por: string; creado_en: string; comentario?: string; productos: Array<{ producto_id: number | null; nombre_producto: string; cantidad: number; precio_final: number }> }>>([]);

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
    const body = esNueva
      ? { cita: idCita, productos, descuento }
      : { productos, descuento };

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
      setClienteCotizacion(cotizacion.cliente ?? null);
      setFechaCita(cotizacion.cita_fecha ?? null);
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

  const fetchClienteCotizacion = async () => {
    if (!idCliente) return;
    try {
      const res = await fetch(`${API_URL}/api/clientes/${idCliente}`);
      if (!res.ok) return;
      const dataCliente = await res.json();
      const cita = dataCliente.citas?.find(
        (item: { idcita: number }) => Number(item.idcita) === Number(idCita),
      );
      setClienteCotizacion({
        nombre: dataCliente.cliente?.nombre ?? "",
        email: dataCliente.cliente?.email ?? "",
        telefono: cita?.telefono ?? "",
        direccion: cita?.domicilio ?? "",
      });
    } catch (error) {
      console.error("Error cargando datos del cliente:", error);
    }
  };
  fetchApi();
  fetchCotizacion();
  fetchClienteCotizacion();
}, [API_URL, modo, idCotizacion, idCita, idCliente]);

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
  const exportarPdf = () => {
    const articulos = Object.entries(rows)
      .filter(([, row]) => row.cantidad > 0)
      .map(([id, row]) => ({
        nombre: data.find((producto) => producto.id === Number(id))?.descrip ?? "Artículo",
        precio: Number(row.precioFinal) || 0,
      }));

    if (!articulos.length) {
      alert("Agregá al menos un artículo antes de exportar.");
      return;
    }

    const ventana = window.open("", "_blank", "width=900,height=1100");
    if (!ventana) {
      alert("Habilitá las ventanas emergentes para exportar el PDF.");
      return;
    }

    const escape = (value: string | null | undefined) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const money = (value: number) =>
      value.toLocaleString("en-US", { style: "currency", currency: "USD" });
    const numero = idCotizacion ? String(idCotizacion).padStart(6, "0") : "BORRADOR";
    const visita = fechaCita
      ? new Date(`${fechaCita}T12:00:00`).toLocaleDateString("es-AR")
      : "-";
    const filas = articulos
      .map(({ nombre }) => `<tr><td>${escape(nombre)}</td></tr>`)
      .join("");
    const logo = new URL("/logo_tsnetwork.png", window.location.origin).href;

    ventana.document.write(`<!doctype html>
<html lang="es"><head><meta charset="UTF-8"><title>Cotización ${numero}</title>
<style>
*{box-sizing:border-box}body{margin:0;color:#18181b;font-family:Arial,sans-serif}.page{max-width:820px;min-height:1040px;margin:auto;padding:42px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:32px;padding-bottom:24px;border-bottom:3px solid #f97316}
.logo{width:190px;max-height:82px;object-fit:contain;object-position:left center}h1{margin:0 0 8px;font-size:30px;text-transform:uppercase}
.number{color:#f97316;font-weight:700}.meta{margin-top:7px;color:#52525b;font-size:13px}
.client{margin:28px 0;padding:18px 20px;border:1px solid #d4d4d8;border-left:5px solid #f97316}
.client h2{margin:0 0 12px;font-size:14px;text-transform:uppercase;color:#71717a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;font-size:14px}.address{grid-column:1/-1}
table{width:100%;border-collapse:collapse}th{padding:12px 14px;color:#fff;background:#27272a;text-align:left;font-size:13px;text-transform:uppercase}
td{padding:14px;border-bottom:1px solid #e4e4e7;font-size:14px}.price{width:190px;text-align:right;white-space:nowrap}
.total{display:flex;justify-content:flex-end;margin-top:22px}.summary{min-width:300px;padding:16px 18px;color:#fff;background:#27272a}.summary p{display:flex;justify-content:space-between;margin:5px 0;font-size:14px}.summary .net{padding-top:9px;border-top:1px solid #52525b;font-size:19px;font-weight:700}
footer{margin-top:70px;padding-top:18px;border-top:1px solid #d4d4d8;color:#71717a;font-size:11px;text-align:center}
@page{size:A4;margin:0}@media print{.page{max-width:none;min-height:auto}}
</style></head><body><main class="page">
<header><img class="logo" src="${logo}" alt="TS Network"><div><h1>Cotización</h1><div class="number">N.º ${numero}</div><div class="meta">Emisión: ${new Date().toLocaleDateString("es-AR")}</div><div class="meta">Visita: ${visita}</div></div></header>
<section class="client"><h2>Datos del cliente</h2><div class="grid"><div><strong>Cliente:</strong> ${escape(clienteCotizacion?.nombre) || "-"}</div><div><strong>Teléfono:</strong> ${escape(clienteCotizacion?.telefono) || "-"}</div><div><strong>Email:</strong> ${escape(clienteCotizacion?.email) || "-"}</div><div class="address"><strong>Domicilio:</strong> ${escape(clienteCotizacion?.direccion) || "-"}</div></div></section>
<table><thead><tr><th>Artículos incluidos</th></tr></thead><tbody>${filas}</tbody></table>
<div class="total"><div class="summary"><p><span>Subtotal</span><span>${money(Number(subtotalGeneral))}</span></p><p><span>Descuento</span><span>-${money(descuento)}</span></p><p class="net"><span>Total</span><span>${money(Number(totalGeneral))}</span></p></div></div>
<footer>Documento de cotización comercial. Precios y disponibilidad sujetos a confirmación.</footer>
</main><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350));<\/script></body></html>`);
    ventana.document.close();
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
              {modo === "editar" && idCotizacion && (
                <>
                  <button type="button" onClick={cargarHistorial} disabled={cargandoHistorial} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"><History className="h-4 w-4" />{cargandoHistorial ? "Cargando..." : "Historial"}</button>
                  <button type="button" onClick={exportarPdf} className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20"><FileDown className="h-4 w-4" /> Exportar a PDF</button>
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
              <button type="button" onClick={() => setMostrarHistorial(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white" title="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[calc(85vh-4rem)] space-y-3 overflow-y-auto p-4">
              {versiones.length === 0 ? <p className="text-sm text-white/50">Todavía no hay versiones registradas.</p> : versiones.map((version) => (
                <details key={version.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-orange-300">Versión {version.version}</strong><p className="text-xs text-white/50">{version.creado_en} · {version.creado_por}</p></div><div className="text-right text-sm"><p className="text-white/50">Descuento: ${Number(version.descuento).toFixed(2)}</p><strong className="text-white">Total: ${Number(version.total).toFixed(2)}</strong></div></div>
                  </summary>
                  <div className="mt-3 divide-y divide-white/10 border-t border-white/10 pt-2">{version.productos.map((producto, index) => <div key={`${version.id}-${producto.producto_id ?? index}`} className="flex justify-between gap-3 py-2 text-sm"><span className="text-white/80">{producto.nombre_producto}</span><span className="shrink-0 text-white/50">Cant. {producto.cantidad}</span></div>)}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
