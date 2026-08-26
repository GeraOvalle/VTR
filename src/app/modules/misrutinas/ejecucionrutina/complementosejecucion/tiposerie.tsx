"use client";

import { useState } from "react";
import { X, Layers } from "lucide-react";

export const TIPOS_SERIE = [
  { id: "normal", label: "Normal", badge: "N", color: "text-zinc-300 bg-zinc-800", desc: "Serie estándar de trabajo con descanso completo." },
  { id: "calentamiento", label: "Calentamiento", badge: "W", color: "text-amber-400 bg-amber-500/10", desc: "Peso muy ligero. Enfocado en movilidad y flujo sanguíneo." },
  { id: "aproximacion", label: "Aproximación", badge: "A", color: "text-blue-400 bg-blue-500/10", desc: "Subida progresiva de peso para preparar el sistema nervioso." },
  { id: "topset", label: "Top Set", badge: "T", color: "text-rose-400 bg-rose-500/10", desc: "Serie máxima. La más pesada y exigente." },
  { id: "dropset", label: "Drop Set", badge: "D", color: "text-purple-400 bg-purple-500/10", desc: "Al fallo, seguida de una reducción de peso sin descanso." },
  { id: "restpause", label: "Rest-Pause", badge: "R", color: "text-emerald-400 bg-emerald-500/10", desc: "Al fallo, seguida de micro-descansos para sacar reps extra." },
];

interface TipoSerieProps {
  tipoActual: string;
  numeroNormal: number;
  onTipoChange: (nuevoTipo: string) => void;
}

export default function TipoSerie({ tipoActual, numeroNormal, onTipoChange }: TipoSerieProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const tipoObj = TIPOS_SERIE.find(t => t.id === tipoActual) || TIPOS_SERIE[0];

  return (
    <div className="relative shrink-0">
      {/* BOTÓN DISPARADOR */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${tipoObj.color} hover:scale-105 active:scale-95`}
        title="Cambiar tipo de serie"
      >
        {tipoActual === "normal" ? numeroNormal : tipoObj.badge}
      </button>

      {/* POP-UP MODAL COMPACTO (ESTILO RPE) */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-[280px] shadow-2xl flex flex-col overflow-hidden">
            
            {/* HEADER DEL POP-UP */}
            <div className="px-3 py-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-rose-500" /> Tipo de Serie
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white p-0.5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* CONTENIDO DEL POP-UP */}
            <div className="p-2 flex flex-col gap-1 overflow-y-auto max-h-[65vh] custom-scrollbar">
              {TIPOS_SERIE.map(t => (
                <button
                  key={t.id}
                  onClick={() => { onTipoChange(t.id); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all ${
                    tipoActual === t.id 
                      ? "bg-rose-500/10 border border-rose-500/30 scale-[1.02]" 
                      : "bg-black/40 border border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  {/* ICONO/BADGE */}
                  <span className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[9px] font-black mt-0.5 ${t.color}`}>
                    {t.badge}
                  </span>
                  
                  {/* TEXTOS */}
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${tipoActual === t.id ? "text-rose-400" : "text-zinc-200"}`}>
                      {t.label}
                    </span>
                    <span className={`text-[8px] leading-tight ${tipoActual === t.id ? "text-rose-400/80" : "text-zinc-500"}`}>
                      {t.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}