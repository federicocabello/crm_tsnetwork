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
  const [precio, setPrecio] = useState(0);
  const [editPrice, setEditPrice] = useState(false);
  const [newPrice, setNewPrice] = useState(0);

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
  const safeCantidad = Number.isNaN(cantidad) ? 0 : cantidad;

  if (safeCantidad < 0) {
    alert("El número debe ser mayor a 0");
    return;
  }

  const result =
    id === 56 || id === 57
      ? {
          costo: (price * safeCantidad).toFixed(2),
          precioFinal: id==57 ? ((price+price) * safeCantidad).toFixed(2) : (price * safeCantidad).toFixed(2),
        }
      : calculate(price, safeCantidad);

  setRows((prev) => ({
    ...prev,
    [id]: {
      cantidad: safeCantidad,
      costo: result.costo,
      precioFinal: result.precioFinal,
    },
  }));
};


  const handleDoubleClick = () => {
    setEditPrice(true); 
  };

  const handleSavePrice = () => {
  if (newPrice > 0) {
    setPrecio(newPrice);
  }

  setEditPrice(false);
};

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setNewPrice(value);
    }
  };

 function sendCotizacion() {
  const precioManual = precio > 0 ? precio : newPrice;

  let cotizacionFinal: Record<number, RowData> = rows;

  if (precioManual > 0) {
    const entries = Object.entries(rows);

    cotizacionFinal = entries.reduce(
      (acc, [id, row], index) => {
        acc[Number(id)] = {
          ...row,
          precioFinal: index === 0 ? precioManual.toFixed(2) : "0.00",
        };

        return acc;
      },
      {} as Record<number, RowData>,
    );
  }

  setCotizacion?.(cotizacionFinal);
  onClose(false);
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
      alert("Ocurrió un error");
    }
  }, [API_URL]);

  // El total general sigue calculando el total sumando las líneas
  const totalGeneral = useMemo(() => {
    let total = 0;
    if (precio === 0) {
      total = Object.values(rows).reduce((acc, row) => {
        return acc + (parseFloat(row.precioFinal) || 0);
      }, 0);
    } else {
      total = precio;
    }
    return total.toFixed(2);
  }, [rows, precio]);

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
        <p className="text-2xl text-end p-5 border w-full" onDoubleClick={handleDoubleClick}
              >
                {editPrice ? (
                  <input
                    type="number"
                    value={newPrice}
                    onChange={handlePriceChange}
                    onBlur={handleSavePrice}
                    autoFocus
                  />
                ) : (
                  `TOTAL GENERAL ${totalGeneral}`
                )}
          {/* {changePrecio ? `TOTAL GENERAL $ ${totalGeneral}` : <><p>Modificar Precio</p><input className="p-1 text-black bg-gray-300 rounded " type="number" onChange={e=>setPrecio(e.target.valueAsNumber)}/></>} */}
          
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
