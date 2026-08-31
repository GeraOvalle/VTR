"use client";

import { useState, useRef, TouchEvent } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

interface BorrarSerieWrapperProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export default function BorrarSerieWrapper({ children, onDelete }: BorrarSerieWrapperProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const currentTranslate = useRef<number>(0);

  const SWIPE_THRESHOLD = -50;
  const MAX_SWIPE = -80;

  const handleTouchStart = (e: TouchEvent) => {
    if (showConfirm) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || showConfirm) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    if (isHorizontalSwipe.current === null) {
      const diffX = Math.abs(currentX - touchStartX.current);
      const diffY = Math.abs(currentY - touchStartY.current);
      
      if (diffY > diffX && diffY > 5) {
        isHorizontalSwipe.current = false;
        setIsSwiping(false);
      } else if (diffX > 5) {
        isHorizontalSwipe.current = true;
      }
    }

    if (isHorizontalSwipe.current === false) return; 

    const diff = currentX - touchStartX.current;

    if (diff < 0) {
      const newX = diff < MAX_SWIPE ? MAX_SWIPE + (diff - MAX_SWIPE) * 0.2 : diff;
      setTranslateX(newX);
      currentTranslate.current = newX;
    } else {
      setTranslateX(0);
      currentTranslate.current = 0;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || showConfirm) return;
    setIsSwiping(false);
    
    if (currentTranslate.current <= SWIPE_THRESHOLD) {
      setTranslateX(MAX_SWIPE);
    } else {
      setTranslateX(0);
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalSwipe.current = null;
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
    setTranslateX(0);
  };

  return (
    // 🔴 EL TRUCO ESTÁ AQUÍ: hover:z-[60] y focus-within:z-[60] hacen que la serie activa salte al frente de las demás
    <div className="relative w-full flex items-center gap-1 group hover:z-[60] focus-within:z-[60]">
      
      <div className="relative flex-1 min-w-0 overflow-visible rounded-lg">
        
        <div className={`absolute inset-y-0 right-0 w-[80px] bg-rose-500 flex items-center justify-center sm:hidden rounded-r-lg transition-opacity ${translateX < 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button 
            onClick={handleDeleteClick} 
            className="w-full h-full flex flex-col items-center justify-center active:bg-rose-600 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-white mb-0.5" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white">Borrar</span>
          </button>
        </div>

        <div
          className={`relative w-full rounded-lg ${isSwiping || translateX !== 0 ? "transition-none" : "transition-transform duration-200 ease-out"}`}
          style={{ transform: translateX !== 0 ? `translateX(${translateX}px)` : 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>

      <button 
        onClick={handleDeleteClick}
        className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-500 hover:text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all shrink-0 group-hover:border-zinc-700"
        title="Borrar Serie"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-rose-500/50 rounded-2xl w-full max-w-xs flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.2)] overflow-hidden text-center p-6 relative">
            <div className="mx-auto w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-1 ring-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-2">¿Borrar Serie?</h3>
            <p className="text-[10px] text-zinc-400 font-medium mb-6 leading-relaxed">
              Esta serie se eliminará de la sesión actual.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onDelete();
                }}
                className="flex-1 px-4 py-2.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-colors shadow-[0_0_15px_rgba(244,63,94,0.4)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}