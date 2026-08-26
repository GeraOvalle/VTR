"use client";

import { useState, useEffect } from "react";
import { Dumbbell, User, Loader2, PlayCircle, Eye, X, Activity, Clock, ArrowLeft, FileText, AlertTriangle, Bug, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { collection, query, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";

// IMPORTAMOS EL CONTEXTO GLOBAL DE ENTRENAMIENTO
import { useWorkout } from "../../context/workoutcontext";

interface RutinaType {
  id: string;
  nombre?: string;
  asignadaPor?: string;
  ejercicios?: any[];
  hasChanges?: boolean; // 🔴 ESTADO: Detecta si la rutina fue modificada por el usuario
  [key: string]: any;
}

interface RutinasAsignadasProps {
  onBack: () => void;
}

export default function RutinasAsignadasModule({ onBack }: RutinasAsignadasProps) {
  const [loading, setLoading] = useState(true);
  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaType[]>([]);
  const [entrenadoresInfo, setEntrenadoresInfo] = useState<{ [uid: string]: any }>({});
  
  const [rutinaViewDetail, setRutinaViewDetail] = useState<RutinaType | null>(null);
  
  // 🔴 ESTADO PARA CONTROLAR LAS IMÁGENES QUE FALLAN
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});

  // 🔴 ESTADOS PARA EL REPORTE DE ERRORES
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState("error_sistema");
  const [reportComment, setReportComment] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // EXTRAEMOS LA FUNCIÓN DE INICIAR ENTRENAMIENTO
  const { iniciarEntrenamiento } = useWorkout();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qRutinas = query(collection(db, "users", user.uid, "rutinas"));
    
    const unsub = onSnapshot(qRutinas, async (snapshot) => {
      const todasLasRutinas = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as RutinaType[];
      
      const asignadas = todasLasRutinas.filter(r => r.asignadaPor);
      setRutinasAsignadas(asignadas);

      const uidsEntrenadores = Array.from(new Set(asignadas.map(r => r.asignadaPor).filter(Boolean))) as string[];

      const infoTemp: { [uid: string]: any } = {};
      for (const uid of uidsEntrenadores) {
        try {
          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            infoTemp[uid] = docSnap.data();
          }
        } catch (error) {
          console.error("Error obteniendo perfil del coach:", error);
        }
      }
      
      setEntrenadoresInfo(prev => ({ ...prev, ...infoTemp }));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const rutinasPorEntrenador = rutinasAsignadas.reduce((acc: Record<string, RutinaType[]>, rutina: RutinaType) => {
    const coachId = rutina.asignadaPor;
    if (!coachId) return acc;
    
    if (!acc[coachId]) acc[coachId] = [];
    acc[coachId].push(rutina);
    return acc;
  }, {});

  // 🔴 FUNCIÓN PARA ENVIAR REPORTE
  const handleSendReport = async () => {
    if (!reportComment.trim()) return;
    setSendingReport(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "reportes_app"), {
        uid: user?.uid || "desconocido",
        modulo: "Rutinas Asignadas",
        tipo: reportType,
        comentario: reportComment.trim(),
        fechaRegistro: serverTimestamp(),
        estado: "pendiente",
      });
      
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportComment("");
        setReportType("error_sistema");
      }, 2000);
    } catch (error) {
      console.error("Error al enviar reporte:", error);
      alert("SISTEMA: Ocurrió un error al enviar. Intenta de nuevo.");
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-50">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white">Cargando tus rutinas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col h-full mt-4 sm:mt-8 animate-in fade-in duration-300 pb-20">
      
      {/* HEADER CON BOTÓN DE VOLVER */}
      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
        <div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Volver al Inicio</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] flex items-center gap-3">
            RUTINAS ASIGNADAS
          </h1>
          <p className="text-[11px] text-zinc-400 font-medium mt-2">
            Entrenamientos planificados especialmente para ti por tu equipo de coaches.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl mt-8">
          <Dumbbell className="w-4 h-4 text-white" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            {rutinasAsignadas.length} Total
          </span>
        </div>
      </div>

      {/* ESTADO VACÍO */}
      {Object.keys(rutinasPorEntrenador).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 py-20 animate-in zoom-in-95 duration-500 bg-zinc-900/30 border border-white/5 rounded-3xl">
          <div className="bg-zinc-900/80 p-6 rounded-full mb-6 border border-zinc-800 ring-1 ring-white/5 shadow-2xl">
            <Activity className="w-12 h-12 text-zinc-600" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">
            Sin Entrenamientos Asignados
          </h3>
          <p className="text-[11px] text-zinc-400 font-medium max-w-sm leading-relaxed mb-6">
            Aún no tienes rutinas enviadas por un entrenador. Cuando tu coach te envíe un plan, aparecerá organizado aquí.
          </p>
        </div>
      ) : (
        /* RENDERIZADO AGRUPADO POR ENTRENADOR */
        <div className="space-y-12">
          {Object.entries(rutinasPorEntrenador).map(([coachId, rutinasCoach]) => {
            const coach = entrenadoresInfo[coachId] || {};
            const coachName = coach.username || "Entrenador";
            const coachNombres = coach.nombres || "";

            return (
              <div key={coachId} className="animate-in fade-in slide-in-from-bottom-5">
                
                {/* Cabecera del Coach */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-rose-500/40 bg-black flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    {coach.fotoPerfil ? (
                      <img src={coach.fotoPerfil} alt={coachName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] mb-0.5">
                      Asignado por
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black text-white drop-shadow-md">@{coachName}</p>
                      {coachNombres && (
                        <span className="text-[10px] text-zinc-500 font-medium px-2 py-0.5 bg-zinc-900 rounded-md border border-zinc-800 hidden sm:inline-block">
                          {coachNombres}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid de Rutinas de este Coach */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rutinasCoach.map(rutina => (
                    <div 
                      key={rutina.id} 
                      className="bg-zinc-950/85 backdrop-blur-md border border-white/10 rounded-3xl p-5 relative group hover:border-white/40 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] flex flex-col justify-between overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      <div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="flex gap-2">
                            <div className="bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                              <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">
                                Rutina Activa
                              </span>
                            </div>
                            {/* 🔴 BADGE DE MODIFICADA */}
                            {rutina.hasChanges && (
                              <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                                  Modificada
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <h4 className="text-base font-black text-white truncate mb-1 relative z-10">
                          {rutina.nombre}
                        </h4>
                        
                        <div className="flex items-center gap-3 mt-3 relative z-10">
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Dumbbell className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{rutina.ejercicios?.length || 0} Ejerc.</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">~45 min</span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex gap-2 mt-6 relative z-10">
                        <button 
                          onClick={() => setRutinaViewDetail(rutina)}
                          className="flex-1 bg-zinc-900 text-zinc-300 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-colors border border-white/5 flex items-center justify-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Info
                        </button>
                        <button 
                          onClick={() => iniciarEntrenamiento(rutina.id, rutina.nombre || "Rutina")}
                          className="flex-1 bg-white text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Entrenar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
              </div>
            );
          })}
        </div>
      )}

      {/* 🔴 BOTÓN DE REPORTE DE ERRORES AL FINAL */}
      <div className="mt-16 opacity-50 hover:opacity-100 transition-opacity flex justify-center w-full">
        <button 
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 text-[9px] text-zinc-400 font-bold uppercase tracking-[0.2em] hover:text-white transition-colors"
        >
          <Bug className="w-3 h-3" /> Reportar Problema o Bug
        </button>
      </div>

      {/* MODAL: VER DETALLE RÁPIDO DE LA RUTINA LEYENDO LA ESTRUCTURA COMPLETA */}
      {rutinaViewDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-md flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.1)] overflow-hidden max-h-[85vh]">
            
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
              <div>
                <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest mb-1 block">
                  Vista Previa
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 truncate pr-4">
                  {rutinaViewDetail.nombre}
                </h3>
              </div>
              <button onClick={() => setRutinaViewDetail(null)} className="text-zinc-400 hover:text-white p-2 bg-black rounded-full transition-colors shrink-0 border border-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CONTENEDOR DE EJERCICIOS */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              {rutinaViewDetail.ejercicios && rutinaViewDetail.ejercicios.length > 0 ? (
                rutinaViewDetail.ejercicios.map((ej: any, i: number) => {
                  const imageFailed = failedImages[ej.id || i];

                  return (
                    <div key={i} className="bg-black border border-white/5 rounded-2xl overflow-hidden group flex flex-col relative">
                      
                      {/* Borde izquierdo decorativo */}
                      <div className="absolute left-0 top-0 w-1 h-full bg-zinc-800 group-hover:bg-rose-500 transition-colors z-10"></div>
                      
                      {/* CABECERA DEL EJERCICIO */}
                      <div className="p-3 sm:p-4 bg-zinc-900/40 flex items-center gap-3 border-b border-zinc-800/50 pl-4 relative">
                        {/* 🔴 CONTROL DE FALLO DE IMAGEN Y BADGE PROPIO */}
                        <div className="relative w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0 overflow-hidden">
                          {ej.gifUrl && !imageFailed ? (
                            <img 
                              src={ej.gifUrl} 
                              alt={ej.nombre} 
                              onError={() => setFailedImages(prev => ({...prev, [ej.id || i]: true}))}
                              className="w-full h-full object-cover bg-black" 
                            />
                          ) : (
                            <Dumbbell className="w-5 h-5 text-zinc-600" />
                          )}
                          {/* 🔴 BADGE DE EJERCICIO PROPIO */}
                          {ej.isCustom && (
                            <div className="absolute top-0 left-0 bg-cyan-500/90 text-white text-[7px] font-black uppercase px-1 rounded-br shadow-sm z-20">
                              Propio
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider leading-tight">
                            {ej.nombreEs || ej.nombre}
                          </h4>
                          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">
                            {ej.musculoEs || ej.musculoObjetivo}
                          </p>
                        </div>

                        {ej.descansoSegundos > 0 && (
                          <div className="flex flex-col items-center justify-center bg-black px-2 py-1 rounded-md border border-zinc-800 shrink-0">
                            <Clock className="w-3 h-3 text-zinc-400 mb-0.5" />
                            <span className="text-[8px] font-mono font-bold text-zinc-300">{ej.descansoSegundos}s</span>
                          </div>
                        )}
                      </div>

                      {/* DETALLES Y SERIES */}
                      <div className="p-3 sm:p-4 bg-black/40 pl-4 space-y-3">
                        
                        {ej.nota && (
                          <div className="flex items-start gap-2 bg-rose-500/5 px-3 py-2 rounded-lg border border-rose-500/10">
                            <FileText className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-rose-200/90 leading-relaxed font-medium">
                              {ej.nota}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {ej.series?.map((serie: any, sIdx: number) => {
                            const isCalentamiento = serie.tipo === "calentamiento";
                            const isEfectiva = serie.tipo === "efectiva";
                            const isRango = serie.repsTipo === "rango";
                            const repsStr = isRango ? `${serie.minReps}-${serie.maxReps}` : `${serie.reps}`;
                            
                            return (
                              <div key={sIdx} className="flex items-center gap-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/50">
                                <div className="w-5 text-center shrink-0 text-[10px] font-black text-zinc-600">
                                  {sIdx + 1}
                                </div>
                                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                  isCalentamiento ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                  isEfectiva ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                                  "bg-zinc-800 text-zinc-400 border-zinc-700"
                                }`}>
                                  {isCalentamiento ? "🔥 Calent" : isEfectiva ? "⚡ Efect" : "💧 Aproxim"}
                                </div>
                                <div className="flex-1 text-center">
                                  <span className="text-[11px] font-mono font-bold text-white">
                                    {repsStr} <span className="text-[8px] text-zinc-500 font-sans tracking-widest">REPS</span>
                                  </span>
                                </div>
                                {serie.rir && (
                                  <div className="w-12 text-right shrink-0">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                      RIR {serie.rir}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Dumbbell className="w-8 h-8 text-zinc-600 mb-2" />
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Rutina Vacía</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end shrink-0">
              <button 
                onClick={() => {
                  iniciarEntrenamiento(rutinaViewDetail.id, rutinaViewDetail.nombre || "Rutina");
                  setRutinaViewDetail(null);
                }}
                className="w-full bg-white text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" /> Iniciar Entrenamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE REPORTE */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.1)] relative overflow-hidden">
            
            {reportSuccess ? (
              <div className="p-10 flex flex-col items-center text-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-16 h-16 text-white mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Reporte Enviado</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Gracias por ayudarnos a mejorar el sistema.</p>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                   <h3 className="text-[11px] font-black text-white tracking-[0.2em] uppercase flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-rose-500" /> Nuevo Reporte
                   </h3>
                   <button onClick={() => setShowReportModal(false)} disabled={sendingReport} className="text-zinc-400 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="p-6 flex flex-col gap-5">
                   <div className="flex flex-col">
                     <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-2 ml-1">Tipo de Reporte</label>
                     <select 
                       value={reportType}
                       onChange={(e) => setReportType(e.target.value)}
                       disabled={sendingReport}
                       className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all"
                     >
                       <option value="error_sistema" className="bg-zinc-900">Error del Sistema / Crash</option>
                       <option value="interfaz" className="bg-zinc-900">Problema Visual / Interfaz</option>
                       <option value="sugerencia" className="bg-zinc-900">Sugerencia de Mejora</option>
                       <option value="otro" className="bg-zinc-900">Otro</option>
                     </select>
                   </div>
                   
                   <div className="flex flex-col">
                     <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-2 ml-1">Comentarios</label>
                     <textarea 
                       value={reportComment}
                       onChange={(e) => setReportComment(e.target.value)}
                       disabled={sendingReport}
                       placeholder="Describe el problema o sugerencia con el mayor detalle posible..."
                       className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all min-h-[120px] resize-none"
                     />
                   </div>

                   <button 
                     onClick={handleSendReport}
                     disabled={sendingReport || !reportComment.trim()}
                     className="w-full bg-white text-black py-3.5 rounded-lg font-black uppercase tracking-[0.15em] text-xs hover:bg-zinc-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:scale-100"
                   >
                     {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                     Enviar Reporte
                   </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}