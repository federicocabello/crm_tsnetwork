type PaidDetailsData = {
  pagadas_mes?: { total: number | string | null | undefined };
  enganche_mes?: { total: number | string | null | undefined };
  enganches_del_mes?: {
    pago_id: number;
    cliente_nombre: string;
    enganche: number | string | null | undefined;
    metodo_nombre: string | null;
    metodo_color: string | null;
    primera_cuota: string | null;
  }[];
  cuotas_del_mes?: {
    id: number;
    cliente_nombre: string;
    monto: number | string | null | undefined;
    interes: number | string | null | undefined;
    fechapago: string | null;
    pagado: number | string;
  }[];
};

type PaidDetailsProps = {
  data: PaidDetailsData | null;
  formatCurrency: (value: number | string | null | undefined) => string;
  formatDate: (value: string | null) => string;
  onClose: () => void;
};

export default function PaidDetails({
  data,
  formatCurrency,
  formatDate,
  onClose,
}: PaidDetailsProps) {
    console.log(data)
  const paidDownPayments =
    data?.enganches_del_mes?.filter((enganche) => Number(enganche.enganche) > 1) ?? [];
  const paidInstallments =
    data?.cuotas_del_mes?.filter((cuota) => Number(cuota.pagado) > 0) ?? [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-xl w-11/12 max-w-4xl p-6 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xl font-bold text-white">Detalle de Pagadas</h3>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            x
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2">
          {paidDownPayments.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-blue-400">
                  Enganches del Mes
                </h4>
                <span className="ml-auto text-blue-400 font-bold text-sm">
                  {formatCurrency(data?.enganche_mes?.total)}
                </span>
              </div>
              <table className="w-full text-sm table-auto">
                <thead className="border-b border-blue-400/20">
                  <tr className="text-left text-white/50">
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Enganche</th>
                    <th className="p-2">Método</th>
                    <th className="p-2">Primera cuota</th>
                  </tr>
                </thead>
                <tbody>
                  {paidDownPayments.map((enganche) => (
                    <tr
                      key={enganche.pago_id}
                      className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-2 text-white/80 font-medium">
                        {enganche.cliente_nombre}
                      </td>
                      <td className="p-2 text-blue-400 font-bold">
                        {formatCurrency(enganche.enganche)}
                      </td>
                      <td className="p-2">
                        {enganche.metodo_nombre ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor:
                                (enganche.metodo_color || "#3b82f6") + "30",
                              color: enganche.metodo_color || "#3b82f6",
                              border: `1px solid ${enganche.metodo_color || "#3b82f6"}50`,
                            }}>
                            {enganche.metodo_nombre}
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-2 text-white/60 text-xs">
                        {formatDate(enganche.primera_cuota)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-green-400">
                Cuotas Pagadas
              </h4>
              <span className="ml-auto text-green-400 font-bold text-sm">
                {formatCurrency(data?.pagadas_mes?.total)}
              </span>
            </div>
            <table className="w-full text-sm table-auto">
              <thead className="border-b border-white/20">
                <tr className="text-left text-white/70">
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Monto</th>
                  <th className="p-2">Interés</th>
                  <th className="p-2">Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {paidInstallments.map((cuota) => (
                  <tr
                    key={cuota.id}
                    className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-2 text-white/80">
                      {cuota.cliente_nombre}
                    </td>
                    <td className="p-2 text-white/80">
                      {formatCurrency(cuota.monto)}
                    </td>
                    <td className="p-2 text-white/80">
                      {formatCurrency(cuota.interes)}
                    </td>
                    <td className="p-2 text-white/80">
                      {formatDate(cuota.fechapago)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paidInstallments.length === 0 && (
              <p className="text-center text-white/50 mt-4">
                No hay cuotas pagadas registradas.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}