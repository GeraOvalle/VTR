"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import GuardarRutina from "./guardarrutina";

interface TerminarRutinaProps {
  hasChanges: boolean;
  ejercicios: any[];
  elapsedTime: number;
  rutinaNombre: string;
  rutinaId: string; // <-- AÑADIDO PARA LA BASE DE DATOS
  asignadaPor?: string | null; // 🔴 Añadido para saber si tiene coach
  onExitCompletely: () => void; // <-- PARA SALIR AL TERMINAR
  onNotifyCoach?: () => void; // 🔴 Añadido para notificar al coach
}

export default function TerminarRutina({ 
  hasChanges, 
  ejercicios, 
  elapsedTime, 
  rutinaNombre, 
  rutinaId, 
  asignadaPor,
  onExitCompletely,
  onNotifyCoach
}: TerminarRutinaProps) {
  const [showGuardarModal, setShowGuardarModal] = useState(false);

  // 🔴 FUNCIÓN INTERMEDIA: Avisar al coach y luego salir
  const handleSaveComplete = () => {
    if (onNotifyCoach) {
      onNotifyCoach();
    }
    onExitCompletely();
  };

  // Si no hay cambios (no se ha marcado ninguna serie ni hecho notas), no mostramos el botón
  if (!hasChanges) return null;

  return (
    <>
      <button 
        onClick={() => setShowGuardarModal(true)}
        className="w-full bg-rose-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] md:text-xs shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" />
        Terminar y Guardar Entrenamiento
      </button>

      <GuardarRutina 
        isOpen={showGuardarModal}
        onClose={() => setShowGuardarModal(false)}
        ejercicios={ejercicios}
        elapsedTime={elapsedTime}
        rutinaNombre={rutinaNombre}
        rutinaId={rutinaId}
        asignadaPor={asignadaPor} // 🔴 Le pasamos la firma a GuardarRutina
        onSaveComplete={handleSaveComplete} // 🔴 Usamos la función intermedia
      />
    </>
  );
}