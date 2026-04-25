import { useEffect, useState } from "react";

interface Props {
  onClose: (arg0: boolean) => void;
  idCotizacion: number;
}
export default function ModalCotizacion({ onClose, idCotizacion }: Props) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  useEffect(() => {
    async function getCotizacion() {
      try {
        const data = await (
          await fetch(`${API_URL}/api/cotizacion/${idCotizacion}`)
        ).json();
        setData(data.productos);
        setTotal(data.total);
      } catch {
        console.log("error");
      }
    }
    getCotizacion();
  }, []);

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
              <th className="border p-2">CANTIDAD</th>
              <th className="border p-2">PRECIO FINAL</th>
            </tr>
          </thead>
          <tbody>
            {data.length < 0
              ? ""
              : data.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 ">{item.descrip}</td>
                    <td className="p-2 ">{item.cantidad}</td>
                    <td className="p-2 ">$ {item.precioFinal}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="w-2/3 mx-auto flex flex-col gap-4 items-center">
        <p className="text-2xl text-end p-5 border w-full">TOTAL $ {total}</p>
      </div>
    </div>
  );
}
