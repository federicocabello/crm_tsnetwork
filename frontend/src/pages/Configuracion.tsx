import { useState, useEffect } from "react";
import type { Usuarios } from "../types/auth";
import { PencilIcon, PlusCircleIcon, ArrowRightLeftIcon, ContactRoundIcon, CalendarDays, CreditCard, UsersRound, FolderOpen, ClipboardCheck, XCircle, UserCheck, ChevronLeft } from "lucide-react";
import { ROLES } from "../types/auth";
import Loading from "../components/Loading";
import ConfiguracionCitas from "./ConfiguracionCitas";
import ConfiguracionPagos from "./ConfiguracionPagos";
import UsuarioArchivos from "../components/UsuarioArchivos";
import type { EstadoCita } from "../types/configuracion";

export default function Users() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [citasEstados, setCitasEstados] = useState<EstadoCita[]>([]);
  const [usuarioArchivosAbierto, setUsuarioArchivosAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{ id: number, fullname: string } | null>(null);

  // Reclutamiento States
  const [postulaciones, setPostulaciones] = useState<any[]>([]);
  const [cargandoPostulaciones, setCargandoPostulaciones] = useState<boolean>(false);
  const [postulacionSeleccionada, setPostulacionSeleccionada] = useState<any | null>(null);
  const [modalContratarAbierto, setModalContratarAbierto] = useState<boolean>(false);
  const [nuevoUsername, setNuevoUsername] = useState<string>("");
  const [nuevoPassword, setNuevoPassword] = useState<string>("ts7985");
  const [comentariosEvaluacion, setComentariosEvaluacion] = useState<string>("");

  const fetchPostulaciones = async () => {
    setCargandoPostulaciones(true);
    try {
      const token = localStorage.getItem("B!1w6NAt1T^%kvhUI*S^rC");
      const res = await fetch(`${API_URL}/api/reclutamiento/postulaciones`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPostulaciones(data);
      }
    } catch (err) {
      console.error("Error al obtener postulaciones:", err);
    } finally {
      setCargandoPostulaciones(false);
    }
  };

  const handleEvaluarPostulacion = async (estado: "aprobado" | "rechazado", crearUsuario = false) => {
    if (!postulacionSeleccionada) return;

    if (crearUsuario && (!nuevoUsername.trim() || !nuevoPassword.trim())) {
      alert("Por favor ingresa usuario y contraseña para el técnico.");
      return;
    }

    try {
      const token = localStorage.getItem("B!1w6NAt1T^%kvhUI*S^rC");
      const res = await fetch(`${API_URL}/api/reclutamiento/postulaciones/${postulacionSeleccionada.id}/evaluar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          estado,
          comentarios: comentariosEvaluacion,
          crear_usuario: crearUsuario,
          username: nuevoUsername,
          password: nuevoPassword
        })
      });

      if (res.ok) {
        alert(estado === "aprobado" ? "Técnico contratado y usuario creado con éxito." : "Postulación rechazada.");
        setModalContratarAbierto(false);
        setPostulacionSeleccionada(null);
        setComentariosEvaluacion("");
        setNuevoUsername("");
        fetchPostulaciones();
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error || "Error al evaluar postulación.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al evaluar.");
    }
  };

  type InicioResponse = {
    usuarios: Usuarios[];
    citas_estados: EstadoCita[];
  };

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/configuracion`);

      if (res.status === 200) {
        const data: InicioResponse = await res.json();
        setUsers(data.usuarios);
        setCitasEstados(data.citas_estados);
      } else {
        console.error("Error al traer usuarios. Código:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión con el backend:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    const fullname = prompt("Nombre completo:");
    if (!fullname) return;

    try {
      const res = await fetch(`${API_URL}/api/configuracion/nuevo-usuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.msg)
        fetchUsers();
      } else {
        console.error("Error al agregar usuario. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al agregar usuario:", err);
    }
  };

  const handleGestionUsuario = async (ident: number, dato: string, accion: number, abrirprompt: boolean) => {
    let nuevo;
    let pregunta;
    switch (accion) {
      case 0:
        pregunta = "Usuario nuevo";
        break;
      case 1:
        pregunta = "Contraseña nueva";
        break;
      case 2:
        pregunta = "Nombre de usuario nuevo";
        break;
      case 3:
        nuevo = dato;
        break;
      case 4:
        nuevo = dato;
        break;

      default:
        break;
    }

    if (abrirprompt) {
      nuevo = prompt(pregunta, dato);
      if (!nuevo) return;
    }

    try {
      const res = await fetch(`${API_URL}/api/configuracion/gestion-usuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ident, nuevo, accion }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.msg)
        fetchUsers();
      } else {
        console.error("Error al gestionar usuario. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al gestionar usuario:", err);
    }
  };

  const [ventanaActiva, setVentanaActiva] = useState("usuarios");

  const tabs = [
    { id: "usuarios", label: "Usuarios", icon: UsersRound },
    { id: "citas", label: "Citas", icon: CalendarDays },
    { id: "pagos", label: "Pagos", icon: CreditCard },
    { id: "reclutamiento", label: "Reclutamiento", icon: ClipboardCheck },
  ];

  useEffect(() => {
    if (ventanaActiva === "reclutamiento") {
      fetchPostulaciones();
    }
  }, [ventanaActiva]);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Tabs Bar Horizontal Scrollable */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none border-b border-[var(--bg-border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const activo = ventanaActiva === tab.id;

          return (
            <button
              key={tab.id}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition cursor-pointer ${activo
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--bg-border)] hover:bg-[var(--color-primary-l)] hover:text-orange-500"
                }`}
              onClick={() => setVentanaActiva(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {ventanaActiva == "usuarios" && (
        <div className="flex flex-col lg:flex-row gap-4 w-full min-w-0">
          <div className="w-full lg:w-3/5 xl:w-2/3 cuadro min-w-0">
            <div className="flex flex-wrap gap-2 justify-between items-center pb-3 border-b border-[var(--bg-border)]">
              <h1 className="text-lg font-black tracking-tight">Gestión de Usuarios</h1>
              <button
                onClick={handleAddUser}
                className="btn-primary"
              >
                <PlusCircleIcon className="h-4 w-4" />
                Agregar Usuario
              </button>
            </div>

            {loading ? (
              <div className="w-full flex items-center justify-center py-12">
                <Loading />
              </div>
            ) : (
              <div className="w-full overflow-x-auto mt-4 rounded-xl border border-[var(--bg-border)] shadow-sm">
                <table className="text-sm w-full min-w-[550px]">
                  <thead className="bg-[var(--bg-surface-2)] text-[var(--text-primary)] font-extrabold border-b border-[var(--bg-border)]">
                    <tr>
                      <th className="py-3 px-4 text-left">Nombre</th>
                      <th className="py-3 px-4 text-left">Usuario</th>
                      <th className="py-3 px-4 text-left">Contraseña</th>
                      <th className="py-3 px-4 text-left">Rol</th>
                      <th className="py-3 px-4 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bg-border)]">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-[var(--color-primary-l)] transition">
                        <td className="py-3 px-4 font-bold">
                          {user.rol == "tecnico" && (
                            <ContactRoundIcon className="h-4 w-4 inline mr-1 text-orange-500" />
                          )}
                          {user.fullname} <PencilIcon className="h-3.5 w-3.5 inline ml-1.5 text-blue-500 hover:text-blue-600 transition cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), user.fullname, 2, true)} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {user.user} <PencilIcon className="h-3.5 w-3.5 inline ml-1.5 text-blue-500 hover:text-blue-600 transition cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), user.user, 0, true)} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {user.password} <PencilIcon className="h-3.5 w-3.5 inline ml-1.5 text-blue-500 hover:text-blue-600 transition cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), user.password, 1, true)} />
                        </td>
                        <td className="py-3 px-4">
                          <select className="capitalize bg-[var(--bg-input)] border border-[var(--bg-border)] text-[var(--text-primary)] p-1.5 rounded-lg cursor-pointer text-xs font-semibold w-full" onChange={(e) => handleGestionUsuario(Number(user.id), e.target.value, 3, false)}>
                            <option value={user.rol} selected>{user.rol}</option>
                            {ROLES.filter(role => role !== user.rol).map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-black text-white ${user.habilitado ? "bg-emerald-600" : "bg-red-600"}`}
                            >
                              {user.habilitado ? "Habilitado" : "Deshabilitado"}
                            </span>
                            <button title="Habilitar/deshabilitar" className="btn-icon p-1.5">
                              <ArrowRightLeftIcon className="h-4 w-4 cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), String(!user.habilitado), 4, false)} />
                            </button>
                            <button title="Archivos" className="btn-icon p-1.5 text-orange-500">
                              <FolderOpen className="h-4 w-4 cursor-pointer" onClick={() => { setUsuarioSeleccionado({ id: Number(user.id), fullname: user.fullname }); setUsuarioArchivosAbierto(true); }} />
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

          <div className="w-full lg:w-2/5 xl:w-1/3 cuadro shrink-0">
            <h2 className="text-base font-extrabold mb-3 pb-2 border-b border-[var(--bg-border)]">Descripción de Roles</h2>
            <div className="text-xs space-y-3 leading-relaxed opacity-90">
              <div>
                <p className="font-extrabold text-orange-500">1. Invitado:</p>
                <p>Este rol tiene un <span className="font-bold">acceso restringido</span> al sistema. Los usuarios pueden <span className="font-bold">leer solo datos básicos</span> como agenda, casos y clientes.</p>
              </div>
              <div>
                <p className="font-extrabold text-orange-500">2. Usuario:</p>
                <p>Pueden <strong>agendar llamadas, editar casos, clientes y leads</strong>, pero sin acceso a pagos, reportes ni configuración.</p>
              </div>
              <div>
                <p className="font-extrabold text-orange-500">3. Moderador:</p>
                <p>Permite <strong>ver y modificar pagos</strong>, cambiar notas, fechas y montos. Para eliminar pagos requiere permiso de un administrador.</p>
              </div>
              <div>
                <p className="font-extrabold text-orange-500">4. Administrador:</p>
                <p>Control sobre eliminación y modificación de registros con notificaciones de aprobación.</p>
              </div>
              <div>
                <p className="font-extrabold text-orange-500">5. Superadmin:</p>
                <p>Control total sobre todos los aspectos del CRM, incluyendo configuraciones avanzadas y finanzas.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {ventanaActiva == "citas" && (
        loading ? (
          <Loading />
        ) : (
          <ConfiguracionCitas citasEstados={citasEstados} refreshData={fetchUsers} />
        )
      )}

      {ventanaActiva == "pagos" && (
        <ConfiguracionPagos />
      )}

      {ventanaActiva == "reclutamiento" && (
        <div className="w-full cuadro overflow-x-auto min-w-0">
          {!postulacionSeleccionada ? (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h1 className="text-lg font-extrabold">Listado de Postulaciones Técnicas</h1>
                <span className="text-xs text-[var(--text-muted)]">Revisa y evalúa las pruebas de los candidatos.</span>
              </div>

              {cargandoPostulaciones ? (
                <div className="w-full flex items-center justify-center py-10">
                  <Loading />
                </div>
              ) : postulaciones.length === 0 ? (
                <div className="rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface-2)] p-8 text-center text-[var(--text-muted)]">
                  No hay postulaciones registradas en el sistema.
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-[var(--bg-border)]">
                  <table className="text-sm w-full min-w-[640px]">
                    <thead className="bg-[var(--bg-surface-2)] text-[var(--text-primary)] font-bold border-b border-[var(--bg-border)]">
                      <tr>
                        <th className="py-3 px-4 text-left">Nombre</th>
                        <th className="py-3 px-4 text-left">Email</th>
                        <th className="py-3 px-4 text-left">Teléfono</th>
                        <th className="py-3 px-4 text-left">Fecha Postulación</th>
                        <th className="py-3 px-4 text-left">Estado</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--bg-border)]">
                      {postulaciones.map((post) => (
                        <tr key={post.id} className="hover:bg-[var(--color-primary-l)] transition">
                          <td className="py-3 px-4 font-semibold">{post.nombre}</td>
                          <td className="py-3 px-4 text-xs font-mono">{post.email}</td>
                          <td className="py-3 px-4 text-xs font-mono">{post.telefono}</td>
                          <td className="py-3 px-4 text-xs font-mono">{post.fecha_postulacion}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              post.estado === "aprobado"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                                : post.estado === "rechazado"
                                ? "bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                            }`}>
                              {post.estado === "aprobado" ? "Contratado" : post.estado === "rechazado" ? "Rechazado" : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setPostulacionSeleccionada(post);
                                setNuevoUsername(post.nombre.toLowerCase().replace(/\s+/g, "").substring(0, 12));
                              }}
                              className="btn-primary py-1 px-3 text-xs"
                            >
                              Ver Examen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPostulacionSeleccionada(null)}
                  className="btn-icon p-1.5 cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold">Evaluación de Postulante: {postulacionSeleccionada.nombre}</h1>
                  <p className="text-xs text-[var(--text-muted)]">Postulado el: {postulacionSeleccionada.fecha_postulacion}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--bg-border)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Email</p>
                  <p className="text-sm font-semibold">{postulacionSeleccionada.email}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Teléfono</p>
                  <p className="text-sm font-semibold">{postulacionSeleccionada.telefono}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-[var(--text-muted)]">Dirección</p>
                  <p className="text-sm font-semibold">{postulacionSeleccionada.direccion}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-[var(--text-muted)]">Experiencia previa</p>
                  <p className="text-sm whitespace-pre-line opacity-90">{postulacionSeleccionada.experiencia || "No proporcionada"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-md font-bold text-orange-500 border-b border-[var(--bg-border)] pb-2">Respuestas de la Prueba Técnica</h2>
                {postulacionSeleccionada.respuestas && Array.isArray(postulacionSeleccionada.respuestas) ? (
                  postulacionSeleccionada.respuestas.map((item: any, idx: number) => (
                    <div key={idx} className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--bg-border)] space-y-1.5">
                      <p className="text-sm font-bold">{idx + 1}. {item.pregunta}</p>
                      <p className="text-sm bg-[var(--bg-surface)] p-3 rounded-lg border-l-4 border-orange-500 whitespace-pre-wrap">{item.respuesta}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">Error al cargar las respuestas del examen.</p>
                )}
              </div>

              <div className="bg-[var(--bg-surface-2)] p-5 rounded-xl border border-[var(--bg-border)] space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider">Evaluación de Administración</h3>
                
                {postulacionSeleccionada.estado === "pendiente" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">Comentarios o notas de evaluación</label>
                      <textarea
                        value={comentariosEvaluacion}
                        onChange={(e) => setComentariosEvaluacion(e.target.value)}
                        rows={3}
                        placeholder="Escribe comentarios internos sobre las respuestas o la entrevista..."
                        className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-orange-500 transition resize-none text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleEvaluarPostulacion("rechazado")}
                        className="btn-danger py-2.5 px-4"
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar Candidato
                      </button>

                      <button
                        onClick={() => setModalContratarAbierto(true)}
                        className="btn-primary py-2.5 px-4"
                      >
                        <UserCheck className="h-4 w-4" />
                        Aprobar y Contratar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Resultado de Selección: </strong>
                      <span className={`font-bold capitalize ${postulacionSeleccionada.estado === "aprobado" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {postulacionSeleccionada.estado === "aprobado" ? "Contratado" : "Rechazado"}
                      </span>
                    </p>
                    {postulacionSeleccionada.comentarios && (
                      <p><strong>Comentarios de evaluación:</strong> {postulacionSeleccionada.comentarios}</p>
                    )}
                    {postulacionSeleccionada.fecha_evaluacion && (
                      <p><strong>Evaluado el:</strong> {postulacionSeleccionada.fecha_evaluacion}</p>
                    )}
                    {postulacionSeleccionada.tecnico_usuario_id && (
                      <p className="text-xs text-orange-500">Usuario de técnico creado en la base de datos (ID: {postulacionSeleccionada.tecnico_usuario_id}).</p>
                    )}
                    <button
                      onClick={() => setPostulacionSeleccionada(null)}
                      className="mt-2 btn-secondary py-2 px-4 text-xs"
                    >
                      Volver al Listado
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {modalContratarAbierto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[var(--bg-surface)] border border-[var(--bg-border)] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Contratación de Técnico</h2>
                  <p className="text-xs text-[var(--text-muted)]">Crea las credenciales de acceso para {postulacionSeleccionada?.nombre}.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Nombre de Usuario (Para ingresar al CRM)</label>
                    <input
                      type="text"
                      value={nuevoUsername}
                      onChange={(e) => setNuevoUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-orange-500 transition text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Contraseña de Acceso</label>
                    <input
                      type="text"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      className="w-full rounded-xl border border-[var(--bg-border)] bg-[var(--bg-input)] px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-orange-500 transition text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-[var(--bg-border)]">
                  <button
                    onClick={() => setModalContratarAbierto(false)}
                    className="btn-secondary py-2 px-4 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleEvaluarPostulacion("aprobado", true)}
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    Confirmar Contratación
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {usuarioArchivosAbierto && usuarioSeleccionado && (
        <UsuarioArchivos
          usuarioId={usuarioSeleccionado.id}
          usuarioNombre={usuarioSeleccionado.fullname}
          onClose={() => { setUsuarioArchivosAbierto(false); setUsuarioSeleccionado(null); }}
        />
      )}
    </div>
  );
}
