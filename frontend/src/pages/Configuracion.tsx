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
        pregunta = "Nombre completo nuevo";
        break;
    }
    if (abrirprompt) {
      nuevo = prompt(pregunta, dato);
      if (!nuevo) return;
      switch (accion) {
        case 0:
          nuevo = nuevo.toLowerCase().replace(/\s/g, "");
          break;
        case 1:
          nuevo = nuevo.replace(/\s/g, "");
          break;
        case 2:
          nuevo = nuevo.toUpperCase().trim();
          break;
      }
    } else {
      nuevo = dato;
    }

    try {
      const res = await fetch(`${API_URL}/api/configuracion/gestion-de-usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ident, nuevo, accion }),
      });

      if (res.ok) {
        if (accion < 3) {
          const data = await res.json();
          alert(data.msg)
        }
        fetchUsers();
      } else {
        console.error("Error al agregar usuario. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al agregar usuario:", err);
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
    <div>
      <div className="mb-4 flex flex-wrap gap-2 bg-zinc-950/30">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const activo = ventanaActiva === tab.id;

          return (
            <button
              key={tab.id}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${activo
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "text-white/60 hover:bg-white/10 hover:text-white"
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
        <div className="flex gap-4 w-full">
          <div className="w-full cuadro overflow-auto">
            <div className="flex justify-between items-center">
              <h1>Gestión de Usuarios</h1>
              <button
                onClick={handleAddUser}
                className="bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center boton"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Agregar Usuario
              </button>
            </div>

            {loading ? (
              <div className="w-full flex items-center justify-center">
                <Loading />
              </div>
            ) : (
              <table className="text-sm rounded-lg shadow-lg bg-white/10 w-full mt-4">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="py-2 px-4 text-left rounded-tl-lg">Nombre</th>
                    <th className="py-2 px-4 text-left">Usuario</th>
                    <th className="py-2 px-4 text-left">Contraseña</th>
                    <th className="py-2 px-4 text-left">Rol</th>
                    <th className="py-2 px-4 text-left rounded-tr-lg">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="py-2 px-4">
                        {user.rol == "tecnico" && (
                          <ContactRoundIcon className="h-5 w-5 inline mr-1" />
                        )}
                        {user.fullname} <PencilIcon className="h-4 w-4 inline ml-1 text-blue-500 hover:text-white hover:scale-120 transition-all cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), user.fullname, 2, true)} /></td>
                      <td className="py-2 px-4">{user.user} <PencilIcon className="h-4 w-4 inline ml-1 text-blue-500 hover:text-white hover:scale-120 transition-all cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), user.user, 0, true)} /></td>
                      <td className="py-2 px-4">{user.password} <PencilIcon className="h-4 w-4 inline ml-1 text-blue-500 hover:text-white hover:scale-120 transition-all cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), user.password, 1, true)} /></td>
                      <td className="py-2 px-4">
                        <select className="capitalize bg-gray-700 text-white p-2 rounded-md cursor-pointer w-full" onChange={(e) => handleGestionUsuario(Number(user.id), e.target.value, 3, false)}>
                          <option value={user.rol} selected>{user.rol}</option>
                          {ROLES.filter(role => role !== user.rol).map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full flex justify-center items-center gap-5 w-1/2 ${user.habilitado ? "bg-green-600" : "bg-red-500"
                              }`}
                          >
                            <span className="font-bold">{user.habilitado ? "Habilitado" : "Deshabilitado"}</span>
                          </span>
                          <span title="Habilitar/deshabilitar" className="border border-transparent hover:border-white rounded-full transition-all p-1 hover:scale-120"><ArrowRightLeftIcon className="h-4 w-4 cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), String(!user.habilitado), 4, false)} /></span>
                          <span title="Archivos" className="border border-transparent hover:border-white rounded-full transition-all p-1 hover:scale-120 text-orange-400 hover:text-orange-300">
                            <FolderOpen className="h-4 w-4 cursor-pointer" onClick={() => { setUsuarioSeleccionado({ id: Number(user.id), fullname: user.fullname }); setUsuarioArchivosAbierto(true); }} />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="w-1/2 cuadro">
            <div className="text-sm">
              <p><strong>1. Invitado:</strong></p>
              <p>Este rol tiene un <span className="font-bold">acceso restringido</span> al sistema. Los usuarios con el rol de <strong>Invitado</strong> pueden <span className="font-bold">leer solo datos básicos</span>, como la <strong>agenda, casos y clientes</strong>. No tienen acceso a información sensible como <strong>reportes, pagos ni configuración</strong> del sistema. Ideal para personas que solo necesitan consultar información sin modificarla.</p>

              <h3><strong>2. Usuario:</strong></h3>
              <p>Los usuarios con este rol tienen <span className="font-bold">más privilegios</span> que los invitados. Pueden <strong>agendar llamadas, editar casos, clientes y leads</strong>, pero aún <span className="font-bold">no tienen acceso a reportes, pagos ni a la configuración</span> del sistema. Este rol es adecuado para usuarios que necesitan gestionar y modificar información operativa, pero sin acceso a funciones críticas como la gestión de pagos o ajustes de configuración.</p>

              <h3><strong>3. Moderador:</strong></h3>
              <p>El rol de <strong>Moderador</strong> permite un nivel de acceso intermedio. Los moderadores pueden <strong>ver y modificar pagos</strong>, <strong>cambiar notas de pagos, fechas y montos</strong>. Sin embargo, para eliminar pagos, necesitan <span className="font-bold">solicitar permiso al administrador</span>. Los moderadores <span className="font-bold">no tienen acceso a los reportes ni a la configuración</span>. Este rol es adecuado para usuarios encargados de gestionar pagos, pero con restricciones sobre la eliminación de datos y sin acceso a la información financiera y operativa sensible.</p>

              <h3><strong>4. Administrador:</strong></h3>
              <p>Los <strong>administradores</strong> tienen un control significativo sobre el sistema. Pueden <strong>eliminar y modificar datos</strong>, como <strong>notas, pagos, casos y más</strong>, y recibirán <strong>notificaciones</strong> para aceptar o rechazar eliminaciones de datos. Sin embargo, <span className="font-bold">no tienen acceso a los reportes</span>. Este rol es ideal para usuarios que necesitan gestionar y administrar la información dentro del sistema, pero no necesitan visualizar o generar informes.</p>

              <h3><strong>5. Superadmin:</strong></h3>
              <p>El rol de <strong>Superadmin</strong> otorga <span className="font-bold">control total</span> sobre el sistema. Los superadministradores tienen acceso completo a <strong>todos los aspectos del sistema</strong>, incluidas las configuraciones, reportes, pagos, y todos los datos. Este es el rol con <span className="font-bold">máximos privilegios</span>, utilizado por aquellos que necesitan gestionar todo el sistema, configurar ajustes, y realizar cualquier acción sin restricciones.</p>
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
        <div className="w-full cuadro overflow-scroll">
          {!postulacionSeleccionada ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h1>Listado de Postulaciones Técnicas</h1>
                <span className="text-xs text-white/50">Revisa y evalúa las pruebas de los candidatos.</span>
              </div>

              {cargandoPostulaciones ? (
                <div className="w-full flex items-center justify-center py-10">
                  <Loading />
                </div>
              ) : postulaciones.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-8 text-center text-white/60">
                  No hay postulaciones registradas en el sistema.
                </div>
              ) : (
                <table className="text-sm rounded-lg shadow-lg bg-white/10 w-full">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left rounded-tl-lg">Nombre</th>
                      <th className="py-3 px-4 text-left">Email</th>
                      <th className="py-3 px-4 text-left">Teléfono</th>
                      <th className="py-3 px-4 text-left">Fecha Postulación</th>
                      <th className="py-3 px-4 text-left">Estado</th>
                      <th className="py-3 px-4 text-center rounded-tr-lg">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {postulaciones.map((post) => (
                      <tr key={post.id} className="border-t border-white/10 hover:bg-white/5 transition">
                        <td className="py-3 px-4 font-semibold">{post.nombre}</td>
                        <td className="py-3 px-4 text-white/80">{post.email}</td>
                        <td className="py-3 px-4 text-white/80">{post.telefono}</td>
                        <td className="py-3 px-4 text-xs font-mono">{post.fecha_postulacion}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            post.estado === "aprobado"
                              ? "bg-green-600/20 text-green-400 border border-green-500/30"
                              : post.estado === "rechazado"
                              ? "bg-red-600/20 text-red-400 border border-red-500/30"
                              : "bg-amber-600/20 text-amber-400 border border-amber-500/30"
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
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                          >
                            Ver Examen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPostulacionSeleccionada(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl transition text-white/60 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Evaluación de Postulante: {postulacionSeleccionada.nombre}</h1>
                  <p className="text-xs text-white/50">Postulado el: {postulacionSeleccionada.fecha_postulacion}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <p className="text-xs text-white/45">Email</p>
                  <p className="text-sm font-semibold">{postulacionSeleccionada.email}</p>
                </div>
                <div>
                  <p className="text-xs text-white/45">Teléfono</p>
                  <p className="text-sm font-semibold">{postulacionSeleccionada.telefono}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-white/45">Dirección</p>
                  <p className="text-sm font-semibold">{postulacionSeleccionada.direccion}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-white/45">Experiencia previa</p>
                  <p className="text-sm text-white/85 whitespace-pre-line">{postulacionSeleccionada.experiencia || "No proporcionada"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-md font-bold text-orange-400 border-b border-white/10 pb-2">Respuestas de la Prueba Técnica</h2>
                {postulacionSeleccionada.respuestas && Array.isArray(postulacionSeleccionada.respuestas) ? (
                  postulacionSeleccionada.respuestas.map((item: any, idx: number) => (
                    <div key={idx} className="bg-zinc-950/40 p-4 rounded-xl border border-white/5 space-y-1.5">
                      <p className="text-sm font-bold text-zinc-200">{idx + 1}. {item.pregunta}</p>
                      <p className="text-sm bg-white/5 p-3 rounded-lg text-orange-200 border-l-2 border-orange-500 whitespace-pre-wrap">{item.respuesta}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/50">Error al cargar las respuestas del examen.</p>
                )}
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evaluación de Administración</h3>
                
                {postulacionSeleccionada.estado === "pendiente" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Comentarios o notas de evaluación</label>
                      <textarea
                        value={comentariosEvaluacion}
                        onChange={(e) => setComentariosEvaluacion(e.target.value)}
                        rows={3}
                        placeholder="Escribe comentarios internos sobre las respuestas o la entrevista..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition resize-none text-sm font-sans"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEvaluarPostulacion("rechazado")}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar Candidato
                      </button>

                      <button
                        onClick={() => setModalContratarAbierto(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-green-600/10"
                      >
                        <UserCheck className="h-4 w-4" />
                        Aprobar y Contratar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-zinc-300">
                    <p>
                      <strong>Resultado de Selección: </strong>
                      <span className={`font-bold capitalize ${postulacionSeleccionada.estado === "aprobado" ? "text-green-400" : "text-red-400"}`}>
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
                      <p className="text-xs text-orange-400">Usuario de técnico creado en la base de datos (ID: {postulacionSeleccionada.tecnico_usuario_id}).</p>
                    )}
                    <button
                      onClick={() => setPostulacionSeleccionada(null)}
                      className="mt-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
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
              <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Contratación de Técnico</h2>
                  <p className="text-xs text-white/50">Crea las credenciales de acceso para {postulacionSeleccionada?.nombre}.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">Nombre de Usuario (Para ingresar al CRM)</label>
                    <input
                      type="text"
                      value={nuevoUsername}
                      onChange={(e) => setNuevoUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/60 mb-1">Contraseña de Acceso</label>
                    <input
                      type="text"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={() => setModalContratarAbierto(false)}
                    className="border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleEvaluarPostulacion("aprobado", true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-green-600/10"
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
