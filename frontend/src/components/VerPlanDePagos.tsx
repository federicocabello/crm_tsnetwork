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
  ChevronDown,
  ChevronUp,
  Plus,
  Upload,
  Download,
  Trash2,
} from "lucide-react";

type Cuota = {
  idcuota: number;
  monto: number;
  interes: number;
  pagado: boolean | number;
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
    pagado: typeof c.pagado === "number" ? c.pagado : (c.pagado ? 1 : 0),
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
  const [expandido, setExpandido] = useState(true);
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
  const cuotasPagadas = cuotas.filter((c) => Number(c.pagado) === 1).length;
  const totalReal = cuotas.reduce(
    (acc, c) => acc + c.monto,
    0
  );
  const montoPagado = cuotas
    .filter((c) => Number(c.pagado) === 1)
    .reduce((acc, c) => acc + c.monto, 0);
  const montoPendiente = cuotas
    .filter((c) => Number(c.pagado) === 0)
    .reduce((acc, c) => acc + c.monto, 0);
  const totalConEnganche = enganchePlan + totalReal;
  const totalGuardado = Number(total || 0);
  const cuotasPagadasGuardadas = new Set(
    cuotasIniciales
      .filter((cuota) => Number(cuota.pagado) === 1 && Number(cuota.idcuota) > 0)
      .map((cuota) => Number(cuota.idcuota))
  );
  const cuotaEstaBloqueada = (cuota: Cuota) =>
    (Number(cuota.pagado) === 1 && Number(cuota.idcuota) > 0 && cuotasPagadasGuardadas.has(Number(cuota.idcuota))) ||
    Number(cuota.pagado) === 2;


  const handleTogglePagado = (index: number) => {
    const cuota = cuotas[index];
    if (!cuota) return;

    if (Number(cuota.pagado) === 2) {
      setError("Las cuotas canceladas por falta de pago no se pueden modificar.");
      return;
    }

    if (cuotaEstaBloqueada(cuota)) {
      setError("Las cuotas pagadas ya actualizadas no se pueden modificar.");
      return;
    }

    const nuevoEstado = Number(cuota.pagado) === 1 ? 0 : 1;
    if (nuevoEstado === 1) {
      setAvisoCuotaPagada(`La cuota ${index + 1} quedará marcada como pagada al actualizar el plan y no se podrá modificar después.`);
    } else {
      setAvisoCuotaPagada("");
    }

    handleCuotaChange(index, "pagado", nuevoEstado);
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
      <div className="alt-card">
        {/* Header del plan */}
        <div className="alt-card-header flex flex-wrap items-center justify-between gap-3">
          <div
            onClick={() => setExpandido((p) => !p)}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded flex items-center justify-center bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="alt-card-header-title text-sm">Plan de Pagos de la Cita</span>
                <span className="alt-badge alt-badge-orange">
                  {cuotasPagadas}/{cuotas.length} Pagadas
                </span>
              </div>
              <span className="text-[11px] block" style={{ color: "var(--alt-text-muted)" }}>
                {idPago ? `Plan #${String(idPago).padStart(5, "0")}` : "Plan de Cuotas"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Barra de progreso */}
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="w-28 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--alt-input-bg)", border: "1px solid var(--alt-card-border)" }}
              >
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${cuotas.length > 0 ? (cuotasPagadas / cuotas.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
                {cuotas.length > 0 ? Math.round((cuotasPagadas / cuotas.length) * 100) : 0}%
              </span>
            </div>

            {headerAction}

            <button
              type="button"
              onClick={() => setExpandido((p) => !p)}
              className="alt-btn alt-btn-secondary alt-btn-sm alt-btn-icon cursor-pointer"
              title={expandido ? "Contraer" : "Expandir"}
            >
              {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {expandido && (
          <div className="alt-card-body">
            {/* Resumen financiero: 4 Info Boxes AdminLTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b" style={{ borderColor: "var(--alt-card-border)", background: "rgba(0,0,0,0.15)" }}>
              <div className="alt-info-box">
                <div className="alt-info-box-icon c-blue">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-label">Total Plan</span>
                  <span className="alt-info-box-value">
                    <FormatearNumero numero={totalConEnganche || totalGuardado} />
                  </span>
                  <span className="alt-info-box-sub">Enganche + Cuotas</span>
                </div>
              </div>

              <div className="alt-info-box">
                <div className="alt-info-box-icon c-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-label">Enganche</span>
                  <span className="alt-info-box-value" style={{ color: "#4ade80" }}>
                    <FormatearNumero numero={enganchePlan} />
                  </span>
                  <span className="alt-info-box-sub">Pago inicial</span>
                </div>
              </div>

              <div className="alt-info-box">
                <div className="alt-info-box-icon c-orange">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-label">Pagado Cuotas</span>
                  <span className="alt-info-box-value" style={{ color: "#fb923c" }}>
                    <FormatearNumero numero={montoPagado} />
                  </span>
                  <span className="alt-info-box-sub">{cuotasPagadas} cuotas liquidadas</span>
                </div>
              </div>

              <div className="alt-info-box">
                <div className={`alt-info-box-icon ${montoPendiente > 0 ? "c-red" : "c-gray"}`}>
                  <Circle className="h-6 w-6" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-label">Saldo Pendiente</span>
                  <span className="alt-info-box-value" style={{ color: montoPendiente > 0 ? "#f87171" : "var(--alt-text-muted)" }}>
                    <FormatearNumero numero={montoPendiente} />
                  </span>
                  <span className="alt-info-box-sub">Por cobrar</span>
                </div>
              </div>
            </div>

            {/* Fila del método de enganche */}
            {enganchePlan > 0 && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b text-xs"
                style={{ borderColor: "var(--alt-card-border)", backgroundColor: "var(--alt-card-header)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: "var(--alt-text-muted)" }}>
                    MÉTODO DE PAGO DEL ENGANCHE:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={idMetodoEngancheSeleccionado || ""}
                    onChange={(e) => setIdMetodoEngancheSeleccionado(Number(e.target.value || 0))}
                    className="alt-select font-semibold"
                  >
                    <option value="">Seleccionar método</option>
                    {metodosPago.map((metodo) => (
                      <option key={metodo.id} value={metodo.id}>
                        {metodo.metodo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tabla de Cuotas AdminLTE */}
            <div className="overflow-x-auto">
              <table className="alt-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>Cuota</th>
                    <th style={{ width: "130px" }}>Estado</th>
                    <th style={{ width: "110px" }}>Monto Base</th>
                    <th style={{ width: "95px" }}>Interés (%)</th>
                    <th style={{ width: "110px" }}>Monto Final</th>
                    <th style={{ width: "130px" }}>Vencimiento</th>
                    <th style={{ minWidth: "140px" }}>Método</th>
                    <th style={{ minWidth: "140px" }}>Nota / Ref</th>
                    <th style={{ width: "140px" }}>Comprobante</th>
                    <th style={{ width: "50px" }} className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map((cuota, index) => {
                    const montoConInteres = cuota.monto;
                    const fechaPago = formatFechaPago(cuota.fechapago);
                    const esPagada = Number(cuota.pagado) === 1;
                    const esCancelada = Number(cuota.pagado) === 2;
                    const esPendiente = Number(cuota.pagado) === 0;

                    return (
                      <tr
                        key={`${cuota.idcuota}-${index}`}
                        style={{
                          opacity: esCancelada ? 0.6 : 1,
                          backgroundColor: esPagada ? "rgba(25, 135, 84, 0.05)" : undefined,
                        }}
                      >
                        {/* Cuota Badge */}
                        <td>
                          <span
                            className={`alt-badge ${
                              esCancelada
                                ? "alt-badge-gray"
                                : esPagada
                                ? "alt-badge-green"
                                : "alt-badge-orange"
                            }`}
                          >
                            #{index + 1}
                          </span>
                        </td>

                        {/* Estado / Toggle */}
                        <td>
                          {esCancelada ? (
                            <span className="alt-badge alt-badge-gray">Cancelada</span>
                          ) : (
                            <button
                              type="button"
                              title={
                                cuotaEstaBloqueada(cuota)
                                  ? "Esta cuota pagada ya no se puede modificar"
                                  : esPagada
                                  ? "Marcar como pendiente"
                                  : "Marcar como pagada"
                              }
                              onClick={() => handleTogglePagado(index)}
                              disabled={cuotaEstaBloqueada(cuota)}
                              className={`alt-btn alt-btn-sm ${
                                esPagada ? "alt-btn-success" : "alt-btn-secondary"
                              } flex items-center gap-1 cursor-pointer`}
                            >
                              {esPagada ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>Pagada</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="h-3.5 w-3.5 opacity-50" />
                                  <span>Pendiente</span>
                                </>
                              )}
                            </button>
                          )}
                          {esPagada && fechaPago && (
                            <div className="text-[10px] mt-0.5" style={{ color: "var(--alt-text-muted)" }}>
                              {fechaPago}
                            </div>
                          )}
                        </td>

                        {/* Monto Base */}
                        <td>
                          <div className="relative">
                            <span
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
                              style={{ color: "var(--alt-text-muted)" }}
                            >
                              $
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={cuota.monto || ""}
                              placeholder="0.00"
                              onChange={(e) => handleCuotaChange(index, "monto", Number(e.target.value))}
                              disabled={!esPendiente}
                              className="alt-input pl-5 pr-2 py-1 text-xs w-full"
                            />
                          </div>
                        </td>

                        {/* Interés (%) */}
                        <td>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={cuota.interes || ""}
                              placeholder="0"
                              onChange={(e) => handleCuotaChange(index, "interes", Number(e.target.value))}
                              disabled={!esPendiente}
                              className="alt-input pr-5 pl-2 py-1 text-xs w-full"
                            />
                            <span
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                              style={{ color: "var(--alt-text-muted)" }}
                            >
                              %
                            </span>
                          </div>
                        </td>

                        {/* Monto Final */}
                        <td>
                          <span
                            className={`font-mono font-bold text-xs ${
                              esCancelada
                                ? "line-through opacity-50"
                                : esPagada
                                ? "text-green-400"
                                : "text-orange-400"
                            }`}
                          >
                            <FormatearNumero numero={montoConInteres} />
                          </span>
                        </td>

                        {/* Vencimiento */}
                        <td>
                          <input
                            type="date"
                            value={cuota.vencimiento}
                            onChange={(e) => handleCuotaChange(index, "vencimiento", e.target.value)}
                            disabled={!esPendiente}
                            className="alt-input py-1 text-xs w-full"
                          />
                        </td>

                        {/* Método de Pago */}
                        <td>
                          <select
                            value={cuota.idmetodo || ""}
                            disabled={cuotaEstaBloqueada(cuota)}
                            onChange={(e) => {
                              const idmetodo = Number(e.target.value);
                              const metodo = metodosPago.find((item) => item.id === idmetodo)?.metodo || "";
                              handleCuotaChange(index, "idmetodo", idmetodo);
                              handleCuotaChange(index, "metodo", metodo);
                            }}
                            className="alt-select py-1 text-xs w-full"
                          >
                            <option value="">Seleccionar...</option>
                            {metodosPago.map((metodo) => (
                              <option key={metodo.id} value={metodo.id}>
                                {metodo.metodo}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Tipo / Nota */}
                        <td>
                          <input
                            value={cuota.nota || ""}
                            onChange={(e) => handleCuotaChange(index, "nota", e.target.value)}
                            disabled={cuotaEstaBloqueada(cuota)}
                            placeholder="Nota o Ref..."
                            className="alt-input uppercase py-1 text-xs w-full"
                          />
                        </td>

                        {/* Comprobante */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <label
                              className={`alt-btn alt-btn-secondary alt-btn-sm cursor-pointer flex items-center gap-1 ${
                                cuotaEstaBloqueada(cuota) ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              <Upload className="h-3 w-3" />
                              <span>Subir</span>
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
                                className="alt-btn alt-btn-secondary alt-btn-sm flex items-center gap-1 text-green-400"
                                title="Descargar comprobante"
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Eliminar Cuota */}
                        <td className="text-center">
                          <button
                            type="button"
                            title={
                              esCancelada
                                ? "Cuota cancelada por falta de pago"
                                : esPagada
                                ? "No se puede eliminar una cuota pagada"
                                : "Eliminar cuota y redistribuir saldo"
                            }
                            onClick={() => eliminarCuota(index)}
                            disabled={esPagada || esCancelada}
                            className="alt-btn alt-btn-danger alt-btn-sm alt-btn-icon cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Aviso Cuota Pagada */}
            {avisoCuotaPagada && (
              <div className="m-4">
                <div className="alt-notice alt-notice-info">
                  <span>{avisoCuotaPagada}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="m-4">
                <div className="alt-notice alt-notice-error">
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Footer Toolbar */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 p-3 border-t"
              style={{ borderColor: "var(--alt-card-border)", backgroundColor: "var(--alt-card-header)" }}
            >
              <button
                type="button"
                onClick={agregarCuota}
                className="alt-btn alt-btn-secondary alt-btn-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Cuota</span>
              </button>

              <button
                type="button"
                onClick={handleGuardar}
                disabled={loading}
                className="alt-btn alt-btn-primary alt-btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Actualizar Plan de Pagos</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmación con estilo AdminLTE */}
        {confirmacionVisible && (
          <div className="alt-modal-overlay">
            <div className="alt-modal max-w-sm w-full">
              <div className="alt-modal-header">
                <div className="alt-modal-title flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Plan Actualizado</span>
                </div>
              </div>
              <div className="alt-modal-body text-center space-y-2 py-4">
                <p className="text-xs" style={{ color: "var(--alt-text)" }}>
                  Los datos del plan de pagos se guardaron correctamente.
                </p>
              </div>
              <div className="alt-modal-footer">
                <button
                  type="button"
                  onClick={() => setConfirmacionVisible(false)}
                  className="alt-btn alt-btn-primary alt-btn-sm w-full justify-center"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
