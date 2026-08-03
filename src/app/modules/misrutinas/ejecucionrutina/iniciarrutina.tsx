"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, Clock, Play, Pause, 
  X, AlertTriangle, Maximize2, Loader2 
} from "lucide-react";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import EjecucionRutinaModule from "./ejecucionrutina";
import AgregarEjerciciosModule from "./agregarejercicios";

interface IniciarRutinaProps {
  rutinaId: string;
  rutinaNombre?: string;
  onExitCompletely: () => void;
}

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function IniciarRutinaModule({ rutinaId, rutinaNombre = "Rutina Actual", onExitCompletely }: IniciarRutinaProps) {
  const [loading, setLoading] = useState(true);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [nombreRutina, setNombreRutina] = useState(rutinaNombre);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Estado para controlar el modal de agregar ejercicios en vivo
  const [showAgregarModal, setShowAgregarModal] = useState(false);

  // 1. Cargar los datos reales de la rutina desde Firebase al montar el componente
  useEffect(() => {
    const fetchRutinaData = async () => {
      const user = auth.currentUser;
      if (!user || !rutinaId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid, "rutinas", rutinaId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombreRutina(data.nombre || rutinaNombre);
          setEjercicios(data.ejercicios || []);
        }
      } catch (error) {
        console.error("Error al cargar la rutina para ejecución:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRutinaData();
  }, [rutinaId, rutinaNombre]);

  // 2. Lógica del Cronómetro Global
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleDiscardSession = () => {
    setShowExitModal(false);
    onExitCompletely();
  };

  const handleMinimize = () => {
    setShowExitModal(false);
    setIsMinimized(true);
  };

  const handleAddExerciseToSession = (nuevoEjercicio: any) => {
    setEjercicios((prev) => [...prev, nuevoEjercicio]);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse text-zinc-400">
          Preparando área de entrenamiento...
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VISTA 1: WIDGET FLOTANTE (MINIMIZADO)
  // ----------------------------------------------------------------------
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[100] bg-rose-500 text-white rounded-full pl-3 pr-4 py-2.5 shadow-[0_10px_40px_rgba(244,63,94,0.4)] flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-bottom-5"
      >
        <div className="bg-black/20 p-1.5 rounded-full">
          <Clock className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black uppercase tracking-widest text-white/80 leading-none">En curso</span>
          <span className="text-xs font-black tracking-widest font-mono leading-tight">{formatTime(elapsedTime)}</span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 ml-1 opacity-70" />
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VISTA 2: PANTALLA COMPLETA DE EJECUCIÓN (PIZARRÓN)
  // ----------------------------------------------------------------------
  return (
    <>
      <main className="fixed inset-0 z-50 bg-black text-white overflow-hidden font-sans selection:bg-rose-500/30 flex flex-col">
        
        {/* Fondos */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.15) 0%, transparent 50%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 8px)`
        }}></div>

        <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col h-full">
          
          {/* Top Bar de Ejecución */}
          <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/5 shrink-0 bg-black/50 backdrop-blur-md">
            <button 
              onClick={() => setShowExitModal(true)} 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:block">Salir</span>
            </button>
            
            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300 hidden sm:block truncate max-w-[200px]">
                {nombreRutina}
              </span>
              
              {/* Controles de Tiempo */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-inner">
                <div className="px-3 text-rose-500 font-black tracking-widest font-mono text-base md:text-lg min-w-[85px] text-center">
                  {formatTime(elapsedTime)}
                </div>
                <div className="w-[1px] h-6 bg-zinc-800 mx-1"></div>
                <button 
                  onClick={() => setIsActive(!isActive)}
                  className={`p-1.5 rounded-md transition-colors ${isActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Área Principal: Pizarrón de Trabajo Conectado */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <EjecucionRutinaModule 
              nombre={nombreRutina}
              ejercicios={ejercicios}
              onUpdateEjercicios={(nuevosEjercicios) => setEjercicios(nuevosEjercicios)}
              onOpenAgregarEjercicios={() => setShowAgregarModal(true)}
            />
          </div>

        </div>
      </main>

      {/* MODAL PARA AÑADIR EJERCICIOS EN VIVO */}
      {showAgregarModal && (
        <AgregarEjerciciosModule 
          onClose={() => setShowAgregarModal(false)}
          onAddExerciseToSession={handleAddExerciseToSession}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE SALIDA */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden">
            
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <h3 className="text-sm font-black text-white uppercase tracking-widest">¿Pausar Entrenamiento?</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed px-2">
                Puedes minimizar el cronómetro para navegar por la app sin perder tu progreso, o descartar la sesión por completo si terminaste antes de tiempo.
              </p>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex flex-col gap-2.5">
              
              <button 
                onClick={handleMinimize}
                className="w-full bg-rose-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                Minimizar y Continuar
              </button>

              <button 
                onClick={handleDiscardSession}
                className="w-full bg-zinc-900 border border-zinc-700 text-rose-500 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-500/10 transition-colors flex justify-center items-center gap-2"
              >
                <X className="w-4 h-4" />
                Descartar Sesión
              </button>
              
              <button 
                onClick={() => setShowExitModal(false)}
                className="w-full text-zinc-500 py-2 font-bold uppercase tracking-widest text-[9px] hover:text-white transition-colors mt-1"
              >
                Cancelar
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}