"use client";

import { useState } from "react";
import { Bell, X, CheckCircle2, UserPlus, Dumbbell, AlertTriangle, Trash2, History, ShieldAlert, Zap } from "lucide-react";
import { useNotificaciones } from "../../context/notificacionescontext";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc, setDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { enviarNotificacion } from "../../lib/notificaciones"; 

export default function NotificacionesTray() {
  const { notificaciones, isTrayOpen, closeTray, marcarLeida, borrarNotificacion } = useNotificaciones();
  
  const [activeTab, setActiveTab] = useState<"nuevas" | "historial">("nuevas");
  const [aceptandoId, setAceptandoId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const mostrarToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (!isTrayOpen) return null;

  const nuevas = notificaciones.filter(n => !n.leida);
  const leidas = notificaciones.filter(n => n.leida);
  const displayList = activeTab === "nuevas" ? nuevas : leidas;

  const aceptarEntrenador = async (notifId: string, entrenadorId?: string) => {
    if (!entrenadorId) return;
    const user = auth.currentUser;
    if (!user) return;

    setAceptandoId(notifId);
    try {
      const vinculoRef = doc(db, "users", user.uid, "entrenadores_vinculados", entrenadorId);
      await setDoc(vinculoRef, {
        activo: true,
        fechaVinculacion: serverTimestamp(),
        rolAsignado: "entrenador_principal"
      });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        entrenadoresActivos: arrayUnion(entrenadorId)
      });

      await enviarNotificacion(
        entrenadorId,
        "¡Nuevo Cliente en tu Equipo! 🎉",
        "Un usuario ha aceptado tu invitación de entrenamiento. Revisa tu panel para asignarle rutinas.",
        "sistema",
        { clienteUid: user.uid }
      );

      marcarLeida(notifId);
      mostrarToast("¡Te has unido al equipo del entrenador con éxito!", "success");
    } catch (error) {
      console.error("Error al aceptar entrenador:", error);
      mostrarToast("Hubo un error al vincularte con el entrenador.", "error");
    } finally {
      setAceptandoId(null);
    }
  };

  const getIcono = (tipo: string) => {
    switch(tipo) {
      case "invitacion": return <UserPlus className="w-5 h-5 text-rose-500" />;
      case "rutina_nueva": return <Dumbbell className="w-5 h-5 text-rose-400" />;
      case "sistema": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <>
      {toastMessage && (
        <div className={`fixed bottom-6 left-6 z-[9999] p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl max-w-xs ${
          toastMessage.type === 'error' 
            ? 'bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.4)]' 
            : 'bg-zinc-900 border-rose-500/40 text-white shadow-[0_0_25px_rgba(244,63,94,0.25)]'
        }`}>
          {toastMessage.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" />}
          <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{toastMessage.text}</p>
        </div>
      )}

      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[900] animate-in fade-in duration-200"
        onClick={closeTray}
      ></div>

      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 z-[1000] shadow-[-20px_0_50px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-300 flex flex-col">
        
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/40 shrink-0">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <Bell className="w-5 h-5 text-rose-500" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Notificaciones</h2>
            </div>
            <button onClick={closeTray} className="text-zinc-400 hover:text-white p-2 bg-zinc-900 border border-zinc-800 rounded-full transition-colors active:scale-95">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800/60">
            <button 
              onClick={() => setActiveTab("nuevas")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === "nuevas" ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <Bell className="w-3.5 h-3.5" /> Nuevas ({nuevas.length})
            </button>
            <button 
              onClick={() => setActiveTab("historial")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === "historial" ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Últimas
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 text-center px-6">
              <CheckCircle2 className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {activeTab === "nuevas" ? "Todo al día" : "Sin historial"}
              </p>
              <p className="text-[10px] text-zinc-500 font-medium mt-2">
                {activeTab === "nuevas" ? "No tienes notificaciones pendientes de leer." : "Las notificaciones leídas aparecerán aquí por 30 días."}
              </p>
            </div>
          ) : (
            displayList.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                  notif.leida ? 'bg-zinc-900/20 border-zinc-900 opacity-60' : 'bg-zinc-900/80 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.05)]'
                }`}
                onClick={() => !notif.leida && marcarLeida(notif.id)}
              >
                {!notif.leida && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>}
                
                <div className="flex gap-3">
                  <div className="shrink-0 mt-1">
                    {getIcono(notif.tipo)}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-[11px] font-black uppercase tracking-wider mb-1 ${notif.leida ? 'text-zinc-400' : 'text-white'}`}>
                      {notif.titulo}
                    </h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                      {notif.mensaje}
                    </p>
                    
                    {/* 🔴 NUEVO: BADGE DE ROL ACTUALIZADO */}
                    {notif.tipo === "sistema" && notif.dataExtra?.nuevoRol && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">
                        <Zap className="w-3 h-3" /> Nivel: {notif.dataExtra.nuevoRol}
                      </div>
                    )}
                    
                    {notif.tipo === "invitacion" && !notif.leida && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); aceptarEntrenador(notif.id, notif.dataExtra?.entrenadorId); }}
                        disabled={aceptandoId === notif.id}
                        className="mt-3 w-full bg-rose-500 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> {aceptandoId === notif.id ? "Vinculando..." : "Aceptar Entrenador"}
                      </button>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); borrarNotificacion(notif.id); }}
                    className="shrink-0 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}