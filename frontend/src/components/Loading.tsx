/** Spinner centrado, variante por defecto */
export default function Loading({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <div className="flex items-center justify-center py-6">
      <span
        className={`${s} animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500`}
      />
    </div>
  );
}

/** Skeleton para una tarjeta */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="rounded-xl border p-4 space-y-2.5"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="skeleton h-4 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Skeleton para una fila de tabla */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--bg-border)" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={`skeleton h-3 flex-1 ${i === 0 ? "max-w-[2rem]" : ""}`} />
      ))}
    </div>
  );
}

/** Bloque de skeletons para lista de tarjetas */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2 + (i % 2)} />
      ))}
    </div>
  );
}
