import { useState, useEffect } from "react";
import type { Usuarios } from "../types/auth";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  ContactRoundIcon,
  CreditCard,
  FolderOpen,
  KeyRound,
  PencilIcon,
  PlusCircleIcon,
  Power,
  UserCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import { ROLES } from "../types/auth";
import Loading from "../components/Loading";
import ConfiguracionCitas from "./ConfiguracionCitas";
import ConfiguracionPagos from "./ConfiguracionPagos";
import UsuarioArchivos from "../components/UsuarioArchivos";
import type { EstadoCita } from "../types/configuracion";

type VentanaConfiguracion = "usuarios" | "reclutamiento" | "citas" | "pagos";

type RespuestaPostulacion = {
  pregunta: string;
  respuesta: string;
};

type Postulacion = {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  experiencia?: string | null;
  respuestas?: RespuestaPostulacion[];
  estado: "pendiente" | "aprobado" | "rechazado";
  comentarios?: string | null;
  fecha_postulacion: string;
  fecha_evaluacion?: string | null;
  tecnico_usuario_id?: number | null;
};

const gruposConfiguracion = [
  {
    label: "Administración",
    items: [
      {
        id: "usuarios" as const,
        label: "Usuarios y acceso",
        description: "Roles, credenciales y archivos",
        icon: UsersRound,
      },
      {
        id: "reclutamiento" as const,
        label: "Postulaciones",
        description: "Evaluación de candidatos técnicos",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Catálogos",
    items: [
      {
        id: "citas" as const,
        label: "Estados de citas",
        description: "Nombres y colores de agenda",
        icon: CalendarDays,
      },
      {
        id: "pagos" as const,
        label: "Métodos de pago",
        description: "Opciones disponibles para cobros",
        icon: CreditCard,
      },
    ],
  },
];

const rolesDescripcion = [
  {
    nombre: "Invitado",
    descripcion: "Consulta información básica de agenda, registros y clientes.",
  },
  {
    nombre: "Usuario",
    descripcion: "Gestiona agenda, registros, clientes y tareas operativas.",
  },
  {
    nombre: "Moderador",
    descripcion: "Añade acceso a pagos y operaciones que requieren supervisión.",
  },
  {
    nombre: "Administrador",
    descripcion: "Administra usuarios, inventario, pagos y configuración general.",
  },
  {
    nombre: "Superadmin",
    descripcion: "Tiene control completo del CRM y de sus configuraciones avanzadas.",
  },
  {
    nombre: "Técnico",
    descripcion: "Accede a registros, tareas asignadas y a su perfil técnico.",
  },
];

export default function Users() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [citasEstados, setCitasEstados] = useState<EstadoCita[]>([]);
  const [usuarioArchivosAbierto, setUsuarioArchivosAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<{ id: number, fullname: string } | null>(null);

  // Reclutamiento States
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [cargandoPostulaciones, setCargandoPostulaciones] = useState<boolean>(false);
  const [postulacionSeleccionada, setPostulacionSeleccionada] = useState<Postulacion | null>(null);
  const [modalContratarAbierto, setModalContratarAbierto] = useState<boolean>(false);
  const [nuevoUsername, setNuevoUsername] = useState<string>("");
  const [nuevoPassword, setNuevoPassword] = useState<string>("");
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
        setNuevoPassword("");
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
      const res = await fetch(`${API_URL}/api/configuracion/gestion-de-usuarios`, {
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

  const [ventanaActiva, setVentanaActiva] = useState<VentanaConfiguracion>("usuarios");

  useEffect(() => {
    if (ventanaActiva === "reclutamiento") {
      fetchPostulaciones();
    }
  }, [ventanaActiva]);

  return (
    <div className="mx-auto w-full max-w-[1500px] min-w-0">
      <nav
        className="mb-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-sm)] lg:hidden"
        aria-label="Secciones de configuración"
      >
        <div className="flex min-w-max gap-5">
          {gruposConfiguracion.map((grupo) => (
            <div key={grupo.label}>
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-3)]">
                {grupo.label}
              </p>
              <div className="tabs">
                {grupo.items.map((item) => {
                  const Icon = item.icon;
                  const activo = ventanaActiva === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`tab ${activo ? "active" : ""}`}
                      onClick={() => setVentanaActiva(item.id)}
                      aria-current={activo ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden lg:block">
          <div className="card p-3">
            <div className="border-b border-[var(--border)] px-2 pb-3">
              <p className="text-sm font-bold text-[var(--text-1)]">Ajustes del sistema</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">
                Administra el acceso y los catálogos del CRM.
              </p>
            </div>

            <nav className="mt-3 space-y-4" aria-label="Secciones de configuración">
              {gruposConfiguracion.map((grupo) => (
                <div key={grupo.label}>
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-3)]">
                    {grupo.label}
                  </p>
                  <div className="space-y-1">
                    {grupo.items.map((item) => {
                      const Icon = item.icon;
                      const activo = ventanaActiva === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setVentanaActiva(item.id)}
                          aria-current={activo ? "page" : undefined}
                          className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${activo
                            ? "border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-2)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-1)]"
                          }`}
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-xs font-bold">{item.label}</span>
                            <span className={`mt-0.5 block text-[10px] leading-relaxed ${activo ? "text-[var(--primary)]/80" : "text-[var(--text-3)]"}`}>
                              {item.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
      {ventanaActiva === "usuarios" && (
        <div className="min-w-0 space-y-4">
          <section className="card min-w-0 overflow-hidden p-0">
            <header className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-[var(--primary)]" />
                  <h2 className="text-base font-bold text-[var(--text-1)]">Usuarios y acceso</h2>
                  <span className="badge">{users.length}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Administra identidades, permisos y acceso al CRM.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddUser}
                className="btn-primary"
              >
                <PlusCircleIcon className="h-4 w-4" />
                Agregar usuario
              </button>
            </header>

            <div className="p-4 sm:p-5">
              {loading ? (
              <div className="flex w-full items-center justify-center py-14">
                <Loading />
              </div>
            ) : users.length === 0 ? (
              <div className="surface-muted py-12 text-center text-sm text-[var(--text-3)]">
                No hay usuarios registrados.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table table-mobile-cards min-w-full sm:min-w-[780px]">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td data-label="Nombre">
                          <div className="flex min-w-[190px] items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
                              {user.fullname.trim().charAt(0) || "U"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-semibold text-[var(--text-1)]">{user.fullname}</span>
                                {user.rol === "tecnico" && (
                                  <ContactRoundIcon className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                                )}
                                <button
                                  type="button"
                                  className="inline-flex rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-1)]"
                                  title="Editar nombre"
                                  aria-label={`Editar nombre de ${user.fullname}`}
                                  onClick={() => handleGestionUsuario(Number(user.id), user.fullname, 2, true)}
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Usuario">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-[var(--text-2)]">{user.user}</span>
                            <button
                              type="button"
                              className="inline-flex rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-1)]"
                              title="Editar usuario"
                              aria-label={`Editar usuario de ${user.fullname}`}
                              onClick={() => handleGestionUsuario(Number(user.id), user.user, 0, true)}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td data-label="Rol">
                          <select
                            className="min-w-[140px] cursor-pointer px-2 py-1.5 text-xs font-semibold capitalize"
                            value={user.rol}
                            onChange={(e) => handleGestionUsuario(Number(user.id), e.target.value, 3, false)}
                            aria-label={`Rol de ${user.fullname}`}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Estado">
                          <span className={`badge ${user.habilitado ? "badge-success" : "badge-danger"}`}>
                            {user.habilitado ? "Habilitado" : "Deshabilitado"}
                          </span>
                        </td>
                        <td data-label="Acciones">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="btn-secondary min-h-8 px-2.5 text-xs"
                              title="Cambiar contraseña"
                              onClick={() => handleGestionUsuario(Number(user.id), "", 1, true)}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Clave
                            </button>
                            <button
                              type="button"
                              title={user.habilitado ? "Deshabilitar usuario" : "Habilitar usuario"}
                              aria-label={user.habilitado ? "Deshabilitar usuario" : "Habilitar usuario"}
                              className="btn-icon"
                              onClick={() => handleGestionUsuario(Number(user.id), String(!user.habilitado), 4, false)}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Archivos del usuario"
                              aria-label={`Archivos de ${user.fullname}`}
                              className="btn-icon text-[var(--primary)]"
                              onClick={() => {
                                setUsuarioSeleccionado({ id: Number(user.id), fullname: user.fullname });
                                setUsuarioArchivosAbierto(true);
                              }}
                            >
                              <FolderOpen className="h-4 w-4" />
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
          </section>

          <details className="card group p-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-sm font-bold text-[var(--text-1)]">Guía de roles</p>
                <p className="mt-0.5 text-xs text-[var(--text-3)]">
                  Consulta el nivel de acceso antes de asignar permisos.
                </p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-3)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t border-[var(--border)] p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {rolesDescripcion.map((rol) => (
                <div key={rol.nombre} className="surface-muted">
                  <p className="text-xs font-bold text-[var(--text-1)]">{rol.nombre}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">{rol.descripcion}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {ventanaActiva === "citas" && (
        loading ? (
          <Loading />
        ) : (
          <ConfiguracionCitas citasEstados={citasEstados} refreshData={fetchUsers} />
        )
      )}

      {ventanaActiva === "pagos" && (
        <ConfiguracionPagos />
      )}

      {ventanaActiva === "reclutamiento" && (
        <div className="card min-w-0 overflow-hidden p-0">
          {!postulacionSeleccionada ? (
            <section>
              <header className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[var(--primary)]" />
                  <h2 className="text-base font-bold text-[var(--text-1)]">Postulaciones técnicas</h2>
                  <span className="badge">{postulaciones.length}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-3)]">
                  Revisa la experiencia y evaluación técnica de cada candidato.
                </p>
              </header>

              <div className="p-4 sm:p-5">
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="surface-muted">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Pendientes</p>
                    <p className="mt-1 text-xl font-bold text-[var(--warning)]">
                      {postulaciones.filter((post) => post.estado === "pendiente").length}
                    </p>
                  </div>
                  <div className="surface-muted">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Contratados</p>
                    <p className="mt-1 text-xl font-bold text-[var(--success)]">
                      {postulaciones.filter((post) => post.estado === "aprobado").length}
                    </p>
                  </div>
                  <div className="surface-muted">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Rechazados</p>
                    <p className="mt-1 text-xl font-bold text-[var(--danger)]">
                      {postulaciones.filter((post) => post.estado === "rechazado").length}
                    </p>
                  </div>
                </div>

                {cargandoPostulaciones ? (
                <div className="w-full flex items-center justify-center py-10">
                  <Loading />
                </div>
              ) : postulaciones.length === 0 ? (
                <div className="surface-muted p-10 text-center text-sm text-[var(--text-3)]">
                  No hay postulaciones registradas en el sistema.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table table-mobile-cards min-w-full sm:min-w-[720px]">
                    <thead>
                      <tr>
                        <th>Candidato</th>
                        <th>Contacto</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {postulaciones.map((post) => (
                        <tr key={post.id}>
                          <td data-label="Candidato" className="font-semibold text-[var(--text-1)]">{post.nombre}</td>
                          <td data-label="Contacto">
                            <div className="min-w-0">
                              <p className="break-all text-xs text-[var(--text-2)]">{post.email}</p>
                              <p className="mt-0.5 text-xs text-[var(--text-3)]">{post.telefono}</p>
                            </div>
                          </td>
                          <td data-label="Fecha" className="whitespace-nowrap text-xs">{post.fecha_postulacion}</td>
                          <td data-label="Estado">
                            <span className={`badge ${
                              post.estado === "aprobado"
                                ? "badge-success"
                                : post.estado === "rechazado"
                                ? "badge-danger"
                                : "badge-warning"
                            }`}>
                              {post.estado === "aprobado" ? "Contratado" : post.estado === "rechazado" ? "Rechazado" : "Pendiente"}
                            </span>
                          </td>
                          <td data-label="Acciones" className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setPostulacionSeleccionada(post);
                                setNuevoUsername(post.nombre.toLowerCase().replace(/\s+/g, "").substring(0, 12));
                                setNuevoPassword("");
                                setComentariosEvaluacion(post.comentarios || "");
                              }}
                              className="btn-secondary min-h-8 px-3 text-xs"
                            >
                              Revisar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </section>
          ) : (
            <section>
              <header className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPostulacionSeleccionada(null)}
                  className="btn-icon shrink-0"
                  aria-label="Volver a postulaciones"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-[var(--text-1)]">{postulacionSeleccionada.nombre}</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-3)]">Postulado el {postulacionSeleccionada.fecha_postulacion}</p>
                  </div>
                </div>
                <span className={`badge ${
                  postulacionSeleccionada.estado === "aprobado"
                    ? "badge-success"
                    : postulacionSeleccionada.estado === "rechazado"
                    ? "badge-danger"
                    : "badge-warning"
                }`}>
                  {postulacionSeleccionada.estado === "aprobado"
                    ? "Contratado"
                    : postulacionSeleccionada.estado === "rechazado"
                    ? "Rechazado"
                    : "Pendiente"}
                </span>
              </header>

              <div className="space-y-6 p-4 sm:p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="surface-muted">
                    <p className="text-xs text-[var(--text-3)]">Correo electrónico</p>
                    <p className="mt-1 break-all text-sm font-semibold text-[var(--text-1)]">{postulacionSeleccionada.email}</p>
                  </div>
                  <div className="surface-muted">
                    <p className="text-xs text-[var(--text-3)]">Teléfono</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">{postulacionSeleccionada.telefono}</p>
                  </div>
                  <div className="surface-muted md:col-span-2">
                    <p className="text-xs text-[var(--text-3)]">Dirección</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">{postulacionSeleccionada.direccion}</p>
                  </div>
                  <div className="surface-muted md:col-span-2">
                    <p className="text-xs text-[var(--text-3)]">Experiencia previa</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-2)]">{postulacionSeleccionada.experiencia || "No proporcionada"}</p>
                  </div>
                </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-1)]">Respuestas de la prueba técnica</h3>
                  <p className="mt-0.5 text-xs text-[var(--text-3)]">Revisa cada respuesta antes de emitir una evaluación.</p>
                </div>
                {postulacionSeleccionada.respuestas && Array.isArray(postulacionSeleccionada.respuestas) ? (
                  postulacionSeleccionada.respuestas.map((item, idx) => (
                    <article key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-1)]">{idx + 1}. {item.pregunta}</p>
                      <p className="mt-3 whitespace-pre-wrap rounded-lg border-l-2 border-[var(--primary)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-2)]">
                        {item.respuesta}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="surface-muted text-sm text-[var(--text-3)]">No fue posible cargar las respuestas del examen.</div>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-1)]">Evaluación administrativa</h3>
                  <p className="mt-0.5 text-xs text-[var(--text-3)]">Registra notas internas y decide el resultado del proceso.</p>
                </div>
                
                {postulacionSeleccionada.estado === "pendiente" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">Comentarios o notas de evaluación</label>
                      <textarea
                        value={comentariosEvaluacion}
                        onChange={(e) => setComentariosEvaluacion(e.target.value)}
                        rows={3}
                        placeholder="Escribe comentarios internos sobre las respuestas o la entrevista..."
                        className="w-full resize-none px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEvaluarPostulacion("rechazado")}
                        className="btn-danger"
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar candidato
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalContratarAbierto(true)}
                        className="btn-primary"
                      >
                        <UserCheck className="h-4 w-4" />
                        Aprobar y contratar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-[var(--text-2)]">
                    <p>
                      <strong className="text-[var(--text-1)]">Resultado de selección: </strong>
                      <span className={`font-bold ${postulacionSeleccionada.estado === "aprobado" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
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
                      <p className="text-xs text-[var(--primary)]">Usuario técnico creado (ID: {postulacionSeleccionada.tecnico_usuario_id}).</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setPostulacionSeleccionada(null)}
                      className="btn-secondary mt-2 text-xs"
                    >
                      Volver al listado
                    </button>
                  </div>
                )}
              </div>
            </div>
            </section>
          )}

          {modalContratarAbierto && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contratar-tecnico-titulo">
              <div className="modal max-w-md">
                <div className="modal-header">
                  <div>
                    <h2 id="contratar-tecnico-titulo" className="text-base font-bold text-[var(--text-1)]">Contratar técnico</h2>
                    <p className="mt-1 text-xs text-[var(--text-3)]">Crea las credenciales de acceso para {postulacionSeleccionada?.nombre}.</p>
                  </div>
                </div>

                <div className="modal-body space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">Nombre de usuario</label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={nuevoUsername}
                      onChange={(e) => setNuevoUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className="w-full px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">Contraseña de acceso</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      placeholder="Crea una contraseña segura"
                      className="w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setModalContratarAbierto(false);
                      setNuevoPassword("");
                    }}
                    className="btn-secondary text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEvaluarPostulacion("aprobado", true)}
                    className="btn-primary text-xs"
                  >
                    Confirmar contratación
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
        </main>
      </div>

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
