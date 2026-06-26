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
  tiene_hoja: number;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center gap-2">
            <Pencil className="text-white h-4 w-4" />
            <h2 className="text-lg font-bold text-white">Editar cita</h2>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-white/60">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 uppercase"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Dirección</label>
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40 uppercase"
            />
          </div>

            <div>
                <label className="text-xs text-white/60">Notas</label>
                <textarea
                name="notas"
                value={form.notas || ""}
                onChange={handleChange}
                rows={12}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                />
            </div>

            <div className="flex justify-between">

                <div>
                    <label className="text-xs text-white/60">Fecha</label>
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
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                        wrapperClassName="w-full"
                        calendarClassName="agenda-datepicker"
                    />
                </div>

                <div className="flex items-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={guardarCambios}
                        className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
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
