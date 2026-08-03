"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Dumbbell, Save, Loader2, Search, Activity, AlertTriangle, X, CheckCircle2, Send } from "lucide-react";
import VisorEjercicios from "./visorejercicios";
import EstructuraRutina from "./estructurarutina";
import { db, auth } from "../../../lib/firebase"; 
// Importamos doc y updateDoc para poder sobreescribir la rutina
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

interface CreacionRutinaProps {
  onBack: () => void;
}

const MOTIVOS_REPORTE = [
  "Problema al guardar la rutina",
  "El buscador de ejercicios falla",
  "Lentitud o lag en la pantalla",
  "Error visual en la interfaz",
  "Otro problema"
];

export default function CreacionRutinaModule({ onBack }: CreacionRutinaProps) {
  // Estado para controlar las Pestañas
  const [activeTab, setActiveTab] = useState<"visor" | "estructura">("visor");

  // Verificar si estamos Editando una Rutina Existente
  const [editRoutineId, setEditRoutineId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("cv_edit_rutina_id");
    return null;
  });

  // ÚNICO ESTADO MAESTRO PARA TODO
  const [nombreRutina, setNombreRutina] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("cv_draft_nombre") || "";
    return "";
  });
  
  const [ejercicios, setEjercicios] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const draft = sessionStorage.getItem("coachvital_draft_ejercicios");
      return draft ? JSON.parse(draft) : [];
    }
    return [];
  });

  const [guardando, setGuardando] = useState(false);

  // Estados para Pop-up de Sistema (Alertas y Confirmaciones)
  const [alertConfig, setAlertConfig] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  // Estados para el Modal de Reporte
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Auto-guardado en caché (El borrador/edición se guarda en tiempo real localmente)
  useEffect(() => {
    sessionStorage.setItem("coachvital_draft_ejercicios", JSON.stringify(ejercicios));
    sessionStorage.setItem("cv_draft_nombre", nombreRutina);
  }, [ejercicios, nombreRutina]);

  const handleAddExercise = (ejercicioBase: any) => {
    const nuevoEjercicio = {
      ...ejercicioBase,
      descansoSegundos: 90,
      nota: "",
      series: []
    };
    setEjercicios([...ejercicios, nuevoEjercicio]);
  };

  const handleUpdateEjercicios = (nuevosEjercicios: any[]) => {
    setEjercicios(nuevosEjercicios);
  };

  const guardarProtocolo = async () => {
    if (!nombreRutina.trim() || ejercicios.length === 0) return;
    
    const user = auth.currentUser;
    if (!user) {
      setAlertConfig({ type: 'error', title: 'Error de Sesión', message: 'No hay una sesión de usuario activa.' });
      return;
    }

    setGuardando(true);

    try {
      const userId = user.uid;

      const datosRutina = {
        nombre: nombreRutina.trim(),
        ejercicios: ejercicios,
        actualizadoEn: serverTimestamp(),
      };

      if (editRoutineId) {
        // EDICIÓN: Actualizar documento existente
        const rutinaRef = doc(db, "users", userId, "rutinas", editRoutineId);
        await updateDoc(rutinaRef, datosRutina);
      } else {
        // CREACIÓN: Crear nuevo documento
        const rutinasUserRef = collection(db, "users", userId, "rutinas");
        await addDoc(rutinasUserRef, {
          ...datosRutina,
          creadoEn: serverTimestamp(),
          uid: userId,
        });
      }

      // Limpiar cachés al tener éxito
      sessionStorage.removeItem("coachvital_draft_ejercicios");
      sessionStorage.removeItem("cv_draft_nombre");
      sessionStorage.removeItem("cv_edit_rutina_id");

      setAlertConfig({
        type: 'success',
        title: editRoutineId ? 'Cambios Guardados' : '¡Rutina Creada!',
        message: editRoutineId 
          ? `La rutina "${nombreRutina}" se actualizó correctamente.` 
          : `El protocolo "${nombreRutina}" se ha guardado exitosamente.`,
        confirmText: 'Continuar',
        onConfirm: () => {
          setAlertConfig(null);
          onBack(); 
        }
      });
      
    } catch (error) {
      console.error("Error al guardar la rutina:", error);
      setAlertConfig({
        type: 'error',
        title: 'Error de Guardado',
        message: 'Hubo un error al guardar la rutina. Revisa tu conexión e inténtalo de nuevo.'
      });
    } finally {
      setGuardando(false);
    }
  };

  // LÓGICA DE SALIDA INTELIGENTE (Borrador vs Descartar Edición)
  const handleExit = () => {
    if (editRoutineId) {
      // Si está editando una rutina que ya existe, salir descarta los cambios
      setAlertConfig({
        type: 'warning',
        title: 'Descartar Cambios',
        message: '¿Estás seguro de salir? Las modificaciones que hiciste a esta rutina no se guardarán.',
        confirmText: 'Sí, descartar',
        cancelText: 'Cancelar',
        onConfirm: () => {
          sessionStorage.removeItem("coachvital_draft_ejercicios");
          sessionStorage.removeItem("cv_draft_nombre");
          sessionStorage.removeItem("cv_edit_rutina_id");
          setAlertConfig(null);
          onBack();
        }
      });
    } else {
      // Si es una rutina nueva, salir guarda el borrador
      setAlertConfig({
        type: 'success',
        title: 'Borrador Guardado',
        message: 'Tus avances ya están guardados en tu dispositivo. Puedes regresar más tarde para terminar la rutina.',
        confirmText: 'Salir',
        cancelText: 'Seguir editando',
        onConfirm: () => {
          setAlertConfig(null);
          onBack(); 
        }
      });
    }
  };

  const handleSendReport = async () => {
    if (!reportReason) {
      setAlertConfig({ type: "warning", title: "Atención", message: "Por favor, selecciona un motivo para el reporte." });
      return;
    }

    setIsSubmittingReport(true);
    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, "reportes_app"), {
        modulo: "Creador de Rutinas",
        motivo: reportReason,
        comentario: reportComment.trim(),
        usuarioUid: user ? user.uid : "anonimo",
        estado: "pendiente",
        fechaReporte: serverTimestamp()
      });

      setShowReportModal(false);
      setReportReason("");
      setReportComment("");
      setAlertConfig({ type: "success", title: "¡Gracias!", message: "Reporte enviado exitosamente. Nos ayudará a mejorar la app." });
    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      setAlertConfig({ type: "error", title: "Error", message: "Hubo un error al enviar el reporte. Inténtalo de nuevo más tarde." });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-rose-500/30">
      
      {/* Fondos */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/90 to-black pointer-events-none z-0"></div>

      <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col pb-16">
        
        {/* Header del Constructor */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 mt-2">
          
          {/* BOTÓN SALIR DINÁMICO */}
          <button onClick={handleExit} className="flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              {editRoutineId ? "Descartar Cambios" : "Guardar Borrador"}
            </span>
          </button>
          
          <div className="text-right flex flex-col items-end">
            <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] flex items-center gap-3">
              CREADOR <Dumbbell className="w-6 h-6 md:w-8 md:h-8 text-rose-500" />
            </h1>
            <div className="flex items-center gap-3 mt-1">
              
              {/* Botón de Reporte */}
              <button 
                onClick={() => setShowReportModal(true)} 
                className="text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 hover:border-amber-500/50"
                title="Reportar problema en esta pantalla"
              >
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[8px] font-bold uppercase tracking-widest hidden sm:block">Reportar</span>
              </button>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${editRoutineId ? 'bg-cyan-500' : 'bg-amber-500'}`}></span>
                <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${editRoutineId ? 'text-cyan-400' : 'text-amber-500'}`}>
                  {editRoutineId ? "Editando Rutina" : "Borrador Automático"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex items-center gap-8 border-b border-white/10 mb-6 px-2 overflow-x-auto custom-scrollbar">
          
          {/* Pestaña 1: EJERCICIOS */}
          <button
            onClick={() => setActiveTab("visor")}
            className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === "visor" ? "text-rose-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Search className="w-4 h-4" />
            SELECTOR DE EJERCICIOS
            {activeTab === "visor" && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-rose-500 rounded-t-full shadow-[0_-2px_10px_rgba(244,63,94,0.5)]" />
            )}
          </button>

          {/* Pestaña 2: Estructura */}
          <button
            onClick={() => setActiveTab("estructura")}
            className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === "estructura" ? "text-rose-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            ESTRUCTURA DE LA RUTINA
            
            {ejercicios.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                activeTab === "estructura" ? "bg-rose-500 text-white" : "bg-zinc-800 text-zinc-300"
              }`}>
                {ejercicios.length}
              </span>
            )}

            {activeTab === "estructura" && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-rose-500 rounded-t-full shadow-[0_-2px_10px_rgba(244,63,94,0.5)]" />
            )}
          </button>

        </div>

        {/* CONTENIDO DE LAS PESTAÑAS */}
        <div className="w-full">
          {activeTab === "visor" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <VisorEjercicios onAddExercise={handleAddExercise} />
            </div>
          )}

          {activeTab === "estructura" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-4">
              <EstructuraRutina 
                nombre={nombreRutina}
                onNameChange={setNombreRutina}
                ejercicios={ejercicios} 
                onUpdateEjercicios={handleUpdateEjercicios}
              />

              {/* BOTÓN GUARDAR DINÁMICO */}
              <button 
                onClick={guardarProtocolo}
                className={`w-full text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl transition-all active:scale-[0.98] flex justify-center items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  editRoutineId 
                    ? "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_30px_rgba(8,145,178,0.3)] hover:shadow-[0_0_40px_rgba(8,145,178,0.6)]" 
                    : "bg-rose-500 hover:bg-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.6)]"
                }`}
                disabled={ejercicios.length === 0 || !nombreRutina.trim() || guardando}
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando Cambios...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> 
                    {editRoutineId ? "Guardar Cambios" : `Crear rutina "${nombreRutina.trim() || 'Sin Nombre'}"`}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POP-UP DE REPORTE DE SISTEMA */}
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
      {alertConfig && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className={`bg-zinc-950 border rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl ${
            alertConfig.type === 'success' ? 'border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]' :
            alertConfig.type === 'error' ? 'border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)]' :
            'border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
          }`}>
            <div className="p-8 text-center space-y-5">
              
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                alertConfig.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                alertConfig.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                'bg-amber-500/10 text-amber-500'
              }`}>
                {alertConfig.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                {alertConfig.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                {alertConfig.type === 'error' && <X className="w-8 h-8" />}
              </div>
              
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">{alertConfig.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{alertConfig.message}</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                {alertConfig.cancelText && (
                  <button
                    onClick={() => setAlertConfig(null)}
                    className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    {alertConfig.cancelText}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                    else setAlertConfig(null);
                  }}
                  className={`flex-1 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 ${
                    alertConfig.type === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                    alertConfig.type === 'error' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
                    'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {alertConfig.confirmText || 'Aceptar'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </main>
  );
}