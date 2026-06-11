import { useEffect, useState } from "react";
import { Download, Trash2, Upload, X, Files } from "lucide-react";
import { darkenColor } from "../utils/colores";

type ArchivoCita = {
  id: number;
  original: string;
  directorio: string;
};

type Props = {
  idCita: string | number;
  color: string;
};

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function GaleriaCita({ idCita, color }: Props) {
  const [archivos, setArchivos] = useState<ArchivoCita[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ArchivoCita | null>(null);

  const cargarArchivos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/citas/${idCita}/archivos`);
      const data = await res.json();

      if (res.ok) {
        setArchivos(data);
      } else {
        console.error("Error al cargar archivos:", data);
      }
    } catch (error) {
      console.error("Error de conexión cargando archivos:", error);
    }
  };

  useEffect(() => {
    cargarArchivos();
  }, [idCita]);

  const subirArchivos = async () => {
    if (files.length === 0) return;

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("archivos", file);
    });

    try {
      const res = await fetch(`${API_URL}/api/citas/${idCita}/archivos`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setFiles([]);
        cargarArchivos();
      } else {
        console.error("Error al subir archivos:", data);
      }
    } catch (error) {
      console.error("Error de conexión subiendo archivos:", error);
    }
  };

  const eliminarArchivo = async (idImagen: number) => {
    const confirmar = confirm("¿Seguro que deseas eliminar este archivo?");
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/api/citas/archivos/${idImagen}`, {
        method: "DELETE",
      });

      if (res.ok) {
        cargarArchivos();
      } else {
        console.error("Error al eliminar archivo:", res.status);
      }
    } catch (error) {
      console.error("Error de conexión eliminando archivo:", error);
    }
  };

  const renderFilePreview = (archivo: ArchivoCita) => {
    const fileExtension = archivo.original.split(".").pop()?.toLowerCase();

    switch (fileExtension) {
      case "pdf":
        return (
          <iframe
            src={`${API_URL}${archivo.directorio}`}
            title="Vista previa del archivo PDF"
            className="h-200 w-200 rounded-xl"
          />
        );
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return (
          <img
            src={`${API_URL}${archivo.directorio}`}
            alt={archivo.original}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
          />
        );
      case "doc":
      case "docx":
        return (
          <div className="text-white text-center">
            <strong>{archivo.original}</strong> (Documento Word)
          </div>
        );
      case "xlsx":
      case "xls":
        return (
          <div className="text-white text-center">
            <strong>{archivo.original}</strong> (Documento Excel)
          </div>
        );
      case "txt":
        return (
          <div className="text-white text-center">
            <strong>{archivo.original}</strong> (Archivo de texto)
          </div>
        );
      default:
        return (
          <div className="text-white text-center">
            No se puede previsualizar este archivo
          </div>
        );
    }
  }

  const renderFileIcon = (archivo: ArchivoCita) => {
    const fileExtension = archivo.original.split(".").pop()?.toLowerCase();

    switch (fileExtension) {
      case "pdf":
        return <img src="/pdf.png" alt={archivo.original} className="h-1/2 transition group-hover:scale-105" />;
      case "jpg":
      case "jpeg":
      case "png":
        return <img src={`${API_URL}${archivo.directorio}`} alt={archivo.original} className="h-full w-full object-cover transition group-hover:scale-105" />;
      case "doc":
      case "gdoc":
      case "docx":
        return <img src="/word.png" alt={archivo.original} className="h-1/2 transition group-hover:scale-105" />;
      case "xlsx":
      case "xls":
        return <img src="/excel.png" alt={archivo.original} className="h-1/2 transition group-hover:scale-105" />;
      case "txt":
        return <img src="/txt-file.png" alt={archivo.original} className="h-1/2 transition group-hover:scale-105" />;
      default:
        return <img src="/unknown.png" alt={archivo.original} className="h-1/2 transition group-hover:scale-105" />;
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/3 p-3" style={{backgroundColor: darkenColor(color, 0.8), borderColor: darkenColor(color, 0.2)}}>
        <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-white/60 m-0!">
          <Files className="h-4 w-4" />
          ARCHIVOS
        </h3>

      {files.length > 0 && (
        <div className="my-2 rounded-lg border border-orange-500/20 bg-orange-500/10 p-2 ">
          <div className="mb-2 text-xs text-orange-100">
            {files.length} archivo(s) seleccionado(s)
          </div>

          <div className="mb-2 space-y-1">
            {files.map((file, index) => (
              <div key={index} className="truncate text-xs text-white/60">
                📄 {file.name}
              </div>
            ))}
          </div>

          <button
            onClick={subirArchivos}
            className="rounded-md bg-orange-600 px-3 py-1 text-xs font-bold text-white hover:bg-orange-700"
          >
            Subir archivos
          </button>
        </div>
      )}

      {archivos.length === 0 ? (
        <div className="text-xs italic text-white/40 my-2">
          No hay archivos cargados.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 my-2">
          {archivos.map((img) => (
            <div
              key={img.id}
              className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50"
            >
              <button
                type="button"
                onClick={() => setPreview(img)}
                className="h-28 w-full overflow-hidden flex justify-center items-center"
              >
                {renderFileIcon(img)}
              </button>

              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-[11px] text-white/60">
                  {img.original}
                </span>

                <div className="flex gap-1 items-center">
                  <a
                    href={`${API_URL}${img.directorio}`}
                    download={img.original}
                    target="_blank"
                    className="rounded-md p-2 text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => eliminarArchivo(img.id)}
                    className="rounded-md p-1 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white/70 hover:border-orange-500/40 w-24 justify-center">
        <Upload className="h-3.5 w-3.5" />
        Agregar
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              setFiles(Array.from(e.target.files));
            }
          }}
        />
      </label>

      {preview && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-h-[90vh] max-w-5xl">
            <button
              onClick={() => setPreview(null)}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>

            {renderFilePreview(preview)}
          </div>
        </div>
      )}
    </div>
  );
}