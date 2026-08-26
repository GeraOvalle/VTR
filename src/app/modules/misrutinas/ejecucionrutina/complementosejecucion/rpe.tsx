"use client";

import { useState } from "react";
import { X, Activity, Info } from "lucide-react";

interface RpeProps {
  rirActual: string;
  onRirChange: (nuevoRir: string) => void;
  isCompletada: boolean;
}

const RPE_OPTIONS = [
  { val: "10", label: "10" },
  { val: "9.5", label: "9.5" },
  { val: "9", label: "9" },
  { val: "8.5", label: "8.5" },
  { val: "8", label: "8" },
  { val: "7.5", label: "7.5" },
  { val: "7", label: "7" },
  { val: "6.5", label: "6.5" },
  { val: "6", label: "6" },
  { val: "5.5", label: "5.5" },
  { val: "5", label: "5" },
];

const RPE_INFO = [
  { val: "10", desc: "Fallo absoluto. Imposible sacar una más." },
  { val: "9.5", desc: "Al límite. Quizás salía 1 más." },
  { val: "9", desc: "Salía 1 repetición más seguro." },
  { val: "8.5", desc: "Quizás salían 2 más." },
  { val: "8", desc: "Salían 2 repeticiones más seguro." },
  { val: "7", desc: "Salían 3 repeticiones más." },
  { val: "6", desc: "Salían 4 repeticiones más." },
  { val: "5", desc: "Calentamiento o esfuerzo ligero." },
];

export default function RpeInput({ rirActual, onRirChange, isCompletada }: RpeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative flex flex-col items-center w-full">
      
      {/* BOTÓN PRINCIPAL DE LA TABLA */}
      <button
        onClick={() => !isCompletada && setIsOpen(true)}
        className={`w-full flex items-center justify-center border rounded-lg py-2.5 text-xs font-mono transition-colors relative ${
          isCompletada 
            ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20 cursor-default" 
            : "border-zinc-700 bg-zinc-900 text-amber-400 hover:border-rose-500"
        }`}
      >
        {rirActual || "-"}
      </button>

      {/* POP-UP PRINCIPAL (2 COLUMNAS - COMPACTO SIN SCROLL) */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-[280px] shadow-2xl flex flex-col overflow-hidden">
            
            {/* HEADER */}
            <div className="px-3 py-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="w-3 h-3" /> RPE
                </h3>
                <button 
                  onClick={() => setShowInfo(true)}
                  className="text-zinc-400 hover:text-amber-400 transition-colors p-0.5 ml-1"
                  title="Ver qué significa cada número"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white p-0.5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* CONTENIDO (2 Columnas reales) */}
            <div className="p-2.5 flex flex-col gap-2">
              
              {/* Botón para limpiar */}
              <button
                onClick={() => { onRirChange(""); setIsOpen(false); }}
                className="w-full text-center py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
              >
                Limpiar (-)
              </button>
              
              {/* Grid de dos columnas */}
              <div className="grid grid-cols-2 gap-1.5">
                {RPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => { onRirChange(opt.val); setIsOpen(false); }}
                    className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center font-mono font-black text-xs ${
                      rirActual === opt.val 
                        ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] scale-[1.02]" 
                        : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* POP-UP SECUNDARIO (GUÍA INFORMATIVA / GLOSARIO) */}
      {showInfo && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-xl w-full max-w-[280px] shadow-2xl flex flex-col overflow-hidden">
            
            <div className="px-3 py-2 border-b border-zinc-800 flex justify-between items-center bg-amber-500/10">
              <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Guía de RPE
              </h3>
              <button onClick={() => setShowInfo(false)} className="text-zinc-400 hover:text-white p-0.5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
                El <strong className="text-white">RPE (Rate of Perceived Exertion)</strong> mide qué tan duro fue el esfuerzo al terminar la serie, basado en cuántas repeticiones sentiste que te faltaron para el fallo.
              </p>

              <div className="space-y-1.5">
                {RPE_INFO.map((item) => (
                  <div key={item.val} className="flex gap-2 items-start bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800/60">
                    <span className="text-[10px] font-black font-mono text-amber-400 w-7 shrink-0">RPE {item.val}</span>
                    <span className="text-[9px] text-zinc-300 leading-tight">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 text-center">
              <button 
                onClick={() => setShowInfo(false)}
                className="w-full py-1.5 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-[1.02] transition-all"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}