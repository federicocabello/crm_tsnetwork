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
  Trash2,
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
  estado?: "pendiente" | "vencida" | "pagada" | "cancelada";
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

type Pestana = "facturas" | "pagos" | "recurrentes";
type Estado = "todos" | "pendiente" | "vencida" | "pagada" | "cancelada";
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
  if (Number(item.pagado) === 2) return "cancelada";
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
  const [desde] = useState(desdeInicial);
  const [hasta] = useState(hastaInicial);

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
  const [porPagina, setPorPagina] = useState<number>(10);

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
        por_pagina: String(porPagina),
        vista: pestana,
        estado: pestana === "pagos" ? "pagada" : estado,
        origen,
      });

      if (pestana === "facturas") {
        params.set("todos_periodos", "1");
        if (clienteFiltroId) {
          params.set("cliente_id", String(clienteFiltroId));
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
    porPagina,
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

  const eliminarRecurrente = async (item: Recurrente) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar permanentemente la regla de cobro recurrente "${item.concepto}" de ${item.cliente_nombre}? Las facturas históricas generadas no se borrarán.`,
      )
    ) {
      return;
    }
    try {
      await api(`/api/facturacion/recurrentes/${item.id}`, {
        method: "DELETE",
      });
      setAviso("Cobro recurrente eliminado exitosamente");
      await cargarRecurrentes();
    } catch (error) {
      setAviso(
        error instanceof ApiError
          ? error.message
          : "Error al eliminar recurrente",
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

  // KPI computations
  const cobradoMes = Number(resumen?.pagadas_mes?.total ?? 0);
  const montoDeuda = deudaTotal;

  return (
    <div className="flex flex-col w-full" style={{ background: "var(--alt-page-bg)", minHeight: "100%" }}>

      {/* ── PAGE HEADER */}
      <div className="alt-page-header">
        <div>
          <h1 className="alt-page-title">
            <ReceiptText style={{ width: 18, height: 18, color: "#f97316" }} />
            Facturación y Cobranza
            {cargandoLista && <LoaderCircle style={{ width: 14, height: 14, color: "#f97316", animation: "spin 1s linear infinite" }} />}
          </h1>
          <div className="alt-breadcrumb" style={{ marginTop: 2 }}>
            <a href="/inicio">Inicio</a>
            <span>/</span>
            <span>Facturación</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={generarPendientes} disabled={cargandoLista} className="alt-btn alt-btn-secondary">
            <RefreshCw style={{ width: 13, height: 13, color: "#f97316" }} className={cargandoLista ? "animate-spin" : ""} />
            <span>Generar Pendientes</span>
          </button>
          <button onClick={() => setModalRecurrente(true)} className="alt-btn alt-btn-primary">
            <Plus style={{ width: 13, height: 13 }} />
            Nuevo Recurrente
          </button>
        </div>
      </div>

      {/* ── AVISO */}
      {aviso && (
        <div style={{ padding: "8px 16px 0" }}>
          <div className="alt-notice alt-notice-info">
            <span>{aviso}</span>
            <button onClick={() => setAviso("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "inline-flex", padding: 2 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── KPI INFO BOXES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, padding: "12px 16px" }}>
        <div className="alt-info-box">
          <div className="alt-info-box-icon c-green"><Wallet style={{ width: 22, height: 22 }} /></div>
          <div className="alt-info-box-content">
            <div className="alt-info-box-label">Cobrado este mes</div>
            <div className="alt-info-box-value">{dinero(cobradoMes)}</div>
            <div className="alt-info-box-sub">{resumen?.pagadas_mes?.cuotas ?? 0} cuota(s)</div>
          </div>
        </div>
        <div className="alt-info-box">
          <div className="alt-info-box-icon c-blue"><FileText style={{ width: 22, height: 22 }} /></div>
          <div className="alt-info-box-content">
            <div className="alt-info-box-label">Facturas (historial)</div>
            <div className="alt-info-box-value">{movimientos.total}</div>
            <div className="alt-info-box-sub">todos los períodos</div>
          </div>
        </div>
        <div className="alt-info-box">
          <div className="alt-info-box-icon c-red"><AlertCircle style={{ width: 22, height: 22 }} /></div>
          <div className="alt-info-box-content">
            <div className="alt-info-box-label">Vencidas este mes</div>
            <div className="alt-info-box-value">{vencidasMes.length}</div>
            <div className="alt-info-box-sub">sin cobrar</div>
          </div>
        </div>
        <div className="alt-info-box">
          <div className="alt-info-box-icon c-orange"><CircleDollarSign style={{ width: 22, height: 22 }} /></div>
          <div className="alt-info-box-content">
            <div className="alt-info-box-label">Deuda acumulada</div>
            <div className="alt-info-box-value">{dinero(montoDeuda)}</div>
            <div className="alt-info-box-sub">{(resumen?.deuda_por_cliente ?? []).length} cliente(s)</div>
          </div>
        </div>
      </div>

      {/* ── MAIN CARD */}
      <div className="alt-card" style={{ margin: "0 16px 16px", flex: 1 }}>

        {/* TABS */}
        <div className="alt-tabs">
          {([
            { id: "facturas", label: "Facturas", icon: <FileText style={{width:13,height:13}} /> },
            { id: "pagos", label: "Pagadas", icon: <CheckCircle2 style={{width:13,height:13}} /> },
            { id: "recurrentes", label: "Recurrentes", icon: <RefreshCw style={{width:13,height:13}} /> },
          ] as { id: Pestana; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              className={`alt-tab${pestana === tab.id ? " active" : ""}`}
              onClick={() => { setPestana(tab.id); setPagina(1); }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* FILTER BAR */}
        {(pestana === "facturas" || pestana === "pagos") && (
          <div className="alt-filters">
            <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 260 }}>
              <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--alt-text-muted)", pointerEvents: "none" }} />
              <input
                className="alt-input"
                style={{ width: "100%", paddingLeft: 28, paddingRight: query ? 28 : 10, boxSizing: "border-box" }}
                type="text"
                placeholder="Buscar cliente, N.º factura..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--alt-text-muted)" }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
            {pestana === "facturas" && (
              <div style={{ position: "relative" }}>
                <select className="alt-select" value={estado} onChange={e => { setEstado(e.target.value as Estado); setPagina(1); }}>
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencida">Vencida</option>
                  <option value="pagada">Pagada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "var(--alt-text-muted)", pointerEvents: "none" }} />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <select className="alt-select" value={origen} onChange={e => { setOrigen(e.target.value as Origen); setPagina(1); }}>
                <option value="todos">Todos los orígenes</option>
                <option value="recurrente">Recurrentes</option>
                <option value="manual">Manuales</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "var(--alt-text-muted)", pointerEvents: "none" }} />
            </div>
            <div style={{ position: "relative" }}>
              <select className="alt-select" value={metodo} onChange={e => { setMetodo(e.target.value); setPagina(1); }}>
                <option value="">Forma de pago</option>
                {metodos.map(m => <option key={m.id} value={m.id}>{m.metodo}</option>)}
              </select>
              <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "var(--alt-text-muted)", pointerEvents: "none" }} />
            </div>
            <div style={{ position: "relative" }}>
              <select
                className="alt-select"
                value={porPagina}
                onChange={e => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                title="Cantidad por página"
              >
                <option value={5}>5 por pág.</option>
                <option value={10}>10 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "var(--alt-text-muted)", pointerEvents: "none" }} />
            </div>
            <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--alt-text-muted)" }}>
              {movimientos.total} resultado(s)
            </span>
          </div>
        )}

        {/* BANNER CLIENTE FILTRADO */}
        {clienteFiltroId && pestana === "facturas" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px", background: "rgba(249,115,22,0.08)", borderBottom: "1px solid rgba(249,115,22,0.18)", fontSize: "0.75rem" }}>
            <span style={{ color: "var(--alt-text-muted)" }}>
              Filtrando:{" "}
              <Link to={`/clientes/${clienteFiltroId}`} style={{ color: "var(--alt-text)", fontWeight: 700 }}>
                {clienteFiltroNombre}
              </Link>
            </span>
            <button onClick={limpiarCliente} style={{ background: "none", border: "none", color: "var(--alt-text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem" }}>
              <X style={{ width: 12, height: 12 }} /> Quitar filtro
            </button>
          </div>
        )}

        {/* CONTENT */}
        {(pestana === "facturas" || pestana === "pagos") && (
          <TablaMovimientos
            pestana={pestana}
            respuesta={movimientos}
            cargando={cargandoLista}
            porPagina={porPagina}
            setPorPagina={setPorPagina}
            setPagina={setPagina}
            abrirDetalle={setDetalleId}
            abrirPagoRapido={setModalPagoRapido}
            descargarPdf={descargarPdf}
          />
        )}
        {pestana === "recurrentes" && (
          <TabRecurrentes items={recurrentes} cargando={cargandoLista} query={queryAplicada} abrirModal={() => setModalRecurrente(true)} alternar={alternarRecurrencia} eliminar={eliminarRecurrente} abrirDetalle={setDetalleId} descargarPdf={descargarPdf} />
        )}
      </div>

      {/* MODALES */}
      {detalleId && (
        <DrawerDetalle detalle={detalle} metodos={metodos} cerrar={() => setDetalleId(null)}
          onActualizado={async () => {
            await Promise.all([cargarMovimientos(), cargarResumen(),
              detalleId ? fetch(url(`/api/facturacion/facturas/${detalleId}`)).then(r => r.ok ? r.json() : null).then(setDetalle).catch(() => {}) : null,
            ]);
          }}
        />
      )}
      {modalRecurrente && (
        <ModalRecurrente url={url} metodos={metodos} cerrar={() => setModalRecurrente(false)}
          guardado={async (mensaje) => {
            setModalRecurrente(false); setAviso(mensaje); setPestana("recurrentes");
            await Promise.all([cargarRecurrentes(), cargarResumen(), cargarMovimientos()]);
          }}
        />
      )}
      {modalPagoRapido && (
        <ModalPago movimiento={modalPagoRapido} metodos={metodos} cerrar={() => setModalPagoRapido(null)}
          onActualizado={async () => {
            setModalPagoRapido(null); setAviso("Pago registrado correctamente");
            await Promise.all([cargarMovimientos(), cargarResumen()]);
          }}
        />
      )}
    </div>
  );
}


function TablaMovimientos({
  pestana,
  respuesta,
  cargando,
  porPagina,
  setPorPagina,
  setPagina,
  abrirDetalle,
  abrirPagoRapido,
  descargarPdf,
}: {
  pestana: "facturas" | "pagos";
  respuesta: RespuestaMovimientos;
  cargando: boolean;
  porPagina: number;
  setPorPagina: (n: number) => void;
  setPagina: (p: number) => void;
  abrirDetalle: (id: number) => void;
  abrirPagoRapido: (m: Movimiento) => void;
  descargarPdf: (id: number, num: string) => void;
}) {
  return (
    <div style={{ opacity: cargando ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {/* VISTA TABLA (DESKTOP: md+) */}
      <div className="hidden md:block" style={{ overflowX: "auto" }}>
        <table className="alt-table" style={{ minWidth: 780 }}>
          <thead>
            <tr>
              <th>N.º Factura</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Emisión</th>
              <th>{pestana === "pagos" ? "Fecha Pago" : "Vencimiento"}</th>
              <th className="td-right">Total</th>
              <th className="td-right">Saldo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {respuesta.items.map(item => {
              const itemEstado = item.estado || estadoMovimiento(item);
              const facturaId = item.factura_id || item.id || 0;
              const numeroFac = item.numero_factura || `FAC-${String(facturaId).padStart(6, "0")}`;
              return (
                <tr key={item.movimiento_id || item.id}>
                  <td>
                    <button
                      onClick={() => facturaId && abrirDetalle(facturaId)}
                      className="td-mono"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {numeroFac}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "rgba(255,255,255,0.55)", flexShrink: 0 }}>
                        {iniciales(item.cliente_nombre)}
                      </div>
                      <div>
                        <Link to={`/clientes/${item.cliente_id}`} style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--alt-text)", display: "block", textDecoration: "none" }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                          {item.cliente_nombre}
                        </Link>
                        {item.telefono && <span className="td-muted" style={{ display: "block" }}>{item.telefono}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`alt-badge ${item.origen === "recurrente" ? "alt-badge-blue" : "alt-badge-gray"}`}>
                      {item.origen === "recurrente" ? "Recurrente" : "Manual"}
                    </span>
                  </td>
                  <td className="td-muted">{fecha(item.fecha_emision)}</td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: "0.78rem", color: pestana === "pagos" ? "#4ade80" : itemEstado === "vencida" ? "#f87171" : "var(--alt-text)" }}>
                      {pestana === "pagos" ? fecha(item.fecha_pago || item.fechapago) : fecha(item.vencimiento)}
                    </span>
                  </td>
                  <td className="td-right">{dinero(item.monto)}</td>
                  <td className="td-right">
                    {Number(item.saldo) > 0
                      ? <span style={{ color: "#fbbf24", fontWeight: 700 }}>{dinero(item.saldo)}</span>
                      : <span style={{ color: "var(--alt-text-muted)" }}>—</span>}
                  </td>
                  <td><EstadoBadge estado={itemEstado} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      {itemEstado !== "pagada" && itemEstado !== "cancelada" && (
                        <button onClick={() => abrirPagoRapido(item)} className="alt-btn alt-btn-success alt-btn-sm">
                          <CircleDollarSign style={{ width: 12, height: 12 }} /> Cobrar
                        </button>
                      )}
                      <button onClick={() => facturaId && descargarPdf(facturaId, numeroFac)} className="alt-btn alt-btn-secondary alt-btn-sm alt-btn-icon" title="PDF">
                        <FileDown style={{ width: 13, height: 13, color: "#f97316" }} />
                      </button>
                      <button onClick={() => facturaId && abrirDetalle(facturaId)} className="alt-btn alt-btn-secondary alt-btn-sm">
                        Detalles
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VISTA TARJETAS (MOBILE: < md) */}
      <div className="md:hidden flex flex-col gap-3 p-3">
        {respuesta.items.map(item => {
          const itemEstado = item.estado || estadoMovimiento(item);
          const facturaId = item.factura_id || item.id || 0;
          const numeroFac = item.numero_factura || `FAC-${String(facturaId).padStart(6, "0")}`;
          return (
            <div
              key={item.movimiento_id || item.id}
              className="rounded-xl p-3.5 space-y-3 shadow-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
              {/* Top: Factura Nro + Badges */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => facturaId && abrirDetalle(facturaId)}
                  className="font-mono font-black text-xs text-orange-400 hover:underline text-left bg-transparent border-none p-0 cursor-pointer">
                  {numeroFac}
                </button>
                <div className="flex items-center gap-1.5">
                  <span className={`alt-badge ${item.origen === "recurrente" ? "alt-badge-blue" : "alt-badge-gray"}`}>
                    {item.origen === "recurrente" ? "Recurrente" : "Manual"}
                  </span>
                  <EstadoBadge estado={itemEstado} />
                </div>
              </div>

              {/* Cliente */}
              <div className="flex items-center gap-2.5">
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
                  {iniciales(item.cliente_nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/clientes/${item.cliente_id}`}
                    style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--alt-text)", display: "block", textDecoration: "none" }}
                    className="truncate hover:underline">
                    {item.cliente_nombre}
                  </Link>
                  {item.telefono && (
                    <span className="td-muted text-xs block truncate">{item.telefono}</span>
                  )}
                </div>
              </div>

              {/* Data Grid */}
              <div
                className="grid grid-cols-2 gap-2 text-xs pt-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                    {pestana === "pagos" ? "Fecha Pago" : "Vencimiento"}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.78rem", color: pestana === "pagos" ? "#4ade80" : itemEstado === "vencida" ? "#f87171" : "var(--alt-text)" }}>
                    {pestana === "pagos" ? fecha(item.fecha_pago || item.fechapago) : fecha(item.vencimiento)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                    Emisión
                  </span>
                  <span className="text-white/70 font-semibold">{fecha(item.fecha_emision)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                    Total
                  </span>
                  <span className="font-bold text-white font-mono">{dinero(item.monto)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                    Saldo
                  </span>
                  {Number(item.saldo) > 0 ? (
                    <span style={{ color: "#fbbf24", fontWeight: 700 }} className="font-mono">
                      {dinero(item.saldo)}
                    </span>
                  ) : (
                    <span style={{ color: "var(--alt-text-muted)" }}>—</span>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div
                className="flex items-center justify-end gap-2 pt-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {itemEstado !== "pagada" && itemEstado !== "cancelada" && (
                  <button onClick={() => abrirPagoRapido(item)} className="alt-btn alt-btn-success alt-btn-sm flex-1 justify-center">
                    <CircleDollarSign style={{ width: 13, height: 13 }} /> Cobrar
                  </button>
                )}
                <button
                  onClick={() => facturaId && descargarPdf(facturaId, numeroFac)}
                  className="alt-btn alt-btn-secondary alt-btn-sm alt-btn-icon"
                  title="PDF">
                  <FileDown style={{ width: 14, height: 14, color: "#f97316" }} />
                </button>
                <button
                  onClick={() => facturaId && abrirDetalle(facturaId)}
                  className="alt-btn alt-btn-secondary alt-btn-sm flex-1 justify-center">
                  Detalles
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!respuesta.items.length && !cargando && (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--alt-text-muted)", fontSize: "0.8rem" }}>
          No se encontraron facturas con los filtros actuales.
        </div>
      )}

      {respuesta.total > 0 && (
        <div
          className="alt-pagination"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            padding: "10px 16px",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--alt-text-muted)" }}>
              Mostrando <strong style={{ color: "var(--alt-text)" }}>{respuesta.items.length}</strong> de{" "}
              <strong style={{ color: "var(--alt-text)" }}>{respuesta.total}</strong>
              {respuesta.paginas > 1 && (
                <>
                  {" "}| Página <strong style={{ color: "var(--alt-text)" }}>{respuesta.pagina}</strong> de{" "}
                  <strong style={{ color: "var(--alt-text)" }}>{respuesta.paginas}</strong>
                </>
              )}
            </span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <select
                className="alt-select"
                style={{ padding: "3px 22px 3px 8px", fontSize: "0.72rem", height: 26 }}
                value={porPagina}
                onChange={e => {
                  setPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
                title="Cantidad por página">
                <option value={5}>5 / pág.</option>
                <option value={10}>10 / pág.</option>
                <option value={25}>25 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
              <ChevronDown
                style={{
                  position: "absolute",
                  right: 5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 11,
                  height: 11,
                  color: "var(--alt-text-muted)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {respuesta.paginas > 1 && (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="alt-page-btn"
                disabled={respuesta.pagina <= 1}
                onClick={() => setPagina(respuesta.pagina - 1)}>
                <ChevronLeft style={{ width: 13, height: 13 }} />
              </button>
              {Array.from({ length: Math.min(respuesta.paginas, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`alt-page-btn${p === respuesta.pagina ? " active" : ""}`}
                    onClick={() => setPagina(p)}>
                    {p}
                  </button>
                );
              })}
              <button
                className="alt-page-btn"
                disabled={respuesta.pagina >= respuesta.paginas}
                onClick={() => setPagina(respuesta.pagina + 1)}>
                <ChevronRight style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Componente: Badge de Estado
// ==========================================

function EstadoBadge({ estado }: { estado: string }) {
  const cls: Record<string, string> = {
    pagada: "alt-badge-green",
    vencida: "alt-badge-red",
    pendiente: "alt-badge-amber",
    cancelada: "alt-badge-gray",
  };
  return <span className={`alt-badge ${cls[estado] ?? "alt-badge-gray"}`}>{estado}</span>;
}


// ==========================================
// Componente: Tab Cobros Recurrentes
// ==========================================

function TabRecurrentes({
  items, cargando, query, abrirModal, alternar, eliminar, abrirDetalle, descargarPdf,
}: {
  items: Recurrente[];
  cargando: boolean;
  query: string;
  abrirModal: () => void;
  alternar: (item: Recurrente) => void;
  eliminar: (item: Recurrente) => void;
  abrirDetalle: (id: number) => void;
  descargarPdf: (id: number, num: string) => void;
}) {
  const visibles = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(i => !q || `${i.cliente_nombre} ${i.concepto}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div style={{ opacity: cargando ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--alt-card-border)" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--alt-text-muted)" }}>{visibles.length} suscripción(es)</span>
        <button onClick={abrirModal} className="alt-btn alt-btn-primary">
          <Plus style={{ width: 13, height: 13 }} /> Nuevo Recurrente
        </button>
      </div>

      {/* VISTA TABLA (DESKTOP: md+) */}
      <div className="hidden md:block" style={{ overflowX: "auto" }}>
        <table className="alt-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Concepto</th>
              <th className="td-right">Monto/mes</th>
              <th>Día vence</th>
              <th>Próx. generación</th>
              <th>Generadas</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(item => (
              <tr key={item.id} style={{ opacity: Number(item.activa) ? 1 : 0.5 }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#c4b5fd", flexShrink: 0 }}>
                      {iniciales(item.cliente_nombre)}
                    </div>
                    <Link to={`/clientes/${item.cliente_id}`} style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--alt-text)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                      {item.cliente_nombre}
                    </Link>
                  </div>
                </td>
                <td className="td-muted" style={{ maxWidth: 200 }}>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.concepto}</span>
                </td>
                <td className="td-right td-mono">{dinero(item.monto)}</td>
                <td className="td-muted">día {item.dia_vencimiento}</td>
                <td className="td-muted">{fecha(item.proxima_generacion)}</td>
                <td className="td-muted">{item.facturas_generadas}</td>
                <td>
                  <span className={`alt-badge ${Number(item.activa) ? "alt-badge-green" : "alt-badge-gray"}`}>
                    {Number(item.activa) ? "Activo" : "Pausado"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button disabled={!item.ultima_factura_id} onClick={() => item.ultima_factura_id && descargarPdf(item.ultima_factura_id, item.ultimo_numero_factura || `FAC-${String(item.ultima_factura_id).padStart(6,"0")}`)}
                      className="alt-btn alt-btn-secondary alt-btn-sm alt-btn-icon" title="PDF">
                      <FileDown style={{ width: 13, height: 13, color: "#f97316" }} />
                    </button>
                    <button disabled={!item.ultima_factura_id} onClick={() => item.ultima_factura_id && abrirDetalle(item.ultima_factura_id)}
                      className="alt-btn alt-btn-secondary alt-btn-sm">
                      Detalles
                    </button>
                    <button onClick={() => alternar(item)}
                      className={`alt-btn alt-btn-sm ${Number(item.activa) ? "alt-btn-secondary" : "alt-btn-success"}`}>
                      {Number(item.activa) ? <><Pause style={{ width: 11, height: 11 }} /> Pausar</> : <><Play style={{ width: 11, height: 11 }} /> Reactivar</>}
                    </button>
                    {Number(item.activa) === 0 && (
                      <button onClick={() => eliminar(item)} className="alt-btn alt-btn-danger alt-btn-sm" title="Eliminar">
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VISTA TARJETAS (MOBILE: < md) */}
      <div className="md:hidden flex flex-col gap-3 p-3">
        {visibles.map(item => (
          <div
            key={item.id}
            className="rounded-xl p-3.5 space-y-3 shadow-sm"
            style={{
              opacity: Number(item.activa) ? 1 : 0.6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
            {/* Top: Cliente + Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#c4b5fd", flexShrink: 0 }}>
                  {iniciales(item.cliente_nombre)}
                </div>
                <Link to={`/clientes/${item.cliente_id}`} style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--alt-text)", textDecoration: "none" }}
                  className="truncate hover:underline">
                  {item.cliente_nombre}
                </Link>
              </div>
              <span className={`alt-badge ${Number(item.activa) ? "alt-badge-green" : "alt-badge-gray"}`}>
                {Number(item.activa) ? "Activo" : "Pausado"}
              </span>
            </div>

            {/* Concepto */}
            <div className="text-xs text-white/80 font-medium">
              {item.concepto}
            </div>

            {/* Data Grid */}
            <div
              className="grid grid-cols-2 gap-2 text-xs pt-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                  Monto/mes
                </span>
                <span className="font-mono font-bold text-white">{dinero(item.monto)}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                  Día vencimiento
                </span>
                <span className="text-white/70 font-semibold">Día {item.dia_vencimiento}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                  Próx. generación
                </span>
                <span className="text-white/70 font-semibold">{fecha(item.proxima_generacion)}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block mb-0.5">
                  Facturas generadas
                </span>
                <span className="text-white/70 font-semibold">{item.facturas_generadas}</span>
              </div>
            </div>

            {/* Actions Footer */}
            <div
              className="flex items-center justify-end gap-2 pt-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button
                disabled={!item.ultima_factura_id}
                onClick={() => item.ultima_factura_id && descargarPdf(item.ultima_factura_id, item.ultimo_numero_factura || `FAC-${String(item.ultima_factura_id).padStart(6,"0")}`)}
                className="alt-btn alt-btn-secondary alt-btn-sm alt-btn-icon"
                title="PDF">
                <FileDown style={{ width: 13, height: 13, color: "#f97316" }} />
              </button>
              <button
                disabled={!item.ultima_factura_id}
                onClick={() => item.ultima_factura_id && abrirDetalle(item.ultima_factura_id)}
                className="alt-btn alt-btn-secondary alt-btn-sm">
                Detalles
              </button>
              <button
                onClick={() => alternar(item)}
                className={`alt-btn alt-btn-sm ${Number(item.activa) ? "alt-btn-secondary" : "alt-btn-success"}`}>
                {Number(item.activa) ? <><Pause style={{ width: 11, height: 11 }} /> Pausar</> : <><Play style={{ width: 11, height: 11 }} /> Reactivar</>}
              </button>
              {Number(item.activa) === 0 && (
                <button
                  onClick={() => eliminar(item)}
                  className="alt-btn alt-btn-danger alt-btn-sm"
                  title="Eliminar">
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!visibles.length && !cargando && (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--alt-text-muted)", fontSize: "0.8rem" }}>
          No hay cobros recurrentes configurados.
        </div>
      )}
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

  const estaCancelada = Boolean(
    detalle &&
    detalle.cuotas.length > 0 &&
    detalle.cuotas.every((c) => Number(c.pagado) === 2),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onMouseDown={cerrar}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl my-auto"
        style={{
          background: "#0d0d14",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 shrink-0"
          style={{
            background: "#14141f",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(249,115,22,0.15)",
                border: "1px solid rgba(249,115,22,0.3)",
                color: "#fb923c",
              }}>
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#f97316" }}>
                Detalle de Factura
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white font-mono leading-tight">
                {detalle?.numero_factura || "Cargando..."}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {detalle && (
              <button
                onClick={descargar}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-orange-500/20 transition-colors"
                style={{
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  color: "#fb923c",
                }}>
                <FileDown className="h-3.5 w-3.5" /> Descargar PDF
              </button>
            )}
            <button
              onClick={cerrar}
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {detalle ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              
              {/* Left Column: Info Factura + Cliente + Acciones de Cobro (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Cliente Card */}
                <div
                  className="rounded-xl p-4 sm:p-5 space-y-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="flex items-center gap-3.5">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-base shrink-0"
                      style={{
                        background: "rgba(249,115,22,0.15)",
                        color: "#fb923c",
                        border: "1px solid rgba(249,115,22,0.25)",
                      }}>
                      {iniciales(detalle.cliente_nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/clientes/${detalle.cliente_id}`}
                        className="font-black uppercase text-sm sm:text-base hover:underline block truncate"
                        style={{ color: "#fff" }}>
                        {detalle.cliente_nombre}
                      </Link>
                      <div
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "rgba(255,255,255,0.45)" }}>
                        {detalle.telefono ? `Tel: ${detalle.telefono}` : "Sin teléfono"}
                      </div>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-3 text-xs pt-3.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div
                        className="text-[10px] uppercase font-bold mb-1"
                        style={{ color: "rgba(255,255,255,0.35)" }}>
                        Fecha Emisión
                      </div>
                      <div className="text-white font-bold">
                        {fecha(detalle.fecha_emision)}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[10px] uppercase font-bold mb-1"
                        style={{ color: "rgba(255,255,255,0.35)" }}>
                        Tipo / Origen
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
                                color: "rgba(255,255,255,0.6)",
                              }
                        }>
                        {detalle.origen === "recurrente" ? "Recurrente" : "Manual"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <div
                        className="text-[10px] uppercase font-bold mb-1"
                        style={{ color: "rgba(255,255,255,0.35)" }}>
                        Concepto
                      </div>
                      <div className="text-white font-medium">
                        {detalle.concepto || "Plan de pagos"}
                      </div>
                    </div>
                  </div>

                  {/* Total amount highlight box */}
                  <div
                    className="rounded-xl p-3.5 flex items-center justify-between"
                    style={{
                      background: "rgba(249,115,22,0.08)",
                      border: "1px solid rgba(249,115,22,0.2)",
                    }}>
                    <div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: "rgba(251,146,60,0.8)" }}>
                        Monto Total
                      </div>
                      <div className="text-xs text-white/50">
                        {detalle.cuotas.length} cuota(s) programadas
                      </div>
                    </div>
                    <div
                      className="font-black text-xl sm:text-2xl font-mono"
                      style={{ color: "#fb923c" }}>
                      {dinero(detalle.total)}
                    </div>
                  </div>
                </div>

                {/* Panel de Cobro Global */}
                <div
                  className="rounded-xl p-4 sm:p-5 space-y-3.5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    Acciones de Factura
                  </div>

                  <div className="flex items-center gap-2.5">
                    <label
                      className="text-xs font-bold shrink-0"
                      style={{ color: "rgba(255,255,255,0.6)" }}>
                      Método de pago:
                    </label>
                    <div className="relative flex-1">
                      <select
                        value={metodoId}
                        onChange={(e) => setMetodoId(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs outline-none cursor-pointer transition-all hover:bg-white/[0.08] focus:border-orange-500/60"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
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

                  {estaCancelada ? (
                    <div
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold"
                      style={{
                        background: "rgba(113,113,122,0.14)",
                        border: "1px solid rgba(113,113,122,0.25)",
                        color: "#a1a1aa",
                      }}>
                      <AlertCircle className="h-4 w-4" /> Factura Cancelada por Falta de Pago
                    </div>
                  ) : !todoPagado ? (
                    <button
                      disabled={guardando}
                      onClick={() => toggleFactura(true)}
                      className="flex w-full items-center justify-center gap-2 py-3 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 active:scale-[0.98] hover:brightness-110 shadow-lg transition-all"
                      style={{ background: "#059669", color: "#fff" }}>
                      {guardando ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <CircleDollarSign className="h-4 w-4" />
                      )}
                      Marcar factura completa como PAGADA
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
                        <CheckCircle2 className="h-4 w-4" /> Factura Completamente Cobrada
                      </div>
                      <button
                        disabled={guardando}
                        onClick={() => toggleFactura(false)}
                        className="flex w-full items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 hover:bg-white/10 transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.55)",
                        }}>
                        <RotateCcw className="h-3.5 w-3.5" /> Revertir a Pendiente
                      </button>
                    </div>
                  )}
                </div>

                {/* Enlace Perfil */}
                <Link
                  to={`/clientes/${detalle.cliente_id}`}
                  className="flex w-full items-center justify-center py-2.5 sm:py-3 rounded-xl text-xs font-bold text-white hover:bg-white/10 active:scale-[0.98] transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  Ver Perfil Completo del Cliente →
                </Link>
              </div>

              {/* Right Column: Cuotas Desglosadas (7 cols) */}
              <div className="lg:col-span-7 flex flex-col min-h-0">
                <div
                  className="rounded-xl p-4 sm:p-5 flex-1 flex flex-col space-y-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div
                      className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                      <span>Desglose de Cuotas</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        {detalle.cuotas.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/40">
                      Puedes cobrar o revertir cuotas individualmente
                    </span>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
                    {detalle.cuotas.map((c, idx) => {
                      const cuotaEstado =
                        Number(c.pagado) === 1
                          ? "pagada"
                          : Number(c.pagado) === 2
                            ? "cancelada"
                            : "pendiente";
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl p-3.5 space-y-2 transition-colors hover:border-white/20"
                          style={{
                            background:
                              Number(c.pagado) === 2
                                ? "rgba(113,113,122,0.05)"
                                : Number(c.pagado) === 1
                                  ? "rgba(16,185,129,0.04)"
                                  : "rgba(255,255,255,0.03)",
                            border:
                              Number(c.pagado) === 2
                                ? "1px solid rgba(113,113,122,0.15)"
                                : Number(c.pagado) === 1
                                  ? "1px solid rgba(16,185,129,0.18)"
                                  : "1px solid rgba(255,255,255,0.08)",
                          }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white/40">
                                #{idx + 1}
                              </span>
                              <EstadoBadge estado={cuotaEstado} />
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`font-black text-sm sm:text-base font-mono ${
                                  Number(c.pagado) === 2
                                    ? "text-zinc-500 line-through"
                                    : Number(c.pagado) === 1
                                      ? "text-emerald-400"
                                      : "text-white"
                                }`}>
                                {dinero(c.monto)}
                              </span>
                              {Number(c.pagado) === 2 ? (
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                                  style={{
                                    background: "rgba(113,113,122,0.15)",
                                    color: "#a1a1aa",
                                    border: "1px solid rgba(113,113,122,0.25)",
                                  }}>
                                  Cancelada
                                </span>
                              ) : (
                                <button
                                  disabled={guardando}
                                  onClick={() =>
                                    toggleCuota(c.id, Number(c.pagado) === 0)
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-95 transition-all"
                                  style={
                                    Number(c.pagado)
                                      ? {
                                          background: "rgba(16,185,129,0.15)",
                                          color: "#34d399",
                                          border: "1px solid rgba(16,185,129,0.3)",
                                        }
                                      : {
                                          background: "rgba(249,115,22,0.15)",
                                          color: "#fb923c",
                                          border: "1px solid rgba(249,115,22,0.3)",
                                        }
                                  }>
                                  {Number(c.pagado) ? "Revertir" : "Cobrar"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1.5"
                            style={{ color: "rgba(255,255,255,0.45)" }}>
                            <div>
                              Vence:{" "}
                              <strong style={{ color: "rgba(255,255,255,0.75)" }}>
                                {fecha(c.vencimiento)}
                              </strong>
                            </div>
                            <div>
                              Cobrado:{" "}
                              <strong style={{ color: "rgba(255,255,255,0.75)" }}>
                                {fecha(c.fecha_pago)}
                              </strong>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              Método:{" "}
                              <strong style={{ color: "rgba(255,255,255,0.75)" }}>
                                {c.metodo_nombre || "—"}
                              </strong>
                            </div>
                          </div>
                          {c.nota && (
                            <div
                              className="mt-1 text-xs text-white/50 pt-1.5"
                              style={{
                                borderTop: "1px solid rgba(255,255,255,0.05)",
                              }}>
                              Nota: {c.nota}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center gap-3">
            <LoaderCircle
              className="h-8 w-8 animate-spin"
              style={{ color: "#f97316" }}
            />
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">
              Cargando información de factura...
            </span>
          </div>
        )}
      </div>
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
