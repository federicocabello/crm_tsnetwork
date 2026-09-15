import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";
import {
  Mail,
  User,
  CalendarFold,
  Cctv,
  Wrench,
  TriangleAlert,
  List,
  Clock,
  House,
  ClipboardPlus,
  Globe,
  Drill,
  Trash2,
  Pencil,
  FileDown,
  ChevronLeft,
  CircleDollarSign,
  ReceiptText,
  CheckCircle,
  RefreshCw,
  Play,
  Pause,
  X,
} from "lucide-react";
import { darkenColor } from "../utils/colores";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Loading from "../components/Loading";
import type { Usuarios } from "../types/auth";
import FormatearNumero from "../components/FormatearNumero.tsx";
import PlanDePagos from "../components/PlanDePagos";
import VerPlanDePagos from "../components/VerPlanDePagos";
import { api } from "../lib/api";
import { agendaDayClassName, dateKeyToDate, formatDateKey, isSelectableAgendaDate, isSundayKey } from "../utils/agendaFechas";

type Cita = {
  idcita: number;
  dia: string;
  hora: string;
  tipo: string;
  notas: string;
  telefono: string;
  domicilio: string;
  asignado: string;
  estado: string;
  color: string;
  dia_format: string;
  hora_format: string;
  hora_24: string;
  idestado: string;
  idasignado: string;
  eliminado: number;
  deuda_cita?: number;
  pagado_cita?: number;
};

type Cliente = {
  idcliente: number;
  nombre: string;
  email: string;
};

type FacturaCliente = {
  id: number;
  numero_factura: string;
  cliente_id: number;
  cita_id: number | null;
  fecha_emision: string;
  total: number;
  enganche: number;
  origen: "manual" | "recurrente";
  concepto: string | null;
  saldo: number;
  pagado: number;
  estado: "pendiente" | "vencida" | "pagada";
  vencimiento: string;
  fecha_pago: string | null;
  metodo_nombre?: string | null;
};

type RecurrenteCliente = {
  id: number;
  cliente_id: number;
  cita_id: number | null;
  concepto: string;
  monto: number;
  dia_vencimiento: number;
  frecuencia_meses: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  proxima_generacion: string;
  metodo_id: number | null;
  metodo_nombre: string | null;
  activa: number;
  facturas_generadas: number;
  ultimo_periodo: string | null;
};

type ResumenFacturacion = {
  total_facturas: number;
  total_facturado: number;
  total_saldo: number;
  total_pagado: number;
  pendientes: number;
  vencidas: number;
  pagadas: number;
};

export default function Cliente() {
  const { idCliente } = useParams<{ idCliente: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [estados, setEstados] = useState<{ id: string, estado: string, color?: string }[]>([]);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);

  const [citaSeleccionada, setCitaSeleccionada] = useState(0);
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [emailEdicion, setEmailEdicion] = useState("");
  const [notas, setNotas] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");

  const [hora, setHora] = useState<Date | null>(null);

  const [asignado, setAsignado] = useState("");
  const [estado, setEstado] = useState("");

  const [deudaTotal, setDeudaTotal] = useState<number>(0);

  const [cuotas, setCuotas] = useState<{ idcuota: number, monto: number, interes: number, pagado: boolean, vencimiento: string, fechapago: string | null, idmetodo: number, metodo: string, nota?: string, comprobante?: string }[]>([]);
  const [idPago, setIdPago] = useState<number | null>(null);
  const [totalPlan, setTotalPlan] = useState<number>(0);
  const [enganchePlan, setEnganchePlan] = useState<number>(0);
  const [metodoEnganchePlan, setMetodoEnganchePlan] = useState("");
  const [idMetodoEnganchePlan, setIdMetodoEnganchePlan] = useState<number>(0);

  // Estados de Facturación y Cobros Recurrentes
  const [facturas, setFacturas] = useState<FacturaCliente[]>([]);
  const [recurrentes, setRecurrentes] = useState<RecurrenteCliente[]>([]);
  const [resumenFacturacion, setResumenFacturacion] = useState<ResumenFacturacion | null>(null);
  const [metodosPago, setMetodosPago] = useState<{ id: number; metodo: string }[]>([]);
  const [pestanaCliente, setPestanaCliente] = useState<"citas" | "facturas">("citas");
  const [modalPagoFactura, setModalPagoFactura] = useState<FacturaCliente | null>(null);
  const [metodoSeleccionadoModal, setMetodoSeleccionadoModal] = useState<number>(1);
  const [fechaPagoModal, setFechaPagoModal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notaPagoModal, setNotaPagoModal] = useState<string>("");
  const [guardandoPagoFactura, setGuardandoPagoFactura] = useState(false);

  const esInternet = (tipo: string) => (tipo || "").toLowerCase().includes("internet");
  const esCamaras = (tipo: string) => {
    const value = (tipo || "").toLowerCase();
    return value.includes("camara") || value.includes("desdecero");
  };
  const esSoporte = (tipo: string) => (tipo || "").toLowerCase().includes("soporte");
  const esInstalacion = (tipo: string) => {
    const value = (tipo || "").toLowerCase();
    return value.includes("instalacion") || value.includes("instalación") || value.includes("desdecero");
  };

  const cargarFacturacionCliente = async () => {
    try {
      const [resFacturacion, resMetodos] = await Promise.all([
        fetch(`${API_URL}/api/facturacion/clientes/${idCliente}`),
        fetch(`${API_URL}/api/pagos/metodos`),
      ]);
      if (resFacturacion.ok) {
        const data = await resFacturacion.json();
        setFacturas(data.facturas || []);
        setRecurrentes(data.recurrentes || []);
        setResumenFacturacion(data.resumen || null);
      }
      if (resMetodos.ok) {
        const metodos = await resMetodos.json();
        setMetodosPago(metodos || []);
        if (metodos && metodos.length > 0) {
          setMetodoSeleccionadoModal(Number(metodos[0].id));
        }
      }
    } catch (err) {
      console.error("Error al cargar facturacion del cliente:", err);
    }
  };

  const togglePagoFactura = async (factura: FacturaCliente) => {
    if (Number(factura.pagado) === 0) {
      setModalPagoFactura(factura);
      setFechaPagoModal(new Date().toISOString().slice(0, 10));
      setNotaPagoModal("");
    } else {
      if (!window.confirm(`¿Deseas revertir la factura ${factura.numero_factura} a estado Pendiente?`)) return;
      setGuardandoPagoFactura(true);
      try {
        await api(`/api/facturacion/facturas/${factura.id}/pagar`, {
          method: "POST",
          body: JSON.stringify({ pagado: false }),
        });
        await Promise.all([cargarInicioCliente(), cargarFacturacionCliente()]);
      } catch (err) {
        alert("Error al revertir estado de factura");
      } finally {
        setGuardandoPagoFactura(false);
      }
    }
  };

  const confirmarPagoModal = async () => {
    if (!modalPagoFactura) return;
    setGuardandoPagoFactura(true);
    try {
      await api(`/api/facturacion/facturas/${modalPagoFactura.id}/pagar`, {
        method: "POST",
        body: JSON.stringify({
          pagado: true,
          metodo_id: metodoSeleccionadoModal,
          fecha_pago: fechaPagoModal,
          nota: notaPagoModal,
        }),
      });
      setModalPagoFactura(null);
      await Promise.all([cargarInicioCliente(), cargarFacturacionCliente()]);
    } catch (err) {
      alert("Error al registrar pago");
    } finally {
      setGuardandoPagoFactura(false);
    }
  };

  const descargarPdfFactura = (idPago: number, numeroFactura: string) => {
    const a = document.createElement("a");
    a.href = `${API_URL}/api/facturacion/facturas/${idPago}/pdf`;
    a.download = `${numeroFactura}.pdf`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleRecurrente = async (item: RecurrenteCliente) => {
    try {
      await api(`/api/facturacion/recurrentes/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !Number(item.activa) }),
      });
      await cargarFacturacionCliente();
    } catch (err) {
      alert("Error al actualizar estado de recurrencia");
    }
  };

  const setearCitaSeleccionada = async (cita: Cita) => {
    setCitaSeleccionada(cita.idcita);
    setTelefono(cita.telefono);
    setDireccion(cita.domicilio);
    setFecha(cita.dia_format);
    setNotas(cita.notas);
    setAsignado(cita.idasignado);
    setEstado(cita.idestado);

    if (cita.hora_24) {
      const [h, m] = cita.hora_24.split(":").map(Number);
      const nuevaHora = new Date();
      nuevaHora.setHours(h, m, 0, 0);
      setHora(nuevaHora);
      setHorario(cita.hora_24);
    } else {
      setHora(new Date());
      const now = new Date();
      setHorario(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    }

    try {
      const res = await fetch(`${API_URL}/api/clientes/pagos/${cita.idcita}`);

      if (!res.ok) {
        console.error("Error al traer los pagos. Código:", res.status);
        return;
      }
      const data = await res.json();
      setCuotas(data.cuotas ?? []);
      setIdPago(data.id_pago ?? null);
      setTotalPlan(data.total ?? 0);
      setEnganchePlan(Number(data.enganche ?? 0));
      setMetodoEnganchePlan(data.metodo_enganche ?? "");
      setIdMetodoEnganchePlan(Number(data.idmetodo_enganche ?? 0));

    } catch (error) {
      alert("Error de conexión con el backend.");
      console.error("Error de conexión con el backend:", error);
    }
  };

  const cargarInicioCliente = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/clientes/${idCliente}`);

      if (!res.ok) {
        console.error("Error al traer datos. Código:", res.status);
        return;
      }

      const data = await res.json();

      setCliente(data.cliente);
      setEmailEdicion(data.cliente?.email || "");
      setCitas(data.citas.filter((cita: Cita) =>
        Number(cita.eliminado) !== 1 || user?.rol === "superadmin"
      ));
      setUsers(data.users);
      setEstados(data.estados);
      setDeudaTotal(data.deuda_total ? data.deuda_total : 0);

      await cargarFacturacionCliente();
    } catch (error) {
      alert("Error de conexión con el backend.");
      console.error("Error de conexión con el backend:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarInicioCliente();
  }, [idCliente]);

  const eliminarCita = async (idCita: number) => {
    if (user?.rol !== "superadmin") return;
    const confirmar = window.confirm(
      "¿Deshabilitar esta cita? Quedará visible solamente para superadmin.",
    );
    if (!confirmar) return;

    try {
      await api(`/api/citas/${idCita}/eliminar`, { method: "PATCH" });
      setCitaSeleccionada(0);
      await cargarInicioCliente();
    } catch (error) {
      console.error("Error deshabilitando la cita:", error);
      alert("No se pudo deshabilitar la cita.");
    }
  };

  const actualizarCita = async () => {
    if (isSundayKey(fecha)) {
      alert("No se pueden reprogramar citas los domingos.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/citas/actualizar/${citaSeleccionada}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          telefono,
          direccion,
          notas,
          fecha,
          horario,
          asignado,
          estado,
        })
      });

      if (!res.ok) {
        console.error("Error al actualizar la cita. Código:", res.status);
        return;
      }

      const emailNormalizado = emailEdicion.trim().toLowerCase();
      if (cliente && emailNormalizado && emailNormalizado !== (cliente.email || "").toLowerCase()) {
        const respuestaEmail = await fetch(`${API_URL}/api/clientes/${cliente.idcliente}/email`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailNormalizado }),
        });
        if (!respuestaEmail.ok) throw new Error("No se pudo actualizar el email del cliente.");
        setCliente({ ...cliente, email: emailNormalizado });
        setEmailEdicion(emailNormalizado);
      }
    } catch (error) {
      console.error("Error al actualizar la cita:", error);
      alert("Error al actualizar la cita. Por favor, inténtalo de nuevo.");
    }
    finally {
      alert("Cita actualizada correctamente.");
      cargarInicioCliente();
    }
  };

  const modificarNombreCliente = async () => {
    if (!cliente) return;

    const nombreIngresado = window.prompt(
      "Ingresá el nombre del cliente",
      cliente.nombre,
    );
    if (nombreIngresado === null) return;

    const nombre = nombreIngresado.trim().toUpperCase();
    if (!nombre || nombre === cliente.nombre) return;

    try {
      const respuesta = await api<{ nombre: string }>(
        `/api/clientes/${cliente.idcliente}/nombre`,
        {
          method: "PUT",
          body: JSON.stringify({ nombre }),
        },
      );
      setCliente({ ...cliente, nombre: respuesta.nombre || nombre });
    } catch (error) {
      console.error("Error al actualizar el nombre:", error);
      alert("Error de conexión con el backend.");
    }
  };

  const agregarEmailCliente = async () => {
    if (!cliente) return;

    const emailIngresado = window.prompt("Ingresá el email del cliente");
    const email = (emailIngresado || "").trim().toLowerCase();

    if (!email) return;

    try {
      const res = await fetch(`${API_URL}/api/clientes/${cliente.idcliente}/email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        console.error("Error al actualizar el email. Código:", res.status);
        alert("No se pudo actualizar el email.");
        return;
      }

      setCliente({ ...cliente, email });
    } catch (error) {
      console.error("Error al actualizar el email:", error);
      alert("Error de conexión con el backend.");
    }
  };

  const citaActual = citas.find((cita) => cita.idcita === citaSeleccionada) ?? null;

  const volverAlListado = () => {
    setCitaSeleccionada(0);
    setMostrarPlanPagos(false);
    setCuotas([]);
    setIdPago(null);
  };

  const exportarPlanPdf = () => {
    if (!cliente || !citaActual || idPago === null) return;

    const totalCuotas = cuotas.reduce((suma, cuota) => suma + Number(cuota.monto || 0), 0);
    const pagadoCuotas = cuotas
      .filter((cuota) => Boolean(cuota.pagado))
      .reduce((suma, cuota) => suma + Number(cuota.monto || 0), 0);
    const total = Number(enganchePlan || 0) + totalCuotas || Number(totalPlan || 0);
    const pagado = Number(enganchePlan || 0) + pagadoCuotas;
    const pendiente = Math.max(total - pagado, 0);
    const ventana = window.open("", "_blank", "width=900,height=1100");

    if (!ventana) {
      alert("Habilita las ventanas emergentes para exportar el PDF.");
      return;
    }

    const escapeHtml = (valor: unknown) =>
      String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const moneda = (valor: number) =>
      valor.toLocaleString("en-US", { style: "currency", currency: "USD" });
    const fecha = (valor?: string | null) => {
      if (!valor) return "-";
      const date = new Date(valor.includes("T") ? valor : `${valor}T12:00:00`);
      return Number.isNaN(date.getTime()) ? escapeHtml(valor) : date.toLocaleDateString("es-AR");
    };
    const filas = cuotas.map((cuota, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${fecha(cuota.vencimiento)}</td>
        <td>${escapeHtml(cuota.metodo || "-")}</td>
        <td>${cuota.pagado ? `Pagada${cuota.fechapago ? ` - ${fecha(cuota.fechapago)}` : ""}` : "Pendiente"}</td>
        <td class="money">${moneda(Number(cuota.monto || 0))}</td>
      </tr>`).join("");
    const logo = new URL("/logo_tsnetwork.png", window.location.origin).href;

    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Plan de pagos</title>
<style>
*{box-sizing:border-box}body{margin:0;color:#18181b;font-family:Arial,sans-serif}.page{max-width:820px;min-height:1040px;margin:auto;padding:42px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:28px;padding-bottom:22px;border-bottom:3px solid #f97316}.logo{width:180px;max-height:76px;object-fit:contain;object-position:left center}h1{margin:0 0 8px;font-size:28px;text-transform:uppercase}.meta{color:#52525b;font-size:13px}
.client{margin:24px 0;padding:17px 19px;border:1px solid #d4d4d8;border-left:5px solid #f97316}.client h2{margin:0 0 12px;font-size:14px;text-transform:uppercase;color:#71717a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 24px;font-size:14px}.wide{grid-column:1/-1}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 24px}.summary div{padding:14px;border:1px solid #d4d4d8;background:#fafafa}.summary span{display:block;margin-bottom:5px;color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase}.summary strong{font-size:19px}.paid strong{color:#15803d}.pending strong{color:#ea580c}
table{width:100%;border-collapse:collapse}th{padding:11px 12px;color:#fff;background:#27272a;text-align:left;font-size:12px;text-transform:uppercase}td{padding:12px;border-bottom:1px solid #e4e4e7;font-size:13px}.money{text-align:right;font-weight:700;white-space:nowrap}.empty{padding:20px;text-align:center;color:#71717a}
footer{margin-top:60px;padding-top:16px;border-top:1px solid #d4d4d8;color:#71717a;font-size:11px;text-align:center}@page{size:A4;margin:0}@media print{.page{max-width:none;min-height:auto}}
</style></head><body><main class="page">
<header><img class="logo" src="${logo}" alt="TS Network"><div><h1>Plan de pagos</h1><div class="meta">Plan N. ${String(idPago).padStart(6, "0")}</div><div class="meta">Emision: ${new Date().toLocaleDateString("es-AR")}</div></div></header>
<section class="client"><h2>Cliente y cita</h2><div class="grid"><div><strong>Cliente:</strong> ${escapeHtml(cliente.nombre)}</div><div><strong>Telefono:</strong> ${escapeHtml(citaActual.telefono) || "-"}</div><div><strong>Email:</strong> ${escapeHtml(cliente.email) || "-"}</div><div><strong>Fecha:</strong> ${escapeHtml(citaActual.dia)} ${escapeHtml(citaActual.hora)}</div><div class="wide"><strong>Domicilio:</strong> ${escapeHtml(citaActual.domicilio) || "-"}</div></div></section>
<section class="summary"><div><span>Total</span><strong>${moneda(total)}</strong></div><div class="paid"><span>Total pagado</span><strong>${moneda(pagado)}</strong></div><div class="pending"><span>Falta pagar</span><strong>${moneda(pendiente)}</strong></div></section>
<table><thead><tr><th>#</th><th>Vencimiento</th><th>Metodo</th><th>Estado</th><th class="money">Monto</th></tr></thead><tbody>${filas || '<tr><td class="empty" colspan="5">El pago fue cubierto completamente con el enganche.</td></tr>'}</tbody></table>
<footer>Resumen del plan de pagos emitido por TS Network.</footer></main><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350));<\/script></body></html>`);
    ventana.document.close();
  };

  const [mostrarPlanPagos, setMostrarPlanPagos] = useState(false);

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto">
      {loading && <Loading />}
      {!loading && (
        <>
          {/* Header del Cliente */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900/90 p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-wrap justify-between items-center gap-4 hover:border-orange-500/20 transition-all">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (citaSeleccionada > 0) {
                    volverAlListado();
                  } else {
                    navigate(-1);
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/80 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-700/80 hover:-translate-x-0.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <ChevronLeft className="h-4 w-4 text-orange-400" />
                <span>Volver</span>
              </button>

              <div className="space-y-0.5">
                <div className="text-2xl font-black tracking-tight text-orange-400 flex items-center gap-2">
                  <User className="h-6 w-6 text-orange-500" />
                  <span>{cliente?.nombre}</span>
                  <button
                    type="button"
                    onClick={modificarNombreCliente}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-orange-300 cursor-pointer"
                    title="Modificar nombre"
                    aria-label="Modificar nombre del cliente"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                {cliente?.email ? (
                  <div className="text-white/60 flex gap-1.5 text-xs items-center font-medium">
                    <Mail className="h-3.5 w-3.5 text-white/40" />
                    <span>{cliente.email}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={agregarEmailCliente}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-200 transition hover:bg-orange-500/20 cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Agregar email</span>
                  </button>
                )}
              </div>
            </div>

            <div
              className={`px-4 py-2 rounded-xl font-bold border flex flex-col items-center justify-center shadow-lg transition-all ${
                deudaTotal > 0
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-amber-500/5"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-500/5"
              }`}
            >
              {deudaTotal > 0 ? (
                <>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80">DEUDA TOTAL</div>
                  <div className="text-2xl font-black tracking-tight"><FormatearNumero numero={deudaTotal} /></div>
                </>
              ) : (
                <div className="text-xs font-extrabold tracking-wider uppercase px-2 py-1 text-emerald-400">SIN DEUDAS</div>
              )}
            </div>
          </div>

          {/* Navegación de Pestañas cuando no hay cita seleccionada */}
          {citaSeleccionada === 0 && (
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setPestanaCliente("citas")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                  pestanaCliente === "citas"
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <CalendarFold className="h-4 w-4" />
                <span>Citas y Servicios</span>
                <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-black">
                  {citas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestanaCliente("facturas")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                  pestanaCliente === "facturas"
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-950/40"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <ReceiptText className="h-4 w-4" />
                <span>Facturación y Recurrentes</span>
                <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-black">
                  {facturas.length}
                </span>
                {resumenFacturacion && resumenFacturacion.pendientes + resumenFacturacion.vencidas > 0 && (
                  <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black">
                    {resumenFacturacion.pendientes + resumenFacturacion.vencidas} pendientes
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Vista cuando no hay cita seleccionada */}
          {citaSeleccionada === 0 ? (
            pestanaCliente === "citas" ? (
              <div className="space-y-3">
                {citas.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 text-center text-white/50 font-medium">
                    Este cliente no tiene citas registradas.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {citas.map((cita) => (
                      <div
                        key={cita.idcita}
                        className={`bg-zinc-900/90 border rounded-2xl p-4 shadow-md transition-all ${
                          Number(cita.eliminado) === 1
                            ? "cursor-not-allowed opacity-60 grayscale border-zinc-600/40"
                            : "cursor-pointer hover:scale-[1.005]"
                        } ${
                          cita.idcita === citaSeleccionada
                            ? "border-orange-500 shadow-orange-500/10 bg-zinc-900"
                            : "border-white/10 hover:border-orange-500/50 hover:shadow-lg"
                        }`}
                        onClick={() => Number(cita.eliminado) !== 1 && setearCitaSeleccionada(cita)}
                      >
                        <div className="flex min-w-0 flex-col gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-white font-bold">
                            {Number(cita.eliminado) === 1 ? (
                              <div className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-black text-red-300">
                                CITA ELIMINADA
                              </div>
                            ) : user?.rol === "superadmin" ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void eliminarCita(cita.idcita);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 cursor-pointer"
                                title="Deshabilitar cita"
                                aria-label="Deshabilitar cita"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}

                            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                              <CalendarFold className="h-3.5 w-3.5" />
                              <span>{cita.dia}</span>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-200">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{cita.hora}</span>
                            </div>

                            {esInternet(cita.tipo) && (
                              <div className="rounded-full text-xs font-bold py-1 px-3 border border-orange-500/40 bg-orange-500/20 text-orange-200 flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                <span>INTERNET</span>
                              </div>
                            )}

                            {esCamaras(cita.tipo) && (
                              <div className="rounded-full text-xs font-bold py-1 px-3 border border-blue-500/40 bg-blue-500/20 text-blue-200 flex items-center gap-1.5">
                                <Cctv className="h-3.5 w-3.5" />
                                <span>CAMARAS</span>
                              </div>
                            )}

                            {esInstalacion(cita.tipo) && (
                              <div className="rounded-full text-xs font-bold py-1 px-3 border border-indigo-500/40 bg-indigo-500/20 text-indigo-200 flex items-center gap-1.5">
                                <Drill className="h-3.5 w-3.5" />
                                <span>INSTALACION</span>
                              </div>
                            )}

                            {esSoporte(cita.tipo) && (
                              <div className="rounded-full text-xs font-bold py-1 px-3 border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 flex items-center gap-1.5">
                                <Wrench className="h-3.5 w-3.5" />
                                <span>SOPORTE</span>
                              </div>
                            )}
                            <div
                              className="rounded-full text-xs font-bold py-1 px-3 text-center border shadow-xs"
                              style={{
                                backgroundColor: cita.color,
                                borderColor: darkenColor(cita.color, 0.4),
                              }}
                            >
                              {cita.estado}
                            </div>

                            {Number(cita.deuda_cita || 0) > 0 && (
                              <div className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200">
                                Debe <FormatearNumero numero={Number(cita.deuda_cita || 0)} />
                              </div>
                            )}
                            {Number(cita.pagado_cita || 0) > 0 && (
                              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
                                PAGADO <FormatearNumero numero={Number(cita.pagado_cita || 0)} />
                              </div>
                            )}
                            {(cita.tipo == "camaras-tiene-nuevo-instalacion" ||
                              cita.tipo == "camaras-tiene-existente-instalacion") && (
                              <div className="text-xs text-amber-400 font-bold italic flex items-center gap-1">
                                <TriangleAlert className="h-3.5 w-3.5" />
                                <span>Ya tiene cámaras instaladas</span>
                              </div>
                            )}
                          </div>

                          {cita.domicilio.trim() && (
                            <div className="min-w-0 text-white/90 text-sm flex gap-2 items-start font-semibold">
                              <House className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" />
                              <span className="min-w-0 flex-1 break-words leading-snug">{cita.domicilio}</span>
                            </div>
                          )}

                          {cita.notas.trim() && (
                            <div className="min-w-0 text-white/60 text-xs bg-black/20 p-2.5 rounded-xl border border-white/5">
                              <p className="line-clamp-2 break-words whitespace-pre-wrap">
                                <strong className="text-white/80">Notas:</strong> {cita.notas}
                              </p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                            <span className="truncate italic">
                              Asignado a <strong className="text-white/80">{cita.asignado}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Sección de Facturas y Cobros Recurrentes */
              <div className="space-y-6">
                {/* Cobros Recurrentes Configurados */}
                {recurrentes.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-xl">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                      <RefreshCw className="h-5 w-5 text-orange-400" />
                      <h3 className="text-base font-bold text-white tracking-wide">Cobros Recurrentes Mensuales</h3>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {recurrentes.map((rec) => (
                        <div
                          key={rec.id}
                          className={`rounded-xl border p-4 transition-all ${
                            Number(rec.activa)
                              ? "border-white/10 bg-zinc-950/40"
                              : "border-white/5 bg-zinc-950/20 opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-black uppercase text-white tracking-wide">{rec.concepto}</div>
                              <div className="text-xl font-black text-orange-400 mt-1">
                                <FormatearNumero numero={rec.monto} />
                                <span className="text-xs font-normal text-white/40"> / mes</span>
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                                Number(rec.activa)
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-white/10 bg-white/5 text-white/40"
                              }`}
                            >
                              {Number(rec.activa) ? "Activo" : "Pausado"}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-white/50 border-t border-white/5 pt-2.5">
                            <div>Vence día: <strong className="text-white/80">{rec.dia_vencimiento}</strong></div>
                            <div>Generadas: <strong className="text-white/80">{rec.facturas_generadas}</strong></div>
                            <div className="col-span-2">Próxima gen: <strong className="text-white/80">{rec.proxima_generacion}</strong></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRecurrente(rec)}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-white transition cursor-pointer"
                          >
                            {Number(rec.activa) ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            <span>{Number(rec.activa) ? "Pausar recurrencia" : "Reactivar recurrencia"}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listado de Facturas */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-5 w-5 text-orange-400" />
                      <h3 className="text-base font-bold text-white tracking-wide">Facturas del Cliente</h3>
                      <span className="text-xs text-white/40">({facturas.length})</span>
                    </div>
                  </div>

                  {facturas.length === 0 ? (
                    <div className="p-8 text-center text-white/40 text-sm">
                      No hay facturas generadas para este cliente todavía.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {facturas.map((fac) => (
                        <div
                          key={fac.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-orange-300">
                                {fac.numero_factura}
                              </span>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                                  fac.origen === "recurrente"
                                    ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                                    : "border-white/10 bg-white/5 text-white/50"
                                }`}
                              >
                                {fac.origen === "recurrente" ? "Recurrente" : "Manual"}
                              </span>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                                  fac.estado === "pagada"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : fac.estado === "vencida"
                                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                }`}
                              >
                                {fac.estado}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-white/90">
                              {fac.concepto || "Plan de pagos"}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                              <span>Emisión: <strong className="text-white/70">{fac.fecha_emision}</strong></span>
                              <span>Vence: <strong className="text-white/70">{fac.vencimiento}</strong></span>
                              {fac.fecha_pago && (
                                <span className="text-emerald-400/90 font-semibold">
                                  Pagado el: {fac.fecha_pago}
                                </span>
                              )}
                              {fac.metodo_nombre && (
                                <span>Método: <strong className="text-white/70">{fac.metodo_nombre}</strong></span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-base font-black text-white">
                                <FormatearNumero numero={fac.total} />
                              </div>
                              {Number(fac.saldo) > 0 && (
                                <div className="text-xs font-bold text-amber-400">
                                  Saldo: <FormatearNumero numero={fac.saldo} />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Botón de Pago Rápido */}
                              <button
                                type="button"
                                onClick={() => togglePagoFactura(fac)}
                                disabled={guardandoPagoFactura}
                                title={Number(fac.pagado) ? "Factura Pagada (Clic para revertir)" : "Marcar como pagada"}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer active:scale-95 ${
                                  Number(fac.pagado)
                                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                    : "border border-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950/40"
                                }`}
                              >
                                {Number(fac.pagado) ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                    <span>Pagada</span>
                                  </>
                                ) : (
                                  <>
                                    <CircleDollarSign className="h-4 w-4" />
                                    <span>Marcar Pagada</span>
                                  </>
                                )}
                              </button>

                              {/* Botón Descargar PDF */}
                              <button
                                type="button"
                                onClick={() => descargarPdfFactura(fac.id, fac.numero_factura)}
                                title="Descargar PDF de la factura"
                                className="flex items-center gap-1 rounded-xl border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-500/20 transition cursor-pointer"
                              >
                                <FileDown className="h-4 w-4" />
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* Vista de Columna Única cuando hay Cita Seleccionada */
            <div className="w-full space-y-5">
              {/* Sección de Plan de Pagos */}
              {idPago === null ? (
                !mostrarPlanPagos ? (
                  <button
                    type="button"
                    className="bg-cyan-600/90 border border-cyan-500/40 rounded-xl px-4 py-2.5 transition-all hover:bg-cyan-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer active:scale-95"
                    onClick={() => setMostrarPlanPagos(true)}
                  >
                    <ClipboardPlus className="h-4 w-4" />
                    <span className="text-sm">Agregar plan de pagos</span>
                  </button>
                ) : (
                  <div className="w-full">
                    <PlanDePagos
                      idCliente={idCliente || ""}
                      idCita={citaSeleccionada}
                      onGuardado={() => {
                        const citaActual = citas.find((c) => c.idcita === citaSeleccionada);
                        if (citaActual) setearCitaSeleccionada(citaActual);
                        cargarInicioCliente();
                        setMostrarPlanPagos(false);
                      }}
                    />
                  </div>
                )
              ) : (
                <VerPlanDePagos
                  idPago={idPago}
                  idCita={citaSeleccionada}
                  total={totalPlan}
                  enganche={enganchePlan}
                  metodoEnganche={metodoEnganchePlan}
                  idMetodoEnganche={idMetodoEnganchePlan}
                  cuotas={cuotas}
                  headerAction={
                    <button
                      type="button"
                      onClick={exportarPlanPdf}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-200 transition hover:bg-orange-500/20 cursor-pointer"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Exportar PDF</span>
                    </button>
                  }
                  onActualizado={() => {
                    const citaActual = citas.find((c) => c.idcita === citaSeleccionada);
                    if (citaActual) setearCitaSeleccionada(citaActual);
                    cargarInicioCliente();
                  }}
                />
              )}

              {/* Formulario Detalles de la Cita */}
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-xl transition-all space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <List className="h-5 w-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white tracking-wide">Detalles de la cita</h2>
                </div>

                {citas
                  .filter((cita) => cita.idcita === citaSeleccionada)
                  .map((cita) => (
                    <div key={cita.idcita} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                              Teléfono
                            </label>
                            <input
                              name="telefono"
                              value={telefono}
                              onChange={(e) => setTelefono(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                              Dirección
                            </label>
                            <input
                              name="direccion"
                              value={direccion}
                              onChange={(e) => setDireccion(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 uppercase transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                              Asignar a
                            </label>
                            <select
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 capitalize transition-all cursor-pointer"
                              value={asignado}
                              onChange={(e) => setAsignado(e.target.value)}
                            >
                              <option key={cita.idasignado} value={cita.idasignado}>
                                {cita.asignado}
                              </option>
                              {users
                                .filter((u) => u.id !== cita.idasignado)
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.fullname}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                              Estado
                            </label>
                            <select
                              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 capitalize transition-all cursor-pointer"
                              value={estado}
                              onChange={(e) => setEstado(e.target.value)}
                            >
                              <option key={cita.idestado} value={cita.idestado}>
                                {cita.estado}
                              </option>
                              {estados
                                .filter((e) => e.id !== cita.idestado)
                                .map((est) => (
                                  <option key={est.id} value={est.id}>
                                    {est.estado}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                          Notas
                        </label>
                        <textarea
                          name="notas"
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          rows={6}
                          className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all resize-y"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                              Fecha
                            </label>
                            <DatePicker
                              selected={dateKeyToDate(fecha)}
                              onChange={(date: Date | null) =>
                                setFecha(date ? formatDateKey(date) : "")
                              }
                              filterDate={isSelectableAgendaDate}
                              dayClassName={agendaDayClassName}
                              dateFormat="MM/dd/yyyy"
                              placeholderText="Seleccionar fecha"
                              className="rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-all"
                              wrapperClassName="w-full"
                              calendarClassName="agenda-datepicker"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                              Hora
                            </label>
                            <DatePicker
                              showTimeSelect
                              showTimeSelectOnly
                              timeIntervals={15}
                              timeCaption="Hora"
                              dateFormat="h:mm aa"
                              calendarClassName="agenda-timepicker"
                              className="w-32 rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-all"
                              title="Cambiar hora"
                              selected={hora ?? undefined}
                              onChange={(date: Date | null) => {
                                if (!date) return;
                                setHora(date);
                                const formattedTime = `${date.getHours()}:${String(
                                  date.getMinutes()
                                ).padStart(2, "0")}`;
                                setHorario(formattedTime);
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={volverAlListado}
                            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                          >
                            Volver
                          </button>

                          <button
                            type="button"
                            onClick={() => actualizarCita()}
                            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-5 py-2 text-xs font-bold text-white transition-all shadow-md shadow-orange-950/40 cursor-pointer active:scale-95"
                          >
                            Guardar cambios
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Modal de Registro / Confirmación de Pago de Factura */}
          {modalPagoFactura && (
            <div
              className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
              onMouseDown={() => setModalPagoFactura(null)}
            >
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-start justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-orange-400">Registrar Pago</span>
                    <h3 className="text-lg font-black text-white">{modalPagoFactura.numero_factura}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalPagoFactura(null)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-sm space-y-1">
                  <div className="text-xs text-white/50">Concepto: <strong className="text-white/80">{modalPagoFactura.concepto || "Plan de pagos"}</strong></div>
                  <div className="text-xs text-white/50">Total a pagar: <strong className="text-emerald-400 font-bold"><FormatearNumero numero={modalPagoFactura.saldo || modalPagoFactura.total} /></strong></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                      Método de pago
                    </label>
                    <select
                      value={metodoSeleccionadoModal}
                      onChange={(e) => setMetodoSeleccionadoModal(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-all cursor-pointer"
                    >
                      {metodosPago.map((m) => (
                        <option key={m.id} value={m.id} style={{ background: "#18181b", color: "#fafafa" }}>{m.metodo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                      Fecha de pago
                    </label>
                    <input
                      type="date"
                      value={fechaPagoModal}
                      onChange={(e) => setFechaPagoModal(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1 block">
                      Nota o Comprobante (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Transferencia Zelle #1234"
                      value={notaPagoModal}
                      onChange={(e) => setNotaPagoModal(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalPagoFactura(null)}
                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={guardandoPagoFactura}
                    onClick={confirmarPagoModal}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-black text-white transition shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {guardandoPagoFactura ? "Guardando..." : "Confirmar Pago"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
