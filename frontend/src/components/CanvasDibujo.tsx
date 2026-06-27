import { useRef, useState, useEffect } from "react";
import { ImagePlus, Eraser, Trash2 } from "lucide-react";
import Loading from "./Loading";

interface CanvasDibujoProps {
  initialImage?: string | null;
  onImageChange: (file: File | null) => void;
}

export default function CanvasDibujo({
  initialImage,
  onImageChange,
}: CanvasDibujoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ef4444"); // Red default
  const [lineWidth, setLineWidth] = useState(3);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Colors palette
  const colors = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#ffffff",
    "#000000",
  ];

  // Initialize canvas with background image
  useEffect(() => {
    if (initialImage) {
      setLoadingImage(true);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = initialImage;
      img.onload = () => {
        setBgImage(img);
        drawInitialState(img);
        setLoadingImage(false);
      };
      img.onerror = () => {
        setBgImage(null);
        drawInitialState(null, false);
        setLoadingImage(false);
      };
      return;
    }

    setBgImage(null);
    drawInitialState(null, false);
    setLoadingImage(false);
  }, [initialImage]);

  const drawInitialState = (
    img: HTMLImageElement | null,
    shouldExport = true,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset canvas to clear it completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff"; // Default background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (img) {
      // Calculate aspect ratio to fit the image
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;

      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        centerShift_x,
        centerShift_y,
        img.width * ratio,
        img.height * ratio,
      );
    }

    if (shouldExport) {
      exportCanvas();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    setLoadingImage(true);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        drawInitialState(img);
        setLoadingImage(false);
      };
      img.onerror = () => {
        setLoadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setLoadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
      exportCanvas();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get coordinates depending on event type
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    drawInitialState(bgImage);
  };

  const deleteBgAndClear = () => {
    setBgImage(null);
    drawInitialState(null);
  };

  // Convert canvas to file and send to parent
  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "dibujo.png", { type: "image/png" });
          onImageChange(file);
        }
      },
      "image/png",
      0.9,
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950/40 border-t border-white/10 p-4">
      {/* Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-white" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-6 bg-white/20 mx-2"></div>
          <input
            type="range"
            min="1"
            max="15"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <ImagePlus className="w-4 h-4" />
            <span>Agregar Imagen</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
          <button
            onClick={clearCanvas}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Limpiar trazos">
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={deleteBgAndClear}
            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Borrar todo">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full bg-zinc-900 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center touch-none relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          onTouchMove={draw}
        />
        {loadingImage && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80 text-white">
            <Loading />
          </div>
        )}
        {!loadingImage && !bgImage && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <p className="text-white text-sm font-semibold">
              Usa el mouse o el dedo para dibujar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
