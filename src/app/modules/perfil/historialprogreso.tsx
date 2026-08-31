"use client";

import { ArrowLeft, TrendingUp, Sparkles } from "lucide-react";

interface HistorialProgresoProps {
  onBack: () => void;
}

export default function HistorialProgreso({ onBack }: HistorialProgresoProps) {
  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30">
      
      {/* Fondo estético */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>

      <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Volver al Perfil</span>
          </button>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white">
            EVOLUCIÓN Y PROGRESO
          </h1>
        </div>

        {/* Tarjeta de Contenido */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[350px] shadow-[0_0_30px_-10px_rgba(255,255,255,0.05)]">
          <div className="bg-emerald-500/10 p-4 rounded-2xl mb-4 border border-emerald-500/20">
            <TrendingUp className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-2">Próximamente</h2>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed font-medium">
            Muy pronto podrás visualizar tus gráficas de volumen acumulado, evolución de peso corporal y métricas de rendimiento físico a lo largo del tiempo.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400">
            <Sparkles className="w-3 h-3" /> Módulo en desarrollo
          </div>
        </div>

      </div>
    </main>
  );
}