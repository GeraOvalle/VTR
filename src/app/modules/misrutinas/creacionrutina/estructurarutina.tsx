"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Trash2, Plus, ChevronDown, ChevronUp, Clock, Check, FileText, 
  ArrowUp, ArrowDown, ListOrdered, Info, X, BrainCircuit, Dumbbell, Eye 
} from "lucide-react";
import { auth, db } from "../../../lib/firebase"; 
import { collection, query, where, getDocs } from "firebase/firestore";
import AsistenteCreacionModule from "./asistentecreacion";
import DetallesEjercicio from "./detallesejercicio"; 

interface EstructuraRutinaProps {
  nombre: string;
  onNameChange: (nombre: string) => void;
  ejercicios: any[];
  onUpdateEjercicios: (nuevosEjercicios: any[]) => void;
  targetUserId?: string; 
}

const TIPOS_SERIE = [
  { id: "normal", label: "Normal", badge: "N", color: "text-zinc-300 bg-zinc-800", desc: "Serie estándar de trabajo con descanso completo." },
  { id: "calentamiento", label: "Calentamiento", badge: "W", color: "text-amber-400 bg-amber-500/10", desc: "Peso muy ligero. Enfocado en movilidad, flujo sanguíneo y técnica (Warm-up)." },
  { id: "aproximacion", label: "Aproximación", badge: "A", color: "text-blue-400 bg-blue-500/10", desc: "Subida progresiva de peso para preparar el sistema nervioso antes del peso real." },
  { id: "topset", label: "Top Set", badge: "T", color: "text-rose-400 bg-rose-500/10", desc: "Serie máxima. La más pesada y exigente, llevada muy cerca o hasta el fallo muscular." },
  { id: "dropset", label: "Drop Set", badge: "D", color: "text-purple-400 bg-purple-500/10", desc: "Serie al fallo seguida inmediatamente de una reducción de peso (20-30%) para volver al fallo sin descanso." },
  { id: "restpause", label: "Rest-Pause", badge: "R", color: "text-emerald-400 bg-emerald-500/10", desc: "Serie al fallo seguida de micro-descansos (10-15s) para sacar repeticiones extra con el mismo peso." },
];

const OPCIONES_DESCANSO = Array.from({ length: 37 }, (_, i) => i * 5);

const formatearDescanso = (segundos: number) => {
  if (segundos === 0) return "0s";
  const mins = Math.floor(segundos / 60);
  const segs = segundos % 60;
  if (mins === 0) return `${segs}s`;
  if (segs === 0) return `${mins}m`;
  return `${mins}m ${segs}s`;
};

export default function EstructuraRutina({ nombre, onNameChange, ejercicios, onUpdateEjercicios, targetUserId }: EstructuraRutinaProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeTipoDropdown, setActiveTipoDropdown] = useState<{ ejercicioIdx: number; serieIdx: number } | null>(null);
  const [activeDescansoDropdown, setActiveDescansoDropdown] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  
  const [ejercicioSeleccionadoDetalle, setEjercicioSeleccionadoDetalle] = useState<any | null>(null);
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  
  // ESTADO PARA EL HISTORIAL (Pesos Anteriores)
  const [historial, setHistorial] = useState<Record<string, any[]>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);

  // VARIABLE BOOLEANA PARA SABER SI ESTAMOS VIENDO EL HISTORIAL DE UN CLIENTE
  const isAssigningToClient = targetUserId && targetUserId !== auth.currentUser?.uid;

  // EFECTO PARA BUSCAR EL HISTORIAL DE CADA EJERCICIO
  const ejerciciosIds = ejercicios.map(ej => ej.id).join(',');

  useEffect(() => {
    const fetchHistorial = async () => {
      // LÓGICA INTELIGENTE: Si hay targetUserId (cliente), usa ese. Si no, usa el del Coach.
      const uidToFetch = targetUserId || auth.currentUser?.uid;
      if (!uidToFetch) return;

      const nuevoHistorial = { ...historial };
      let huboCambios = false;

      for (const ej of ejercicios) {
        if (!ej.id || nuevoHistorial[ej.id]) continue; 

        try {
          const q = query(
            collection(db, "users", uidToFetch, "pesosregistro"),
            where("ejercicioId", "==", ej.id)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            const registros = snap.docs.map(d => d.data());
            registros.sort((a, b) => {
              const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
              const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
              return timeB - timeA; 
            });

            nuevoHistorial[ej.id] = registros[0].series || [];
          } else {
            nuevoHistorial[ej.id] = []; 
          }
          huboCambios = true;
        } catch (error) {
          console.error("Error obteniendo historial para", ej.id, error);
        }
      }

      if (huboCambios) {
        setHistorial(nuevoHistorial);
      }
    };

    fetchHistorial();
  }, [ejerciciosIds, targetUserId]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveTipoDropdown(null);
        setActiveDescansoDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔴 CLONACIÓN PROFUNDA APLICADA A TODAS LAS FUNCIONES MUTADORAS
  const eliminarEjercicio = (index: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia.splice(index, 1);
    onUpdateEjercicios(copia);
  };

  const moverEjercicio = (index: number, direccion: "arriba" | "abajo") => {
    const nuevoIndex = direccion === "arriba" ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= ejercicios.length) return;

    const copia = JSON.parse(JSON.stringify(ejercicios));
    const [movido] = copia.splice(index, 1);
    copia.splice(nuevoIndex, 0, movido);
    onUpdateEjercicios(copia);

    if (expandedIndex === index) setExpandedIndex(nuevoIndex);
    else if (expandedIndex === nuevoIndex) setExpandedIndex(index);
  };

  const actualizarEjercicio = (index: number, campo: string, valor: any) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[index][campo] = valor;
    onUpdateEjercicios(copia);
  };

  const agregarSerie = (ejercicioIndex: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    if (!copia[ejercicioIndex].series) copia[ejercicioIndex].series = [];
    
    copia[ejercicioIndex].series.push({
      tipo: "normal", repsTipo: "fijas", reps: "10", minReps: "8", maxReps: "12", rir: "", descansoExtra: 0, peso: "" 
    });
    onUpdateEjercicios(copia);
  };

  const eliminarSerie = (ejercicioIndex: number, serieIndex: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[ejercicioIndex].series.splice(serieIndex, 1);
    onUpdateEjercicios(copia);
  };

  const actualizarSerie = (ejercicioIndex: number, serieIndex: number, campo: string, valor: any) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[ejercicioIndex].series[serieIndex][campo] = valor;
    onUpdateEjercicios(copia);
  };

  const obtenerNumeroSerieNormal = (series: any[], currentIndex: number) => {
    let contador = 0;
    for (let i = 0; i <= currentIndex; i++) {
      if (series[i].tipo === "normal") contador++;
    }
    return contador;
  };

  return (
    <>
      <div className="relative z-40 bg-zinc-950/85 backdrop-blur-md border border-rose-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(244,63,94,0.05)] flex flex-col" ref={dropdownRef}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 gap-4">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              Estructura
              <button 
                onClick={() => setShowInfoModal(true)}
                className="text-zinc-500 hover:text-amber-400 transition-colors bg-zinc-900 rounded-full p-1"
                title="Ver glosario de series"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </h2>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              {ejercicios.length} Ejercicios
            </span>
            <button 
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
                showAIPanel 
                  ? "bg-rose-500 text-white border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]" 
                  : "bg-white/10 text-white hover:bg-white/20 border-white/20"
              }`}
            >
              <BrainCircuit className="w-4 h-4 text-rose-500" /> 
              {showAIPanel ? "Cerrar a VIPER" : "Activar a VIPER"}
            </button>
          </div>
        </div>

        {/* Input Nombre */}
        <div className="mb-6 shrink-0 relative z-10">
          <input 
            type="text" 
            placeholder="Nombre de la rutina (Ej. Torso Hipertrofia)..." 
            value={nombre}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-800 pb-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-zinc-600 font-medium" 
          />
        </div>

        {/* COMPONENTE INDEPENDIENTE VIPER */}
        {showAIPanel && (
          <AsistenteCreacionModule 
            onInyectarEjercicios={(nuevos) => onUpdateEjercicios(nuevos)}
            onClose={() => setShowAIPanel(false)}
          />
        )}

        {/* Lista Fluida de Ejercicios */}
        <div className="flex-1 pr-1 overflow-visible relative">
          {ejercicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                Tu rutina está vacía
              </p>
              <p className="text-[10px] text-zinc-600 mt-2">Agrega ejercicios desde el selector o activa a VIPER.</p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              {ejercicios.map((ej, index) => {
                const isExpanded = expandedIndex === index;
                const hasFailed = failedImages[ej.id || index];
                
                // EXTRAEMOS EL HISTORIAL DE ESTE EJERCICIO
                const seriesAnteriores = historial[ej.id] || [];
                
                return (
                  <div 
                    key={`${ej.id}-${index}`} 
                    className="border-b border-zinc-800/50 last:border-0 transition-all relative"
                    style={{ zIndex: isExpanded ? 50 - index : 10 }} 
                  >
                    
                    <div 
                      className="flex justify-between items-center py-3 px-2 -mx-2 hover:bg-white/[0.02] rounded-lg transition-colors cursor-pointer group"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-[10px] font-black text-zinc-600 w-4 group-hover:text-rose-500 transition-colors">
                          {index + 1}.
                        </span>
                        
                        <div className="w-8 h-8 rounded-md bg-black/40 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                          {ej.gifUrl && !hasFailed ? (
                            <img 
                              src={ej.gifUrl} 
                              alt="" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                              onError={() => setFailedImages(prev => ({ ...prev, [ej.id || index]: true }))}
                            />
                          ) : (
                            <Dumbbell className="w-4 h-4 text-zinc-600" />
                          )}
                          {/* Marca de Ejercicio Personalizado en miniatura */}
                          {ej.isCustom && (
                             <div className="absolute bottom-0 right-0 bg-cyan-500 w-2 h-2 rounded-tl-sm"></div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-white capitalize line-clamp-1">{ej.nombreEs || ej.nombre}</h3>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">
                            {ej.series?.length || 0} Series • {ej.musculoEs || ej.musculoObjetivo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEjercicioSeleccionadoDetalle(ej); }}
                          className="text-zinc-500 hover:text-cyan-400 p-1.5 transition-colors"
                          title="Ver detalles del ejercicio"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); moverEjercicio(index, "arriba"); }}
                          disabled={index === 0}
                          className="text-zinc-500 hover:text-white p-1.5 disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); moverEjercicio(index, "abajo"); }}
                          disabled={index === ejercicios.length - 1}
                          className="text-zinc-500 hover:text-white p-1.5 disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-3 bg-zinc-800 mx-1"></div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); eliminarEjercicio(index); }}
                          className="text-zinc-500 hover:text-rose-500 p-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <ChevronDown className={`w-4 h-4 text-zinc-600 ml-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {isExpanded && (
                      <div className="pl-1 sm:pl-10 pr-1 pb-5 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 relative z-20">
                        
                        {/* HEADER DEL DESCANSO GENERAL */}
                        <div className="flex items-center justify-between mb-2 px-2 bg-black/20 py-2 rounded-lg border border-zinc-800/50">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-zinc-600" /> Descanso Base:
                          </span>
                          <div className="relative">
                            <button 
                              onClick={() => {
                                setActiveDescansoDropdown(activeDescansoDropdown === index ? null : index);
                                setActiveTipoDropdown(null);
                              }}
                              className="text-[10px] font-bold text-zinc-300 hover:text-rose-400 bg-zinc-900 px-3 py-1 rounded border border-zinc-700 uppercase tracking-widest transition-colors"
                            >
                              {formatearDescanso(ej.descansoSegundos || 90)}
                            </button>

                            {activeDescansoDropdown === index && (
                              <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-zinc-700 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] max-h-48 overflow-y-auto custom-scrollbar">
                                {OPCIONES_DESCANSO.map(seg => (
                                  <button
                                    key={seg}
                                    onClick={() => {
                                      actualizarEjercicio(index, "descansoSegundos", seg);
                                      setActiveDescansoDropdown(null);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between hover:bg-white/5 transition-colors ${ej.descansoSegundos === seg ? "text-rose-400" : "text-zinc-400"}`}
                                  >
                                    <span>{formatearDescanso(seg)}</span>
                                    {ej.descansoSegundos === seg && <Check className="w-3 h-3 text-rose-500" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ÁREA DE NOTAS */}
                        <div className="flex items-start gap-2 relative z-0 bg-zinc-900/30 px-3 py-2.5 rounded-lg border border-zinc-800/30">
                          <FileText className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                          <textarea 
                            placeholder="Añadir nota técnica o instrucción (Ej: Baja en 3 segs)..."
                            value={ej.nota || ""}
                            rows={1}
                            onChange={(e) => {
                              actualizarEjercicio(index, "nota", e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            className="w-full bg-transparent border-none text-[11px] text-rose-300 focus:outline-none placeholder:text-zinc-600 resize-none overflow-hidden font-medium leading-relaxed"
                          />
                        </div>

                        {/* ENCABEZADOS DE LA TABLA */}
                        <div className="overflow-x-auto custom-scrollbar pb-2 mt-2">
                          <div className="min-w-[400px]">
                            {ej.series?.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">
                                <div className="w-5 text-center shrink-0">Set</div>
                                <div className="w-8 shrink-0 text-center">Tipo</div>
                                
                                {/* 🔴 COLUMNA ANTERIOR CON INDICADOR DE CLIENTE SI APLICA */}
                                <div className="flex-1 min-w-[55px] text-center shrink-0 text-emerald-500/70 border-x border-zinc-800/50 flex flex-col justify-center leading-none">
                                  <span>Anterior</span>
                                  {isAssigningToClient && <span className="text-[6px] opacity-70 mt-0.5 text-emerald-500/50">Del Cliente</span>}
                                </div>
                                
                                <div className="w-[45px] sm:w-[50px] text-center shrink-0">Peso Obj</div>
                                <div className="w-[65px] sm:w-[75px] text-center shrink-0">Reps Obj</div>
                                <div className="w-[40px] sm:w-[45px] text-center shrink-0">RIR</div>
                                <div className="w-[45px] text-center shrink-0">+Desc</div>
                                <div className="w-6 text-center shrink-0"></div>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {ej.series?.length === 0 ? (
                                <p className="text-[10px] text-zinc-600 py-2 text-center">No hay series configuradas.</p>
                              ) : (
                                ej.series?.map((serie: any, sIdx: number) => {
                                  const tipoObj = TIPOS_SERIE.find(t => t.id === serie.tipo) || TIPOS_SERIE[0];
                                  const numSerieNormal = obtenerNumeroSerieNormal(ej.series, sIdx);
                                  const isDropdownOpen = activeTipoDropdown?.ejercicioIdx === index && activeTipoDropdown?.serieIdx === sIdx;
                                  
                                  // DATOS DEL HISTORIAL
                                  const serieAnterior = seriesAnteriores[sIdx];
                                  const prevPeso = serieAnterior?.pesoReal || "-";
                                  const prevReps = serieAnterior?.repsReal || "-";

                                  return (
                                    <div 
                                      key={sIdx} 
                                      className="flex items-center gap-1.5 bg-zinc-900/40 p-1.5 rounded-lg border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors group/serie relative"
                                      style={{ zIndex: isDropdownOpen ? 100 : 20 - sIdx }}
                                    >
                                      
                                      {/* SET NUM */}
                                      <div className="w-5 text-center shrink-0 text-[10px] font-black text-zinc-600">
                                        {sIdx + 1}
                                      </div>
                                      
                                      {/* TIPO SERIE */}
                                      <div className="relative shrink-0 w-8 flex justify-center">
                                        <button 
                                          onClick={() => {
                                            setActiveTipoDropdown(isDropdownOpen ? null : { ejercicioIdx: index, serieIdx: sIdx });
                                            setActiveDescansoDropdown(null);
                                          }}
                                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-colors ${tipoObj.color}`}
                                          title="Cambiar tipo de serie"
                                        >
                                          {serie.tipo === "normal" ? numSerieNormal : tipoObj.badge}
                                        </button>

                                        {isDropdownOpen && (
                                          <div className="absolute left-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[100] overflow-hidden">
                                            {TIPOS_SERIE.map(t => (
                                              <button
                                                key={t.id}
                                                onClick={() => {
                                                  actualizarSerie(index, sIdx, "tipo", t.id);
                                                  setActiveTipoDropdown(null);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-colors ${serie.tipo === t.id ? "text-white bg-white/5" : "text-zinc-400"}`}
                                              >
                                                <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] ${t.color}`}>{t.badge}</span>
                                                {t.label}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* ANTERIOR (HISTORIAL) */}
                                      <div className="flex-1 flex flex-col items-center justify-center shrink-0 min-w-[55px] px-1 border-x border-zinc-800/50">
                                        <span className={`text-[10px] font-mono font-bold truncate max-w-[50px] ${serieAnterior ? 'text-emerald-500/80 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]' : 'text-zinc-600'}`}>
                                          {prevPeso} <span className="text-[8px] text-zinc-500/50">x</span> {prevReps}
                                        </span>
                                      </div>

                                      {/* PESO OBJETIVO */}
                                      <div className="w-[45px] sm:w-[50px] shrink-0 flex justify-center">
                                        <input 
                                          type="text" 
                                          value={serie.peso || ""} 
                                          onChange={(e) => actualizarSerie(index, sIdx, "peso", e.target.value)}
                                          placeholder="-"
                                          className="w-full bg-black/50 border border-zinc-700/50 text-[10px] font-bold text-center text-white focus:outline-none focus:border-rose-500 rounded py-1 transition-colors"
                                        />
                                      </div>

                                      {/* REPS */}
                                      <div className="w-[65px] sm:w-[75px] shrink-0 flex flex-col items-center gap-1">
                                        <select 
                                          value={serie.repsTipo}
                                          onChange={(e) => actualizarSerie(index, sIdx, "repsTipo", e.target.value)}
                                          className="bg-zinc-900 text-[8px] font-bold text-zinc-400 focus:outline-none cursor-pointer uppercase tracking-wider rounded border border-zinc-800 w-full text-center p-0.5"
                                        >
                                          <option value="fijas">Fijas</option>
                                          <option value="rango">Rango</option>
                                        </select>
                                        {serie.repsTipo === "fijas" ? (
                                          <input 
                                            type="text" 
                                            value={serie.reps}
                                            onChange={(e) => actualizarSerie(index, sIdx, "reps", e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-transparent text-[11px] font-bold text-center text-white focus:outline-none transition-colors"
                                          />
                                        ) : (
                                          <div className="flex items-center gap-0.5 w-full">
                                            <input 
                                              type="text" 
                                              value={serie.minReps}
                                              onChange={(e) => actualizarSerie(index, sIdx, "minReps", e.target.value)}
                                              placeholder="Min"
                                              className="w-full min-w-[20px] bg-transparent text-[11px] font-bold text-center text-white focus:outline-none transition-colors"
                                            />
                                            <span className="text-zinc-600 text-[10px]">-</span>
                                            <input 
                                              type="text" 
                                              value={serie.maxReps}
                                              onChange={(e) => actualizarSerie(index, sIdx, "maxReps", e.target.value)}
                                              placeholder="Max"
                                              className="w-full min-w-[20px] bg-transparent text-[11px] font-bold text-center text-white focus:outline-none transition-colors"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* RIR */}
                                      <div className="w-[40px] sm:w-[45px] shrink-0 flex justify-center">
                                        <input 
                                          type="text" 
                                          value={serie.rir || ""}
                                          onChange={(e) => actualizarSerie(index, sIdx, "rir", e.target.value)}
                                          placeholder="-"
                                          className="w-full bg-black/50 border border-zinc-700/50 text-[10px] font-bold text-center text-amber-400 focus:outline-none focus:border-amber-500 rounded py-1 transition-colors"
                                        />
                                      </div>

                                      {/* DESCANSO EXTRA */}
                                      <div className="w-[45px] shrink-0 flex justify-center">
                                        <select 
                                          value={serie.descansoExtra || 0}
                                          onChange={(e) => actualizarSerie(index, sIdx, "descansoExtra", Number(e.target.value))}
                                          className="bg-black/50 border border-zinc-700/50 text-[9px] font-bold text-zinc-400 focus:outline-none cursor-pointer w-full text-center rounded py-1"
                                        >
                                          <option value={0}>+0s</option>
                                          <option value={15}>+15s</option>
                                          <option value={30}>+30s</option>
                                          <option value={45}>+45s</option>
                                          <option value={60}>+1m</option>
                                        </select>
                                      </div>

                                      {/* ELIMINAR SERIE */}
                                      <div className="w-6 flex justify-center shrink-0">
                                        <button 
                                          onClick={() => eliminarSerie(index, sIdx)}
                                          className="text-zinc-600 hover:text-rose-500 transition-colors p-1 opacity-100 sm:opacity-0 sm:group-hover/serie:opacity-100"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => agregarSerie(index)}
                          className="mt-2 text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors relative z-0"
                        >
                          <Plus className="w-3 h-3" /> Añadir Serie
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>

      {/* MODAL PARA VER DETALLES DESDE LA ESTRUCTURA */}
      {ejercicioSeleccionadoDetalle && (
        <DetallesEjercicio 
          ejercicio={ejercicioSeleccionadoDetalle}
          onClose={() => setEjercicioSeleccionadoDetalle(null)}
          onAdd={(ej) => {
            onUpdateEjercicios([...ejercicios, ej]);
            setEjercicioSeleccionadoDetalle(null);
          }}
        />
      )}

      {/* MODAL DE INFORMACIÓN (GLOSARIO) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" /> Glosario de Series y RIR
              </h3>
              <button onClick={() => setShowInfoModal(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5 custom-scrollbar">
              
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">¿Qué es el RIR?</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong>Reps In Reserve</strong>. Es la cantidad de repeticiones extra que el usuario sintió que podía haber hecho antes de llegar al fallo muscular. <br/><br/>
                  <span className="text-white">Ejemplo:</span> Un RIR 1 significa dejar 1 repetición en el tanque. Un RIR 0 significa llegar al fallo absoluto. Es vital para controlar la intensidad.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-2">Tipos de Serie</h4>
                {TIPOS_SERIE.map(t => (
                  <div key={t.id} className="flex gap-3 items-start p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${t.color}`}>
                      {t.badge}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-white mb-0.5">{t.label}</h5>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}