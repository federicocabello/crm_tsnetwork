import React, { useState } from "react";
import { ChevronRight, CheckCircle2, AlertCircle, Wrench, ShieldAlert } from "lucide-react";

type Pregunta = {
  id: number;
  tipo: "multiple" | "texto";
  texto: string;
  opciones?: string[];
};

const CUESTIONARIO: Pregunta[] = [
  {
    id: 1,
    tipo: "multiple",
    texto: "¿Qué categoría de cable UTP se recomienda para una instalación de cámaras IP a 80 metros de distancia con buena velocidad y estabilidad?",
    opciones: [
      "Categoría 3",
      "Categoría 5e o Categoría 6 (Cobre 100%)",
      "Cable Coaxial RG59 de baja calidad",
      "Fibra óptica monomodo"
    ]
  },
  {
    id: 2,
    tipo: "multiple",
    texto: "¿Cuál es la función principal de un Switch PoE (Power over Ethernet) en una instalación de cámaras de seguridad?",
    opciones: [
      "Aumentar la velocidad de descarga de internet del cliente",
      "Transmitir datos y alimentar eléctricamente las cámaras IP a través del mismo cable de red",
      "Grabar y almacenar el video de seguridad en un disco duro interno",
      "Configurar y asignar de forma automática la dirección IP pública estática"
    ]
  },
  {
    id: 3,
    tipo: "multiple",
    texto: "Si una cámara IP muestra pantalla negra en el grabador pero sus LEDs infrarrojos se encienden en la noche, ¿cuál es el diagnóstico más probable?",
    opciones: [
      "La cámara no recibe alimentación eléctrica en lo absoluto",
      "La cámara recibe energía pero hay una falla en la transmisión de datos (cableado, puerto del switch o configuración IP)",
      "El disco duro del grabador (NVR) está completamente lleno",
      "El lente de la cámara está tapado físicamente"
    ]
  },
  {
    id: 4,
    tipo: "multiple",
    texto: "¿Cuál es la diferencia técnica fundamental entre un NVR y un DVR?",
    opciones: [
      "No existe diferencia, son sinónimos del mismo tipo de grabador",
      "El NVR procesa y graba video digital de cámaras IP (de red), mientras que el DVR digitaliza y graba video analógico de cámaras coaxiales",
      "El DVR graba exclusivamente en la nube y el NVR requiere un servidor local dedicado",
      "El NVR solo sirve para ver en vivo y no permite realizar grabaciones continuas"
    ]
  },
  {
    id: 5,
    tipo: "texto",
    texto: "Explica brevemente los pasos recomendados para configurar el acceso remoto en la app móvil del cliente (ej. DMSS o Hik-Connect) y qué precauciones de seguridad tomarías."
  }
];

export default function Reclutamiento() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  // Formulario Datos Personales
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [experiencia, setExperiencia] = useState("");

  // Respuestas del Test
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !direccion.trim()) {
      setError("Por favor, completa todos los campos obligatorios (*).");
      return;
    }
    setError(null);
    setPaso(2);
  };

  const handleOptionSelect = (preguntaId: number, opcion: string) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: opcion
    }));
  };

  const handleTextChange = (preguntaId: number, texto: string) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: texto
    }));
  };

  const handleSubmit = async () => {
    // Validar que se hayan respondido todas las preguntas
    const respondidas = Object.keys(respuestas).length;
    if (respondidas < CUESTIONARIO.length) {
      setError("Por favor, responde a todas las preguntas antes de enviar.");
      return;
    }

    setLoading(true);
    setError(null);

    // Formatear respuestas para guardar en base de datos
    const respuestasFormateadas = CUESTIONARIO.map(p => ({
      pregunta: p.texto,
      respuesta: respuestas[p.id] || ""
    }));

    try {
      const response = await fetch(`${API_URL}/api/reclutamiento/postular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          email,
          telefono,
          direccion,
          experiencia,
          respuestas: respuestasFormateadas
        })
      });

      if (response.ok) {
        setPaso(3);
      } else {
        const errData = await response.json();
        setError(errData.error || "Ocurrió un error al enviar la postulación.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión al enviar. Revisa el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden text-white">
      {/* Fondo estético tecnológico */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.1),transparent_35%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl w-full mx-auto overflow-auto">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-1.5 text-xs font-semibold text-orange-400">
            <Wrench className="h-4 w-4" />
            TS NETWORK · PORTAL DE RECLUTAMIENTO
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Postulación para Técnico Instalador
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Completa tus datos y realiza nuestra prueba de conocimientos técnicos para iniciar el proceso de selección.
          </p>
        </div>

        {/* Mensaje de error general */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}

        {/* Contenido Principal según Paso */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          {/* Indicador de pasos */}
          {paso !== 3 && (
            <div className="mb-8 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <span className={`pb-1 border-b-2 transition ${paso === 1 ? "border-orange-500 text-orange-400" : "border-transparent text-zinc-400"}`}>
                1. Datos Personales
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
              <span className={`pb-1 border-b-2 transition ${paso === 2 ? "border-orange-500 text-orange-400" : "border-transparent"}`}>
                2. Evaluación Técnica
              </span>
            </div>
          )}

          {/* PASO 1: Formulario de Datos Personales */}
          {paso === 1 && (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-300">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-300">Teléfono Celular *</label>
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej. 55 1234 5678"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-300">Dirección Residencial *</label>
                  <input
                    type="text"
                    required
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Calle, Número, Colonia, Ciudad"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300">Resumen de Experiencia Previa (Instalación de cámaras, alarmas, cableado, etc.)</label>
                <textarea
                  value={experiencia}
                  onChange={e => setExperiencia(e.target.value)}
                  rows={4}
                  placeholder="Describe brevemente tus trabajos anteriores relacionados con redes o seguridad..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition resize-none font-sans"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 cursor-pointer"
                >
                  Siguiente paso
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 2: Evaluación Técnica */}
          {paso === 2 && (
            <div className="space-y-8">
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-200">
                  <span className="font-bold">Instrucciones:</span> Responde honestamente según tus conocimientos. Las respuestas son fundamentales para la evaluación de tu perfil.
                </div>
              </div>

              <div className="space-y-8">
                {CUESTIONARIO.map((preg, idx) => (
                  <div key={preg.id} className="space-y-3">
                    <h3 className="text-base font-bold text-zinc-200">
                      {idx + 1}. {preg.texto}
                    </h3>

                    {preg.tipo === "multiple" ? (
                      <div className="grid grid-cols-1 gap-2">
                        {preg.opciones?.map((opcion, oIdx) => {
                          const seleccionado = respuestas[preg.id] === opcion;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleOptionSelect(preg.id, opcion)}
                              className={`text-left w-full px-4 py-3 rounded-xl border transition cursor-pointer text-sm ${seleccionado
                                ? "border-orange-500 bg-orange-500/10 text-white font-semibold"
                                : "border-white/5 bg-white/5 text-zinc-400 hover:border-white/10 hover:text-white"
                                }`}
                            >
                              {opcion}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        required
                        rows={4}
                        value={respuestas[preg.id] || ""}
                        onChange={e => handleTextChange(preg.id, e.target.value)}
                        placeholder="Escribe tu respuesta aquí detallando los pasos..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition resize-none text-sm font-sans"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold transition cursor-pointer"
                >
                  Volver a Datos
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Postulación"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Éxito */}
          {paso === 3 && (
            <div className="text-center py-10 space-y-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">¡Postulación Enviada con Éxito!</h2>
              <div className="max-w-md mx-auto text-zinc-400 text-sm space-y-2">
                <p>Hemos recibido tus datos personales y las respuestas de tu examen técnico correctamente.</p>
                <p>Nuestro equipo de administración evaluará tu prueba en las próximas horas. Si tu perfil cumple con lo requerido, nos pondremos en contacto contigo para completar el proceso de contratación y crear tu perfil de inducción.</p>
              </div>
              <div className="pt-6">
                <p className="text-xs text-zinc-500">Gracias por tu interés en formar parte de TS Network.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
