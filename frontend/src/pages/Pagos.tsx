import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Loading from "../components/Loading";
import {
  CircleDollarSign,
  CalendarDays,
  Wallet,
  AlertCircle,
  Search,
  UserRound,
} from "lucide-react";

type PagoResumen = {
  pagadas_mes: { cantidad: number; total: number };
  pendientes_mes_que_viene: { cantidad: number; total: number };
  deuda_por_cliente: { id: number; nombre: string; deuda_total: number }[];
  proximos_vencimientos: {
    id: number;
    cliente_id: number;
    cliente_nombre: string;
    monto: number;
    interes: number;
    vencimiento: string;
    pago_total: number;
    metodo_nombre: string;
    metodo_color: string;
  }[];
  cuotas_del_mes: {
    id: number;
    cliente_id: number;
    cliente_nombre: string;
    monto: number;
    interes: number;
    vencimiento: string;
    fechapago: string | null;
    pagado: number;
    metodo_nombre: string;
    metodo_color: string;
  }[];
};

type ClienteResultado = {
  id: number;
  nombre: string;
  telefono?: string;
};

export default function Pagos() {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PagoResumen | null>(null);

  const [mes, setMes] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  // Buscador de clientes
  const [queryCliente, setQueryCliente] = useState("");
  const [resultadosCliente, setResultadosCliente] = useState<ClienteResultado[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/pagos/resumen?mes=${mes}&tipo=vencimiento`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error("Error al cargar resumen de pagos");
      }
    } catch (error) {
      console.error("Error de red:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [mes]);

  // Buscar clientes con debounce
  useEffect(() => {
    if (!queryCliente.trim()) {
      setResultadosCliente([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const res = await fetch(
          `${API_URL}/api/clientes/buscar?q=${encodeURIComponent(queryCliente)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResultadosCliente(data);
        }
      } catch (e) {
        console.error("Error buscando clientes:", e);
      } finally {
        setBuscandoCliente(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [queryCliente]);

  if (loading && !data) {
    return <Loading />;
  }

  const formatCurrency = (val: number | string | null | undefined) => {
    const numericVal = Number(val);
    if (isNaN(numericVal)) return "$0.00";
    return numericVal.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    // dateString llega como "YYYY-MM-DD" desde el backend
    const [y, m, d] = dateString.split("-").map(Number);
    if (!y || !m || !d) return "N/A";
    return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const proximos5 = data?.proximos_vencimientos?.slice(0, 5) ?? [];

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-4 p-4 overflow-y-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 shrink-0">
          <CircleDollarSign className="w-8 h-8 text-orange-500" />
          Control de Pagos
        </h1>

        <div className="flex gap-3 w-full sm:w-auto flex-wrap items-center">
          {/* Buscador de cliente */}
          <div className="relative flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 shadow-lg focus-within:border-orange-500/50 transition-colors">
              <Search className="w-4 h-4 text-white/40 shrink-0" />
              <input
                type="text"
                value={queryCliente}
                onChange={(e) => setQueryCliente(e.target.value.toUpperCase())}
                placeholder="Buscar cliente..."
                className="bg-transparent text-sm outline-none text-white placeholder:text-white/30 w-full uppercase"
              />
              {buscandoCliente && (
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
            </div>
            {/* Dropdown de resultados */}
            {resultadosCliente.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {resultadosCliente.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-orange-500/20 cursor-pointer transition-colors text-sm border-b border-white/5 last:border-0"
                    onClick={() => {
                      navigate(`/clientes/${c.id}`);
                      setQueryCliente("");
                      setResultadosCliente([]);
                    }}
                  >
                    <UserRound className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="font-bold">{c.nombre}</span>
                    {c.telefono && (
                      <span className="text-white/40 text-xs ml-auto">{c.telefono}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selector de mes */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 shadow-lg">
            <CalendarDays className="w-4 h-4 text-orange-400 shrink-0" />
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="bg-transparent text-sm outline-none font-bold text-white cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center text-white/50 text-sm animate-pulse">
          Actualizando...
        </div>
      )}

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CircleDollarSign className="w-32 h-32" />
          </div>
          <h2 className="text-white/60 text-sm font-bold uppercase tracking-wider">
            Pagadas este mes
          </h2>
          <div className="text-3xl font-extrabold text-green-400">
            {formatCurrency(data?.pagadas_mes?.total)}
          </div>
          <div className="text-xs text-white/40">
            {data?.pagadas_mes?.cantidad || 0} cuotas
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CalendarDays className="w-32 h-32" />
          </div>
          <h2 className="text-white/60 text-sm font-bold uppercase tracking-wider">
            Pendientes mes que viene
          </h2>
          <div className="text-3xl font-extrabold text-orange-400">
            {formatCurrency(data?.pendientes_mes_que_viene?.total)}
          </div>
          <div className="text-xs text-white/40">
            {data?.pendientes_mes_que_viene?.cantidad || 0} cuotas
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col gap-2 relative overflow-hidden group lg:col-span-2">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="w-32 h-32" />
          </div>
          <h2 className="text-white/60 text-sm font-bold uppercase tracking-wider">
            Deuda total acumulada
          </h2>
          <div className="text-3xl font-extrabold text-red-400">
            {formatCurrency(
              data?.deuda_por_cliente?.reduce(
                (acc, curr) => acc + Number(curr.deuda_total),
                0
              )
            )}
          </div>
          <div className="text-xs text-white/40">
            {data?.deuda_por_cliente?.length || 0} clientes con deuda
          </div>
        </div>
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

        {/* Próximos 5 vencimientos */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-zinc-950/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-lg">Próximos Vencimientos</h2>
            </div>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
              Próximos 5
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {proximos5.length > 0 ? (
              <div className="space-y-2">
                {proximos5.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <Link
                        to={`/clientes/${p.cliente_id}`}
                        className="font-bold hover:text-orange-400 transition-colors uppercase text-sm"
                      >
                        {p.cliente_nombre}
                      </Link>
                      <div className="text-xs text-white/60 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          Vence:{" "}
                          <strong className="text-red-400">
                            {formatDate(p.vencimiento)}
                          </strong>
                        </span>
                        {p.metodo_nombre && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: p.metodo_color + "30",
                              color: p.metodo_color || "#aaa",
                              border: `1px solid ${p.metodo_color}50`,
                            }}
                          >
                            {p.metodo_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-bold text-orange-400 text-lg">
                        {formatCurrency(Number(p.monto) + Number(p.interes))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-white/40">
                No hay próximos vencimientos.
              </div>
            )}
          </div>
        </div>

        {/* Deuda por cliente */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-zinc-950/50 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-lg">Deuda por Cliente</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {data?.deuda_por_cliente && data.deuda_por_cliente.length > 0 ? (
              <div className="space-y-2">
                {data.deuda_por_cliente.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors flex justify-between items-center"
                  >
                    <Link
                      to={`/clientes/${c.id}`}
                      className="font-bold hover:text-orange-400 transition-colors uppercase text-sm flex-1"
                    >
                      {c.nombre}
                    </Link>
                    <div className="font-bold text-red-400 text-lg shrink-0 ml-2">
                      {formatCurrency(c.deuda_total)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-white/40">
                No hay clientes con deuda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
