import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Speech } from "../types/speech";
import { Move } from 'lucide-react';

type Props = {
  item: Speech;
  isEditing: boolean;
  children: React.ReactNode;
};

export default function SortableSpeechCard({ item, isEditing, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-event flex flex-col justify-between border-l-4 border-l-orange-500 relative transition-all duration-200 max-h-72 overflow-hidden ${
        isDragging ? "ring-2 ring-orange-500 shadow-2xl scale-[1.02] z-50" : ""
      }`}>
      {isEditing && (
        <div
          className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--bg-border)] text-xs text-[var(--text-muted)] cursor-grab active:cursor-grabbing select-none shrink-0"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar">
          <span className="font-black flex items-center gap-1.5 text-orange-500">
            <Move className="w-4 h-4" />
            <span>Mover Card</span>
          </span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-70"># {item.orden}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-y-auto pr-1 scrollbar-thin">
        {children}
      </div>
    </div>
  );
}