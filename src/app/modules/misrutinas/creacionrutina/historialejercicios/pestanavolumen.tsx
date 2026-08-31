"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Lock, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PestanaVolumenProps {
  registros: any[];
  rol?: string;
}

type TimeRange = '7D' | '15D' | '1M' | '3M' | '6M' | '1A' | 'ALL';

export default function PestanaVolumen({ registros, rol = "clasico" }: PestanaVolumenProps) {
  const [rangoActivo, setRangoActivo] = useState<TimeRange>('1M');

  const rangos = [
    { id: '7D', label: '7 Días', dias: 7, premium: false },
    { id: '15D', label: '15 Días', dias: 15, premium: false },
    { id: '1M', label: '1 Mes', dias: 30, premium: false },
    { id: '3M', label: '3 Meses', dias: 90, premium: false },
    { id: '6M', label: '6 Meses', dias: 180, premium: true },
    { id: '1A', label: '1 Año', dias: 365, premium: true },
    { id: 'ALL', label: 'Histórico', dias: 9999, premium: true },
  ];

  const { chartData, listData, maxVolRango, isLocked } = useMemo(() => {
    const rangoActual = rangos.find(r => r.id === rangoActivo);
    const isPremiumLocked = rangoActual?.premium && rol === "clasico";

    const limiteFecha = new Date();
    if (rangoActual) limiteFecha.setDate(limiteFecha.getDate() - rangoActual.dias);

    const datosFiltrados = registros.map(registro => {
      const fechaObj = registro.fecha?.toDate ? registro.fecha.toDate() : new Date(registro.fecha);
      
      const volTotal = registro.series?.reduce((total: number, serie: any) => {
        if (serie.completado && serie.pesoReal && serie.repsReal) {
          const peso = parseFloat(serie.pesoReal);
          const reps = parseInt(serie.repsReal);
          return total + (peso * reps);
        }
        return total;
      }, 0) || 0;

      return {
        fechaObj,
        fechaStr: fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        fechaCorta: fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'numeric' }),
        volumen: Math.round(volTotal)
      };
    })
    .filter(d => d.volumen > 0)
    .filter(d => isPremiumLocked ? true : d.fechaObj >= limiteFecha);

    const chartData = [...datosFiltrados].sort((a, b) => a.fechaObj.getTime() - b.fechaObj.getTime());
    const listData = [...datosFiltrados];
    const maxVolRango = chartData.length > 0 ? Math.max(...chartData.map(d => d.volumen)) : 0;

    return { chartData, listData, maxVolRango, isLocked: isPremiumLocked };
  }, [registros, rangoActivo, rol]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950 border border-emerald-500/30 p-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">{label}</p>
          <p className="text-lg font-black text-emerald-400 font-mono">
            {payload[0].value} <span className="text-[10px] text-zinc-500">kg</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-6">
      
      <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {rangos.map((rango) => (
          <button
            key={rango.id}
            onClick={() => setRangoActivo(rango.id as TimeRange)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 transition-all border ${
              rangoActivo === rango.id
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {rango.label}
            {rango.premium && rol === "clasico" && <Lock className={`w-3 h-3 ${rangoActivo === rango.id ? "text-emerald-400" : "text-zinc-600"}`} />}
          </button>
        ))}
      </div>

      <div className="relative bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-4 sm:p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Volumen Máximo</span>
            <span className="text-2xl font-black text-white font-mono">{isLocked ? "--" : maxVolRango} <span className="text-sm text-emerald-500">kg</span></span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="h-[200px] w-full relative">
          {isLocked ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center bg-zinc-950/80 backdrop-blur-sm rounded-2xl border border-rose-500/20 animate-in zoom-in-95 duration-300">
              <div className="bg-rose-500/10 p-3 rounded-full mb-3"><Lock className="w-6 h-6 text-rose-500" /></div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Análisis Histórico Bloqueado</h4>
              <p className="text-[10px] text-zinc-400 font-medium px-6 leading-relaxed mb-4">El plan clásico guarda hasta 3 meses de progreso. Actualiza tu plan para desbloquear tu historial completo.</p>
              <button className="bg-white text-black px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <Sparkles className="w-3 h-3" /> Próximamente
              </button>
            </div>
          ) : chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="fechaCorta" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="volumen" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#18181b", stroke: "#10b981", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-60">
              <TrendingUp className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Insuficientes datos</p>
              <p className="text-[9px] text-zinc-500 mt-1">Registra al menos 2 sesiones para graficar la tendencia.</p>
            </div>
          )}
        </div>
      </div>

      {!isLocked && listData.length > 0 && (
        <div className="space-y-2 mt-6">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 mb-3">Desglose de Tonelaje</h4>
          {listData.map((item, idx) => {
            const width = Math.max((item.volumen / maxVolRango) * 100, 5); 
            return (
              <div key={idx} className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800/50">
                <span className="w-14 text-[9px] font-bold text-zinc-400 text-center uppercase tracking-widest shrink-0">{item.fechaStr}</span>
                <div className="flex-1 h-7 bg-zinc-900 rounded-lg flex items-center relative overflow-hidden">
                  <div className="h-full bg-emerald-500/20 border-r-2 border-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${width}%` }}></div>
                  <span className="absolute left-3 text-[10px] font-black text-white drop-shadow-md font-mono">{item.volumen} <span className="text-[8px] text-emerald-100/50">kg</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}