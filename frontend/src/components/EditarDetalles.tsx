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
  const API_URL = import.meta.env.VITE_API_BASE_URL;

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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4">
      {loading ? (
        <Loading />
      ) : (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Editar detalles de la cita
            </h3>
            <p className="text-xs text-white/50">
              Marca o desmarca las opciones correspondientes.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-5">
            {(preguntasPorTipo[tipo] || []).map((pregunta) => (
              <div
                key={pregunta}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="mb-3 text-xs font-bold tracking-wide text-white/40 capitalize">
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
                            : "border-white/10 bg-zinc-900 text-white/60 hover:border-orange-500/40"
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

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10"
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