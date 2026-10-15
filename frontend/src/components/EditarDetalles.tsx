import { useState, useEffect } from "react";
import Loading from "./Loading";

type Props = {
  idCita: string;
  onClose: () => void;
};

type Detalle = {
  pregunta: string;
  respuesta: string;
};

export default function EditarDetalles({ idCita, onClose }: Props) {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";

  const preguntasPorTipo: Record<string, string[]> = {
    camarasdesdecero: ["lugar", "audio", "monitor", "area", "atico", "estructura"],

    "camaras-tiene-nuevo-instalacion": ["atico", "cableado"],

    "camaras-tiene-existente-instalacion": ["atico", "cableado"],
  };

  const opcionesPorPregunta: Record<string, string[]> = {
    lugar: ["casa", "negocio", "traila", "foodtruck", "apartamento"],
    audio: ["si", "no"],
    monitor: ["si", "no"],
    area: ["interior", "exterior"],
    atico: ["espacioso", "espuma", "no tiene"],
    estructura: ["movil", "standard", "casona"],
    cableado: ["red", "coaxial", "no tiene"],
  };

  const [tipo, setTipo] = useState<string>("");
  const [respuestasEditadas, setRespuestasEditadas] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  const fetchDetalles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fetch-detalles/${idCita}`);

      if (!res.ok) {
        console.error("Error al traer detalles:", res.status);
        return;
      }

      const data = await res.json();

      setTipo(data.tipo);

      const respuestasIniciales: Record<string, string> = {};

      data.detalles.forEach((item: Detalle) => {
        respuestasIniciales[item.pregunta] = item.respuesta;
      });

      setRespuestasEditadas(respuestasIniciales);
      setLoading(false);
    } catch (error) {
      console.error("Error al traer detalles:", error);
    }
  };

  useEffect(() => {
      fetchDetalles();
  }, [idCita]);

  const handleSeleccionarRespuesta = (pregunta: string, opcion: string) => {
    setRespuestasEditadas((prev) => ({
      ...prev,
      [pregunta]: prev[pregunta] === opcion ? "" : opcion,
    }));
  };

    const guardarCambios = async () => {
    try {
        const res = await fetch(`${API_URL}/api/actualizar-detalles/${idCita}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            respuestas: respuestasEditadas,
        }),
        });

        const data = await res.json();

        if (res.ok) {
        console.log("Detalles actualizados:", data);
        onClose();
        } else {
        console.error("Error al actualizar detalles:", data);
        }
    } catch (error) {
        console.error("Error de conexión actualizando detalles:", error);
    }
    };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      {loading ? (
        <Loading />
      ) : (
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[90dvh]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-1)]">
              Editar detalles de la cita
            </h3>
            <p className="text-xs text-[var(--text-3)]">
              Marca o desmarca las opciones correspondientes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-5">
            {(preguntasPorTipo[tipo] || []).map((pregunta) => (
              <div
                key={pregunta}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
              >
                <div className="mb-3 text-xs font-bold tracking-wide text-[var(--text-3)] capitalize">
                  {pregunta}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(opcionesPorPregunta[pregunta] || []).map((opcion) => {
                    const activo = respuestasEditadas[pregunta] === opcion;

                    return (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => handleSeleccionarRespuesta(pregunta, opcion)}
                        className={`capitalize rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                          activo
                            ? "border-orange-500 bg-orange-600 text-white"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-3)] hover:border-orange-500/40"
                        }`}
                      >
                        {opcion}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--surface-raised)]"
          >
            Cancelar
          </button>

          <button
            onClick={guardarCambios}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700"
          >
            Guardar cambios
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
