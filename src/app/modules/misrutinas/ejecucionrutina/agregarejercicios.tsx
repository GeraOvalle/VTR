"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Dumbbell } from "lucide-react";
import VisorEjercicios from "../creacionrutina/visorejercicios";

interface AgregarEjerciciosProps {
  onClose: () => void;
  onAddExerciseToSession: (nuevoEjercicio: any) => void;
}

export default function AgregarEjerciciosModule({ onClose, onAddExerciseToSession }: AgregarEjerciciosProps) {
  const [mounted, setMounted] = useState(false);

  // Aseguramos que el Portal solo se renderice en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Interceptamos la selección del ejercicio desde el Visor
  const handleSelectExercise = (ejercicioBase: any) => {
    // 🔴 CLONACIÓN PROFUNDA: Blindamos la memoria aislando los datos base
    const ejercicioClonado = JSON.parse(JSON.stringify(ejercicioBase));

    // Estructuramos el ejercicio adaptado específicamente para el pizarrón de ejecución en vivo
    const ejercicioParaSesion = {
      ...ejercicioClonado,
      descansoSegundos: 90,
      nota: "",
      series: [
        // Añadimos por defecto una serie inicial de trabajo para agilizar
        {
          tipo: "normal",
          repsTipo: "fijas",
          reps: "10",
          minReps: "8",
          maxReps: "12",
          rir: "1",
          descansoExtra: 0,
          pesoReal: "",
          repsReal: "",
          completado: false
        }
      ]
    };

    onAddExerciseToSession(ejercicioParaSesion);
    onClose();
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 sm:border border-rose-500/30 sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[95vh] max-w-5xl flex flex-col shadow-[0_0_60px_rgba(244,63,94,0.15)] overflow-hidden">
        
        {/* Header del Modal */}
        <div className="p-4 md:p-5 border-b border-zinc-800 flex justify-between items-center bg-rose-500/5 shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500/20 p-2 rounded-full">
              <Dumbbell className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
            </div>
            <h3 className="text-xs md:text-sm font-black text-rose-400 uppercase tracking-widest">
              Añadir a la Sesión Activa
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white p-2 md:p-2.5 bg-zinc-900 border border-zinc-800 rounded-full transition-all hover:bg-rose-500 hover:text-white hover:border-rose-500 active:scale-95"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Contenedor del Visor Funcional */}
        <div className="flex-1 overflow-y-auto bg-black/40 relative custom-scrollbar">
          <VisorEjercicios onAddExercise={handleSelectExercise} />
        </div>

      </div>
    </div>
  );

  // Renderizamos en el Body para evadir cualquier problema de Z-Index
  return createPortal(modalContent, document.body);
}