import { useState, useEffect } from "react";
import { X, Upload, Trash2, FileText, Download } from "lucide-react";

interface UsuarioArchivosProps {
  usuarioId: number;
  usuarioNombre: string;
  onClose: () => void;
}

interface Archivo {
  id: number;
  usuario: number;
  original: string;
  directorio: string;
}

export default function UsuarioArchivos({ usuarioId, usuarioNombre, onClose }: UsuarioArchivosProps) {
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchArchivos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/configuracion/usuarios/${usuarioId}/archivos`);
      if (res.ok) {
        const data = await res.json();
        setArchivos(data);
      } else {
        console.error("Error fetching files");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivos();
  }, [usuarioId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("archivo", file);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/configuracion/usuarios/${usuarioId}/archivos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchArchivos();
      } else {
        alert("Error al subir archivo");
      }
    } catch (err) {
      console.error(err);
      alert("Error al subir archivo");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDelete = async (archivoId: number) => {
    if (!confirm("¿Seguro que deseas eliminar este archivo?")) return;

    try {
      const res = await fetch(`${API_URL}/api/configuracion/usuarios/archivos/${archivoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchArchivos();
      } else {
        alert("Error al eliminar archivo");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-950/50">
          <div>
            <h2 className="text-lg font-bold text-white">Archivos de {usuarioNombre}</h2>
            <p className="text-xs text-white/50">Gestiona documentos, contratos, etc.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Upload Area */}
          <div className="mb-6 relative group">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleUpload}
              disabled={uploading}
            />
            <div className={`border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${uploading ? 'opacity-50' : 'group-hover:border-orange-500 group-hover:bg-orange-500/5'}`}>
              <Upload className={`w-10 h-10 mb-3 ${uploading ? 'text-white/50' : 'text-orange-500'}`} />
              <h3 className="font-semibold text-white mb-1">
                {uploading ? 'Subiendo...' : 'Haz clic o arrastra un archivo'}
              </h3>
              <p className="text-xs text-white/50">Soporta cualquier tipo de documento</p>
            </div>
          </div>

          {/* Files List */}
          <div>
            <h3 className="text-sm font-bold text-white/70 mb-3 uppercase tracking-wider">Archivos ({archivos.length})</h3>
            
            {loading ? (
              <div className="text-center py-8 text-white/50">Cargando archivos...</div>
            ) : archivos.length === 0 ? (
              <div className="text-center py-8 text-white/40 border border-white/5 rounded-xl bg-white/5">
                No hay archivos para este usuario
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {archivos.map(archivo => (
                  <div key={archivo.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-white truncate" title={archivo.original}>
                          {archivo.original}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <a 
                        href={`${API_URL}/uploads/usuarios/${archivo.directorio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Descargar / Ver"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleDelete(archivo.id)}
                        className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
