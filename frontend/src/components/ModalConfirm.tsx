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
    <div className="modal-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirm-title"
        aria-describedby="modal-confirm-description"
        className="modal w-full max-w-md"
      >
        <div className="flex items-start gap-4 border-b border-[var(--border)] p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] ring-1 ring-[var(--primary-border)]">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 id="modal-confirm-title" className="mb-0 text-lg font-bold leading-6 text-[var(--text-1)]">
              {message}
            </h1>
            <p
              id="modal-confirm-description"
              className="mt-2 text-sm leading-6 text-[var(--text-2)]"
            >
              {descripcion}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary"
          >
            <Check className="h-4 w-4" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
