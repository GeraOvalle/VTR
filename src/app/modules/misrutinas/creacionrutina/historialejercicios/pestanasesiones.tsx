"use client";

import { useState } from "react";
import { CalendarDays, Dumbbell, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

interface PestanaSesionesProps {
  registros: any[];
}

export default function PestanaSesiones({ registros }: PestanaSesionesProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const calcularVolumenTotal = (series: any[]) => {
    if (!series) return 0;
    return series.reduce((total, serie) => {
      if (serie.completado && serie.pesoReal && serie.repsReal) {
        const peso = parseFloat(serie.pesoReal) || 0;
        const reps = parseInt(serie.repsReal) || 0;
        return total + (peso * reps);
      }
      return total;
    }, 0);
  };

  return (
    <div className="space-y-3 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {registros.map((registro, idx) => {
        const isExpanded = expandedIdx === idx;
        
        const fechaObj = registro.fecha?.toDate ? registro.fecha.toDate() : new Date(registro.fecha);
        const fechaFormat = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        const seriesCompletadas = registro.series?.filter((s: any) => s.completado) || [];
        const volumenTotal = calcularVolumenTotal(registro.series);

        return (
          <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden transition-all">
            
            <button 
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="w-full bg-zinc-800/40 hover:bg-zinc-800/60 px-4 py-3 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-rose-500">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{fechaFormat}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" /> {seriesCompletadas.length} series
                  </span>
                  {volumenTotal > 0 && (
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {volumenTotal.toLocaleString('es-ES')} kg vol.
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-zinc-500 bg-zinc-950/50 p-1.5 rounded-full">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            
            {isExpanded && (
              <div className="p-3 bg-black/20 border-t border-zinc-800/50 flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                {seriesCompletadas.map((serie: any, sIdx: number) => (
                  <div key={sIdx} className="flex items-center justify-between bg-black/40 px-3 py-2.5 rounded-lg border border-white/5">
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-500">#{sIdx + 1}</span>
                      {serie.tipo === "topset" && <span className="text-[8px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Top</span>}
                      {serie.tipo === "dropset" && <span className="text-[8px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Drop</span>}
                      {serie.tipo === "calentamiento" && <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Warm</span>}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-white">
                        {serie.pesoReal || serie.peso || "-"} <span className="text-[9px] text-zinc-500">x</span> {serie.repsReal || "-"}
                      </span>
                      
                      <div className="w-10 text-right border-l border-zinc-800 pl-2">
                        {serie.rir ? (
                          <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">@{serie.rir}</span>
                        ) : (
                          <span className="text-[9px] text-zinc-700">-</span>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}