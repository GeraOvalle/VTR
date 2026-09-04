"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, History, Calendar, Clock, Dumbbell, ChevronDown, ChevronUp, Loader2, Activity } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface HistorialSesionesProps {
  onBack: () => void;
}

const CACHE_KEY = "cv_historial_rutinas_v4";

export default function HistorialSesiones({ onBack }: HistorialSesionesProps) {
  const [loading, setLoading] = useState(true);
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSesiones = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setSesiones(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      try {
        const sesionesRef = collection(db, "users", user.uid, "rutinascompletadas");
        const querySnapshot = await getDocs(sesionesRef);

        const data = querySnapshot.docs.map(doc => {
          const docData = doc.data();
          
          // 🔴 1. REPARACIÓN DEL TIMESTAMP: Convertimos el objeto de Firebase a un texto legible
          let fechaString = "Sin fecha";
          if (docData.fecha && typeof docData.fecha.toDate === 'function') {
            // Si es un Timestamp de Firebase, lo convertimos a formato local (Ej: "30 ago 2026")
            fechaString = docData.fecha.toDate().toLocaleDateString('es-ES', {
              day: 'numeric', month: 'short', year: 'numeric'
            });
          } else if (typeof docData.fecha === 'string') {
            fechaString = docData.fecha; // Si ya era string, lo dejamos tal cual
          }

          // 🔴 2. REPARACIÓN PARA EL ORDENAMIENTO: Sacamos un número entero de milisegundos
          let msTimestamp = 0;
          if (docData.fecha && typeof docData.fecha.toDate === 'function') {
            msTimestamp = docData.fecha.toDate().getTime();
          } else if (docData.timestamp && typeof docData.timestamp === 'number') {
            msTimestamp = docData.timestamp;
          }

          return {
            id: doc.id,
            ...docData,
            fecha: fechaString, // Sobrescribimos el objeto con el string limpio
            timestamp: msTimestamp, // Sobrescribimos para ordenamiento matemático
            duracionCalculada: docData.duracionSegundos ? Math.floor(docData.duracionSegundos / 60) : null
          };
        });

        // 🔴 Ordenamos en memoria del más reciente al más antiguo basado en los milisegundos
        data.sort((a, b) => b.timestamp - a.timestamp);

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        setSesiones(data);
      } catch (error) {
        console.error("Error cargando historial de rutinas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSesiones();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <main className="min-h-screen bg-black text-white p-3 sm:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30 pb-24 sm:pb-32">
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>

      <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col">
        
        <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-white/10 pb-3 sm:pb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Volver al Perfil</span>
          </button>
          <h1 className="text-lg sm:text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            HISTORIAL DE SESIONES
          </h1>
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] animate-pulse">Cargando bitácora...</p>
          </div>
        ) : sesiones.length === 0 ? (
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[300px] shadow-[0_0_30px_-10px_rgba(255,255,255,0.05)]">
            <div className="bg-cyan-500/10 p-4 rounded-full mb-4 border border-cyan-500/20">
              <History className="w-8 h-8 text-cyan-500 opacity-50" />
            </div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white mb-2">Bitácora Vacía</h2>
            <p className="text-[10px] sm:text-xs text-zinc-400 max-w-sm leading-relaxed font-medium">
              Aún no has registrado ningún entrenamiento. Tus sesiones completadas aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-500">
            {sesiones.map((sesion) => {
              const isExpanded = expandedId === sesion.id;
              
              return (
                <div key={sesion.id} className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_20px_-10px_rgba(0,0,0,0.5)] transition-all">
                  
                  {/* CABECERA */}
                  <button 
                    onClick={() => toggleExpand(sesion.id)}
                    className="w-full p-3.5 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 sm:p-2.5 rounded-lg shrink-0">
                        <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                      </div>
                      <div>
                        <h3 className="text-[11px] sm:text-sm font-black text-white uppercase tracking-widest mb-0.5 sm:mb-1 line-clamp-1">
                          {sesion.nombre || sesion.nombreEs || "Entrenamiento"}
                        </h3>
                        <div className="flex items-center gap-3 text-[9px] sm:text-[10px] text-zinc-400 font-medium capitalize">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {sesion.fecha}</span>
                          {sesion.duracionCalculada && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {sesion.duracionCalculada} min</span>}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />}
                    </div>
                  </button>

                  {/* CUERPO EXPANDIDO */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800/80 bg-black/40 p-3.5 sm:p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                      
                      {sesion.nota && (
                        <div className="mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                          <p className="text-[9px] sm:text-[10px] text-zinc-300 italic">"{sesion.nota}"</p>
                        </div>
                      )}

                      {sesion.ejercicios && sesion.ejercicios.length > 0 ? (
                        <div className="space-y-4 sm:space-y-5">
                          {sesion.ejercicios.map((ejercicio: any, idx: number) => (
                            <div key={idx} className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 overflow-hidden">
                              <div className="bg-zinc-900/80 p-2.5 sm:p-3 border-b border-zinc-800/50 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-cyan-500/20 text-cyan-400 text-[8px] sm:text-[9px] font-black w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-sm">
                                    {idx + 1}
                                  </span>
                                  <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-200">
                                    {ejercicio.nombreEs || ejercicio.nombre || "Ejercicio"}
                                  </h4>
                                </div>
                                {ejercicio.nota && <span className="text-[9px] text-zinc-500 ml-6 italic">"{ejercicio.nota}"</span>}
                              </div>
                              
                              <div className="p-2 sm:p-3">
                                {ejercicio.series && ejercicio.series.length > 0 ? (
                                  <>
                                    <div className="grid grid-cols-4 gap-2 mb-1.5 sm:mb-2 px-1">
                                      <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">Set</span>
                                      <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">Reps</span>
                                      <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">Peso</span>
                                      <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-center">RIR/Desc</span>
                                    </div>
                                    
                                    {ejercicio.series.map((serie: any, sIdx: number) => (
                                      <div key={sIdx} className="grid grid-cols-4 gap-2 py-1.5 sm:py-2 border-t border-white/5 px-1 items-center hover:bg-white/[0.02] transition-colors rounded-md">
                                        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 text-center">{sIdx + 1}</span>
                                        <span className="text-[10px] sm:text-[11px] font-black text-white text-center">{serie.reps || "-"}</span>
                                        <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 text-center">{serie.peso ? `${serie.peso}kg` : "-"}</span>
                                        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 text-center">{serie.rir ? `RIR${serie.rir}` : (ejercicio.descansoSegundos ? `${ejercicio.descansoSegundos}s` : "-")}</span>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div className="text-[9px] sm:text-[10px] text-zinc-500 text-center uppercase tracking-widest">Sin series registradas</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Activity className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
                          <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest">Sin detalle de ejercicios</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}