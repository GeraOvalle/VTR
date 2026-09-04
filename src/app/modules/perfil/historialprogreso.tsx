"use client";

import { useState, useEffect } from "react";
// 🔴 Agregamos AlertTriangle y X para el modal de error
import { ArrowLeft, TrendingUp, Activity, Scale, Ruler, BarChart3, Loader2, AlertTriangle, X } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

// IMPORTAMOS LOS 13 MÓDULOS DE GRÁFICAS
import GraficaPeso from "./perfilprogreso/peso";
import GraficaGrasa from "./perfilprogreso/grasa";
import GraficaMusculo from "./perfilprogreso/musculo";
import GraficaBMI from "./perfilprogreso/bmi";
import GraficaCuello from "./perfilprogreso/cuello";
import GraficaHombros from "./perfilprogreso/hombros";
import GraficaPecho from "./perfilprogreso/pecho";
import GraficaBiceps from "./perfilprogreso/bicep";
import GraficaAntebrazo from "./perfilprogreso/antebrazo";
import GraficaCintura from "./perfilprogreso/cintura";
import GraficaCadera from "./perfilprogreso/cadera";
import GraficaMuslo from "./perfilprogreso/muslo";
import GraficaPantorrilla from "./perfilprogreso/pantorrilla";

interface HistorialProgresoProps {
  onBack: () => void;
}

const CACHE_KEY = "cv_progreso_corporal_cache";

export default function HistorialProgreso({ onBack }: HistorialProgresoProps) {
  const [loading, setLoading] = useState(true);
  const [datosProgreso, setDatosProgreso] = useState<any[]>([]);
  // 🔴 ESTADO DEL MODAL GLOBAL
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const fetchDatosFirebase = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setDatosProgreso(JSON.parse(cachedData));
        setLoading(false);
        return;
      }

      try {
        const progresoRef = collection(db, "users", user.uid, "progreso_corporal");
        const q = query(progresoRef, orderBy("fecha", "asc"));
        const querySnapshot = await getDocs(q);

        let formattedData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            fecha: data.fecha,
            peso: data.peso,
            grasa: data.grasa,
            musculo: data.musculo,
            bmi: data.bmi,
            cuello: data.medidas?.cuello,
            hombros: data.medidas?.hombros,
            pecho: data.medidas?.pecho,
            biceps: data.medidas?.biceps,
            antebrazo: data.medidas?.antebrazo,
            cintura: data.medidas?.cintura,
            cadera: data.medidas?.cadera,
            muslo: data.medidas?.muslo,
            pantorrilla: data.medidas?.pantorrilla,
          };
        });

        if (formattedData.length === 1) {
          formattedData = [
            { ...formattedData[0], fecha: "Inicio" },
            { ...formattedData[0], fecha: "Actual" }
          ];
        }

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
        setDatosProgreso(formattedData);

      } catch (error) {
        console.error("Error cargando el progreso de Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatosFirebase();
  }, []);

  const metricasComposicion = [
    { id: "peso", label: "Peso Corporal", unit: "kg", icon: Scale, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", Componente: GraficaPeso },
    { id: "grasa", label: "Grasa Corporal", unit: "%", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", Componente: GraficaGrasa },
    { id: "musculo", label: "Masa Muscular", unit: "%", icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", Componente: GraficaMusculo },
    { id: "bmi", label: "Índice de Masa (BMI)", unit: "pts", icon: BarChart3, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", Componente: GraficaBMI }
  ];

  const circunferencias = [
    { id: "cuello", label: "Cuello", Componente: GraficaCuello },
    { id: "hombros", label: "Hombros", Componente: GraficaHombros },
    { id: "pecho", label: "Pecho", Componente: GraficaPecho },
    { id: "biceps", label: "Bíceps", Componente: GraficaBiceps },
    { id: "antebrazo", label: "Antebrazo", Componente: GraficaAntebrazo },
    { id: "cintura", label: "Cintura", Componente: GraficaCintura },
    { id: "cadera", label: "Cadera", Componente: GraficaCadera },
    { id: "muslo", label: "Muslo", Componente: GraficaMuslo },
    { id: "pantorrilla", label: "Pantorrilla", Componente: GraficaPantorrilla }
  ];

  return (
    <main className="min-h-screen bg-black text-white p-3 sm:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30 pb-24 sm:pb-32">
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>

      <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col">
        
        <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-white/10 pb-3 sm:pb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Volver al Perfil</span>
          </button>
          <h1 className="text-lg sm:text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            PROGRESO FÍSICO
          </h1>
        </div>

        {/* 🔴 BOTÓN ÚNICO DE REPORTE DE ERRORES */}
        <div className="flex justify-end mb-6 sm:mb-8">
          <button
            onClick={() => setShowErrorModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 backdrop-blur-sm transition-all duration-300 group shadow-lg"
          >
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">
              Reportar Anomalías
            </span>
          </button>
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] animate-pulse">Obteniendo analíticas...</p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-500">
            
            {/* SECCIÓN 1: COMPOSICIÓN CORPORAL */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/5 pb-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-zinc-300">Composición Corporal</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {metricasComposicion.map((metrica) => (
                  <div key={metrica.id} className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 flex flex-col hover:border-zinc-700 transition-colors shadow-[0_0_20px_-10px_rgba(0,0,0,0.5)] group">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`${metrica.bg} border ${metrica.border} p-1.5 rounded-lg`}>
                          <metrica.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${metrica.color}`} />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-zinc-300">{metrica.label}</span>
                      </div>
                      {metrica.unit && <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">{metrica.unit}</span>}
                    </div>
                    
                    <div className="flex-1 bg-black/40 border border-zinc-800/50 rounded-lg sm:rounded-xl min-h-[140px] sm:min-h-[160px] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent pointer-events-none z-10"></div>
                      <metrica.Componente data={datosProgreso} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECCIÓN 2: CIRCUNFERENCIAS */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/5 pb-2">
                <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-zinc-300">Antropometría (Circunferencias)</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {circunferencias.map((zona) => (
                  <div key={zona.id} className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 flex flex-col hover:border-zinc-700 transition-colors shadow-[0_0_20px_-10px_rgba(0,0,0,0.5)] group">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-zinc-900 border border-zinc-700 p-1.5 rounded-lg">
                          <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-zinc-300">{zona.label}</span>
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">cm</span>
                    </div>
                    
                    <div className="flex-1 bg-black/40 border border-zinc-800/50 rounded-lg sm:rounded-xl min-h-[120px] sm:min-h-[140px] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent pointer-events-none z-10"></div>
                      <zona.Componente data={datosProgreso} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </div>

      {/* 🔴 MODAL ÚNICO DE REPORTE DE ERRORES */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-[0_0_60px_-10px_rgba(255,255,255,0.05)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-widest">Reportar Anomalía</h3>
              </div>
              <button onClick={() => setShowErrorModal(false)} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                Describe el problema que encontraste en tu historial. ¿Se borraron datos? ¿Las fechas no cuadran? ¿Hay picos irreales en las gráficas?
              </p>
              <textarea 
                rows={5} 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors custom-scrollbar" 
                placeholder="Ej: Registré 80kg ayer pero la gráfica dice 85kg en la semana actual..."
              ></textarea>
            </div>
            <div className="p-4 sm:p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
              <button onClick={() => setShowErrorModal(false)} className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs sm:text-sm font-bold text-white transition-colors">
                Cancelar
              </button>
              <button className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-white text-zinc-950 text-xs sm:text-sm font-black uppercase tracking-widest hover:scale-105 transition-all">
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}