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
  Ban,
  AlertTriangle,
  Phone,
  MapPin,
  Save,
  FileText,
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
  estado: "pendiente" | "vencida" | "pagada" | "cancelada";
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
  canceladas?: number;
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
  const [modalDesinstalacion, setModalDesinstalacion] = useState(false);
  const [procesandoDesinstalacion, setProcesandoDesinstalacion] = useState(false);
  const [guardandoCita, setGuardandoCita] = useState(false);

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

  const eliminarRecurrente = async (item: RecurrenteCliente) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente la recurrencia “${item.concepto}”?`)) return;
    try {
      await api(`/api/facturacion/recurrentes/${item.id}`, {
        method: "DELETE",
      });
      await cargarFacturacionCliente();
      alert("Cobro recurrente eliminado con éxito.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar recurrencia");
    }
  };

  const ejecutarDesinstalacionPorFaltaDePago = async () => {
    const id = idCliente || cliente?.idcliente;
    if (!id) return;
    setProcesandoDesinstalacion(true);
    try {
      const res = await api<{ msg?: string; cuotas_canceladas?: number }>(
        `/api/clientes/${id}/desinstalacion-falta-pago`,
        { method: "POST" },
      );
      setModalDesinstalacion(false);
      await Promise.all([cargarInicioCliente(), cargarFacturacionCliente()]);
      if (citaSeleccionada > 0) {
        const citaObj = citas.find((c) => c.idcita === citaSeleccionada);
        if (citaObj) await setearCitaSeleccionada(citaObj);
      }
      alert(res.msg || "Desinstalación por falta de pago registrada correctamente.");
    } catch (err) {
      console.error("Error al procesar desinstalacion:", err);
      alert(err instanceof Error ? err.message : "Error al procesar desinstalación por falta de pago.");
    } finally {
      setProcesandoDesinstalacion(false);
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
      alert(error instanceof Error ? error.message : "No se pudo deshabilitar la cita.");
    }
  };

  const actualizarCita = async () => {
    if (isSundayKey(fecha)) {
      alert("No se pueden reprogramar citas los domingos.");
      return;
    }

    setGuardandoCita(true);
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
        alert("Error al actualizar la cita.");
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

      alert("Cita actualizada correctamente.");
      await cargarInicioCliente();
    } catch (error) {
      console.error("Error al actualizar la cita:", error);
      alert("Error al actualizar la cita. Por favor, inténtalo de nuevo.");
    } finally {
      setGuardandoCita(false);
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

    const cuotasValidas = cuotas.filter((cuota) => Number(cuota.pagado) !== 2);
    const totalCuotas = cuotasValidas.reduce((suma, cuota) => suma + Number(cuota.monto || 0), 0);
    const pagadoCuotas = cuotasValidas
      .filter((cuota) => Number(cuota.pagado) === 1)
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
    const filas = cuotasValidas.map((cuota, indice) => `
      <tr>
        <td>${indice + 1}</td>
        <td>${fecha(cuota.vencimiento)}</td>
        <td>${escapeHtml(cuota.metodo || "-")}</td>
        <td>${Number(cuota.pagado) === 1 ? `Pagada${cuota.fechapago ? ` - ${fecha(cuota.fechapago)}` : ""}` : "Pendiente"}</td>
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
    <div className="w-full space-y-4 max-w-7xl mx-auto">
      {loading && <Loading />}
      {!loading && (
        <>
          {/* Header del Cliente */}
          <div className="alt-page-header">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (citaSeleccionada > 0) {
                    volverAlListado();
                  } else {
                    navigate(-1);
                  }
                }}
                className="alt-btn alt-btn-secondary alt-btn-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="alt-page-title m-0 flex items-center gap-2">
                    <User className="h-5 w-5" style={{ color: "var(--alt-primary)" }} />
                    <span>{cliente?.nombre}</span>
                  </h1>
                  <button
                    type="button"
                    onClick={modificarNombreCliente}
                    className="alt-btn alt-btn-secondary alt-btn-sm p-1 inline-flex items-center justify-center cursor-pointer"
                    title="Modificar nombre"
                    aria-label="Modificar nombre del cliente"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                {cliente?.email ? (
                  <div className="alt-page-subtitle flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5 opacity-70" />
                    <span>{cliente.email}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={agregarEmailCliente}
                    className="alt-btn alt-btn-secondary alt-btn-sm mt-1 inline-flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Mail className="h-3 w-3" />
                    <span>Agregar email</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Desinstalación por falta de pago */}
              {(() => {
                const tieneCuotasPendientes = Boolean(
                  deudaTotal > 0 ||
                  cuotas.some((c) => Number(c.pagado) === 0) ||
                  facturas.some((f) => f.estado === "pendiente" || f.estado === "vencida" || Number(f.saldo || 0) > 0)
                );
                return (
                  <button
                    type="button"
                    disabled={!tieneCuotasPendientes || procesandoDesinstalacion}
                    onClick={() => setModalDesinstalacion(true)}
                    className={`alt-btn ${tieneCuotasPendientes ? "alt-btn-danger" : "alt-btn-secondary"} alt-btn-sm flex items-center gap-1.5`}
                    style={{ opacity: tieneCuotasPendientes ? 1 : 0.4 }}
                    title={
                      tieneCuotasPendientes
                        ? "Desinstalación por falta de pago"
                        : "El cliente no tiene cuotas ni saldos pendientes"
                    }
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Desinstalación por falta de pago</span>
                  </button>
                );
              })()}

              {/* Badge Deuda Total */}
              <div
                className={`alt-badge ${deudaTotal > 0 ? "alt-badge-amber" : "alt-badge-green"}`}
                style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 700, borderRadius: "4px" }}
              >
                {deudaTotal > 0 ? (
                  <span>DEUDA: <FormatearNumero numero={deudaTotal} /></span>
                ) : (
                  <span>SIN DEUDAS</span>
                )}
              </div>
            </div>
          </div>

          {/* Panel de Accesos Rápidos — visible solo en listado general */}
          {citaSeleccionada === 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {/* Última cita */}
              {(() => {
                const citasActivas = citas.filter(c => Number(c.eliminado) !== 1);
                const ultima = citasActivas[0] ?? null;
                return (
                  <div
                    onClick={() => ultima && setearCitaSeleccionada(ultima)}
                    className="alt-info-box"
                    style={{ cursor: ultima ? "pointer" : "default", margin: 0, opacity: ultima ? 1 : 0.6 }}
                  >
                    <div className="alt-info-box-icon c-blue">
                      <CalendarFold className="h-5 w-5" />
                    </div>
                    <div className="alt-info-box-content">
                      <span className="alt-info-box-text">Última cita</span>
                      <span className="alt-info-box-number" style={{ fontSize: "13px" }}>{ultima ? ultima.dia : "—"}</span>
                      <span className="alt-info-box-sub truncate">{ultima ? `${ultima.hora} · ${ultima.asignado}` : "Sin historial"}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Próxima cita */}
              {(() => {
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const proxima = citas
                  .filter(c => Number(c.eliminado) !== 1)
                  .slice()
                  .reverse()
                  .find(c => {
                    const d = new Date(c.dia_format + "T00:00:00");
                    return d >= hoy;
                  }) ?? null;
                return (
                  <div
                    onClick={() => proxima && setearCitaSeleccionada(proxima)}
                    className="alt-info-box"
                    style={{ cursor: proxima ? "pointer" : "default", margin: 0, opacity: proxima ? 1 : 0.6 }}
                  >
                    <div className="alt-info-box-icon c-green">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="alt-info-box-content">
                      <span className="alt-info-box-text">Próxima cita</span>
                      <span className="alt-info-box-number" style={{ fontSize: "13px" }}>{proxima ? proxima.dia : "Sin agendar"}</span>
                      <span className="alt-info-box-sub truncate">{proxima ? proxima.hora : "—"}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Deuda actual */}
              <div
                onClick={() => setPestanaCliente("facturas")}
                className="alt-info-box"
                style={{ cursor: "pointer", margin: 0 }}
              >
                <div className={`alt-info-box-icon ${deudaTotal > 0 ? "c-orange" : "c-green"}`}>
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-text">Deuda actual</span>
                  <span className="alt-info-box-number" style={{ fontSize: "14px" }}>
                    <FormatearNumero numero={deudaTotal} />
                  </span>
                  <span className="alt-info-box-sub">{deudaTotal > 0 ? "Ver facturas" : "Al día ✓"}</span>
                </div>
              </div>

              {/* Tipo de servicio */}
              {(() => {
                const tieneInternet = citas.some(c => Number(c.eliminado) !== 1 && esInternet(c.tipo));
                const tieneCamaras = citas.some(c => Number(c.eliminado) !== 1 && esCamaras(c.tipo));
                return (
                  <div className="alt-info-box" style={{ margin: 0 }}>
                    <div className="alt-info-box-icon c-orange">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div className="alt-info-box-content">
                      <span className="alt-info-box-text">Servicio</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {tieneInternet && <span className="alt-badge alt-badge-orange" style={{ fontSize: "9px" }}>Internet</span>}
                        {tieneCamaras && <span className="alt-badge alt-badge-blue" style={{ fontSize: "9px" }}>Cámaras</span>}
                        {!tieneInternet && !tieneCamaras && <span className="text-xs opacity-50">General</span>}
                      </div>
                      <span className="alt-info-box-sub">{citas.filter(c => Number(c.eliminado) !== 1).length} cita(s)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Cobros recurrentes */}
              <div
                onClick={() => setPestanaCliente("facturas")}
                className="alt-info-box"
                style={{ cursor: "pointer", margin: 0 }}
              >
                <div className="alt-info-box-icon c-blue">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-text">Recurrentes</span>
                  <span className="alt-info-box-number" style={{ fontSize: "13px" }}>
                    {recurrentes.filter(r => Number(r.activa)).length} activos
                  </span>
                  <span className="alt-info-box-sub truncate">
                    {recurrentes.filter(r => Number(r.activa)).length > 0
                      ? `$${recurrentes.filter(r => Number(r.activa)).reduce((a, r) => a + Number(r.monto), 0).toFixed(2)}/mes`
                      : "Sin cobros"}
                  </span>
                </div>
              </div>

              {/* Facturas */}
              <div
                onClick={() => setPestanaCliente("facturas")}
                className="alt-info-box"
                style={{ cursor: "pointer", margin: 0 }}
              >
                <div className={`alt-info-box-icon ${(resumenFacturacion?.pendientes ?? 0) + (resumenFacturacion?.vencidas ?? 0) > 0 ? "c-red" : "c-gray"}`}>
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div className="alt-info-box-content">
                  <span className="alt-info-box-text">Facturas</span>
                  <span className="alt-info-box-number" style={{ fontSize: "13px" }}>
                    {(resumenFacturacion?.pendientes ?? 0) + (resumenFacturacion?.vencidas ?? 0) > 0
                      ? `${(resumenFacturacion?.pendientes ?? 0) + (resumenFacturacion?.vencidas ?? 0)} pend.`
                      : `${resumenFacturacion?.pagadas ?? 0} pagadas`}
                  </span>
                  <span className="alt-info-box-sub">Total: {resumenFacturacion?.total_facturas ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navegación de Pestañas cuando no hay cita seleccionada */}
          {citaSeleccionada === 0 && (
            <div className="alt-tabs">
              <button
                type="button"
                onClick={() => setPestanaCliente("citas")}
                className={`alt-tab ${pestanaCliente === "citas" ? "active" : ""}`}
              >
                <CalendarFold className="h-4 w-4" />
                <span>Citas y Servicios</span>
                <span className="alt-badge alt-badge-gray" style={{ marginLeft: "6px" }}>
                  {citas.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestanaCliente("facturas")}
                className={`alt-tab ${pestanaCliente === "facturas" ? "active" : ""}`}
              >
                <ReceiptText className="h-4 w-4" />
                <span>Facturación y Recurrentes</span>
                <span className="alt-badge alt-badge-gray" style={{ marginLeft: "6px" }}>
                  {facturas.length}
                </span>
                {resumenFacturacion && (resumenFacturacion.pendientes + resumenFacturacion.vencidas > 0) && (
                  <span className="alt-badge alt-badge-amber" style={{ marginLeft: "6px" }}>
                    {resumenFacturacion.pendientes + resumenFacturacion.vencidas} pendientes
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Vista cuando no hay cita seleccionada */}
          {citaSeleccionada === 0 ? (
            pestanaCliente === "citas" ? (
              <div className="alt-card">
                <div className="alt-card-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarFold className="h-4 w-4" style={{ color: "var(--alt-primary)" }} />
                    <span>Historial de Citas y Servicios ({citas.length})</span>
                  </div>
                </div>

                {citas.length === 0 ? (
                  <div className="alt-card-body text-center text-sm opacity-60 py-8">
                    Este cliente no tiene citas registradas.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--alt-card-border)" }}>
                    {citas.map((cita) => (
                      <div
                        key={cita.idcita}
                        className={`p-4 transition-colors cursor-pointer flex flex-col gap-2.5 ${
                          Number(cita.eliminado) === 1 ? "opacity-60 grayscale cursor-not-allowed" : "hover:bg-[rgba(255,255,255,0.03)]"
                        }`}
                        style={{
                          backgroundColor: cita.idcita === citaSeleccionada ? "rgba(243, 156, 18, 0.08)" : "transparent",
                          borderLeft: cita.idcita === citaSeleccionada ? "3px solid var(--alt-primary)" : "3px solid transparent",
                        }}
                        onClick={() => Number(cita.eliminado) !== 1 && setearCitaSeleccionada(cita)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {Number(cita.eliminado) === 1 ? (
                              <span className="alt-badge alt-badge-red font-bold">CITA ELIMINADA</span>
                            ) : user?.rol === "superadmin" ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void eliminarCita(cita.idcita);
                                }}
                                className="alt-btn alt-btn-danger alt-btn-sm p-1 inline-flex items-center justify-center cursor-pointer"
                                title="Deshabilitar cita"
                                aria-label="Deshabilitar cita"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}

                            <span className="alt-badge alt-badge-blue flex items-center gap-1">
                              <CalendarFold className="h-3 w-3" />
                              <span>{cita.dia}</span>
                            </span>

                            <span className="alt-badge alt-badge-orange flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{cita.hora}</span>
                            </span>

                            {esInternet(cita.tipo) && (
                              <span className="alt-badge alt-badge-orange flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span>INTERNET</span>
                              </span>
                            )}

                            {esCamaras(cita.tipo) && (
                              <span className="alt-badge alt-badge-blue flex items-center gap-1">
                                <Cctv className="h-3 w-3" />
                                <span>CAMARAS</span>
                              </span>
                            )}

                            {esInstalacion(cita.tipo) && (
                              <span className="alt-badge alt-badge-purple flex items-center gap-1">
                                <Drill className="h-3 w-3" />
                                <span>INSTALACION</span>
                              </span>
                            )}

                            {esSoporte(cita.tipo) && (
                              <span className="alt-badge alt-badge-green flex items-center gap-1">
                                <Wrench className="h-3 w-3" />
                                <span>SOPORTE</span>
                              </span>
                            )}

                            <span
                              className="alt-badge"
                              style={{
                                backgroundColor: cita.color || "#4b545c",
                                color: "#ffffff",
                                borderColor: darkenColor(cita.color || "#4b545c", 0.3),
                              }}
                            >
                              {cita.estado}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {Number(cita.deuda_cita || 0) > 0 && (
                              <span className="alt-badge alt-badge-amber font-bold">
                                Debe: <FormatearNumero numero={Number(cita.deuda_cita || 0)} />
                              </span>
                            )}
                            {Number(cita.pagado_cita || 0) > 0 && (
                              <span className="alt-badge alt-badge-green font-bold">
                                Pagado: <FormatearNumero numero={Number(cita.pagado_cita || 0)} />
                              </span>
                            )}
                          </div>
                        </div>

                        {(cita.tipo === "camaras-tiene-nuevo-instalacion" ||
                          cita.tipo === "camaras-tiene-existente-instalacion") && (
                          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                            <TriangleAlert className="h-3.5 w-3.5" />
                            <span>Ya tiene cámaras instaladas</span>
                          </div>
                        )}

                        {cita.domicilio.trim() && (
                          <div className="text-sm flex gap-2 items-start font-medium" style={{ color: "var(--alt-text)" }}>
                            <House className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--alt-primary)" }} />
                            <span className="break-words">{cita.domicilio}</span>
                          </div>
                        )}

                        {cita.notas.trim() && (
                          <div
                            className="text-xs p-2.5 rounded"
                            style={{
                              backgroundColor: "var(--alt-card-header)",
                              border: "1px solid var(--alt-card-border)",
                              color: "var(--alt-text-muted)",
                            }}
                          >
                            <strong style={{ color: "var(--alt-text)" }}>Notas: </strong>
                            <span className="whitespace-pre-wrap">{cita.notas}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1" style={{ color: "var(--alt-text-muted)" }}>
                          <span>
                            Asignado a: <strong style={{ color: "var(--alt-text)" }}>{cita.asignado}</strong>
                          </span>
                          <span className="text-xs underline hover:text-white">Ver detalles →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Sección de Facturas y Cobros Recurrentes */
              <div className="space-y-4">
                {/* Cobros Recurrentes Configurados */}
                {recurrentes.length > 0 && (
                  <div className="alt-card">
                    <div className="alt-card-header flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" style={{ color: "var(--alt-primary)" }} />
                      <span>Cobros Recurrentes Mensuales</span>
                    </div>
                    <div className="alt-card-body">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {recurrentes.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-3.5 rounded border flex flex-col justify-between gap-3"
                            style={{
                              backgroundColor: "var(--alt-card-header)",
                              borderColor: "var(--alt-card-border)",
                              opacity: Number(rec.activa) ? 1 : 0.6,
                            }}
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--alt-text)" }}>
                                  {rec.concepto}
                                </div>
                                <span className={`alt-badge ${Number(rec.activa) ? "alt-badge-green" : "alt-badge-gray"}`}>
                                  {Number(rec.activa) ? "Activo" : "Pausado"}
                                </span>
                              </div>
                              <div className="text-lg font-bold" style={{ color: "var(--alt-primary)" }}>
                                <FormatearNumero numero={rec.monto} />
                                <span className="text-xs font-normal" style={{ color: "var(--alt-text-muted)" }}> / mes</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-xs pt-2 border-t" style={{ borderColor: "var(--alt-card-border)", color: "var(--alt-text-muted)" }}>
                              <div>Vence día: <strong style={{ color: "var(--alt-text)" }}>{rec.dia_vencimiento}</strong></div>
                              <div>Generadas: <strong style={{ color: "var(--alt-text)" }}>{rec.facturas_generadas}</strong></div>
                              <div className="col-span-2 truncate">Próx. gen: <strong style={{ color: "var(--alt-text)" }}>{rec.proxima_generacion}</strong></div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => toggleRecurrente(rec)}
                                className="alt-btn alt-btn-secondary alt-btn-sm flex-1 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {Number(rec.activa) ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                <span>{Number(rec.activa) ? "Pausar" : "Reactivar"}</span>
                              </button>
                              {Number(rec.activa) === 0 && (
                                <button
                                  type="button"
                                  onClick={() => eliminarRecurrente(rec)}
                                  className="alt-btn alt-btn-danger alt-btn-sm flex items-center justify-center gap-1 cursor-pointer"
                                  title="Eliminar cobro recurrente"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Eliminar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Listado de Facturas */}
                <div className="alt-card">
                  <div className="alt-card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-4 w-4" style={{ color: "var(--alt-primary)" }} />
                      <span>Facturas del Cliente ({facturas.length})</span>
                    </div>
                  </div>

                  {facturas.length === 0 ? (
                    <div className="alt-card-body text-center text-sm opacity-60 py-8">
                      No hay facturas generadas para este cliente todavía.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="alt-table">
                        <thead>
                          <tr>
                            <th>Factura #</th>
                            <th>Origen</th>
                            <th>Concepto</th>
                            <th>Emisión</th>
                            <th>Vence</th>
                            <th className="text-right">Total / Saldo</th>
                            <th>Estado</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facturas.map((fac) => (
                            <tr
                              key={fac.id}
                              style={{
                                opacity: fac.estado === "cancelada" ? 0.6 : 1,
                              }}
                            >
                              <td className="font-mono font-bold" style={{ color: "var(--alt-primary)" }}>
                                {fac.numero_factura}
                              </td>
                              <td>
                                <span className={`alt-badge ${fac.origen === "recurrente" ? "alt-badge-purple" : "alt-badge-gray"}`}>
                                  {fac.origen === "recurrente" ? "Recurrente" : "Manual"}
                                </span>
                              </td>
                              <td>
                                <div className={`font-semibold ${fac.estado === "cancelada" ? "line-through opacity-60" : ""}`}>
                                  {fac.concepto || "Plan de pagos"}
                                </div>
                                {fac.metodo_nombre && (
                                  <div className="text-xs opacity-60">Método: {fac.metodo_nombre}</div>
                                )}
                              </td>
                              <td className="text-xs whitespace-nowrap">{fac.fecha_emision}</td>
                              <td className="text-xs whitespace-nowrap">{fac.vencimiento}</td>
                              <td className="text-right whitespace-nowrap">
                                <div className="font-bold">
                                  <FormatearNumero numero={fac.total} />
                                </div>
                                {fac.estado === "cancelada" ? (
                                  <div className="text-xs opacity-50 italic">Cancelada</div>
                                ) : Number(fac.saldo) > 0 ? (
                                  <div className="text-xs font-semibold" style={{ color: "var(--alt-warning)" }}>
                                    Saldo: <FormatearNumero numero={fac.saldo} />
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <span
                                  className={`alt-badge ${
                                    fac.estado === "pagada"
                                      ? "alt-badge-green"
                                      : fac.estado === "vencida"
                                      ? "alt-badge-red"
                                      : fac.estado === "cancelada"
                                      ? "alt-badge-gray"
                                      : "alt-badge-amber"
                                  }`}
                                >
                                  {fac.estado === "cancelada" ? "Cancelada" : fac.estado}
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {fac.estado === "cancelada" ? (
                                    <span className="alt-badge alt-badge-gray">Cancelada</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => togglePagoFactura(fac)}
                                      disabled={guardandoPagoFactura}
                                      title={Number(fac.pagado) ? "Factura Pagada (Clic para revertir)" : "Marcar como pagada"}
                                      className={`alt-btn alt-btn-sm ${Number(fac.pagado) ? "alt-btn-success" : "alt-btn-primary"} flex items-center gap-1 cursor-pointer`}
                                    >
                                      {Number(fac.pagado) ? (
                                        <>
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          <span>Pagada</span>
                                        </>
                                      ) : (
                                        <>
                                          <CircleDollarSign className="h-3.5 w-3.5" />
                                          <span>Pagar</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => descargarPdfFactura(fac.id, fac.numero_factura)}
                                    title="Descargar PDF"
                                    className="alt-btn alt-btn-secondary alt-btn-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileDown className="h-3.5 w-3.5" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* Vista Detallada de Cita Seleccionada */
            <div className="w-full space-y-4">
              {citas
                .filter((cita) => cita.idcita === citaSeleccionada)
                .map((cita) => (
                  <div key={cita.idcita} className="space-y-4">
                    {/* Card Principal: Datos de la Cita */}
                    <div className="alt-card">
                      <div className="alt-card-header flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={volverAlListado}
                            className="alt-btn alt-btn-secondary alt-btn-sm flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Volver</span>
                          </button>

                          <span className="font-bold text-sm text-white">
                            Cita #{cita.idcita}
                          </span>

                          <span className="alt-badge alt-badge-blue flex items-center gap-1">
                            <CalendarFold className="h-3 w-3" />
                            <span>{cita.dia}</span>
                          </span>

                          <span className="alt-badge alt-badge-orange flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{cita.hora}</span>
                          </span>

                          {esInternet(cita.tipo) && (
                            <span className="alt-badge alt-badge-orange flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span>INTERNET</span>
                            </span>
                          )}

                          {esCamaras(cita.tipo) && (
                            <span className="alt-badge alt-badge-blue flex items-center gap-1">
                              <Cctv className="h-3 w-3" />
                              <span>CÁMARAS</span>
                            </span>
                          )}

                          {esInstalacion(cita.tipo) && (
                            <span className="alt-badge alt-badge-purple flex items-center gap-1">
                              <Drill className="h-3 w-3" />
                              <span>INSTALACIÓN</span>
                            </span>
                          )}

                          {esSoporte(cita.tipo) && (
                            <span className="alt-badge alt-badge-green flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span>SOPORTE</span>
                            </span>
                          )}

                          <span
                            className="alt-badge"
                            style={{
                              backgroundColor: cita.color || "#4b545c",
                              color: "#ffffff",
                              borderColor: darkenColor(cita.color || "#4b545c", 0.3),
                            }}
                          >
                            {cita.estado}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={guardandoCita}
                            onClick={() => actualizarCita()}
                            className="alt-btn alt-btn-primary alt-btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>{guardandoCita ? "Guardando..." : "Guardar Cambios"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 space-y-4">
                        {(cita.tipo === "camaras-tiene-nuevo-instalacion" ||
                          cita.tipo === "camaras-tiene-existente-instalacion") && (
                          <div className="alt-notice alt-notice-info">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <TriangleAlert className="h-4 w-4" />
                              <span>Información técnica: El cliente ya tiene cámaras instaladas previamente.</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="alt-form-group m-0">
                            <label className="alt-label">Fecha de la Cita</label>
                            <DatePicker
                              selected={dateKeyToDate(fecha)}
                              onChange={(date: Date | null) =>
                                setFecha(date ? formatDateKey(date) : "")
                              }
                              filterDate={isSelectableAgendaDate}
                              dayClassName={agendaDayClassName}
                              dateFormat="MM/dd/yyyy"
                              placeholderText="Seleccionar fecha"
                              className="alt-input w-full"
                              wrapperClassName="w-full"
                              calendarClassName="agenda-datepicker"
                            />
                          </div>

                          <div className="alt-form-group m-0">
                            <label className="alt-label">Hora de la Cita</label>
                            <DatePicker
                              showTimeSelect
                              showTimeSelectOnly
                              timeIntervals={15}
                              timeCaption="Hora"
                              dateFormat="h:mm aa"
                              calendarClassName="agenda-timepicker"
                              className="alt-input w-full"
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

                          <div className="alt-form-group m-0">
                            <label className="alt-label">Estado</label>
                            <select
                              className="alt-select capitalize w-full"
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

                          <div className="alt-form-group m-0">
                            <label className="alt-label">Técnico Asignado</label>
                            <select
                              className="alt-select capitalize w-full"
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

                          <div className="alt-form-group m-0">
                            <label className="alt-label">Teléfono de Contacto</label>
                            <input
                              name="telefono"
                              value={telefono}
                              onChange={(e) => setTelefono(e.target.value)}
                              placeholder="(555) 000-0000"
                              className="alt-input w-full"
                            />
                          </div>

                          <div className="alt-form-group m-0">
                            <label className="alt-label">Dirección / Domicilio</label>
                            <input
                              name="direccion"
                              value={direccion}
                              onChange={(e) => setDireccion(e.target.value)}
                              placeholder="Calle, número, ciudad..."
                              className="alt-input uppercase w-full"
                            />
                          </div>
                        </div>

                        <div className="alt-form-group m-0 pt-2">
                          <label className="alt-label">Observaciones y Notas de la Cita</label>
                          <textarea
                            name="notas"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={3}
                            placeholder="Escribe aquí observaciones, acuerdos o instrucciones de esta cita..."
                            className="alt-input resize-y w-full"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--alt-card-border)" }}>
                          <button
                            type="button"
                            onClick={volverAlListado}
                            className="alt-btn alt-btn-secondary alt-btn-sm cursor-pointer"
                          >
                            Volver al listado
                          </button>
                          <button
                            type="button"
                            disabled={guardandoCita}
                            onClick={() => actualizarCita()}
                            className="alt-btn alt-btn-primary alt-btn-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>{guardandoCita ? "Guardando..." : "Guardar Cambios"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Plan de Pagos de la Cita (Ancho Completo) */}
                    {idPago === null ? (
                      !mostrarPlanPagos ? (
                        <div className="alt-card">
                          <div className="alt-card-header flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CircleDollarSign className="h-4 w-4" style={{ color: "var(--alt-primary)" }} />
                              <span className="font-bold">Plan de Pagos de la Cita</span>
                            </div>
                          </div>
                          <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                              <ClipboardPlus className="h-6 w-6" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white m-0">Esta cita no tiene Plan de Pagos</h4>
                              <p className="text-xs text-white/50 mt-1 max-w-sm">
                                Puedes agregar un plan de cuotas y enganche para este servicio.
                              </p>
                            </div>
                            <button
                              type="button"
                              className="alt-btn alt-btn-primary alt-btn-sm flex items-center gap-1.5 cursor-pointer shadow-md"
                              onClick={() => setMostrarPlanPagos(true)}
                            >
                              <ClipboardPlus className="h-4 w-4" />
                              <span>Agregar Plan de Pagos</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="alt-card">
                          <div className="alt-card-header flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ClipboardPlus className="h-4 w-4" style={{ color: "var(--alt-primary)" }} />
                              <span className="font-bold">Crear Plan de Pagos</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setMostrarPlanPagos(false)}
                              className="alt-btn alt-btn-secondary alt-btn-sm text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                          <div className="p-4">
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
                            className="alt-btn alt-btn-secondary alt-btn-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>Exportar PDF</span>
                          </button>
                        }
                        onActualizado={() => {
                          const citaActual = citas.find((c) => c.idcita === citaSeleccionada);
                          if (citaActual) setearCitaSeleccionada(citaActual);
                          cargarInicioCliente();
                        }}
                      />
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Modal de Registro / Confirmación de Pago de Factura */}
          {modalPagoFactura && (
            <div
              className="alt-modal-overlay"
              onMouseDown={() => setModalPagoFactura(null)}
            >
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="alt-modal max-w-md w-full"
              >
                <div className="alt-modal-header">
                  <div className="alt-modal-title">
                    Registrar Pago — Factura #{modalPagoFactura.numero_factura}
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalPagoFactura(null)}
                    className="alt-btn alt-btn-secondary alt-btn-sm p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="alt-modal-body space-y-3">
                  <div className="p-3 rounded border text-xs space-y-1" style={{ backgroundColor: "var(--alt-card-header)", borderColor: "var(--alt-card-border)" }}>
                    <div style={{ color: "var(--alt-text-muted)" }}>Concepto: <strong style={{ color: "var(--alt-text)" }}>{modalPagoFactura.concepto || "Plan de pagos"}</strong></div>
                    <div style={{ color: "var(--alt-text-muted)" }}>Total a pagar: <strong style={{ color: "var(--alt-success)" }}><FormatearNumero numero={modalPagoFactura.saldo || modalPagoFactura.total} /></strong></div>
                  </div>

                  <div className="alt-form-group">
                    <label className="alt-label">Método de pago</label>
                    <select
                      value={metodoSeleccionadoModal}
                      onChange={(e) => setMetodoSeleccionadoModal(Number(e.target.value))}
                      className="alt-select"
                    >
                      {metodosPago.map((m) => (
                        <option key={m.id} value={m.id}>{m.metodo}</option>
                      ))}
                    </select>
                  </div>

                  <div className="alt-form-group">
                    <label className="alt-label">Fecha de pago</label>
                    <input
                      type="date"
                      value={fechaPagoModal}
                      onChange={(e) => setFechaPagoModal(e.target.value)}
                      className="alt-input"
                    />
                  </div>

                  <div className="alt-form-group">
                    <label className="alt-label">Nota o Comprobante (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: Transferencia Zelle #1234"
                      value={notaPagoModal}
                      onChange={(e) => setNotaPagoModal(e.target.value)}
                      className="alt-input"
                    />
                  </div>
                </div>

                <div className="alt-modal-footer">
                  <button
                    type="button"
                    onClick={() => setModalPagoFactura(null)}
                    className="alt-btn alt-btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={guardandoPagoFactura}
                    onClick={confirmarPagoModal}
                    className="alt-btn alt-btn-success"
                  >
                    {guardandoPagoFactura ? "Guardando..." : "Confirmar Pago"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmación: Desinstalación por Falta de Pago */}
          {modalDesinstalacion && (
            <div
              className="alt-modal-overlay"
              onMouseDown={() => !procesandoDesinstalacion && setModalDesinstalacion(false)}
            >
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="alt-modal max-w-lg w-full"
                style={{ borderColor: "var(--alt-danger)" }}
              >
                <div className="alt-modal-header" style={{ borderBottomColor: "var(--alt-danger)" }}>
                  <div className="alt-modal-title flex items-center gap-2" style={{ color: "var(--alt-danger)" }}>
                    <AlertTriangle className="h-5 w-5" />
                    <span>Desinstalación por Falta de Pago</span>
                  </div>
                  <button
                    type="button"
                    disabled={procesandoDesinstalacion}
                    onClick={() => setModalDesinstalacion(false)}
                    className="alt-btn alt-btn-secondary alt-btn-sm p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="alt-modal-body space-y-3">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--alt-text)" }}>
                    Estás a punto de registrar la <strong style={{ color: "var(--alt-danger)" }}>desinstalación por falta de pago</strong> para el cliente <strong>{cliente?.nombre}</strong>.
                  </p>
                  <div className="p-3 rounded border text-xs space-y-1.5" style={{ backgroundColor: "rgba(220, 53, 69, 0.1)", borderColor: "rgba(220, 53, 69, 0.3)" }}>
                    <div className="font-bold" style={{ color: "var(--alt-danger)" }}>
                      Efectos automáticos del proceso:
                    </div>
                    <ul className="list-disc list-inside space-y-1" style={{ color: "var(--alt-text-muted)" }}>
                      <li>Las citas activas cambiarán su estado a <strong style={{ color: "var(--alt-text)" }}>DESINSTALACIÓN A PROGRAMAR</strong>.</li>
                      <li>Todos los cobros recurrentes activos serán <strong style={{ color: "var(--alt-text)" }}>pausados</strong> automáticamente.</li>
                      <li>Se <strong style={{ color: "var(--alt-text)" }}>cancelarán todos los saldos y cuotas pendientes</strong>.</li>
                      <li>Las cuotas canceladas <strong style={{ color: "var(--alt-text)" }}>no se eliminarán</strong>; permanecerán en el historial identificadas en color gris.</li>
                      <li>El cliente <strong style={{ color: "var(--alt-text)" }}>no aparecerá en las listas de vencidos ni pendientes</strong>.</li>
                    </ul>
                  </div>
                </div>

                <div className="alt-modal-footer">
                  <button
                    type="button"
                    disabled={procesandoDesinstalacion}
                    onClick={() => setModalDesinstalacion(false)}
                    className="alt-btn alt-btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={procesandoDesinstalacion}
                    onClick={ejecutarDesinstalacionPorFaltaDePago}
                    className="alt-btn alt-btn-danger flex items-center gap-1.5"
                  >
                    {procesandoDesinstalacion ? (
                      <span>Procesando...</span>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        <span>Confirmar Desinstalación</span>
                      </>
                    )}
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
