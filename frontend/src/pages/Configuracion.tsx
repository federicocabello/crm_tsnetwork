import { useState, useEffect } from "react";
import type { Usuarios } from "../types/auth";
import { PencilIcon, PlusCircleIcon, ArrowRightLeftIcon, ContactRoundIcon, CalendarDays, CreditCard, UsersRound } from "lucide-react";
import { ROLES } from "../types/auth";
import Loading from "../components/Loading";
import ConfiguracionCitas from "./ConfiguracionCitas";
import ConfiguracionPagos from "./ConfiguracionPagos";
import type { EstadoCita } from "../types/configuracion";

export default function Users() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [users, setUsers] = useState<Usuarios[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [citasEstados, setCitasEstados] = useState<EstadoCita[]>([]);

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
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const activo = ventanaActiva === tab.id;

          return (
            <button
              key={tab.id}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                activo
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
                      className={`px-3 py-1 rounded-full flex justify-center items-center gap-5 w-1/2 ${
                        user.habilitado ? "bg-green-600" : "bg-red-500"
                      }`}
                    >
                      <span className="font-bold">{user.habilitado ? "Habilitado" : "Deshabilitado"}</span>
                    </span>
                    <span title="Habilitar/deshabilitar" className="border border-transparent hover:border-white rounded-full transition-all p-1 hover:scale-120"><ArrowRightLeftIcon className="h-4 w-4 cursor-pointer" onClick={() => handleGestionUsuario(Number(user.id), String(!user.habilitado), 4, false)} /></span>
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
    </div>
  );
}
