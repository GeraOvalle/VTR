"use client";

import { useState } from "react";
import { PlusCircle, BookOpen, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

// IMPORTAMOS TUS MÓDULOS
import CreacionRutinaModule from "../../../misrutinas/creacionrutina/creacionrutina";
import RutinasPrearmadasModule from "../rutinasprearmadas/rutinasprearmadas";

interface CrearAsignacionProps {
  cliente: any;
  onBack: () => void;
}

// LÍMITES POR ROL
const LIMITES_RUTINAS = {
  clasico: 4,
  tester: 50,
  entrenador: 50,
  admin: Infinity
};

export default function CrearAsignacion({ cliente, onBack }: CrearAsignacionProps) {
  // Opciones: "menu" | "crear_cero" | "clonar_prearmada"
  const [modoCreacion, setModoCreacion] = useState<"menu" | "crear_cero" | "clonar_prearmada">("menu");
  
  const [isCloning, setIsCloning] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // 🔴 NUEVOS ESTADOS PARA AVISOS PERSONALIZADOS
  const [limitWarning, setLimitWarning] = useState<{title: string, message: string} | null>(null);
  const [sysAlert, setSysAlert] = useState<{ text: string, type: 'success' | 'warning' | 'error' } | null>(null);

  const mostrarAlerta = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setSysAlert({ text, type });
    setTimeout(() => setSysAlert(null), 3000);
  };

  // FUNCIÓN PARA COPIAR LA PLANTILLA AL CLIENTE (CON LÍMITES B2B2C)
  const handleClonarRutina = async (rutina: any) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsCloning(true);
    try {
      // 1. VERIFICACIÓN DE LÍMITE DEL CLIENTE
      const targetRoleForLimits = cliente.rol || "clasico";
      const limit = LIMITES_RUTINAS[targetRoleForLimits as keyof typeof LIMITES_RUTINAS] || LIMITES_RUTINAS.clasico;

      const snapshot = await getDocs(collection(db, "users", cliente.uid, "rutinas"));
      const currentCount = snapshot.size;

      if (currentCount >= limit) {
        // 🔴 MOSTRAMOS EL POP-UP PERSONALIZADO EN LUGAR DE ALERT
        setLimitWarning({
          title: "Límite del Cliente Alcanzado",
          message: `Este cliente (${targetRoleForLimits}) permite un máximo de ${limit} rutinas. Pídele que elimine una antigua o que mejore su cuenta a Clásico+ para poder enviarle más.`
        });
        setIsCloning(false);
        return; // Detenemos el guardado
      }

      // 2. CREACIÓN DE LA COPIA
      const nuevaRutina = {
        nombre: rutina.nombre,
        ejercicios: rutina.ejercicios || [],
        asignadaPor: user.uid, // Sello del entrenador
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
        uid: cliente.uid
      };

      // 3. GUARDADO DIRECTO
      await addDoc(collection(db, "users", cliente.uid, "rutinas"), nuevaRutina);
      
      setSuccessMessage(`¡Plantilla "${rutina.nombre}" asignada con éxito!`);
      
      // Esperamos 2 segundos para que lea el mensaje y lo devolvemos a la lista
      setTimeout(() => {
        onBack();
      }, 2000);
      
    } catch (error) {
      console.error("Error clonando rutina:", error);
      mostrarAlerta("Error al asignar la plantilla. Verifica tu conexión.", "error");
      setIsCloning(false);
    }
  };


  // 🔴 VISTA 1: CREAR DESDE CERO
  if (modoCreacion === "crear_cero") {
    return (
      <div className="absolute inset-0 z-50 bg-black animate-in fade-in slide-in-from-bottom-5">
        <CreacionRutinaModule 
          onBack={() => setModoCreacion("menu")} 
          tipoRutina="asignada"
          targetUserId={cliente.uid} 
        />
      </div>
    );
  }

  // 🔴 VISTA 2: SELECCIONAR PREARMADA (PANTALLA COMPLETA)
  if (modoCreacion === "clonar_prearmada") {
    return (
      <div className="absolute inset-0 z-[60] bg-black animate-in fade-in slide-in-from-bottom-5 flex flex-col">
        
        {/* ALERTA CUSTOM SUPERIOR */}
        {sysAlert && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[500] border rounded-full py-3 px-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-5 shadow-2xl ${
            sysAlert.type === 'error' ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] border-rose-400' :
            sysAlert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
            : 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
          }`}>
            {sysAlert.type === 'error' ? <X className="w-5 h-5" /> : sysAlert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{sysAlert.text}</p>
          </div>
        )}

        {/* 🔴 MODAL DE LÍMITE ALCANZADO (Reemplazo del alert nativo) */}
        {limitWarning && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-zinc-950 border border-amber-500/50 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(245,158,11,0.15)] text-center p-8 relative overflow-hidden">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full border border-amber-500/30 mx-auto mb-6 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest leading-tight">{limitWarning.title}</h3>
              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-8">
                {limitWarning.message}
              </p>
              <button 
                onClick={() => setLimitWarning(null)} 
                className="w-full bg-amber-500 text-black py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Loader o Éxito sobrepuesto */}
        {isCloning || successMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full relative z-50 bg-black">
            {successMessage ? (
              <div className="flex flex-col items-center animate-in zoom-in-95">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <h3 className="text-xl font-black text-white uppercase tracking-widest text-center">{successMessage}</h3>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Asignando Plantilla...</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header especial para modo selección */}
            <div className="bg-zinc-950 border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between shrink-0 relative z-10">
              <div>
                <p className="text-[9px] text-amber-500 uppercase tracking-widest font-bold">Modo Selección Activo</p>
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Elige una Plantilla
                </h2>
              </div>
              <button onClick={() => setModoCreacion("menu")} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-full transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Módulo de Prearmadas Inyectado */}
            <div className="flex-1 relative overflow-hidden">
              <RutinasPrearmadasModule 
                // @ts-ignore
                modoSeleccion={true} 
                onSelectRutina={handleClonarRutina} 
                clienteAAsignar={cliente} // 🔴 AQUÍ ESTÁ EL AJUSTE CLAVE
              />
            </div>
          </>
        )}

      </div>
    );
  }

  // 🔴 VISTA 3: MENÚ DE OPCIONES (POR DEFECTO)
  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 h-full max-w-xl mx-auto w-full">
      <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 drop-shadow-md text-center">
        Asignar Nueva Rutina
      </h3>
      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-10 text-center">
        Elige cómo deseas crear la rutina para <strong className="text-white">@{cliente.username}</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        
        {/* OPCIÓN 1: Desde Cero */}
        <button 
          onClick={() => {
            sessionStorage.removeItem("cv_asignada_edit_rutina_id");
            sessionStorage.removeItem("cv_asignada_draft_nombre");
            sessionStorage.removeItem("cv_asignada_draft_ejercicios");
            setModoCreacion("crear_cero");
          }}
          className="bg-zinc-900 border border-white/10 hover:border-white/40 hover:bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all group active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        >
          <div className="w-14 h-14 bg-black rounded-full border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Crear desde cero</h4>
          <p className="text-[10px] text-zinc-500 font-medium">Abre el constructor para armar una rutina completamente personalizada para este cliente.</p>
        </button>

        {/* OPCIÓN 2: Desde Prearmada */}
        <button 
          onClick={() => setModoCreacion("clonar_prearmada")}
          className="bg-zinc-900 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all group active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        >
          <div className="w-14 h-14 bg-black rounded-full border border-white/10 group-hover:border-amber-500/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
            <BookOpen className="w-6 h-6 text-white group-hover:text-amber-500 transition-colors" />
          </div>
          <h4 className="text-sm font-black text-white group-hover:text-amber-500 uppercase tracking-widest mb-2 transition-colors">Usar Plantilla</h4>
          <p className="text-[10px] text-zinc-500 font-medium">Selecciona una de las rutinas de tu bóveda de prearmadas y asígnala al instante.</p>
        </button>

      </div>
    </div>
  );
}