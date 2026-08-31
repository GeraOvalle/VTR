"use client";

import { useState } from "react";
import { AlertTriangle, Calculator, X } from "lucide-react";

interface PesoProps {
  pesoReal: string;
  onPesoChange: (nuevoPeso: string) => void;
  isCompletada: boolean;
}

export default function PesoInput({ pesoReal, onPesoChange, isCompletada }: PesoProps) {
  const [unidad, setUnidad] = useState<"kg" | "lbs">("kg");
  const [showRMCalc, setShowRMCalc] = useState(false);
  
  // Estados para la calculadora RM
  const [calcPeso, setCalcPeso] = useState("");
  const [calcReps, setCalcReps] = useState("");

  const pesoNum = parseFloat(pesoReal);
  const esAnormal = unidad === "kg" ? pesoNum > 300 : pesoNum > 660;

  const toggleUnidad = () => {
    if (pesoReal && !isNaN(pesoNum)) {
      if (unidad === "kg") {
        onPesoChange((pesoNum * 2.20462).toFixed(1));
        setUnidad("lbs");
      } else {
        onPesoChange((pesoNum / 2.20462).toFixed(1));
        setUnidad("kg");
      }
    } else {
      setUnidad(unidad === "kg" ? "lbs" : "kg");
    }
  };

  const calcularRM = () => {
    const p = parseFloat(calcPeso);
    const r = parseInt(calcReps);
    if (!p || !r) return 0;
    return Math.round(p * (1 + 0.0333 * r));
  };

  // Validador estricto para evitar que escriban letras o múltiples puntos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    let val = e.target.value.replace(/[^0-9.]/g, ''); // Solo permite números y puntos
    
    // Evita que pongan más de un punto decimal (ej. 12.5.5)
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setter(val);
  };

  return (
    <div className="relative flex flex-col items-center w-full">
      
      {/* CONTENEDOR ULTRA-COMPACTO */}
      <div className={`relative flex items-stretch w-full bg-zinc-900 border rounded-md transition-colors overflow-hidden ${
        isCompletada ? "border-emerald-500/30 bg-emerald-950/20" : 
        esAnormal ? "border-amber-500/50" : "border-zinc-700 focus-within:border-rose-500"
      }`}>
        <input 
          type="text" 
          inputMode="decimal"
          placeholder="-" 
          value={pesoReal}
          onChange={(e) => handleInputChange(e, onPesoChange)}
          className={`w-full bg-transparent py-2 px-1 sm:px-2 text-[11px] sm:text-xs text-center focus:outline-none font-mono transition-colors ${
            isCompletada ? "text-emerald-400" : esAnormal ? "text-amber-500" : "text-white"
          }`}
        />
        <button 
          onClick={toggleUnidad}
          className={`px-1.5 sm:px-2 flex items-center justify-center border-l text-[8px] font-black uppercase tracking-wider transition-colors shrink-0 ${
            isCompletada ? "border-emerald-500/30 text-emerald-500 hover:text-emerald-300 bg-emerald-900/30" : 
            esAnormal ? "border-amber-500/30 text-amber-500 hover:text-amber-300 bg-amber-900/30" : 
            "border-zinc-700 text-zinc-500 hover:text-white bg-zinc-800/50"
          }`}
        >
          {unidad}
        </button>
      </div>

      {esAnormal && (
        <div className="absolute top-full mt-1 w-40 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[8px] p-1.5 rounded flex items-start gap-1 z-10 shadow-lg">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Peso inusual. Si es correcto, ignora este mensaje. ¡Felicidades!</span>
        </div>
      )}

      <button onClick={() => setShowRMCalc(true)} className="mt-1 text-[8px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 uppercase tracking-widest font-bold">
        <Calculator className="w-2.5 h-2.5" /> Calc RM
      </button>

      {/* MODAL CALCULADORA RM */}
      {showRMCalc && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-xs p-5 relative shadow-2xl">
            <button onClick={() => setShowRMCalc(false)} className="absolute top-3 right-3 text-zinc-500 hover:text-white">
              <X className="w-4 h-4"/>
            </button>
            <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4"/> Calculadora 1RM
            </h3>
            <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">
              Ingresa un peso con el que hayas llegado al fallo muscular para estimar tu Repetición Máxima (1RM).
            </p>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                inputMode="decimal"
                placeholder={`Peso (${unidad})`} 
                value={calcPeso} 
                onChange={(e) => handleInputChange(e, setCalcPeso)} 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white text-center font-mono focus:outline-none focus:border-rose-500" 
              />
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="Reps al fallo" 
                value={calcReps} 
                onChange={(e) => handleInputChange(e, setCalcReps)} 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white text-center font-mono focus:outline-none focus:border-rose-500" 
              />
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-center">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest block mb-1">Tu 1RM Estimado</span>
              <span className="text-xl font-black text-white font-mono">{calcularRM()} {unidad}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}