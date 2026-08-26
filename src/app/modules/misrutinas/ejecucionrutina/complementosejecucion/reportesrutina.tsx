"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Loader2, Send, CheckCircle2 } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const MOTIVOS_REPORTE = [
  "El cronómetro se detuvo solo",
  "No puedo marcar una serie",
  "Error al añadir un ejercicio extra",
  "Lentitud o lag en la pantalla",
  "Otro problema"
];

export default function ReportesRutina() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ type: 'success'|'error'|'warning', message: string } | null>(null);

  // Estado para asegurarnos de que el Portal solo se renderice en el cliente (evita errores SSR en Next.js)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSendReport = async () => {
    if (!reportReason) {
      setAlertConfig({ type: "warning", message: "Selecciona un motivo para el reporte." });
      setTimeout(() => setAlertConfig(null), 3000);
      return;
    }

    setIsSubmittingReport(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "reportes_app"), {
        modulo: "Ejecución de Rutina (Pizarrón)",
        motivo: reportReason,
        comentario: reportComment.trim(),
        usuarioUid: user ? user.uid : "anonimo",
        estado: "pendiente",
        fechaReporte: serverTimestamp()
      });

      setShowReportModal(false);
      setReportReason("");
      setReportComment("");
      setAlertConfig({ type: "success", message: "Reporte enviado. Revisaremos el problema de inmediato." });
      setTimeout(() => setAlertConfig(null), 4000);
    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      setAlertConfig({ type: "error", message: "Hubo un error al enviar el reporte." });
      setTimeout(() => setAlertConfig(null), 4000);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Estos elementos se enviarán a través del Portal al nivel más alto del documento
  const modales = (
    <>
      {/* POP-UP DE REPORTE DE SISTEMA */}
      {showReportModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
            
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

      {/* ALERTA TOAST INTEGRADA */}
      {alertConfig && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[400] bg-zinc-900 border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300 border-emerald-500/30">
          <CheckCircle2 className={`w-5 h-5 ${alertConfig.type === 'error' ? 'text-rose-500' : alertConfig.type === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">{alertConfig.message}</span>
        </div>
      )}
    </>
  );

  return (
    <>
      <button 
        onClick={() => setShowReportModal(true)}
        className="flex items-center justify-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors py-2 text-[10px] font-black uppercase tracking-widest mx-auto"
      >
        <AlertTriangle className="w-4 h-4" />
        Reportar Problema en la Pantalla
      </button>

      {/* Renderiza los modales en la raíz del documento para que no se queden atrapados en el footer */}
      {mounted && createPortal(modales, document.body)}
    </>
  );
}