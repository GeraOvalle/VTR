"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, Loader2, User, Search, Shield, X, Calendar, Activity } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function UsersModule({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setUsuarios(usersData);
      } catch (error) {
        console.error("Error al obtener usuarios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = usuarios.filter(u => 
    (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.nombres || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.rol || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-4 sm:pt-8 animate-in fade-in duration-300 pb-20 px-6">
      
      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6 shrink-0">
        <div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Volver al Panel</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-3">
            CONTROL DE USUARIOS <Users className="w-6 h-6" />
          </h1>
          <p className="text-[11px] text-zinc-400 font-medium mt-2">
            Base de datos completa. Total registrados: <span className="text-white font-bold">{usuarios.length}</span>
          </p>
        </div>
      </div>

      <div className="relative mb-6 shrink-0 z-10">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Buscar por usuario, nombre o rol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-50">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white">Cargando base de datos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          {filteredUsers.map(user => (
            <div 
              key={user.uid} 
              onClick={() => setSelectedUser(user)}
              className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 hover:border-cyan-500/50 transition-colors cursor-pointer group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-black border border-zinc-800 flex items-center justify-center shrink-0">
                {user.fotoPerfil ? (
                  <img src={user.fotoPerfil} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-white truncate">@{user.username || "sin_usuario"}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                    user.rol === "admin" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                    user.rol === "entrenador" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    user.rol === "tester" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                    "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                    {user.rol || "clasico"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="col-span-full py-10 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
              No se encontraron usuarios.
            </div>
          )}
        </div>
      )}

      {/* MODAL DEL USUARIO (POP-UP) */}
      {selectedUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-cyan-500/30 rounded-3xl w-full max-w-md flex flex-col shadow-[0_0_80px_rgba(34,211,238,0.15)] overflow-hidden max-h-[85vh]">
            
            <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50 shrink-0 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-black border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-lg">
                  {selectedUser.fotoPerfil ? (
                    <img src={selectedUser.fotoPerfil} alt={selectedUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-zinc-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white truncate">@{selectedUser.username || "sin_usuario"}</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">{selectedUser.nombres} {selectedUser.apellidos}</p>
                  <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500 mt-1 block">ID: {selectedUser.uid}</span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-zinc-400 hover:text-white p-2 bg-black rounded-full transition-colors shrink-0 border border-white/5 relative z-10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                  <Shield className="w-4 h-4 text-cyan-500 mb-1" />
                  <span className="text-xs font-black text-white uppercase">{selectedUser.rol || "Clásico"}</span>
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Rol en App</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center justify-center text-center">
                  <Activity className="w-4 h-4 text-emerald-500 mb-1" />
                  <span className="text-xs font-black text-white uppercase">Activo</span>
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Estado Actual</span>
                </div>
              </div>

              <div>
                <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">Información Física</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black border border-zinc-800 p-2 rounded-lg text-center">
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">Peso</span>
                    <span className="text-xs font-black text-white">{selectedUser.peso ? `${selectedUser.peso} kg` : '-'}</span>
                  </div>
                  <div className="bg-black border border-zinc-800 p-2 rounded-lg text-center">
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">Altura</span>
                    <span className="text-xs font-black text-white">{selectedUser.altura ? `${selectedUser.altura} m` : '-'}</span>
                  </div>
                  <div className="bg-black border border-zinc-800 p-2 rounded-lg text-center">
                    <span className="text-[8px] text-zinc-500 block uppercase font-bold">Grasa</span>
                    <span className="text-xs font-black text-white">{selectedUser.grasa ? `${selectedUser.grasa}%` : '-'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">Objetivos</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.objetivos && selectedUser.objetivos.length > 0 ? (
                    selectedUser.objetivos.map((obj: string, i: number) => (
                      <span key={i} className="text-[9px] bg-white/5 text-zinc-300 border border-white/10 px-2 py-1 rounded uppercase font-bold tracking-widest">
                        {obj}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-600 italic">No definidos</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}