import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Loading from "../components/Loading";
import FormatearNumero from "../components/FormatearNumero";

import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Circle,
  Save,
  Plus,
  Upload,
  Download,
  Trash2,
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
  nota?: string;
  comprobante?: string;
};

type MetodoPago = {
  id: number;
  metodo: string;
  color?: string;
};

type Props = {
  idPago: number;
  idCita: number;
  total: number;
  enganche: number;
  metodoEnganche?: string;
  idMetodoEnganche?: number;
  cuotas: Cuota[];
  onActualizado?: () => void;   // callback para refrescar Cliente.tsx
  headerAction?: ReactNode;
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

function redondearMonto(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function recalcularMontoConInteres(montoActual: number, interesAnterior: number, interesNuevo: number): number {
  const factorAnterior = 1 + Number(interesAnterior || 0) / 100;
  const base = factorAnterior > 0 ? Number(montoActual || 0) / factorAnterior : Number(montoActual || 0);
  return redondearMonto(base * (1 + Number(interesNuevo || 0) / 100));
}

function normalizarCuotas(cuotas: Cuota[]): Cuota[] {
  return cuotas.map((c) => ({
    ...c,
    vencimiento: formatVencimiento(c.vencimiento),
    monto: Number(c.monto),
    interes: Number(c.interes),
    pagado: Boolean(c.pagado),
    idmetodo: Number(c.idmetodo || 1),
    nota: c.nota || "",
    comprobante: c.comprobante || "",
  }));
}

export default function VerPlanDePagos({ idPago, idCita, total, enganche, idMetodoEnganche = 0, cuotas: cuotasIniciales, onActualizado, headerAction }: Props) {
  const [cuotas, setCuotas] = useState<Cuota[]>(normalizarCuotas(cuotasIniciales));
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [idMetodoEngancheSeleccionado, setIdMetodoEngancheSeleccionado] = useState<number>(Number(idMetodoEnganche || 0));
  const [error, setError] = useState("");
  const [avisoCuotaPagada, setAvisoCuotaPagada] = useState("");
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCuotas(normalizarCuotas(cuotasIniciales));
  }, [cuotasIniciales]);

  useEffect(() => {
    setIdMetodoEngancheSeleccionado(Number(idMetodoEnganche || 0));
  }, [idMetodoEnganche]);

  useEffect(() => {
    const cargarMetodos = async () => {
      try {
        const res = await fetch("/api/pagos/metodos");
        if (!res.ok) return;
        const data = await res.json();
        setMetodosPago(data ?? []);
      } catch (err) {
        console.error("Error al traer metodos de pago:", err);
      }
    };

    cargarMetodos();
  }, []);

  const enganchePlan = Number(enganche || 0);
  const cuotasPagadas = cuotas.filter((c) => c.pagado).length;
  const totalReal = cuotas.reduce(
    (acc, c) => acc + c.monto,
    0
  );
  const montoPagado = cuotas
    .filter((c) => c.pagado)
    .reduce((acc, c) => acc + c.monto, 0);
  const montoPendiente = totalReal - montoPagado;
  const totalConEnganche = enganchePlan + totalReal;
  const totalGuardado = Number(total || 0);
  const cuotasPagadasGuardadas = new Set(
    cuotasIniciales
      .filter((cuota) => Boolean(cuota.pagado) && Number(cuota.idcuota) > 0)
      .map((cuota) => Number(cuota.idcuota))
  );
  const cuotaEstaBloqueada = (cuota: Cuota) =>
    Boolean(cuota.pagado) && Number(cuota.idcuota) > 0 && cuotasPagadasGuardadas.has(Number(cuota.idcuota));


  const handleTogglePagado = (index: number) => {
    const cuota = cuotas[index];
    if (!cuota) return;

    if (cuotaEstaBloqueada(cuota)) {
      setError("Las cuotas pagadas ya actualizadas no se pueden modificar.");
      return;
    }

    if (!cuota.pagado) {
      setAvisoCuotaPagada(`La cuota ${index + 1} quedará marcada como pagada al actualizar el plan y no se podrá modificar después.`);
    } else {
      setAvisoCuotaPagada("");
    }

    handleCuotaChange(index, "pagado", !cuota.pagado);
  };

  const handleCuotaChange = (
    index: number,
    campo: keyof Cuota,
    valor: string | number | boolean
  ) => {
    setCuotas((prev) => {
      const copia = [...prev];
      const cuotaActual = copia[index];
      if (!cuotaActual) return prev;

      if (campo === "interes") {
        const interesNuevo = Number(valor || 0);
        copia[index] = {
          ...cuotaActual,
          interes: interesNuevo,
          monto: recalcularMontoConInteres(cuotaActual.monto, cuotaActual.interes, interesNuevo),
        };
        return copia;
      }

      copia[index] = { ...cuotaActual, [campo]: valor };
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
        nota: "",
        comprobante: "",
      },
    ]);
  };

  const eliminarCuota = (index: number) => {
    setError("");

    setCuotas((prev) => {
      const cuotaEliminada = prev[index];
      if (!cuotaEliminada) return prev;

      if (cuotaEliminada.pagado) {
        setError("No se puede eliminar una cuota pagada.");
        return prev;
      }

      const restantes = prev.filter((_, i) => i !== index);
      const pendientes = restantes.filter((c) => !c.pagado);

      if (pendientes.length === 0) {
        setError("El plan debe tener al menos una cuota pendiente para redistribuir el saldo.");
        return prev;
      }

      const totalObjetivo = prev.reduce((acc, c) => acc + Number(c.monto || 0), 0);
      const totalPagadoRestante = restantes
        .filter((c) => c.pagado)
        .reduce((acc, c) => acc + Number(c.monto || 0), 0);
      const saldoPendiente = redondearMonto(totalObjetivo - totalPagadoRestante);
      const montoBase = redondearMonto(saldoPendiente / pendientes.length);
      let acumuladoPendiente = 0;
      let pendientesProcesadas = 0;

      return restantes.map((cuota) => {
        if (cuota.pagado) return cuota;

        pendientesProcesadas += 1;
        const esUltimaPendiente = pendientesProcesadas === pendientes.length;
        const nuevoMonto = esUltimaPendiente
          ? redondearMonto(saldoPendiente - acumuladoPendiente)
          : montoBase;

        acumuladoPendiente = redondearMonto(acumuladoPendiente + nuevoMonto);
        return { ...cuota, monto: nuevoMonto };
      });
    });
  };

  const handleSubirComprobante = async (index: number, archivo: File | null) => {
    if (!archivo) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("comprobante", archivo);
    if (cuotas[index]?.comprobante) {
      formData.append("comprobanteAnterior", cuotas[index].comprobante || "");
    }

    try {
      const res = await fetch(`/api/comprobantes/${idCita}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || `Error al subir comprobante (${res.status})`);
        return;
      }

      handleCuotaChange(index, "comprobante", data.comprobante || "");
    } catch (err) {
      setError("Error de conexion al subir comprobante.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/plan-de-pagos/${idPago}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montoTotal: totalConEnganche,
          idMetodoEnganche: enganchePlan > 0 ? idMetodoEngancheSeleccionado || null : null,
          cuotas: cuotas.map((c) => ({
            idcuota: c.idcuota,
            monto: c.monto,
            interes: c.interes,
            vencimiento: c.vencimiento,
            pagado: c.pagado,
            fechapago: c.fechapago,
            idmetodo: c.idmetodo,
            nota: c.nota || "",
            comprobante: c.comprobante || "",
          })),
        }),
      });

      if (res.ok) {
        onActualizado?.();
        setConfirmacionVisible(true);
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
<<<<<<< Updated upstream
        <div className="flex w-full items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-400" />
            <span className="text-base font-bold text-white">Plan de Pagos</span>
            <span className="ml-1 text-xs text-white/40">{cuotasPagadas}/{cuotas.length} pagadas</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${cuotas.length > 0 ? (cuotasPagadas / cuotas.length) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-white/40">{cuotas.length > 0 ? Math.round((cuotasPagadas / cuotas.length) * 100) : 0}%</span>
            </div>
            {headerAction}
=======
        <button
          onClick={() => setExpandido((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="text-base font-bold text-white tracking-wide block">Plan de Pagos</span>
              <span className="text-xs text-white/50">
                {cuotasPagadas} de {cuotas.length} cuotas pagadas
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Barra de progreso */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-36 h-2 rounded-full bg-zinc-950 overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500 shadow-sm"
                  style={{ width: `${cuotas.length > 0 ? (cuotasPagadas / cuotas.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-orange-400">
                {cuotas.length > 0 ? Math.round((cuotasPagadas / cuotas.length) * 100) : 0}%
              </span>
            </div>
            {expandido ? (
              <ChevronUp className="h-5 w-5 text-white/40" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white/40" />
            )}
>>>>>>> Stashed changes
          </div>
        </div>

<<<<<<< Updated upstream
          <>            {/* Resumen financiero */}
            <div className="flex flex-wrap gap-3 px-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/10 px-3 py-1.5 text-xs">
                <DollarSign className="h-3 w-3 text-white/40" />
                <span className="text-white/40">Total:</span>
                <span className="text-white font-bold"><FormatearNumero numero={totalConEnganche || totalGuardado} /></span>
=======
        {expandido && (
          <>
            {/* Resumen financiero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-5 pb-4 border-b border-white/10">
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 border border-white/10 px-3.5 py-2.5 text-xs shadow-inner">
                <span className="text-white/50 font-medium flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-white/40" /> Total Plan
                </span>
                <span className="text-white font-black text-sm"><FormatearNumero numero={totalConEnganche || totalGuardado} /></span>
>>>>>>> Stashed changes
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs shadow-inner">
                <span className="text-emerald-300/80 font-medium flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Enganche
                </span>
                <span className="text-emerald-400 font-black text-sm"><FormatearNumero numero={enganchePlan} /></span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs shadow-inner">
                <span className="text-emerald-300/80 font-medium flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Pagado Cuotas
                </span>
                <span className="text-emerald-400 font-black text-sm"><FormatearNumero numero={montoPagado} /></span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 text-xs shadow-inner">
                <span className="text-amber-300/80 font-medium flex items-center gap-1.5">
                  <Circle className="h-3.5 w-3.5 text-amber-400" /> Pendiente
                </span>
                <span className="text-amber-400 font-black text-sm"><FormatearNumero numero={montoPendiente} /></span>
              </div>
            </div>

            {/* Selector para método de enganche */}
            {enganchePlan > 0 && (
              <div className="flex items-center justify-end gap-2 px-5 mt-3 text-xs sm:text-sm">
                <span className="text-white/60 font-semibold">Método del enganche:</span>
                <select
                  value={idMetodoEngancheSeleccionado || ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setIdMetodoEngancheSeleccionado(Number(e.target.value || 0))}
                  className="rounded-xl border border-emerald-500/30 bg-zinc-950 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-400 outline-none focus:border-emerald-400 cursor-pointer transition-all shadow-xs"
                  title="Cambiar método del enganche"
                >
                  <option value="">Método no registrado</option>
                  {metodosPago.map((metodo) => (
                    <option key={metodo.id} value={metodo.id}>
                      {metodo.metodo}
                    </option>
                  ))}
                </select>
              </div>
            )}

<<<<<<< Updated upstream
            {/* Filas de cuotas */}
            <div className="divide-y divide-white/5">
=======
            {/* Lista de Cuotas (Diseño en Tarjetas limpias) */}
            <div className="space-y-3 px-5 py-4">
>>>>>>> Stashed changes
              {cuotas.map((cuota, index) => {
                const montoConInteres = cuota.monto;
                const fechaPago = formatFechaPago(cuota.fechapago);

                return (
                  <div
                    key={`${cuota.idcuota}-${index}`}
                    className={`rounded-2xl border transition-all p-4 space-y-3 shadow-md ${
                      cuota.pagado
                        ? "bg-emerald-500/[0.03] border-emerald-500/20"
                        : "bg-zinc-950/70 border-white/10 hover:border-orange-500/30"
                    }`}
                  >
                    {/* Header de la cuota */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black tracking-wider ${
                            cuota.pagado
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          }`}
                        >
                          CUOTA #{index + 1}
                        </span>

                        <button
                          type="button"
                          title={
                            cuotaEstaBloqueada(cuota)
                              ? "Esta cuota pagada ya no se puede modificar"
                              : cuota.pagado
                              ? "Marcar como pendiente"
                              : "Marcar como pagada"
                          }
                          onClick={() => handleTogglePagado(index)}
                          disabled={cuotaEstaBloqueada(cuota)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            cuotaEstaBloqueada(cuota)
                              ? "cursor-not-allowed opacity-60 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : cuota.pagado
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                              : "bg-zinc-800 text-white/60 border border-white/10 hover:text-white hover:bg-zinc-700 cursor-pointer"
                          }`}
                        >
                          {cuota.pagado ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              <span>Pagado</span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-4 w-4 text-white/30" />
                              <span>Marcar como pagado</span>
                            </>
                          )}
                        </button>

                        {cuota.pagado && fechaPago && (
                          <span className="text-xs font-semibold text-emerald-400/90 italic">
                            (Pagado el {fechaPago})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-white/40 block">Monto Final</span>
                          <span className={`text-base font-black ${cuota.pagado ? "text-emerald-400" : "text-orange-400"}`}>
                            <FormatearNumero numero={montoConInteres} />
                          </span>
                        </div>

                        <button
                          type="button"
                          title={cuota.pagado ? "No se puede eliminar una cuota pagada" : "Eliminar cuota y redistribuir saldo"}
                          onClick={() => eliminarCuota(index)}
                          disabled={cuota.pagado}
                          className={`p-2 rounded-xl border transition-all ${
                            cuota.pagado
                              ? "cursor-not-allowed border-white/5 bg-white/5 text-white/15"
                              : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 cursor-pointer active:scale-95"
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Inputs de la cuota: Monto, Interés, Vencimiento */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Monto Base</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={cuota.monto || ""}
                            placeholder="0.00"
                            onChange={(e) => handleCuotaChange(index, "monto", Number(e.target.value))}
                            disabled={cuota.pagado}
                            className={`w-full rounded-xl border pl-7 pr-3 py-1.5 text-xs text-white outline-none transition-all ${
                              cuota.pagado
                                ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                                : "border-white/10 bg-zinc-900 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Interés (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={cuota.interes || ""}
                            placeholder="0"
                            onChange={(e) => handleCuotaChange(index, "interes", Number(e.target.value))}
                            disabled={cuota.pagado}
                            className={`w-full rounded-xl border px-3 pr-7 py-1.5 text-xs text-white outline-none transition-all ${
                              cuota.pagado
                                ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                                : "border-white/10 bg-zinc-900 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20"
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Vencimiento</label>
                        <input
                          type="date"
                          value={cuota.vencimiento}
                          onChange={(e) => handleCuotaChange(index, "vencimiento", e.target.value)}
                          disabled={cuota.pagado}
                          className={`w-full rounded-xl border px-3 py-1.5 text-xs text-white outline-none transition-all [color-scheme:dark] ${
                            cuota.pagado
                              ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                              : "border-white/10 bg-zinc-900 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Detalles adicionales: Método, Tipo/Nota, Comprobante */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 bg-zinc-900/40 p-3 rounded-xl">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Método de pago</label>
                        <select
                          value={cuota.idmetodo || ""}
                          disabled={cuotaEstaBloqueada(cuota)}
                          onChange={(e) => {
                            const idmetodo = Number(e.target.value);
                            const metodo = metodosPago.find((item) => item.id === idmetodo)?.metodo || "";
                            handleCuotaChange(index, "idmetodo", idmetodo);
                            handleCuotaChange(index, "metodo", metodo);
                          }}
                          className={`w-full rounded-xl border px-3 py-1.5 text-xs text-white outline-none transition-all ${
                            cuotaEstaBloqueada(cuota)
                              ? "cursor-not-allowed border-white/5 bg-white/5 text-white/30"
                              : "border-white/10 bg-zinc-950/80 focus:border-orange-500/60"
                          }`}
                        >
                          <option value="">Seleccionar método</option>
                          {metodosPago.map((metodo) => (
                            <option key={metodo.id} value={metodo.id}>
                              {metodo.metodo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Tipo / Nota</label>
                        <input
                          value={cuota.nota || ""}
                          onChange={(e) => handleCuotaChange(index, "nota", e.target.value)}
                          disabled={cuotaEstaBloqueada(cuota)}
                          placeholder="ZELLE, CASHAPP, NOTA, ETC."
                          className={`w-full uppercase rounded-xl border px-3 py-1.5 text-xs text-white outline-none transition-all ${
                            cuotaEstaBloqueada(cuota)
                              ? "cursor-not-allowed border-white/5 bg-white/5 text-white/30"
                              : "border-white/10 bg-zinc-950/80 focus:border-orange-500/60"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Comprobante</label>
                        <div className="flex items-center gap-2">
                          <label
                            className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${
                              cuotaEstaBloqueada(cuota)
                                ? "cursor-not-allowed border-white/5 bg-white/5 text-white/30"
                                : "cursor-pointer border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20 active:scale-95"
                            }`}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Cargar</span>
                            <input
                              type="file"
                              className="hidden"
                              disabled={cuotaEstaBloqueada(cuota)}
                              onChange={(e) => handleSubirComprobante(index, e.target.files?.[0] || null)}
                            />
                          </label>

                          {cuota.comprobante && (
                            <a
                              href={cuota.comprobante}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/20"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Descargar</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {avisoCuotaPagada && (
              <div className="mx-5 mt-3 rounded-xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-100">
                {avisoCuotaPagada}
              </div>
            )}

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
        
        {confirmacionVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-green-500/30 bg-zinc-950 p-6 text-center shadow-2xl shadow-black/50">
              <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
              <h3 className="text-lg font-bold text-white">Plan actualizado con exito</h3>
              <p className="mt-1 text-sm text-white/50">Los datos del plan de pagos se guardaron correctamente.</p>
              <button
                type="button"
                onClick={() => setConfirmacionVisible(false)}
                className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </div>
  );
}






