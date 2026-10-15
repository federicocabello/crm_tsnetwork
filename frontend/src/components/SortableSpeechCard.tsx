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
      className={`card-event relative flex flex-col justify-between border-l-4 border-l-[var(--primary)] transition-all duration-200 ${
        isDragging ? "z-50 scale-[1.01] ring-2 ring-[var(--primary)] shadow-[var(--shadow-lg)]" : ""
      }`}>
      {isEditing && (
        <div
          className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--bg-border)] text-xs text-[var(--text-muted)] cursor-grab active:cursor-grabbing select-none shrink-0"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--primary)]">
            <Move className="w-4 h-4" />
            <span>Mover Card</span>
          </span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-70"># {item.orden}</span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {children}
      </div>
    </div>
  );
}
