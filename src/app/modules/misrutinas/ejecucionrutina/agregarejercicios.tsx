"use client";

import { X, Dumbbell } from "lucide-react";
import VisorEjercicios from "../creacionrutina/visorejercicios";

interface AgregarEjerciciosProps {
  onClose: () => void;
  onAddExerciseToSession: (nuevoEjercicio: any) => void;
}

export default function AgregarEjerciciosModule({ onClose, onAddExerciseToSession }: AgregarEjerciciosProps) {
  
  // Interceptamos la selección del ejercicio desde el Visor
  const handleSelectExercise = (ejercicioBase: any) => {
    // Estructuramos el ejercicio adaptado específicamente para el pizarrón de ejecución en vivo
    const ejercicioParaSesion = {
      ...ejercicioBase,
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden">
        
        {/* Header del Modal */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-rose-500" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">
              Seleccionar Ejercicio para Añadir
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor del Visor Funcional */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 bg-black/40">
          <VisorEjercicios onAddExercise={handleSelectExercise} />
        </div>

      </div>
    </div>
  );
}