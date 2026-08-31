"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2, RefreshCw, Link, AlertTriangle, X, CheckSquare, Square, ArrowUpDown } from "lucide-react";

interface OpcionesEjercicioProps {
  ejercicioIndex: number;
  ejerciciosRutina: any[];
  onBorrar: () => void;
  onReemplazar: () => void;
  onCrearSuperserie: (indicesSeleccionados: number[]) => void;
  onReordenar: () => void; // 🔴 AQUÍ ESTÁ LA SOLUCIÓN AL ERROR
}

export default function OpcionesEjercicio({ ejercicioIndex, ejerciciosRutina, onBorrar, onReemplazar, onCrearSuperserie, onReordenar }: OpcionesEjercicioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSuperserieModal, setShowSuperserieModal] = useState(false);
  
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBorrarClick = () => {
    setIsOpen(false);
    setShowConfirmDelete(true);
  };

  const handleSuperserieClick = () => {
    setIsOpen(false);
    setSeleccionados([ejercicioIndex]);
    setShowSuperserieModal(true);
  };

  const handleReordenarClick = () => {
    setIsOpen(false);
    onReordenar();
  };

  const toggleSeleccion = (idx: number) => {
    if (idx === ejercicioIndex) return; 
    if (seleccionados.includes(idx)) {
      setSeleccionados(seleccionados.filter(i => i !== idx));
    } else {
      setSeleccionados([...seleccionados, idx]);
    }
  };

  const confirmarSuperserie = () => {
    if (seleccionados.length > 1) {
      onCrearSuperserie(seleccionados);
    }
    setShowSuperserieModal(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/40 hover:bg-zinc-800 text-zinc-400 hover:text-white p-1.5 rounded-md transition-colors border border-transparent hover:border-zinc-700"
        title="Opciones del Ejercicio"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col w-full">
            <button 
              onClick={() => { setIsOpen(false); onReemplazar(); }}
              className="flex items-center gap-2 px-3 py-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-800/50 group"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-500 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-widest">
                Reemplazar
              </span>
            </button>

            {/* 🔴 NUEVO BOTÓN REORDENAR */}
            <button 
              onClick={handleReordenarClick}
              className="flex items-center gap-2 px-3 py-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-800/50 group"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-widest">
                Reordenar Rutina
              </span>
            </button>
            
            <button 
              onClick={handleSuperserieClick}
              className="flex items-center gap-2 px-3 py-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-800/50 group"
            >
              <Link className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-widest">
                Añadir a Superserie
              </span>
            </button>

            <button 
              onClick={handleBorrarClick}
              className="flex items-center gap-2 px-3 py-3 hover:bg-rose-500/10 transition-colors text-left group"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-rose-500 group-hover:text-rose-400 uppercase tracking-widest">
                Eliminar Ejercicio
              </span>
            </button>
          </div>
        </div>
      )}

      {/* POP-UP DE CONFIRMACIÓN DE BORRADO */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-rose-500/50 rounded-2xl w-full max-w-xs flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.2)] overflow-hidden text-center p-6 relative">
            <div className="mx-auto w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-1 ring-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-2">¿Eliminar ejercicio?</h3>
            <p className="text-[10px] text-zinc-400 font-medium mb-6 leading-relaxed">
              Se borrará de la sesión actual junto con todas sus series registradas. Esta acción no se puede deshacer.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowConfirmDelete(false);
                  onBorrar();
                }}
                className="flex-1 px-4 py-2.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE SUPERSERIE */}
      {showSuperserieModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl w-full max-w-md flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-500" /> Crear Enlace
              </h3>
              <button onClick={() => setShowSuperserieModal(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-500/5 border-b border-zinc-800/50 shrink-0">
              <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                Selecciona los ejercicios que deseas vincular con <strong className="text-amber-400">{ejerciciosRutina[ejercicioIndex]?.nombreEs || ejerciciosRutina[ejercicioIndex]?.nombre}</strong>.
              </p>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2 custom-scrollbar">
              {ejerciciosRutina.map((ej, idx) => {
                const isCurrent = idx === ejercicioIndex;
                const isSelected = seleccionados.includes(idx);
                
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleSeleccion(idx)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isCurrent ? "bg-amber-500/10 border-amber-500/30 opacity-70 pointer-events-none" : 
                      isSelected ? "bg-zinc-800 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : 
                      "bg-black/40 border-zinc-800/50 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="shrink-0 text-amber-500">
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-zinc-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate capitalize">{ej.nombreEs || ej.nombre}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5 truncate">
                        {idx + 1}. {ej.musculoEs || ej.musculoObjetivo}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Origen</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowSuperserieModal(false)}
                className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarSuperserie}
                disabled={seleccionados.length <= 1}
                className="bg-amber-500 text-black px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
              >
                Vincular ({seleccionados.length})
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}