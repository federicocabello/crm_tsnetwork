import { useEffect, useState } from "react";
import "flag-icons/css/flag-icons.min.css";

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function WorldClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const usa = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const argentina = now;

  return (
    <div className="flex items-center gap-2.5">
      {/* Argentina (Visible on sm+) */}
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="fi fi-ar text-xs"></span>
        <div className="leading-tight">
          <div className="text-[10px] uppercase font-extrabold text-[var(--text-muted)]">AR</div>
          <div className="text-xs font-black text-[var(--text-primary)]">
            {formatTime(argentina)}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-5 w-px bg-[var(--bg-border)]" />

      {/* USA (Visible on all screens) */}
      <div className="flex items-center gap-1.5">
        <span className="fi fi-us text-xs"></span>
        <div className="leading-tight">
          <div className="text-[10px] uppercase font-extrabold text-[var(--text-muted)]">USA</div>
          <div className="text-xs font-black text-[var(--text-primary)]">
            {formatTime(usa)}
          </div>
        </div>
      </div>
    </div>
  );
}
