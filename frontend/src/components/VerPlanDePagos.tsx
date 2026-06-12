import { useState } from "react";
import Loading from "../components/Loading";
import FormatearNumero from "../components/FormatearNumero";

import {
  CreditCard,
  Calendar,
  Percent,
  DollarSign,
  CheckCircle,
  Circle,
  Save,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

type Cuota = {
  idcuota: number;
  monto: number;
  interes: number;
  pagado: boolean;
  vencimiento: string;          // "YYYY-MM-DD" o puede venir como Date string del backend
  fechapago: string | null;
  idmetodo: number;
  metodo: string;
};

type Props = {
  idPago: number;
  total: number;
  cuotas: Cuota[];
  onActualizado?: () => void;   // callback para refrescar Cliente.tsx
};

function formatVencimiento(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw; // Fallback
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFechaPago(raw: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

export default function VerPlanDePagos({ idPago, cuotas: cuotasIniciales, onActualizado }: Props) {
  const [cuotas, setCuotas] = useState<Cuota[]>(
    cuotasIniciales.map((c) => ({
      ...c,
      vencimiento: formatVencimiento(c.vencimiento),
      monto: Number(c.monto),
      interes: Number(c.interes),
      pagado: Boolean(c.pagado),
    }))
  );
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState(true);

  const [loading, setLoading] = useState(false);

  const cuotasPagadas = cuotas.filter((c) => c.pagado).length;
  const totalReal = cuotas.reduce(
    (acc, c) => acc + c.monto,
    0
  );
  const montoPagado = cuotas
    .filter((c) => c.pagado)
    .reduce((acc, c) => acc + c.monto, 0);
  const montoPendiente = totalReal - montoPagado;

  const handleCuotaChange = (
    index: number,
    campo: keyof Cuota,
    valor: string | number | boolean
  ) => {
    setCuotas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const agregarCuota = () => {
    setCuotas((prev) => [
      ...prev,
      {
        idcuota: 0,
        monto: 0,
        interes: 0,
        pagado: false,
        vencimiento: "",
        fechapago: null,
        idmetodo: 1,
        metodo: "Efectivo",
      },
    ]);
  };

  const handleGuardar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/plan-de-pagos/${idPago}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoTotal: totalReal,
          cuotas: cuotas.map((c) => ({
            idcuota: c.idcuota,
            monto: c.monto,
            interes: c.interes,
            vencimiento: c.vencimiento,
            pagado: c.pagado,
            fechapago: c.fechapago,
            idmetodo: c.idmetodo,
          })),
        }),
      });

      if (res.ok) {
        onActualizado?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Error ${res.status}`);
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    loading ? <Loading /> :
      <div className="rounded-2xl border border-white/10 bg-zinc-900 shadow-lg shadow-black/20 overflow-hidden">

        {/* Header del plan */}
        <button
          onClick={() => setExpandido((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-400" />
            <span className="text-base font-bold text-white">Plan de Pagos</span>
            <span className="text-xs text-white/40 ml-1">
              {cuotasPagadas}/{cuotas.length} pagadas
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Barra de progreso */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${cuotas.length > 0 ? (cuotasPagadas / cuotas.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-white/40">
                {cuotas.length > 0 ? Math.round((cuotasPagadas / cuotas.length) * 100) : 0}%
              </span>
            </div>
            {expandido ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
          </div>
        </button>

        {expandido && (
          <>
            {/* Resumen financiero */}
            <div className="flex flex-wrap gap-3 px-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-xs">
                <DollarSign className="h-3 w-3 text-white/40" />
                <span className="text-white/40">Total:</span>
                <span className="text-white font-bold"><FormatearNumero numero={totalReal} /></span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs">
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-white/40">Pagado:</span>
                <span className="text-green-400 font-bold"><FormatearNumero numero={montoPagado} /></span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 text-xs">
                <Circle className="h-3 w-3 text-orange-400" />
                <span className="text-white/40">Pendiente:</span>
                <span className="text-orange-400 font-bold"><FormatearNumero numero={montoPendiente} /></span>
              </div>
            </div>

            {/* Encabezados de la tabla */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-bold tracking-wide text-white/30 uppercase border-b border-white/5">
              <div className="col-span-1">#</div>
              <div className="col-span-1 flex items-center justify-center">
                <CheckCircle className="h-3 w-3" />
              </div>
              <div className="col-span-3 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Monto Final
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <Percent className="h-3 w-3" /> Interés
              </div>
              <div className="col-span-4 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Vencimiento
              </div>
              <div className="col-span-1 text-right">Total</div>
            </div>

            {/* Filas de cuotas */}
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {cuotas.map((cuota, index) => {
                const montoConInteres = cuota.monto;
                const fechaPago = formatFechaPago(cuota.fechapago);
                return (
                  <div
                    key={cuota.idcuota}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-2.5 transition-colors ${cuota.pagado ? "bg-green-500/5" : "hover:bg-white/[0.02]"
                      }`}
                  >
                    {/* N° */}
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${cuota.pagado
                          ? "bg-green-500/20 text-green-400"
                          : "bg-orange-500/20 text-orange-400"
                          }`}
                      >
                        {index + 1}
                      </span>
                    </div>

                    {/* Toggle pagado */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        title={cuota.pagado ? "Marcar como pendiente" : "Marcar como pagada"}
                        onClick={() => handleCuotaChange(index, "pagado", !cuota.pagado)}
                        className="transition-transform hover:scale-110"
                      >
                        {cuota.pagado ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-white/20 hover:text-white/50" />
                        )}
                      </button>
                    </div>

                    {/* Monto base */}
                    <div className="col-span-3 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={cuota.monto || ""}
                        placeholder="0.00"
                        onChange={(e) => handleCuotaChange(index, "monto", Number(e.target.value))}
                        disabled={cuota.pagado}
                        className={`w-full rounded-xl border px-5 py-1.5 text-xs text-white outline-none transition-colors ${cuota.pagado
                          ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                          : "border-white/10 bg-zinc-950/40 focus:border-orange-500/50"
                          }`}
                      />
                    </div>

                    {/* Interés */}
                    <div className="col-span-2 relative">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cuota.interes || ""}
                        placeholder="0"
                        onChange={(e) => handleCuotaChange(index, "interes", Number(e.target.value))}
                        disabled={cuota.pagado}
                        className={`w-full rounded-xl border px-2 pr-5 py-1.5 text-xs text-white outline-none transition-colors ${cuota.pagado
                          ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                          : "border-white/10 bg-zinc-950/40 focus:border-orange-500/50"
                          }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">%</span>
                    </div>

                    {/* Vencimiento */}
                    <div className="col-span-4">
                      <input
                        type="date"
                        value={cuota.vencimiento}
                        onChange={(e) => handleCuotaChange(index, "vencimiento", e.target.value)}
                        disabled={cuota.pagado}
                        className={`w-full rounded-xl border px-2 py-1.5 text-xs text-white outline-none transition-colors [color-scheme:dark] ${cuota.pagado
                          ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                          : "border-white/10 bg-zinc-950/40 focus:border-orange-500/50"
                          }`}
                      />
                    </div>

                    {/* Total con interés */}
                    <div className="col-span-1 text-right">
                      <span className={`text-xs font-bold ${cuota.pagado ? "text-green-400" : "text-orange-300"}`}>
                        <FormatearNumero numero={montoConInteres} />
                      </span>
                    </div>

                    {cuota.pagado && fechaPago && (
                      <div className="pl-16 -mt-1">
                        <div className="inline-flex items-center rounded-lg border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-300">
                          Pagado el {fechaPago}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Boton agregar cuota */}
            <div className="px-5 py-2 border-t border-white/5 flex justify-end bg-black/10">
              <button
                onClick={agregarCuota}
                className="text-xs font-bold flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="h-4 w-4" /> Agregar cuota
              </button>
            </div>

            {/* Footer: error + botón guardar */}
            <div className="px-5 py-3 border-t border-white/10 bg-black/20 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-red-400">
                {error}
              </div>
              <button
                onClick={handleGuardar}
                disabled={loading}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50`}
              >
                <Save className="h-4 w-4" />
                Actualizar plan
              </button>
            </div>
          </>
        )}
      </div>
  );
}
