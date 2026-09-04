"use client";

import { useState, useEffect } from "react";
import { Dumbbell, Repeat, TrendingUp, Zap, History, Loader2, AlertTriangle, X, Send, CheckCircle2 } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";

// Submódulos
import PestanaPeso from "./pestanapeso";
import PestanaReps from "./pestanareps";
import PestanaVolumen from "./pestanavolumen";
import Pestana1RM from "./pestana1rm";
import PestanaSesiones from "./pestanasesiones";

interface HistorialEjercicioProps {
  ejercicioId: string;
  targetUserId?: string; // 🔴 PROPIEDAD AÑADIDA PARA RECIBIR EL ID DEL CLIENTE
}

const MOTIVOS_REPORTE_DATOS = [
  "Faltan sesiones en el historial",
  "El peso o las repeticiones son incorrectos",
  "Error de cálculo en el 1RM o Volumen",
  "Las gráficas no cargan o se ven mal",
  "La pestaña se queda cargando",
  "Otro problema técnico"
];

export default function HistorialEjercicio({ ejercicioId, targetUserId }: HistorialEjercicioProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [rol, setRol] = useState<string>("clasico"); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sesiones" | "peso" | "1rm" | "volumen" | "reps">("sesiones");

  // 🔴 ESTADOS PARA EL REPORTE DE ERRORES DE DATOS
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [alertData, setAlertData] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      // 🔴 SE DEFINE A QUIÉN SE LE BUSCA EL HISTORIAL (Cliente o Usuario Logueado)
      const uidToFetch = targetUserId || user?.uid;

      if (!uidToFetch || !ejercicioId) {
        setLoading(false);
        return;
      }

      try {
        // 1. OBTENEMOS EL ROL DEL USUARIO LOGUEADO (Para ver si tiene acceso premium a gráficas)
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setRol(userDoc.data().rol || "clasico");
          }
        }

        // 2. OBTENEMOS EL HISTORIAL DE PESOS DEL ID OBJETIVO
        const q = query(
          collection(db, "users", uidToFetch, "pesosregistro"),
          where("ejercicioId", "==", ejercicioId)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const rawData = snap.docs.map((doc) => doc.data());

          // Ordenar cronológicamente descendente (más reciente primero)
          rawData.sort((a, b) => {
            const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : new Date(a.fecha).getTime();
            const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : new Date(b.fecha).getTime();
            return timeB - timeA;
          });

          setRegistros(rawData);
        } else {
          setRegistros([]); // Limpiar en caso de no haber datos
        }
      } catch (error) {
        console.error("Error al cargar historial y rol:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ejercicioId, targetUserId]);

  // 🔴 FUNCIÓN PARA ENVIAR EL REPORTE
  const handleSendReport = async () => {
    if (!reportReason) {
      setAlertData({
        type: "warning",
        title: "Atención",
        message: "Por favor, selecciona un motivo para el reporte."
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      const user = auth.currentUser;
      
      await addDoc(collection(db, "reportes_app"), {
        tipo: "historial_datos",
        ejercicioId: ejercicioId,
        motivo: reportReason,
        comentario: reportComment.trim(),
        usuarioUid: user ? user.uid : "anonimo",
        usuarioNombre: user ? (user.displayName || user.email || "Usuario") : "Desconocido",
        estado: "pendiente",
        fechaReporte: serverTimestamp()
      });

      setAlertData({
        type: "success",
        title: "¡Gracias!",
        message: "Reporte de datos enviado exitosamente. Revisaremos los cálculos."
      });
      setShowReportModal(false);
      setReportReason("");
      setReportComment("");
    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      setAlertData({
        type: "error",
        title: "Error",
        message: "Hubo un error al enviar el reporte. Inténtalo de nuevo más tarde."
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 opacity-60">
        <Loader2 className="w-6 h-6 text-rose-500 animate-spin mb-3" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Cargando registros...
        </span>
      </div>
    );
  }

  if (registros.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
        <History className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Sin historial</p>
        <p className="text-[10px] text-zinc-500 mt-1 max-w-[220px] leading-relaxed">
          Aún no hay registros de este ejercicio. Completa una sesión para generar analíticas.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "sesiones", label: "Sesiones", icon: History },
    { id: "peso", label: "Carga Máx", icon: Dumbbell },
    { id: "1rm", label: "1RM Est.", icon: Zap },
    { id: "volumen", label: "Volumen", icon: TrendingUp },
    { id: "reps", label: "Reps", icon: Repeat },
  ];

  return (
    <>
      <div className="space-y-4 relative pb-8">
        
        {/* SELECTOR EN CUADRÍCULA (3 ARRIBA, 2 ABAJO) */}
        <div className="grid grid-cols-6 gap-2 pb-1">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            const gridSpan = index < 3 ? "col-span-2" : "col-span-3";

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest shrink-0 transition-all border ${gridSpan} ${
                  isActive
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                    : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isActive ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span className="truncate w-full text-center sm:w-auto">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Renderizado del Submódulo Activo */}
        <div className="min-h-[220px]">
          {activeTab === "sesiones" && <PestanaSesiones registros={registros} />}
          {activeTab === "peso" && <PestanaPeso registros={registros} rol={rol} />}
          {activeTab === "1rm" && <Pestana1RM registros={registros} rol={rol} />}
          {activeTab === "volumen" && <PestanaVolumen registros={registros} rol={rol} />}
          {activeTab === "reps" && <PestanaReps registros={registros} rol={rol} />}
        </div>

        {/* 🔴 BOTÓN SUTIL PARA REPORTAR ERRORES DE DATOS */}
        <div className="absolute -bottom-2 right-0 flex justify-end">
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-amber-500 transition-colors p-2 rounded-lg hover:bg-amber-500/10"
          >
            <AlertTriangle className="w-3 h-3" /> Reportar error en datos
          </button>
        </div>
      </div>

      {/* 🔴 MODAL DE REPORTE DE DATOS */}
      {showReportModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
            
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Reportar Datos</h3>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Problemas en historial</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white p-2 transition-colors bg-black/40 rounded-full hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div>
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-3 block">
                  Motivo del problema *
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {MOTIVOS_REPORTE_DATOS.map((motivo, idx) => {
                    const isSelected = reportReason === motivo;
                    return (
                      <button
                        key={idx}
                        onClick={() => setReportReason(motivo)}
                        className={`text-left px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.02]"
                            : "bg-black/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700 hover:text-zinc-300"
                        }`}
                      >
                        {motivo}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-3 block">
                  Detalles (Opcional)
                </label>
                <textarea 
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="¿Qué dato está mal? ¿Qué día falta? Danos detalles..."
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl p-4 text-[11px] text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all resize-y min-h-[90px] placeholder:text-zinc-600 font-medium leading-relaxed shadow-inner"
                />
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex gap-3">
              <button 
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                disabled={isSubmittingReport}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendReport}
                disabled={isSubmittingReport || !reportReason}
                className="flex-[2] bg-amber-500 text-black px-4 py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 POP-UP DE ALERTA DEL SISTEMA */}
      {alertData && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className={`bg-zinc-950 border rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl ${
            alertData.type === 'success' ? 'border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)]' :
            alertData.type === 'error' ? 'border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)]' :
            'border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)]'
          }`}>
            <div className="p-8 text-center space-y-5">
              
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ring-2 ${
                alertData.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/30' :
                alertData.type === 'error' ? 'bg-rose-500/10 text-rose-500 ring-rose-500/30' :
                'bg-amber-500/10 text-amber-500 ring-amber-500/30'
              }`}>
                {alertData.type === 'success' && <CheckCircle2 className="w-8 h-8" />}
                {alertData.type === 'warning' && <AlertTriangle className="w-8 h-8" />}
                {alertData.type === 'error' && <X className="w-8 h-8" />}
              </div>
              
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">{alertData.title}</h3>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed px-4">{alertData.message}</p>
              </div>
              
              <button
                onClick={() => setAlertData(null)}
                className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 ${
                  alertData.type === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                  alertData.type === 'error' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
                  'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}