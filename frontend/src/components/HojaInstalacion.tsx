import { useEffect, useState } from "react";
import {
  CheckCircle,
  Download,
  FileText,
  PackageSearch,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import FirmaModal from "./FirmaModal";

interface ClienteInstalacionInfo {
  nombre: string;
  direccion: string;
  telefono: string;
}

interface HojaInstalacionProps {
  idCita: number;
  idHoja: number;
  cliente?: ClienteInstalacionInfo | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Producto {
  id: number;
  descrip: string;
  stock: number;
  precio: number;
}

interface InstalacionItem {
  producto_id: number;
  producto_descrip: string;
  producto_stock: number;
  cantidad: number;
  detalle: string;
  precioFinal: number;
}

export default function HojaInstalacion({
  idCita,
  idHoja,
  cliente,
  onClose,
  onSaved,
}: HojaInstalacionProps) {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [items, setItems] = useState<InstalacionItem[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<number | "">("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [detalle, setDetalle] = useState<string>("");
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [firmaFotoUrl, setFirmaFotoUrl] = useState<string | null>(null);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [showFotoModal, setShowFotoModal] = useState(false);
  const [cargadoDeInspeccion, setCargadoDeInspeccion] = useState(false);

  const bloqueada = Boolean(firmaUrl);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [resProductos, resCotizacion] = await Promise.all([
          fetch(`${API_URL}/api/productos`),
          fetch(`${API_URL}/api/cotizacion/${idHoja}`),
        ]);

        if (resProductos.ok) {
          const dataProductos = await resProductos.json();
          setProductos(dataProductos);
        }

        if (resCotizacion.ok) {
          const dataCotizacion = await resCotizacion.json();
          const productosInstalacion = Array.isArray(dataCotizacion.productos)
            ? dataCotizacion.productos
            : [];

          if (dataCotizacion.firma_instalacion) {
            setFirmaUrl(API_URL + dataCotizacion.firma_instalacion);
          }
          if (dataCotizacion.firma_foto_instalacion) {
            setFirmaFotoUrl(API_URL + dataCotizacion.firma_foto_instalacion);
          } else {
            setFirmaFotoUrl(null);
          }

          if (productosInstalacion.length > 0) {
            setItems(
              productosInstalacion.map((p: any) => ({
                producto_id: Number(p.id),
                producto_descrip: p.descrip,
                producto_stock: 0,
                cantidad: Math.ceil(Number(p.cantidad || 0)) || 1,
                detalle: p.detalle || "",
                precioFinal: Number(p.precioFinal || 0),
              })),
            );
          } else if (
            Array.isArray(dataCotizacion.inspeccion_items) &&
            dataCotizacion.inspeccion_items.length > 0
          ) {
            setItems(
              dataCotizacion.inspeccion_items.map((p: any) => ({
                producto_id: Number(p.producto_id),
                producto_descrip: p.producto_descrip,
                producto_stock: Number(p.producto_stock || 0),
                cantidad: Math.ceil(Number(p.cantidad || 0)) || 1,
                detalle: p.detalle || "",
                precioFinal: Number(p.producto_precio || 0),
              })),
            );
            setCargadoDeInspeccion(true);
          }
        }
      } catch (error) {
        console.error("Error al cargar hoja de instalacion:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idHoja]);

  const handleAddItem = () => {
    if (!selectedProducto || cantidad <= 0 || bloqueada) return;

    const producto = productos.find((p) => p.id === Number(selectedProducto));
    if (!producto) return;

    const existingIndex = items.findIndex((item) => item.producto_id === producto.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        cantidad: newItems[existingIndex].cantidad + cantidad,
        detalle: detalle
          ? newItems[existingIndex].detalle
            ? `${newItems[existingIndex].detalle} | ${detalle}`
            : detalle
          : newItems[existingIndex].detalle,
      };
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
          precioFinal: producto.precio || 0,
        },
      ]);
    }

    setCargadoDeInspeccion(false);
    setSelectedProducto("");
    setCantidad(1);
    setDetalle("");
  };

  const handleRemoveItem = (index: number) => {
    if (bloqueada) return;

    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    setCargadoDeInspeccion(false);
  };

  const handleUpdateItem = (
    index: number,
    updates: Partial<Pick<InstalacionItem, "cantidad" | "detalle">>,
  ) => {
    if (bloqueada) return;

    setItems((current) =>
      current.map((item, idx) =>
        idx === index
          ? {
              ...item,
              ...updates,
              cantidad:
                updates.cantidad !== undefined
                  ? Math.max(1, Math.floor(updates.cantidad || 1))
                  : item.cantidad,
            }
          : item,
      ),
    );
    setCargadoDeInspeccion(false);
  };

  const buildFormData = (firmaBlob?: Blob, fotoFile?: File) => {
    const formData = new FormData();
    formData.append(
      "items",
      JSON.stringify(
        items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          detalle: item.detalle,
          precioFinal: item.precioFinal,
        })),
      ),
    );

    if (firmaBlob) {
      formData.append("firma", new File([firmaBlob], "firma.png", { type: "image/png" }));
    }
    if (fotoFile) {
      formData.append("firma_foto", fotoFile);
    }

    return formData;
  };

  const parseError = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && Array.isArray(data.productos)) {
      const detalleStock = data.productos
        .map((p: any) => `${p.descrip}: stock ${p.stock}, requerido ${p.cantidad}`)
        .join("\n");
      return `${data.error || "Stock insuficiente"}\n\n${detalleStock}`;
    }
    return data.error || "No se pudo guardar la hoja de instalacion";
  };

  const handleGuardarCambios = async () => {
    if (bloqueada) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/cotizaciones/${idHoja}/firma-instalacion`, {
        method: "POST",
        body: buildFormData(),
      });

      if (res.ok) {
        onSaved();
        alert("Cambios guardados correctamente");
      } else {
        alert(await parseError(res));
      }
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      alert("Error de conexion al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithFirma = async (firmaBlob: Blob, fotoFile?: File) => {
    setShowFirmaModal(false);
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/cotizaciones/${idHoja}/firma-instalacion`, {
        method: "POST",
        body: buildFormData(firmaBlob, fotoFile),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        alert(await parseError(res));
      }
    } catch (error) {
      console.error("Error al guardar firma:", error);
      alert("Error de conexion al guardar la firma");
    } finally {
      setSaving(false);
    }
  };

  const puedeDescargarPdf = Boolean(firmaUrl && items.length > 0);

  const escapePdfHtml = (value: string | number) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const handleDownloadPdf = () => {
    if (!firmaUrl || items.length === 0) {
      alert("Para descargar el PDF, la hoja debe tener productos y firma guardados.");
      return;
    }

    const firmaPdfUrl = firmaUrl;
    const firmaFotoPdfUrl = firmaFotoUrl;

    const rows = items
      .map(
        (item, index) =>
          `<tr>` +
          `<td class="idx">${escapePdfHtml(index + 1)}</td>` +
          `<td class="product">${escapePdfHtml(item.producto_descrip)}${
            item.detalle ? `<div class="detail">${escapePdfHtml(item.detalle)}</div>` : ""
          }</td>` +
          `<td class="qty">${escapePdfHtml(item.cantidad)}</td>` +
          `</tr>`,
      )
      .join("");

    const clientePdf = {
      nombre: cliente?.nombre?.trim() || "No disponible",
      direccion: cliente?.direccion?.trim() || "No disponible",
      telefono: cliente?.telefono?.trim() || "No disponible",
    };

    const logoUrl = new URL("/logo_tsnetwork.png", window.location.origin).href;
    const fechaEmision = new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (printWindow === null) {
      alert("No se pudo abrir la ventana para generar el PDF.");
      return;
    }

    const html = `
      <html>
        <head>
          <title>Hoja de Instalaci&oacute;n ${escapePdfHtml(idCita)}</title>
          <style>
            @page { size: letter; margin: 14mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
              font-size: 12px;
              line-height: 1.35;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #111827;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo { width: 128px; max-height: 56px; object-fit: contain; }
            .doc-meta { text-align: right; color: #4b5563; font-size: 11px; }
            .doc-meta strong {
              display: block;
              color: #111827;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            h1 {
              font-size: 24px;
              line-height: 1.05;
              margin: 0 0 14px;
              text-transform: uppercase;
              letter-spacing: .05em;
            }
            h2 {
              font-size: 13px;
              margin: 0 0 10px;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            .client-card {
              display: grid;
              grid-template-columns: 1.2fr 1.5fr .8fr;
              gap: 12px;
              margin: 0 0 20px;
              border: 1px solid #d1d5db;
              border-left: 5px solid #22c55e;
              background: #f9fafb;
              padding: 14px;
            }
            .client-field span {
              display: block;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .08em;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .client-field strong {
              display: block;
              font-size: 13px;
              overflow-wrap: anywhere;
            }
            .section { margin-top: 18px; break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; }
            thead { display: table-header-group; }
            tr { break-inside: avoid; }
            th {
              background: #111827;
              color: #ffffff;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .08em;
              padding: 9px 10px;
              text-align: left;
            }
            td { border-top: 1px solid #e5e7eb; padding: 9px 10px; vertical-align: top; }
            tbody tr:nth-child(even) { background: #f9fafb; }
            .idx { width: 42px; text-align: center; color: #6b7280; }
            .qty { width: 110px; text-align: center; font-weight: 800; }
            .product { font-weight: 700; }
            .detail { margin-top: 4px; color: #6b7280; font-size: 11px; font-weight: 400; }
            .warranty-box {
              border: 2px solid #f97316;
              background-color: #fff7ed;
              padding: 16px;
              border-radius: 8px;
              margin-top: 25px;
              font-size: 11px;
              line-height: 1.5;
              break-inside: avoid;
            }
            .warranty-box h3 {
              color: #c2410c;
              margin: 0 0 10px 0;
              font-size: 13px;
              text-transform: uppercase;
              font-weight: 800;
              text-align: center;
              letter-spacing: 0.05em;
              border-bottom: 1px solid #fdba74;
              padding-bottom: 8px;
            }
            .final-signature {
              margin-top: 28px;
              padding-top: 18px;
              border-top: 1px solid #d1d5db;
              break-inside: avoid;
            }
            .signature-layout {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 18px;
              align-items: end;
            }
            .signature-box { text-align: center; min-width: 0; }
            .signature-box img.signature-img {
              display: block;
              width: 260px;
              max-height: 82px;
              object-fit: contain;
              margin: 0 auto 6px;
            }
            .signature-box img.client-photo {
              display: block;
              width: 150px;
              height: 150px;
              object-fit: cover;
              border: 1px solid #d1d5db;
              margin: 0 auto 8px;
              background: #ffffff;
            }
            .signature-line {
              border-top: 1px solid #111827;
              padding-top: 4px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .08em;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <main>
            <header class="header">
              <div class="brand">
                <img class="logo" src="${escapePdfHtml(logoUrl)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                <div class="brand-fallback" style="display:none;font-size:18px;font-weight:900;">TS Network</div>
              </div>
              <div class="doc-meta">
                <strong>Hoja de Instalaci&oacute;n</strong>
                Cita #${escapePdfHtml(idCita)}<br/>
                Fecha: ${fechaEmision}
              </div>
            </header>

            <h1>Hoja de Instalaci&oacute;n</h1>
            <section class="client-card">
              <div class="client-field">
                <span>Cliente</span>
                <strong>${escapePdfHtml(clientePdf.nombre)}</strong>
              </div>
              <div class="client-field">
                <span>Direcci&oacute;n</span>
                <strong>${escapePdfHtml(clientePdf.direccion)}</strong>
              </div>
              <div class="client-field">
                <span>Tel&eacute;fono</span>
                <strong>${escapePdfHtml(clientePdf.telefono)}</strong>
              </div>
            </section>

            <section class="section">
              <h2>Equipos Instalados</h2>
              <table>
                <thead>
                  <tr>
                    <th class="idx">#</th>
                    <th>Equipo</th>
                    <th class="qty">Cantidad</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </section>

            <section class="warranty-box">
              <h3>Aviso Importante y Garant&iacute;a</h3>
              <p style="margin-top:0;margin-bottom:12px;text-align:center;font-size:12px;">
                <strong style="color:#b91c1c;text-transform:uppercase;">En caso de que el cliente no cumpla con los pagos tenemos derecho a retirar los equipos instalados.</strong>
              </p>
              <strong>T&eacute;rminos de Garant&iacute;a:</strong>
              <ul style="margin:5px 0 0 0;padding-left:20px;">
                <li>La garant&iacute;a <strong>NO CUBRE</strong>: Equipos con golpes o da&ntilde;os f&iacute;sicos. Cables da&ntilde;ados por causas externas. Fallas provocadas por variaciones o subidas de tensi&oacute;n el&eacute;ctrica.</li>
                <li><strong>Importante:</strong> Si el cliente modifica la contrase&ntilde;a del equipo, no nos responsabilizamos por su recuperaci&oacute;n.</li>
                <li><strong>Garant&iacute;a por 6 meses</strong> (falla solo por problema de equipo).</li>
              </ul>
              <p style="margin:12px 0 0;color:#b91c1c;font-size:11px;">
                <strong>Nota:</strong> En caso de retraso en el pago de la cuota, el valor aumentar&aacute; en <u>1% por d&iacute;a</u> de retraso.
              </p>
            </section>

            <section class="final-signature">
              <h2>Firma de conformidad</h2>
              <div class="signature-layout">
                <div class="signature-box">
                  <img class="signature-img" src="${escapePdfHtml(firmaPdfUrl)}" />
                  <div class="signature-line">Firma del cliente</div>
                </div>
                ${firmaFotoPdfUrl ? `
                <div class="signature-box">
                  <img class="client-photo" src="${escapePdfHtml(firmaFotoPdfUrl)}" />
                  <div class="signature-line">Foto del cliente</div>
                </div>` : ''}
              </div>
              ${firmaFotoPdfUrl ? '<p style="margin:12px 0 0;text-align:right;color:#6b7280;font-size:10px;">Este documento incluye una foto del cliente como constancia de firma.</p>' : ''}
            </section>
          </main>
          <script>setTimeout(function(){window.focus();window.print();},600);</script>
        </body>
      </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const fotoClienteDownloadName = `foto_cliente_cotizacion_${idHoja}.jpg`;

  return (
    <>
      {showFirmaModal && (
        <FirmaModal
          onConfirm={handleSaveWithFirma}
          onCancel={() => setShowFirmaModal(false)}
          showLeyenda={true}
          requirePhoto={false}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[95dvh]">
          <div className="bg-zinc-800 px-4 py-3 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-green-500/20 p-1.5 rounded-lg border border-green-500/30 shrink-0">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  Hoja de Instalacion
                </h2>
                <p className="text-xs text-white/50">
                  {bloqueada ? "Firmada y bloqueada" : "Materiales y firma"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {!bloqueada && (
                <div className="p-4 border-b border-white/10 bg-zinc-950/40 flex flex-col gap-3 shrink-0">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    Agregar material
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1">
                      Producto
                    </label>
                    <select
                      value={selectedProducto}
                      onChange={(e) =>
                        setSelectedProducto(e.target.value ? Number(e.target.value) : "")
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50">
                      <option value="">Selecciona un producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.descrip} - Stock: {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>
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
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50 text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-white/60 mb-1">
                        Detalle
                      </label>
                      <input
                        type="text"
                        value={detalle}
                        maxLength={255}
                        onChange={(e) => setDetalle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                        placeholder="Color, largo, ubicacion, etc."
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50"
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
              )}

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
                      {cargadoDeInspeccion && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                          <FileText className="w-3 h-3" />
                          Pre-cargado desde inspeccion
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                      {items.map((item, index) => (
                        <div
                          key={`${item.producto_id}-${index}`}
                          className="grid grid-cols-[88px_1fr_auto] gap-3 bg-zinc-800/60 border border-white/8 rounded-xl p-3 shrink-0">
                          <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                              Cant.
                            </label>
                            {bloqueada ? (
                              <div className="bg-green-500/15 border border-green-500/30 rounded-lg px-2 py-2 text-center text-green-300 font-bold text-sm">
                                {item.cantidad}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) =>
                                  handleUpdateItem(index, { cantidad: Number(e.target.value) })
                                }
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-green-500/50"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm leading-tight mb-2">
                              {item.producto_descrip}
                            </p>
                            {bloqueada ? (
                              item.detalle && (
                                <p className="text-white/50 text-xs italic">{item.detalle}</p>
                              )
                            ) : (
                              <input
                                type="text"
                                value={item.detalle}
                                maxLength={255}
                                onChange={(e) =>
                                  handleUpdateItem(index, { detalle: e.target.value })
                                }
                                placeholder="Detalle"
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500/50"
                              />
                            )}
                          </div>

                          {!bloqueada && (
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="self-start shrink-0 p-2 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-colors"
                              title="Eliminar material">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {firmaUrl && (
            <div className="bg-zinc-900 px-4 py-2 border-t border-white/10 flex items-center justify-center gap-4 shrink-0">
              <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
                Firma guardada
              </span>
              <img
                src={firmaUrl}
                alt="Firma del cliente"
                className="max-h-12 bg-white/5 rounded p-1"
              />
              {firmaFotoUrl && (
                <>
                  <img
                    src={firmaFotoUrl}
                    alt="Foto del cliente"
                    className="h-12 w-12 object-cover bg-white/5 rounded p-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowFotoModal(true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFotoModal(true)}
                    className="ml-2 text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
                  >
                    Ver foto
                  </button>
                  {showFotoModal && (
                    <div 
                      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Foto del cliente"
                      onClick={() => setShowFotoModal(false)}
                    >
                      <div className="relative w-full max-w-4xl max-h-screen p-4 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-4 right-4 flex gap-2">
                          <a 
                            href={firmaFotoUrl} 
                            download={fotoClienteDownloadName}
                            className="bg-zinc-800/80 hover:bg-zinc-700 p-2 rounded-full text-white backdrop-blur-sm transition-colors"
                            title="Descargar foto"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                          <button 
                            onClick={() => setShowFotoModal(false)}
                            className="bg-zinc-800/80 hover:bg-zinc-700 p-2 rounded-full text-white backdrop-blur-sm transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <img 
                          src={firmaFotoUrl} 
                          alt="Foto del cliente (Pantalla completa)" 
                          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" 
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="bg-zinc-800 px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
              Cerrar
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={loading || !puedeDescargarPdf}
              title={puedeDescargarPdf ? "Descargar PDF" : "Requiere productos, firma y foto"}
              className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              PDF
            </button>
            {!bloqueada && (
              <>
                <button
                  onClick={handleGuardarCambios}
                  disabled={saving || loading}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </button>
                <button
                  onClick={() => setShowFirmaModal(true)}
                  disabled={saving || loading || items.length === 0}
                  className="flex-1 bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20">
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Firma Cliente
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
