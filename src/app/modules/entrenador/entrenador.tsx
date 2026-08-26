"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, ClipboardList, TrendingUp, ShieldCheck, Loader2, KeyRound, UserPlus, BookOpen } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// IMPORTAMOS LOS SUBMÓDULOS
import ListaClientesModule from "./submodulos/listaclientes/listaclientes";
import PerfilMetricasModule from "./submodulos/perfilmetricas/perfilmetricas";
import AsignarRutinasModule from "./submodulos/asignarrrutinas/asignarrutinas";
import RutinasPrearmadasModule from "./submodulos/rutinasprearmadas/rutinasprearmadas"; // 🔴 IMPORTAMOS EL NUEVO MÓDULO


interface EntrenadorModuleProps {
  onBack: () => void;
}

// Añadimos "rutinas_prearmadas" y permitimos que el estado sea null (Menú Principal)
type TrainerTab = "lista_clientes" | "asignar_rutinas" | "rutinas_prearmadas" | "perfil_metricas" | null;

// Definimos los módulos para mapearlos fácilmente
const MODULOS = [
  { id: "lista_clientes", label: "Mis Clientes", icon: Users },
  { id: "asignar_rutinas", label: "Asignar Rutinas", icon: ClipboardList },
  { id: "rutinas_prearmadas", label: "Prearmadas", icon: BookOpen },
  { id: "perfil_metricas", label: "Mi Perfil", icon: TrendingUp },
];

export default function EntrenadorModule({ onBack }: EntrenadorModuleProps) {
  // Empezamos en null para mostrar la cuadrícula principal
  const [activeTab, setActiveTab] = useState<TrainerTab>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  
  const [isTrainerActivated, setIsTrainerActivated] = useState(false);
  const [trainerCodeShort, setTrainerCodeShort] = useState("");

  useEffect(() => {
    const verificarPerfilEntrenador = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.isTrainerActivated) {
            setIsTrainerActivated(true);
            setTrainerCodeShort(data.trainerCodeShort || "");
          }
        }
      } catch (error) {
        console.error("Error verificando perfil de entrenador:", error);
      } finally {
        setLoading(false);
      }
    };

    verificarPerfilEntrenador();
  }, []);

  const activarPerfilEntrenador = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setActivating(true);
    try {
      const randomLong = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      const codeFull = randomLong.substring(0, 20).toUpperCase();
      const codeShort = Math.random().toString(36).substring(2, 7).toUpperCase();

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isTrainerActivated: true,
        trainerCodeFull: codeFull,
        trainerCodeShort: codeShort,
        fechaActivacionTrainer: new Date().toISOString()
      });

      setTrainerCodeShort(codeShort);
      setIsTrainerActivated(true);
    } catch (error) {
      console.error("Error activando perfil:", error);
      alert("Hubo un error al activar tu perfil. Intenta de nuevo.");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-50">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white">Cargando Panel...</p>
      </div>
    );
  }

  // PANTALLA DE BIENVENIDA (ONBOARDING)
  if (!isTrainerActivated) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 sm:mt-16 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-8">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Volver al Inicio</span>
        </button>

        <div className="bg-zinc-950/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-12 shadow-[0_0_80px_rgba(255,255,255,0.05)] text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
          
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest mb-4">
            Bienvenido al Panel de <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">Entrenador</span>
          </h1>

          <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-lg mb-8">
            Desde este panel de control exclusivo tendrás acceso total para <strong className="text-white">ver a tus clientes, invitar a nuevos, asignarles rutinas personalizadas</strong> y monitorear su progreso en tiempo real.
          </p>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-8 w-full max-w-md">
            <div className="flex items-center justify-center gap-2 text-white mb-2">
              <KeyRound className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Paso Obligatorio</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Para continuar, presiona el botón inferior. El sistema te asignará un <strong className="text-white">Código de Entrenador Exclusivo de 5 caracteres</strong> para que tus clientes te encuentren rápidamente.
            </p>
          </div>

          <button 
            onClick={activarPerfilEntrenador}
            disabled={activating}
            className="w-full max-w-sm bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-4 rounded-xl hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {activating ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Activar Perfil y Generar Código
          </button>
        </div>
      </div>
    );
  }

  // Obtenemos los datos del módulo activo para pintar la barra superior
  const moduloActivo = MODULOS.find(m => m.id === activeTab);
  const modulosInactivos = MODULOS.filter(m => m.id !== activeTab);

  return (
    <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col h-full min-h-[85vh] mt-4 sm:mt-8 animate-in fade-in duration-300">
      
      {/* 🔴 VISTA 1: DASHBOARD (CUADRÍCULA 2x2) */}
      {!activeTab && (
        <div className="animate-in zoom-in-95 duration-300">
          
          <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Volver al Inicio</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest hidden sm:block">Tu Código:</span>
                <span className="text-xs font-mono font-black text-white tracking-widest drop-shadow-md">{trainerCodeShort}</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] mb-8 text-center sm:text-left">
            PANEL DE ENTRENADOR
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {MODULOS.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id as TrainerTab)}
                className="bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:border-white/40 hover:bg-white/5 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 group aspect-square"
              >
                <div className="w-14 h-14 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:bg-white transition-colors duration-300">
                  <mod.icon className="w-6 h-6 text-white group-hover:text-black transition-colors duration-300" />
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-300 group-hover:text-white text-center">
                  {mod.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🔴 VISTA 2: MÓDULO ACTIVO CON NAVEGACIÓN SUPERIOR INTELIGENTE */}
      {activeTab && moduloActivo && (
        <div className="flex flex-col h-full flex-1 animate-in fade-in duration-300">
          
          {/* Top Bar Compacta */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-2 mb-6 flex justify-between items-center shadow-lg">
            
            {/* Botón Volver al Menú + Título Activo */}
            <button 
              onClick={() => setActiveTab(null)}
              className="flex items-center gap-3 bg-white text-black px-4 py-3 rounded-xl hover:bg-zinc-200 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <div className="flex items-center gap-2 border-l border-black/20 pl-3">
                <moduloActivo.icon className="w-4 h-4 shrink-0 hidden sm:block" />
                <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] sm:max-w-none">
                  {moduloActivo.label}
                </span>
              </div>
            </button>

            {/* Accesos Rápidos a Otros Módulos */}
            <div className="flex gap-2 pr-1">
              {modulosInactivos.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => setActiveTab(mod.id as TrainerTab)}
                  title={mod.label}
                  className="w-10 h-10 bg-black border border-white/10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/30 transition-all active:scale-95 group"
                >
                  <mod.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* RENDERIZADO DEL SUBMÓDULO ACTIVO */}
          <div className="flex-1 bg-zinc-950/40 border border-white/5 rounded-3xl p-4 md:p-6 lg:p-8 shadow-inner overflow-hidden relative">
            {activeTab === "lista_clientes" && <ListaClientesModule trainerCodeShort={trainerCodeShort} />}
            {activeTab === "asignar_rutinas" && <AsignarRutinasModule />}
            {activeTab === "perfil_metricas" && <PerfilMetricasModule trainerCodeShort={trainerCodeShort} />}
            
            {/* 🔴 AHORA RENDERIZAMOS EL MÓDULO DE RUTINAS PREARMADAS REAL */}
            {activeTab === "rutinas_prearmadas" && <RutinasPrearmadasModule />}
          </div>
        </div>
      )}

    </div>
  );
}