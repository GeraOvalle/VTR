"use client";

import { AlertTriangle } from "lucide-react";

interface RepsProps {
  repsReal: string;
  onRepsChange: (nuevasReps: string) => void;
  isCompletada: boolean;
}

export default function RepsInput({ repsReal, onRepsChange, isCompletada }: RepsProps) {
  const repsNum = parseInt(repsReal);
  const esAnormal = repsNum > 50;

  // Validador estricto para evitar letras, puntos o caracteres raros
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, ''); // Solo permite números enteros
    onRepsChange(val);
  };

  return (
    <div className="relative flex flex-col items-center w-full">
      <div className="relative flex items-center w-full">
        <input 
          type="text" 
          inputMode="numeric"
          placeholder="-" 
          value={repsReal}
          onChange={handleInputChange}
          className={`w-full bg-zinc-900 border rounded-lg py-2.5 pl-2 pr-8 text-xs text-center focus:outline-none font-mono transition-colors ${
            isCompletada ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20" : 
            esAnormal ? "border-amber-500/50 text-amber-500" : "border-zinc-700 text-white focus:border-rose-500"
          }`}
        />
        <span className="absolute right-2 text-[9px] text-zinc-500 font-bold pointer-events-none">reps</span>
      </div>

      {esAnormal && (
        <div className="absolute top-full mt-1 w-32 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[8px] p-1.5 rounded flex items-start gap-1 z-10 shadow-lg">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Cantidad inusual.</span>
        </div>
      )}
    </div>
  );
}