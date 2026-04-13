import { useEffect, useMemo, useState } from "react";

interface Producto {
  id: number;
  descrip: string;
  precio: number;
  stock: number;
}

interface RowData {
  cantidad: number;
  costo: string;
  precioFinal: string;
}
interface Props {
  onClose: (arg0: boolean) => void;
  setCotizacion?: (data: any) => void;
}

export default function Cotizador({ onClose, setCotizacion }: Props) {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [data, setData] = useState<Producto[]>([]);
  const [rows, setRows] = useState<Record<number, RowData>>({});

  const roundUp = (num: number) => Math.ceil(num * 100) / 100;

  const calculate = (price: number, cantidad: number) => {
    const total = roundUp(price * cantidad);
    const taxas = roundUp(total * 0.0825);
    const totalTazas = roundUp(total + taxas);
    const precioFinalTazas = roundUp(totalTazas + totalTazas * 0.4);

    return {
      costo: totalTazas.toFixed(2),
      precioFinal: precioFinalTazas.toFixed(2),
    };
  };

  const handleChange = (id: number, price: number, cantidad: number) => {
    let safeCantidad = Number.isNaN(cantidad) ? 0 : cantidad;
    const result = calculate(price, safeCantidad);

    if (cantidad < 0) {
      alert("el numero debe ser mayor a 0");
      safeCantidad = 0;
      return;
    }

    setRows((prev) => ({
      ...prev,
      [id]: {
        cantidad: safeCantidad,
        ...result,
      },
    }));
  };

  function sendCotizacion() {
    setCotizacion(rows);
    onClose(false);
    console.log("Se guardo");
  }

  useEffect(() => {
    try {
      const fetchApi = async () => {
        const response = await fetch(`${API_URL}/api/productos`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const datos = await response.json();
        setData(datos);
      };

      fetchApi();
    } catch {
      alert("Ocurrio un error");
    }
  }, [API_URL]);

  const totalGeneral = useMemo(() => {
    const total = Object.values(rows).reduce((acc, row) => {
      return acc + (parseFloat(row.precioFinal) || 0);
    }, 0);

    return total.toFixed(2);
  }, [rows]);

  return (
    <div className="fixed inset-0 flex flex-col justify-around bg-black z-[70]">
      <div className="w-2/3 m-auto flex justify-end">
        <p
          onClick={() => onClose(false)}
          className="bg-orange-500 hover:cursor-pointer p-1 rounded-md w-1/6 text-center font-bold text-white">
          Salir
        </p>
      </div>
      <div className="m-auto flex justify-between">
        <h1 className="text-center ">Nueva cotización</h1>
      </div>

      <div className="h-full max-h-[70vh] overflow-y-auto">
        <table className=" m-auto text-xl">
          <thead className="bg-orange-600 text-black text-left rounded-lg">
            <tr>
              <th className="border p-2">PRODUCTO</th>
              <th className="border p-2">PRECIO</th>
              <th className="border p-2">STOCK</th>
              <th className="border p-2">CANTIDAD</th>
              <th className="border p-2">COSTO</th>
              <th className="border p-2">PRECIO FINAL</th>
            </tr>
          </thead>

          <tbody>
            {data.length < 0
              ? ""
              : data.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 ">{item.descrip}</td>
                    <td className="p-2 ">$ {item.precio}</td>
                    <td className="p-2 ">{item.stock}</td>
                    <td className="p-2 ">
                      <input
                        className=" bg-gray-300/50 text-black p-2"
                        type="number"
                        value={rows[item.id]?.cantidad ?? ""}
                        onChange={(e) =>
                          handleChange(
                            item.id,
                            item.precio,
                            e.target.valueAsNumber,
                          )
                        }
                      />
                    </td>
                    <td className="p-2 ">$ {rows[item.id]?.costo || "0.00"}</td>
                    <td className="p-2 ">
                      $ {rows[item.id]?.precioFinal || "0.00"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="w-2/3 mx-auto flex flex-col gap-4 items-center">
        <p className="text-2xl text-end p-5 border w-full">
          TOTAL GENERAL $ {totalGeneral}
        </p>
        <p
          className="w-1/4 hover:cursor-pointer  font-bold text-center bg-orange-700 p-5 rounded-b-md"
          onClick={sendCotizacion}>
          Guardar
        </p>
      </div>
    </div>
  );
}
