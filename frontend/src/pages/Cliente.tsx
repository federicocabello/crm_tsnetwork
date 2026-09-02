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

export default function Cliente() {
  const { idCliente } = useParams<{ idCliente: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
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

          {/* Vista cuando no hay cita seleccionada (Lista de citas) */}
          {citaSeleccionada === 0 ? (
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
        </>
      )}
    </div>
  );
}
