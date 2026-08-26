"use client";

import { useState } from "react";
import { ArrowLeft, Database, ShieldAlert, Users } from "lucide-react";
import UsersModule from "./users";
import BugsModule from "./bugs";

export default function AdminModule({ onBack }: { onBack: () => void }) {
  const [adminView, setAdminView] = useState<"dashboard" | "users" | "bugs">("dashboard");

  // RENDERIZADO CONDICIONAL DE SUBMÓDULOS DEL ADMIN
  if (adminView === "users") return <UsersModule onBack={() => setAdminView("dashboard")} />;
  if (adminView === "bugs") return <BugsModule onBack={() => setAdminView("dashboard")} />;

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-4 sm:pt-8 animate-in fade-in duration-300 pb-20 px-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
        <div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Volver a la App</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-3">
            PANEL DE ADMINISTRACIÓN
            <Database className="w-6 h-6 md:w-8 md:h-8" />
          </h1>
          <p className="text-[11px] text-zinc-400 font-medium mt-2 max-w-lg">
            Centro de control global. Desde aquí puedes gestionar usuarios, roles, métricas de Firebase y reportes del sistema.
          </p>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* TARJETA 1: USUARIOS */}
        <div 
          onClick={() => setAdminView("users")}
          className="bg-zinc-950/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.05)] hover:border-cyan-500/50 transition-colors cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-cyan-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Control de Usuarios</h3>
              <p className="text-[10px] text-zinc-500 font-bold mt-1">Gestión, roles y estado de conexión</p>
            </div>
          </div>
        </div>

        {/* TARJETA 2: BUGS */}
        <div 
          onClick={() => setAdminView("bugs")}
          className="bg-zinc-950/80 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.05)] hover:border-amber-500/50 transition-colors cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-amber-500/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Reportes y Bugs</h3>
              <p className="text-[10px] text-zinc-500 font-bold mt-1">Resolución de tickets de usuarios</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}