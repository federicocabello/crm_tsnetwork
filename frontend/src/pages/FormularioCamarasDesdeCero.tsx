import { useState, useEffect } from "react";
import Cotizador from "./Cotizador";

type FormularioProps = {
  onChange: (data: FormData) => void; // Callback para el submit
};

interface Presupuesto {
  cantidad: number;
  costo: string;
  precioFinal: string;
}

type FormData = {
  lugar: "casa" | "negocio" | "traila" | "foodtruck" | "apartamento" | null;
  cantidad: string;
  audio: "si" | "no" | null;
  area: "interior" | "exterior" | null;
  atico: "espacioso" | "espuma" | "no tiene" | null;
  monitor: "si" | "no" | null;
  estructura: "movil" | "standard" | "casona" | null;
  presupuesto: Presupuesto;
};

export default function FormularioCamarasDesdeCero({
  onChange,
}: FormularioProps) {
  const [lugar, setLugar] = useState<
    "casa" | "negocio" | "traila" | "foodtruck" | "apartamento" | null
  >(null);

  const [audio, setAudio] = useState<"si" | "no" | null>(null);
  const [area, setArea] = useState<"interior" | "exterior" | null>(null);
  const [atico, setAtico] = useState<
    "espacioso" | "espuma" | "no tiene" | null
  >(null);
  const [monitor, setMonitor] = useState<"si" | "no" | null>(null);
  const [estructura, setEstructura] = useState<
    "movil" | "standard" | "casona" | null
  >(null);
  const [presupuesto, setPresupuesto] = useState([]);
  const [openPresupuesto, setOpenPresupuesto] = useState(false);

  const opcionClase = (activo: boolean) =>
    `rounded-xl border px-3 py-2 text-sm font-bold cursor-pointer transition-all
     ${
       activo
         ? "bg-orange-500 text-white border-orange-500"
         : "bg-zinc-950/40 text-white border-white/10 hover:border-orange-500/50"
     }`;

  const handleSubmitPresupuesto = (data) => {
    setPresupuesto(data);
  };

  const handleCloseModal = (close) => {
    setOpenPresupuesto(close);
  };

  useEffect(() => {
    onChange({
      lugar,
      // cantidad,
      audio,
      area,
      atico,
      monitor,
      estructura,
      presupuesto,
    });
  }, [lugar, audio, area, atico, monitor, estructura, presupuesto]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Lugar</label>
          <div className="flex justify-between">
            <div
              onClick={() => setLugar("casa")}
              className={opcionClase(lugar == "casa")}>
              Casa
            </div>
            <div
              onClick={() => setLugar("negocio")}
              className={opcionClase(lugar == "negocio")}>
              Negocio
            </div>
            <div
              onClick={() => setLugar("traila")}
              className={opcionClase(lugar == "traila")}>
              Tráila
            </div>
            <div
              onClick={() => setLugar("foodtruck")}
              className={opcionClase(lugar == "foodtruck")}>
              Foodtruck
            </div>
            <div
              onClick={() => setLugar("apartamento")}
              className={opcionClase(lugar == "apartamento")}>
              Apartamento
            </div>
          </div>
        </div>
        {lugar == "foodtruck" && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: preguntar si cuenta con internet y monitor.{" "}
            <strong className="text-red-500">
              Sin internet no podemos proceder con la instalación.
            </strong>
          </div>
        )}
        {lugar == "apartamento" && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: es necesario obtener el permiso del arrendador{" "}
            <strong className="text-red-500">
              para perforar el techo o las paredes
            </strong>{" "}
            antes de realizar cualquier instalación.
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Audio</label>
          <div className="flex gap-1">
            <div
              onClick={() => setAudio("si")}
              className={opcionClase(audio == "si")}>
              Sí
            </div>
            <div
              onClick={() => setAudio("no")}
              className={opcionClase(audio == "no")}>
              No
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Área</label>
          <div className="flex gap-1">
            <div
              onClick={() => setArea("interior")}
              className={opcionClase(area == "interior")}>
              Interior
            </div>
            <div
              onClick={() => setArea("exterior")}
              className={opcionClase(area == "exterior")}>
              Exterior
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/60">Monitor</label>
          <div className="flex gap-1">
            <div
              onClick={() => setMonitor("si")}
              className={opcionClase(monitor == "si")}>
              Sí
            </div>
            <div
              onClick={() => setMonitor("no")}
              className={opcionClase(monitor == "no")}>
              No
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Ático</label>
            <div className="flex gap-1">
              <div
                onClick={() => setAtico("espacioso")}
                className={opcionClase(atico == "espacioso")}>
                Espacioso
              </div>
              <div
                onClick={() => setAtico("espuma")}
                className={opcionClase(atico == "espuma")}>
                Espuma (FOAM)
              </div>
              <div
                onClick={() => setAtico("no tiene")}
                className={opcionClase(atico == "no tiene")}>
                No tiene
              </div>
            </div>
          </div>

          {/* <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Cantidad</label>
            <input
              type="number"
              onChange={(e) => setCantidad(e.target.value)}
              className="w-20 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
            />
          </div> */}
        </div>
        {atico && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: con{" "}
            <strong className="text-red-500">insulación normal</strong>{" "}
            (fibra/lana), el cable puede pasarse sin romper paredes, lo que
            facilita una instalación rápida y estándar. Con{" "}
            <strong className="text-red-500">insulación de espuma</strong>,
            bloquea el paso del cable, haciendo la instalación más compleja y
            requiriendo perforaciones o canaletas externas.
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Estructura</label>
            <div className="flex gap-1">
              <div
                onClick={() => setEstructura("movil")}
                className={opcionClase(estructura == "movil")}>
                Móvil
              </div>
              <div
                onClick={() => setEstructura("standard")}
                className={opcionClase(estructura == "standard")}>
                Standard
              </div>
              <div
                onClick={() => setEstructura("casona")}
                className={opcionClase(estructura == "casona")}>
                Casona
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Presupuesto</label>
            {/* <input
          type="number"
          onChange={(e) => setPresupuesto(e.target.value)}
          className="w-32 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm outline-none focus:border-orange-500/40"
        /> */}
            <button
              onChange={handleSubmitPresupuesto}
              onClick={() => setOpenPresupuesto(true)}
              className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full">
              Presupuesto
            </button>
          </div>
        </div>

        {estructura && (
          <div className="text-xs italic transition-all mt-1 text-white/60">
            ACLARACIÓN: en caso de que la casa sea nueva y{" "}
            <strong className="text-red-500">no aparezca en el mapa</strong>,
            pedir fotos de la misma{" "}
            <strong className="text-red-500">
              completa de frente, atrás y costados.
            </strong>
          </div>
        )}
      </div>
      {openPresupuesto && (
        <Cotizador
          onClose={handleCloseModal}
          setCotizacion={handleSubmitPresupuesto}
        />
      )}
    </div>
  );
}
