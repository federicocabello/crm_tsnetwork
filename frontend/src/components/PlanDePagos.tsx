import { useState, useEffect } from "react";
import { CreditCard, Calendar, Percent, DollarSign, Hash, Plus, AlertTriangle, Repeat } from "lucide-react";
import FormatearNumero from "../components/FormatearNumero";
import Loading from "../components/Loading";

type Props = {
  idCliente: string;
  idCita: number;
  onGuardado?: () => void;
};

type MetodoPago = {
  id: number;
  metodo: string;
  color?: string;
};

type FrecuenciaCuotas = "mensual" | "quincenal" | "semanal";

type Cuota = {
  monto: number;
  interes: number;
  fecha_vencimiento: string;
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PlanDePagos({ idCliente, idCita, onGuardado }: Props) {
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [enganche, setEnganche] = useState<number>(0);
  const [idMetodoEnganche, setIdMetodoEnganche] = useState<number>(0);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [interesGlobal, setInteresGlobal] = useState<number>(0);
  const [numCuotas, setNumCuotas] = useState<number>(1);
  const [frecuenciaCuotas, setFrecuenciaCuotas] = useState<FrecuenciaCuotas>("mensual");
  const [primerVencimiento, setPrimerVencimiento] = useState<string>(() => formatDate(new Date()));
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [guardado, setGuardado] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [loading, setLoading] = useState(false);

  const saldoFinanciado = Math.max(montoTotal - enganche, 0);
  const engancheCubreTotal = montoTotal > 0 && Math.abs(enganche - montoTotal) < 0.01;
  const montoPorCuota = numCuotas > 0 && saldoFinanciado > 0
    ? Math.round((saldoFinanciado / numCuotas) * 100) / 100
    : 0;


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
  useEffect(() => {
    if (numCuotas < 1) {
      setCuotas([]);
      return;
    }
    if (!primerVencimiento) return;
    const fechaBase = parseDateKey(primerVencimiento);
    const nuevasCuotas: Cuota[] = Array.from({ length: numCuotas }, (_, i) => {
      const fecha = new Date(fechaBase);
      if (frecuenciaCuotas === "semanal") {
        fecha.setDate(fechaBase.getDate() + i * 7);
      } else if (frecuenciaCuotas === "quincenal") {
        fecha.setDate(fechaBase.getDate() + i * 15);
      } else {
        fecha.setMonth(fechaBase.getMonth() + i);
      }
      return {
        monto: montoPorCuota,
        interes: interesGlobal,
        fecha_vencimiento: formatDate(fecha),
      };
    });
    setCuotas(nuevasCuotas);
  }, [numCuotas, saldoFinanciado, interesGlobal, primerVencimiento, frecuenciaCuotas]);

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
    if (enganche < 0) {
      setErrorGuardar("El enganche no puede ser negativo.");
      return;
    }
    if (enganche > montoTotal) {
      setErrorGuardar("El enganche no puede ser mayor al monto total.");
      return;
    }
    if (numCuotas === 0 && !engancheCubreTotal) {
      setErrorGuardar("Solo puedes usar 0 cuotas cuando el enganche cubre la totalidad del pago.");
      return;
    }
    if (engancheCubreTotal && cuotas.length > 0) {
      setErrorGuardar("Si el enganche cubre el total, el numero de cuotas debe ser 0.");
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
          idMetodoEnganche: enganche > 0 ? idMetodoEnganche || null : null,
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
    <div className="w-full space-y-4">
      <div className="alt-card">
        <div className="alt-card-header">
          <div className="alt-card-header-title">
            <CreditCard className="h-4 w-4" style={{ color: "var(--alt-primary)" }} />
            <span>Configuración del Nuevo Plan de Pagos</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="alt-form-group m-0">
              <label className="alt-label">Monto total</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--alt-text-muted)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={montoTotal || ""}
                  placeholder="0.00"
                  onChange={(e) => setMontoTotal(Number(e.target.value))}
                  className="alt-input pl-6 pr-2 py-1.5 text-xs w-full"
                />
              </div>
            </div>

            <div className="alt-form-group m-0">
              <label className="alt-label">Enganche</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--alt-text-muted)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={enganche || ""}
                  placeholder="0.00"
                  onChange={(e) => setEnganche(Number(e.target.value))}
                  className="alt-input pl-6 pr-2 py-1.5 text-xs w-full"
                />
              </div>
            </div>

            <div className="alt-form-group m-0">
              <label className="alt-label">Método del Enganche</label>
              <select
                value={idMetodoEnganche || ""}
                onChange={(e) => setIdMetodoEnganche(Number(e.target.value))}
                disabled={enganche <= 0}
                className="alt-select py-1.5 text-xs w-full"
              >
                <option value="">Sin método</option>
                {metodosPago.map((metodo) => (
                  <option key={metodo.id} value={metodo.id}>
                    {metodo.metodo}
                  </option>
                ))}
              </select>
            </div>

            <div className="alt-form-group m-0">
              <label className="alt-label">Interés por Cuota (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={interesGlobal || ""}
                  placeholder="0"
                  onChange={(e) => setInteresGlobal(Number(e.target.value))}
                  className="alt-input pr-6 pl-2 py-1.5 text-xs w-full"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--alt-text-muted)" }}>%</span>
              </div>
            </div>

            <div className="alt-form-group m-0">
              <label className="alt-label">Nro de Cuotas</label>
              <input
                type="number"
                min={0}
                max={60}
                value={numCuotas}
                onChange={(e) => setNumCuotas(Math.max(0, Number(e.target.value)))}
                className="alt-input py-1.5 text-xs w-full"
              />
            </div>

            <div className="alt-form-group m-0">
              <label className="alt-label">Frecuencia</label>
              <select
                value={frecuenciaCuotas}
                onChange={(e) => setFrecuenciaCuotas(e.target.value as FrecuenciaCuotas)}
                className="alt-select py-1.5 text-xs w-full"
              >
                <option value="mensual">Mensuales</option>
                <option value="quincenal">Quincenales</option>
                <option value="semanal">Semanales</option>
              </select>
            </div>

            <div className="alt-form-group m-0">
              <label className="alt-label">Primer Vencimiento</label>
              <input
                type="date"
                value={primerVencimiento}
                onChange={(e) => setPrimerVencimiento(e.target.value)}
                className="alt-input py-1.5 text-xs w-full"
              />
            </div>
          </div>

          <div className="alt-notice alt-notice-info">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>El enganche se registra al crear el plan y no se puede modificar después.</span>
            </div>
          </div>

          {montoTotal > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-2.5 rounded border text-xs flex justify-between items-center" style={{ backgroundColor: "var(--alt-card-header)", borderColor: "var(--alt-card-border)" }}>
                <span style={{ color: "var(--alt-text-muted)" }}>Saldo para cuotas:</span>
                <span className="font-bold text-white"><FormatearNumero numero={saldoFinanciado} /></span>
              </div>
              <div className="p-2.5 rounded border text-xs flex justify-between items-center" style={{ backgroundColor: "var(--alt-card-header)", borderColor: "var(--alt-card-border)" }}>
                <span style={{ color: "var(--alt-text-muted)" }}>Total con interés:</span>
                <span className="font-bold text-orange-400"><FormatearNumero numero={totalConEnganche} /></span>
              </div>
              <div className="p-2.5 rounded border text-xs flex justify-between items-center" style={{ backgroundColor: "var(--alt-card-header)", borderColor: "var(--alt-card-border)" }}>
                <span style={{ color: "var(--alt-text-muted)" }}>Base por cuota:</span>
                <span className="font-bold text-white"><FormatearNumero numero={montoPorCuota} /></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {cuotas.length > 0 && (
        <div className="alt-card">
          <div className="alt-card-header">
            <span className="alt-card-header-title text-sm">Cuotas Generadas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="alt-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Monto Base</th>
                  <th>Interés (%)</th>
                  <th>Monto con Interés</th>
                  <th>Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((cuota, index) => {
                  const montoConInteres = cuota.monto + (cuota.monto * cuota.interes) / 100;
                  return (
                    <tr key={index}>
                      <td>
                        <span className="alt-badge alt-badge-orange">#{index + 1}</span>
                      </td>
                      <td>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--alt-text-muted)" }}>$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={cuota.monto || ""}
                            placeholder="0.00"
                            onChange={(e) => handleMontoChange(index, Number(e.target.value))}
                            className="alt-input pl-5 pr-2 py-1 text-xs w-full max-w-[130px]"
                          />
                        </div>
                      </td>
                      <td>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={cuota.interes || ""}
                            placeholder="0"
                            onChange={(e) => handleInteresChange(index, Number(e.target.value))}
                            className="alt-input pr-5 pl-2 py-1 text-xs w-full max-w-[90px]"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--alt-text-muted)" }}>%</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono font-bold text-xs text-orange-400">
                          <FormatearNumero numero={montoConInteres} />
                        </span>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={cuota.fecha_vencimiento}
                          onChange={(e) => handleFechaChange(index, e.target.value)}
                          className="alt-input py-1 text-xs w-full max-w-[150px]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t" style={{ borderColor: "var(--alt-card-border)", backgroundColor: "var(--alt-card-header)" }}>
            <div className="text-xs">
              <span style={{ color: "var(--alt-text-muted)" }}>Total real:</span>
              <span className={`ml-2 text-sm font-bold ${Math.abs(diferencia) < 0.01 ? "text-green-400" : "text-orange-400"}`}>
                <FormatearNumero numero={totalConEnganche} />
              </span>
            </div>

            <button
              onClick={handleGuardar}
              className={`alt-btn ${guardado ? "alt-btn-success" : "alt-btn-primary"} alt-btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{guardado ? "Guardado con éxito" : "Guardar Plan de Pagos"}</span>
            </button>
          </div>
        </div>
      )}

      {errorGuardar && (
        <div className="alt-notice alt-notice-error">
          <span>{errorGuardar}</span>
        </div>
      )}

      {cuotas.length === 0 && (
        <div className="alt-card p-8 text-center space-y-2">
          <CreditCard className="h-8 w-8 mx-auto opacity-30" style={{ color: "var(--alt-primary)" }} />
          <p className="text-xs" style={{ color: "var(--alt-text-muted)" }}>
            {engancheCubreTotal && numCuotas === 0
              ? "El pago se registrará completo mediante el enganche."
              : "Ingresa un monto y cuotas para comenzar a configurar el plan."}
          </p>
          {engancheCubreTotal && numCuotas === 0 && (
            <button
              onClick={handleGuardar}
              className={`alt-btn ${guardado ? "alt-btn-success" : "alt-btn-primary"} alt-btn-sm mx-auto mt-3 flex items-center gap-1.5 cursor-pointer`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{guardado ? "Guardado" : "Guardar pago completo"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
