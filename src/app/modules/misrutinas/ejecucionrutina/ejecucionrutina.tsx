"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, ChevronDown, ChevronUp, Clock, Check, FileText, ArrowUp, ArrowDown, ListOrdered, Info, X, Dumbbell } from "lucide-react";

interface EjecucionRutinaProps {
  nombre: string;
  onNameChange?: (nombre: string) => void;
  ejercicios: any[];
  onUpdateEjercicios: (nuevosEjercicios: any[]) => void;
  onOpenAgregarEjercicios?: () => void; // Conexión lista para el siguiente módulo
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

export default function EjecucionRutinaModule({ nombre, onNameChange, ejercicios, onUpdateEjercicios, onOpenAgregarEjercicios }: EjecucionRutinaProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // El primero abierto por defecto para agilizar
  const [activeTipoDropdown, setActiveTipoDropdown] = useState<{ ejercicioIdx: number; serieIdx: number } | null>(null);
  const [activeDescansoDropdown, setActiveDescansoDropdown] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Eliminar Ejercicio completo de la sesión
  const eliminarEjercicio = (index: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia.splice(index, 1);
    onUpdateEjercicios(copia);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  // Reordenamiento en vivo (Subir y Bajar)
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

  // Modificadores de Ejercicio individual
  const actualizarEjercicio = (index: number, campo: string, valor: any) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[index][campo] = valor;
    onUpdateEjercicios(copia);
  };

  // Gestión de Series en Vivo (Añadir, Borrar, Modificar)
  const agregarSerie = (ejercicioIndex: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[ejercicioIndex].series.push({
      tipo: "normal", repsTipo: "fijas", reps: "10", minReps: "8", maxReps: "12", rir: "", descansoExtra: 0, pesoReal: "", repsReal: "", completado: false
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
    if (!copia[ejercicioIndex].series[serieIndex]) return;
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
        
        {/* Header Minimalista con Botón para Añadir Ejercicio en Vivo */}
        <div className="flex items-center justify-between mb-8 shrink-0 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              {nombre || "Sesión de Entrenamiento"}
              <button 
                onClick={() => setShowInfoModal(true)}
                className="text-zinc-500 hover:text-amber-400 transition-colors bg-zinc-900 rounded-full p-1"
                title="Ver glosario de series"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {onOpenAgregarEjercicios && (
              <button 
                onClick={onOpenAgregarEjercicios}
                className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Ejercicio
              </button>
            )}
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              {ejercicios.length} Ejercicios
            </span>
          </div>
        </div>

        {/* Lista Fluida de Ejercicios en Ejecución */}
        <div className="flex-1 pr-1 overflow-visible relative">
          {ejercicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                No hay ejercicios en esta sesión
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {ejercicios.map((ej, index) => {
                const isExpanded = expandedIndex === index;
                
                return (
                  <div 
                    key={`${ej.id}-${index}`} 
                    className={`border rounded-xl transition-all relative overflow-visible ${
                      isExpanded ? "border-rose-500/40 bg-zinc-900/40" : "border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700"
                    }`}
                    style={{ zIndex: isExpanded ? 50 - index : 10 }} 
                  >
                    
                    {/* Fila del Ejercicio (Cabecera acordeón con controles de orden y eliminación) */}
                    <div 
                      className="flex justify-between items-center py-3.5 px-4 cursor-pointer group"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-xs font-black text-rose-500 w-5">
                          {index + 1}.
                        </span>
                        {ej.gifUrl && (
                          <img src={ej.gifUrl} alt="" className="w-10 h-10 rounded-md bg-black object-cover border border-zinc-800" />
                        )}
                        <div>
                          <h3 className="text-xs font-bold text-white capitalize line-clamp-1">{ej.nombreEs || ej.nombre}</h3>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">
                            {ej.musculoEs || ej.musculoObjetivo} • <span className="text-rose-400">{ej.series?.length || 0} Series</span>
                          </p>
                        </div>
                      </div>

                      {/* Controles de orden/borrado en vivo + Contador */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[9px] bg-black/40 border border-zinc-800 text-zinc-400 px-2 py-1 rounded font-mono mr-2">
                          {ej.series?.filter((s: any) => s.completado).length || 0} / {ej.series?.length || 0}
                        </span>

                        <button 
                          onClick={() => moverEjercicio(index, "arriba")}
                          disabled={index === 0}
                          className="text-zinc-500 hover:text-white p-1 disabled:opacity-20 transition-colors"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => moverEjercicio(index, "abajo")}
                          disabled={index === ejercicios.length - 1}
                          className="text-zinc-500 hover:text-white p-1 disabled:opacity-20 transition-colors"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => eliminarEjercicio(index)}
                          className="text-zinc-500 hover:text-rose-500 p-1 transition-colors"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Desplegable de Ejecución (Pizarrón de Trabajo Completo) */}
                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 overflow-visible">
                        
                        {/* Nota Técnica */}
                        <div className="flex items-start gap-2 bg-black/40 p-3 rounded-lg border border-zinc-800/80 text-zinc-300 text-[11px]">
                          <FileText className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                          <textarea 
                            placeholder="Añadir nota técnica para la sesión..."
                            value={ej.nota || ""}
                            rows={1}
                            onChange={(e) => {
                              actualizarEjercicio(index, "nota", e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            className="w-full bg-transparent border-none text-[11px] text-zinc-300 focus:outline-none resize-none overflow-hidden placeholder:text-zinc-600"
                          />
                        </div>

                        {/* Descanso Base y Series */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1 relative z-10">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              Registro de Trabajo (Peso / Reps / RIR)
                            </span>
                            
                            {/* Selector de Descanso */}
                            <div className="relative">
                              <button 
                                onClick={() => {
                                  setActiveDescansoDropdown(activeDescansoDropdown === index ? null : index);
                                  setActiveTipoDropdown(null);
                                }}
                                className="text-[9px] font-bold text-zinc-400 hover:text-rose-400 flex items-center gap-1 uppercase tracking-widest transition-colors"
                              >
                                <Clock className="w-3 h-3 text-rose-500" />
                                Descanso: {formatearDescanso(ej.descansoSegundos || 90)}
                              </button>

                              {activeDescansoDropdown === index && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-[100] max-h-48 overflow-y-auto custom-scrollbar">
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

                          {/* Filas de Series en Vivo */}
                          <div className="space-y-2 overflow-visible">
                            {ej.series?.length === 0 ? (
                              <p className="text-[10px] text-zinc-600 py-2">Sin series configuradas.</p>
                            ) : (
                              ej.series?.map((serie: any, sIdx: number) => {
                                const tipoObj = TIPOS_SERIE.find(t => t.id === serie.tipo) || TIPOS_SERIE[0];
                                const numSerieNormal = obtenerNumeroSerieNormal(ej.series, sIdx);
                                const isCompletado = serie.completado;
                                const isDropdownOpen = activeTipoDropdown?.ejercicioIdx === index && activeTipoDropdown?.serieIdx === sIdx;

                                return (
                                  <div 
                                    key={sIdx} 
                                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all relative ${
                                      isCompletado 
                                        ? "bg-emerald-500/10 border-emerald-500/30 opacity-75" 
                                        : "bg-black/40 border-zinc-800/80 hover:border-zinc-700"
                                    }`}
                                    style={{ zIndex: isDropdownOpen ? 100 : 20 - sIdx }}
                                  >
                                    
                                    {/* Botón Tipo de Serie (Desplegable) */}
                                    <div className="relative shrink-0">
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
                                        <div className="absolute left-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-[100] overflow-hidden">
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

                                    {/* Meta Prescrita (Referencia) */}
                                    <div className="hidden sm:flex flex-col text-[9px] text-zinc-500 font-mono w-16 shrink-0">
                                      <span>Meta:</span>
                                      <span className="text-zinc-300 font-bold">
                                        {serie.repsTipo === "fijas" ? `${serie.reps}r` : `${serie.minReps}-${serie.maxReps}r`}
                                        {serie.rir !== "" && ` • RIR ${serie.rir}`}
                                      </span>
                                    </div>

                                    {/* Inputs de Trabajo Real (Peso y Reps) */}
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                      <div className="relative flex items-center">
                                        <input 
                                          type="number"
                                          placeholder="Peso (kg)"
                                          value={serie.pesoReal || ""}
                                          onChange={(e) => actualizarSerie(index, sIdx, "pesoReal", e.target.value)}
                                          className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white text-center focus:outline-none focus:border-rose-500 font-mono transition-colors placeholder:text-zinc-600"
                                        />
                                        <span className="absolute right-2 text-[9px] text-zinc-500 font-bold pointer-events-none hidden sm:inline">kg</span>
                                      </div>

                                      <div className="relative flex items-center">
                                        <input 
                                          type="number"
                                          placeholder="Reps"
                                          value={serie.repsReal || ""}
                                          onChange={(e) => actualizarSerie(index, sIdx, "repsReal", e.target.value)}
                                          className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white text-center focus:outline-none focus:border-rose-500 font-mono transition-colors placeholder:text-zinc-600"
                                        />
                                        <span className="absolute right-2 text-[9px] text-zinc-500 font-bold pointer-events-none hidden sm:inline">reps</span>
                                      </div>
                                    </div>

                                    {/* Botón de Completado */}
                                    <button
                                      onClick={() => actualizarSerie(index, sIdx, "completado", !isCompletado)}
                                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                                        isCompletado 
                                          ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105" 
                                          : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500"
                                      }`}
                                      title={isCompletado ? "Serie completada" : "Marcar como completada"}
                                    >
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    </button>

                                    {/* Borrar Serie individual */}
                                    <button 
                                      onClick={() => eliminarSerie(index, sIdx)}
                                      className="text-zinc-600 hover:text-rose-500 transition-colors shrink-0 p-1"
                                      title="Eliminar serie"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Botón Añadir Serie en Vivo */}
                          <button 
                            onClick={() => agregarSerie(index)}
                            className="mt-2 text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors relative z-0"
                          >
                            <Plus className="w-3 h-3" /> Añadir Serie
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>

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
              <div className="space-y-3">
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