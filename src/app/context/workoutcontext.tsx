"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import IniciarRutinaModule from "../modules/misrutinas/ejecucionrutina/iniciarrutina";

interface WorkoutContextProps {
  iniciarEntrenamiento: (id: string, nombre: string) => void;
  terminarEntrenamiento: () => void;
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [rutinaActivaId, setRutinaActivaId] = useState<string | null>(null);
  const [rutinaActivaNombre, setRutinaActivaNombre] = useState<string>("");
  const [uidActivo, setUidActivo] = useState<string | null>(null);

  // 🔴 AUTO-RECOVERY: Detecta sesión iniciada y busca entrenamientos pendientes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUidActivo(user.uid);
        const sessionGuardada = localStorage.getItem(`cv_active_session_${user.uid}`);
        
        // Si hay un entrenamiento guardado en memoria, lo revivimos automáticamente
        if (sessionGuardada) {
          try {
            const parsed = JSON.parse(sessionGuardada);
            if (parsed.rutinaId && parsed.rutinaNombre) {
              setRutinaActivaId(parsed.rutinaId);
              setRutinaActivaNombre(parsed.rutinaNombre);
            }
          } catch (e) {
            console.error("Error al recuperar el entrenamiento pendiente", e);
          }
        }
      } else {
        // Si cierra sesión, limpiamos la vista del contexto
        setUidActivo(null);
        setRutinaActivaId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const iniciarEntrenamiento = (id: string, nombre: string) => {
    setRutinaActivaId(id);
    setRutinaActivaNombre(nombre);
  };

  const terminarEntrenamiento = () => {
    // Cuando terminamos o descartamos, borramos el "Recovery" de la memoria
    if (uidActivo) {
      localStorage.removeItem(`cv_active_session_${uidActivo}`);
    }
    setRutinaActivaId(null);
    setRutinaActivaNombre("");
  };

  return (
    <WorkoutContext.Provider value={{ iniciarEntrenamiento, terminarEntrenamiento }}>
      {children}
      
      {/* EL WIDGET FLOTA SOBRE TODO */}
      {rutinaActivaId && (
        <IniciarRutinaModule 
          rutinaId={rutinaActivaId} 
          rutinaNombre={rutinaActivaNombre} 
          onExitCompletely={terminarEntrenamiento} 
        />
      )}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error("useWorkout debe usarse dentro de un WorkoutProvider");
  return context;
};