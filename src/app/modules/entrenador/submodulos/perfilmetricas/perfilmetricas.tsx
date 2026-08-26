"use client";

import { TrendingUp, Users, ClipboardCheck, Star, Award, Settings } from "lucide-react";

interface PerfilMetricasProps {
  trainerCodeShort: string;
}

export default function PerfilMetricasModule({ trainerCodeShort }: PerfilMetricasProps) {
  
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 space-y-6">
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <Users className="w-8 h-8 text-amber-500/20 absolute -right-2 -top-2" />
          <span className="text-3xl font-black text-white mb-1">0</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Clientes Activos</span>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <ClipboardCheck className="w-8 h-8 text-emerald-500/20 absolute -right-2 -top-2" />
          <span className="text-3xl font-black text-white mb-1">0</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Rutinas Asignadas</span>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <Star className="w-8 h-8 text-rose-500/20 absolute -right-2 -top-2" />
          <span className="text-3xl font-black text-white mb-1">0.0</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Calificación Global</span>
        </div>

        <div className="bg-zinc-900/50 border border-amber-500/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <span className="text-xl font-mono font-black text-amber-500 tracking-[0.2em] mb-1">{trainerCodeShort || "----"}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Tu Código PRO</span>
        </div>
      </div>

      {/* CONFIGURACIÓN DE PERFIL (Placeholder) */}
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500" /> Configuración de Entrenador
          </h3>
          <span className="bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest">En Proceso</span>
        </div>

        <div className="space-y-4 opacity-50 pointer-events-none">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1.5 block">Especialidad Principal</label>
            <input type="text" value="Hipertrofia y Recomposición Corporal" disabled className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-500" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1.5 block">Biografía / Presentación</label>
            <textarea disabled value="Soy un entrenador enfocado en resultados basados en evidencia..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-500 resize-none h-24" />
          </div>
          <button disabled className="bg-zinc-800 text-zinc-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest w-full">
            Guardar Cambios
          </button>
        </div>
      </div>

    </div>
  );
}