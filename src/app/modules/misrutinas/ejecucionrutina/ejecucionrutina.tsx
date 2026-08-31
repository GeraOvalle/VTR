"use client";

import { useState, useEffect } from "react";
import { Check, Dumbbell, FileText, PenLine, PlusCircle, X, RefreshCw } from "lucide-react";
import { auth, db } from "../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Importamos los submódulos
import TipoSerie from "./complementosejecucion/tiposerie";
import PesoInput from "./complementosejecucion/peso";
import RepsInput from "./complementosejecucion/reps";
import RpeInput from "./complementosejecucion/rpe";
import CheckButton from "./complementosejecucion/check";
import DescansoTimer from "./complementosejecucion/timer";
import InstruccionesButton from "./complementosejecucion/instrucciones";
import AgregarSerieButton from "./complementosejecucion/agregarserie";
import BorrarSerieWrapper from "./complementosejecucion/borrarseries";
import OpcionesEjercicio from "./complementosejecucion/opcionesejercicio"; 
import VisorEjercicios from "../creacionrutina/visorejercicios";
import ReordenarRutina from "./complementosejecucion/reordenar";

// Importamos el Contexto Global del Reloj
import { useRestTimer } from "../../../context/resttimercontext";

interface EjecucionRutinaProps {
  nombre: string;
  ejercicios: any[];
  onUpdateEjercicios: (nuevosEjercicios: any[]) => void;
  onOpenAgregarEjercicios?: () => void;
}

const SUPERSERIE_COLORS = ["amber", "cyan", "emerald", "purple", "rose"];

export default function EjecucionRutinaModule({ ejercicios, onUpdateEjercicios, onOpenAgregarEjercicios }: EjecucionRutinaProps) {
  
  const { activeTimerInfo, setActiveTimerInfo, startTimer, stopTimer, isExtra: isGlobalExtra } = useRestTimer();
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  const [historial, setHistorial] = useState<Record<string, any[]>>({});

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [ejercicioToReplaceIndex, setEjercicioToReplaceIndex] = useState<number | null>(null);

  const [showReordenarModal, setShowReordenarModal] = useState(false);

  const ejerciciosIds = ejercicios.map(ej => ej.id).join(',');

  useEffect(() => {
    const fetchHistorial = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const nuevoHistorial = { ...historial };
      let huboCambios = false;

      for (const ej of ejercicios) {
        if (!ej.id || nuevoHistorial[ej.id]) continue;

        try {
          const q = query(
            collection(db, "users", user.uid, "pesosregistro"),
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
  }, [ejerciciosIds]); 

  const actualizarSerie = (ejercicioIndex: number, serieIndex: number, campo: string, valor: any) => {
    const copia = structuredClone(ejercicios);
    copia[ejercicioIndex].series[serieIndex][campo] = valor;
    onUpdateEjercicios(copia);
  };

  const actualizarEjercicio = (ejercicioIndex: number, campo: string, valor: any) => {
    const copia = structuredClone(ejercicios);
    copia[ejercicioIndex][campo] = valor;
    onUpdateEjercicios(copia);
  };

  const eliminarSerie = (ejercicioIndex: number, serieIndex: number) => {
    const copia = structuredClone(ejercicios);
    copia[ejercicioIndex].series.splice(serieIndex, 1);
    onUpdateEjercicios(copia);
  };

  const eliminarEjercicio = (index: number) => {
    const copia = structuredClone(ejercicios);
    copia.splice(index, 1);
    onUpdateEjercicios(copia);
  };

  const agregarSerie = (ejercicioIndex: number) => {
    const copia = structuredClone(ejercicios);
    if (!copia[ejercicioIndex].series) copia[ejercicioIndex].series = [];
    const seriesActuales = copia[ejercicioIndex].series;
    
    let nuevaSerie;
    if (seriesActuales.length > 0) {
      const ultimaSerie = seriesActuales[seriesActuales.length - 1];
      nuevaSerie = { 
        ...ultimaSerie, 
        completado: false, 
        pesoReal: "", 
        repsReal: "",
        descansoExtra: 0 
      };
    } else {
      nuevaSerie = {
        tipo: "normal",
        repsTipo: "rango",
        minReps: 8,
        maxReps: 12,
        reps: 10,
        peso: "", 
        pesoReal: "",
        repsReal: "",
        rir: "",
        descansoExtra: 0,
        completado: false
      };
    }
    
    seriesActuales.push(nuevaSerie);
    onUpdateEjercicios(copia);
  };

  const obtenerNumeroSerieNormal = (series: any[], currentIndex: number) => {
    let contador = 0;
    for (let i = 0; i <= currentIndex; i++) {
      if (series[i].tipo === "normal") contador++;
    }
    return contador;
  };

  const handleToggleComplete = (ejIdx: number, sIdx: number, currentState: boolean) => {
    actualizarSerie(ejIdx, sIdx, "completado", !currentState);
    
    if (!currentState) {
      const serie = ejercicios[ejIdx].series[sIdx];
      const isExtra = (serie.descansoExtra || 0) > 0;
      const tiempo = isExtra ? serie.descansoExtra : (ejercicios[ejIdx].descansoSegundos || 90);

      setActiveTimerInfo({ ejIdx, sIdx });
      if (tiempo > 0) {
        startTimer(tiempo, isExtra);
      }
    } else {
      if (activeTimerInfo?.ejIdx === ejIdx && activeTimerInfo?.sIdx === sIdx) {
        stopTimer();
      }
    }
  };

  const openReplaceModal = (index: number) => {
    setEjercicioToReplaceIndex(index);
    setShowReplaceModal(true);
  };

  const handleReplaceExercise = (nuevoEjercicioBase: any) => {
    if (ejercicioToReplaceIndex === null) return;
    
    const copia = structuredClone(ejercicios);
    const ejercicioAntiguo = copia[ejercicioToReplaceIndex];
    
    const ejercicioReemplazado = {
      ...nuevoEjercicioBase, 
      series: ejercicioAntiguo.series, 
      descansoSegundos: ejercicioAntiguo.descansoSegundos,
      nota: ejercicioAntiguo.nota,
      notaEjecucion: ejercicioAntiguo.notaEjecucion,
      superserieData: ejercicioAntiguo.superserieData 
    };

    copia[ejercicioToReplaceIndex] = ejercicioReemplazado;
    onUpdateEjercicios(copia);
    setShowReplaceModal(false);
    setEjercicioToReplaceIndex(null);
  };

  const handleCrearSuperserie = (indices: number[]) => {
    const copia = structuredClone(ejercicios);
    
    const coloresUsados = copia.map(ej => ej.superserieData?.color).filter(Boolean);
    const colorDisponible = SUPERSERIE_COLORS.find(c => !coloresUsados.includes(c)) || SUPERSERIE_COLORS[0];
    
    const etiqueta = indices.length === 2 ? "Biserie" : indices.length === 3 ? "Triserie" : "Circuito";

    indices.forEach(idx => {
      copia[idx].superserieData = {
        color: colorDisponible,
        etiqueta: etiqueta
      };
    });

    onUpdateEjercicios(copia);
  };

  return (
    <div className="space-y-8 pb-10 relative">
      {ejercicios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Dumbbell className="w-10 h-10 mb-4 text-zinc-600" />
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest text-center">
            Rutina Vacía
            <span className="block text-[10px] mt-2 font-medium normal-case tracking-normal">Añade ejercicios para comenzar.</span>
          </p>
        </div>
      ) : (
        ejercicios.map((ej, index) => {
          const hasFailed = failedImages[ej.id || index];
          const seriesAnteriores = historial[ej.id] || [];

          const superData = ej.superserieData; 
          
          let colorClassBase = "border-zinc-800/80 bg-transparent";
          let colorEtiqueta = "";
          
          if (superData) {
            switch(superData.color) {
              case 'amber': colorClassBase = "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] bg-amber-500/5"; colorEtiqueta = "bg-amber-500 text-black"; break;
              case 'cyan': colorClassBase = "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-cyan-500/5"; colorEtiqueta = "bg-cyan-500 text-black"; break;
              case 'emerald': colorClassBase = "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] bg-emerald-500/5"; colorEtiqueta = "bg-emerald-500 text-black"; break;
              case 'purple': colorClassBase = "border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)] bg-purple-500/5"; colorEtiqueta = "bg-purple-500 text-white"; break;
              case 'rose': colorClassBase = "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)] bg-rose-500/5"; colorEtiqueta = "bg-rose-500 text-white"; break;
            }
          }

          return (
            <div key={`${ej.id}-${index}`} className={`rounded-2xl overflow-visible flex flex-col relative transition-all border ${colorClassBase}`}>
              
              {superData && (
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-xl text-[9px] font-black uppercase tracking-widest z-10 shadow-lg ${colorEtiqueta}`}>
                  {superData.etiqueta}
                </div>
              )}

              <div className="p-3 sm:p-4 bg-zinc-900/30 flex items-center gap-3 relative mt-2 sm:mt-0 rounded-t-2xl">
                <div className="relative w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0 overflow-hidden">
                  {ej.gifUrl && !hasFailed ? (
                    <img 
                      src={ej.gifUrl} 
                      alt="" 
                      className="w-full h-full object-cover bg-black" 
                      onError={() => setFailedImages(prev => ({ ...prev, [ej.id || index]: true }))}
                    />
                  ) : (
                    <Dumbbell className="w-5 h-5 text-zinc-500" />
                  )}
                  {ej.isCustom && (
                    <div className="absolute bottom-0 right-0 bg-cyan-500 w-1.5 h-1.5 rounded-tl-sm"></div>
                  )}
                </div>
                
                <div className="flex-1 pr-12 sm:pr-0">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider leading-tight">
                    {ej.nombreEs || ej.nombre}
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">
                    {ej.musculoEs || ej.musculoObjetivo}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <InstruccionesButton ejercicio={ej} />
                  
                  <OpcionesEjercicio 
                    ejercicioIndex={index}
                    ejerciciosRutina={ejercicios}
                    onBorrar={() => eliminarEjercicio(index)}
                    onReemplazar={() => openReplaceModal(index)}
                    onCrearSuperserie={handleCrearSuperserie}
                    onReordenar={() => setShowReordenarModal(true)} 
                  />
                </div>
              </div>

              <div className="px-3 sm:px-4 py-2.5 flex flex-col gap-2 border-b border-zinc-800/50 bg-black/20">
                {ej.nota && (
                  <div className="flex items-start gap-2 bg-rose-500/5 px-3 py-2 rounded-md">
                    <FileText className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-rose-200/90 leading-relaxed font-medium whitespace-pre-wrap">
                      {ej.nota}
                    </p>
                  </div>
                )}
                
                <div className="flex items-start gap-2 bg-zinc-900/40 px-3 py-2 rounded-md border border-zinc-800/50 group focus-within:border-zinc-700 transition-colors">
                  <PenLine className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0 group-focus-within:text-zinc-300 transition-colors" />
                  <textarea 
                    placeholder="Añadir nota de sesión (ej. Molestia, subir peso la prox)..."
                    value={ej.notaEjecucion || ""}
                    onChange={(e) => actualizarEjercicio(index, "notaEjecucion", e.target.value)}
                    className="w-full bg-transparent border-none text-[11px] text-zinc-300 focus:outline-none resize-none overflow-hidden placeholder:text-zinc-600 font-medium leading-relaxed"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                </div>
              </div>

              <div className="p-2 sm:p-4 bg-transparent overflow-visible rounded-b-2xl">
                <div className="mb-3 px-1">
                  <DescansoTimer 
                    descansoGeneral={ej.descansoSegundos || 90}
                    isActive={activeTimerInfo?.ejIdx === index && !isGlobalExtra}
                    isExtra={false}
                    onTimeChange={(val) => actualizarEjercicio(index, "descansoSegundos", val)}
                  />
                </div>

                {/* 🔴 HEADER CON ANCHOS AJUSTADOS */}
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">
                  <div className="w-7 sm:w-8 text-center shrink-0">Set</div>
                  <div className="flex-1 min-w-[42px] text-center shrink-0 text-white">Objetivo</div>
                  <div className="flex-1 min-w-[42px] text-center shrink-0 text-emerald-500/70 border-x border-zinc-800/50 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">Anterior</div>
                  <div className="w-[72px] sm:w-[86px] text-center shrink-0">Peso</div>
                  <div className="w-[44px] sm:w-[56px] text-center shrink-0">Reps</div>
                  <div className="w-[44px] sm:w-[56px] text-center shrink-0">RPE</div>
                  <div className="w-8 sm:w-9 text-center shrink-0"><Check className="w-4 h-4 mx-auto" /></div>
                  <div className="w-8 hidden sm:block shrink-0"></div> 
                </div>

                <div className="space-y-1">
                  {ej.series?.map((serie: any, sIdx: number) => {
                    const numSerieNormal = obtenerNumeroSerieNormal(ej.series, sIdx);
                    const isCompletada = serie.completado;

                    const serieAnterior = seriesAnteriores[sIdx];
                    const prevPeso = serieAnterior?.pesoReal || "-";
                    const prevReps = serieAnterior?.repsReal || "-";
                    const prevRir = serieAnterior?.rir || "-";

                    return (
                      <BorrarSerieWrapper 
                        key={sIdx} 
                        onDelete={() => eliminarSerie(index, sIdx)}
                      >
                        <div className="flex flex-col group w-full bg-black/40 rounded-lg">
                          
                          <div className={`flex items-center gap-1 p-1 sm:p-1.5 rounded-lg transition-all ${
                            isCompletada ? "bg-emerald-500/10" : "bg-transparent hover:bg-zinc-900/30"
                          }`}>
                            
                            {/* SET */}
                            <div className="w-7 sm:w-8 flex justify-center shrink-0">
                              <TipoSerie 
                                tipoActual={serie.tipo}
                                numeroNormal={numSerieNormal}
                                onTipoChange={(val) => actualizarSerie(index, sIdx, "tipo", val)}
                              />
                            </div>

                            {/* OBJETIVO */}
                            <div className="flex-1 flex flex-col items-center justify-center shrink-0 min-w-[42px] px-0.5 pointer-events-none">
                              <span className={`text-[10px] font-mono font-bold truncate max-w-[55px] text-center ${isCompletada ? "text-emerald-500/70" : "text-white"}`}>
                                {serie.peso && (
                                  <>
                                    {serie.peso} <span className="text-[8px] text-zinc-500/60">x</span>{" "}
                                  </>
                                )}
                                {serie.repsTipo === "fijas" ? serie.reps : `${serie.minReps}-${serie.maxReps}`}
                              </span>
                              
                              {(serie.rir || serie.descansoExtra > 0) ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  {serie.rir && <span className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">@ {serie.rir}</span>}
                                  {serie.descansoExtra > 0 && <span className="text-[7px] font-bold uppercase tracking-widest text-amber-500">+{serie.descansoExtra}s</span>}
                                </div>
                              ) : (
                                <span className="text-[7px] font-bold uppercase tracking-widest mt-0.5 text-zinc-600">
                                  -
                                </span>
                              )}
                            </div>

                            {/* ANTERIOR */}
                            <div className="flex-1 flex flex-col items-center justify-center shrink-0 min-w-[42px] px-0.5 border-x border-zinc-800/30 pointer-events-none">
                              <span className={`text-[10px] font-mono font-bold truncate max-w-[55px] text-center ${serieAnterior ? 'text-emerald-500/80 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]' : 'text-zinc-600'}`}>
                                {prevPeso} <span className="text-[8px] text-zinc-500/50">x</span> {prevReps}
                              </span>
                              <span className={`text-[7px] font-bold uppercase tracking-widest mt-0.5 ${serieAnterior && prevRir !== "-" ? 'text-emerald-600/70' : 'text-zinc-700'}`}>
                                @ {prevRir}
                              </span>
                            </div>

                            {/* 🔴 PESO */}
                            <div className="w-[72px] sm:w-[86px] shrink-0">
                              <PesoInput 
                                pesoReal={serie.pesoReal || ""}
                                onPesoChange={(val) => actualizarSerie(index, sIdx, "pesoReal", val)}
                                isCompletada={isCompletada}
                              />
                            </div>

                            {/* REPS */}
                            <div className="w-[44px] sm:w-[56px] shrink-0">
                              <RepsInput 
                                repsReal={serie.repsReal || ""}
                                onRepsChange={(val) => actualizarSerie(index, sIdx, "repsReal", val)}
                                isCompletada={isCompletada}
                              />
                            </div>

                            {/* RPE */}
                            <div className="w-[44px] sm:w-[56px] shrink-0">
                              <RpeInput 
                                rirActual={serie.rir || ""}
                                onRirChange={(val) => actualizarSerie(index, sIdx, "rir", val)}
                                isCompletada={isCompletada}
                              />
                            </div>

                            {/* CHECK */}
                            <div className="w-8 sm:w-9 flex justify-center shrink-0">
                              <CheckButton 
                                isCompletada={isCompletada}
                                pesoReal={serie.pesoReal || ""}
                                repsReal={serie.repsReal || ""}
                                onToggleComplete={() => handleToggleComplete(index, sIdx, isCompletada)}
                              />
                            </div>

                          </div>

                          <div className="px-1 mt-0.5 mb-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity [&:has(.bg-amber-500)]:opacity-100 [&:has(select)]:opacity-100 [&:has(button)]:opacity-100">
                            <DescansoTimer 
                              descansoGeneral={0}
                              descansoExtra={serie.descansoExtra || 0}
                              isActive={activeTimerInfo?.ejIdx === index && activeTimerInfo?.sIdx === sIdx && isGlobalExtra}
                              isExtra={true}
                              onTimeChange={(val) => actualizarSerie(index, sIdx, "descansoExtra", val)}
                            />
                          </div>
                          
                        </div>
                      </BorrarSerieWrapper>
                    );
                  })}
                </div>

                <div className="px-1 mt-1">
                  <AgregarSerieButton onAdd={() => agregarSerie(index)} />
                </div>

              </div>
            </div>
          );
        })
      )}

      {onOpenAgregarEjercicios && (
        <button 
          onClick={onOpenAgregarEjercicios}
          className="w-full mt-6 py-6 border-2 border-dashed border-rose-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-rose-500/70 hover:text-rose-500 hover:border-rose-500/80 hover:bg-rose-500/5 transition-all active:scale-[0.98] group"
        >
          <div className="bg-rose-500/10 p-2.5 rounded-full group-hover:bg-rose-500/20 group-hover:scale-110 transition-all">
            <PlusCircle className="w-6 h-6 text-rose-500" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-black uppercase tracking-widest mt-1">
              Añadir Ejercicio a la Sesión
            </span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              No afectará la plantilla original a menos que lo guardes
            </span>
          </div>
        </button>
      )}

      {showReplaceModal && ejercicioToReplaceIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Sustituir Ejercicio</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Estás reemplazando: <span className="text-cyan-400">{ejercicios[ejercicioToReplaceIndex].nombreEs || ejercicios[ejercicioToReplaceIndex].nombre}</span>
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setShowReplaceModal(false);
                setEjercicioToReplaceIndex(null);
              }} 
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-2 sm:p-6">
            <VisorEjercicios 
              mode="replace"
              ejercicioOriginal={ejercicios[ejercicioToReplaceIndex]}
              onAddExercise={handleReplaceExercise}
            />
          </div>

        </div>
      )}

      {showReordenarModal && (
        <ReordenarRutina 
          ejercicios={ejercicios}
          onSave={(nuevaLista) => {
            onUpdateEjercicios(nuevaLista);
            setShowReordenarModal(false);
          }}
          onClose={() => setShowReordenarModal(false)}
        />
      )}

    </div>
  );
}