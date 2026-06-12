import { AlertTriangle, Check, X } from "lucide-react";

interface ModalConfirmProps {
  message: string;
  descripcion: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ModalConfirm({
  descripcion,
  message,
  onConfirm,
  onCancel,
}: ModalConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 text-white backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirm-title"
        aria-describedby="modal-confirm-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start gap-4 border-b border-white/10 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 id="modal-confirm-title" className="text-lg font-bold leading-6">
              {message}
            </h1>
            <p
              id="modal-confirm-description"
              className="mt-2 text-sm leading-6 text-white/65"
            >
              {descripcion}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300/40"
          >
            <Check className="h-4 w-4" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
