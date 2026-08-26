"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Loader2, Dumbbell, Trash2, Edit2 } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, onSnapshot, deleteDoc, doc, where } from "firebase/firestore";

// 🔴 IMPORTAMOS EL MÓDULO DE CREACIÓN/EDICIÓN
import CreacionRutinaModule from "../../../misrutinas/creacionrutina/creacionrutina";

interface GestionaRutinasProps {
  cliente: any;
  goAsignar: () => void;
}

export default function GestionaRutinas({ cliente, goAsignar }: GestionaRutinasProps) {
  const [rutinas, setRutinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🔴 ESTADO PARA CONTROLAR SI ESTAMOS EDITANDO
  const [isEditing, setIsEditing] = useState(false);

  // Escuchar SOLO las rutinas asignadas por este entrenador
  useEffect(() => {
    const user = auth.currentUser;
    if (!cliente?.uid || !user) return;

    const q = query(
      collection(db, "users", cliente.uid, "rutinas"),
      where("asignadaPor", "==", user.uid)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRutinas(data);
      setLoading(false);
    });

    return () => unsub();
  }, [cliente.uid]);

  const handleEliminarRutina = async (idRutina: string) => {
    if(!confirm("¿Estás seguro de que quieres borrar esta rutina del cliente?")) return;
    try {
      await deleteDoc(doc(db, "users", cliente.uid, "rutinas", idRutina));
    } catch (error) {
      console.error("Error al eliminar", error);
      alert("Error al borrar rutina. Revisa los permisos.");
    }
  };

  // 🔴 FUNCIÓN PARA ABRIR LA EDICIÓN
  const handleEditarRutina = (rutina: any) => {
    // Inyectamos los datos en el sessionStorage para que el Creador los recoja
    sessionStorage.setItem("cv_asignada_edit_rutina_id", rutina.id);
    sessionStorage.setItem("cv_asignada_draft_nombre", rutina.nombre || "");
    sessionStorage.setItem("cv_asignada_draft_ejercicios", JSON.stringify(rutina.ejercicios || []));
    setIsEditing(true);
  };

  // Si estamos editando, mostramos el Creador a pantalla completa
  if (isEditing) {
    return (
      <div className="absolute inset-0 z-50 bg-black animate-in fade-in slide-in-from-bottom-5 duration-300">
        <CreacionRutinaModule 
          onBack={() => setIsEditing(false)} 
          tipoRutina="asignada"
          targetUserId={cliente.uid} // Fundamental para que guarde en el cliente y no en tu perfil
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-50">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest">Cargando Rutinas...</p>
      </div>
    );
  }

  if (rutinas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
        <div className="bg-white/5 border border-white/10 p-6 rounded-full mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          <ClipboardList className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3 drop-shadow-md">
          Sin Rutinas
        </h3>
        <p className="text-[11px] text-zinc-400 font-medium max-w-md leading-relaxed mb-8">
          Aún no le has asignado ninguna rutina a @{cliente.username}.
        </p>
        <button 
          onClick={goAsignar}
          className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          Asignar la primera
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rutinas.map(rutina => (
          <div key={rutina.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(0,0,0,0.5)] group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-black text-white truncate drop-shadow-md">{rutina.nombre}</h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  {rutina.ejercicios?.length || 0} Ejercicios
                </p>
              </div>
              <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 🔴 NUEVO: Botón de Editar */}
                <button 
                  onClick={() => handleEditarRutina(rutina)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors bg-black rounded-lg border border-white/5"
                  title="Editar rutina"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEliminarRutina(rutina.id)}
                  className="p-2 text-zinc-400 hover:text-rose-500 transition-colors bg-black rounded-lg border border-white/5"
                  title="Borrar del cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
              {rutina.ejercicios?.slice(0, 4).map((ej: any, idx: number) => (
                <div key={idx} className="shrink-0 bg-black/50 border border-white/5 px-2 py-1 rounded text-[8px] text-zinc-400 truncate max-w-[80px]">
                  {ej.nombreEs || ej.nombre}
                </div>
              ))}
              {rutina.ejercicios?.length > 4 && (
                <div className="shrink-0 bg-black/50 border border-white/5 px-2 py-1 rounded text-[8px] text-white font-bold">
                  +{rutina.ejercicios.length - 4}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}