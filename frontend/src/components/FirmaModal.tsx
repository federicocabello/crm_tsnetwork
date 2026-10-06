import { useRef, useState, useEffect } from "react";
import { Camera, Check, PenLine, RotateCcw, X, ScrollText, ShieldCheck } from "lucide-react";

interface FirmaModalProps {
  onConfirm: (firmaBlob: Blob, fotoFile?: File) => void;
  onCancel: () => void;
  showLeyenda?: boolean;
  requirePhoto?: boolean;
}

export default function FirmaModal({
  onConfirm,
  onCancel,
  showLeyenda: _showLeyenda = false,
  requirePhoto = false,
}: FirmaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasFirma, setHasFirma] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showTerminosModal, setShowTerminosModal] = useState(false);

  // Auto‑open file picker (front camera) when the user wants to add a photo
  useEffect(() => {
    if (showPhoto && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [showPhoto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    };
  }, [fotoPreview]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasFirma(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.beginPath();
  };

  const clearFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasFirma(false);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("La foto debe ser una imagen.");
      e.target.value = "";
      return;
    }
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const clearFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirm = () => {
    if (!aceptaTerminos) {
      alert("Debe confirmar que el cliente acepta los términos y condiciones antes de continuar.");
      setShowTerminosModal(true);
      return;
    }
    if (requirePhoto && !fotoFile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob, fotoFile || undefined);
      },
      "image/png",
      0.95,
    );
  };

  return (
    <>
      {showTerminosModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowTerminosModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-800 px-5 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-orange-500/20 p-2 rounded-lg border border-orange-500/30 text-orange-400">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Términos y Condiciones
                  </h3>
                  <p className="text-xs text-white/50">
                    TS Network · Políticas, Garantía y Autorizaciones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTerminosModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-900">
                <h4 className="font-bold text-red-800 uppercase tracking-wide mb-1 text-xs">
                  Aviso Importante y Garantía
                </h4>
                <p className="font-bold text-red-700">
                  EN CASO DE INCUMPLIMIENTO DEL PLAN DE PAGOS, LA EMPRESA SE RESERVA EL DERECHO DE RETIRAR LOS EQUIPOS INSTALADOS.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-bold text-orange-700 text-xs uppercase tracking-wide">
                  Términos de Garantía:
                </h4>
                <p>
                  La garantía <strong>NO CUBRE</strong> equipos con golpes o daños físicos, cables dañados por causas externas ni fallas provocadas por variaciones, descargas o subidas de tensión eléctrica.
                </p>
                <p>
                  Los equipos cuentan con una <strong>garantía de 6 meses</strong>, aplicable únicamente a fallas atribuibles al propio equipo.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-bold text-orange-700 text-xs uppercase tracking-wide">
                  Términos de Pago:
                </h4>
                <p>
                  Cuando exista un plan de pagos, se generará un usuario y contraseña provisional. Una vez finalizado el plan de pagos, el acceso se establecerá como principal.
                </p>
                <p>
                  Si el cliente no completa el plan de pagos dentro del plazo establecido, la empresa podrá proceder con la desinstalación y recuperación del equipo suministrado. Como consecuencia del incumplimiento, se aplicará un cargo de <strong>US$1,000</strong> por concepto de desinstalación, recuperación del equipo y gastos administrativos.
                </p>
                <p>
                  Ante la negativa del cliente a devolver el equipo o cualquier impedimento para su recuperación, la empresa se reserva el derecho de iniciar las acciones legales correspondientes para recuperar el equipo.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-bold text-orange-700 text-xs uppercase tracking-wide">
                  Autorización para el Manejo de Información Personal e Identificación
                </h4>
                <p>
                  El cliente autoriza expresamente a TS Network a recopilar, almacenar y procesar la información personal proporcionada durante la contratación, instalación, mantenimiento, soporte y administración de los servicios contratados.
                </p>
                <p>
                  Como parte del proceso de verificación de identidad y documentación de la instalación, el cliente autoriza a TS Network a tomar y conservar una fotografía o copia de una identificación oficial vigente, incluyendo licencia de conducir, identificación estatal, pasaporte u otro documento válido presentado voluntariamente por el cliente.
                </p>
                <p>
                  La información y la copia de la identificación podrán ser almacenadas en los sistemas internos y CRM de TS Network y utilizadas exclusivamente para fines relacionados con:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  <li>Verificación de identidad del cliente.</li>
                  <li>Documentación y validación de la instalación o servicio realizado.</li>
                  <li>Administración de contratos, órdenes de trabajo y cuentas de clientes.</li>
                  <li>Facturación, pagos y cobranza.</li>
                  <li>Prevención de fraude y resolución de disputas.</li>
                  <li>Cumplimiento de obligaciones legales o regulatorias aplicables.</li>
                </ul>
                <p className="pt-1 text-slate-600">
                  TS Network se compromete a utilizar medidas razonables de seguridad para proteger esta información y limitar su acceso al personal autorizado.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-bold text-orange-700 text-xs uppercase tracking-wide">
                  Autorización de Contacto
                </h4>
                <p>
                  El cliente autoriza a TS Network a comunicarse con él utilizando el número telefónico, correo electrónico u otros medios de contacto proporcionados, incluyendo llamadas telefónicas, mensajes SMS, WhatsApp y correo electrónico, para asuntos relacionados con:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  <li>Instalaciones y citas.</li>
                  <li>Servicio técnico y soporte.</li>
                  <li>Facturación y recordatorios de pago.</li>
                  <li>Cobranza de saldos pendientes.</li>
                  <li>Renovaciones, mantenimiento y actualizaciones relacionadas con los servicios contratados.</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-bold text-orange-700 text-xs uppercase tracking-wide">
                  Consentimiento para Comunicaciones Promocionales
                </h4>
                <p>
                  Asimismo, el cliente autoriza a TS Network a enviarle ocasionalmente información sobre promociones, ofertas, nuevos productos y servicios mediante llamadas telefónicas, mensajes de texto, WhatsApp o correo electrónico.
                </p>
                <p>
                  El consentimiento para recibir comunicaciones promocionales no es una condición para comprar productos o contratar servicios con TS Network.
                </p>
                <p>
                  El cliente podrá solicitar en cualquier momento dejar de recibir comunicaciones promocionales respondiendo STOP, solicitándolo directamente a TS Network o utilizando cualquier otro mecanismo de cancelación proporcionado por la empresa. La cancelación de comunicaciones promocionales no impedirá que TS Network continúe enviando comunicaciones necesarias relacionadas con servicios contratados, facturación, cobranza, seguridad de la cuenta o asuntos administrativos.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 text-orange-900">
                <h4 className="font-bold text-orange-800 uppercase tracking-wide mb-1 text-xs">
                  Aceptación del Cliente
                </h4>
                <p>
                  Al firmar este documento, el cliente declara que ha leído, comprendido y acepta los términos anteriormente establecidos, incluyendo el manejo de su información personal, la conservación de su identificación para fines comerciales legítimos y las autorizaciones de contacto seleccionadas.
                </p>
              </div>
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowTerminosModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAceptaTerminos(true);
                  setShowTerminosModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                Aceptar Términos y Condiciones
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div
          className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md mx-2 overflow-hidden flex flex-col max-h-[95dvh]"
          style={{ animation: "fadeScaleIn 0.25s ease-out" }}>
          <div className="overflow-y-auto p-4 flex-1 overscroll-contain">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl border border-white/20">
                  <PenLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-tight">
                    Firma del Cliente
                  </h2>
                  <p className="text-white/60 text-xs mt-0.5">
                    Firme para confirmar los trabajos a realizar
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {requirePhoto && (
                <div className="border border-yellow-300 bg-yellow-50 rounded-xl p-3 text-yellow-900 text-xs leading-relaxed">
                  <strong>Importante:</strong> Al firmar, también se capturará una
                  foto del cliente con la cámara frontal o selector del
                  dispositivo para registrar la identidad en esta hoja de
                  instalación.
                </div>
              )}

              {/* Confirmación de Términos y Condiciones */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 bg-white text-orange-600 focus:ring-orange-500/20 cursor-pointer accent-orange-500 shrink-0"
                  />
                  <span className="leading-tight">
                    Confirmo que el cliente acepta los{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTerminosModal(true);
                      }}
                      className="text-orange-600 hover:text-orange-700 underline font-bold cursor-pointer inline"
                    >
                      términos y condiciones
                    </button>
                  </span>
                </label>
                {aceptaTerminos && (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                    <Check className="w-3 h-3" /> Aceptados
                  </span>
                )}
              </div>

              {!showPhoto && !requirePhoto && (
                <button
                  type="button"
                  onClick={() => setShowPhoto(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-dashed border-slate-300 hover:bg-slate-100 transition-colors">
                  <Camera className="w-4 h-4" />
                  Agregar foto (opcional)
                </button>
              )}

              {showPhoto && (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Foto del cliente
                  </p>
                  {fotoPreview ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={fotoPreview}
                        alt="Foto del cliente"
                        className="h-16 w-16 sm:h-24 sm:w-24 rounded-lg object-cover border border-slate-200 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 truncate mb-2">
                          {fotoFile?.name}
                        </p>
                        <button
                          type="button"
                          onClick={clearFoto}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Volver a tomar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-dashed border-slate-300 hover:bg-slate-100 transition-colors">
                      <Camera className="w-4 h-4" />
                      Tomar foto
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </div>
              )}

              <p className="text-slate-500 text-xs text-center font-medium">
                Firme con el dedo o el mouse en el area de abajo
              </p>
              <div className="relative">
                {/* Overlay for drawing instructions */}
                <div
                  className={`absolute inset-x-0 top-4 flex justify-center ${hasFirma ? "hidden" : ""}`}>
                  <div className="bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-2 shadow-md">
                    <PenLine className="w-5 h-5 text-gray-800" />
                    <span className="text-sm font-semibold text-gray-800">
                      Firme aquí
                    </span>
                  </div>
                </div>
                <div
                  className="relative overflow-hidden"
                  style={{ touchAction: "none" }}>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={220}
                    className="w-full h-44 cursor-crosshair block bg-slate-50 border rounded-lg"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-1 p-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={clearFirma}
                disabled={!hasFirma}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <RotateCcw className="w-4 h-4" />
                Limpiar
              </button>
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hasFirma || !aceptaTerminos || (requirePhoto && !fotoFile)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30">
                <Check className="w-4 h-4" />
                Confirmar y Guardar
              </button>
            </div>
          </div>

          <style>{`\n          @keyframes fadeScaleIn {\n            from { opacity: 0; transform: scale(0.92); }\n            to   { opacity: 1; transform: scale(1); }\n          }\n        `}</style>
        </div>
      </div>
    </>
  );
}
