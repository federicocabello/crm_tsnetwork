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
    <div className="flex items-center gap-4 rounded-2xl">
      {/* Argentina */}
      <div className="flex items-center gap-2">
        <span className="fi fi-ar"></span>
        <div className="leading-tight">
          <div className="text-[11px] uppercase text-white/60 flex items-center">Argentina
            {/*
                <span className="ml-1 text-yellow-500 flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
                </span>
            */}
            </div>
          <div className="text-sm font-bold text-white">
            {formatTime(argentina)}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-white/10" />

      {/* USA */}
      <div className="flex items-center gap-2">
        <span className="fi fi-us"></span>
        <div className="leading-tight">
          <div className="text-[11px] uppercase text-white/60">USA</div>
          <div className="text-sm font-bold text-white">
            {formatTime(usa)}
          </div>
        </div>
      </div>
    </div>
  );
}
