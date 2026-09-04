"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface FechaRegistroDataProps {
  fecha: string; // Formato YYYY-MM-DD
  onChange: (nuevaFecha: string) => void;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export default function FechaRegistroData({ fecha, onChange }: FechaRegistroDataProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Convertimos el string 'YYYY-MM-DD' a Date local (evitando problemas de zona horaria)
  const parsearFecha = (str: string) => {
    const [y, m, d] = str.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  };

  const [viewDate, setViewDate] = useState(parsearFecha(fecha));

  // Fecha máxima (Hoy)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Formatear a 'YYYY-MM-DD' para guardarlo
  const formatearAString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formatear para mostrar en el botón (Ej: "12 de Agosto, 2026")
  const formatoVisual = (str: string) => {
    const d = parsearFecha(str);
    return `${d.getDate()} de ${MESES[d.getMonth()]}, ${d.getFullYear()}`;
  };

  // Lógica del Calendario
  const anioActual = viewDate.getFullYear();
  const mesActual = viewDate.getMonth();
  
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const primerDiaMes = new Date(anioActual, mesActual, 1).getDay();
  // Ajustar para que Lunes sea el primer día (0) y Domingo el último (6)
  const offsetDias = primerDiaMes === 0 ? 6 : primerDiaMes - 1;

  const cambiarMes = (direccion: number) => {
    setViewDate(new Date(anioActual, mesActual + direccion, 1));
  };

  const seleccionarDia = (dia: number) => {
    const nuevaFecha = new Date(anioActual, mesActual, dia);
    if (nuevaFecha <= hoy) {
      onChange(formatearAString(nuevaFecha));
      setIsOpen(false);
    }
  };

  const seleccionarHoy = () => {
    onChange(formatearAString(hoy));
    setViewDate(hoy);
    setIsOpen(false);
  };

  // 🔴 EL POP-UP MAESTRO (Renderizado en un Portal)
  const modalCalendario = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-700 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER DEL MODAL */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/40">
          <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-rose-500" />
            Fecha de Medición
          </h3>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 bg-black/40 hover:bg-rose-500 rounded-full text-zinc-400 hover:text-white transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 sm:p-6">
          {/* NAVEGACIÓN DE MESES */}
          <div className="flex justify-between items-center mb-5 bg-zinc-900/60 rounded-xl p-1.5 border border-zinc-800/80">
            <button 
              type="button" 
              onClick={() => cambiarMes(-1)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-white">
              {MESES[mesActual]} {anioActual}
            </span>
            <button 
              type="button" 
              onClick={() => cambiarMes(1)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* DÍAS DE LA SEMANA */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map(dia => (
              <div key={dia} className="text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest pb-2 border-b border-zinc-800/50">
                {dia}
              </div>
            ))}
          </div>

          {/* CUADRÍCULA NUMÉRICA */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: offsetDias }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-12" />
            ))}
            
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const diaNumero = i + 1;
              const fechaIteracion = new Date(anioActual, mesActual, diaNumero);
              const esHoy = formatearAString(fechaIteracion) === formatearAString(hoy);
              const esSeleccionado = formatearAString(fechaIteracion) === fecha;
              const esFuturo = fechaIteracion > hoy;

              return (
                <button
                  key={diaNumero}
                  type="button"
                  disabled={esFuturo}
                  onClick={() => seleccionarDia(diaNumero)}
                  className={`h-10 sm:h-12 w-full rounded-xl text-[11px] sm:text-xs font-mono font-black flex items-center justify-center transition-all active:scale-95 ${
                    esSeleccionado 
                      ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400" 
                      : esFuturo 
                        ? "opacity-20 cursor-not-allowed text-zinc-600 bg-transparent" 
                        : esHoy 
                          ? "border-2 border-rose-500/50 text-rose-400 hover:bg-rose-500/10" 
                          : "text-zinc-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 bg-zinc-900/30"
                  }`}
                >
                  {diaNumero}
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/20">
          <button
            type="button"
            onClick={seleccionarHoy}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors active:scale-[0.98]"
          >
            Volver a Hoy
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-2.5 sm:p-4 relative group hover:border-zinc-700 transition-all">
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-800/0 via-zinc-800/10 to-zinc-800/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
      
      <label className="text-[9px] sm:text-[10px] text-white font-black mb-2 flex items-center gap-1.5 uppercase tracking-widest relative z-10">
        <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" /> 
        Fecha del Registro
      </label>
      
      <div className="relative z-10">
        {/* BOTÓN DISPARADOR */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full bg-black/40 border border-zinc-700 rounded-lg sm:rounded-xl p-2.5 sm:p-3.5 text-[11px] sm:text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500/50 transition-all cursor-pointer hover:bg-black/60 hover:border-zinc-500 flex justify-between items-center text-left"
        >
          <span className="tracking-wide">{formatoVisual(fecha)}</span>
          <div className="bg-zinc-800 p-1.5 rounded-md">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-300" />
          </div>
        </button>

        {/* RENDERIZAMOS EL PORTAL */}
        {isOpen && mounted && createPortal(modalCalendario, document.body)}
      </div>
      
      <p className="text-[8px] sm:text-[9px] text-zinc-500 mt-2 font-medium leading-relaxed relative z-10">
        Cámbiala si estás subiendo medidas de semanas o meses anteriores.
      </p>
    </div>
  );
}