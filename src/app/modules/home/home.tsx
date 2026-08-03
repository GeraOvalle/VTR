"use client";

import { useState, useEffect } from "react";
import { 
  LogOut, Dumbbell, User, Radio, Crosshair, ClipboardList, 
  Users, Database, Loader2, AlertTriangle, Camera
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import PerfilModule from "../perfil/perfil";
import FotoModule from "./foto";
import MisRutinasModule from "../misrutinas/misrutinas";

export default function HomeModule() {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rol, setRol] = useState<string>("clasico");
  
  // Nuevos estados para Identidad
  const [username, setUsername] = useState<string>("USUARIO");
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  
  // Estado para alertas del sistema (Módulos en proceso)
  const [sysAlert, setSysAlert] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<"dashboard" | "perfil" | "foto" | "misrutinas">(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("coachvital_current_view") as "dashboard" | "perfil" | "foto") || "dashboard";
    }
    return "dashboard";
  });

  // Guardar la vista cada que cambie
  useEffect(() => {
    sessionStorage.setItem("coachvital_current_view", activeView);
  }, [activeView]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setFotoPerfil(userDocSnap.data().fotoPerfil || null);
            const userData = userDocSnap.data();
            setRol(userData.rol || "clasico");
            
            // Lógica de Username: Prioriza el guardado por el usuario, si no, usa el correo
            const emailFallback = user.email?.split('@')[0] || "usuario";
            setUsername(userData.usernameDisplay || userData.username || emailFallback);
            
            // Cargar Objetivos
            setObjetivos(userData.objetivos || []);
          }
        } catch (error) {
          console.error("Error al obtener perfil:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Función para mostrar alerta de módulo en desarrollo
  const showWipAlert = (moduleName: string) => {
    setSysAlert(`SISTEMA: [${moduleName.toUpperCase()}] en proceso de desarrollo.`);
    setTimeout(() => setSysAlert(null), 3000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] text-white font-black uppercase tracking-[0.2em] animate-pulse">
          Conectando...
        </p>
      </main>
    );
  }

  if (activeView === "perfil") {
    return <PerfilModule onBack={() => setActiveView("dashboard")} />;
  }
  if (activeView === "foto") {
  return <FotoModule onBack={() => setActiveView("dashboard")} currentPhoto={fotoPerfil} />;
}
if (activeView === "misrutinas") {
  return <MisRutinasModule onBack={() => setActiveView("dashboard")} />;
}

  // Clases base para las tarjetas Neón Blanco
  const cardBaseStyle = "bg-zinc-950/80 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-white/60 shadow-[0_0_30px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10 hover:ring-white/30 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all active:scale-[0.98] group flex-1 min-w-[140px]";

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-6 relative overflow-x-hidden font-sans selection:bg-white/30">
      
      {/* 1. Fondo Escamoso Táctico */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px),
            repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)
          `,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}
      ></div>

      {/* 2. Logo Desvanecido de Fondo (Marca de Agua Gigante) */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] md:w-[80vw] max-w-4xl opacity-[0.03] z-0 pointer-events-none flex justify-center items-center">
        <img 
          src="/logo_coach.png" 
          alt="Marca de Agua" 
          className="w-full h-auto object-contain"
        />
      </div>

      {/* 3. Viñeta HUD */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>

      {/* Alerta HUD de Sistema Flotante */}
      {sysAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-white/50 ring-1 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)] rounded-lg py-3 px-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
          <p className="text-[9px] text-white font-black uppercase tracking-[0.2em]">{sysAlert}</p>
        </div>
      )}

      {/* Contenedor Principal */}
      <div className="w-full max-w-3xl relative z-10 flex flex-col items-center mt-4">
        
        {/* HEADER CENTRALIZADO (Usuario, Foto y Objetivos) */}
        <div className="flex flex-col items-center text-center mb-10 w-full border-b border-white/10 pb-8">
          
          {/* Recuadro de Foto Táctico */}
<div 
  onClick={() => setActiveView("foto")}
  className="relative w-24 h-24 mb-4 bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] ring-1 ring-white/10 overflow-hidden group cursor-pointer"
>
  {fotoPerfil ? (
    <img src={fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
  ) : (
    <User className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors" />
  )}

  {/* Overlay al pasar el mouse */}
  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
    <Camera className="w-5 h-5 text-white mb-1" />
    <span className="text-[7px] font-black uppercase tracking-widest text-white">Editar</span>
  </div>
</div>

          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">
            REGISTRO: <span className="text-white">{rol}</span>
          </p>
          
          {/* Username destacado con @ */}
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            @{username}
          </h1>

          {/* Renderizado de Objetivos Principales */}
          {objetivos.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
              {objetivos.map((obj, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-white/5 border border-white/15 rounded-full text-[9px] font-bold text-zinc-300 uppercase tracking-widest backdrop-blur-sm"
                >
                  {obj}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* SISTEMA DE TARJETAS (Grid flexible y autoajustable) */}
        <div className="flex flex-wrap justify-center gap-4 w-full">
          
          {/* 1. Mis Rutinas */}
          <button onClick={() => setActiveView("misrutinas")} className={cardBaseStyle}>
  <Dumbbell className="w-8 h-8 text-zinc-300 group-hover:text-white transition-colors" />
  <span className="text-[10px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
    Mis Rutinas
  </span>
</button>

          {/* 2. Perfil */}
          <button onClick={() => setActiveView("perfil")} className={cardBaseStyle}>
            <User className="w-8 h-8 text-zinc-300 group-hover:text-white transition-colors" />
            <span className="text-[10px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
              Perfil
            </span>
          </button>

          {/* 3. Comunidad (Módulo WIP) */}
          <button onClick={() => showWipAlert('Comunidad')} className={cardBaseStyle}>
            <Radio className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" />
            <span className="text-[10px] text-zinc-500 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
              Comunidad
            </span>
          </button>

          {/* 4. Equipo (Módulo WIP) */}
          <button onClick={() => showWipAlert('Equipo')} className={cardBaseStyle}>
            <Crosshair className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors" />
            <span className="text-[10px] text-zinc-500 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
              Equipo
            </span>
          </button>

          {/* ====== MÓDULOS EXTRA SEGÚN ROL ====== */}
          
          {/* 5. Rutinas Asignadas (Cliente, Entrenador, Admin) */}
          {(rol === "cliente" || rol === "entrenador" || rol === "admin") && (
            <button className={cardBaseStyle}>
              <ClipboardList className="w-8 h-8 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[10px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
                Rutinas<br/>Asignadas
              </span>
            </button>
          )}

          {/* 6. Clientes (Entrenador, Admin) */}
          {(rol === "entrenador" || rol === "admin") && (
            <button className={cardBaseStyle}>
              <Users className="w-8 h-8 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[10px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
                Mis Clientes
              </span>
            </button>
          )}

          {/* 7. Usuarios / Panel Admin (Solo Admin) */}
          {rol === "admin" && (
            <button className={cardBaseStyle}>
              <Database className="w-8 h-8 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="text-[10px] text-zinc-400 group-hover:text-white font-black uppercase tracking-[0.15em] text-center">
                Control<br/>Usuarios
              </span>
            </button>
          )}

          {/* ====== BOTÓN DE EXPULSIÓN ====== */}
          <button 
            onClick={handleLogout}
            disabled={loggingOut}
            className="bg-black backdrop-blur-md border border-rose-500/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-rose-500/10 hover:border-rose-500/60 shadow-[0_0_20px_-5px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/10 hover:ring-rose-500/30 transition-all active:scale-[0.98] group flex-1 min-w-[140px] disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            ) : (
              <LogOut className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[10px] text-rose-500 font-black uppercase tracking-[0.15em]">
              Desconectar
            </span>
          </button>

        </div>
      </div>
    </main>
  );
}