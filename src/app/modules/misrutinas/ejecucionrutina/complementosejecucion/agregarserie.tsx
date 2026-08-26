"use client";

import { Plus } from "lucide-react";

interface AgregarSerieProps {
  onAdd: () => void;
}

export default function AgregarSerieButton({ onAdd }: AgregarSerieProps) {
  return (
    <button
      onClick={onAdd}
      className="w-full py-2 mt-1 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all active:scale-[0.98] group"
    >
      <div className="bg-zinc-900 p-1 rounded-md group-hover:bg-zinc-800 transition-colors">
        <Plus className="w-3 h-3" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">
        Añadir Serie
      </span>
    </button>
  );
}