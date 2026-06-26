import { useState } from "react";
import type { EstadoCita } from "../types/configuracion";
import { CirclePlus, Pencil } from 'lucide-react';
import { darkenColor } from "../utils/colores";

type Props = {
  citasEstados: EstadoCita[];
    refreshData: () => void;
};

const ConfiguracionCitas = ({ citasEstados, refreshData }: Props) => {
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const handleAddEstado = async () => {
    const estado = prompt("Nombre del estado:");
    if (!estado) return;

    try {
      const res = await fetch(`${API_URL}/api/configuracion/nuevo-estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.msg)
        refreshData();
      } else {
        console.error("Error al agregar estado. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al agregar estado:", err);
    }
  };

  const [estados, setEstados] = useState(citasEstados);

  const handleColorChange = (id: string, newColor: string) => {
  setEstados((prev) =>
    prev.map((estado) =>
      estado.id == id
        ? { ...estado, color: newColor }
        : estado
    )
    
  );
};

    const cambiarColorDefinitivo = async (idestado: string, newColor: string) => {
    try {
      const res = await fetch(`${API_URL}/api/configuracion/nuevo-color-estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idestado: idestado, color: newColor }),
      });

      if (res.ok) {
        refreshData();
      } else {
        console.error("Error al cambiar color. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al cambiar color:", err);
    }
  };

  const cambiarNombreEstado = async (idestado: string, estadoActual: string) => {
    const nuevoEstado = prompt("Nombre del estado:", estadoActual);
    if (!nuevoEstado) return;

    const estado = nuevoEstado.trim().toUpperCase();
    if (!estado) return;

    try {
      const res = await fetch(`${API_URL}/api/configuracion/nuevo-nombre-estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idestado, estado }),
      });

      if (res.ok) {
        setEstados((prev) =>
          prev.map((item) =>
            item.id === idestado ? { ...item, estado } : item
          )
        );
        refreshData();
      } else {
        console.error("Error al cambiar nombre. Código:", res.status);
      }
    } catch (err) {
      console.error("Error de conexión al cambiar nombre:", err);
    }
  };

    return (
        <div className="cuadro">
            <div className="flex gap-3 items-center">
            <h1>Gestión de citas</h1>
                <div className="text-xs rounded-full py-1 px-2 border-2 font-bold bg-orange-500 hover:bg-orange-600 border-orange-800 cursor-pointer flex gap-1 items-center" onClick={handleAddEstado}><CirclePlus className="h-5 w-5" /><span>Agregar estado de cita</span></div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
                    {estados.map((estado) => (
                        <div className="flex items-center gap-2" key={estado.id}>
                            <div className="text-xs rounded-full py-1 px-2 border-2 font-bold" style={{ backgroundColor: estado.color, borderColor: darkenColor(estado.color, 0.5), }}>{estado.estado}</div>
                            <input type="color" value={estado.color} className="cursor-pointer" title="Cambiar color" onChange={(e) => handleColorChange(estado.id, e.target.value)} onBlur={(e) => cambiarColorDefinitivo(estado.id, e.target.value)} />
                            <Pencil
                              className="h-4 w-4 text-blue-500 hover:text-white hover:scale-120 transition-all cursor-pointer"
                              onClick={() => cambiarNombreEstado(estado.id, estado.estado)}
                            />
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default ConfiguracionCitas;
