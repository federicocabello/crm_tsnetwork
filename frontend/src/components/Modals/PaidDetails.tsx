type PaidDetailsData = {
  pagadas_mes?: { total: number | string | null | undefined; total_cuotas?: number | string | null | undefined };
  enganche_mes?: { total: number | string | null | undefined };
  enganches_del_mes?: {
    pago_id: number;
    cliente_nombre: string;
    enganche: number | string | null | undefined;
    metodo_nombre: string | null;
    metodo_color: string | null;
    fecha_enganche: string | null;
  }[];
  cuotas_del_mes?: {
    id: number;
    cliente_nombre: string;
    monto: number | string | null | undefined;
    interes: number | string | null | undefined;
    fechapago: string | null;
    pagado: number | string;
  }[];
  cuotas_pagadas_del_mes?: {
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
  const paidDownPayments =
    data?.enganches_del_mes?.filter((enganche) => Number(enganche.enganche) > 0) ?? [];
  const paidInstallments =
    data?.cuotas_pagadas_del_mes?.filter((cuota) => Number(cuota.pagado) > 0) ?? [];

  return (
    <div className="modal-overlay">
      <div className="modal max-h-[calc(100dvh-2rem)] w-full max-w-4xl sm:h-[80dvh]">
        <div className="modal-header">
          <div>
            <h3 className="mb-0 text-lg font-bold text-[var(--text-1)]">Detalle de pagos</h3>
            <p className="mb-0 mt-0.5 text-xs text-[var(--text-3)]">Movimientos cobrados durante el mes</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Cerrar detalle">
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <div className="modal-body">
          {paidDownPayments.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-[var(--info)]"></div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--info)]">
                  Enganches del Mes
                </h4>
                <span className="ml-auto text-sm font-bold text-[var(--info)]">
                  {formatCurrency(data?.enganche_mes?.total)}
                </span>
              </div>
              <div className="table-wrap">
              <table className="table table-mobile-cards min-w-full sm:min-w-[620px]">
                <thead className="border-b border-blue-400/20">
                  <tr className="text-left text-[var(--text-3)]">
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Enganche</th>
                    <th className="p-2">Método</th>
                    <th className="p-2">Fecha enganche</th>
                  </tr>
                </thead>
                <tbody>
                  {paidDownPayments.map((enganche) => (
                    <tr
                      key={enganche.pago_id}
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-subtle)]">
                      <td data-label="Cliente" className="p-2 text-[var(--text-2)] font-medium">
                        {enganche.cliente_nombre}
                      </td>
                      <td data-label="Enganche" className="p-2 font-bold text-[var(--info)]">
                        {formatCurrency(enganche.enganche)}
                      </td>
                      <td data-label="M?todo" className="p-2">
                        {enganche.metodo_nombre ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor:
                                (enganche.metodo_color || "#3b82f6") + "30",
                              color: "var(--text-1)",
                              border: `1px solid ${enganche.metodo_color || "#3b82f6"}50`,
                            }}>
                            {enganche.metodo_nombre}
                          </span>
                        ) : (
                          <span className="text-[var(--text-3)] text-xs">—</span>
                        )}
                      </td>
                      <td data-label="Fecha" className="p-2 text-[var(--text-3)] text-xs">
                        {formatDate(enganche.fecha_enganche)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full bg-[var(--success)]"></div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--success)]">
                Cuotas Pagadas
              </h4>
              <span className="ml-auto text-sm font-bold text-[var(--success)]">
                {formatCurrency(data?.pagadas_mes?.total_cuotas ?? data?.pagadas_mes?.total)}
              </span>
            </div>
            <div className="table-wrap">
            <table className="table table-mobile-cards min-w-full sm:min-w-[560px]">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-left text-[var(--text-2)]">
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
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-subtle)]">
                    <td data-label="Cliente" className="p-2 text-[var(--text-2)]">
                      {cuota.cliente_nombre}
                    </td>
                    <td data-label="Monto" className="p-2 text-[var(--text-2)]">
                      {formatCurrency(cuota.monto)}
                    </td>
                    <td data-label="Inter?s" className="p-2 text-[var(--text-2)]">
                      {Number(cuota.interes || 0).toLocaleString("es-AR")} %
                    </td>
                    <td data-label="Fecha" className="p-2 text-[var(--text-2)]">
                      {formatDate(cuota.fechapago)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {paidInstallments.length === 0 && (
              <p className="text-center text-[var(--text-3)] mt-4">
                No hay cuotas pagadas registradas.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
