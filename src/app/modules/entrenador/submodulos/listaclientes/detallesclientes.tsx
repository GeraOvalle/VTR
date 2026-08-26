"use client";

import { useState, useEffect } from "react";
import { X, Target, Activity, LineChart, Trash2, Loader2, User, Lock, Ruler, AlertOctagon, CheckCircle2 } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { doc, updateDoc, arrayRemove, deleteDoc, collection, query, where, onSnapshot } from "firebase/firestore";

interface DetallesClienteProps {
  cliente: any;
  onClose: () => void;
  mostrarAlerta: (text: string, type?: 'success' | 'warning') => void;
}

export default function DetallesCliente({ cliente, onClose, mostrarAlerta }: DetallesClienteProps) {
  const [clientTab, setClientTab] = useState<"resumen" | "progreso">("resumen");
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // 🔴 ESTADOS PARA LOS CONTADORES DINÁMICOS Y LA LISTA DE PROGRESO
  const [rutinasAsignadasCount, setRutinasAsignadasCount] = useState<number | string>("-");
  const [sesionesRealizadasCount, setSesionesRealizadasCount] = useState<number | string>("-");
  const [historialSesiones, setHistorialSesiones] = useState<any[]>([]);

  // 🔴 ESCUCHAR METRICAS DEL CLIENTE EN TIEMPO REAL
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !cliente?.uid) return;

    // 1. Contar cuántas rutinas le ha asignado ESTE entrenador
    const qRutinas = query(
      collection(db, "users", cliente.uid, "rutinas"),
      where("asignadaPor", "==", user.uid)
    );
    
    const unsubRutinas = onSnapshot(qRutinas, (snapshot) => {
      setRutinasAsignadasCount(snapshot.size);
    }, (error) => {
      console.error("Error leyendo rutinas asignadas:", error);
    });

    // 2. Extraer el progreso del cliente (Evitando error de índices compuestos en Firebase)
    const qProgreso = query(
      collection(db, "progress"),
      where("asignadaPor", "==", user.uid) // Traemos todo lo que este coach ha asignado globalmente
    );

    const unsubProgreso = onSnapshot(qProgreso, (snapshot) => {
      // Filtramos en memoria para este cliente específico
      const sesionesDelCliente = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((data: any) => data.userId === cliente.uid)
        .sort((a: any, b: any) => {
          const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
          const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
          return timeB - timeA; // Orden descendente (más recientes primero)
        });

      setSesionesRealizadasCount(sesionesDelCliente.length);
      setHistorialSesiones(sesionesDelCliente);
    }, (error) => {
      console.error("Error leyendo progreso:", error);
    });

    return () => {
      unsubRutinas();
      unsubProgreso();
    };
  }, [cliente.uid]);

  // DESVINCULAR / ELIMINAR CLIENTE
  const handleDesvincularCliente = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsUnlinking(true);
    try {
      const clienteRef = doc(db, "users", cliente.uid);
      await updateDoc(clienteRef, {
        entrenadoresActivos: arrayRemove(user.uid)
      });

      const vinculoRef = doc(db, "users", cliente.uid, "entrenadores_vinculados", user.uid);
      await deleteDoc(vinculoRef);

      mostrarAlerta("Cliente eliminado del equipo.", "success");
      onClose(); 
    } catch (error) {
      console.error("Error al desvincular:", error);
      mostrarAlerta("Error al eliminar. Verifique permisos.", "warning");
    } finally {
      setIsUnlinking(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-md flex flex-col shadow-[0_0_80px_rgba(255,255,255,0.1)] overflow-hidden relative max-h-[90vh]">
          
          {/* Cabecera del Expediente */}
          <div className="p-6 pb-4 flex justify-between items-start relative z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center shadow-xl">
                {cliente.fotoPerfil ? (
                  <img src={cliente.fotoPerfil} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-zinc-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-white truncate">@{cliente.username}</h2>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Miembro Activo</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-full transition-colors active:scale-95">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TABS DEL MODAL */}
          <div className="flex border-b border-zinc-800/80 px-6 shrink-0">
            <button 
              onClick={() => setClientTab("resumen")}
              className={`pb-3 mr-6 text-[10px] font-black uppercase tracking-widest transition-all relative ${clientTab === "resumen" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Resumen
              {clientTab === "resumen" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"></span>}
            </button>
            <button 
              onClick={() => setClientTab("progreso")}
              className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${clientTab === "progreso" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Progreso
              {clientTab === "progreso" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"></span>}
            </button>
          </div>

          {/* CONTENEDOR CON SCROLL */}
          <div className="px-6 pt-4 pb-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* CONTENIDO: RESUMEN */}
            {clientTab === "resumen" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Objetivos */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Objetivos Principales
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {cliente.objetivos && cliente.objetivos.length > 0 ? (
                      cliente.objetivos.map((obj: string, i: number) => (
                        <span key={i} className="text-[10px] bg-white/5 text-white border border-white/10 px-3 py-1.5 rounded-lg uppercase font-bold tracking-widest">
                          {obj}
                        </span>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-500 italic">No ha definido objetivos aún.</p>
                    )}
                  </div>
                </div>

                {/* Composición Corporal (Protegida por Privacidad) */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" /> Composición Corporal
                  </h4>
                  
                  {cliente.metricasPublicas ? (
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-4">
                      {/* Datos Generales */}
                      <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Peso</span>
                          <span className="text-sm font-black text-white">{cliente.peso ? `${cliente.peso} kg` : '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Altura</span>
                          <span className="text-sm font-black text-white">{cliente.altura ? `${cliente.altura} m` : '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">BMI</span>
                          <span className="text-sm font-black text-white">{cliente.bmi || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Grasa</span>
                          <span className="text-sm font-black text-white">{cliente.grasa ? `${cliente.grasa}%` : '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Músculo</span>
                          <span className="text-sm font-black text-white">{cliente.musculo ? `${cliente.musculo}%` : '-'}</span>
                        </div>
                      </div>

                      {/* Circunferencias */}
                      {cliente.medidas && Object.keys(cliente.medidas).some(k => cliente.medidas[k]) && (
                        <div className="pt-4 border-t border-zinc-800">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Circunferencias (cm)</span>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(cliente.medidas).map(([zona, valor]) => {
                              if (!valor) return null;
                              return (
                                <div key={zona} className="bg-black/50 px-2.5 py-1.5 rounded-lg border border-zinc-800 flex gap-2 items-center">
                                  <span className="text-[9px] text-zinc-400 capitalize">{zona}</span>
                                  <span className="text-[10px] text-white font-bold">{valor as string}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 border-dashed p-6 rounded-2xl flex flex-col items-center justify-center text-center opacity-80">
                      <Lock className="w-6 h-6 text-zinc-600 mb-3" />
                      <span className="text-[10px] text-white uppercase tracking-widest font-black">Métricas Privadas</span>
                      <p className="text-[9px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                        El cliente no ha habilitado la visibilidad de su composición corporal para entrenadores.
                      </p>
                    </div>
                  )}
                </div>

                {/* 🔴 Actividad en la App (CONTADORES CONECTADOS A FIREBASE) */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Actividad Reciente
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-black text-white">{rutinasAsignadasCount}</span>
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Rutinas Asignadas</span>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-black text-white">{sesionesRealizadasCount}</span>
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Sesiones Realizadas</span>
                    </div>
                  </div>
                </div>

                {/* Botón Peligroso (Abre el Modal de Confirmación) */}
                <div className="pt-4">
                  <button 
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-3.5 rounded-xl border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar del Equipo
                  </button>
                </div>
              </div>
            )}

            {/* 🔴 CONTENIDO: PROGRESO (LÍNEA DE TIEMPO REAL) */}
            {clientTab === "progreso" && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 mb-4">
                  <Activity className="w-3.5 h-3.5" /> Historial de Sesiones
                </h4>
                
                {historialSesiones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-60 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                    <LineChart className="w-8 h-8 text-zinc-600 mb-3" />
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Sin Entrenamientos</p>
                    <p className="text-[9px] text-zinc-500 mt-1 max-w-[200px] text-center leading-relaxed">
                      El cliente aún no ha completado ninguna de las rutinas que le has asignado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historialSesiones.map((sesion, idx) => {
                      // Formatear fecha de Firebase
                      const fechaFormat = sesion.fecha?.toDate 
                        ? sesion.fecha.toDate().toLocaleDateString('es-ES', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' 
                          }) 
                        : 'Reciente';

                      return (
                        <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 group hover:border-zinc-700 transition-colors">
                          <div className="bg-rose-500/10 p-2.5 rounded-full shrink-0 border border-rose-500/20 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-5 h-5 text-rose-500" />
                          </div>
                          <div className="flex-1">
                            <h5 className="text-xs font-black text-white uppercase tracking-widest">Entrenamiento Logrado</h5>
                            <p className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">{fechaFormat}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-[9px] text-rose-400 font-black bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 uppercase tracking-widest">
                              +1 Log
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-rose-500/50 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(244,63,94,0.2)] text-center p-8 relative overflow-hidden">
            
            {/* Brillo rojo de fondo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-500/20 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="w-16 h-16 bg-rose-500/10 rounded-full border border-rose-500/30 mx-auto mb-6 flex items-center justify-center relative z-10">
              <AlertOctagon className="w-8 h-8 text-rose-500" />
            </div>
            
            <h3 className="text-lg font-black text-white mb-2 relative z-10 uppercase tracking-widest">¿Eliminar Cliente?</h3>
            
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-8 relative z-10">
              Si eliminas a <strong className="text-white">@{cliente.username}</strong>, perderás el acceso a sus métricas y no podrás asignarle nuevas rutinas. 
              <br/><br/>
              <span className="text-rose-400">El cliente conservará su historial personal, pero tu seguimiento se borrará.</span>
            </p>

            <div className="flex gap-3 relative z-10">
              <button 
                onClick={() => setShowConfirmDelete(false)}
                disabled={isUnlinking}
                className="flex-1 bg-zinc-900 text-zinc-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDesvincularCliente}
                disabled={isUnlinking}
                className="flex-1 bg-rose-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isUnlinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}