import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";
import { Mail, User, CalendarFold, Cctv, Wrench, TriangleAlert, Clock, House, ClipboardPlus, Globe, Drill, Trash2, Pencil, ArrowLeft, FileDown } from "lucide-react";
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
  const estadoActual = estados.find((item) => String(item.id) === String(estado));

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
    <div className="flex gap-4 items-start">
      {loading && <Loading />}
      <div className="w-full" hidden={loading || citaSeleccionada > 0}>
        <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 shadow-md mb-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-2xl font-bold text-orange-500">
              <User className="h-6 w-6 shrink-0" />
              <span>{cliente?.nombre}</span>
              <button
                type="button"
                onClick={modificarNombreCliente}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/45 transition hover:bg-white/10 hover:text-orange-300"
                title="Modificar nombre"
                aria-label="Modificar nombre del cliente"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {cliente?.email ? (
              <div className="text-white/60 flex gap-1 text-sm items-center">
                <Mail className="h-4 w-4" />{cliente.email}
              </div>
            ) : (
              <button
                type="button"
                onClick={agregarEmailCliente}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-200 transition hover:bg-orange-500/20"
              >
                <Mail className="h-4 w-4" />
                Agregar email
              </button>
            )}
          </div>

          <div
            className={`text-white px-3 py-1 rounded-lg font-bold border-2 flex flex-col items-center justify-center
            ${deudaTotal > 0
                ? "bg-yellow-600 border-yellow-700"
                : "bg-green-600 border-green-700"
              }
          `}
          >
            {deudaTotal > 0 ? (
              <>
                <div className="text-xs">DEUDA TOTAL</div>
                <div className="text-2xl"><FormatearNumero numero={deudaTotal} /></div>
              </>
            ) : (
              <div className="text-sm font-bold">SIN DEUDAS</div>
            )}
          </div>

        </div>

        <div>
          {citas.length === 0 ? (
            <div className="text-white/60">Este cliente no tiene citas registradas.</div>
          ) : (
            <div
              className="flex max-h-[min(680px,calc(100vh-220px))] flex-col gap-3 overflow-y-auto pr-1"
            >
              {citas.map((cita) => (
                <div key={cita.idcita} className={`bg-zinc-900 border rounded-xl p-4 shadow transition-all
                    ${Number(cita.eliminado) === 1 ? "cursor-not-allowed opacity-60 grayscale border-zinc-600/40" : "cursor-pointer"}
                    ${cita.idcita === citaSeleccionada
                    ? "border-orange-500 shadow-orange-500 hover:shadow-orange-500"
                    : "border-white/10 hover:border-orange-500 hover:shadow-xs"
                  }`} onClick={() => Number(cita.eliminado) !== 1 && setearCitaSeleccionada(cita)}>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-white font-bold">
                      {Number(cita.eliminado) === 1 ? (
                        <div className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-black text-red-300">
                          CITA ELIMINADA
                        </div>
                      ) : user?.rol === "superadmin" ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void eliminarCita(cita.idcita);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                          title="Deshabilitar cita"
                          aria-label="Deshabilitar cita"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}                      <div className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-200 text-center">
                        <CalendarFold className="h-4 w-4" />{cita.dia}
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-200 text-center">
                        <Clock className="h-4 w-4" />{cita.hora}
                      </div>

                      {esInternet(cita.tipo) && (
                        <div className="rounded-full text-xs font-bold py-1 px-2 text-center border-2 border-orange-700 bg-orange-500 flex justify-center items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span>INTERNET</span>
                        </div>
                      )}

                      {esCamaras(cita.tipo) && (
                        <div className="rounded-full text-xs font-bold py-1 px-2 text-center border-2 border-blue-700 bg-blue-500 flex justify-center items-center gap-1">
                          <Cctv className="h-4 w-4" />
                          <span>CAMARAS</span>
                        </div>
                      )}

                      {esInstalacion(cita.tipo) && (
                        <div className="rounded-full text-xs font-bold py-1 px-2 text-center border-2 border-indigo-700 bg-indigo-500 flex justify-center items-center gap-1">
                          <Drill className="h-4 w-4" />
                          <span>INSTALACION</span>
                        </div>
                      )}

                      {esSoporte(cita.tipo) && (
                        <div className="rounded-full text-xs font-bold py-1 px-2 text-center border-2 border-green-700 bg-green-500 flex justify-center items-center gap-1">
                          <Wrench className="h-4 w-4" />
                          <span>SOPORTE</span>
                        </div>
                      )}
                      <div className="rounded-full text-xs font-bold py-1 px-2 cursor-pointer text-center border-2 flex justify-center items-center gap-1" style={{ backgroundColor: cita.color, borderColor: darkenColor(cita.color, 0.5), }}>
                        {cita.estado}
                      </div>


                      {Number(cita.deuda_cita || 0) > 0 && (
                        <div className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2 py-1 text-xs font-bold text-yellow-200">
                          Debe <FormatearNumero numero={Number(cita.deuda_cita || 0)} />
                        </div>
                      )}
                      {Number(cita.pagado_cita || 0) > 0 && (
                        <div className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200">
                          PAGADO <FormatearNumero numero={Number(cita.pagado_cita || 0)} />
                        </div>
                      )}
                      {(cita.tipo == "camaras-tiene-nuevo-instalacion" || cita.tipo == "camaras-tiene-existente-instalacion") && (
                        <div className="text-xs text-yellow-500 font-bold italic flex items-center gap-1">
                          <TriangleAlert className="h-4 w-4" />Ya tiene camaras instaladas
                        </div>
                      )}
                    </div>
                    {cita.domicilio.trim() && (
                      <div className="min-w-0 text-white text-sm flex gap-1 items-start font-bold italic">
                        <House className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 break-words leading-snug">{cita.domicilio}</span>
                      </div>
                    )}

                    {cita.notas.trim() && (
                      <div className="min-w-0 text-white/50 text-sm">
                        <p className="line-clamp-2 break-words whitespace-pre-wrap"><strong>Notas:</strong> {cita.notas}</p>
                        {cita.notas.length > 90 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setearCitaSeleccionada(cita);
                            }}
                            className="mt-1 text-xs font-bold text-orange-300 hover:text-orange-200"
                          >
                            Ver mas...
                          </button>
                        )}
                      </div>
                    )}
                    <div className="mt-auto">
                      <hr className="text-white/10" />
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/60">
                        <span className="min-w-0 truncate italic">
                          Asignado a <strong>{cita.asignado}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {citaSeleccionada > 0 && citaActual && (
        <div className="w-full min-w-0 space-y-4">
          <section className="rounded-xl border border-white/10 bg-zinc-900 p-4 shadow-md">
            <button type="button" onClick={volverAlListado} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4" /> Volver a las citas</button>
            <div className="grid gap-4 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.4fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-2xl font-bold text-orange-500"><User className="h-6 w-6 shrink-0" /><span className="break-words">{cliente?.nombre}</span><button type="button" onClick={modificarNombreCliente} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-orange-300" title="Editar nombre"><Pencil className="h-4 w-4" /></button></div>
                  <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-white ${deudaTotal > 0 ? "border-yellow-700 bg-yellow-600" : "border-green-700 bg-green-600"}`}><span>{deudaTotal > 0 ? "DEUDA TOTAL" : "SIN DEUDAS"}</span>{deudaTotal > 0 && <FormatearNumero numero={deudaTotal} />}</div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-semibold text-white/55">Reprogramar fecha</label><DatePicker selected={dateKeyToDate(fecha)} onChange={(date: Date | null) => setFecha(date ? formatDateKey(date) : "")} filterDate={isSelectableAgendaDate} dayClassName={agendaDayClassName} dateFormat="MM/dd/yyyy" placeholderText="Seleccionar fecha" className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50" wrapperClassName="w-full" calendarClassName="agenda-datepicker" /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-white/55">Reprogramar hora</label><DatePicker showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Hora" dateFormat="h:mm aa" calendarClassName="agenda-timepicker" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-orange-500" selected={hora ?? undefined} onChange={(date: Date | null) => { if (!date) return; setHora(date); setHorario(`${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`); }} /></div>
                </div>
                <div className="mt-3 text-sm text-white/65">{cliente?.email ? <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-orange-300" />{cliente.email}</span> : <button type="button" onClick={agregarEmailCliente} className="inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-200 hover:bg-orange-500/20"><Mail className="h-4 w-4" />Agregar email</button>}</div>
              </div>
              <div className="grid min-w-0 content-start gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-semibold text-white/55">Telefono</label><input value={telefono} onChange={(event) => setTelefono(event.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-white/55">Estado</label><select value={estado} onChange={(event) => setEstado(event.target.value)} className="w-full cursor-pointer rounded-lg border-2 px-3 py-2 text-sm font-bold text-white outline-none" style={{ backgroundColor: estadoActual?.color || "#3f3f46", borderColor: darkenColor(estadoActual?.color || "#3f3f46", 0.5) }}>{estados.map((item) => <option key={item.id} value={item.id} className="bg-white text-black">{item.estado}</option>)}</select></div>
                <div><label className="mb-1 block text-xs font-semibold text-white/55">Direccion</label><input value={direccion} onChange={(event) => setDireccion(event.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm uppercase text-white outline-none focus:border-orange-500/50" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-white/55">Asignado a</label><select value={asignado} onChange={(event) => setAsignado(event.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50">{users.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.fullname}</option>)}</select></div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-orange-500/20 bg-zinc-900 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-orange-200">Nota de la cita</label>
              <button type="button" onClick={() => actualizarCita()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600">Guardar cambios</button>
            </div>
            <textarea value={notas} onChange={(event) => setNotas(event.target.value)} placeholder="Notas importantes de la cita" className="field-sizing-content min-h-28 w-full resize-none rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-3 text-sm text-white outline-none focus:border-orange-500/50" />
          </section>
          {idPago === null ? (
            !mostrarPlanPagos ? (
              <div className="bg-cyan-600 border-2 border-cyan-700 rounded-xl p-2 transition-all w-48 mb-4 flex items-center justify-center gap-1 cursor-pointer hover:bg-cyan-700 hover:border-cyan-800" onClick={() => setMostrarPlanPagos(true)}>
                <ClipboardPlus className="h-4 w-4" />
                <span className="text-sm">Agregar plan de pagos</span>
              </div>
            ) : (
              <div className="mb-4 w-full">
                <PlanDePagos idCliente={idCliente || ""} idCita={citaSeleccionada} onGuardado={() => {
                  const citaActual = citas.find((c) => c.idcita === citaSeleccionada);
                  if (citaActual) setearCitaSeleccionada(citaActual);
                  cargarInicioCliente();
                  setMostrarPlanPagos(false);
                }} />
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
                  <button type="button" onClick={exportarPlanPdf} className="inline-flex items-center gap-2 rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-200 transition hover:bg-orange-500/20">
                    <FileDown className="h-4 w-4" /><span className="hidden sm:inline">Exportar PDF</span>
                  </button>
                }
                onActualizado={() => {
                  // Refrescar cuotas y deuda después de guardar
                  const citaActual = citas.find((c) => c.idcita === citaSeleccionada);
                  if (citaActual) setearCitaSeleccionada(citaActual);
                  cargarInicioCliente();
                }}
              />
          )}




        </div>
      )}

    </div>
  );
}


