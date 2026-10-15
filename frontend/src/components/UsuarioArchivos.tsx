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
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[90dvh]">
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[var(--text-1)]">Archivos de {usuarioNombre}</h2>
            <p className="text-xs text-[var(--text-3)]">Gestiona documentos, contratos, etc.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon shrink-0"
            aria-label="Cerrar archivos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* Upload Area */}
          <div className="mb-6 relative group">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleUpload}
              disabled={uploading}
            />
            <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] p-5 text-center transition-colors sm:p-8 ${uploading ? 'opacity-50' : 'group-hover:border-[var(--primary)] group-hover:bg-[var(--primary-soft)]'}`}>
              <Upload className={`w-10 h-10 mb-3 ${uploading ? 'text-[var(--text-3)]' : 'text-orange-500'}`} />
              <h3 className="mb-1 font-semibold text-[var(--text-1)]">
                {uploading ? 'Subiendo...' : 'Haz clic o arrastra un archivo'}
              </h3>
              <p className="text-xs text-[var(--text-3)]">Soporta cualquier tipo de documento</p>
            </div>
          </div>

          {/* Files List */}
          <div>
            <h3 className="text-sm font-bold text-[var(--text-2)] mb-3 uppercase tracking-wider">Archivos ({archivos.length})</h3>
            
            {loading ? (
              <div className="text-center py-8 text-[var(--text-3)]">Cargando archivos...</div>
            ) : archivos.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-3)] border border-[var(--border)] rounded-xl bg-[var(--surface-subtle)]">
                No hay archivos para este usuario
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {archivos.map(archivo => (
                  <div key={archivo.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="shrink-0 rounded-lg bg-[var(--info-soft)] p-2 text-[var(--info)]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="truncate text-sm font-medium text-[var(--text-1)]" title={archivo.original}>
                          {archivo.original}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <a 
                        href={`${API_URL}/uploads/usuarios/${archivo.directorio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-[var(--text-3)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--text-1)]"
                        title="Descargar / Ver"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleDelete(archivo.id)}
                        className="rounded-lg p-2 text-[var(--danger)] opacity-70 transition-colors hover:bg-[var(--danger-soft)] hover:opacity-100"
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
