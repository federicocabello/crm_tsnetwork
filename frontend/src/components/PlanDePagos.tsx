import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type Props = {
  idCliente: number;
  idCita: number;
};

type Cuota = {
  monto: number;
  fecha_vencimiento: Date;
};

export default function PlanDePagos({ idCliente, idCita }: Props) {
  const [numCuotas, setNumCuotas] = useState<number>(1);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);

  useEffect(() => {
    if (numCuotas < 1) return;
    const nuevaCuotas: Cuota[] = [];
    const hoy = new Date();
    for (let i = 0; i < numCuotas; i++) {
      const fecha = new Date(hoy);
      fecha.setMonth(hoy.getMonth() + i);
      nuevaCuotas.push({
        monto: 0,
        fecha_vencimiento: fecha,
      });
    }
    setCuotas(nuevaCuotas);
  }, [numCuotas]);

  const handleMontoChange = (index: number, monto: number) => {
    setCuotas(prev => {
      const copia = [...prev];
      copia[index].monto = monto;
      return copia;
    });
  };

  const handleFechaChange = (index: number, fecha: Date) => {
    setCuotas(prev => {
      const copia = [...prev];
      copia[index].fecha_vencimiento = fecha;
      return copia;
    });
  };
  
  return (
    <div className="p-4 bg-zinc-900 rounded-lg text-white space-y-4">
      <h3 className="font-bold text-lg">Generar Cuotas</h3>

      <div className="flex items-center gap-2">
        <label>Número de cuotas:</label>
        <input
          type="number"
          min={1}
          value={numCuotas}
          onChange={(e) => setNumCuotas(Number(e.target.value))}
          className="text-black p-1 rounded w-16"
        />
      </div>

      <div className="space-y-3">
        {cuotas.map((cuota, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-6">#{index + 1}</span>
            <input
              type="number"
              placeholder="Monto"
              value={cuota.monto}
              onChange={(e) => handleMontoChange(index, Number(e.target.value))}
              className="text-black p-1 rounded w-24"
            />
            <DatePicker
              selected={cuota.fecha_vencimiento}
              onChange={(date: Date) => handleFechaChange(index, date)}
              dateFormat="yyyy-MM-dd"
              className="text-black p-1 rounded"
            />
          </div>
        ))}
      </div>

      <button
        className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded font-bold"
      >
        Guardar Cuotas
      </button>
    </div>
  );
}