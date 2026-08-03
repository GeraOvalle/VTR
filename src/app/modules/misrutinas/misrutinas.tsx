"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Plus, Dumbbell, Lock, Play, 
  Settings2, Loader2, Database, Languages, Edit3, X, Save, AlertTriangle, CheckCircle2, Send, Trash2
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import CreacionRutinaModule from "./creacionrutina/creacionrutina";

import EjerciciosExtraccionModule from "./ejerciciosextraccion";
import EjerciciosTraduccionModule from "./ejerciciostraduccion";
import IniciarRutinaModule from "./ejecucionrutina/iniciarrutina";
interface MisRutinasModuleProps {
  onBack: () => void;
}

interface Rutina {
  id: string;
  nombre: string;
  ejercicios?: any[];
  creadoEn?: any;
  icono?: string;
}

const EMOJIS_RUTINA = [
  "💪", "🏋️‍♂️", "🏋️‍♀️", "🏃‍♂️", "🏃‍♀️", "🚴‍♂️", "🚴‍♀️", "🤸‍♂️", "🤸‍♀️", "🔥", 
  "⚡", "🦍", "🦵", "🦾", "🩸", "❤️", "🏆", "🥇", "💯", "🎯",
  "🥊", "🥋", "🛹", "🏂", "🧗", "🧗‍♀️", "🤽", "🤽‍♀️", "🚣", "🚣‍♀️",
  "🏊", "🏊‍♀️", "🧘", "🧘‍♀️", "🏄", "🏄‍♀️", "💥", "💦", "💨", "🦍",
  "🌟", "✨", "💫", "💢", "💣", "🛡️", "⚔️", "🔪", "🥩", "🔋"
];

const MOTIVOS_REPORTE = [
  "Error al cargar mis rutinas",
  "No me permite crear una rutina nueva",
  "No se guarda el cambio de ícono",
  "Error visual en la pantalla",
  "Otro problema"
];

export default function MisRutinasModule({ onBack }: MisRutinasModuleProps) {
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState<string>("clasico");
  
  const [showExtraction, setShowExtraction] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showCreacion, setShowCreacion] = useState(false);
  
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  
  // Estados para Pop-ups e Interfaz
  const [iconModalRoutineId, setIconModalRoutineId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("💪");
  const [isSavingIcon, setIsSavingIcon] = useState(false);
  
  const [activeSettingsMenu, setActiveSettingsMenu] = useState<string | null>(null);
  const [routineToStart, setRoutineToStart] = useState<Rutina | null>(null); // Rutina seleccionada para iniciar
  
  // Estados para Alertas Custom y Reportes
  const [alertConfig, setAlertConfig] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const MAX_RUTINAS = 4;
  const espaciosLibres = Math.max(0, MAX_RUTINAS - rutinas.length);

  // Ref para cerrar el menú desplegable al hacer clic fuera
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveSettingsMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cargar datos
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) setRol(userDocSnap.data().rol || "clasico");

          const rutinasRef = collection(db, "users", user.uid, "rutinas");
          const q = query(rutinasRef, orderBy("creadoEn", "desc"));
          const rutinasSnap = await getDocs(q);
          
          const rutinasData = rutinasSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Rutina[];
          
          setRutinas(rutinasData);
        } catch (error) {
          console.error("Error al obtener datos:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showCreacion]); 

  // Acciones de Rutinas
  const handleCreateNew = () => {
    sessionStorage.removeItem("cv_edit_rutina_id");
    setShowCreacion(true);
  };

  const handleEditRoutine = (rutina: Rutina) => {
    sessionStorage.setItem("cv_draft_nombre", rutina.nombre);
    sessionStorage.setItem("coachvital_draft_ejercicios", JSON.stringify(rutina.ejercicios || []));
    sessionStorage.setItem("cv_edit_rutina_id", rutina.id); 
    setShowCreacion(true);
  };

  const handleSaveIcon = async () => {
    if (!iconModalRoutineId || !selectedEmoji) return;
    const user = auth.currentUser;
    if (!user) return;

    setIsSavingIcon(true);
    try {
      const ref = doc(db, "users", user.uid, "rutinas", iconModalRoutineId);
      await updateDoc(ref, { icono: selectedEmoji });
      setRutinas(prev => prev.map(r => r.id === iconModalRoutineId ? { ...r, icono: selectedEmoji } : r));
      setIconModalRoutineId(null);
    } catch (error) {
      console.error("Error al guardar el icono:", error);
      setAlertConfig({ type: 'error', title: 'Error', message: 'No se pudo guardar el ícono.' });
    } finally {
      setIsSavingIcon(false);
    }
  };

  // Lógica para Borrar Rutina
  const handleDeleteRoutineClick = (rutina: Rutina) => {
    setAlertConfig({
      type: 'warning',
      title: 'Eliminar Rutina',
      message: `¿Estás seguro de que deseas eliminar la rutina "${rutina.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: () => confirmDeleteRoutine(rutina.id)
    });
  };

  const confirmDeleteRoutine = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    setAlertConfig(null);
    try {
      await deleteDoc(doc(db, "users", user.uid, "rutinas", id));
      setRutinas(prev => prev.filter(r => r.id !== id));
      setAlertConfig({
        type: 'success',
        title: 'Rutina Eliminada',
        message: 'La rutina ha sido eliminada correctamente.'
      });
    } catch (error) {
      console.error("Error al borrar rutina:", error);
      setAlertConfig({
        type: 'error',
        title: 'Error',
        message: 'Hubo un problema al intentar eliminar la rutina. Inténtalo de nuevo.'
      });
    }
  };

  // Reporte de Errores
  const handleSendReport = async () => {
    if (!reportReason) {
      setAlertConfig({ type: "warning", title: "Atención", message: "Selecciona un motivo para el reporte." });
      return;
    }

    setIsSubmittingReport(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "reportes_app"), {
        modulo: "Mis Rutinas",
        motivo: reportReason,
        comentario: reportComment.trim(),
        usuarioUid: user ? user.uid : "anonimo",
        estado: "pendiente",
        fechaReporte: serverTimestamp()
      });

      setShowReportModal(false);
      setReportReason("");
      setReportComment("");
      setAlertConfig({ type: "success", title: "¡Gracias!", message: "Reporte enviado. Nos ayudará a mejorar la plataforma." });
    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      setAlertConfig({ type: "error", title: "Error", message: "Hubo un error al enviar el reporte. Inténtalo de nuevo más tarde." });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] text-white font-bold uppercase tracking-[0.2em] animate-pulse">
          Accediendo a la Base de Datos...
        </p>
      </div>
    );
  }

  if (showExtraction) return <EjerciciosExtraccionModule onBack={() => setShowExtraction(false)} />;
  if (showTranslation) return <EjerciciosTraduccionModule onBack={() => setShowTranslation(false)} />;
  if (showCreacion) return <CreacionRutinaModule onBack={() => setShowCreacion(false)} />;
  if (routineToStart) return <IniciarRutinaModule rutinaId={routineToStart.id} rutinaNombre={routineToStart.nombre} onExitCompletely={() => setRoutineToStart(null)} />;
  
  const cardStyle = "bg-zinc-950/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-[0_0_30px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10 hover:ring-white/30 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all flex flex-col group relative overflow-visible";

  return (
    <>
      <main className="min-h-screen bg-black text-white p-4 md:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30 pb-32" onClick={() => setActiveSettingsMenu(null)}>
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>

        <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col min-h-full">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Volver al Panel</span>
            </button>
            
            <div className="flex items-center gap-4">
              {rol === "admin" && (
                <>
                  <button 
                    onClick={() => setShowExtraction(true)}
                    className="hidden md:flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                  >
                    <Database className="w-3 h-3" /> Actualizar DB
                  </button>
                  <button 
                    onClick={() => setShowTranslation(true)}
                    className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                  >
                    <Languages className="w-3 h-3" /> Traducir Ejercicios
                  </button>
                </>
              )}
              <div className="text-right">
                <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  MIS RUTINAS
                </h1>
              </div>
            </div>
          </div>

          {/* GRID DE RUTINAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            
            {/* 1. RUTINAS EXISTENTES */}
            {rutinas.slice(0, MAX_RUTINAS).map((rutina) => (
              <div key={rutina.id} className={cardStyle}>
                <div className="flex justify-between items-start mb-6">
                  
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation();
                      setIconModalRoutineId(rutina.id); 
                      setSelectedEmoji(rutina.icono || "💪"); 
                    }}
                    className="bg-white/10 w-14 h-14 rounded-xl border border-white/20 flex items-center justify-center text-2xl hover:scale-110 hover:bg-white/20 transition-all shadow-lg"
                    title="Cambiar Icono"
                  >
                    {rutina.icono ? rutina.icono : <Dumbbell className="w-6 h-6 text-white" />}
                  </button>

                  <div className="relative" ref={activeSettingsMenu === rutina.id ? dropdownRef : null}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSettingsMenu(activeSettingsMenu === rutina.id ? null : rutina.id);
                      }}
                      className="text-zinc-500 hover:text-white transition-colors p-1"
                    >
                      <Settings2 className="w-5 h-5" />
                    </button>

                    {/* Menú de Opciones (Borrar) */}
                    {activeSettingsMenu === rutina.id && (
                      <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in duration-100">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSettingsMenu(null);
                            handleDeleteRoutineClick(rutina);
                          }}
                          className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Borrar Rutina
                        </button>
                      </div>
                    )}
                  </div>

                </div>
                
                <h2 className="text-lg font-black tracking-wider text-white mb-2 uppercase line-clamp-1" title={rutina.nombre}>
                  {rutina.nombre}
                </h2>
                
                <div className="flex items-center gap-3 mb-8">
                  <span className="bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider text-rose-400">
                    {rutina.ejercicios?.length || 0} Ejercicios
                  </span>
                </div>

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => setRoutineToStart(rutina)}
                    className="flex-1 bg-white text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    Iniciar
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditRoutine(rutina);
                    }}
                    className="bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-[10px] px-4 rounded-lg hover:bg-zinc-700 hover:text-white transition-all active:scale-[0.98] flex justify-center items-center"
                    title="Editar rutina"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* 2. ESPACIOS LIBRES */}
            {Array.from({ length: espaciosLibres }).map((_, index) => (
              <button 
                key={`free-slot-${index}`}
                onClick={handleCreateNew}
                className="bg-black/50 backdrop-blur-sm border-2 border-dashed border-white/30 rounded-2xl p-6 hover:border-white/80 hover:bg-white/5 transition-all flex flex-col items-center justify-center min-h-[250px] group active:scale-[0.98]"
              >
                <div className="bg-white/10 p-4 rounded-full mb-4 group-hover:scale-110 group-hover:bg-white/20 transition-all">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <span className="text-sm font-black uppercase tracking-[0.15em] text-white mb-1">
                  Crear Rutina
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Espacio Disponible ({rutinas.length + index + 1}/{MAX_RUTINAS})
                </span>
              </button>
            ))}

            {/* 3. TARJETA BLOQUEADA */}
            <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden opacity-70">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 11px)' }}></div>
              <div className="bg-zinc-900 p-4 rounded-full mb-4 border border-zinc-700 relative z-10">
                <Lock className="w-6 h-6 text-zinc-500" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 relative z-10 text-center">
                Ranura de Expansión
              </h3>
              <p className="text-[9px] text-zinc-600 text-center font-bold uppercase tracking-widest mt-4 max-w-[180px] relative z-10">
                Desbloquea rutinas ilimitadas próximamente
              </p>
            </div>

          </div>

          {/* Botón Inferior: Reportar Errores */}
          <div className="mt-auto border-t border-white/10 pt-6 flex justify-center">
            <button 
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors bg-zinc-950/50 px-4 py-2 rounded-full border border-zinc-800/80 hover:border-amber-500/50 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest"
            >
              <AlertTriangle className="w-4 h-4" />
              ¿Problemas con las rutinas? Repórtalos aquí
            </button>
          </div>

        </div>
      </main>

      {/* POP-UP: SELECTOR DE EMOJIS (Con Scroll Custom) */}
      {iconModalRoutineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Elige un Ícono</h3>
              <button onClick={() => setIconModalRoutineId(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50 [&::-webkit-scrollbar-thumb]:rounded-full">
                {EMOJIS_RUTINA.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`text-2xl p-2 rounded-xl transition-all flex items-center justify-center ${
                      selectedEmoji === emoji 
                        ? 'bg-rose-500/20 border-2 border-rose-500 scale-110 shadow-lg' 
                        : 'bg-zinc-900 border border-transparent hover:bg-zinc-800 hover:scale-105'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-2">
              <button 
                onClick={() => setIconModalRoutineId(null)}
                className="flex-1 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                disabled={isSavingIcon}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveIcon}
                disabled={isSavingIcon}
                className="flex-1 bg-rose-500 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingIcon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Ícono
              </button>
            </div>

          </div>
        </div>
      )}

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

      {/* POP-UP DE ALERTA DEL SISTEMA */}
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

    </>
  );
}