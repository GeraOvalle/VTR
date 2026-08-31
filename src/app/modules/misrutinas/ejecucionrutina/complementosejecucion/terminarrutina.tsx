"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import GuardarRutina from "./guardarrutina";

// 🔴 IMPORTAMOS EL CONTEXTO DEL TIMER PARA PODER APAGARLO
import { useRestTimer } from "../../../../context/resttimercontext";

interface TerminarRutinaProps {
  hasChanges: boolean;
  ejercicios: any[];
  elapsedTime: number;
  rutinaNombre: string;
  rutinaId: string; 
  asignadaPor?: string | null; 
  onExitCompletely: () => void; 
  onNotifyCoach?: () => void; 
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

  // 🔴 TRAEMOS LA FUNCIÓN PARA FRENAR EL RELOJ
  const { stopTimer } = useRestTimer();

  // FUNCIÓN INTERMEDIA: Avisar al coach, apagar timer y salir
  const handleSaveComplete = () => {
    if (onNotifyCoach) {
      onNotifyCoach();
    }
    
    // 🔴 APAGAMOS EL TIMER EN SEGUNDO PLANO ANTES DE CERRAR LA PANTALLA
    stopTimer();
    
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
        asignadaPor={asignadaPor} 
        onSaveComplete={handleSaveComplete} // 🔴 Pasamos la función con el apagado del timer
      />
    </>
  );
}