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
  hasChanges?: boolean; 
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
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState("error_sistema");
  const [reportComment, setReportComment] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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
        <p className="text-[10px] font-black uppercase tracking-widest text-white">Sincronizando rutinas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col h-full mt-4 sm:mt-8 animate-in fade-in duration-500 pb-20 px-2 sm:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-10 border-b border-white/10 pb-6 gap-6">
        <div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-6 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest">Volver al Inicio</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-3">
            RUTINAS ASIGNADAS
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-3 max-w-xl leading-relaxed">
            Tus planes de entrenamiento personalizados, diseñados específicamente para ti por tu equipo de coaches profesionales.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 px-5 py-3 rounded-2xl shadow-xl">
          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <Dumbbell className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-zinc-500">Planificadas</span>
            <span className="block text-sm font-black text-white">{rutinasAsignadas.length} Rutinas</span>
          </div>
        </div>
      </div>

      {/* ESTADO VACÍO */}
      {Object.keys(rutinasPorEntrenador).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-24 animate-in zoom-in-95 duration-500 bg-gradient-to-b from-zinc-900/40 to-black border border-white/5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="bg-gradient-to-b from-zinc-800 to-zinc-950 p-6 rounded-full mb-6 border border-zinc-700/50 shadow-2xl relative z-10">
            <Activity className="w-12 h-12 text-zinc-500" />
          </div>
          <h3 className="text-base font-black text-white uppercase tracking-widest mb-3 relative z-10">
            Sin Entrenamientos Activos
          </h3>
          <p className="text-xs text-zinc-400 font-medium max-w-sm leading-relaxed mb-6 relative z-10">
            Tu bandeja está limpia. Cuando tu entrenador te asigne un nuevo plan de entrenamiento, aparecerá organizado aquí.
          </p>
        </div>
      ) : (
        /* RENDERIZADO AGRUPADO POR ENTRENADOR */
        <div className="space-y-16">
          {Object.entries(rutinasPorEntrenador).map(([coachId, rutinasCoach]) => {
            const coach = entrenadoresInfo[coachId] || {};
            const coachName = coach.username || "Entrenador";
            const coachNombres = coach.nombres || "";

            return (
              <div key={coachId} className="animate-in fade-in slide-in-from-bottom-8">
                
                {/* Cabecera del Coach (Premium Style) */}
                <div className="flex items-center gap-4 mb-8 bg-gradient-to-r from-zinc-900/80 to-transparent p-4 rounded-3xl border border-white/5 shadow-lg">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.15)] relative group">
                    <div className="absolute inset-0 bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                    {coach.fotoPerfil ? (
                      <img src={coach.fotoPerfil} alt={coachName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[9px] text-rose-500 font-black uppercase tracking-[0.25em] mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Coach Asignado
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-white tracking-tight">@{coachName}</p>
                      {coachNombres && (
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest px-2 py-1 bg-black/50 rounded-lg border border-white/5 hidden sm:inline-block">
                          {coachNombres}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid de Rutinas de este Coach */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rutinasCoach.map(rutina => (
                    <div 
                      key={rutina.id} 
                      className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 relative group hover:border-white/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(255,255,255,0.08)] flex flex-col justify-between overflow-hidden"
                    >
                      <div className="absolute -top-20 -right-20 w-48 h-48 bg-rose-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-rose-500/10 transition-colors"></div>

                      <div>
                        <div className="flex justify-between items-start mb-5 relative z-10">
                          <div className="flex flex-col gap-2">
                            <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl w-fit">
                              <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-rose-400"></span> Plan Activo
                              </span>
                            </div>
                            {rutina.hasChanges && (
                              <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                  Modificada por ti
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <h4 className="text-xl font-black text-white tracking-tight mb-2 relative z-10 leading-tight">
                          {rutina.nombre}
                        </h4>
                        
                        <div className="flex items-center gap-4 mt-4 relative z-10 bg-black/30 p-3 rounded-2xl border border-white/5 w-fit">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Dumbbell className="w-4 h-4 text-rose-500/70" />
                            <span className="text-[11px] font-black uppercase tracking-widest">{rutina.ejercicios?.length || 0} Ejercicios</span>
                          </div>
                          <div className="w-px h-3 bg-zinc-800"></div>
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Clock className="w-4 h-4 text-zinc-500" />
                            <span className="text-[11px] font-black uppercase tracking-widest">~45 min</span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex gap-3 mt-8 relative z-10">
                        <button 
                          onClick={() => setRutinaViewDetail(rutina)}
                          className="flex-1 bg-zinc-900 text-zinc-300 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> Ver Info
                        </button>
                        <button 
                          onClick={() => iniciarEntrenamiento(rutina.id, rutina.nombre || "Rutina")}
                          className="flex-1 bg-white text-black py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                        >
                          <PlayCircle className="w-4 h-4" /> Entrenar
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

      {/* BOTÓN DE REPORTE DE ERRORES */}
      <div className="mt-20 opacity-50 hover:opacity-100 transition-opacity flex justify-center w-full relative z-10">
        <button 
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 text-[10px] text-zinc-400 font-black uppercase tracking-widest hover:text-white transition-colors bg-white/5 px-5 py-2.5 rounded-full border border-white/10"
        >
          <Bug className="w-4 h-4" /> Reportar Problema
        </button>
      </div>

      {/* MODAL: VER DETALLE RÁPIDO DE LA RUTINA */}
      {rutinaViewDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-lg flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden max-h-[85vh] relative">
            
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-rose-500/10 to-transparent pointer-events-none"></div>

            <div className="p-6 border-b border-zinc-800/80 flex justify-between items-start bg-zinc-900/30 shrink-0 relative z-10">
              <div className="pr-4">
                <span className="text-[9px] text-rose-500 font-black uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> Previsualización
                </span>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight leading-tight">
                  {rutinaViewDetail.nombre}
                </h3>
              </div>
              <button onClick={() => setRutinaViewDetail(null)} className="text-zinc-400 hover:text-white p-2.5 bg-black rounded-full transition-all active:scale-95 shrink-0 border border-zinc-800 hover:border-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 relative z-10 bg-zinc-950/50">
              {rutinaViewDetail.ejercicios && rutinaViewDetail.ejercicios.length > 0 ? (
                rutinaViewDetail.ejercicios.map((ej: any, i: number) => {
                  const imageFailed = failedImages[ej.id || i];

                  return (
                    <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden group flex flex-col relative transition-colors hover:border-zinc-700">
                      
                      <div className="absolute left-0 top-0 w-1 h-full bg-zinc-800 group-hover:bg-rose-500 transition-colors z-10"></div>
                      
                      {/* CABECERA DEL EJERCICIO */}
                      <div className="p-4 bg-black/40 flex items-center gap-4 border-b border-zinc-800/50 pl-5">
                        <div className="relative w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shrink-0 overflow-hidden shadow-inner">
                          {ej.gifUrl && !imageFailed ? (
                            <img 
                              src={ej.gifUrl} 
                              alt={ej.nombre} 
                              onError={() => setFailedImages(prev => ({...prev, [ej.id || i]: true}))}
                              className="w-full h-full object-cover mix-blend-screen opacity-90" 
                            />
                          ) : (
                            <Dumbbell className="w-6 h-6 text-zinc-700" />
                          )}
                          {ej.isCustom && (
                            <div className="absolute top-0 left-0 bg-cyan-500 text-black text-[7px] font-black uppercase px-1.5 py-0.5 rounded-br-lg shadow-sm z-20">
                              Propio
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider leading-tight truncate">
                            {ej.nombreEs || ej.nombre}
                          </h4>
                          <p className="text-[9px] text-rose-400 uppercase font-black tracking-widest mt-1">
                            {ej.musculoEs || ej.musculoObjetivo || "General"}
                          </p>
                        </div>

                        {ej.descansoSegundos > 0 && (
                          <div className="flex flex-col items-center justify-center bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-zinc-500 mb-0.5" />
                            <span className="text-[9px] font-mono font-black text-zinc-300">{ej.descansoSegundos}s</span>
                          </div>
                        )}
                      </div>

                      {/* DETALLES Y SERIES */}
                      <div className="p-4 bg-zinc-900/20 pl-5 space-y-4">
                        
                        {ej.nota && (
                          <div className="flex items-start gap-2.5 bg-zinc-950/80 px-4 py-3 rounded-xl border border-zinc-800/80">
                            <FileText className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                              {ej.nota}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-2 pb-1 border-b border-zinc-800/50 mb-3">
                            <span className="w-6 text-center text-[8px] font-black uppercase tracking-widest text-zinc-600">#</span>
                            <span className="w-16 text-[8px] font-black uppercase tracking-widest text-zinc-600">Tipo</span>
                            <span className="flex-1 text-center text-[8px] font-black uppercase tracking-widest text-zinc-600">Objetivo</span>
                            <span className="w-12 text-right text-[8px] font-black uppercase tracking-widest text-zinc-600">RIR</span>
                          </div>

                          {ej.series?.map((serie: any, sIdx: number) => {
                            const isCalentamiento = serie.tipo === "calentamiento";
                            const isEfectiva = serie.tipo === "efectiva";
                            const isRango = serie.repsTipo === "rango";
                            const repsStr = isRango ? `${serie.minReps}-${serie.maxReps}` : `${serie.reps}`;
                            
                            return (
                              <div key={sIdx} className="flex items-center gap-2 bg-black/40 px-2 py-2.5 rounded-lg border border-white/5 hover:bg-black/60 transition-colors">
                                <div className="w-6 text-center shrink-0 text-[10px] font-mono font-bold text-zinc-500">
                                  {sIdx + 1}
                                </div>
                                <div className={`w-16 px-1.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border text-center ${
                                  isCalentamiento ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                  isEfectiva ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                                  "bg-zinc-800 text-zinc-400 border-zinc-700"
                                }`}>
                                  {isCalentamiento ? "Calent" : isEfectiva ? "Efectiva" : "Aproxim"}
                                </div>
                                <div className="flex-1 text-center">
                                  <span className="text-xs font-mono font-black text-white">
                                    {repsStr} <span className="text-[8px] text-zinc-500 font-sans tracking-widest uppercase">Reps</span>
                                  </span>
                                </div>
                                <div className="w-12 text-right shrink-0">
                                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                                    {serie.rir ? `RIR ${serie.rir}` : '-'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <Dumbbell className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-[11px] text-zinc-500 font-black uppercase tracking-[0.2em]">Rutina sin contenido</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-800 bg-black flex justify-end shrink-0 relative z-10">
              <button 
                onClick={() => {
                  iniciarEntrenamiento(rutinaViewDetail.id, rutinaViewDetail.nombre || "Rutina");
                  setRutinaViewDetail(null);
                }}
                className="w-full bg-white text-black py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" /> Comenzar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE */}
      {showReportModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.05)] relative overflow-hidden">
            
            {reportSuccess ? (
              <div className="p-10 flex flex-col items-center text-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-16 h-16 text-white mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Reporte Enviado</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Gracias por ayudarnos a mejorar el sistema.</p>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/50">
                   <h3 className="text-[11px] font-black text-white tracking-[0.2em] uppercase flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-zinc-400" /> Reportar Bug
                   </h3>
                   <button onClick={() => setShowReportModal(false)} disabled={sendingReport} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-1.5 rounded-full">
                     <X className="w-4 h-4" />
                   </button>
                </div>
                
                <div className="p-6 flex flex-col gap-5">
                   <div className="flex flex-col">
                     <label className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 ml-1">Tipo de Reporte</label>
                     <select 
                       value={reportType}
                       onChange={(e) => setReportType(e.target.value)}
                       disabled={sendingReport}
                       className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all appearance-none"
                     >
                       <option value="error_sistema">Error del Sistema / Crash</option>
                       <option value="interfaz">Problema Visual / Interfaz</option>
                       <option value="sugerencia">Sugerencia de Mejora</option>
                       <option value="otro">Otro</option>
                     </select>
                   </div>
                   
                   <div className="flex flex-col">
                     <label className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 ml-1">Detalles</label>
                     <textarea 
                       value={reportComment}
                       onChange={(e) => setReportComment(e.target.value)}
                       disabled={sendingReport}
                       placeholder="Describe el problema..."
                       className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition-all min-h-[120px] resize-none"
                     />
                   </div>

                   <button 
                     onClick={handleSendReport}
                     disabled={sendingReport || !reportComment.trim()}
                     className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] hover:bg-zinc-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                   >
                     {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                     Enviar
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