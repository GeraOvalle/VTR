"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Dumbbell, Save, Loader2, Search, Activity, AlertTriangle, X, CheckCircle2, Send } from "lucide-react";
import VisorEjercicios from "./visorejercicios";
import EstructuraRutina from "./estructurarutina";
import { db, auth } from "../../../lib/firebase"; 
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";

interface CreacionRutinaProps {
  onBack: () => void;
  tipoRutina?: "personal" | "prearmada" | "asignada"; 
  targetUserId?: string; 
}

const MOTIVOS_REPORTE = [
  "Problema al guardar la rutina",
  "El buscador de ejercicios falla",
  "Lentitud o lag en la pantalla",
  "Error visual en la interfaz",
  "Otro problema"
];

// LÍMITES POR ROL (Tester eliminado, clasicoplus añadido)
const LIMITES_RUTINAS = {
  clasico: 4,
  clasicoplus: 50,
  entrenador: 50,
  admin: Infinity
};

export default function CreacionRutinaModule({ onBack, tipoRutina = "personal", targetUserId }: CreacionRutinaProps) {
  
  // KEYS DINÁMICAS DE CACHÉ PARA EVITAR CHOQUES DE MEMORIA
  const PREFIX = tipoRutina === "prearmada" ? "cv_prearmada_" : tipoRutina === "asignada" ? "cv_asignada_" : "cv_";
  const KEY_EDIT_ID = `${PREFIX}edit_rutina_id`;
  const KEY_DRAFT_NOMBRE = `${PREFIX}draft_nombre`;
  const KEY_DRAFT_EJERCICIOS = `${PREFIX}draft_ejercicios`;
  
  const COLECTION_TARGET = tipoRutina === "prearmada" ? "rutinasprearmadas" : "rutinas";

  // Estado para controlar las Pestañas
  const [activeTab, setActiveTab] = useState<"visor" | "estructura">("visor");

  // Estados Base
  const [editRoutineId, setEditRoutineId] = useState<string | null>(null);
  const [nombreRutina, setNombreRutina] = useState<string>("");
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  
  // NUEVO ESTADO DE SEGURIDAD PARA EVITAR SOBREESCRITURAS DE CACHÉ
  const [isLoaded, setIsLoaded] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [userRole, setUserRole] = useState<string>("clasico");

  // Estados para Pop-up de Sistema
  const [alertConfig, setAlertConfig] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().rol?.toLowerCase() || "clasico");
        }
      } catch (error) {
        console.error("Error obteniendo rol:", error);
      }
    };
    fetchUserRole();
  }, []);

  // INICIALIZACIÓN SEGURA: Lee memoria y hace Fallback a Firebase si es necesario
  useEffect(() => {
    const loadInitialData = async () => {
      const storedId = sessionStorage.getItem(KEY_EDIT_ID);
      const storedNombre = sessionStorage.getItem(KEY_DRAFT_NOMBRE);
      const storedEjs = sessionStorage.getItem(KEY_DRAFT_EJERCICIOS);

      let parsedEjs = [];
      try {
        if (storedEjs) parsedEjs = JSON.parse(storedEjs);
      } catch(e) { console.error("Error parseando ejercicios caché"); }

      if (storedId) setEditRoutineId(storedId);
      if (storedNombre) setNombreRutina(storedNombre);
      if (parsedEjs.length > 0) setEjercicios(parsedEjs);

      // FALLBACK DE SEGURIDAD: Si vamos a editar pero la caché falló/está vacía, forzamos lectura de Firebase
      if (storedId && parsedEjs.length === 0) {
        const user = auth.currentUser;
        if (user) {
          const targetId = tipoRutina === "asignada" && targetUserId ? targetUserId : user.uid;
          try {
            const docRef = doc(db, "users", targetId, COLECTION_TARGET, storedId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setNombreRutina(data.nombre || "");
              setEjercicios(data.ejercicios || []);
              parsedEjs = data.ejercicios || [];
            }
          } catch (error) {
            console.error("Error cargando rutina desde Firebase:", error);
          }
        }
      }

      // Si estamos editando o hay ejercicios recuperados, abrimos la pestaña de estructura automáticamente
      if (storedId || parsedEjs.length > 0) {
        setActiveTab("estructura");
      }

      setIsLoaded(true); // Desbloqueamos el auto-guardado
    };

    loadInitialData();
  }, [KEY_EDIT_ID, KEY_DRAFT_NOMBRE, KEY_DRAFT_EJERCICIOS, COLECTION_TARGET, targetUserId, tipoRutina]);

  // AUTO-GUARDADO PROTEGIDO (Solo actúa si ya se completó la carga inicial)
  useEffect(() => {
    if (!isLoaded) return; 
    sessionStorage.setItem(KEY_DRAFT_EJERCICIOS, JSON.stringify(ejercicios));
    sessionStorage.setItem(KEY_DRAFT_NOMBRE, nombreRutina);
  }, [ejercicios, nombreRutina, isLoaded, KEY_DRAFT_EJERCICIOS, KEY_DRAFT_NOMBRE]);

  // ESCUCHA DEL GESTO FÍSICO "ATRÁS" DEL CELULAR
  useEffect(() => {
    const handleHardwareBack = () => {
      if (showReportModal) {
        setShowReportModal(false);
      } else if (alertConfig) {
        setAlertConfig(null);
      } else {
        handleExit(); // Intentamos salir, lo que lanzará la advertencia de guardado si hay cambios
      }
    };

    window.addEventListener("hardware-back-press", handleHardwareBack);
    return () => window.removeEventListener("hardware-back-press", handleHardwareBack);
  }, [showReportModal, alertConfig, ejercicios, nombreRutina, editRoutineId]);

  const handleAddExercise = (ejercicioBase: any) => {
    // CLONACIÓN PROFUNDA: Desvincula completamente el ejercicio de su origen en memoria
    const ejercicioClonado = JSON.parse(JSON.stringify(ejercicioBase));
    
    const nuevoEjercicio = {
      ...ejercicioClonado,
      descansoSegundos: 90,
      nota: "",
      series: []
    };
    
    setEjercicios([...ejercicios, nuevoEjercicio]);
    setActiveTab("estructura"); // Al añadir, te pasamos directamente a verlo
  };

  const handleUpdateEjercicios = (nuevosEjercicios: any[]) => {
    setEjercicios(nuevosEjercicios);
  };

  const guardarProtocolo = async () => {
    if (!nombreRutina.trim() || ejercicios.length === 0) return;
    
    const user = auth.currentUser;
    if (!user) {
      setAlertConfig({ type: 'error', title: 'Error de Sesión', message: 'No hay una sesión activa.' });
      return;
    }

    setGuardando(true);

    try {
      const myUserId = user.uid;
      const targetId = tipoRutina === "asignada" && targetUserId ? targetUserId : myUserId;

      if (!editRoutineId && tipoRutina !== "prearmada") {
        let targetRoleForLimits = userRole;
        
        if (tipoRutina === "asignada") {
          const targetDoc = await getDoc(doc(db, "users", targetId));
          if (targetDoc.exists()) {
            targetRoleForLimits = targetDoc.data().rol?.toLowerCase() || "clasico";
          }
        }

        const snapshot = await getDocs(collection(db, "users", targetId, "rutinas"));
        const currentCount = snapshot.size;
        const limit = LIMITES_RUTINAS[targetRoleForLimits as keyof typeof LIMITES_RUTINAS] || LIMITES_RUTINAS.clasico;

        if (currentCount >= limit) {
          setAlertConfig({
            type: 'warning',
            title: tipoRutina === "asignada" ? 'Límite del Cliente Alcanzado' : 'Límite de Rutinas Alcanzado',
            message: tipoRutina === "asignada" 
              ? `Este cliente permite un máximo de ${limit} rutinas. Pídele que elimine una antigua o que mejore su cuenta a Clásico+ para poder enviarle más.` 
              : `Tu cuenta permite un máximo de ${limit} rutinas. Elimina una rutina antigua o mejora tu plan para crear más.`,
            confirmText: 'Entendido'
          });
          setGuardando(false);
          return;
        }
      }

      const datosRutina: any = {
        nombre: nombreRutina.trim(),
        ejercicios: ejercicios,
        actualizadoEn: serverTimestamp(),
      };

      if (tipoRutina === "asignada") {
        datosRutina.asignadaPor = myUserId;
      }

      if (editRoutineId) {
        const rutinaRef = doc(db, "users", targetId, COLECTION_TARGET, editRoutineId);
        await updateDoc(rutinaRef, datosRutina);
      } else {
        const rutinasRef = collection(db, "users", targetId, COLECTION_TARGET);
        await addDoc(rutinasRef, {
          ...datosRutina,
          creadoEn: serverTimestamp(),
          uid: targetId,
        });
      }

      sessionStorage.removeItem(KEY_DRAFT_EJERCICIOS);
      sessionStorage.removeItem(KEY_DRAFT_NOMBRE);
      sessionStorage.removeItem(KEY_EDIT_ID);

      setAlertConfig({
        type: 'success',
        title: editRoutineId ? 'Cambios Guardados' : '¡Guardado exitoso!',
        message: editRoutineId 
          ? `La rutina "${nombreRutina}" se actualizó correctamente.` 
          : tipoRutina === "asignada"
            ? `La rutina "${nombreRutina}" se ha asignado al cliente exitosamente.`
            : `La ${tipoRutina === "prearmada" ? 'plantilla' : 'rutina'} "${nombreRutina}" se ha guardado exitosamente.`,
        confirmText: 'Continuar',
        onConfirm: () => {
          setAlertConfig(null);
          onBack(); 
        }
      });
      
    } catch (error) {
      console.error("Error al guardar:", error);
      setAlertConfig({
        type: 'error',
        title: 'Error de Guardado',
        message: 'Hubo un error al guardar. Revisa tu conexión e inténtalo de nuevo.'
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleExit = () => {
    const estaVacia = ejercicios.length === 0 && nombreRutina.trim() === "";

    if (editRoutineId) {
      setAlertConfig({
        type: 'warning',
        title: 'Descartar Cambios',
        message: '¿Estás seguro de salir? Las modificaciones que hiciste no se guardarán.',
        confirmText: 'Sí, salir',
        cancelText: 'Seguir editando',
        onConfirm: () => {
          sessionStorage.removeItem(KEY_DRAFT_EJERCICIOS);
          sessionStorage.removeItem(KEY_DRAFT_NOMBRE);
          sessionStorage.removeItem(KEY_EDIT_ID);
          setAlertConfig(null);
          onBack();
        },
        onCancel: () => setAlertConfig(null)
      });
    } else {
      if (estaVacia) {
        sessionStorage.removeItem(KEY_DRAFT_EJERCICIOS);
        sessionStorage.removeItem(KEY_DRAFT_NOMBRE);
        onBack();
      } else {
        setAlertConfig({
          type: 'warning',
          title: '¿Salir del creador?',
          message: 'Tienes trabajo en proceso. Puedes guardarlo como borrador para continuar después o descartarlo.',
          confirmText: 'Guardar Borrador',
          cancelText: 'Descartar Todo',
          onConfirm: () => {
            setAlertConfig(null);
            onBack(); 
          },
          onCancel: () => {
            sessionStorage.removeItem(KEY_DRAFT_EJERCICIOS);
            sessionStorage.removeItem(KEY_DRAFT_NOMBRE);
            setAlertConfig(null);
            onBack();
          }
        });
      }
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
    <main className="fixed inset-0 h-[100dvh] w-full flex flex-col bg-black text-white p-4 md:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-rose-500/30">
      
      {/* Fondos */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/90 to-black pointer-events-none z-0"></div>

      <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col h-full">
        
        {/* Header del Constructor */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-white/10 pb-4 shrink-0">
          
          <button onClick={handleExit} className="flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-widest">
              {editRoutineId ? "Salir" : (ejercicios.length === 0 && !nombreRutina.trim() ? "Salir" : "Salir / Opciones")}
            </span>
          </button>
          
          <div className="w-full md:w-auto flex flex-col items-start md:items-end">
            <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] flex items-center gap-3">
              {tipoRutina === "prearmada" ? "NUEVA PLANTILLA" : tipoRutina === "asignada" ? "ASIGNAR A CLIENTE" : "CREADOR"} 
              <Dumbbell className="w-6 h-6 md:w-8 md:h-8 text-rose-500" />
            </h1>
            <div className="flex items-center gap-3 mt-2 md:mt-1">
              
              <button 
                onClick={() => setShowReportModal(true)} 
                className="text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1 bg-zinc-900 px-2 py-1 md:py-0.5 rounded border border-zinc-800 hover:border-amber-500/50"
                title="Reportar problema en esta pantalla"
              >
                <AlertTriangle className="w-3 h-3 md:w-3 md:h-3" />
                <span className="text-[8px] font-bold uppercase tracking-widest block">Reportar</span>
              </button>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${editRoutineId ? 'bg-cyan-500' : 'bg-amber-500'}`}></span>
                <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${editRoutineId ? 'text-cyan-400' : 'text-amber-500'}`}>
                  {editRoutineId ? "Editando" : "Borrador"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex items-stretch sm:items-center gap-2 sm:gap-8 border-b-0 sm:border-b border-white/10 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("visor")}
            className={`flex-1 sm:flex-none p-3 sm:p-0 sm:pb-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center justify-center sm:justify-start gap-2 rounded-lg sm:rounded-none whitespace-nowrap ${
              activeTab === "visor" 
                ? "bg-rose-500/10 sm:bg-transparent text-rose-500 border border-rose-500/30 sm:border-transparent" 
                : "bg-zinc-900/50 sm:bg-transparent text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-zinc-800/50 sm:hover:bg-transparent"
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">SELECTOR DE EJERCICIOS</span>
            <span className="sm:hidden">EJERCICIOS</span>
            {activeTab === "visor" && (
              <div className="hidden sm:block absolute bottom-0 left-0 w-full h-[3px] bg-rose-500 rounded-t-full shadow-[0_-2px_10px_rgba(244,63,94,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("estructura")}
            className={`flex-1 sm:flex-none p-3 sm:p-0 sm:pb-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all relative flex items-center justify-center sm:justify-start gap-2 rounded-lg sm:rounded-none whitespace-nowrap ${
              activeTab === "estructura" 
                ? "bg-rose-500/10 sm:bg-transparent text-rose-500 border border-rose-500/30 sm:border-transparent" 
                : "bg-zinc-900/50 sm:bg-transparent text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-zinc-800/50 sm:hover:bg-transparent"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">ESTRUCTURA DE LA RUTINA</span>
            <span className="sm:hidden">ESTRUCTURA</span>
            
            {ejercicios.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                activeTab === "estructura" ? "bg-rose-500 text-white" : "bg-zinc-800 text-zinc-300"
              }`}>
                {ejercicios.length}
              </span>
            )}

            {activeTab === "estructura" && (
              <div className="hidden sm:block absolute bottom-0 left-0 w-full h-[3px] bg-rose-500 rounded-t-full shadow-[0_-2px_10px_rgba(244,63,94,0.5)]" />
            )}
          </button>
        </div>

        {/* CONTENIDO DE LAS PESTAÑAS (FLEX-1 PARA OCUPAR EL ESPACIO RESTANTE Y HACER SCROLL INTERNO) */}
        <div className="w-full flex-1 overflow-hidden flex flex-col">
          {activeTab === "visor" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex-1 overflow-hidden flex flex-col">
              <VisorEjercicios onAddExercise={handleAddExercise} />
            </div>
          )}

          {activeTab === "estructura" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <EstructuraRutina 
                  nombre={nombreRutina}
                  onNameChange={setNombreRutina}
                  ejercicios={ejercicios} 
                  onUpdateEjercicios={handleUpdateEjercicios}
                  targetUserId={targetUserId}
                />
              </div>

              {/* BOTÓN GUARDAR DINÁMICO (FIJO AL FONDO) */}
              <div className="shrink-0 pt-2 pb-4">
                <button 
                  onClick={guardarProtocolo}
                  className={`w-full text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl transition-all active:scale-[0.98] flex justify-center items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    editRoutineId 
                      ? "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_30px_rgba(8,145,178,0.3)] hover:shadow-[0_0_40px_rgba(8,145,178,0.6)]" 
                      : "bg-rose-500 hover:bg-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_rgba(244,63,94,0.6)]"
                  }`}
                  disabled={ejercicios.length === 0 || !nombreRutina.trim() || guardando || !isLoaded}
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando Cambios...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> 
                      {editRoutineId 
                        ? "Guardar Cambios" 
                        : tipoRutina === "asignada"
                          ? `Asignar a cliente`
                          : `Crear ${tipoRutina === "prearmada" ? 'plantilla' : 'rutina'} "${nombreRutina.trim() || 'Sin Nombre'}"`
                      }
                    </>
                  )}
                </button>
              </div>
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
          <div className={`bg-zinc-950 border rounded-2xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl relative ${
            alertConfig.type === 'success' ? 'border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]' :
            alertConfig.type === 'error' ? 'border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)]' :
            'border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
          }`}>
            
            {/* BOTÓN CERRAR X */}
            <button 
              onClick={() => setAlertConfig(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

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
                    onClick={() => {
                      if (alertConfig.onCancel) alertConfig.onCancel();
                      else setAlertConfig(null);
                    }}
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