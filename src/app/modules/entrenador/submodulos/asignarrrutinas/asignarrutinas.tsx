"use client";

import { useState, useEffect } from "react";
import { Search, User, Dumbbell, Loader2, X, PlusCircle, LayoutList } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// 🔴 IMPORTAMOS LOS NUEVOS SUBMÓDULOS
import GestionaRutinas from "./gestionarutinas";
import CrearAsignacion from "./crearasignacion";

export default function AsignarRutinasModule() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // ESTADO: Cliente seleccionado y Pestaña activa del Modal
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"asignar" | "ver_asignadas">("ver_asignadas");

  // OBTENER CLIENTES ACTIVOS EN TIEMPO REAL
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const qClientes = query(
      collection(db, "users"),
      where("entrenadoresActivos", "array-contains", user.uid)
    );

    const unsub = onSnapshot(qClientes, (snapshot) => {
      const activos = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      
      setClientes(activos);
      
      // 🔴 CORRECCIÓN DE RENDIMIENTO: Usamos el valor previo (prev) para no matar la conexión
      setClienteSeleccionado((prev: any | null) => {
        if (prev) {
          const updated = activos.find(c => c.uid === prev.uid);
          return updated ? updated : null;
        }
        return prev;
      });
      
      setLoading(false);
    });

    return () => unsub();
  }, []); // 🔴 Dependencias vacías: El socket se abre una sola vez

  const clientesFiltrados = clientes.filter(c => 
    c.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nombres?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const abrirModalCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setModalTab("ver_asignadas"); 
  };

  const cerrarModal = () => {
    setClienteSeleccionado(null);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 relative">
      
      {/* HEADER & BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar cliente para asignar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-white focus:bg-zinc-900 transition-all placeholder:text-zinc-600 shadow-inner"
          />
        </div>
      </div>

      {/* CUADRÍCULA DE TARJETAS (GRID) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 h-64">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Cargando clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 py-10 animate-in zoom-in-95 duration-500 h-64">
            <div className="bg-zinc-900/50 p-6 rounded-full mb-6 border border-zinc-800 ring-1 ring-white/5 shadow-2xl">
              <Dumbbell className="w-12 h-12 text-zinc-600" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">
              {searchTerm ? "No se encontraron clientes" : "Aún no tienes clientes activos"}
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium max-w-xs leading-relaxed mb-6">
              {searchTerm ? "Intenta buscar con otro término." : "Para asignar rutinas, primero necesitas clientes en tu equipo. Ve a la pestaña 'Clientes' para invitarlos."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clientesFiltrados.map((cliente) => (
              <div 
                key={cliente.uid} 
                onClick={() => abrirModalCliente(cliente)}
                className="bg-zinc-950/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-white/40 hover:bg-white/5 transition-all group shadow-[0_0_15px_rgba(0,0,0,0.3)] cursor-pointer text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 opacity-50"></div>
                <div className="w-14 h-14 bg-black rounded-full overflow-hidden border border-zinc-700 flex items-center justify-center shadow-inner group-hover:border-white/30 transition-colors">
                  {cliente.fotoPerfil ? (
                    <img src={cliente.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" />
                  )}
                </div>
                <div className="w-full">
                  <h4 className="text-white font-black text-xs truncate drop-shadow-md group-hover:scale-105 transition-transform">
                    @{cliente.username}
                  </h4>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1 truncate">
                    {cliente.nombres ? cliente.nombres.split(' ')[0] : 'Cliente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FULL-SCREEN (ESTACIÓN DE TRABAJO DE RUTINAS) */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 z-[500] bg-black flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          <div className="bg-zinc-950 border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-full overflow-hidden border border-white/20 shrink-0">
                {clienteSeleccionado.fotoPerfil ? (
                  <img src={clienteSeleccionado.fotoPerfil} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-zinc-500" /></div>
                )}
              </div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Gestionando a:</p>
                <h2 className="text-lg font-black text-white flex items-center gap-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  @{clienteSeleccionado.username}
                </h2>
              </div>
            </div>
            <button onClick={cerrarModal} className="p-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-full transition-colors hover:bg-zinc-800 active:scale-95">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-center border-b border-white/5 bg-zinc-950 px-4 shrink-0 shadow-xl relative z-10">
            <button 
              onClick={() => setModalTab("ver_asignadas")}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                modalTab === "ver_asignadas" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <LayoutList className="w-4 h-4" /> Rutinas Asignadas
              {modalTab === "ver_asignadas" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"></span>}
            </button>
            <button 
              onClick={() => setModalTab("asignar")}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                modalTab === "asignar" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Asignar Nueva
              {modalTab === "asignar" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"></span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-black p-6 sm:p-10 relative">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-10" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, rgba(0, 0, 0, 0.8) 70%, #000000 100%)`
            }}></div>

            <div className="w-full max-w-5xl mx-auto relative z-10 h-full flex flex-col">
              
              {/* 🔴 AQUI LLAMAMOS A LOS NUEVOS SUBMÓDULOS */}
              {modalTab === "ver_asignadas" && <GestionaRutinas cliente={clienteSeleccionado} goAsignar={() => setModalTab("asignar")} />}
              {modalTab === "asignar" && <CrearAsignacion cliente={clienteSeleccionado} onBack={() => setModalTab("ver_asignadas")} />}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}