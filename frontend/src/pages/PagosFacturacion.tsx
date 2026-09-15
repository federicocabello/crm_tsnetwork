import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileDown,
  FileText,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Wallet,
  X,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Calendar,
} from "lucide-react";

import Loading from "../components/Loading";
import { api, ApiError } from "../lib/api";

// ==========================================
// Tipos
// ==========================================

type Resumen = {
  pagadas_mes?: { total: number; cuotas?: number; enganches?: number };
  cuotas_del_mes?: Movimiento[];
  proximos_vencimientos?: Movimiento[];
  deuda_por_cliente?: { id: number; nombre: string; deuda_total: number }[];
};

type Movimiento = {
  movimiento_id?: number;
  id?: number;
  factura_id?: number;
  numero_factura?: string;
  cliente_id: number;
  cliente_nombre: string;
  telefono?: string;
  fecha_emision?: string;
  vencimiento: string;
  fecha_pago?: string | null;
  fechapago?: string | null;
  monto: number;
  interes?: number;
  saldo?: number;
  pagado?: number;
  estado?: "pendiente" | "vencida" | "pagada";
  metodo_id?: number;
  metodo_nombre?: string | null;
  metodo_color?: string | null;
  nota?: string;
  comprobante?: string | null;
  origen?: "manual" | "recurrente";
  concepto?: string | null;
};

type RespuestaMovimientos = {
  items: Movimiento[];
  pagina: number;
  paginas: number;
  por_pagina: number;
  total: number;
};

type Recurrente = {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  concepto: string;
  monto: number;
  dia_vencimiento: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  proxima_generacion: string;
  metodo_id: number | null;
  metodo_nombre: string | null;
  activa: number;
  facturas_generadas: number;
  ultimo_periodo: string | null;
  ultima_factura_id: number | null;
  ultimo_numero_factura: string | null;
};

type Metodo = { id: number; metodo: string; color?: string };
type Cliente = { id: number; nombre: string; telefono?: string };

type FacturaDetalle = {
  id: number;
  numero_factura: string;
  cliente_id: number;
  cliente_nombre: string;
  telefono?: string;
  fecha_emision: string;
  total: number;
  enganche: number;
  origen: "manual" | "recurrente";
  concepto?: string | null;
  cuotas: Array<{
    id: number;
    monto: number;
    interes: number;
    pagado: number;
    vencimiento: string;
    fecha_pago: string | null;
    metodo_nombre?: string | null;
    metodo_color?: string | null;
    nota?: string;
    comprobante?: string | null;
  }>;
};

type Pestana = "facturas" | "pagos" | "recurrentes" | "resumen";
type Estado = "todos" | "pendiente" | "vencida" | "pagada";
type Origen = "todos" | "manual" | "recurrente";

const hoy = new Date();
const mesInicial = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

// Por defecto: últimas facturas (los últimos 3 meses hasta hoy)
const hace3meses = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
const desdeInicial = `${hace3meses.getFullYear()}-${String(hace3meses.getMonth() + 1).padStart(2, "0")}-01`;
const hastaInicial = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const fechaInicial = hastaInicial;

// ==========================================
// Helpers
// ==========================================

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

function fecha(valor?: string | null) {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return "—";
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function iniciales(nombre: string) {
  return (nombre || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function estadoMovimiento(item: Movimiento) {
  if (Number(item.pagado) === 1) return "pagada";
  return item.vencimiento < fechaInicial ? "vencida" : "pendiente";
}

// ==========================================
// Componente Principal
// ==========================================

export default function PagosFacturacion() {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const url = useCallback((ruta: string) => `${base}${ruta}`, [base]);
  const [parametrosUrl, setParametrosUrl] = useSearchParams();

  // Navegación
  const [pestana, setPestana] = useState<Pestana>("facturas");
  const [mes] = useState(mesInicial);
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [movimientos, setMovimientos] = useState<RespuestaMovimientos>({
    items: [],
    pagina: 1,
    paginas: 1,
    por_pagina: 10,
    total: 0,
  });
  const [recurrentes, setRecurrentes] = useState<Recurrente[]>([]);
  const [metodos, setMetodos] = useState<Metodo[]>([]);

  // Filtros
  const [cargando, setCargando] = useState(true);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [query, setQuery] = useState("");
  const [queryAplicada, setQueryAplicada] = useState("");
  const [estado, setEstado] = useState<Estado>("todos");
  const [origen, setOrigen] = useState<Origen>("todos");
  const [metodo, setMetodo] = useState("");
  const [pagina, setPagina] = useState(1);

  // Modales
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<FacturaDetalle | null>(null);
  const [modalRecurrente, setModalRecurrente] = useState(false);
  const [modalPagoRapido, setModalPagoRapido] = useState<Movimiento | null>(
    null,
  );
  const [aviso, setAviso] = useState("");

  const clienteFiltroId = Number(parametrosUrl.get("cliente") || 0) || null;
  const clienteFiltroNombre =
    parametrosUrl.get("nombre") ||
    movimientos.items[0]?.cliente_nombre ||
    (clienteFiltroId ? `Cliente #${clienteFiltroId}` : "");

  // Debounce búsqueda
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQueryAplicada(query.trim());
      setPagina(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  // Cargar resumen
  const cargarResumen = useCallback(async () => {
    try {
      const [sel, metodosResp] = await Promise.all([
        fetch(url(`/api/pagos/resumen?mes=${mes}&tipo=vencimiento`)),
        fetch(url("/api/pagos/metodos")),
      ]);
      if (!sel.ok) throw new Error("No se pudo cargar el resumen");
      setResumen(await sel.json());
      if (metodosResp.ok) setMetodos(await metodosResp.json());
    } catch (err) {
      console.error(err);
    }
  }, [mes, url]);

  // Cargar movimientos
  const cargarMovimientos = useCallback(async () => {
    if (pestana !== "facturas" && pestana !== "pagos") return;
    setCargandoLista(true);
    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        por_pagina: "10",
        vista: pestana,
        estado: pestana === "pagos" ? "pagada" : estado,
        origen,
      });

      if (pestana === "facturas") {
        if (clienteFiltroId) {
          params.set("cliente_id", String(clienteFiltroId));
          params.set("todos_periodos", "1");
        } else {
          params.set("desde", desde);
          params.set("hasta", hasta);
        }
      } else {
        params.set("mes", mes);
      }
      if (queryAplicada) params.set("q", queryAplicada);
      if (metodo) params.set("metodo", metodo);

      const resp = await fetch(url(`/api/facturacion/movimientos?${params}`));
      const payload = await resp.json();
      if (!resp.ok) throw new Error(payload.error || "Error al cargar");
      setMovimientos(payload);
    } catch (error) {
      setAviso(
        error instanceof Error ? error.message : "Error al cargar facturación",
      );
    } finally {
      setCargandoLista(false);
    }
  }, [
    clienteFiltroId,
    desde,
    estado,
    hasta,
    mes,
    metodo,
    origen,
    pagina,
    pestana,
    queryAplicada,
    url,
  ]);

  // Cargar recurrentes
  const cargarRecurrentes = useCallback(async () => {
    if (pestana !== "recurrentes") return;
    setCargandoLista(true);
    try {
      const resp = await fetch(url("/api/facturacion/recurrentes"));
      const payload = await resp.json();
      if (!resp.ok) throw new Error(payload.error);
      setRecurrentes(payload);
    } catch (error) {
      setAviso(
        error instanceof Error ? error.message : "Error al cargar recurrentes",
      );
    } finally {
      setCargandoLista(false);
    }
  }, [pestana, url]);

  useEffect(() => {
    setCargando(true);
    cargarResumen().finally(() => setCargando(false));
  }, [cargarResumen]);

  useEffect(() => void cargarMovimientos(), [cargarMovimientos]);
  useEffect(() => void cargarRecurrentes(), [cargarRecurrentes]);

  useEffect(() => {
    if (!detalleId) {
      setDetalle(null);
      return;
    }
    fetch(url(`/api/facturacion/facturas/${detalleId}`))
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw new Error(p.error || "Error");
        setDetalle(p);
      })
      .catch((e) => {
        setAviso(e instanceof Error ? e.message : "Error al cargar factura");
        setDetalleId(null);
      });
  }, [detalleId, url]);

  const limpiarCliente = () => {
    setParametrosUrl({}, { replace: true });
    setPagina(1);
  };

  const alternarRecurrencia = async (item: Recurrente) => {
    try {
      await api(`/api/facturacion/recurrentes/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !Number(item.activa) }),
      });
      setAviso(
        Number(item.activa)
          ? "Cobro recurrente pausado"
          : "Cobro recurrente reactivado",
      );
      await cargarRecurrentes();
    } catch (error) {
      setAviso(
        error instanceof ApiError ? error.message : "Error al actualizar",
      );
    }
  };

  const generarPendientes = async () => {
    setCargandoLista(true);
    try {
      const res = await api<{ cantidad: number }>(
        "/api/facturacion/recurrentes/generar",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      setAviso(
        res.cantidad
          ? `¡Éxito! Se generaron ${res.cantidad} factura(s).`
          : "Todo al día: no había facturas pendientes.",
      );
      await Promise.all([
        cargarResumen(),
        cargarRecurrentes(),
        cargarMovimientos(),
      ]);
    } catch (error) {
      setAviso(
        error instanceof ApiError ? error.message : "Error al generar facturas",
      );
    } finally {
      setCargandoLista(false);
    }
  };

  const descargarPdf = (id: number, numero: string) => {
    const a = document.createElement("a");
    a.href = `${base}/api/facturacion/facturas/${id}/pdf`;
    a.download = `${numero}.pdf`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cálculos de métricas para resumen
  const cuotasMes = resumen?.cuotas_del_mes || [];
  const vencidasMes = cuotasMes.filter(
    (i) => Number(i.pagado) === 0 && i.vencimiento < fechaInicial,
  );
  const deudaTotal = (resumen?.deuda_por_cliente || []).reduce(
    (t, c) => t + Number(c.deuda_total),
    0,
  );

  if (cargando && !resumen) return <Loading />;

  return (
    <div
      className="flex flex-col w-full rounded-2xl border border-white/10 bg-[#0d0d12] text-white shadow-2xl shadow-black/40 overflow-hidden">
      {/* ── TOP BAR ─────────────────────────────────── */}
      <header
        className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "#0a0a10",
        }}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
            Facturación y Cobranza
          </h1>
          {cargandoLista && (
            <LoaderCircle
              className="h-3.5 w-3.5 animate-spin"
              style={{ color: "#f97316" }}
            />
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={generarPendientes}
            disabled={cargandoLista}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 transition-all hover:bg-white/10 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
            }}>
            <RefreshCw
              className={`h-3.5 w-3.5 ${cargandoLista ? "animate-spin" : ""}`}
              style={{ color: "#f97316" }}
            />
            <span className="hidden sm:inline">Generar Pendientes</span>
          </button>

          <button
            onClick={() => setModalRecurrente(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-black cursor-pointer transition-all hover:brightness-110 active:scale-95"
            style={{ background: "#f97316", color: "#fff" }}>
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo Recurrente</span>
          </button>
        </div>
      </header>

      {/* ── TABS ────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center overflow-x-auto no-scrollbar px-3 sm:px-6"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "#0a0a10",
        }}>
        {(
          [
            {
              id: "facturas",
              label: "Facturas",
              icon: <FileText className="h-3.5 w-3.5" />,
            },
            {
              id: "pagos",
              label: "Fact. Pagadas",
              icon: <ReceiptText className="h-3.5 w-3.5" />,
            },
            {
              id: "recurrentes",
              label: "Recurrentes",
              icon: <RefreshCw className="h-3.5 w-3.5" />,
            },
            {
              id: "resumen",
              label: "Resumen",
              icon: <Wallet className="h-3.5 w-3.5" />,
            },
          ] as { id: Pestana; label: string; icon: React.ReactNode }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setPestana(tab.id);
              setPagina(1);
            }}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
            style={{
              color: pestana === tab.id ? "#fff" : "rgba(255,255,255,0.38)",
              borderBottom:
                pestana === tab.id
                  ? "2px solid #f97316"
                  : "2px solid transparent",
            }}>
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── BARRA DE FILTROS (solo Facturas / Pagos) ── */}
      {(pestana === "facturas" || pestana === "pagos") && (
        <div
          className="shrink-0 flex flex-wrap items-center gap-2 sm:gap-3 px-3.5 sm:px-6 py-2.5 sm:py-3"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.015)",
          }}>
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px] sm:flex-initial sm:w-56">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
              style={{ color: "rgba(255,255,255,0.28)" }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente, N.º factura..."
              className="w-full pl-9 pr-8 py-2 rounded-lg text-xs outline-none transition-all focus:border-orange-500/60"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#fff",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Separador */}
          <div
            className="hidden md:block h-5 w-px"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />

          {/* Rango de fechas — solo en Facturas sin filtro de cliente */}
          {pestana === "facturas" && !clienteFiltroId && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5">
                <Calendar
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                />
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => {
                    setDesde(e.target.value);
                    setPagina(1);
                  }}
                  className="px-2.5 sm:px-3 py-2 rounded-lg text-xs text-white outline-none cursor-pointer max-w-[130px] sm:max-w-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                />
              </div>
              <span
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                —
              </span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setPagina(1);
                }}
                className="px-2.5 sm:px-3 py-2 rounded-lg text-xs text-white outline-none cursor-pointer max-w-[130px] sm:max-w-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              />
            </div>
          )}

          {/* Separador */}
          <div
            className="hidden md:block h-5 w-px"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />

          {/* Estado */}
          {pestana === "facturas" && (
            <div className="relative inline-flex items-center flex-1 sm:flex-initial min-w-[130px] sm:min-w-0">
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value as Estado);
                  setPagina(1);
                }}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-medium outline-none cursor-pointer transition-all hover:bg-white/[0.08] focus:border-orange-500/60"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}>
                <option
                  value="todos"
                  style={{ background: "#18181b", color: "#fafafa" }}>
                  Todos los estados
                </option>
                <option
                  value="pendiente"
                  style={{ background: "#18181b", color: "#fafafa" }}>
                  Pendiente
                </option>
                <option
                  value="vencida"
                  style={{ background: "#18181b", color: "#fafafa" }}>
                  Vencida
                </option>
                <option
                  value="pagada"
                  style={{ background: "#18181b", color: "#fafafa" }}>
                  Pagada
                </option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-2.5 text-white/40" />
            </div>
          )}

          {/* Origen */}
          <div className="relative inline-flex items-center flex-1 sm:flex-initial min-w-[130px] sm:min-w-0">
            <select
              value={origen}
              onChange={(e) => {
                setOrigen(e.target.value as Origen);
                setPagina(1);
              }}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-medium outline-none cursor-pointer transition-all hover:bg-white/[0.08] focus:border-orange-500/60"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}>
              <option
                value="todos"
                style={{ background: "#18181b", color: "#fafafa" }}>
                Todos los orígenes
              </option>
              <option
                value="recurrente"
                style={{ background: "#18181b", color: "#fafafa" }}>
                Recurrentes
              </option>
              <option
                value="manual"
                style={{ background: "#18181b", color: "#fafafa" }}>
                Manuales
              </option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-2.5 text-white/40" />
          </div>

          {/* Método de pago */}
          <div className="relative inline-flex items-center flex-1 sm:flex-initial min-w-[130px] sm:min-w-0">
            <select
              value={metodo}
              onChange={(e) => {
                setMetodo(e.target.value);
                setPagina(1);
              }}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-medium outline-none cursor-pointer transition-all hover:bg-white/[0.08] focus:border-orange-500/60"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
              }}>
              <option
                value=""
                style={{ background: "#18181b", color: "#fafafa" }}>
                Forma de pago
              </option>
              {metodos.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  style={{ background: "#18181b", color: "#fafafa" }}>
                  {m.metodo}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-2.5 text-white/40" />
          </div>

          {/* Conteo al final */}
          <span
            className="w-full sm:w-auto sm:ml-auto text-right text-[11px] sm:text-xs pt-1 sm:pt-0"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {movimientos.total} resultado(s)
          </span>
        </div>
      )}

      {/* ── BANNER CLIENTE FILTRADO ──────────────────── */}
      {clienteFiltroId && pestana === "facturas" && (
        <div
          className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2"
          style={{
            background: "rgba(249,115,22,0.08)",
            borderBottom: "1px solid rgba(249,115,22,0.18)",
          }}>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "rgba(255,255,255,0.65)" }}>
            <span style={{ color: "#fb923c" }}>●</span>
            Filtrando por:{" "}
            <Link
              to={`/clientes/${clienteFiltroId}`}
              className="font-black uppercase hover:underline"
              style={{ color: "#fff" }}>
              {clienteFiltroNombre}
            </Link>
          </div>
          <button
            onClick={limpiarCliente}
            className="flex items-center gap-1 text-xs font-bold cursor-pointer hover:text-white"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="h-3 w-3" /> Quitar filtro
          </button>
        </div>
      )}

      {/* ── AVISO ───────────────────────────────────── */}
      {aviso && (
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5"
          style={{
            background: "rgba(249,115,22,0.1)",
            borderBottom: "1px solid rgba(249,115,22,0.18)",
          }}>
          <div
            className="flex items-center gap-2 text-xs font-medium"
            style={{ color: "#fed7aa" }}>
            <Sparkles
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "#f97316" }}
            />
            {aviso}
          </div>
          <button
            onClick={() => setAviso("")}
            className="cursor-pointer p-0.5 hover:text-white"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── CONTENIDO ───────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {pestana === "resumen" && (
          <ResumenTab
            resumen={resumen}
            vencidasCantidad={vencidasMes.length}
            deudaTotal={deudaTotal}
          />
        )}

        {(pestana === "facturas" || pestana === "pagos") && (
          <TablaMovimientos
            pestana={pestana}
            respuesta={movimientos}
            cargando={cargandoLista}
            setPagina={setPagina}
            abrirDetalle={setDetalleId}
            abrirPagoRapido={setModalPagoRapido}
            descargarPdf={descargarPdf}
          />
        )}

        {pestana === "recurrentes" && (
          <TabRecurrentes
            items={recurrentes}
            cargando={cargandoLista}
            query={queryAplicada}
            abrirModal={() => setModalRecurrente(true)}
            alternar={alternarRecurrencia}
            abrirDetalle={setDetalleId}
            descargarPdf={descargarPdf}
          />
        )}
      </div>

      {/* ── MODALES ─────────────────────────────────── */}
      {detalleId && (
        <DrawerDetalle
          detalle={detalle}
          metodos={metodos}
          cerrar={() => setDetalleId(null)}
          onActualizado={async () => {
            await Promise.all([
              cargarMovimientos(),
              cargarResumen(),
              detalleId
                ? fetch(url(`/api/facturacion/facturas/${detalleId}`))
                    .then((r) => (r.ok ? r.json() : null))
                    .then(setDetalle)
                    .catch(() => {})
                : null,
            ]);
          }}
        />
      )}

      {modalRecurrente && (
        <ModalRecurrente
          url={url}
          metodos={metodos}
          cerrar={() => setModalRecurrente(false)}
          guardado={async (mensaje) => {
            setModalRecurrente(false);
            setAviso(mensaje);
            setPestana("recurrentes");
            await Promise.all([
              cargarRecurrentes(),
              cargarResumen(),
              cargarMovimientos(),
            ]);
          }}
        />
      )}

      {modalPagoRapido && (
        <ModalPago
          movimiento={modalPagoRapido}
          metodos={metodos}
          cerrar={() => setModalPagoRapido(null)}
          onActualizado={async () => {
            setModalPagoRapido(null);
            setAviso("Pago registrado correctamente");
            await Promise.all([cargarMovimientos(), cargarResumen()]);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// Componente: Tabla de Facturas / Pagos
// ==========================================

function TablaMovimientos({
  pestana,
  respuesta,
  cargando,
  setPagina,
  abrirDetalle,
  abrirPagoRapido,
  descargarPdf,
}: {
  pestana: "facturas" | "pagos";
  respuesta: RespuestaMovimientos;
  cargando: boolean;
  setPagina: (p: number) => void;
  abrirDetalle: (id: number) => void;
  abrirPagoRapido: (m: Movimiento) => void;
  descargarPdf: (id: number, num: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {/* ── VISTA MÓVIL (< 640px) ────────────────────── */}
      <div className={`sm:hidden flex flex-col divide-y divide-white/[0.06] ${cargando ? "opacity-40" : ""}`}>
        {respuesta.items.map((item) => {
          const itemEstado = item.estado || estadoMovimiento(item);
          const facturaId = item.factura_id || item.id || 0;
          const numeroFac =
            item.numero_factura ||
            `FAC-${String(facturaId).padStart(6, "0")}`;

          return (
            <div
              key={item.movimiento_id || item.id}
              className="p-4 space-y-3 transition-colors hover:bg-white/[0.02]">
              {/* Fila superior: Factura # + Tipo + Estado */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => facturaId && abrirDetalle(facturaId)}
                    className="font-mono text-xs font-black hover:underline cursor-pointer"
                    style={{ color: "#fb923c" }}>
                    {numeroFac}
                  </button>
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase"
                    style={
                      item.origen === "recurrente"
                        ? {
                            background: "rgba(167,139,250,0.15)",
                            color: "#c4b5fd",
                          }
                        : {
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }>
                    {item.origen === "recurrente" ? "Recurrente" : "Manual"}
                  </span>
                </div>
                <EstadoBadge estado={itemEstado} />
              </div>

              {/* Cliente */}
              <div className="flex items-center gap-2.5">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.7)",
                  }}>
                  {iniciales(item.cliente_nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/clientes/${item.cliente_id}`}
                    className="font-bold uppercase text-xs block truncate hover:underline text-white">
                    {item.cliente_nombre}
                  </Link>
                  {item.telefono && (
                    <span className="text-[10px] text-white/40 block truncate">
                      {item.telefono}
                    </span>
                  )}
                </div>
              </div>

              {/* Datos financieros en grid */}
              <div
                className="grid grid-cols-2 gap-2 p-2.5 rounded-lg text-xs"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}>
                <div>
                  <span className="text-[10px] text-white/35 block uppercase font-bold">
                    {pestana === "pagos" ? "Fecha Pago" : "Vencimiento"}
                  </span>
                  <span
                    className="font-bold text-xs"
                    style={{
                      color:
                        pestana === "pagos"
                          ? "#34d399"
                          : itemEstado === "vencida"
                            ? "#f87171"
                            : "rgba(255,255,255,0.75)",
                    }}>
                    {pestana === "pagos"
                      ? fecha(item.fecha_pago || item.fechapago)
                      : fecha(item.vencimiento)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-white/35 block uppercase font-bold">
                    Monto Total
                  </span>
                  <span className="font-black text-sm text-white">
                    {dinero(item.monto)}
                  </span>
                </div>

                {Number(item.saldo) > 0 && (
                  <div className="col-span-2 flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <span className="text-[10px] text-white/35 uppercase font-bold">
                      Saldo Pendiente
                    </span>
                    <span className="font-black text-xs" style={{ color: "#fbbf24" }}>
                      {dinero(item.saldo)}
                    </span>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-0.5">
                {itemEstado !== "pagada" && (
                  <button
                    onClick={() => abrirPagoRapido(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all active:scale-95 hover:brightness-110"
                    style={{ background: "#059669", color: "#fff" }}>
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    <span>Cobrar</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    facturaId && descargarPdf(facturaId, numeroFac)
                  }
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:bg-white/10"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fb923c",
                  }}
                  title="Descargar PDF">
                  <FileDown className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => facturaId && abrirDetalle(facturaId)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:bg-white/10 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.85)",
                  }}>
                  Detalle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── VISTA ESCRITORIO / TABLET (≥ 640px) ───────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                "N.º Factura",
                "Cliente",
                "Tipo",
                "Emisión",
                pestana === "pagos" ? "Fecha Pago" : "Vencimiento",
                "Total",
                "Saldo",
                "Estado",
                "",
              ].map((col) => (
                <th
                  key={col}
                  className="px-4 lg:px-5 py-3 font-bold uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.28)", fontSize: "10px" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cargando ? "opacity-40" : ""}>
            {respuesta.items.map((item) => {
              const itemEstado = item.estado || estadoMovimiento(item);
              const facturaId = item.factura_id || item.id || 0;
              const numeroFac =
                item.numero_factura ||
                `FAC-${String(facturaId).padStart(6, "0")}`;

              return (
                <tr
                  key={item.movimiento_id || item.id}
                  className="group transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.025)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }>
                  {/* N.º Factura */}
                  <td className="px-4 lg:px-5 py-4">
                    <button
                      onClick={() => facturaId && abrirDetalle(facturaId)}
                      className="font-mono font-bold hover:underline cursor-pointer"
                      style={{ color: "#fb923c" }}>
                      {numeroFac}
                    </button>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 lg:px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.55)",
                        }}>
                        {iniciales(item.cliente_nombre)}
                      </div>
                      <div>
                        <Link
                          to={`/clientes/${item.cliente_id}`}
                          className="font-bold uppercase block hover:underline"
                          style={{ color: "#fff", fontSize: "11px" }}>
                          {item.cliente_nombre}
                        </Link>
                        {item.telefono && (
                          <span
                            style={{
                              color: "rgba(255,255,255,0.32)",
                              fontSize: "10px",
                            }}>
                            {item.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 lg:px-5 py-4">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase"
                      style={
                        item.origen === "recurrente"
                          ? {
                              background: "rgba(167,139,250,0.15)",
                              color: "#c4b5fd",
                            }
                          : {
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.4)",
                            }
                      }>
                      {item.origen === "recurrente" ? "Recurrente" : "Manual"}
                    </span>
                  </td>

                  {/* Emisión */}
                  <td
                    className="px-4 lg:px-5 py-4"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    {fecha(item.fecha_emision)}
                  </td>

                  {/* Vencimiento / Pago */}
                  <td className="px-4 lg:px-5 py-4 font-bold">
                    {pestana === "pagos" ? (
                      <span style={{ color: "#34d399" }}>
                        {fecha(item.fecha_pago || item.fechapago)}
                      </span>
                    ) : (
                      <span
                        style={{
                          color:
                            itemEstado === "vencida"
                              ? "#f87171"
                              : "rgba(255,255,255,0.6)",
                        }}>
                        {fecha(item.vencimiento)}
                      </span>
                    )}
                  </td>

                  {/* Total */}
                  <td
                    className="px-4 lg:px-5 py-4 font-black text-sm"
                    style={{ color: "#fff" }}>
                    {dinero(item.monto)}
                  </td>

                  {/* Saldo */}
                  <td className="px-4 lg:px-5 py-4 font-bold">
                    {Number(item.saldo) > 0 ? (
                      <span style={{ color: "#fbbf24" }}>
                        {dinero(item.saldo)}
                      </span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.18)" }}>—</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 lg:px-5 py-4">
                    <EstadoBadge estado={itemEstado} />
                  </td>

                  {/* Acciones */}
                  <td className="px-4 lg:px-5 py-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      {itemEstado !== "pagada" && (
                        <button
                          onClick={() => abrirPagoRapido(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-black cursor-pointer transition-all active:scale-95 hover:brightness-110"
                          style={{ background: "#059669", color: "#fff" }}
                          title="Cobrar">
                          <CircleDollarSign className="h-3 w-3" />
                          <span>Cobrar</span>
                        </button>
                      )}
                      <button
                        onClick={() =>
                          facturaId && descargarPdf(facturaId, numeroFac)
                        }
                        className="p-1.5 rounded-md cursor-pointer transition-all hover:bg-white/10"
                        style={{ color: "rgba(255,255,255,0.32)" }}
                        title="PDF"
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#fb923c")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color =
                            "rgba(255,255,255,0.32)")
                        }>
                        <FileDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => facturaId && abrirDetalle(facturaId)}
                        className="px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.75)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.1)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color =
                            "rgba(255,255,255,0.75)";
                        }}>
                        Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!respuesta.items.length && !cargando && (
        <div
          className="py-16 sm:py-24 text-center text-xs sm:text-sm"
          style={{ color: "rgba(255,255,255,0.22)" }}>
          No se encontraron facturas con los filtros actuales.
        </div>
      )}

      {/* Paginación */}
      {respuesta.paginas > 1 && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t text-xs"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span style={{ color: "rgba(255,255,255,0.32)" }}>
            Página <strong style={{ color: "#fff" }}>{respuesta.pagina}</strong>{" "}
            de <strong style={{ color: "#fff" }}>{respuesta.paginas}</strong>
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              disabled={respuesta.pagina <= 1}
              onClick={() => setPagina(respuesta.pagina - 1)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-md font-bold disabled:opacity-30 cursor-pointer hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#fff",
              }}>
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              disabled={respuesta.pagina >= respuesta.paginas}
              onClick={() => setPagina(respuesta.pagina + 1)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-md font-bold disabled:opacity-30 cursor-pointer hover:bg-white/10"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#fff",
              }}>
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Componente: Badge de Estado
// ==========================================

function EstadoBadge({ estado }: { estado: string }) {
  const mapa: Record<string, { bg: string; color: string; dot: string }> = {
    pagada: { bg: "rgba(16,185,129,0.14)", color: "#34d399", dot: "#10b981" },
    vencida: { bg: "rgba(239,68,68,0.14)", color: "#f87171", dot: "#ef4444" },
    pendiente: {
      bg: "rgba(245,158,11,0.14)",
      color: "#fbbf24",
      dot: "#f59e0b",
    },
  };
  const s = mapa[estado] ?? mapa.pendiente;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase"
      style={{ background: s.bg, color: s.color }}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {estado}
    </span>
  );
}

// ==========================================
// Componente: Tab Cobros Recurrentes
// ==========================================

function TabRecurrentes({
  items,
  cargando,
  query,
  abrirModal,
  alternar,
  abrirDetalle,
  descargarPdf,
}: {
  items: Recurrente[];
  cargando: boolean;
  query: string;
  abrirModal: () => void;
  alternar: (item: Recurrente) => void;
  abrirDetalle: (id: number) => void;
  descargarPdf: (id: number, num: string) => void;
}) {
  const visibles = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        !q || `${i.cliente_nombre} ${i.concepto}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="flex flex-col">
      {/* Barra de acciones */}
      <div
        className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
          {visibles.length} suscripción(es)
        </span>
        <button
          onClick={abrirModal}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-black cursor-pointer hover:brightness-110 active:scale-95"
          style={{ background: "#f97316", color: "#fff" }}>
          <Plus className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Nuevo Recurrente</span><span className="xs:hidden">Nuevo</span>
        </button>
      </div>

      {/* ── VISTA MÓVIL RECURRENTES (< 640px) ───────── */}
      <div className={`sm:hidden flex flex-col divide-y divide-white/[0.06] ${cargando ? "opacity-40" : ""}`}>
        {visibles.map((item) => (
          <div
            key={item.id}
            className="p-4 space-y-3 transition-colors hover:bg-white/[0.02]"
            style={{ opacity: Number(item.activa) ? 1 : 0.55 }}>
            {/* Header: Cliente + Estado */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                  style={{
                    background: "rgba(167,139,250,0.12)",
                    color: "#c4b5fd",
                  }}>
                  {iniciales(item.cliente_nombre)}
                </div>
                <Link
                  to={`/clientes/${item.cliente_id}`}
                  className="font-bold uppercase text-xs truncate hover:underline text-white">
                  {item.cliente_nombre}
                </Link>
              </div>

              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase shrink-0"
                style={
                  Number(item.activa)
                    ? {
                        background: "rgba(16,185,129,0.14)",
                        color: "#34d399",
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.38)",
                      }
                }>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: Number(item.activa)
                      ? "#10b981"
                      : "rgba(255,255,255,0.3)",
                  }}
                />
                {Number(item.activa) ? "Activo" : "Pausado"}
              </span>
            </div>

            {/* Concepto & Monto */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-white/70 font-medium line-clamp-2">
                {item.concepto}
              </span>
              <span className="font-black text-sm shrink-0" style={{ color: "#f97316" }}>
                {dinero(item.monto)}
              </span>
            </div>

            {/* Datos clave en grid */}
            <div
              className="grid grid-cols-3 gap-2 p-2.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
              <div>
                <span className="text-[10px] text-white/35 block uppercase font-bold">
                  Vence
                </span>
                <span className="font-bold text-xs text-white/75">
                  día {item.dia_vencimiento}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/35 block uppercase font-bold">
                  Próx. Cobro
                </span>
                <span className="font-bold text-xs text-white/75">
                  {fecha(item.proxima_generacion)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/35 block uppercase font-bold">
                  Generadas
                </span>
                <span className="font-bold text-xs text-white/75">
                  {item.facturas_generadas}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                disabled={!item.ultima_factura_id}
                onClick={() =>
                  item.ultima_factura_id &&
                  descargarPdf(
                    item.ultima_factura_id,
                    item.ultimo_numero_factura ||
                      `FAC-${String(item.ultima_factura_id).padStart(6, "0")}`,
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/10"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fb923c",
                }}
                title="Descargar PDF">
                <FileDown className="h-3.5 w-3.5" />
                <span>PDF</span>
              </button>

              <button
                disabled={!item.ultima_factura_id}
                onClick={() =>
                  item.ultima_factura_id &&
                  abrirDetalle(item.ultima_factura_id)
                }
                className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/10 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.85)",
                }}>
                Detalle
              </button>

              <button
                onClick={() => alternar(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:bg-white/10 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: Number(item.activa) ? "rgba(255,255,255,0.6)" : "#34d399",
                }}>
                {Number(item.activa) ? (
                  <>
                    <Pause className="h-3 w-3" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" /> Reactivar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── VISTA ESCRITORIO RECURRENTES (≥ 640px) ───── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                "Cliente",
                "Concepto",
                "Monto / mes",
                "Día vence",
                "Próx. generación",
                "Generadas",
                "Estado",
                "",
              ].map((col) => (
                <th
                  key={col}
                  className="px-4 lg:px-5 py-3 font-bold uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.28)", fontSize: "10px" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cargando ? "opacity-40" : ""}>
            {visibles.map((item) => (
              <tr
                key={item.id}
                className="transition-colors"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  opacity: Number(item.activa) ? 1 : 0.5,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.025)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }>
                {/* Cliente */}
                <td className="px-4 lg:px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                      style={{
                        background: "rgba(167,139,250,0.12)",
                        color: "#c4b5fd",
                      }}>
                      {iniciales(item.cliente_nombre)}
                    </div>
                    <Link
                      to={`/clientes/${item.cliente_id}`}
                      className="font-bold uppercase hover:underline"
                      style={{ color: "#fff", fontSize: "11px" }}>
                      {item.cliente_nombre}
                    </Link>
                  </div>
                </td>

                {/* Concepto */}
                <td
                  className="px-4 lg:px-5 py-4"
                  style={{ color: "rgba(255,255,255,0.55)", maxWidth: 200 }}>
                  <span className="line-clamp-1">{item.concepto}</span>
                </td>

                {/* Monto */}
                <td
                  className="px-4 lg:px-5 py-4 font-black text-sm"
                  style={{ color: "#f97316" }}>
                  {dinero(item.monto)}
                </td>

                {/* Día vencimiento */}
                <td
                  className="px-4 lg:px-5 py-4 font-bold"
                  style={{ color: "rgba(255,255,255,0.6)" }}>
                  día {item.dia_vencimiento}
                </td>

                {/* Próxima generación */}
                <td
                  className="px-4 lg:px-5 py-4"
                  style={{ color: "rgba(255,255,255,0.55)" }}>
                  {fecha(item.proxima_generacion)}
                </td>

                {/* Facturas generadas */}
                <td
                  className="px-4 lg:px-5 py-4 font-bold"
                  style={{ color: "rgba(255,255,255,0.5)" }}>
                  {item.facturas_generadas}
                </td>

                {/* Estado */}
                <td className="px-4 lg:px-5 py-4">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase"
                    style={
                      Number(item.activa)
                        ? {
                            background: "rgba(16,185,129,0.14)",
                            color: "#34d399",
                          }
                        : {
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.38)",
                          }
                    }>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: Number(item.activa)
                          ? "#10b981"
                          : "rgba(255,255,255,0.3)",
                      }}
                    />
                    {Number(item.activa) ? "Activo" : "Pausado"}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-4 lg:px-5 py-4">
                  <div className="flex items-center gap-1.5 justify-end">
                    {/* PDF — solo si hay factura generada */}
                    <button
                      disabled={!item.ultima_factura_id}
                      onClick={() =>
                        item.ultima_factura_id &&
                        descargarPdf(
                          item.ultima_factura_id,
                          item.ultimo_numero_factura ||
                            `FAC-${String(item.ultima_factura_id).padStart(6, "0")}`,
                        )
                      }
                      className="p-1.5 rounded-md cursor-pointer transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.32)" }}
                      title={
                        item.ultima_factura_id
                          ? "Descargar PDF"
                          : "Sin factura generada aún"
                      }
                      onMouseEnter={(e) => {
                        if (item.ultima_factura_id)
                          e.currentTarget.style.color = "#fb923c";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.32)")
                      }>
                      <FileDown className="h-3.5 w-3.5" />
                    </button>

                    {/* Detalle — solo si hay factura generada */}
                    <button
                      disabled={!item.ultima_factura_id}
                      onClick={() =>
                        item.ultima_factura_id &&
                        abrirDetalle(item.ultima_factura_id)
                      }
                      className="px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.75)",
                      }}
                      title={
                        item.ultima_factura_id
                          ? "Ver detalle de última factura"
                          : "Sin factura generada aún"
                      }
                      onMouseEnter={(e) => {
                        if (item.ultima_factura_id) {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.1)";
                          e.currentTarget.style.color = "#fff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                      }}>
                      Detalle
                    </button>

                    {/* Separador */}
                    <div
                      className="h-4 w-px mx-0.5"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    />

                    {/* Pausar / Reactivar */}
                    <button
                      onClick={() => alternar(item)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all hover:bg-white/10 active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.55)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#fff")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                      }>
                      {Number(item.activa) ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {Number(item.activa) ? "Pausar" : "Reactivar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visibles.length && !cargando && (
        <div
          className="py-16 sm:py-24 text-center text-xs sm:text-sm"
          style={{ color: "rgba(255,255,255,0.22)" }}>
          No hay cobros recurrentes configurados.
        </div>
      )}
    </div>
  );
}

// ==========================================
// Componente: Resumen Financiero
// ==========================================

function ResumenTab({
  resumen,
  vencidasCantidad,
  deudaTotal,
}: {
  resumen: Resumen | null;
  vencidasCantidad: number;
  deudaTotal: number;
}) {
  const proximos = (resumen?.proximos_vencimientos || []).slice(0, 10);
  const deudas = (resumen?.deuda_por_cliente || []).slice(0, 10);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Resumen rápido en fila */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {[
          {
            label: "Cobrado (mes actual)",
            value: dinero(resumen?.pagadas_mes?.total),
            color: "#34d399",
          },
          {
            label: "Cuotas cobradas",
            value: `${resumen?.pagadas_mes?.cuotas || 0}`,
            color: "rgba(255,255,255,0.7)",
          },
          {
            label: "Facturas vencidas",
            value: `${vencidasCantidad}`,
            color: "#f87171",
          },
          {
            label: "Deuda total clientes",
            value: dinero(deudaTotal),
            color: "#f87171",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
            <div
              className="text-[10px] font-bold uppercase tracking-wider mb-1 truncate"
              style={{ color: "rgba(255,255,255,0.38)" }}
              title={s.label}>
              {s.label}
            </div>
            <div className="text-base sm:text-xl font-black truncate" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tablas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Próximos vencimientos */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <div
            className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}>
            <AlertCircle className="h-3.5 w-3.5" style={{ color: "#f97316" }} />
            <h2
              className="text-xs font-black uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.65)" }}>
              Próximos Vencimientos
            </h2>
          </div>
          <div>
            {proximos.length ? (
              proximos.map((item) => (
                <Link
                  key={item.id}
                  to={`/clientes/${item.cliente_id}`}
                  className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors block"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.025)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase text-white truncate">
                      {item.cliente_nombre}
                    </div>
                    <div
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.38)" }}>
                      Vence: {fecha(item.vencimiento)}
                    </div>
                  </div>
                  <span
                    className="font-black text-xs sm:text-sm shrink-0"
                    style={{ color: "#fb923c" }}>
                    {dinero(item.monto)}
                  </span>
                </Link>
              ))
            ) : (
              <div
                className="py-12 sm:py-14 text-center text-xs"
                style={{ color: "rgba(255,255,255,0.22)" }}>
                No hay vencimientos próximos.
              </div>
            )}
          </div>
        </div>

        {/* Clientes con mayor deuda */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          <div
            className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}>
            <Wallet className="h-3.5 w-3.5" style={{ color: "#f87171" }} />
            <h2
              className="text-xs font-black uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.65)" }}>
              Clientes con Mayor Deuda
            </h2>
          </div>
          <div>
            {deudas.length ? (
              deudas.map((item) => (
                <Link
                  key={item.id}
                  to={`/clientes/${item.id}`}
                  className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors block"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.025)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }>
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        color: "#f87171",
                      }}>
                      {iniciales(item.nombre)}
                    </div>
                    <span className="text-xs font-bold uppercase text-white truncate">
                      {item.nombre}
                    </span>
                  </div>
                  <span
                    className="font-black text-xs sm:text-sm shrink-0"
                    style={{ color: "#f87171" }}>
                    {dinero(item.deuda_total)}
                  </span>
                </Link>
              ))
            ) : (
              <div
                className="py-12 sm:py-14 text-center text-xs"
                style={{ color: "rgba(255,255,255,0.22)" }}>
                Sin clientes con deuda acumulada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Componente: Drawer Detalle Factura
// ==========================================

function DrawerDetalle({
  detalle,
  metodos,
  cerrar,
  onActualizado,
}: {
  detalle: FacturaDetalle | null;
  metodos: Metodo[];
  cerrar: () => void;
  onActualizado: () => Promise<void>;
}) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const [metodoId, setMetodoId] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (metodos.length > 0 && !metodoId) setMetodoId(String(metodos[0].id));
  }, [metodos, metodoId]);

  const todoPagado = Boolean(
    detalle &&
    detalle.cuotas.length > 0 &&
    detalle.cuotas.every((c) => Number(c.pagado) === 1),
  );

  const toggleFactura = async (pagar: boolean) => {
    if (!detalle) return;
    setGuardando(true);
    try {
      await api(`/api/facturacion/facturas/${detalle.id}/pagar`, {
        method: "POST",
        body: JSON.stringify({
          pagado: pagar,
          metodo_id: metodoId ? Number(metodoId) : null,
        }),
      });
      await onActualizado();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  };

  const toggleCuota = async (cuotaId: number, pagar: boolean) => {
    setGuardando(true);
    try {
      await api(`/api/facturacion/cuotas/${cuotaId}/pagar`, {
        method: "POST",
        body: JSON.stringify({
          pagado: pagar,
          metodo_id: metodoId ? Number(metodoId) : null,
        }),
      });
      await onActualizado();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  };

  const descargar = () => {
    if (!detalle) return;
    const a = document.createElement("a");
    a.href = `${base}/api/facturacion/facturas/${detalle.id}/pdf`;
    a.download = `${detalle.numero_factura}.pdf`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onMouseDown={cerrar}>
      <aside
        onMouseDown={(e) => e.stopPropagation()}
        className="h-full w-full sm:max-w-md overflow-y-auto"
        style={{
          background: "#0f0f17",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10"
          style={{
            background: "#0f0f17",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: "#f97316" }}>
              Detalle de Factura
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-mono">
              {detalle?.numero_factura || "Cargando..."}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {detalle && (
              <button
                onClick={descargar}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-orange-500/20"
                style={{
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "#fb923c",
                }}>
                <FileDown className="h-3.5 w-3.5" /> PDF
              </button>
            )}
            <button
              onClick={cerrar}
              className="p-1 cursor-pointer hover:text-white"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {detalle ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Info cliente */}
            <div
              className="rounded-xl p-3.5 sm:p-4 space-y-3.5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center font-black shrink-0"
                  style={{
                    background: "rgba(249,115,22,0.14)",
                    color: "#fb923c",
                  }}>
                  {iniciales(detalle.cliente_nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/clientes/${detalle.cliente_id}`}
                    className="font-black uppercase text-sm hover:underline block truncate"
                    style={{ color: "#fff" }}>
                    {detalle.cliente_nombre}
                  </Link>
                  <div
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "rgba(255,255,255,0.38)" }}>
                    {detalle.telefono || "Sin teléfono"}
                  </div>
                </div>
              </div>

              <div
                className="grid grid-cols-2 gap-3 text-xs pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div
                    className="text-[10px] uppercase font-bold mb-1"
                    style={{ color: "rgba(255,255,255,0.32)" }}>
                    Emisión
                  </div>
                  <div className="text-white font-bold">
                    {fecha(detalle.fecha_emision)}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase font-bold mb-1"
                    style={{ color: "rgba(255,255,255,0.32)" }}>
                    Origen
                  </div>
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase"
                    style={
                      detalle.origen === "recurrente"
                        ? {
                            background: "rgba(167,139,250,0.15)",
                            color: "#c4b5fd",
                          }
                        : {
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.45)",
                          }
                    }>
                    {detalle.origen === "recurrente" ? "Recurrente" : "Manual"}
                  </span>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase font-bold mb-1"
                    style={{ color: "rgba(255,255,255,0.32)" }}>
                    Concepto
                  </div>
                  <div className="text-white font-bold truncate">
                    {detalle.concepto || "Plan de pagos"}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase font-bold mb-1"
                    style={{ color: "rgba(255,255,255,0.32)" }}>
                    Total
                  </div>
                  <div
                    className="font-black text-sm sm:text-base"
                    style={{ color: "#fb923c" }}>
                    {dinero(detalle.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de cobro */}
            <div
              className="rounded-xl p-3.5 sm:p-4 space-y-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.38)" }}>
                Registrar Cobro
              </div>
              <div className="flex items-center gap-2">
                <label
                  className="text-xs font-bold shrink-0"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  Método:
                </label>
                <div className="relative flex-1">
                  <select
                    value={metodoId}
                    onChange={(e) => setMetodoId(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs outline-none cursor-pointer transition-all hover:bg-white/[0.08] focus:border-orange-500/60"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}>
                    {metodos.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        style={{ background: "#18181b", color: "#fafafa" }}>
                        {m.metodo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                </div>
              </div>

              {!todoPagado ? (
                <button
                  disabled={guardando}
                  onClick={() => toggleFactura(true)}
                  className="flex w-full items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 active:scale-95 hover:brightness-110"
                  style={{ background: "#059669", color: "#fff" }}>
                  {guardando ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CircleDollarSign className="h-4 w-4" />
                  )}
                  Marcar factura como PAGADA
                </button>
              ) : (
                <div className="space-y-2">
                  <div
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      color: "#34d399",
                    }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Factura
                    Completamente Cobrada
                  </div>
                  <button
                    disabled={guardando}
                    onClick={() => toggleFactura(false)}
                    className="flex w-full items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 hover:bg-white/10"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.45)",
                    }}>
                    <RotateCcw className="h-3.5 w-3.5" /> Revertir a Pendiente
                  </button>
                </div>
              )}
            </div>

            {/* Cuotas */}
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-2.5"
                style={{ color: "rgba(255,255,255,0.38)" }}>
                Cuotas ({detalle.cuotas.length})
              </div>
              <div className="space-y-2">
                {detalle.cuotas.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl p-3 sm:p-4 space-y-2"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <EstadoBadge
                        estado={Number(c.pagado) ? "pagada" : "pendiente"}
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">
                          {dinero(c.monto)}
                        </span>
                        <button
                          disabled={guardando}
                          onClick={() =>
                            toggleCuota(c.id, Number(c.pagado) === 0)
                          }
                          className="px-2.5 py-1 rounded-md text-[10px] font-black cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-95"
                          style={
                            Number(c.pagado)
                              ? {
                                  background: "rgba(16,185,129,0.1)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16,185,129,0.2)",
                                }
                              : {
                                  background: "rgba(249,115,22,0.1)",
                                  color: "#fb923c",
                                  border: "1px solid rgba(249,115,22,0.2)",
                                }
                          }>
                          {Number(c.pagado) ? "Revertir" : "Cobrar"}
                        </button>
                      </div>
                    </div>
                    <div
                      className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] pt-1"
                      style={{ color: "rgba(255,255,255,0.38)" }}>
                      <div>
                        Vence{" "}
                        <strong style={{ color: "rgba(255,255,255,0.65)" }}>
                          {fecha(c.vencimiento)}
                        </strong>
                      </div>
                      <div>
                        Cobrado{" "}
                        <strong style={{ color: "rgba(255,255,255,0.65)" }}>
                          {fecha(c.fecha_pago)}
                        </strong>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        Método{" "}
                        <strong style={{ color: "rgba(255,255,255,0.65)" }}>
                          {c.metodo_nombre || "—"}
                        </strong>
                      </div>
                    </div>
                    {c.nota && (
                      <div
                        className="mt-1.5 text-[10px]"
                        style={{
                          color: "rgba(255,255,255,0.38)",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          paddingTop: 6,
                        }}>
                        {c.nota}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Link
              to={`/clientes/${detalle.cliente_id}`}
              className="flex w-full items-center justify-center py-2.5 sm:py-3 rounded-xl text-xs font-black text-white hover:bg-white/10 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
              Abrir Perfil del Cliente
            </Link>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <LoaderCircle
              className="h-7 w-7 animate-spin"
              style={{ color: "#f97316" }}
            />
          </div>
        )}
      </aside>
    </div>
  );
}

// ==========================================
// Componente: Modal Pago Rápido
// ==========================================

function ModalPago({
  movimiento,
  metodos,
  cerrar,
  onActualizado,
}: {
  movimiento: Movimiento;
  metodos: Metodo[];
  cerrar: () => void;
  onActualizado: () => Promise<void>;
}) {
  const [metodoId, setMetodoId] = useState<number>(metodos[0]?.id || 1);
  const [fechaPago, setFechaPago] = useState(hoy.toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const facturaId = movimiento.factura_id || movimiento.id;

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaId) return;
    setGuardando(true);
    try {
      await api(`/api/facturacion/facturas/${facturaId}/pagar`, {
        method: "POST",
        body: JSON.stringify({
          pagado: true,
          metodo_id: metodoId,
          fecha_pago: fechaPago,
          nota,
        }),
      });
      await onActualizado();
    } catch {
      alert("Error al registrar pago");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onMouseDown={cerrar}>
      <form
        onSubmit={confirmar}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 my-auto"
        style={{
          background: "#0f0f17",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: "#f97316" }}>
              Registrar cobro
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {movimiento.numero_factura || `Factura #${facturaId}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="p-1 cursor-pointer hover:text-white"
            style={{ color: "rgba(255,255,255,0.38)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="rounded-xl p-3.5 sm:p-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
          <div
            className="text-xs mb-1 truncate"
            style={{ color: "rgba(255,255,255,0.45)" }}>
            Cliente:{" "}
            <strong className="text-white uppercase">
              {movimiento.cliente_nombre}
            </strong>
          </div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            A cobrar:{" "}
            <strong className="text-lg sm:text-xl font-black" style={{ color: "#34d399" }}>
              {dinero(movimiento.saldo || movimiento.monto)}
            </strong>
          </div>
        </div>

        <div className="space-y-3">
          {[
            {
              label: "Forma de pago",
              control: (
                <div className="relative">
                  <select
                    value={metodoId}
                    onChange={(e) => setMetodoId(Number(e.target.value))}
                    className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-lg text-xs outline-none cursor-pointer transition-all hover:bg-white/[0.08] focus:border-orange-500/60"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}>
                    {metodos.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        style={{ background: "#18181b", color: "#fafafa" }}>
                        {m.metodo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                </div>
              ),
            },
            {
              label: "Fecha de pago",
              control: (
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                />
              ),
            },
            {
              label: "Nota (opcional)",
              control: (
                <input
                  type="text"
                  placeholder="Ej: Transferencia Zelle #1234"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none placeholder:opacity-30"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                />
              ),
            },
          ].map(({ label, control }) => (
            <div key={label}>
              <label
                className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                style={{ color: "rgba(255,255,255,0.38)" }}>
                {label}
              </label>
              {control}
            </div>
          ))}
        </div>

        <div
          className="flex gap-2 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.55)",
            }}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 py-2.5 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50 active:scale-95 hover:brightness-110"
            style={{ background: "#059669", color: "#fff" }}>
            {guardando ? "Guardando..." : "Confirmar Pago"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// Componente: Modal Nuevo Cobro Recurrente
// ==========================================

type CitaOpc = { id: number; tipo: string; dia: string; domicilio?: string };

function ModalRecurrente({
  url,
  metodos,
  cerrar,
  guardado,
}: {
  url: (ruta: string) => string;
  metodos: Metodo[];
  cerrar: () => void;
  guardado: (mensaje: string) => Promise<void>;
}) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [citas, setCitas] = useState<CitaOpc[]>([]);
  const [citaId, setCitaId] = useState("");
  const [formulario, setFormulario] = useState({
    concepto: "MONITOREO DE CÁMARAS",
    monto: "",
    dia_vencimiento: String(hoy.getDate()),
    fecha_inicio: fechaInicial,
    fecha_fin: "",
    metodo_id: "",
  });

  useEffect(() => {
    if (cliente || !busqueda.trim()) {
      setResultados([]);
      return;
    }
    const t = window.setTimeout(() => {
      fetch(url(`/api/clientes/buscar?q=${encodeURIComponent(busqueda)}`))
        .then((r) => (r.ok ? r.json() : []))
        .then(setResultados)
        .catch(() => setResultados([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [busqueda, cliente, url]);

  useEffect(() => {
    if (!cliente) {
      setCitas([]);
      setCitaId("");
      return;
    }
    fetch(url(`/api/clientes/${cliente.id}`))
      .then((r) => (r.ok ? r.json() : { citas: [] }))
      .then((data) => {
        const lista: CitaOpc[] = (data.citas || []).map(
          (c: Record<string, unknown>) => ({
            id: c.idcita as number,
            tipo: String(c.tipo || "Servicio"),
            dia: String(c.dia_format || c.dia || ""),
            domicilio: String(c.domicilio || ""),
          }),
        );
        setCitas(lista);
        setCitaId(lista.length > 0 ? String(lista[0].id) : "");
      })
      .catch(() => setCitas([]));
  }, [cliente, url]);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!cliente) {
      setError("Selecciona un cliente de la lista");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const res = await api<{ cantidad: number }>(
        "/api/facturacion/recurrentes",
        {
          method: "POST",
          body: JSON.stringify({
            ...formulario,
            cliente_id: cliente.id,
            cita_id: citaId ? Number(citaId) : null,
            metodo_id: formulario.metodo_id || null,
          }),
        },
      );
      await guardado(
        res.cantidad
          ? "Cobro recurrente creado y primera factura generada."
          : "Cobro recurrente configurado.",
      );
    } catch (f) {
      setError(
        f instanceof ApiError ? f.message : "Error al crear cobro recurrente",
      );
    } finally {
      setGuardando(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onMouseDown={cerrar}>
      <form
        onSubmit={enviar}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 my-auto"
        style={{
          background: "#0f0f17",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
        <div className="flex items-start justify-between">
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: "#f97316" }}>
              Configurar suscripción
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              Nuevo Cobro Recurrente
            </h2>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="p-1 cursor-pointer hover:text-white"
            style={{ color: "rgba(255,255,255,0.38)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            className="rounded-lg px-4 py-3 text-xs font-medium"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}>
            {error}
          </div>
        )}

        {/* Cliente */}
        <div className="relative">
          <label
            className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
            style={{ color: "rgba(255,255,255,0.38)" }}>
            Cliente *
          </label>
          {cliente ? (
            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg"
              style={{
                background: "rgba(249,115,22,0.1)",
                border: "1px solid rgba(249,115,22,0.25)",
              }}>
              <span className="font-bold text-white uppercase text-xs truncate mr-2">
                {cliente.nombre}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCliente(null);
                  setBusqueda("");
                  setCitas([]);
                  setCitaId("");
                }}
                className="cursor-pointer hover:text-white shrink-0"
                style={{ color: "rgba(255,255,255,0.45)" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <input
                required
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe nombre o teléfono..."
                className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none placeholder:opacity-30"
                style={inputStyle}
              />
              {resultados.length > 0 && (
                <div
                  className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl shadow-2xl"
                  style={{
                    background: "#12121c",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                  {resultados.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setCliente(item);
                        setBusqueda(item.nombre);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-xs text-left cursor-pointer"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(249,115,22,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }>
                      <strong className="uppercase text-white truncate mr-2">
                        {item.nombre}
                      </strong>
                      <span className="shrink-0" style={{ color: "rgba(255,255,255,0.38)" }}>
                        {item.telefono}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Cita */}
        {cliente && citas.length > 0 && (
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Cita Asociada
            </label>
            <div className="relative">
              <select
                value={citaId}
                onChange={(e) => setCitaId(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-lg text-xs text-white outline-none cursor-pointer transition-all hover:bg-white/[0.08]"
                style={inputStyle}>
                {citas.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    style={{ background: "#18181b", color: "#fafafa" }}>
                    {c.tipo} — {c.dia} {c.domicilio ? `(${c.domicilio})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          </div>
        )}

        {/* Campos */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Concepto *
            </label>
            <input
              required
              value={formulario.concepto}
              onChange={(e) =>
                setFormulario({ ...formulario, concepto: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none placeholder:opacity-30"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Monto Mensual *
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={formulario.monto}
              onChange={(e) =>
                setFormulario({ ...formulario, monto: e.target.value })
              }
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none font-bold placeholder:opacity-30"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Día de Vencimiento *
            </label>
            <input
              required
              type="number"
              min="1"
              max="31"
              value={formulario.dia_vencimiento}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  dia_vencimiento: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Fecha de Inicio *
            </label>
            <input
              required
              type="date"
              value={formulario.fecha_inicio}
              onChange={(e) =>
                setFormulario({ ...formulario, fecha_inicio: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg text-xs text-white outline-none cursor-pointer"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.38)" }}>
              Forma de Pago
            </label>
            <div className="relative">
              <select
                value={formulario.metodo_id}
                onChange={(e) =>
                  setFormulario({ ...formulario, metodo_id: e.target.value })
                }
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-lg text-xs text-white outline-none cursor-pointer transition-all hover:bg-white/[0.08]"
                style={inputStyle}>
                <option
                  value=""
                  style={{ background: "#18181b", color: "#fafafa" }}>
                  Predeterminado
                </option>
                {metodos.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    style={{ background: "#18181b", color: "#fafafa" }}>
                    {m.metodo}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          </div>
        </div>

        <div
          className="flex gap-2 pt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.55)",
            }}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 py-2.5 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50 active:scale-95 hover:brightness-110"
            style={{ background: "#f97316", color: "#fff" }}>
            {guardando ? "Creando..." : "Crear Cobro Recurrente"}
          </button>
        </div>
      </form>
    </div>
  );
}
