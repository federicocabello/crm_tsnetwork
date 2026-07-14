import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { PlayCircle, CheckCircle, FileText, Upload, Download, Trash2, Award, Calendar, Film } from "lucide-react";

interface Archivo {
  id: number;
  usuario: number;
  original: string;
  directorio: string;
}

interface VideoCapacitacion {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  duracion: string;
  categoria: string;
}

const VIDEOS_INDUCION: VideoCapacitacion[] = [
  {
    id: "torres",
    titulo: "1. Que hay en las torres",
    descripcion: "-",
    url: "https://www.youtube.com/embed/23jFXHVnV04&t=1s",
    duracion: "15 min",
    categoria: "Torres"
  },
   {
     id: "explicacion-de-red",
     titulo: "2. Explicacion de la Red",
     descripcion: "-",
     url: "https://www.youtube.com/embed/TOsfSHAcsYs",
     duracion: "13 min",
     categoria: "Torres"
   },
   {
     id: "conexion-a-torre",
     titulo: "3. Conexion a torre",
     descripcion: "-",
     url: "https://www.youtube.com/embed/lh01oANfI-I",
     duracion: "4 min",
     categoria: "Torres"
   },
  {
    id: "enlace",
    titulo: "4. Enlace",
    descripcion: "-",
    url: "https://www.youtube.com/embed/Bkwixo31KyE",
    duracion: "15 min",
    categoria: "Torres"
  }
];

export default function PerfilTecnico() {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL || "";
  
  // Videos vistos e interactivos
  const [videosVistos, setVideosVistos] = useState<string[]>([]);
  const [videoActivo, setVideoActivo] = useState<VideoCapacitacion>(VIDEOS_INDUCION[0]);
  const [, setCargandoVideos] = useState(true);

  // Archivos del técnico
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loadingArchivos, setLoadingArchivos] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Cargar datos al iniciar
  useEffect(() => {
    if (user?.id) {
      fetchVideosVistos();
      fetchArchivos();
    }
  }, [user]);

  const fetchVideosVistos = async () => {
    try {
      const token = localStorage.getItem("B!1w6NAt1T^%kvhUI*S^rC");
      const res = await fetch(`${API_URL}/api/tecnico/videos-vistos`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const videos = Array.isArray(data)
          ? data
          : Array.isArray(data?.videos_vistos)
            ? data.videos_vistos
            : [];
        setVideosVistos(videos);
      }
    } catch (err) {
      console.error("Error al obtener videos vistos:", err);
    } finally {
      setCargandoVideos(false);
    }
  };

  const fetchArchivos = async () => {
    if (!user?.id) return;
    setLoadingArchivos(true);
    try {
      const res = await fetch(`${API_URL}/api/configuracion/usuarios/${user.id}/archivos`);
      if (res.ok) {
        const data = await res.json();
        setArchivos(data);
      }
    } catch (err) {
      console.error("Error al obtener archivos del técnico:", err);
    } finally {
      setLoadingArchivos(false);
    }
  };

  const handleMarcarVideoVisto = async (videoId: string) => {
    if (videosVistos.includes(videoId)) return;

    try {
      const token = localStorage.getItem("B!1w6NAt1T^%kvhUI*S^rC");
      const res = await fetch(`${API_URL}/api/tecnico/marcar-video-visto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ video_id: videoId })
      });

      if (res.ok) {
        setVideosVistos(prev => Array.isArray(prev) ? [...prev, videoId] : [videoId]);
      }
    } catch (err) {
      console.error("Error al marcar video visto:", err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.id) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("archivo", file);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/configuracion/usuarios/${user.id}/archivos`, {
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
      alert("Error al conectar con el servidor para subir archivo");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset
    }
  };

  const handleDeleteArchivo = async (archivoId: number) => {
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

  // Calcular progreso
  const porcentajeProgreso = Math.round((videosVistos.length / VIDEOS_INDUCION.length) * 100);

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-2 text-white">
      {/* Banner Superior de Bienvenida */}
      <div className="rounded-2xl border border-orange-500/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.15),rgba(234,88,12,0.05))] p-6 relative overflow-hidden shrink-0">
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
          <Award className="h-44 w-44 text-orange-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-orange-400">
              ¡Hola, {user?.fullname}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Bienvenido al portal del equipo técnico de TS Network. Aquí podrás completar tu inducción inicial y administrar tus documentos.
            </p>
          </div>
          <div className="bg-zinc-950/45 px-4 py-3 rounded-xl border border-white/5 flex items-center gap-3 self-start md:self-auto">
            <div className="text-right">
              <div className="text-xs text-zinc-500 font-bold uppercase">Tu Progreso</div>
              <div className="text-lg font-black text-orange-400">{porcentajeProgreso}% Completo</div>
            </div>
            <div className="h-10 w-10 rounded-full border-2 border-orange-500 flex items-center justify-center font-bold text-xs bg-orange-500/10">
              {videosVistos.length}/{VIDEOS_INDUCION.length}
            </div>
          </div>
        </div>
        
        {/* Barra de progreso visual */}
        <div className="w-full bg-zinc-950/60 h-2.5 rounded-full mt-4 overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${porcentajeProgreso}%` }}
          />
        </div>
      </div>

      {/* Grid de Secciones */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        
        {/* Columna Izquierda: Perfil y Archivos */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Card de Información de Perfil */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-orange-500" />
              Perfil de Técnico
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Nombre completo</span>
                <span className="font-semibold text-zinc-200">{user?.fullname}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Nombre de usuario</span>
                <span className="font-semibold text-orange-400">{user?.user}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Rol asignado</span>
                <span className="font-semibold px-2 py-0.5 rounded-full text-xs font-bold bg-orange-600/20 text-orange-300 border border-orange-500/30 capitalize">{user?.rol}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Estado de cuenta</span>
                <span className="font-semibold text-green-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Activo / Contratado
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Registro
                </span>
                <span className="text-zinc-300">Técnico Oficial</span>
              </div>
            </div>
          </div>

          {/* Card de Documentos de Técnico */}
          <div className="flex-1 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-md flex flex-col min-h-[300px]">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Tus Documentos
            </h2>
            <p className="text-xs text-zinc-500 mb-4">Sube tus identificaciones, certificaciones o contratos firmados.</p>

            {/* Zona de Subida */}
            <div className="mb-4 relative group shrink-0">
              <input 
                type="file" 
                onChange={handleUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className={`border-2 border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all ${uploading ? 'opacity-55' : 'group-hover:border-orange-500/50 group-hover:bg-orange-500/5'}`}>
                <Upload className="w-8 h-8 text-orange-500 mb-2 group-hover:scale-110 transition-all" />
                <span className="text-xs font-bold text-zinc-300">
                  {uploading ? 'Subiendo archivo...' : 'Subir Documento'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1">PDF, Imágenes o Word</span>
              </div>
            </div>

            {/* Listado de Archivos */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
              {loadingArchivos ? (
                <div className="text-center py-6 text-xs text-zinc-500">Cargando archivos...</div>
              ) : archivos.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 border border-white/5 bg-zinc-950/20 rounded-xl">
                  No has subido ningún documento aún.
                </div>
              ) : (
                archivos.map(archivo => (
                  <div key={archivo.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/30 border border-white/5 hover:border-white/10 transition">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-xs font-semibold truncate text-zinc-300" title={archivo.original}>
                        {archivo.original}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <a 
                        href={`${API_URL}/uploads/usuarios/${archivo.directorio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                        title="Ver / Descargar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button 
                        onClick={() => handleDeleteArchivo(archivo.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Inducción Interactiva (Videos) */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Card Principal: Reproductor Activo */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-md flex flex-col shrink-0">
            {/* Reproductor de Video (iframe YouTube) */}
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative border border-white/5 shadow-2xl">
              <iframe
                src={videoActivo.url}
                title={videoActivo.titulo}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full absolute inset-0"
              />
            </div>
            
            {/* Detalles del Video Activo */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 rounded bg-orange-600/10 text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-500/20">
                  {videoActivo.categoria} · {videoActivo.duracion}
                </span>
                <h2 className="text-lg font-bold text-white mt-1.5">{videoActivo.titulo}</h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
                  {videoActivo.descripcion}
                </p>
              </div>

              {/* Botón Marcar Visto */}
              <button
                onClick={() => handleMarcarVideoVisto(videoActivo.id)}
                disabled={videosVistos.includes(videoActivo.id)}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition self-start cursor-pointer shrink-0 ${videosVistos.includes(videoActivo.id)
                  ? "bg-green-600/10 text-green-400 border border-green-500/30"
                  : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/10"
                  }`}
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                {videosVistos.includes(videoActivo.id) ? "Video Completado" : "Marcar como Completado"}
              </button>
            </div>
          </div>

          {/* Listado de Videos de Capacitación */}
          <div className="flex-1 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 backdrop-blur-md flex flex-col min-h-0">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3 shrink-0">
              <Film className="h-4 w-4 text-orange-500" />
              PROGRAMA DE INDUCCIÓN TÉCNICA
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {VIDEOS_INDUCION.map(vid => {
                const activo = videoActivo.id === vid.id;
                const visto = videosVistos.includes(vid.id);

                return (
                  <button
                    key={vid.id}
                    onClick={() => setVideoActivo(vid)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-4 transition cursor-pointer ${activo
                      ? "border-orange-500 bg-orange-500/5 text-white"
                      : "border-white/5 bg-zinc-950/20 text-zinc-400 hover:border-white/10 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${visto ? 'bg-green-500/15 text-green-400' : activo ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-zinc-500'}`}>
                        <PlayCircle className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${activo ? 'text-orange-400' : 'text-zinc-200'}`}>{vid.titulo}</h4>
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{vid.descripcion}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-mono text-zinc-500">{vid.duracion}</span>
                      {visto && (
                        <CheckCircle className="w-4.5 h-4.5 text-green-500 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
