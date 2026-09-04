"use client";

import { useState } from "react";
import { X, Dumbbell, Activity, CheckCircle2, Fingerprint, AlertTriangle, Send, Loader2, ShieldAlert, Target, FileText, Info, Plus } from "lucide-react";
import { db, auth } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// 🔴 IMPORTACIÓN DEL NUEVO MÓDULO
import HistorialEjercicio from "./historialejercicios/index";

interface DetallesEjercicioProps {
  ejercicio: any;
  onClose: () => void;
  onAdd?: (ejercicio: any) => void; 
  // 🔴 NUEVA PROPIEDAD AÑADIDA SIN BORRAR NADA MÁS
  targetUserId?: string;
}

const MOTIVOS_REPORTE = [
  "El GIF no carga o es incorrecto",
  "Mala traducción al español",
  "Instrucciones confusas o vagas",
  "Clasificación muscular errónea",
  "El equipo listado es incorrecto",
  "Otro problema"
];

export default function DetallesEjercicio({ ejercicio, onClose, onAdd, targetUserId }: DetallesEjercicioProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "historial">("info");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [alertData, setAlertData] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  if (!ejercicio) return null;

  const handleSendReport = async () => {
    if (!reportReason) {
      setAlertData({
        type: "warning",
        title: "Atención",
        message: "Por favor, selecciona un motivo para el reporte."
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      const user = auth.currentUser;
      
      // MEJORA: Incluir más datos del usuario para auditoría
      await addDoc(collection(db, "reportes_ejercicios"), {
        ejercicioId: ejercicio.id,
        ejercicioNombre: ejercicio.nombreEs || ejercicio.nombre,
        motivo: reportReason,
        comentario: reportComment.trim(),
        usuarioUid: user ? user.uid : "anonimo",
        usuarioNombre: user ? (user.displayName || user.email || "Usuario") : "Desconocido",
        estado: "pendiente",
        fechaReporte: serverTimestamp()
      });

      setAlertData({
        type: "success",
        title: "¡Gracias!",
        message: "Reporte enviado exitosamente. Nos ayudará a mejorar la plataforma."
      });
      setShowReportModal(false);
      setReportReason("");
      setReportComment("");
    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      setAlertData({
        type: "error",
        title: "Error",
        message: "Hubo un error al enviar el reporte. Inténtalo de nuevo más tarde."
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-zinc-950 border border-rose-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden">
          
          {/* Header del Modal */}
          <div className="p-3 sm:p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest hidden sm:block">Detalles del Ejercicio</h3>
              </div>
              
              {/* INDICADOR DE ID */}
              <div 
                className="bg-black/50 border border-zinc-700/50 px-2 py-1 sm:px-2.5 rounded-md text-[8px] sm:text-[9px] font-mono text-zinc-400 flex items-center gap-1.5 select-all hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                title="ID del ejercicio en Firestore"
              >
                <Fingerprint className="w-3 h-3" />
                ID: {ejercicio.id || "Pendiente"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowReportModal(true)} 
                className="text-zinc-500 hover:text-amber-500 transition-colors p-1.5 bg-zinc-900 rounded-md border border-zinc-800 hover:border-amber-500/50 group"
                title="Reportar error en este ejercicio"
              >
                <AlertTriangle className="w-4 h-4 group-active:scale-95" />
              </button>
              <div className="w-[1px] h-4 bg-zinc-800 mx-1"></div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-900 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CUERPO DIVIDIDO EN DOS (Fijo arriba, Scroll abajo) */}
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* 🔴 VISUAL Y DATOS PRINCIPALES (OPTIMIZADO PARA MÓVIL) */}
            <div className="p-4 sm:p-6 flex flex-row gap-4 items-center bg-black/40 border-b border-zinc-800 shrink-0 z-10 shadow-lg relative">
              
              {/* Contenedor Imagen Más Pequeño en Móvil (w-24 h-24) */}
              <div className="relative w-24 h-24 sm:w-40 sm:h-40 rounded-lg bg-black border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                {ejercicio.gifUrl && !imageFailed ? (
                  <img 
                    src={ejercicio.gifUrl} 
                    alt="GIF Ejercicio" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2 opacity-70">
                    <Dumbbell className="w-6 h-6 sm:w-10 sm:h-10 text-zinc-700 mb-1 sm:mb-2" />
                    <span className="text-[7px] sm:text-[9px] tracking-widest font-black text-zinc-500">SIN VISTA</span>
                  </div>
                )}
                {ejercicio.isCustom && (
                  <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-cyan-500/90 text-white text-[7px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded backdrop-blur-md shadow-sm z-10">
                    Propio
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-left w-full flex-1">
                <h2 className="text-sm sm:text-xl font-black text-white capitalize tracking-wide leading-tight line-clamp-2">
                  {ejercicio.nombreEs || ejercicio.nombre}
                </h2>
                
                {ejercicio.estadoRevision === "pendiente" && (
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2 py-1 rounded-md mb-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      Pendiente de Aprobación
                    </span>
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-1 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                      {ejercicio.musculoEs || ejercicio.musculoObjetivo}
                    </span>
                    <span className="bg-white/5 border border-white/10 text-zinc-300 px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                      {ejercicio.equipoEs || ejercicio.equipo}
                    </span>
                  </div>

                  {ejercicio.musculosSecundariosEs?.length > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest pt-0.5 line-clamp-1">
                      <span className="text-zinc-500 font-bold">Secundarios:</span> {ejercicio.musculosSecundariosEs.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* PESTAÑAS (TABS) */}
            <div className="flex px-4 pt-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
              <button 
                onClick={() => setActiveTab("info")}
                className={`flex-1 flex items-center justify-center gap-2 pb-2.5 border-b-2 transition-all ${
                  activeTab === "info" 
                    ? "border-rose-500 text-rose-500" 
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Info className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Instrucciones</span>
              </button>
              
              <button 
                onClick={() => setActiveTab("historial")}
                className={`flex-1 flex items-center justify-center gap-2 pb-2.5 border-b-2 transition-all ${
                  activeTab === "historial" 
                    ? "border-cyan-500 text-cyan-500" 
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Rendimiento</span>
              </button>
            </div>

            {/* 2. CONTENIDO INFERIOR (CON SCROLL INTERNO) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50 [&::-webkit-scrollbar-thumb]:rounded-full bg-zinc-950/50">
              
              {/* Tab 1: Instrucciones */}
              {activeTab === "info" && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 border-b border-zinc-800 pb-2">
                    Ejecución Paso a Paso
                  </h4>
                  
                  {ejercicio.instruccionesEs && ejercicio.instruccionesEs.length > 0 ? (
                    <ul className="space-y-3">
                      {Array.isArray(ejercicio.instruccionesEs) 
                        ? ejercicio.instruccionesEs.map((inst: string, i: number) => (
                            <li key={i} className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed bg-white/5 p-3.5 sm:p-4 rounded-xl border border-white/5 flex gap-3 shadow-sm">
                              <span className="text-rose-500 font-black mt-0.5">{i + 1}.</span> 
                              <span className="flex-1">{inst}</span>
                            </li>
                          ))
                        : <p className="text-[11px] sm:text-xs text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap bg-white/5 p-3.5 sm:p-4 rounded-xl border border-white/5">{ejercicio.instruccionesEs}</p>
                      }
                    </ul>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic">No hay instrucciones detalladas para este ejercicio.</p>
                  )}
                </div>
              )}

              {/* Tab 2: Historial */}
              {activeTab === "historial" && (
                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                  {/* 🔴 AQUÍ PASAMOS EL targetUserId AL COMPONENTE DE HISTORIAL */}
                  <HistorialEjercicio ejercicioId={ejercicio.id} targetUserId={targetUserId} />
                </div>
              )}

            </div>

          </div>

          {/* Footer con Acción Fijo */}
          <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-2 sm:gap-3 shrink-0">
            {!onAdd ? (
              <button 
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3.5 sm:py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800"
              >
                Cerrar Vista
              </button>
            ) : (
              <>
                <button 
                  onClick={onClose}
                  className="px-4 py-3 sm:py-3 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onAdd(ejercicio);
                    onClose();
                  }}
                  className="flex-1 sm:flex-none bg-rose-500 text-white px-5 py-3 rounded-lg font-black uppercase tracking-widest text-[9px] sm:text-[10px] shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Agregar ejercicio
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* POPUP DE REPORTE ACTUALIZADO (Premium VTR Style) */}
      {showReportModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
            
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Reportar Problema</h3>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Mejora la plataforma</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white p-2 transition-colors bg-black/40 rounded-full hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              <div>
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-3 block flex items-center gap-2">
                  <Target className="w-3 h-3 text-amber-500" /> Motivo Principal
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {MOTIVOS_REPORTE.map((motivo, idx) => {
                    const isSelected = reportReason === motivo;
                    return (
                      <button
                        key={idx}
                        onClick={() => setReportReason(motivo)}
                        className={`text-left px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.02]"
                            : "bg-black/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700 hover:text-zinc-300"
                        }`}
                      >
                        {motivo}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-3 block flex items-center gap-2">
                  <FileText className="w-3 h-3 text-amber-500" /> Detalles (Opcional)
                </label>
                <textarea 
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Danos más contexto para corregirlo rápidamente..."
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl p-4 text-[11px] text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all resize-y min-h-[90px] placeholder:text-zinc-600 font-medium leading-relaxed shadow-inner"
                />
              </div>

            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex gap-3">
              <button 
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                disabled={isSubmittingReport}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendReport}
                disabled={isSubmittingReport || !reportReason}
                className="flex-[2] bg-amber-500 text-black px-4 py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POP-UP DE ALERTA DEL SISTEMA */}
      {alertData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className={`bg-zinc-950 border rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl ${
            alertData.type === 'success' ? 'border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)]' :
            alertData.type === 'error' ? 'border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)]' :
            'border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]'
          }`}>
            <div className="p-8 text-center space-y-5">
              
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ring-2 ${
                alertData.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/30' :
                alertData.type === 'error' ? 'bg-rose-500/10 text-rose-500 ring-rose-500/30' :
                'bg-amber-500/10 text-amber-500 ring-amber-500/30'
              }`}>
                {alertData.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                {alertData.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                {alertData.type === 'error' && <X className="w-8 h-8" />}
              </div>
              
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">{alertData.title}</h3>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed px-4">{alertData.message}</p>
              </div>
              
              <button
                onClick={() => setAlertData(null)}
                className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 ${
                  alertData.type === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                  alertData.type === 'error' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
                  'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                Entendido
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}