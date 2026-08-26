"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface CheckProps {
  isCompletada: boolean;
  pesoReal: string;
  repsReal: string;
  onToggleComplete: () => void;
}

export default function CheckButton({ isCompletada, pesoReal, repsReal, onToggleComplete }: CheckProps) {
  // Seguro contra dobles clics rápidos (Debounce)
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Validamos que se haya introducido peso (permitimos 0 para peso corporal) y repeticiones (>0)
  const isDisabled = 
    !repsReal || 
    isNaN(parseInt(repsReal)) || 
    parseInt(repsReal) <= 0 || 
    pesoReal === "" || 
    isNaN(parseFloat(pesoReal)) || 
    parseFloat(pesoReal) < 0; // Permitimos 0 kg, pero no números negativos

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Evitamos que el toque se propague a otros elementos
    
    if (isDisabled && !isCompletada) return;
    if (isProcessing) return; // Bloquea si ya se está procesando un clic
    
    setIsProcessing(true);

    // Feedback háptico (Vibración) si el dispositivo lo soporta
    if (typeof window !== "undefined" && 'vibrate' in navigator) {
      navigator.vibrate(isCompletada ? 40 : 80); // Vibra distinto al marcar que al desmarcar
    }

    onToggleComplete();

    // Liberamos el botón después de 400ms para evitar el doble toque fantasma
    setTimeout(() => {
      setIsProcessing(false);
    }, 400);
  };

  return (
    <button
      onClick={handleClick}
      disabled={(isDisabled && !isCompletada) || isProcessing}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
        isCompletada 
          ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105" 
          : isDisabled 
            ? "bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed" 
            : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:text-white"
      }`}
    >
      <Check className={`w-5 h-5 stroke-[3] transition-transform ${isProcessing ? 'scale-90' : 'scale-100'}`} />
    </button>
  );
}