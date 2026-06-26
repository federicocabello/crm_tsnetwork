import { useState, useEffect } from "react";
import { CreditCard, Calendar, Percent, DollarSign, Hash, Plus } from "lucide-react";
import FormatearNumero from "../components/FormatearNumero";
import Loading from "../components/Loading";

type Props = {
  idCliente: string;
  idCita: number;
  onGuardado?: () => void;
};

type Cuota = {
  monto: number;
  interes: number;
  fecha_vencimiento: string;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PlanDePagos({ idCliente, idCita, onGuardado }: Props) {
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [enganche, setEnganche] = useState<number>(0);
  const [interesGlobal, setInteresGlobal] = useState<number>(0);
  const [numCuotas, setNumCuotas] = useState<number>(1);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [guardado, setGuardado] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [loading, setLoading] = useState(false);

  const saldoFinanciado = Math.max(montoTotal - enganche, 0);
  const montoPorCuota = numCuotas > 0 && saldoFinanciado > 0
    ? Math.round((saldoFinanciado / numCuotas) * 100) / 100
    : 0;

  useEffect(() => {
    if (numCuotas < 1) return;
    const hoy = new Date();
    const nuevasCuotas: Cuota[] = Array.from({ length: numCuotas }, (_, i) => {
      const fecha = new Date(hoy);
      fecha.setMonth(hoy.getMonth() + i);
      return {
        monto: montoPorCuota,
        interes: interesGlobal,
        fecha_vencimiento: formatDate(fecha),
      };
    });
    setCuotas(nuevasCuotas);
  }, [numCuotas, saldoFinanciado, interesGlobal]);

  const handleMontoChange = (index: number, value: number) => {
    setCuotas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], monto: value };
      return copia;
    });
  };

  const handleInteresChange = (index: number, value: number) => {
    setCuotas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], interes: value };
      return copia;
    });
  };

  const handleFechaChange = (index: number, fecha: string) => {
    setCuotas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], fecha_vencimiento: fecha };
      return copia;
    });
  };

  const totalReal = cuotas.reduce(
    (acc, c) => acc + (c.monto || 0) + ((c.monto || 0) * (c.interes || 0)) / 100,
    0
  );
  const totalBase = cuotas.reduce((acc, c) => acc + (c.monto || 0), 0);
  const diferencia = Math.round((saldoFinanciado - totalBase) * 100) / 100;
  const totalConEnganche = enganche + totalReal;

  const handleGuardar = async () => {
    setErrorGuardar("");

    if (!montoTotal || montoTotal <= 0) {
      setErrorGuardar("El monto total debe ser mayor a 0.");
      return;
    }
    if (!enganche || enganche <= 0) {
      setErrorGuardar("El enganche debe ser mayor a 0.");
      return;
    }
    if (enganche >= montoTotal) {
      setErrorGuardar("El enganche debe ser menor al monto total.");
      return;
    }
    if (cuotas.some((c) => !c.fecha_vencimiento)) {
      setErrorGuardar("Todas las cuotas deben tener fecha de vencimiento.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/plan-de-pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCliente,
          idCita,
          montoTotal: totalConEnganche,
          enganche,
          cuotas: cuotas.map((c) => ({
            monto: c.monto + (c.monto * c.interes) / 100,
            interes: c.interes,
            vencimiento: c.fecha_vencimiento,
          })),
        }),
      });

      if (res.ok) {
        setGuardado(true);
        onGuardado?.();
        setTimeout(() => setGuardado(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorGuardar(data?.error || `Error al guardar (${res.status})`);
      }
    } catch (err) {
      console.error("Error al guardar plan de pagos:", err);
      setErrorGuardar("Error de conexion con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return loading ? <Loading /> : (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-5 w-5 text-orange-400" />
        <div className="text-lg font-bold text-white">Plan de Pagos</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900 shadow-lg shadow-black/20 p-5 space-y-4">
        <p className="text-xs font-bold tracking-wide text-white/40 uppercase">Configuracion</p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-white/50 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-orange-400" />
              Monto total
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={montoTotal || ""}
                placeholder="0.00"
                onChange={(e) => setMontoTotal(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 pl-7 pr-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/50 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-orange-400" />
              Enganche
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={enganche || ""}
                placeholder="0.00"
                onChange={(e) => setEnganche(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 pl-7 pr-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/50 flex items-center gap-1">
              <Percent className="h-3 w-3 text-orange-400" />
              Interes por cuota (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.1}
                value={interesGlobal || ""}
                placeholder="0"
                onChange={(e) => setInteresGlobal(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">%</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/50 flex items-center gap-1">
              <Hash className="h-3 w-3 text-orange-400" />
              Nro de cuotas
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={numCuotas}
              onChange={(e) => setNumCuotas(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>
        </div>

        {montoTotal > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-xs">
              <span className="text-white/40">Saldo para cuotas:</span>
              <span className="text-white font-bold"><FormatearNumero numero={saldoFinanciado} /></span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-xs">
              <span className="text-white/40">Total con interes:</span>
              <span className="text-orange-400 font-bold"><FormatearNumero numero={totalConEnganche} /></span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-xs">
              <span className="text-white/40">Base por cuota:</span>
              <span className="text-white font-bold"><FormatearNumero numero={montoPorCuota} /></span>
            </div>
          </div>
        )}
      </div>

      {cuotas.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 shadow-lg shadow-black/20 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 text-xs font-bold tracking-wide text-white/40 uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-4 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Monto</div>
            <div className="col-span-3 flex items-center gap-1"><Percent className="h-3 w-3" /> Interes</div>
            <div className="col-span-4 flex items-center gap-1"><Calendar className="h-3 w-3" /> Vencimiento</div>
          </div>

          <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
            {cuotas.map((cuota, index) => {
              const montoConInteres = cuota.monto + (cuota.monto * cuota.interes) / 100;
              return (
                <div key={index} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                  <div className="col-span-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>

                  <div className="col-span-4 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={cuota.monto || ""}
                      placeholder="0.00"
                      onChange={(e) => handleMontoChange(index, Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/40 pl-6 pr-2 py-1.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>

                  <div className="col-span-3 relative">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={cuota.interes || ""}
                      placeholder="0"
                      onChange={(e) => handleInteresChange(index, Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-2 pr-6 py-1.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">%</span>
                  </div>

                  <div className="col-span-4">
                    <input
                      type="date"
                      value={cuota.fecha_vencimiento}
                      onChange={(e) => handleFechaChange(index, e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-2 py-1.5 text-xs text-white outline-none focus:border-orange-500/50 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  {cuota.interes > 0 && (
                    <div className="col-span-12 pl-8 -mt-1 mb-0.5">
                      <span className="text-xs text-orange-600 font-bold">
                        = <FormatearNumero numero={montoConInteres} /> con interes
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 bg-black/20">
            <div className="col-span-5">
              <span className="text-xs text-white/40">Total real:</span>
              <span className={`ml-2 text-sm font-bold ${Math.abs(diferencia) < 0.01 ? "text-green-400" : "text-orange-400"}`}>
                <FormatearNumero numero={totalConEnganche} />
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleGuardar}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${guardado ? "bg-green-500 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
              >
                <Plus className="h-4 w-4" />
                {guardado ? "Guardado" : "Guardar plan de pagos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorGuardar && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {errorGuardar}
        </div>
      )}

      {cuotas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/50 p-8 text-center">
          <CreditCard className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">Ingresa un monto, enganche y cuotas para comenzar</p>
        </div>
      )}
    </div>
  );
}
