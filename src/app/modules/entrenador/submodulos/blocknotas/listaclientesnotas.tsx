"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search, UserPlus, User, Loader2, Dumbbell, ShieldAlert, X, Activity } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// Importaremos este en el siguiente paso
 import ClienteDashboardNotas from "./clientedashboard";

interface ListaClientesNotasProps {
  onBack: () => void;
}

export default function ListaClientesNotasModule({ onBack }: ListaClientesNotasProps) {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para el Cliente Fantasma (Offline)
  const [showAddOffline, setShowAddOffline] = useState(false);
  const [offlineName, setOfflineName] = useState("");
  const [offlineGoal, setOfflineGoal] = useState("");
  const [savingOffline, setSavingOffline] = useState(false);

  // Estado de navegación profunda
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  useEffect(() => {
    const fetchAllClients = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // 1. Traer Clientes Reales (VTR App)
        const qReales = query(
          collection(db, "users"),
          where("entrenadoresActivos", "array-contains", user.uid)
        );
        const snapReales = await getDocs(qReales);
        const reales = snapReales.docs.map(doc => ({
          uid: doc.id,
          tipo: "vtr_app",
          ...(doc.data() as any) // 🔴 Indicamos a TypeScript que acepte datos dinámicos
        }));

        // 2. Traer Clientes Offline (Fantasmas)
        const qOffline = collection(db, "users", user.uid, "clientes_offline");
        const snapOffline = await getDocs(qOffline);
        const offlines = snapOffline.docs.map(doc => ({
          uid: doc.id,
          tipo: "presencial_offline",
          ...(doc.data() as any) // 🔴 Indicamos a TypeScript que acepte datos dinámicos
        }));

        // 3. Fusionar y ordenar alfabéticamente
        // 🔴 Añadimos (a: any, b: any) para quitar el error de TypeScript
        const combinados = [...reales, ...offlines].sort((a: any, b: any) => {
          const nameA = (a.username || a.nombre || "").toLowerCase();
          const nameB = (b.username || b.nombre || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setClientes(combinados);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllClients();
  }, [showAddOffline]); 

  const handleCreateOfflineClient = async () => {
    if (!offlineName.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    setSavingOffline(true);
    try {
      await addDoc(collection(db, "users", user.uid, "clientes_offline"), {
        nombre: offlineName.trim(),
        objetivo: offlineGoal.trim() || "Sin definir",
        fechaCreacion: serverTimestamp(),
        fotoPerfil: null
      });
      setShowAddOffline(false);
      setOfflineName("");
      setOfflineGoal("");
    } catch (error) {
      console.error("Error creando cliente presencial:", error);
    } finally {
      setSavingOffline(false);
    }
  };

  // Si seleccionamos un cliente, abrimos su Dashboard de Notas (Lo crearemos en el siguiente paso)
   if (selectedClient) {
   return <ClienteDashboardNotas cliente={selectedClient} onBack={() => setSelectedClient(null)} />;
   }

  const filteredClients = clientes.filter(c => 
    (c.username || c.nombre || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-2">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Volver al Block</span>
          </button>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            Expedientes
          </h2>
        </div>
        
        <button 
          onClick={() => setShowAddOffline(true)}
          className="w-full sm:w-auto bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Cliente Presencial
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative mb-6 shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Buscar cliente de la app o presencial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* LISTA HÍBRIDA DE CLIENTES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sincronizando expedientes...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50 text-center">
            <User className="w-10 h-10 text-zinc-600 mb-3" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Sin Resultados</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredClients.map((cliente) => (
              <div 
                key={cliente.uid}
                onClick={() => setSelectedClient(cliente)}
                className="bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer group transition-all"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-black border border-zinc-700 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors">
                  {cliente.fotoPerfil ? (
                    <img src={cliente.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-zinc-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-white truncate group-hover:text-cyan-400 transition-colors">
                    {cliente.tipo === "vtr_app" ? `@${cliente.username}` : cliente.nombre}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                      cliente.tipo === "vtr_app" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}>
                      {cliente.tipo === "vtr_app" ? "App VTR" : "Presencial"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CREAR CLIENTE OFFLINE */}
      {showAddOffline && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(245,158,11,0.15)] overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" /> Nuevo Perfil Presencial
              </h3>
              <button onClick={() => setShowAddOffline(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-500/90 font-medium leading-relaxed">
                  Este perfil es <strong>100% privado</strong> y solo existe en tu base de datos para que lleves su registro en el gimnasio.
                </p>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 mb-1 block">Nombre del Cliente *</label>
                <input 
                  type="text" 
                  value={offlineName}
                  onChange={(e) => setOfflineName(e.target.value)}
                  placeholder="Ej. Roberto Martínez"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1 mb-1 block">Objetivo (Opcional)</label>
                <input 
                  type="text" 
                  value={offlineGoal}
                  onChange={(e) => setOfflineGoal(e.target.value)}
                  placeholder="Ej. Hipertrofia y técnica"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <button 
                onClick={handleCreateOfflineClient}
                disabled={savingOffline || !offlineName.trim()}
                className="w-full mt-2 bg-amber-500 text-black py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {savingOffline ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Expediente"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}