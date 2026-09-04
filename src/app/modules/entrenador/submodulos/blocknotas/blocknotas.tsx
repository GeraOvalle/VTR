"use client";

import { useState } from "react";
import { StickyNote, TableProperties, ChevronRight, BrainCircuit, Users, AlertTriangle } from "lucide-react";

// 🔴 IMPORTAMOS EL MÓDULO QUE ACABAMOS DE CREAR
import ListaClientesNotasModule from "./listaclientesnotas";

// (El muro general lo conectaremos en el siguiente paso)
// import NotasGeneralesModule from "./notasgenerales";

type TabNotas = "hub" | "muro_general" | "lista_clientes";

export default function BlockNotasModule() {
  const [activeTab, setActiveTab] = useState<TabNotas>("hub");

  // Si estamos en el muro general (Aún pendiente)
  // if (activeTab === "muro_general") return <NotasGeneralesModule onBack={() => setActiveTab("hub")} />;
  
  // 🔴 CONECTAMOS LA PANTALLA DE CLIENTES
  if (activeTab === "lista_clientes") {
    return <ListaClientesNotasModule onBack={() => setActiveTab("hub")} />;
  }

  // 🔴 MODO "HUB" (Pantalla Principal de Selección)
  return (
    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <StickyNote className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            Block de Notas
          </h2>
          <p className="text-[10px] sm:text-xs text-zinc-400 font-medium mt-2 max-w-lg">
            Tu espacio personal seguro. Guarda ideas rápidas o lleva el control milimétrico de las sesiones presenciales de tus clientes.
          </p>
        </div>
      </div>

      {/* AVISO DE AUTOGUARDADO (Da tranquilidad al usuario) */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 flex items-start gap-3">
        <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[10px] sm:text-xs font-black text-amber-500 uppercase tracking-widest mb-1">
            Sistema Local-First Activo
          </h4>
          <p className="text-[9px] sm:text-[10px] text-amber-500/80 leading-relaxed font-medium">
            Todo lo que escribas aquí se guarda instantáneamente en la memoria de tu dispositivo y se sincroniza con la nube en segundo plano. <strong>A prueba de fallos de internet.</strong>
          </p>
        </div>
      </div>

      {/* OPCIONES PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 flex-1 content-start">
        
        {/* OPCIÓN 1: MURO GENERAL */}
        <button 
          onClick={() => setActiveTab("muro_general")}
          className="bg-zinc-900/50 backdrop-blur-md border border-white/10 hover:border-amber-500/50 rounded-[2rem] p-6 sm:p-8 flex flex-col items-start text-left group transition-all duration-300 hover:bg-zinc-900 shadow-lg hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 sm:p-4 rounded-2xl mb-6 relative z-10 group-hover:scale-110 transition-transform">
            <StickyNote className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
          </div>
          
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest mb-2 relative z-10">
            Muro de Ideas
          </h3>
          <p className="text-[10px] sm:text-xs text-zinc-400 font-medium leading-relaxed mb-8 flex-1 relative z-10">
            Tablero de notas estilo Post-it. Úsalo para recordatorios, ideas de rutinas futuras, conceptos de entrenamiento o tareas pendientes.
          </p>
          
          <div className="w-full flex items-center justify-between border-t border-white/10 pt-4 mt-auto relative z-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Abrir Muro</span>
            <div className="bg-white/5 p-2 rounded-full group-hover:bg-amber-500 group-hover:text-black transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* OPCIÓN 2: EXPEDIENTES EXCEL */}
        <button 
          onClick={() => setActiveTab("lista_clientes")}
          className="bg-zinc-900/50 backdrop-blur-md border border-white/10 hover:border-cyan-500/50 rounded-[2rem] p-6 sm:p-8 flex flex-col items-start text-left group transition-all duration-300 hover:bg-zinc-900 shadow-lg hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-colors"></div>
          
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 sm:p-4 rounded-2xl mb-6 relative z-10 group-hover:scale-110 transition-transform flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
            <span className="text-cyan-500 font-bold">+</span>
            <TableProperties className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500" />
          </div>
          
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-widest mb-2 relative z-10">
            Bitácoras Presenciales
          </h3>
          <p className="text-[10px] sm:text-xs text-zinc-400 font-medium leading-relaxed mb-8 flex-1 relative z-10">
            Tablas dinámicas por cliente. Registra pesos, RPE/RIR y observaciones en vivo durante tus entrenamientos presenciales. Conectado al catálogo de ejercicios.
          </p>
          
          <div className="w-full flex items-center justify-between border-t border-white/10 pt-4 mt-auto relative z-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Ver Clientes</span>
            <div className="bg-white/5 p-2 rounded-full group-hover:bg-cyan-500 group-hover:text-black transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>

      </div>
      
    </div>
  );
}