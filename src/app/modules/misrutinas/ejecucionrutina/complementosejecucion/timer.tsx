"use client";

import { useState, useEffect } from "react";
import { Clock, Play, Pause, X, ChevronDown, Plus } from "lucide-react";
import { useRestTimer } from "../../../../context/resttimercontext";

interface TimerProps {
  descansoGeneral: number;
  descansoExtra?: number; 
  isActive: boolean;       
  isExtra?: boolean;       
  onTimeChange?: (newTime: number) => void; 
}

const OPCIONES_DESCANSO = Array.from({ length: 37 }, (_, i) => i * 5);

const formatear = (segundos: number) => {
  if (segundos === 0) return "0s";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

export default function Timer({ descansoGeneral, descansoExtra = 0, isActive, isExtra = false, onTimeChange }: TimerProps) {
  const { timeLeft, totalTime, running, stopTimer, togglePause } = useRestTimer();
  
  const tiempoFirebase = isExtra ? descansoExtra : descansoGeneral;
  const [tiempoConfigurado, setTiempoConfigurado] = useState(0);

  useEffect(() => {
    if (tiempoFirebase !== undefined) setTiempoConfigurado(tiempoFirebase);
  }, [tiempoFirebase]);

  const handleTimeChange = (val: number) => {
    setTiempoConfigurado(val);
    if (onTimeChange) onTimeChange(val);
  };

  // 🔴 CORRECCIÓN CLAVE: Si es un mini-timer extra pero su tiempo es 0, NUNCA debe estar activo
  const realIsActive = isExtra && tiempoConfigurado === 0 ? false : isActive;

  // 1. ESTADO DE EDICIÓN (REPOSO)
  if (!realIsActive) {
    if (tiempoConfigurado === 0 && isExtra) {
      return (
        <div className="w-full flex justify-end">
          <button 
            onClick={() => handleTimeChange(30)}
            className="text-[9px] font-bold text-zinc-600 hover:text-amber-500 transition-colors flex items-center gap-1 bg-zinc-900/30 px-2 py-1 rounded-md border border-zinc-800/50 hover:border-amber-500/30"
          >
            <Plus className="w-3 h-3" /> Mini Descanso
          </button>
        </div>
      );
    }

    if (isExtra) {
      return (
        <div className="w-full flex justify-end">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">Mini Descanso</span>
            <div className="relative flex items-center bg-black/40 rounded px-1.5 py-0.5 border border-amber-500/20">
              <select value={tiempoConfigurado} onChange={(e) => handleTimeChange(Number(e.target.value))} className="appearance-none bg-transparent text-[9px] font-bold text-white focus:outline-none cursor-pointer pr-4 z-10 relative text-right">
                <option value={0} className="bg-zinc-900 text-rose-400">Quitar</option>
                {OPCIONES_DESCANSO.filter(seg => seg > 0).map(seg => (
                  <option key={seg} value={seg} className="bg-zinc-900 text-white">{formatear(seg)}</option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 text-amber-500/50 absolute right-1 z-0 pointer-events-none" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Descanso General</span>
        </div>
        <div className="relative flex items-center bg-black/40 rounded-lg px-2 py-1.5 border border-white/10 hover:border-white/30 transition-colors">
          <select value={tiempoConfigurado} onChange={(e) => handleTimeChange(Number(e.target.value))} className="appearance-none bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer pr-5 z-10 relative w-full text-right">
            {OPCIONES_DESCANSO.map(seg => <option key={seg} value={seg} className="bg-zinc-900 text-white">{formatear(seg)}</option>)}
          </select>
          <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 z-0 pointer-events-none" />
        </div>
      </div>
    );
  }

  // 2. ESTADO ACTIVO (LEE DEL CONTEXTO GLOBAL)
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  if (isExtra) {
    return (
      <div className="w-full flex justify-end animate-in fade-in zoom-in-95 duration-200">
        <div className="w-[180px] bg-zinc-900 border border-amber-500/40 rounded-lg p-2 flex flex-col gap-1.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 animate-pulse text-amber-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">Recuperando</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] text-amber-400">
                {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
                <button onClick={togglePause} className="text-zinc-400 hover:text-white transition-colors">
                  {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button onClick={stopTimer} className="text-zinc-500 hover:text-rose-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-amber-500 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2 shadow-lg animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 animate-pulse text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Recuperando...</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-black drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] text-emerald-400">
            {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1 border-l border-zinc-700 pl-3">
            <button onClick={togglePause} className="text-zinc-400 hover:text-white p-1.5 transition-colors bg-zinc-800 rounded-md active:scale-95">
              {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button onClick={stopTimer} className="text-zinc-500 hover:text-rose-500 p-1.5 transition-colors bg-zinc-800 rounded-md active:scale-95">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
        <div className="h-full bg-emerald-500 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}