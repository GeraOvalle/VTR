"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, Clock, Play, Pause, 
  X, AlertTriangle, Maximize2, Loader2
} from "lucide-react";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import EjecucionRutinaModule from "./ejecucionrutina";
import AgregarEjerciciosModule from "./agregarejercicios";

import TerminarRutina from "./complementosejecucion/terminarrutina";
import ReportesRutina from "./complementosejecucion/reportesrutina";

import { useRestTimer } from "../../../context/resttimercontext"; 
import { useWorkout } from "../../../context/workoutcontext";

import { enviarNotificacion } from "../../../lib/notificaciones";

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
  
  const [asignadaPor, setAsignadaPor] = useState<string | null>(null);
  const [originalEjercicios, setOriginalEjercicios] = useState<any[]>([]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [conflictSession, setConflictSession] = useState<any>(null);

  const { timeLeft, totalTime, stopTimer } = useRestTimer();
  const { iniciarEntrenamiento } = useWorkout();

  // 🔴 FUNCIÓN DE LIMPIEZA DE HISTORIAL POR CADUCIDAD (Auto-Cleanup)
  const limpiarHistorialCaducado = async (userId: string, rolUsuario: string) => {
    try {
      // Determinamos el límite en meses según el rol
      const limiteMeses = (rolUsuario === "clasico" || rolUsuario === "gratis") ? 3 : 24; 
      
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() - limiteMeses);

      const q = query(collection(db, "users", userId, "pesosregistro"));
      const snap = await getDocs(q);

      let borrados = 0;
      const promesasBorrado: Promise<void>[] = [];

      snap.forEach((documento) => {
        const data = documento.data();
        if (data.fecha) {
          const fechaRegistro = data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
          if (fechaRegistro < fechaLimite) {
            promesasBorrado.push(deleteDoc(doc(db, "users", userId, "pesosregistro", documento.id)));
            borrados++;
          }
        }
      });

      if (promesasBorrado.length > 0) {
        await Promise.all(promesasBorrado);
        console.log(`[Auto-Cleanup] Limpieza de historial: Se borraron ${borrados} registros antiguos (Límite: ${limiteMeses} meses).`);
      }

    } catch (error) {
      console.error("[Auto-Cleanup] Error limpiando el historial:", error);
    }
  };

  // 1. CARGA O AUTO-RECUPERACIÓN
  useEffect(() => {
    const fetchRutinaData = async () => {
      const user = auth.currentUser;
      if (!user || !rutinaId) {
        setLoading(false);
        return;
      }

      try {
        // A. Obtenemos Rol del Usuario y ejecutamos limpieza de registros silenciosa
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        const rolUsuario = userSnap.exists() ? userSnap.data().rol || "clasico" : "clasico";
        
        // Ejecutamos limpieza de fondo (no bloquea la pantalla de carga porque no usamos await intencionalmente)
        limpiarHistorialCaducado(user.uid, rolUsuario);

        // B. OBTENEMOS LA RUTINA ORIGINAL DESDE FIREBASE COMO BASELINE (Fotografía)
        const docRef = doc(db, "users", user.uid, "rutinas", rutinaId);
        const docSnapRutina = await getDoc(docRef);

        let fbData: any = null;
        if (docSnapRutina.exists()) {
          fbData = docSnapRutina.data();
          setOriginalEjercicios(fbData.ejercicios || []); // Guardamos la estructura pura para comparar
        }

        // C. REVISAMOS SI HAY UNA SESIÓN EN CURSO EN LA MEMORIA CACHÉ
        const sessionKey = `cv_active_session_${user.uid}`;
        const savedSession = localStorage.getItem(sessionKey);
        
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          
          if (parsed.rutinaId === rutinaId) {
            setNombreRutina(parsed.rutinaNombre);
            setEjercicios(parsed.ejercicios || []);
            setElapsedTime(parsed.elapsedTime || 0);
            
            setAsignadaPor(parsed.asignadaPor || null);
            
            setIsActive(false); 
            if (parsed.elapsedTime > 0 || parsed.hasChanges) setHasChanges(true);
            
            setLoading(false);
            return;
          } else {
            setConflictSession(parsed);
            setLoading(false);
            return; 
          }
        }

        // D. SI NO HAY SESIÓN ACTIVA, CARGAMOS DESDE FIREBASE
        if (fbData) {
          setNombreRutina(fbData.nombre || rutinaNombre);
          setEjercicios(fbData.ejercicios || []);
          setAsignadaPor(fbData.asignadaPor || null);
        }

      } catch (error) {
        console.error("Error al cargar la rutina para ejecución:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRutinaData();
  }, [rutinaId, rutinaNombre]);

  // 2. CRONÓMETRO GLOBAL DE LA RUTINA
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !conflictSession) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, conflictSession]);

  // 3. MOTOR DE GUARDADO AUTOMÁTICO (Auto-Save)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || loading || conflictSession) return;

    const sessionKey = `cv_active_session_${user.uid}`;
    const dataToSave = {
      rutinaId,
      rutinaNombre: nombreRutina,
      elapsedTime,
      ejercicios,
      hasChanges,
      asignadaPor
    };
    
    localStorage.setItem(sessionKey, JSON.stringify(dataToSave));
  }, [elapsedTime, ejercicios, hasChanges, loading, nombreRutina, rutinaId, conflictSession, asignadaPor]);

  // 4. MOTOR DETECTOR DE CAMBIOS PARA EL ENTRENADOR
  const notificarCambiosAlCoach = async () => {
    if (!asignadaPor || !hasChanges) return; 
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      let resumen = [];
      const nombresOriginales = originalEjercicios.map(e => e.nombre || e.nombreEs);
      const nombresNuevos = ejercicios.map(e => e.nombre || e.nombreEs);
      
      const agregados = nombresNuevos.filter(n => !nombresOriginales.includes(n));
      const eliminados = nombresOriginales.filter(n => !nombresNuevos.includes(n));
      
      if (agregados.length > 0) resumen.push(`Añadió: ${agregados.join(", ")}.`);
      if (eliminados.length > 0) resumen.push(`Eliminó: ${eliminados.join(", ")}.`);
      
      if (resumen.length === 0 && hasChanges) {
        resumen.push("Ajustó series, repeticiones, descansos o pesos planificados.");
      }

      const nombreCliente = user.displayName || user.email?.split('@')[0] || "Tu cliente";
      const mensaje = `@${nombreCliente} modificó la rutina en vivo. ${resumen.join(" ")}`;

      await enviarNotificacion(
        asignadaPor, // Destino: UID del coach
        `Rutina Modificada: ${nombreRutina}`,
        mensaje,
        "sistema", // Usamos 'sistema' para un log general
        { rutinaId: rutinaId, clienteId: user.uid }
      );
    } catch (error) {
      console.error("Error al notificar al coach:", error);
    }
  };


  // FUNCIONES DE CONTROL DE SESIÓN
  const handleOverrideConflict = async () => {
    stopTimer(); 
    setConflictSession(null);
    setLoading(true);
    
    const user = auth.currentUser;
    if (user) {
      localStorage.removeItem(`cv_active_session_${user.uid}`);
      try {
        const docRef = doc(db, "users", user.uid, "rutinas", rutinaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombreRutina(data.nombre || rutinaNombre);
          setEjercicios(data.ejercicios || []);
          setAsignadaPor(data.asignadaPor || null); 
        }
      } catch (error) {
        console.error("Error al cargar la nueva rutina:", error);
      }
    }
    setLoading(false);
  };

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
    setHasChanges(true); 
  };

  const handleUpdateEjercicios = (nuevosEjercicios: any[]) => {
    setEjercicios(nuevosEjercicios);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse text-zinc-400">
          Preparando área de entrenamiento...
        </p>
      </div>
    );
  }

  // PANTALLA DE CONFLICTO
  if (conflictSession) {
    return (
      <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest">Entrenamiento Activo</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed px-2">
              Ya tienes la rutina <span className="text-white font-bold">"{conflictSession.rutinaNombre}"</span> en curso. Si inicias una nueva, perderás el progreso de la actual.
            </p>
          </div>
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex flex-col gap-2.5">
            <button 
              onClick={() => iniciarEntrenamiento(conflictSession.rutinaId, conflictSession.rutinaNombre)}
              className="w-full bg-amber-500 text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              <Play className="w-4 h-4" /> Retomar Actual
            </button>
            <button 
              onClick={handleOverrideConflict}
              className="w-full bg-zinc-900 border border-zinc-700 text-rose-500 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-500/10 transition-colors flex justify-center items-center gap-2"
            >
              <X className="w-4 h-4" /> Descartar e Iniciar Nueva
            </button>
          </div>
        </div>
      </div>
    );
  }

  // WIDGET MINIMIZADO
  if (isMinimized) {
    const isResting = totalTime > 0;
    const progress = isResting ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[200] bg-rose-500 text-white rounded-xl shadow-[0_10px_40px_rgba(244,63,94,0.4)] flex flex-col cursor-pointer hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-bottom-5 overflow-hidden"
      >
        <div className="pl-3 pr-4 py-2.5 flex items-center gap-3">
          <div className="bg-black/20 p-1.5 rounded-full">
            <Clock className={`w-4 h-4 ${isResting ? 'animate-pulse text-amber-300' : ''}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/80 leading-none">
              {isResting ? `Descansando: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : 'En curso'}
            </span>
            <span className="text-xs font-black tracking-widest font-mono leading-tight">{formatTime(elapsedTime)}</span>
          </div>
          <Maximize2 className="w-3.5 h-3.5 ml-1 opacity-70" />
        </div>
        {isResting && (
          <div className="w-full h-1 bg-black/30">
            <div className="h-full bg-amber-300 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
    );
  }

  // PANTALLA COMPLETA
  return (
    <>
      <main className="fixed inset-0 z-[200] bg-black text-white overflow-hidden font-sans selection:bg-rose-500/30 flex flex-col">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.15) 0%, transparent 50%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 8px)`
        }}></div>

        <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col h-full">
          
          <div className="flex justify-between items-center p-3 md:p-5 border-b border-white/5 shrink-0 bg-black/50 backdrop-blur-md">
            <button 
              onClick={() => setShowExitModal(true)} 
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group z-10"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block mt-0.5">Salir</span>
            </button>
            
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-0.5">Entrenando</span>
              <span className="text-sm font-black uppercase tracking-widest text-zinc-200 truncate max-w-[250px]">
                {nombreRutina}
              </span>
            </div>
            
            <div className="flex items-center bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-1 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl z-10">
              <div className="flex flex-col items-center justify-center px-3 min-w-[75px] md:min-w-[90px]">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Duración</span>
                <div className={`font-mono text-sm md:text-base font-black tracking-widest leading-none transition-colors ${isActive ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-zinc-500'}`}>
                  {formatTime(elapsedTime)}
                </div>
              </div>
              <div className="w-[1px] h-7 bg-zinc-800"></div>
              <button 
                onClick={() => setIsActive(!isActive)}
                className={`ml-1 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-all active:scale-95 ${isActive ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
              >
                {isActive ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <EjecucionRutinaModule 
              nombre={nombreRutina}
              ejercicios={ejercicios}
              onUpdateEjercicios={handleUpdateEjercicios}
              onOpenAgregarEjercicios={() => setShowAgregarModal(true)}
            />
          </div>

          <div className="mt-auto border-t border-white/10 p-4 md:p-6 bg-black/80 backdrop-blur-md flex flex-col gap-3 shrink-0 animate-in slide-in-from-bottom-5">
            <TerminarRutina 
              hasChanges={hasChanges}
              ejercicios={ejercicios}
              elapsedTime={elapsedTime}
              rutinaNombre={nombreRutina}
              rutinaId={rutinaId}
              asignadaPor={asignadaPor} 
              onExitCompletely={handleDiscardSession}
              onNotifyCoach={notificarCambiosAlCoach}
             />
            <ReportesRutina />
          </div>

        </div>
      </main>

      {/* MODAL PARA AÑADIR EJERCICIOS */}
      {showAgregarModal && (
        <AgregarEjerciciosModule 
          onClose={() => setShowAgregarModal(false)}
          onAddExerciseToSession={handleAddExerciseToSession}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE SALIDA */}
      {showExitModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
                <Maximize2 className="w-4 h-4" /> Minimizar y Continuar
              </button>
              <button 
                onClick={handleDiscardSession}
                className="w-full bg-zinc-900 border border-zinc-700 text-rose-500 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-500/10 transition-colors flex justify-center items-center gap-2"
              >
                <X className="w-4 h-4" /> Descartar Sesión
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