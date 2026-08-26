"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bug, Loader2, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";

interface ReporteApp {
  id: string;
  modulo?: string;
  motivo?: string;
  tipo?: string;
  comentario: string;
  usuarioUid?: string;
  uid?: string;
  username?: string;
  estado: "pendiente" | "revisado";
  fechaReporte?: any; 
  fechaRegistro?: string; 
  sourceCollection?: string;
}

export default function BugsModule({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [bugs, setBugs] = useState<ReporteApp[]>([]);

  useEffect(() => {
    // 🔴 ESTRATEGIA: Como no podemos hacer un 'LIKE' en nombres de colección en cliente,
    // definimos las colecciones que sabemos que existen y cumplen el patrón.
    // Si creas una nueva, solo agrégala a este array.
    const collectionsToWatch = ["reportes_app", "reportes_ejercicios", "reportes_rutinas", "bugs", "errores"];
    
    const unsubscribes: (() => void)[] = [];
    const allReportsMap = new Map<string, ReporteApp>();

    const updateCombinedBugs = () => {
      const combined = Array.from(allReportsMap.values());
      
      combined.sort((a, b) => {
        const timeA = a.fechaReporte?.toMillis ? a.fechaReporte.toMillis() : (a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0);
        const timeB = b.fechaReporte?.toMillis ? b.fechaReporte.toMillis() : (b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0);
        return timeB - timeA;
      });

      setBugs(combined);
      setLoading(false);
    };

    collectionsToWatch.forEach(colName => {
      // Intentamos conectar
      try {
        const q = query(collection(db, colName));
        const unsub = onSnapshot(q, (snapshot) => {
          snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            allReportsMap.set(`${colName}_${docSnap.id}`, {
              id: docSnap.id,
              estado: data.estado || "pendiente",
              comentario: data.comentario || data.descripcion || data.mensaje || "Sin descripción",
              usuarioUid: data.usuarioUid || data.uid || "Anónimo",
              ...data,
              sourceCollection: colName
            });
          });
          updateCombinedBugs();
        });
        unsubscribes.push(unsub);
      } catch (e) {
        console.warn(`No se pudo conectar a la colección: ${colName}`);
      }
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const toggleEstadoBug = async (bug: ReporteApp) => {
    const nuevoEstado = bug.estado === "pendiente" ? "revisado" : "pendiente";
    const targetCollection = bug.sourceCollection || "reportes_app";
    
    try {
      await updateDoc(doc(db, targetCollection, bug.id), {
        estado: nuevoEstado
      });
    } catch (error) {
      console.error("Error al actualizar:", error);
    }
  };

  const formatearFecha = (bug: ReporteApp) => {
    let date = null;
    if (bug.fechaReporte?.toDate) {
      date = bug.fechaReporte.toDate();
    } else if (bug.fechaRegistro) {
      date = new Date(bug.fechaRegistro);
    }
    return date ? date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : "Fecha desconocida";
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-4 sm:pt-8 animate-in fade-in duration-300 pb-20 px-6">
      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6 shrink-0">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-4">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Volver al Panel</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-amber-500 flex items-center gap-3">
            REPORTE DE BUGS <Bug className="w-6 h-6" />
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-50">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          {bugs.length === 0 ? (
            <div className="text-center py-20 opacity-50"><CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4"/>Sistema Limpio</div>
          ) : (
            bugs.map(bug => (
              <div key={bug.id} className={`border rounded-2xl p-5 ${bug.estado === "pendiente" ? "bg-zinc-950 border-rose-500/30" : "bg-zinc-900/20 border-emerald-500/20"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black uppercase text-zinc-500">{bug.sourceCollection} • {formatearFecha(bug)}</span>
                    <h3 className="text-sm font-bold text-white mt-1">{bug.motivo || "Bug reportado"}</h3>
                    <p className="text-xs text-zinc-400 mt-2">"{bug.comentario}"</p>
                  </div>
                  <button 
                    onClick={() => toggleEstadoBug(bug)}
                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase ${bug.estado === "pendiente" ? "bg-rose-500 text-white" : "bg-emerald-500 text-black"}`}
                  >
                    {bug.estado === "pendiente" ? "Marcar Revisado" : "Reabrir"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}