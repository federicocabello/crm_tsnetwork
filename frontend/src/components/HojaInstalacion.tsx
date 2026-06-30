import { useEffect, useState } from "react";
import { X, Save, Download, FileText, CheckCircle } from "lucide-react";
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

interface ProductoCotizado {
  id: number;
  descrip: string;
  cantidad: number;
  precioFinal: number;
}

export default function HojaInstalacion({
  idCita,
  idHoja,
  cliente,
  onClose,
  onSaved,
}: HojaInstalacionProps) {
  const API_URL = "http://localhost:5000";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ProductoCotizado[]>([]);
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [showFirmaModal, setShowFirmaModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resCotizacion = await fetch(`${API_URL}/api/cotizacion/${idHoja}`);
        if (resCotizacion.ok) {
          const dataCotizacion = await resCotizacion.json();
          if (dataCotizacion.productos) {
            setItems(dataCotizacion.productos);
          }
          if (dataCotizacion.firma_instalacion) {
            setFirmaUrl(API_URL + dataCotizacion.firma_instalacion);
          }
        }
      } catch (error) {
        console.error("Error al cargar cotización:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idHoja, API_URL]);

  const handleSave = () => {
    setShowFirmaModal(true);
  };

  const handleSaveWithFirma = async (firmaBlob: Blob) => {
    setShowFirmaModal(false);
    setSaving(true);
    try {
      const formData = new FormData();
      const firmaFile = new File([firmaBlob], "firma.png", { type: "image/png" });
      formData.append("firma", firmaFile);

      const res = await fetch(`${API_URL}/api/cotizaciones/${idHoja}/firma-instalacion`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar la firma de instalación");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error de conexión al guardar la firma");
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
      alert("Para descargar el PDF, la hoja debe tener productos y la firma del cliente guardada.");
      return;
    }

    const rows = items
      .map(
        (item, index) =>
          `<tr>` +
          `<td class="idx">${escapePdfHtml(index + 1)}</td>` +
          `<td class="product">${escapePdfHtml(item.descrip)}</td>` +
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
    const fechaEmision = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

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
            .page { position: relative; min-height: 100vh; }
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
              color: #111827;
            }
            h2 {
              font-size: 13px;
              margin: 0 0 10px;
              text-transform: uppercase;
              letter-spacing: .08em;
              color: #111827;
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
              color: #111827;
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
            .qty { width: 140px; text-align: center; font-weight: 800; color: #111827; }
            .product { font-weight: 700; color: #111827; }
            
            .warranty-box {
              border: 2px solid #f97316;
              background-color: #fff7ed;
              padding: 16px;
              border-radius: 8px;
              margin-top: 25px;
              color: #111827;
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
            .warranty-box .important-note {
              font-weight: bold;
              color: #ea580c;
            }
            .final-signature {
              margin-top: 28px;
              padding-top: 18px;
              border-top: 1px solid #d1d5db;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .signature-layout {
              display: flex;
              justify-content: flex-end;
            }
            .signature-box { text-align: center; min-width: 280px; }
            .signature-box img {
              display: block;
              width: 260px;
              max-height: 82px;
              object-fit: contain;
              margin: 0 auto 6px;
            }
            .signature-line {
              border-top: 1px solid #111827;
              padding-top: 4px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .08em;
              color: #374151;
            }
            .avoid-break { break-inside: avoid; }
          </style>
        </head>
        <body>
          <main class="page">
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
              <p style="margin-top: 0; margin-bottom: 12px; text-align: center; font-size: 12px;">
                <strong style="color: #b91c1c; text-transform: uppercase;">En caso de que el cliente no cumpla con los pagos tenemos derecho a retirar los equipos instalados.</strong>
              </p>
              <strong>T&eacute;rminos de Garant&iacute;a:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                <li>La garant&iacute;a <strong>NO CUBRE</strong>: Equipos con golpes o da&ntilde;os f&iacute;sicos. Cables da&ntilde;ados por causas externas. Fallas provocadas por variaciones o subidas de tensi&oacute;n el&eacute;ctrica.</li>
                <li><span class="important-note">Importante:</span> Si el cliente modifica la contrase&ntilde;a del equipo, no nos responsabilizamos por su recuperaci&oacute;n.</li>
                <li><strong>Garant&iacute;a por 6 meses</strong> (falla solo por problema de equipo).</li>
              </ul>
            </section>

            <section class="final-signature">
              <h2>Firma de conformidad</h2>
              <div class="signature-layout">
                <div class="signature-box">
                  <img src="${escapePdfHtml(firmaUrl)}" />
                  <div class="signature-line">Firma del cliente</div>
                </div>
              </div>
            </section>
          </main>
          <script>setTimeout(function(){window.focus();window.print();},600);</script>
        </body>
      </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <>
      {showFirmaModal && (
        <FirmaModal
          onConfirm={handleSaveWithFirma}
          onCancel={() => setShowFirmaModal(false)}
          showLeyenda={true}
        />
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh]">
          {/* Header */}
          <div className="bg-zinc-800 px-4 py-3 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-green-500/20 p-1.5 rounded-lg border border-green-500/30 shrink-0">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  Hoja de Instalación
                </h2>
                <p className="text-xs text-white/50">
                  Equipos instalados y garantía
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
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <>
                {/* Lista de equipos instalados */}
                <div className="bg-zinc-950/40 border border-white/10 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/80 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider">
                      Equipos Instalados
                    </p>
                    <span className="text-xs bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded-full border border-green-500/30">
                      Confirmado
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-white/40 text-sm">
                        No hay equipos registrados.
                      </div>
                    ) : (
                      items.map((item, idx) => (
                        <div key={item.id} className={"px-4 py-3 flex items-center justify-between " + (idx !== items.length - 1 ? "border-b border-white/5" : "")}>
                          <div className="flex items-center gap-3">
                            <span className="text-white/40 text-sm font-bold w-4">{idx + 1}.</span>
                            <span className="text-white text-sm font-semibold">{item.descrip}</span>
                          </div>
                          <div className="bg-white/10 px-2 py-0.5 rounded text-white text-xs font-bold">
                            Cant: {item.cantidad}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Leyenda y Garantia (Preview in UI) */}
                <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  <h3 className="text-orange-400 font-black text-sm uppercase text-center mb-2 tracking-wider">
                    Aviso Importante y Garantía
                  </h3>
                  <div className="text-red-400 font-bold text-center text-xs uppercase mb-4 px-4">
                    En caso de que el cliente no cumpla con los pagos tenemos derecho a retirar los equipos instalados.
                  </div>
                  
                  <div className="text-xs text-orange-200/80 leading-relaxed">
                    <strong className="text-orange-300 block mb-1">Términos de Garantía:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>La garantía <strong className="text-white">NO CUBRE</strong>: Equipos con golpes o daños físicos. Cables dañados por causas externas. Fallas provocadas por variaciones o subidas de tensión eléctrica.</li>
                      <li><strong className="text-orange-400">Importante:</strong> Si el cliente modifica la contraseña del equipo, no nos responsabilizamos por su recuperación.</li>
                      <li><strong className="text-white">Garantía por 6 meses</strong> (falla solo por problema de equipo).</li>
                    </ul>
                  </div>
                </div>

                {/* Status de Firma */}
                {firmaUrl && (
                  <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
                    <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-2">Firma Guardada</p>
                    <img src={firmaUrl} alt="Firma del cliente" className="max-h-20 bg-white/5 rounded p-2" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-zinc-800 px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
              Cerrar
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={loading || !puedeDescargarPdf}
              title={puedeDescargarPdf ? "Descargar PDF" : "Requiere firma guardada"}
              className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              PDF
            </button>
            {!firmaUrl && (
              <button
                onClick={handleSave}
                disabled={saving || loading || items.length === 0}
                className="flex-2 bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20">
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Firma Cliente
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
