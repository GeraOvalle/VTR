"use client";

import { useState, useEffect } from "react";
import { 
  LogOut, Dumbbell, User, Radio, Crosshair, ClipboardList, 
  Users, Database, Loader2, AlertTriangle, Camera, X, Zap, Award,
  Bug, MessageSquare, Send, CheckCircle2, Bell, CircleDollarSign
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { doc, collection, addDoc, getDocs, onSnapshot } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

import PerfilModule from "../perfil/perfil";
import FotoModule from "./foto";
import MisRutinasModule from "../misrutinas/misrutinas";
import EntrenadorModule from "../entrenador/entrenador";
import RutinasAsignadasModule from "../rutinasasignadas/rutinasasignadas"; 
import AdminModule from "../admin/admin";

import { useNotificaciones } from "../../context/notificacionescontext";

type ViewState = "dashboard" | "perfil" | "foto" | "misrutinas" | "entrenador" | "rutinasasignadas" | "admin";

export default function HomeModule() {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Roles limpios
  const [rol, setRol] = useState<string>("clasico"); 
  
  // Modales
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Estados de Reporte
  const [reportType, setReportType] = useState("error_sistema");
  const [reportComment, setReportComment] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  
  // Estados de Interés de Roles
  const [sendingInterest, setSendingInterest] = useState<string | null>(null);
  const [interestSent, setInterestSent] = useState<string[]>([]);

  // Nuevos estados para Identidad
  const [username, setUsername] = useState<string>("USUARIO");
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  
  // ESTADO: ¿El usuario tiene un entrenador asignado?
  const [tieneEntrenador, setTieneEntrenador] = useState<boolean>(false);
  
  // Estado para alertas del sistema
  const [sysAlert, setSysAlert] = useState<string | null>(null);

  // OBTENEMOS LAS FUNCIONES DEL CONTEXTO GLOBAL DE NOTIFICACIONES
  const { unreadCount, toggleTray } = useNotificaciones();
  
  const [activeView, setActiveView] = useState<ViewState>(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("coachvital_current_view") as ViewState) || "dashboard";
    }
    return "dashboard";
  });

  useEffect(() => {
    sessionStorage.setItem("coachvital_current_view", activeView);
  }, [activeView]);

  useEffect(() => {
    let unsubDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          
          // 🔴 REEMPLAZO DE getDoc POR onSnapshot PARA ESCUCHAR CAMBIOS EN TIEMPO REAL
          unsubDoc = onSnapshot(userDocRef, async (userDocSnap) => {
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              setFotoPerfil(userData.fotoPerfil || null);
              
              const realRole = (userData.rol || "clasico").trim().toLowerCase();
              setRol(realRole);
              
              const emailFallback = user.email?.split('@')[0] || "usuario";
              setUsername(userData.usernameDisplay || userData.username || emailFallback);
              
              setObjetivos(userData.objetivos || []);

              // Los entrenadores vinculados seguimos trayéndolos al detectar un cambio de perfil
              const entrenadoresRef = collection(db, "users", user.uid, "entrenadores_vinculados");
              const entrenadoresSnap = await getDocs(entrenadoresRef);
              
              const tieneArrayActivos = userData.entrenadoresActivos && userData.entrenadoresActivos.length > 0;
              const tieneIdRaiz = !!userData.entrenadorId;

              setTieneEntrenador(!entrenadoresSnap.empty || tieneArrayActivos || tieneIdRaiz);
            }
            setLoading(false);
          });

        } catch (error) {
          console.error("Error al obtener perfil:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // ESCUCHA DEL GESTO FÍSICO "ATRÁS" DEL CELULAR
  useEffect(() => {
    const handleHardwareBack = () => {
      if (activeView !== "dashboard") {
        setActiveView("dashboard");
      }
      if (showRoleModal) setShowRoleModal(false);
      if (showReportModal) setShowReportModal(false);
    };

    window.addEventListener("hardware-back-press", handleHardwareBack);
    return () => window.removeEventListener("hardware-back-press", handleHardwareBack);
  }, [activeView, showRoleModal, showReportModal]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setLoggingOut(false);
    }
  };

  const showWipAlert = (moduleName: string) => {
    setSysAlert(`SISTEMA: [${moduleName.toUpperCase()}] en proceso de desarrollo.`);
    setTimeout(() => setSysAlert(null), 3000);
  };

  const handleSendReport = async () => {
    if (!reportComment.trim()) return;
    setSendingReport(true);
    try {
      await addDoc(collection(db, "reportes_app"), {
        uid: auth.currentUser?.uid || "desconocido",
        username: username,
        tipo: reportType,
        comentario: reportComment.trim(),
        fechaRegistro: new Date().toISOString(),
        estado: "pendiente",
        rolAlReportar: rol
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

  const handleInterest = async (roleName: string) => {
    if (!auth.currentUser) return;
    setSendingInterest(roleName);
    try {
      await addDoc(collection(db, "intereses_suscripcion"), {
        uid: auth.currentUser.uid,
        username: username,
        rolDeseado: roleName,
        fechaRegistro: new Date().toISOString()
      });
      setInterestSent(prev => [...prev, roleName]);
    } catch (error) {
      console.error("Error al guardar interés:", error);
    } finally {
      setSendingInterest(null);
    }
  };

  if (loading) {
    return (
      <main className="fixed inset-0 h-[100dvh] w-full bg-black flex flex-col items-center justify-center overflow-hidden">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] text-white font-black uppercase tracking-[0.2em] animate-pulse">
          Conectando...
        </p>
      </main>
    );
  }

  if (activeView === "perfil") return <PerfilModule onBack={() => setActiveView("dashboard")} />;
  if (activeView === "foto") return <FotoModule onBack={() => setActiveView("dashboard")} currentPhoto={fotoPerfil} />;
  if (activeView === "misrutinas") return <MisRutinasModule onBack={() => setActiveView("dashboard")} />;
  if (activeView === "entrenador") return <EntrenadorModule onBack={() => setActiveView("dashboard")} />;
  if (activeView === "rutinasasignadas") return <RutinasAsignadasModule onBack={() => setActiveView("dashboard")} />;
  if (activeView === "admin") return <AdminModule onBack={() => setActiveView("dashboard")} />;

  const cardBaseStyle = "bg-zinc-950/80 backdrop-blur-md border border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-white/60 shadow-[0_0_30px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10 hover:ring-white/30 transition-all active:scale-[0.98] group aspect-square w-[calc(33.33%-0.5rem)] md:w-32 md:h-32 flex-shrink-0";

  return (
    <main className="fixed inset-0 h-[100dvh] w-full bg-black text-white flex flex-col items-center p-4 relative overflow-hidden font-sans selection:bg-white/30">
      
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px),
            repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)
          `,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] md:w-[80vw] max-w-4xl opacity-[0.03] z-0 pointer-events-none flex justify-center items-center">
        <img src="/logo_coach.png" alt="Marca de Agua" className="w-full h-auto object-contain" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <button 
          onClick={toggleTray}
          className="relative bg-zinc-950/80 backdrop-blur-md border border-white/20 p-2.5 rounded-full hover:bg-white/10 hover:border-white/40 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95 group"
        >
          <Bell className={`w-4 h-4 transition-colors ${unreadCount > 0 ? 'text-white group-hover:text-rose-400' : 'text-zinc-400 group-hover:text-white'}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-black shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {sysAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-white/50 ring-1 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)] rounded-lg py-2 px-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
          <AlertTriangle className="w-3 h-3 text-white animate-pulse" />
          <p className="text-[8px] text-white font-black uppercase tracking-[0.2em]">{sysAlert}</p>
        </div>
      )}

      <div className="w-full max-w-3xl relative z-10 flex flex-col items-center mt-2 flex-1 overflow-hidden pb-2">
        
        <div className="flex flex-col items-center text-center mb-4 w-full pt-4 shrink-0">
          
          <div 
            onClick={() => setActiveView("foto")}
            className="relative w-16 h-16 md:w-20 md:h-20 mb-3 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] ring-1 ring-white/10 overflow-hidden group cursor-pointer"
          >
            {fotoPerfil ? (
              <img src={fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white mb-1" />
              <span className="text-[6px] font-black uppercase tracking-widest text-white">Editar</span>
            </div>
          </div>

          <button 
            onClick={() => setShowRoleModal(true)}
            className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.05)] border active:scale-95 bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white flex items-center gap-1"
          >
            {rol}
          </button>
          
          <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] mt-2 line-clamp-1 w-full px-4">
            @{username}
          </h1>

          {objetivos.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2 max-w-[90%]">
              {objetivos.map((obj, index) => (
                <span key={index} className="px-2 py-0.5 bg-white/5 border border-white/15 rounded-full text-[8px] font-bold text-zinc-300 uppercase tracking-widest backdrop-blur-sm line-clamp-1">
                  {obj}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="w-full flex-1 flex flex-col justify-center overflow-hidden px-1">
          <div className="flex flex-wrap justify-center content-center gap-3 w-full h-full max-w-2xl mx-auto">
            
            <button onClick={() => setActiveView("misrutinas")} className={cardBaseStyle}>
              <Dumbbell className="w-6 h-6 md:w-7 md:h-7 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[8px] md:text-[9px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center leading-tight">
                Mis<br/>Rutinas
              </span>
            </button>

            <button onClick={() => setActiveView("perfil")} className={cardBaseStyle}>
              <User className="w-6 h-6 md:w-7 md:h-7 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[8px] md:text-[9px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
                Perfil
              </span>
            </button>

            <button onClick={() => showWipAlert('Comunidad')} className={cardBaseStyle}>
              <Radio className="w-6 h-6 md:w-7 md:h-7 text-zinc-500 group-hover:text-white transition-colors" />
              <span className="text-[8px] md:text-[9px] text-zinc-500 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
                Comunidad
              </span>
            </button>

            <button onClick={() => showWipAlert('Equipo')} className={cardBaseStyle}>
              <Crosshair className="w-6 h-6 md:w-7 md:h-7 text-zinc-500 group-hover:text-white transition-colors" />
              <span className="text-[8px] md:text-[9px] text-zinc-500 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
                Equipo
              </span>
            </button>

            {/* 🔴 CORRECCIÓN: Agregamos 'clasicoplus' a la lógica de mostrar el módulo de rutinas asignadas */}
            {(((rol === "clasico" || rol === "clasicoplus") && tieneEntrenador) || rol === "entrenador" || rol === "admin") && (
              <button onClick={() => setActiveView("rutinasasignadas")} className={cardBaseStyle}>
                <ClipboardList className="w-6 h-6 md:w-7 md:h-7 text-zinc-300 group-hover:text-white transition-colors" />
                <span className="text-[8px] md:text-[9px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center leading-tight">
                  Rutinas<br/>Asignadas
                </span>
              </button>
            )}

            {(rol === "entrenador" || rol === "admin") && (
              <button onClick={() => setActiveView("entrenador")} className={cardBaseStyle}>
                <Users className="w-6 h-6 md:w-7 md:h-7 text-zinc-300 group-hover:text-white transition-colors" />
                <span className="text-[8px] md:text-[9px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center leading-tight">
                  Mis<br/>Clientes
                </span>
              </button>
            )}

            {rol === "admin" && (
              <button onClick={() => setActiveView("admin")} className={cardBaseStyle}>
                <Database className="w-6 h-6 md:w-7 md:h-7 text-zinc-300 group-hover:text-white transition-colors" />
                <span className="text-[8px] md:text-[9px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center leading-tight">
                  Control<br/>Usuarios
                </span>
              </button>
            )}

            <button 
              onClick={handleLogout}
              disabled={loggingOut}
              className={`${cardBaseStyle} border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/60 shadow-[0_0_20px_-5px_rgba(244,63,94,0.1)] ring-rose-500/10 hover:ring-rose-500/30 disabled:opacity-50`}
            >
              {loggingOut ? (
                <Loader2 className="w-6 h-6 md:w-7 md:h-7 text-rose-500 animate-spin" />
              ) : (
                <LogOut className="w-6 h-6 md:w-7 md:h-7 text-rose-500 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[8px] md:text-[9px] text-rose-500 font-black uppercase tracking-[0.15em] text-center leading-tight">
                Salir
              </span>
            </button>
          </div>
          
          <div className="mt-4 w-full flex justify-center opacity-50 hover:opacity-100 transition-opacity shrink-0">
            <button 
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10"
            >
              <Bug className="w-3 h-3" /> Reportar Problema o Bug
            </button>
          </div>
        </div>

      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.1)] relative overflow-hidden">
            
            {reportSuccess ? (
              <div className="p-10 flex flex-col items-center text-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
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
                       className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all"
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
                       placeholder="Describe el problema o sugerencia..."
                       className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all min-h-[100px] resize-none"
                     />
                   </div>

                   <button 
                     onClick={handleSendReport}
                     disabled={sendingReport || !reportComment.trim()}
                     className="w-full bg-white text-black py-3 rounded-lg font-black uppercase tracking-[0.15em] text-xs hover:bg-zinc-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:scale-100"
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

      {showRoleModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.1)] relative overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
               <h3 className="text-[11px] font-black text-white tracking-[0.2em] uppercase">Niveles de Cuenta</h3>
               <button onClick={() => setShowRoleModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="group border border-white/5 bg-white/5 p-4 rounded-xl">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <User className="w-4 h-4 text-zinc-400" />
                     <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Clásico</h4>
                   </div>
                   <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Activo</span>
                 </div>
                 <p className="text-[10px] text-zinc-400 leading-relaxed font-bold">
                   Cuenta base. Te permite crear y registrar rutinas, configurar tu perfil, y ver tus estadísticas.
                 </p>
               </div>
               
               <div className="group border border-rose-500/20 bg-rose-500/5 p-4 rounded-xl relative overflow-hidden">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-rose-500" />
                     <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-wider">Clásico +</h4>
                   </div>
                   <CircleDollarSign className="w-4 h-4 text-rose-500/50" />
                 </div>
                 <p className="text-[10px] text-zinc-400 leading-relaxed font-bold mb-4">
                   Funciones premium: macros, dietas, análisis de sueño avanzado y métricas de hipertrofia desbloqueadas.
                 </p>
                 {interestSent.includes("ClasicoPlus") ? (
                   <div className="w-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest py-2 rounded flex items-center justify-center gap-1">
                     <CheckCircle2 className="w-3 h-3" /> Interés Registrado
                   </div>
                 ) : (
                   <button 
                     onClick={() => handleInterest("ClasicoPlus")}
                     disabled={sendingInterest === "ClasicoPlus"}
                     className="w-full bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest py-2 rounded transition-colors flex justify-center items-center gap-2"
                   >
                     {sendingInterest === "ClasicoPlus" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                     Me Interesa
                   </button>
                 )}
               </div>
               
               <div className="group border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl relative overflow-hidden">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <Award className="w-4 h-4 text-amber-500" />
                     <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-wider">Entrenador</h4>
                   </div>
                   <CircleDollarSign className="w-4 h-4 text-amber-500/50" />
                 </div>
                 <p className="text-[10px] text-zinc-400 leading-relaxed font-bold mb-4">
                   Dashboard profesional: gestiona rutinas, asigna dietas y supervisa el progreso de todos tus clientes desde un solo lugar.
                 </p>
                 {interestSent.includes("Entrenador") ? (
                   <div className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest py-2 rounded flex items-center justify-center gap-1">
                     <CheckCircle2 className="w-3 h-3" /> Interés Registrado
                   </div>
                 ) : (
                   <button 
                     onClick={() => handleInterest("Entrenador")}
                     disabled={sendingInterest === "Entrenador"}
                     className="w-full bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest py-2 rounded transition-colors flex justify-center items-center gap-2"
                   >
                     {sendingInterest === "Entrenador" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                     Me Interesa
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}