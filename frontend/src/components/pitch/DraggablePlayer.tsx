'use client';
import { useDraggable } from '@dnd-kit/core';

export default function DraggablePlayer({ name, number }: { name: string; number: number }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: name });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  return (
    <div
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-green-500 transition-all shadow-lg flex items-center justify-between"
    >
      <span className="text-sm font-semibold text-zinc-100">{name}</span>
      <span className="text-xs font-black text-green-500 bg-green-500/10 px-2 py-1 rounded">#{number}</span>
    </div>
  );
}