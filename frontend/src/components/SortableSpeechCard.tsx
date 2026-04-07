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
    opacity: isDragging ? 1 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="cuadro flex flex-col">

      <div
        className="flex items-center justify-center cursor-grab active:cursor-grabbing w-6"
        {...attributes}
        {...listeners}
        title="Arrastrar para reordenar"
        hidden={!isEditing}
      >
        <span hidden={!isEditing} className="transition-all">
          <Move className="w-6 h-6 text-white/30 hover:text-white drop-shadow-xs drop-shadow-white transition-all cursor-pointer" />
        </span>
      </div>

      {children}
    </div>
  );
}