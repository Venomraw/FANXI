'use client';
import { useDraggable } from '@dnd-kit/core';

interface PlayerProps {
  name: string;
}

export default function DraggablePlayer({ name }: { name: string }) {
  // attributes: accessibility roles
  // listeners: mouse/touch events
  // setNodeRef: the physical element
  // transform: the x/y coordinates during drag
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: name,
  });

  // This style moves the element in real-time as you drag it
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg cursor-grab active:cursor-grabbing text-sm hover:border-green-500 transition-all shadow-lg active:opacity-50 touch-none"
    >
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-blue-500" />
        <span className="font-medium text-zinc-200">{name}</span>
      </div>
    </div>
  );
}