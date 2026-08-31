"use client";

import { useState, useRef } from "react";
import { X, GripVertical, ChevronUp, ChevronDown, CheckCircle2, ListOrdered, Dumbbell } from "lucide-react";

interface ReordenarRutinaProps {
  ejercicios: any[];
  onSave: (nuevaLista: any[]) => void;
  onClose: () => void;
}

export default function ReordenarRutina({ ejercicios, onSave, onClose }: ReordenarRutinaProps) {
  const [lista, setLista] = useState([...ejercicios]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  
  // Referencias para el Drag & Drop en Celular (Touch)
  const dragIndexRef = useRef<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // LÓGICA DE D&D PARA COMPUTADORA (HTML5)
  // ==========================================
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    dragIndexRef.current = index;
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      const newList = [...lista];
      const item = newList[dragIndexRef.current];
      newList.splice(dragIndexRef.current, 1);
      newList.splice(index, 0, item);
      dragIndexRef.current = index;
      setDragIndex(index);
      setLista(newList);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    dragIndexRef.current = null;
  };

  // ==========================================
  // LÓGICA DE D&D PARA CELULAR (Touch + Long Press)
  // ==========================================
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    longPressTimer.current = setTimeout(() => {
      setDragIndex(index);
      dragIndexRef.current = index;
      if (navigator.vibrate) navigator.vibrate(50); // Vibración háptica de confirmación
    }, 400); // 400ms para activar el modo arrastre
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIndexRef.current === null) {
      // Si se mueve el dedo antes de los 400ms, cancelamos el timer (el usuario está haciendo scroll normal)
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      return;
    }

    // Prevenir el scroll del sistema mientras arrastramos
    if (e.cancelable) e.preventDefault(); 

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const dropTarget = element.closest('[data-index]');
      if (dropTarget) {
        const targetIndex = parseInt(dropTarget.getAttribute('data-index') || '-1', 10);
        if (targetIndex !== -1 && targetIndex !== dragIndexRef.current) {
          const newList = [...lista];
          const item = newList[dragIndexRef.current];
          newList.splice(dragIndexRef.current, 1);
          newList.splice(targetIndex, 0, item);
          dragIndexRef.current = targetIndex;
          setDragIndex(targetIndex);
          setLista(newList);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (dragIndexRef.current !== null) {
      setDragIndex(null);
      dragIndexRef.current = null;
    }
  };

  // ==========================================
  // ESCUDO ANTI-FALLOS: Movimiento por botones
  // ==========================================
  const moverElemento = (index: number, direccion: 'arriba' | 'abajo') => {
    if (direccion === 'arriba' && index === 0) return;
    if (direccion === 'abajo' && index === lista.length - 1) return;

    const nuevaLista = [...lista];
    const targetIndex = direccion === 'arriba' ? index - 1 : index + 1;
    
    const temp = nuevaLista[index];
    nuevaLista[index] = nuevaLista[targetIndex];
    nuevaLista[targetIndex] = temp;
    
    setLista(nuevaLista);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-700/50 rounded-3xl w-full max-w-lg flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden max-h-[85vh]">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Reordenar Rutina</h3>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 hidden sm:block">
                Arrastra o usa las flechas para cambiar el orden
              </p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 sm:hidden">
                Mantén presionado para arrastrar
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LISTA DE EJERCICIOS */}
        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2 custom-scrollbar"
          style={{ touchAction: dragIndex !== null ? 'none' : 'auto' }} // Bloquea el scroll natural de la pantalla al arrastrar
        >
          {lista.map((ej, index) => {
            const isDragging = dragIndex === index;

            return (
              <div 
                key={ej.id || index}
                data-index={index}
                draggable // Activa HTML5 D&D para PC
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isDragging 
                    ? "bg-zinc-800 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)] opacity-80 scale-[1.02] z-50 cursor-grabbing" 
                    : "bg-black/40 border-zinc-800/50 hover:bg-zinc-900 cursor-grab"
                }`}
              >
                {/* Agarre (Grip) */}
                <div className="shrink-0 text-zinc-600">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                {/* Ícono/Miniatura */}
                <div className="w-10 h-10 rounded-md bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {ej.gifUrl ? (
                    <img src={ej.gifUrl} alt="" className="w-full h-full object-cover opacity-70" />
                  ) : (
                    <Dumbbell className="w-4 h-4 text-zinc-500" />
                  )}
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0 pointer-events-none select-none">
                  <p className="text-xs font-bold text-white truncate capitalize">{ej.nombreEs || ej.nombre}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-0.5 truncate">
                    {index + 1}. {ej.musculoEs || ej.musculoObjetivo}
                  </p>
                </div>

                {/* Botones Manuales (Escudo Antifallos) */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); moverElemento(index, 'arriba'); }}
                    disabled={index === 0}
                    className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moverElemento(index, 'abajo'); }}
                    disabled={index === lista.length - 1}
                    className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(lista)}
            className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" /> Guardar Orden
          </button>
        </div>

      </div>
    </div>
  );
}