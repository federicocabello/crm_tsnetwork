import { useRef, useState, useEffect } from "react";
import { Camera, Check, PenLine, RotateCcw, X } from "lucide-react";

interface FirmaModalProps {
  onConfirm: (firmaBlob: Blob, fotoFile?: File) => void;
  onCancel: () => void;
  showLeyenda?: boolean;
  requirePhoto?: boolean;
}

export default function FirmaModal({
  onConfirm,
  onCancel,
  showLeyenda = false,
  requirePhoto = false,
}: FirmaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasFirma, setHasFirma] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  // Auto‑open file picker (front camera) when the user wants to add a photo
  useEffect(() => {
    if (showPhoto && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [showPhoto]);
  const showLeyendaState = showLeyenda;

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

            {showLeyendaState && (
              <div className="border-2 border-orange-400 bg-orange-50 rounded-xl p-3">
                <h3 className="text-orange-700 font-black text-xs uppercase text-center mb-2 tracking-wider border-b border-orange-200 pb-2">
                  Aviso Importante y Garantía
                </h3>
                <p className="text-red-600 font-bold text-center text-xs uppercase mb-3">
                  EN CASO DE INCUMPLIMIENTO DEL PLAN DE PAGOS, LA EMPRESA SE
                  RESERVA EL DERECHO DE RETIRAR LOS EQUIPOS INSTALADOS.
                </p>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-800 block mb-1">
                    Términos de Garantía:
                  </strong>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      La garantía <strong>NO CUBRE</strong>: Equipos con golpes
                      o daños físicos. Cables dañados por causas externas.
                      Fallas provocadas por variaciones o subidas de tensión
                      eléctrica.
                    </li>
                    <li>
                      <strong>Garantía por 6 meses</strong> (falla solo por
                      problema de equipo).
                    </li>
                  </ul>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-800 block mb-1">
                    Términos de Pago:
                  </strong>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      Cuando exista un plan de pagos, se generará un usuario y
                      contraseña provisional. Una vez finalizado el plan de
                      pagos, el acceso se establecerá como principal.
                    </li>

                    <li>
                      Si el cliente no completa el plan de pagos dentro del
                      plazo establecido, la empresa podrá proceder con la{" "}
                      <strong className="text-slate-800">
                        desinstalación y recuperación del equipo suministrado
                      </strong>
                      . Como consecuencia del incumplimiento, se aplicará un{" "}
                      <strong className="text-slate-800">
                        cargo de US$1,000
                      </strong>{" "}
                      por concepto de desinstalación, recuperación del equipo y
                      gastos administrativos.
                    </li>

                    <li>
                      Ante la negativa del cliente a devolver el equipo o
                      cualquier impedimento para su recuperación, la empresa se
                      reserva el derecho de iniciar las{" "}
                      <strong className="text-slate-800">
                        acciones legales correspondientes
                      </strong>{" "}
                      para recuperar el equipo.
                    </li>
                  </ul>
                </div>
              </div>
            )}

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
              disabled={!hasFirma || (requirePhoto && !fotoFile)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30">
              <Check className="w-4 h-4" />
              Confirmar y Guardar
            </button>
          </div>
        </div>

        <style>{`\n          @keyframes fadeScaleIn {\n            from { opacity: 0; transform: scale(0.92); }\n            to   { opacity: 1; transform: scale(1); }\n          }\n        `}</style>
      </div>
    </div>
  );
}
