"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, TrendingUp, CheckCircle2, Save, HardDrive, Dumbbell, Code2, Loader2, FileText, List, ChevronDown, MessageSquareText, AlertTriangle, WifiOff } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { doc, getDoc, collection, writeBatch, serverTimestamp } from "firebase/firestore";

interface GuardarRutinaProps {
  isOpen: boolean;
  onClose: () => void;
  ejercicios: any[];
  elapsedTime: number; 
  rutinaNombre: string;
  rutinaId: string;
  asignadaPor?: string | null; // 🔴 AÑADIDO: Recibe la firma del entrenador
  onSaveComplete: () => void;
}

// CLASE CUSTOM PARA SCROLLBARS ESTÉTICOS
const customScrollbar = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50 [&::-webkit-scrollbar-thumb]:rounded-full";

export default function GuardarRutina({ isOpen, onClose, ejercicios, elapsedTime, rutinaNombre, rutinaId, asignadaPor, onSaveComplete }: GuardarRutinaProps) {
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customError, setCustomError] = useState<{ text: string, type: 'error' | 'offline' } | null>(null);
  
  // Autenticación y Rol
  const [rol, setRol] = useState<string>("clasico");

  // Vistas Admin
  const [showAdminView, setShowAdminView] = useState(false);
  const [adminTab, setAdminTab] = useState<'json' | 'historial' | 'ejercicios'>('json');
  
  // Estados de tiempo editable
  const [horas, setHoras] = useState(0);
  const [minutos, setMinutos] = useState(0);
  const [segundos, setSegundos] = useState(0);

  // Estados para los pop-ups de listas deslizables de tiempo
  const [activeTimePicker, setActiveTimePicker] = useState<'horas' | 'minutos' | 'segundos' | null>(null);

  // Estados de métricas calculadas
  const [seriesCompletadas, setSeriesCompletadas] = useState(0);
  const [seriesTotales, setSeriesTotales] = useState(0);
  const [volumenTotalKg, setVolumenTotalKg] = useState(0);
  const [isLbsView, setIsLbsView] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const d = await getDoc(doc(db, "users", user.uid));
        if (d.exists()) setRol(d.data().rol || "clasico");
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHoras(Math.floor(elapsedTime / 3600));
      setMinutos(Math.floor((elapsedTime % 3600) / 60));
      setSegundos(elapsedTime % 60);

      let totalS = 0; let compS = 0; let volKg = 0;
      ejercicios.forEach(ej => {
        const esLbs = ej.equipo === "lbs" || ej.unidad === "lbs"; 
        ej.series?.forEach((serie: any) => {
          totalS++;
          if (serie.completado) {
            compS++;
            const peso = parseFloat(serie.pesoReal) || 0;
            const reps = parseInt(serie.repsReal) || 0;
            const pesoEnKg = esLbs ? (peso * 0.453592) : peso;
            volKg += (pesoEnKg * reps);
          }
        });
      });

      setSeriesTotales(totalS);
      setSeriesCompletadas(compS);
      setVolumenTotalKg(volKg);
    }
  }, [isOpen, elapsedTime, ejercicios]);

  if (!isOpen || !mounted) return null;

  const volumenVisual = isLbsView ? (volumenTotalKg * 2.20462) : volumenTotalKg;
  const unidadTexto = isLbsView ? "LBS" : "KG";
  const tiempoFinalSegundos = (horas * 3600) + (minutos * 60) + segundos;

  // =====================================================================
  // 1. PREPARACIÓN DE DATOS PARA INYECCIÓN
  // =====================================================================

  const payloadHistorialGeneral = {
    rutinaIdOriginal: rutinaId,
    nombre: rutinaNombre,
    duracionSegundos: tiempoFinalSegundos,
    volumenTotalKg: volumenTotalKg,
    seriesCompletadas: seriesCompletadas,
    ejercicios: ejercicios,
    asignadaPor: asignadaPor || null // 🔴 Inyectamos la firma del coach
  };

  const payloadsPesosRegistro = ejercicios.filter(ej => ej.series?.some((s:any) => s.completado)).map(ej => {
    const seriesHechas = ej.series.filter((s:any) => s.completado);
    return {
      rutinaCompletadaId: "SE_GENERARA_AL_GUARDAR", 
      ejercicioId: ej.id,
      ejercicioNombre: ej.nombreEs || ej.nombre,
      series: seriesHechas,
      asignadaPor: asignadaPor || null // 🔴 Inyectamos la firma del coach en cada ejercicio
    };
  });

  const payloadPlantillaLimpia = ejercicios.map(ej => ({
    ...ej,
    series: ej.series?.map((serie:any) => ({
      tipo: serie.tipo || "normal",
      repsTipo: serie.repsTipo || "rango",
      minReps: serie.minReps || null,
      maxReps: serie.maxReps || null,
      reps: serie.reps || null,
      rir: serie.rir || ""
    })) || []
  }));

  // =====================================================================
  // 2. MOTOR DE GUARDADO (CON MODO OFFLINE / CACHÉ)
  // =====================================================================
  const handleSave = async (actualizarPlantilla: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSaving(true);
    setCustomError(null); 

    try {
      if (!navigator.onLine) {
        throw new Error("offline");
      }

      const batch = writeBatch(db);

      // A) GUARDAR EN HISTORIAL (rutinascompletadas)
      const rutinasCompletadasRef = collection(db, "users", user.uid, "rutinascompletadas");
      const nuevoHistorialDoc = doc(rutinasCompletadasRef);
      batch.set(nuevoHistorialDoc, {
        ...payloadHistorialGeneral,
        fecha: serverTimestamp() 
      });

      // B) GUARDAR EN REGISTRO DE PESOS (Analíticas por ejercicio)
      payloadsPesosRegistro.forEach(payloadEj => {
        const registroRef = doc(collection(db, "users", user.uid, "pesosregistro"));
        batch.set(registroRef, {
          ...payloadEj,
          rutinaCompletadaId: nuevoHistorialDoc.id, 
          fecha: serverTimestamp()
        });
      });

      // C) ACTUALIZAR PLANTILLA MAESTRA (Si lo pide el usuario)
      if (actualizarPlantilla) {
        const plantillaRef = doc(db, "users", user.uid, "rutinas", rutinaId);
        batch.update(plantillaRef, {
          ejercicios: payloadPlantillaLimpia,
          hasChanges: false // Reseteamos la alerta de "Modificada" si guarda los cambios oficiales
        });
      } else {
        // Si solo guardó historial y la rutina es asignada, mantenemos la bandera hasChanges=true
        if (asignadaPor) {
          const plantillaRef = doc(db, "users", user.uid, "rutinas", rutinaId);
          batch.update(plantillaRef, {
            hasChanges: true
          });
        }
      }

      // 🔴 D) REGISTRO GLOBAL DE PROGRESO (Para que el coach lo cuente)
      if (asignadaPor) {
        const progressRef = doc(collection(db, "progress"));
        batch.set(progressRef, {
          userId: user.uid,
          asignadaPor: asignadaPor,
          rutinaCompletadaId: nuevoHistorialDoc.id,
          fecha: serverTimestamp()
        });
      }

      await batch.commit();
      
      // Limpiamos la caché de la sesión activa
      localStorage.removeItem(`cv_active_session_${user.uid}`);
      onSaveComplete(); 
      
    } catch (error: any) {
      console.error("Error guardando:", error);
      
      // MODO OFFLINE CACHÉ: Si no hay red o el servidor falló
      const isOfflineError = error.message === "offline" || error.code === 'unavailable' || !navigator.onLine;
      
      // Guardamos todo el paquete en una cola de pendientes
      const pendingData = {
        rutinaId,
        actualizarPlantilla,
        payloadHistorialGeneral,
        payloadsPesosRegistro,
        payloadPlantillaLimpia,
        asignadaPor, // 🔴 Guardamos para inyectar en progress al sincronizar
        timestamp: new Date().toISOString()
      };

      const syncKey = `cv_pending_sync_${user.uid}`;
      const existingSyncs = JSON.parse(localStorage.getItem(syncKey) || '[]');
      existingSyncs.push(pendingData);
      localStorage.setItem(syncKey, JSON.stringify(existingSyncs));

      localStorage.removeItem(`cv_active_session_${user.uid}`);

      if (isOfflineError) {
        setCustomError({ text: "Sin Internet. Guardado en memoria. Se sincronizará automáticamente.", type: "offline" });
      } else {
        setCustomError({ text: "Error en los servidores. Guardado localmente por seguridad.", type: "error" });
      }

      setTimeout(() => {
        setCustomError(null);
        onSaveComplete();
      }, 3500);

    } finally {
      setIsSaving(false);
    }
  };

  const generarOpciones = (max: number) => Array.from({ length: max + 1 }, (_, i) => i);

  // =====================================================================
  // 3. VISTA TERMINAL (MODO ADMIN MULTI-PESTAÑA) - SIN CAMBIOS
  // =====================================================================
  if (showAdminView) {
    return createPortal(
      <div className="fixed inset-0 z-[500] bg-black/95 p-4 flex flex-col overflow-hidden animate-in fade-in duration-200">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-500" />
            <h2 className="text-sm font-black text-cyan-500 uppercase tracking-widest">Dashboard de Pruebas</h2>
          </div>
          <button onClick={() => setShowAdminView(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-2 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex gap-2 bg-zinc-900 p-1.5 rounded-xl mb-4 shrink-0 overflow-x-auto ${customScrollbar}`}>
          <button onClick={() => setAdminTab('json')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'json' ? 'bg-cyan-500/20 text-cyan-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
            <Code2 className="w-3.5 h-3.5" /> JSON Raw
          </button>
          <button onClick={() => setAdminTab('historial')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'historial' ? 'bg-rose-500/20 text-rose-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
            <FileText className="w-3.5 h-3.5" /> Vista Historial
          </button>
          <button onClick={() => setAdminTab('ejercicios')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'ejercicios' ? 'bg-emerald-500/20 text-emerald-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
            <List className="w-3.5 h-3.5" /> Vista Ejercicios
          </button>
        </div>
        
        <div className={`flex-1 overflow-y-auto space-y-4 pr-2 pb-10 ${customScrollbar}`}>
          {adminTab === 'json' && (
            <>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold text-rose-500 mb-2 uppercase tracking-widest">Colección: rutinascompletadas</h3>
                <pre className="text-[9px] text-zinc-400 font-mono whitespace-pre-wrap">{JSON.stringify(payloadHistorialGeneral, null, 2)}</pre>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold text-emerald-500 mb-2 uppercase tracking-widest">Colección: pesosregistro</h3>
                <pre className="text-[9px] text-zinc-400 font-mono whitespace-pre-wrap">{JSON.stringify(payloadsPesosRegistro, null, 2)}</pre>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold text-amber-500 mb-2 uppercase tracking-widest">Colección: rutinas (Actualización Molde)</h3>
                <pre className="text-[9px] text-zinc-400 font-mono whitespace-pre-wrap">{JSON.stringify(payloadPlantillaLimpia, null, 2)}</pre>
              </div>
            </>
          )}

          {adminTab === 'historial' && (
            <div className="max-w-xl mx-auto w-full">
              <h3 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-4 text-center">Así se verá tu sesión completa en "Historial"</h3>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-base">{payloadHistorialGeneral.nombre}</h4>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Hace un momento</span>
                  </div>
                  <div className="bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold text-xs">{Math.floor(payloadHistorialGeneral.duracionSegundos / 60)}m {payloadHistorialGeneral.duracionSegundos % 60}s</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                    <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Volumen Movido</span>
                    <span className="text-white font-black text-xl">{payloadHistorialGeneral.volumenTotalKg} kg</span>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                    <span className="block text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Series Ejecutadas</span>
                    <span className="text-white font-black text-xl">{payloadHistorialGeneral.seriesCompletadas}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] text-rose-500 uppercase font-black tracking-widest mb-2 block border-b border-rose-500/20 pb-1">Desglose de Ejercicios</span>
                  {payloadHistorialGeneral.ejercicios.map((ej: any, idx: number) => {
                    const seriesHechas = ej.series?.filter((s:any) => s.completado) || [];
                    if (seriesHechas.length === 0) return null;

                    return (
                      <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-white text-sm truncate flex-1 pr-2 uppercase">{ej.nombreEs || ej.nombre}</span>
                          <span className="text-[10px] text-zinc-500 font-bold bg-zinc-900 px-2 py-1 rounded">{seriesHechas.length} Sets</span>
                        </div>
                        
                        {ej.notaEjecucion && (
                          <div className="bg-zinc-900/50 p-2 rounded-lg mb-3 flex items-start gap-2 border border-zinc-800/50">
                            <MessageSquareText className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-zinc-300 leading-tight italic">{ej.notaEjecucion}</p>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {seriesHechas.map((s:any, sIdx:number) => (
                            <div key={sIdx} className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-zinc-800/30">
                              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                                <span className="font-bold">Set {sIdx + 1}</span>
                                <span className="text-[8px] uppercase bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{s.tipo || 'N'}</span>
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-white font-black text-[11px]">{s.pesoReal} kg × {s.repsReal}</span>
                                {(s.rir || s.descansoExtra > 0) && (
                                  <div className="flex items-center gap-1 text-[9px] font-bold border-l border-zinc-700 pl-3">
                                    {s.rir && <span className="text-zinc-500">RPE {s.rir}</span>}
                                    {s.descansoExtra > 0 && <span className="text-amber-500">+{s.descansoExtra}s</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'ejercicios' && (
            <div className="max-w-xl mx-auto w-full">
              <h3 className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-4 text-center">Así se verán en las gráficas individuales</h3>
              <div className="space-y-4">
                {payloadsPesosRegistro.length === 0 ? (
                  <p className="text-zinc-500 text-center text-xs p-10 border border-dashed border-zinc-800 rounded-xl">No marcaste ninguna serie completada.</p>
                ) : (
                  payloadsPesosRegistro.map((ej, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-rose-500 font-black uppercase tracking-widest text-sm truncate max-w-[200px]">{ej.ejercicioNombre}</h4>
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest bg-zinc-950 px-2 py-1 rounded">Log Analítico</span>
                      </div>
                      <div className="bg-black/40 rounded-xl overflow-hidden border border-zinc-800/50">
                        <div className="grid grid-cols-6 gap-2 bg-zinc-950 p-2 border-b border-zinc-800/50">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">Set</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">Tipo</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">Peso</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">Reps</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">RPE</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">+Desc</span>
                        </div>
                        <div className="divide-y divide-zinc-800/50">
                          {ej.series.map((s:any, sIdx:number) => (
                            <div key={sIdx} className="grid grid-cols-6 gap-2 p-3 items-center">
                              <span className="text-[11px] text-zinc-400 font-bold text-center">{sIdx + 1}</span>
                              <div className="flex justify-center"><span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-zinc-800 rounded">{s.tipo || 'N'}</span></div>
                              <span className="text-[12px] text-white font-mono font-black text-center">{s.pesoReal || 0}</span>
                              <span className="text-[12px] text-white font-mono font-black text-center">{s.repsReal || 0}</span>
                              <span className="text-[11px] text-zinc-500 font-bold text-center">{s.rir || '-'}</span>
                              <span className="text-[11px] text-amber-500 font-bold text-center">{s.descansoExtra ? `+${s.descansoExtra}` : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>,
      document.body
    );
  }

  // =====================================================================
  // 4. VISTA NORMAL DEL USUARIO
  // =====================================================================
  const modalContent = (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* 🔴 ALERTA FLOTANTE CUSTOM DE OFFLINE/ERROR */}
      {customError && (
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-widest z-[600] flex items-center gap-3 animate-in slide-in-from-top-10 shadow-2xl ${
          customError.type === 'offline' ? 'bg-amber-500 text-black shadow-[0_0_40px_rgba(245,158,11,0.5)]' : 'bg-rose-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.5)]'
        }`}>
          {customError.type === 'offline' ? <WifiOff className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {customError.text}
          <button onClick={() => setCustomError(null)} className="ml-2 hover:scale-110 active:scale-95 transition-transform"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* MODAL MÁS GRANDE (max-w-xl) */}
      <div className="bg-zinc-950 border border-rose-500/30 rounded-3xl w-full max-w-xl flex flex-col shadow-[0_0_80px_rgba(244,63,94,0.15)] overflow-hidden">
        
        <div className="p-6 border-b border-zinc-800/80 flex justify-between items-center bg-rose-500/5 relative">
          
          {rol === "admin" && (
            <button 
              onClick={() => setShowAdminView(true)}
              className="absolute top-2 right-2 text-[8px] font-bold tracking-widest bg-cyan-500/10 text-cyan-500 px-2 py-1 rounded border border-cyan-500/30 hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-1 z-10"
            >
              <Code2 className="w-3 h-3" /> VER DATOS
            </button>
          )}

          <div className="flex items-center gap-4 mt-2">
            <div className="bg-rose-500/20 p-2.5 rounded-full ring-2 ring-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <CheckCircle2 className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-400 uppercase tracking-widest">Resumen Final</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1 truncate max-w-[250px] md:max-w-[350px]">{rutinaNombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2.5 bg-zinc-900 border border-zinc-800 rounded-full transition-all hover:bg-rose-500 hover:text-white hover:border-rose-500 active:scale-95 absolute top-5 right-5 z-10" disabled={isSaving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-6 md:p-8 space-y-8 overflow-y-auto max-h-[70vh] ${customScrollbar}`} onClick={() => setActiveTimePicker(null)}>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" /> Tiempo de Sesión
              </label>
              <span className="text-[9px] text-rose-500 uppercase tracking-widest font-black bg-rose-500/10 px-2 py-1 rounded">Ajustable</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <div 
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center focus-within:border-rose-500/50 focus-within:bg-zinc-900 transition-colors cursor-pointer group hover:border-zinc-700"
                  onClick={(e) => { e.stopPropagation(); setActiveTimePicker(activeTimePicker === 'horas' ? null : 'horas'); }}
                >
                  <div className="flex items-center justify-center gap-1 w-full">
                    <input 
                      type="number" min="0" value={horas} onChange={(e) => setHoras(Number(e.target.value))}
                      className="w-full bg-transparent text-center text-3xl font-black font-mono text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-rose-500 transition-colors absolute right-3" />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Horas</span>
                </div>
                {activeTimePicker === 'horas' && (
                  <div className={`absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${customScrollbar}`}>
                    {generarOpciones(12).map(num => (
                      <button key={num} onClick={(e) => { e.stopPropagation(); setHoras(num); setActiveTimePicker(null); }} className="w-full text-center py-3 text-lg font-mono font-bold text-zinc-300 hover:bg-rose-500 hover:text-white transition-colors">{num}</button>
                    ))}
                  </div>
                )}
              </div>
              
              <span className="text-3xl font-black text-zinc-800 pb-4">:</span>
              
              <div className="flex-1 relative">
                <div 
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center focus-within:border-rose-500/50 focus-within:bg-zinc-900 transition-colors cursor-pointer group hover:border-zinc-700"
                  onClick={(e) => { e.stopPropagation(); setActiveTimePicker(activeTimePicker === 'minutos' ? null : 'minutos'); }}
                >
                  <div className="flex items-center justify-center gap-1 w-full">
                    <input 
                      type="number" min="0" max="59" value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}
                      className="w-full bg-transparent text-center text-3xl font-black font-mono text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-rose-500 transition-colors absolute right-3" />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Mins</span>
                </div>
                {activeTimePicker === 'minutos' && (
                  <div className={`absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${customScrollbar}`}>
                    {generarOpciones(59).map(num => (
                      <button key={num} onClick={(e) => { e.stopPropagation(); setMinutos(num); setActiveTimePicker(null); }} className="w-full text-center py-3 text-lg font-mono font-bold text-zinc-300 hover:bg-rose-500 hover:text-white transition-colors">{num}</button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-3xl font-black text-zinc-800 pb-4">:</span>
              
              <div className="flex-1 relative">
                <div 
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center focus-within:border-rose-500/50 focus-within:bg-zinc-900 transition-colors cursor-pointer group hover:border-zinc-700"
                  onClick={(e) => { e.stopPropagation(); setActiveTimePicker(activeTimePicker === 'segundos' ? null : 'segundos'); }}
                >
                  <div className="flex items-center justify-center gap-1 w-full">
                    <input 
                      type="number" min="0" max="59" value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}
                      className="w-full bg-transparent text-center text-3xl font-black font-mono text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-rose-500 transition-colors absolute right-3" />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Segs</span>
                </div>
                {activeTimePicker === 'segundos' && (
                  <div className={`absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${customScrollbar}`}>
                    {generarOpciones(59).map(num => (
                      <button key={num} onClick={(e) => { e.stopPropagation(); setSegundos(num); setActiveTimePicker(null); }} className="w-full text-center py-3 text-lg font-mono font-bold text-zinc-300 hover:bg-rose-500 hover:text-white transition-colors">{num}</button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5"><Dumbbell className="w-24 h-24" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Series Ejecutadas</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-white">{seriesCompletadas}</span>
                <span className="text-sm font-bold text-zinc-600 mb-1">/ {seriesTotales}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-2 bg-rose-500/10 px-2.5 py-1 rounded-full">
                {Math.round((seriesCompletadas / (seriesTotales || 1)) * 100)}% Completado
              </span>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Volumen Movido</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white truncate max-w-[120px]">
                  {volumenVisual >= 1000 ? (volumenVisual / 1000).toFixed(1) + 'k' : Math.round(volumenVisual)}
                </span>
                <span className="text-xs font-bold text-zinc-500 mb-1">{unidadTexto}</span>
              </div>
              
              <button 
                onClick={() => setIsLbsView(!isLbsView)}
                className="mt-2 text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-full hover:bg-white hover:text-black transition-colors"
              >
                Ver en {isLbsView ? 'KG' : 'LBS'}
              </button>
            </div>
          </div>

        </div>

        <div className="p-5 md:p-6 border-t border-zinc-800/80 bg-zinc-900/30 flex flex-col gap-3">
          
          <button 
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="w-full bg-rose-500 text-white py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_0_30px_rgba(244,63,94,0.4)] border border-rose-400/50 hover:bg-rose-400 hover:scale-[1.01] active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />} 
            Guardar y Actualizar Plantilla
          </button>
          
          <button 
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="w-full bg-zinc-900 text-zinc-400 border border-zinc-800 py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
            Solo Guardar Historial
          </button>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}