export default function Loading() {
    return (
        <div className="flex items-center justify-center gap-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span className="font-bold text-normal">Cargando...</span>
        </div>
    )};