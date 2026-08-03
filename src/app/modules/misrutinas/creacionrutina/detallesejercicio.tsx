"use client";

import { useState } from "react";
import { X, Dumbbell, Activity, CheckCircle2, Fingerprint, AlertTriangle, Send, Loader2 } from "lucide-react";
import { db, auth } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface DetallesEjercicioProps {
  ejercicio: any;
  onClose: () => void;
  onAdd: (ejercicio: any) => void;
}

const MOTIVOS_REPORTE = [
  "El GIF no carga o es incorrecto",
  "Mala traducción al español",
  "Instrucciones confusas o vagas",
  "Clasificación muscular errónea",
  "El equipo listado es incorrecto",
  "Otro problema"
];

export default function DetallesEjercicio({ ejercicio, onClose, onAdd }: DetallesEjercicioProps) {
  // Estados para el Modal de Reporte principal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Estado para el Pop-up de Sistema (Custom Alert)
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
      
      await addDoc(collection(db, "reportes_ejercicios"), {
        ejercicioId: ejercicio.id,
        ejercicioNombre: ejercicio.nombreEs || ejercicio.nombre,
        motivo: reportReason,
        comentario: reportComment.trim(),
        usuarioUid: user ? user.uid : "anonimo",
        estado: "pendiente",
        fechaReporte: serverTimestamp()
      });

      setAlertData({
        type: "success",
        title: "¡Gracias!",
        message: "Reporte enviado exitosamente. Nos ayudará a mejorar."
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden">
          
          {/* Header del Modal */}
          <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest hidden sm:block">Detalles del Ejercicio</h3>
              </div>
              
              {/* INDICADOR DE ID */}
              <div 
                className="bg-black/50 border border-zinc-700/50 px-2.5 py-1 rounded-md text-[9px] font-mono text-zinc-400 flex items-center gap-1.5 select-all hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                title="ID del ejercicio en Firestore"
              >
                <Fingerprint className="w-3 h-3" />
                ID: {ejercicio.id}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowReportModal(true)} 
                className="text-zinc-500 hover:text-amber-500 transition-colors p-1.5 bg-zinc-900 rounded-md border border-zinc-800 hover:border-amber-500/50"
                title="Reportar error en este ejercicio"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-zinc-800 mx-1"></div>
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenido Desplazable */}
          <div className="p-6 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50 [&::-webkit-scrollbar-thumb]:rounded-full flex-1">
            
            {/* Visual y Datos Principales */}
            <div className="flex flex-col sm:flex-row gap-5 items-center bg-white/5 border border-white/5 rounded-xl p-4">
              {ejercicio.gifUrl ? (
                <img src={ejercicio.gifUrl} alt="GIF Ejercicio" className="w-32 h-32 rounded-lg bg-black object-cover border border-zinc-800 shadow-md shrink-0" />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-black border border-zinc-800 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-10 h-10 text-zinc-600" />
                </div>
              )}
              
              <div className="space-y-2 text-center sm:text-left w-full">
                <h2 className="text-base font-black text-white capitalize tracking-wide">
                  {ejercicio.nombreEs || ejercicio.nombre}
                </h2>
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                  <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider">
                    Principal: {ejercicio.musculoEs || ejercicio.musculoObjetivo}
                  </span>
                  <span className="bg-white/5 border border-white/10 text-zinc-300 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider">
                    Equipo: {ejercicio.equipoEs || ejercicio.equipo}
                  </span>
                </div>

                {ejercicio.musculosSecundariosEs?.length > 0 && (
                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest pt-1">
                    <span className="text-zinc-500 font-bold">Secundarios:</span> {ejercicio.musculosSecundariosEs.join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Instrucciones Paso a Paso */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3 border-b border-zinc-800 pb-2">
                Ejecución
              </h4>
              
              <ul className="space-y-2.5">
                {(ejercicio.instruccionesEs || ejercicio.instrucciones)?.map((inst: string, i: number) => (
                  <li key={i} className="text-xs text-zinc-300 leading-relaxed bg-black/40 p-3 rounded-lg border border-zinc-800/80 flex gap-3">
                    <span className="text-rose-500 font-black">{i + 1}.</span> 
                    <span className="flex-1">{inst}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Footer con Acción */}
          <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Cerrar
            </button>
            <button 
              onClick={() => {
                onAdd(ejercicio);
                onClose();
              }}
              className="bg-rose-500 text-white px-6 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Agregar ejercicio
            </button>
          </div>

        </div>
      </div>

      {/* POPUP DE REPORTE (SUPERPUESTO) */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.1)] overflow-hidden">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-amber-500/5">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reportar Problema
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-400 hover:text-white p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              
              <div>
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2 block">
                  Motivo del reporte *
                </label>
                <div className="space-y-2">
                  {MOTIVOS_REPORTE.map((motivo, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors">
                      <input 
                        type="radio" 
                        name="reportReason"
                        value={motivo}
                        checked={reportReason === motivo}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="accent-amber-500 w-3.5 h-3.5 bg-black border-zinc-700"
                      />
                      {motivo}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2 block">
                  Comentarios adicionales (Opcional)
                </label>
                <textarea 
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="Danos más detalles para poder corregirlo rápido..."
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors resize-y min-h-[80px]"
                />
              </div>

            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                disabled={isSubmittingReport}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendReport}
                disabled={isSubmittingReport || !reportReason}
                className="bg-amber-500 text-black px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Reporte
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POP-UP DE ALERTA DEL SISTEMA (ÉXITO / ERROR / ADVERTENCIA) */}
      {alertData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className={`bg-zinc-950 border rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl ${
            alertData.type === 'success' ? 'border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]' :
            alertData.type === 'error' ? 'border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)]' :
            'border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
          }`}>
            <div className="p-8 text-center space-y-5">
              
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                alertData.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                alertData.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                'bg-amber-500/10 text-amber-500'
              }`}>
                {alertData.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                {alertData.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                {alertData.type === 'error' && <X className="w-8 h-8" />}
              </div>
              
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">{alertData.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{alertData.message}</p>
              </div>
              
              <button
                onClick={() => setAlertData(null)}
                className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 ${
                  alertData.type === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                  alertData.type === 'error' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
                  'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                Aceptar
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}