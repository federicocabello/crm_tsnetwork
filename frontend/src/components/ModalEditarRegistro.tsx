import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { agendaDayClassName, dateKeyToDate, formatDateKey, isSelectableAgendaDate, isSundayKey } from "../utils/agendaFechas";

type AgendaItem = {
  idcita: string;
  idcliente: number;
  nombre: string;
  dia: string;
  hora: string;
  hora_format: string;
  notas: string;
  idagente: number;
  fullname: string;
  tipo: string;
  idestado: string;
  estado: string;
  color: string;
  telefono: string;
  direccion: string;
  idhoja: string;
  tipo_hoja?: string;
  tiene_hoja: number;
  idinspeccion: string;
  tiene_inspeccion: number;
  detalles: boolean;
  preguntas?: { pregunta: string; respuesta: string }[];
  mostrarImagenes: boolean;
};

type EditAgendaModalProps = {
  open: boolean;
  item: AgendaItem | null;
  onClose: () => void;
  onSave: (data: AgendaItem) => Promise<void>;
};

export default function EditAgendaModal({
  open,
  item,
  onClose,
  onSave,
}: EditAgendaModalProps) {
  const [form, setForm] = useState<AgendaItem | null>(item);

    useEffect(() => {
        setForm(item);
    }, [item]);

    if (!open || !form) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        setForm((prev) =>
        prev
            ? {
                ...prev,
                [name]: value,
            }
            : prev
        );
    };

    const guardarCambios = () => {
        if (isSundayKey(form.dia)) {
            alert("No se pueden reprogramar citas los domingos.");
            return;
        }

        onSave(form);
    };

  return (
    <div className="modal-overlay overflow-y-auto">
      <div className="modal my-auto w-full max-w-lg p-5">
        <div className="mb-4 flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="mb-0 text-lg font-bold text-[var(--text-1)]">Editar cita</h2>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-[var(--text-3)]">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] uppercase"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-3)]">Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-3)]">Dirección</label>
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] uppercase"
            />
          </div>

            <div>
                <label className="text-xs text-[var(--text-3)]">Notas</label>
                <textarea
                name="notas"
                value={form.notas || ""}
                onChange={handleChange}
                rows={6}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)]"
                />
            </div>

            <div className="flex flex-col justify-between gap-3 sm:flex-row">

                <div>
                    <label className="text-xs text-[var(--text-3)]">Fecha</label>
                    <DatePicker
                        selected={dateKeyToDate(form.dia)}
                        onChange={(date: Date | null) => {
                            setForm((prev) =>
                                prev
                                    ? {
                                        ...prev,
                                        dia: date ? formatDateKey(date) : "",
                                    }
                                    : prev
                            );
                        }}
                        filterDate={isSelectableAgendaDate}
                        dayClassName={agendaDayClassName}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="Seleccionar fecha"
                        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)]"
                        wrapperClassName="w-full"
                        calendarClassName="agenda-datepicker"
                    />
                </div>

                <div className="flex items-end gap-2">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={guardarCambios}
                        className="btn-primary"
                    >
                        Guardar cambios
                    </button>
                </div>

            </div>
          
        </div>

        
      </div>
    </div>
  );
}
