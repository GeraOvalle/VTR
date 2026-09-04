"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Trash2, Cloud, CloudOff, CheckCircle2, Loader2, X, AlertTriangle, 
  Table2, Plus, Dumbbell, ChevronDown, MessageSquare, Clock, Check, ListOrdered, 
  Info, Eye, GripVertical
} from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";

// Modales Nativos
import VisorEjercicios from "../../../misrutinas/creacionrutina/visorejercicios";
import DetallesEjercicio from "../../../misrutinas/creacionrutina/detallesejercicio";

// Constantes Nativas de VTR
const TIPOS_SERIE = [
  { id: "normal", label: "Normal", badge: "N", color: "text-zinc-300 bg-zinc-800", desc: "Serie estándar de trabajo con descanso completo." },
  { id: "calentamiento", label: "Calentamiento", badge: "W", color: "text-amber-400 bg-amber-500/10", desc: "Peso muy ligero. Enfocado en movilidad, flujo sanguíneo y técnica (Warm-up)." },
  { id: "aproximacion", label: "Aproximación", badge: "A", color: "text-blue-400 bg-blue-500/10", desc: "Subida progresiva de peso para preparar el sistema nervioso antes del peso real." },
  { id: "topset", label: "Top Set", badge: "T", color: "text-rose-400 bg-rose-500/10", desc: "Serie máxima. La más pesada y exigente, llevada muy cerca o hasta el fallo muscular." },
  { id: "dropset", label: "Drop Set", badge: "D", color: "text-purple-400 bg-purple-500/10", desc: "Serie al fallo seguida inmediatamente de una reducción de peso (20-30%) para volver al fallo sin descanso." },
  { id: "restpause", label: "Rest-Pause", badge: "R", color: "text-emerald-400 bg-emerald-500/10", desc: "Serie al fallo seguida de micro-descansos (10-15s) para sacar repeticiones extra con el mismo peso." },
];

const OPCIONES_DESCANSO = Array.from({ length: 37 }, (_, i) => i * 5);
const OPCIONES_DESCANSO_EXTRA = [0, 15, 30, 45, 60];

const formatearDescanso = (segundos: number) => {
  if (segundos === 0) return "0s";
  const mins = Math.floor(segundos / 60);
  const segs = segundos % 60;
  if (mins === 0) return `${segs}s`;
  if (segs === 0) return `${mins}m`;
  return `${mins}m ${segs}s`;
};

interface ExcelEditorProps {
  clienteId: string;
  archivoId: string;
  onBack: () => void;
}

export default function ExcelClienteEditor({ clienteId, archivoId, onBack }: ExcelEditorProps) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  
  // Sincronización Local-First
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "error" | "waiting">("saved");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estados de Interfaz (Heredados de EstructuraRutina)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeTipoDropdown, setActiveTipoDropdown] = useState<{ ejercicioIdx: number; serieIdx: number } | null>(null);
  const [activeRepsDropdown, setActiveRepsDropdown] = useState<{ ejercicioIdx: number; serieIdx: number } | null>(null);
  const [activeDescExtraDropdown, setActiveDescExtraDropdown] = useState<{ ejercicioIdx: number; serieIdx: number } | null>(null);
  const [activeDescansoDropdown, setActiveDescansoDropdown] = useState<number | null>(null);
  
  // Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Modales
  const [showPicker, setShowPicker] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ejercicioSeleccionadoDetalle, setEjercicioSeleccionadoDetalle] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  const [historial, setHistorial] = useState<Record<string, any[]>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const localKey = `vtr_excel_local_${archivoId}`;

  // 1. CARGA INICIAL (Local-First)
  useEffect(() => {
    const loadExcel = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid, "notas_clientes", clienteId, "archivos", archivoId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          const localData = localStorage.getItem(localKey);

          if (localData) {
            const parsed = JSON.parse(localData);
            setTitle(parsed.title || data.titulo || "");
            setEjercicios(parsed.ejercicios || (data.contenido && data.contenido !== "[]" ? JSON.parse(data.contenido) : []));
            setHasChanges(true); 
          } else {
            setTitle(data.titulo || "");
            setEjercicios(data.contenido && data.contenido !== "[]" ? JSON.parse(data.contenido) : []);
          }
        }
      } catch (error) {
        console.error("Error cargando bitácora:", error);
      } finally {
        setLoading(false);
      }
    };
    loadExcel();
  }, [archivoId, clienteId, localKey]);

  // 2. AUTO-GUARDADO (DEBOUNCE)
  useEffect(() => {
    if (loading || !hasChanges) return;

    setSyncStatus("waiting");
    localStorage.setItem(localKey, JSON.stringify({ title, ejercicios }));

    const timer = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, "users", user.uid, "notas_clientes", clienteId, "archivos", archivoId);
        await updateDoc(docRef, {
          titulo: title.trim() || "Bitácora Sin Título",
          contenido: JSON.stringify(ejercicios),
          fechaActualizacion: serverTimestamp()
        });

        setSyncStatus("saved");
        setHasChanges(false);
        localStorage.removeItem(localKey);
      } catch (error) {
        console.error("Error subiendo a Firebase:", error);
        setSyncStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, ejercicios, hasChanges, archivoId, clienteId, localKey, loading]);

  // 3. FETCH HISTORIAL DEL CLIENTE
  useEffect(() => {
    const fetchHistorial = async () => {
      if (!clienteId || ejercicios.length === 0) return;

      const nuevoHistorial = { ...historial };
      let huboCambios = false;

      for (const ej of ejercicios) {
        const globalEjId = ej.ejercicioId || ej.id; // El ID real del catálogo
        if (!globalEjId || nuevoHistorial[globalEjId]) continue; 

        try {
          const q = query(
            collection(db, "users", clienteId, "pesosregistro"),
            where("ejercicioId", "==", globalEjId)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            const registros = snap.docs.map(d => d.data());
            registros.sort((a, b) => {
              const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
              const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
              return timeB - timeA; 
            });
            nuevoHistorial[globalEjId] = registros[0].series || [];
          } else {
            nuevoHistorial[globalEjId] = []; 
          }
          huboCambios = true;
        } catch (error) {
          console.error("Error obteniendo historial para", globalEjId, error);
        }
      }

      if (huboCambios) {
        setHistorial(nuevoHistorial);
      }
    };

    fetchHistorial();
  }, [ejercicios, clienteId]);

  // 4. CLICK OUTSIDE PARA DROPDOWNS
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveTipoDropdown(null);
        setActiveDescansoDropdown(null);
        setActiveRepsDropdown(null);
        setActiveDescExtraDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==========================================
  // LÓGICA DE EDICIÓN NATIVA
  // ==========================================

  const handleAddExercise = (ej: any) => {
    const newEj = {
      id: `ej_excel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ejercicioId: ej.id, // Referencia al catálogo
      nombre: ej.nombreEs || ej.nombre,
      musculo: ej.musculoEs || ej.musculoObjetivo || "General",
      gifUrl: ej.gifUrl || "",
      isCustom: !!ej.isCustom,
      nota: "",
      descansoSegundos: 90,
      series: [
        { id: `set_${Date.now()}`, tipo: "normal", repsTipo: "fijas", reps: "10", minReps: "8", maxReps: "12", rir: "", descansoExtra: 0, peso: "" }
      ]
    };
    setEjercicios([...ejercicios, newEj]);
    setExpandedIndex(ejercicios.length);
    setHasChanges(true);
    setShowPicker(false);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const copia = JSON.parse(JSON.stringify(ejercicios));
    const [movido] = copia.splice(draggedIndex, 1);
    copia.splice(index, 0, movido);
    setEjercicios(copia);
    setHasChanges(true);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const eliminarEjercicio = (index: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia.splice(index, 1);
    setEjercicios(copia);
    setHasChanges(true);
  };

  const actualizarEjercicio = (index: number, campo: string, valor: any) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[index][campo] = valor;
    setEjercicios(copia);
    setHasChanges(true);
  };

  const agregarSerie = (ejercicioIndex: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    if (!copia[ejercicioIndex].series) copia[ejercicioIndex].series = [];
    
    const lastSet = copia[ejercicioIndex].series.length > 0 ? copia[ejercicioIndex].series[copia[ejercicioIndex].series.length - 1] : null;
    copia[ejercicioIndex].series.push({
      id: `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tipo: lastSet ? lastSet.tipo : "normal", 
      repsTipo: lastSet ? lastSet.repsTipo : "fijas", 
      reps: lastSet ? lastSet.reps : "10", 
      minReps: lastSet ? lastSet.minReps : "8", 
      maxReps: lastSet ? lastSet.maxReps : "12", 
      rir: lastSet ? lastSet.rir : "", 
      descansoExtra: 0, 
      peso: lastSet ? lastSet.peso : "" 
    });
    setEjercicios(copia);
    setHasChanges(true);
  };

  const eliminarSerie = (ejercicioIndex: number, serieIndex: number) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[ejercicioIndex].series.splice(serieIndex, 1);
    setEjercicios(copia);
    setHasChanges(true);
  };

  const actualizarSerie = (ejercicioIndex: number, serieIndex: number, campo: string, valor: any) => {
    const copia = JSON.parse(JSON.stringify(ejercicios));
    copia[ejercicioIndex].series[serieIndex][campo] = valor;
    setEjercicios(copia);
    setHasChanges(true);
  };

  const obtenerNumeroSerieNormal = (series: any[], currentIndex: number) => {
    let contador = 0;
    for (let i = 0; i <= currentIndex; i++) {
      if (series[i].tipo === "normal") contador++;
    }
    return contador;
  };

  const handleDeleteFile = async () => {
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(doc(db, "users", user.uid, "notas_clientes", clienteId, "archivos", archivoId));
      localStorage.removeItem(localKey);
      onBack();
    } catch (error) {
      console.error("Error al borrar bitácora:", error);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const numericInputClass = "bg-transparent text-[11px] font-bold text-center focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Abriendo Motor Excel...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 relative">
      
      {/* TOOLBAR SUPERIOR */}
      <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-2xl border border-white/10 mb-6 shrink-0 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <button onClick={onBack} className="w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-emerald-500/40 transition-all shadow-inner active:scale-95">
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 pr-2">
          {/* INDICADOR DE SINCRONIZACIÓN */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/5 shadow-inner">
            {syncStatus === "saved" && <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest hidden sm:block">En la Nube</span></>}
            {syncStatus === "waiting" && <><Cloud className="w-3.5 h-3.5 text-zinc-500" /><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hidden sm:block">En Caché</span></>}
            {syncStatus === "saving" && <><Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" /><span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest hidden sm:block">Sincronizando</span></>}
            {syncStatus === "error" && <><CloudOff className="w-3.5 h-3.5 text-rose-500" /><span className="text-[9px] font-black text-rose-500 uppercase tracking-widest hidden sm:block">Error Nube</span></>}
          </div>

          <div className="w-px h-5 bg-zinc-800"></div>

          <button onClick={() => setShowDeleteModal(true)} className="text-zinc-500 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10" title="Eliminar Bitácora">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL TIPO ESTRUCTURARUTINA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 sm:px-4 pb-32">
        <div className="mx-auto w-full max-w-3xl">
          
          <div className="relative z-40 bg-zinc-950/85 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden" ref={dropdownRef}>
            
            {/* Cabecera del Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-4 w-full">
              <div className="flex items-center gap-2">
                <Table2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  Excel Presencial
                  <button 
                    onClick={() => setShowInfoModal(true)}
                    className="text-zinc-500 hover:text-emerald-400 transition-colors bg-zinc-900 rounded-full p-1"
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
              </div>
            </div>

            {/* Input del Título */}
            <div className="mb-4 shrink-0 relative z-10 w-full">
              <input 
                type="text" 
                placeholder="Nombre del Excel (Ej. Día 1 - Pierna Fuerza)..." 
                value={title}
                onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                className="w-full bg-transparent border-b border-zinc-800 pb-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 font-medium" 
              />
            </div>

            {/* LISTA DE EJERCICIOS EXACTAMENTE IGUAL A ESTRUCTURARUTINA */}
            <div className="flex-1 w-full min-w-0">
              {ejercicios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center w-full">
                  <Dumbbell className="w-10 h-10 text-zinc-600 mb-3" />
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    Bitácora Vacía
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-2">Agrega el primer ejercicio para comenzar a registrar.</p>
                </div>
              ) : (
                <div className="space-y-1 relative w-full">
                  {ejercicios.map((ej, index) => {
                    const isExpanded = expandedIndex === index;
                    const hasFailed = failedImages[ej.ejercicioId || ej.id];
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;
                    
                    const seriesAnteriores = historial[ej.ejercicioId || ej.id] || [];
                    
                    return (
                      <div 
                        key={ej.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                        className={`border-b border-zinc-800/50 last:border-0 transition-all relative w-full min-w-0 ${
                          isDragging ? 'opacity-30 scale-95' : ''
                        } ${isDragOver ? 'border-t-2 border-t-emerald-500' : ''}`}
                        style={{ zIndex: isExpanded ? 50 - index : 10 }} 
                      >
                        
                        {/* FILA DEL EJERCICIO */}
                        <div 
                          className="flex justify-between items-center py-3 px-2 -mx-2 hover:bg-white/[0.02] rounded-lg transition-colors cursor-pointer group w-full"
                          onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <span className="text-[10px] font-black text-zinc-600 w-4 group-hover:text-emerald-500 transition-colors hidden sm:block shrink-0">
                              {index + 1}.
                            </span>
                            
                            <div className="w-8 h-8 rounded-md bg-black/40 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                              {ej.gifUrl && !hasFailed ? (
                                <img 
                                  src={ej.gifUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" 
                                  onError={() => setFailedImages(prev => ({ ...prev, [ej.ejercicioId || ej.id]: true }))}
                                />
                              ) : (
                                <Dumbbell className="w-4 h-4 text-zinc-600" />
                              )}
                              {ej.isCustom && (
                                 <div className="absolute bottom-0 right-0 bg-cyan-500 w-2 h-2 rounded-tl-sm"></div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-bold text-white capitalize truncate">{ej.nombre}</h3>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5 truncate">
                                {ej.series?.length || 0} Series • {ej.musculo}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEjercicioSeleccionadoDetalle(ej); }}
                              className="text-zinc-500 hover:text-cyan-400 p-1.5 transition-colors"
                              title="Ver detalles del ejercicio"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            
                            <div 
                              className="cursor-grab active:cursor-grabbing p-1.5 text-zinc-500 hover:text-white transition-colors"
                              title="Mantén presionado para reordenar"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="w-[1px] h-3 bg-zinc-800 mx-1"></div>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); eliminarEjercicio(index); }}
                              className="text-zinc-500 hover:text-rose-500 p-1.5 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <ChevronDown className={`w-4 h-4 text-zinc-600 ml-2 transition-transform duration-300 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        {/* ACORDEÓN EXPANDIDO */}
                        {isExpanded && (
                          <div className="pl-1 sm:pl-10 pr-1 pb-5 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 relative z-20 w-full min-w-0">
                            
                            {/* HEADER DEL DESCANSO GENERAL */}
                            <div className="flex items-center justify-between mb-2 px-2 bg-black/20 py-2 rounded-lg border border-zinc-800/50 w-full">
                              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-zinc-600" /> Descanso Base:
                              </span>
                              <div className="relative shrink-0">
                                <button 
                                  onClick={() => {
                                    setActiveDescansoDropdown(activeDescansoDropdown === index ? null : index);
                                    setActiveTipoDropdown(null);
                                    setActiveRepsDropdown(null);
                                    setActiveDescExtraDropdown(null);
                                  }}
                                  className="text-[10px] font-bold text-zinc-300 hover:text-emerald-400 bg-zinc-900 px-3 py-1 rounded border border-zinc-700 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                >
                                  {formatearDescanso(ej.descansoSegundos || 90)} <ChevronDown className="w-2.5 h-2.5 opacity-50" />
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
                                        className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between hover:bg-white/5 transition-colors ${ej.descansoSegundos === seg ? "text-emerald-400" : "text-zinc-400"}`}
                                      >
                                        <span>{formatearDescanso(seg)}</span>
                                        {ej.descansoSegundos === seg && <Check className="w-3 h-3 text-emerald-500" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ÁREA DE NOTAS EN VIVO */}
                            <div className="flex items-start gap-2 relative z-0 bg-zinc-900/30 px-3 py-2.5 rounded-lg border border-zinc-800/30 w-full">
                              <MessageSquare className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                              <textarea 
                                placeholder="Añadir nota técnica o instrucción en vivo..."
                                value={ej.nota || ""}
                                rows={1}
                                onChange={(e) => {
                                  actualizarEjercicio(index, "nota", e.target.value);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                className="w-full bg-transparent border-none text-[11px] text-emerald-300 focus:outline-none placeholder:text-zinc-600 resize-none overflow-hidden font-medium leading-relaxed"
                              />
                            </div>

                            {/* TABLA DE SERIES */}
                            <div className="pb-2 mt-2 w-full">
                              <div className="w-full">
                                {ej.series?.length > 0 && (
                                  <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1 w-full">
                                    <div className="w-4 text-center shrink-0">#</div>
                                    <div className="w-6 sm:w-7 shrink-0 text-center">Tipo</div>
                                    
                                    <div className="flex-1 min-w-[30px] text-center shrink-0 text-emerald-500/70 border-x border-zinc-800/50 flex flex-col justify-center leading-none">
                                      <span>Ant.</span>
                                    </div>
                                    
                                    <div className="w-9 sm:w-11 text-center shrink-0">Peso</div>
                                    <div className="w-14 sm:w-16 text-center shrink-0">Reps</div>
                                    <div className="w-7 sm:w-8 text-center shrink-0">RIR</div>
                                    <div className="w-9 sm:w-10 text-center shrink-0">+D</div>
                                    <div className="w-4 sm:w-5 text-center shrink-0"></div>
                                  </div>
                                )}

                                <div className="space-y-1.5 w-full">
                                  {ej.series?.length === 0 ? (
                                    <p className="text-[10px] text-zinc-600 py-2 text-center">No hay series registradas.</p>
                                  ) : (
                                    ej.series?.map((serie: any, sIdx: number) => {
                                      const tipoObj = TIPOS_SERIE.find(t => t.id === serie.tipo) || TIPOS_SERIE[0];
                                      const numSerieNormal = obtenerNumeroSerieNormal(ej.series, sIdx);
                                      const isTipoDropdownOpen = activeTipoDropdown?.ejercicioIdx === index && activeTipoDropdown?.serieIdx === sIdx;
                                      const isRepsDropdownOpen = activeRepsDropdown?.ejercicioIdx === index && activeRepsDropdown?.serieIdx === sIdx;
                                      const isDescExtraDropdownOpen = activeDescExtraDropdown?.ejercicioIdx === index && activeDescExtraDropdown?.serieIdx === sIdx;
                                      
                                      const isAnyDropdownOpen = isTipoDropdownOpen || isRepsDropdownOpen || isDescExtraDropdownOpen;

                                      const serieAnterior = seriesAnteriores[sIdx];
                                      const prevPeso = serieAnterior?.pesoReal || "-";
                                      const prevReps = serieAnterior?.repsReal || "-";

                                      return (
                                        <div 
                                          key={sIdx} 
                                          className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/40 p-1 sm:p-1.5 rounded-lg border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors group/serie relative w-full"
                                          style={{ zIndex: isAnyDropdownOpen ? 100 : 20 - sIdx }}
                                        >
                                          
                                          <div className="w-4 text-center shrink-0 text-[9px] sm:text-[10px] font-black text-zinc-600">
                                            {sIdx + 1}
                                          </div>
                                          
                                          {/* TIPO DE SERIE DROPDOWN */}
                                          <div className="relative shrink-0 w-6 sm:w-7 flex justify-center">
                                            <button 
                                              onClick={() => {
                                                setActiveTipoDropdown(isTipoDropdownOpen ? null : { ejercicioIdx: index, serieIdx: sIdx });
                                                setActiveDescansoDropdown(null);
                                                setActiveRepsDropdown(null);
                                                setActiveDescExtraDropdown(null);
                                              }}
                                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-black transition-colors ${tipoObj.color}`}
                                            >
                                              {serie.tipo === "normal" ? numSerieNormal : tipoObj.badge}
                                            </button>

                                            {isTipoDropdownOpen && (
                                              <div className="absolute left-0 top-full mt-1 w-36 bg-zinc-900 border border-zinc-700 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[100] overflow-hidden">
                                                {TIPOS_SERIE.map(t => (
                                                  <button
                                                    key={t.id}
                                                    onClick={() => {
                                                      actualizarSerie(index, sIdx, "tipo", t.id);
                                                      setActiveTipoDropdown(null);
                                                    }}
                                                    className={`w-full text-left px-2 sm:px-3 py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-colors ${serie.tipo === t.id ? "text-white bg-white/5" : "text-zinc-400"}`}
                                                  >
                                                    <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded flex items-center justify-center text-[7px] sm:text-[8px] ${t.color}`}>{t.badge}</span>
                                                    {t.label}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex-1 flex flex-col items-center justify-center shrink-0 min-w-[30px] px-0.5 sm:px-1 border-x border-zinc-800/50">
                                            <span className={`text-[8px] sm:text-[9px] font-mono font-bold truncate w-full text-center ${serieAnterior ? 'text-emerald-500/80 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]' : 'text-zinc-600'}`}>
                                              {prevPeso} <span className="text-[6px] sm:text-[7px] text-zinc-500/50">x</span> {prevReps}
                                            </span>
                                          </div>

                                          {/* PESO */}
                                          <div className="w-9 sm:w-11 shrink-0 flex justify-center">
                                            <input 
                                              type="number"
                                              inputMode="decimal"
                                              step="0.5"
                                              value={serie.peso || ""} 
                                              onChange={(e) => actualizarSerie(index, sIdx, "peso", e.target.value)}
                                              placeholder="kg/lb"
                                              className={`w-full bg-black/50 border border-zinc-700/50 rounded py-1 text-white focus:border-emerald-500 ${numericInputClass}`}
                                            />
                                          </div>

                                          {/* REPS */}
                                          <div className="w-14 sm:w-16 shrink-0 flex flex-col items-center gap-1 relative">
                                            
                                            <button 
                                              onClick={() => {
                                                setActiveRepsDropdown(isRepsDropdownOpen ? null : { ejercicioIdx: index, serieIdx: sIdx });
                                                setActiveTipoDropdown(null);
                                                setActiveDescExtraDropdown(null);
                                              }}
                                              className="bg-zinc-900 text-[7px] sm:text-[8px] font-bold text-zinc-400 focus:outline-none uppercase tracking-wider rounded border border-zinc-800 w-full text-center py-0.5 flex justify-center items-center gap-0.5 hover:bg-zinc-800 hover:text-white transition-colors"
                                            >
                                              {serie.repsTipo} <ChevronDown className="w-2 h-2 opacity-50" />
                                            </button>

                                            {isRepsDropdownOpen && (
                                              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-16 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-[100] overflow-hidden">
                                                {["fijas", "rango"].map(r => (
                                                  <button
                                                    key={r}
                                                    onClick={() => {
                                                      actualizarSerie(index, sIdx, "repsTipo", r);
                                                      setActiveRepsDropdown(null);
                                                    }}
                                                    className={`w-full text-center px-1 py-2 text-[8px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors ${serie.repsTipo === r ? "text-emerald-400" : "text-zinc-400"}`}
                                                  >
                                                    {r}
                                                  </button>
                                                ))}
                                              </div>
                                            )}

                                            {serie.repsTipo === "fijas" ? (
                                              <input 
                                                type="number"
                                                inputMode="numeric"
                                                value={serie.reps}
                                                onChange={(e) => actualizarSerie(index, sIdx, "reps", e.target.value)}
                                                placeholder="0"
                                                className={`w-full bg-black/30 border border-zinc-800/80 rounded py-1 text-white ${numericInputClass}`}
                                              />
                                            ) : (
                                              <div className="flex items-center justify-center gap-0.5 w-full">
                                                <input 
                                                  type="number"
                                                  inputMode="numeric"
                                                  value={serie.minReps}
                                                  onChange={(e) => actualizarSerie(index, sIdx, "minReps", e.target.value)}
                                                  placeholder="Min"
                                                  className={`w-full min-w-[10px] bg-black/30 border border-zinc-800/80 rounded py-1 text-white ${numericInputClass}`}
                                                />
                                                <span className="text-zinc-600 text-[9px] sm:text-[10px]">-</span>
                                                <input 
                                                  type="number"
                                                  inputMode="numeric"
                                                  value={serie.maxReps}
                                                  onChange={(e) => actualizarSerie(index, sIdx, "maxReps", e.target.value)}
                                                  placeholder="Max"
                                                  className={`w-full min-w-[10px] bg-black/30 border border-zinc-800/80 rounded py-1 text-white ${numericInputClass}`}
                                                />
                                              </div>
                                            )}
                                          </div>

                                          {/* RIR */}
                                          <div className="w-7 sm:w-8 shrink-0 flex justify-center">
                                            <input 
                                              type="number"
                                              inputMode="numeric"
                                              value={serie.rir || ""}
                                              onChange={(e) => actualizarSerie(index, sIdx, "rir", e.target.value)}
                                              placeholder="-"
                                              className={`w-full bg-black/50 border border-zinc-700/50 text-amber-400 focus:border-amber-500 rounded py-1 ${numericInputClass}`}
                                            />
                                          </div>

                                          {/* DESCANSO EXTRA */}
                                          <div className="w-9 sm:w-10 shrink-0 flex justify-center relative">
                                            <button 
                                              onClick={() => {
                                                setActiveDescExtraDropdown(isDescExtraDropdownOpen ? null : { ejercicioIdx: index, serieIdx: sIdx });
                                                setActiveTipoDropdown(null);
                                                setActiveRepsDropdown(null);
                                              }}
                                              className="bg-black/50 border border-zinc-700/50 text-[7px] sm:text-[8px] font-bold text-zinc-400 focus:outline-none w-full text-center rounded py-1 flex justify-center items-center gap-0.5 hover:bg-black hover:text-white transition-colors"
                                            >
                                              +{serie.descansoExtra || 0}s
                                            </button>

                                            {isDescExtraDropdownOpen && (
                                              <div className="absolute top-full mt-1 right-0 w-16 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-[100] overflow-hidden max-h-32 overflow-y-auto custom-scrollbar">
                                                {OPCIONES_DESCANSO_EXTRA.map(seg => (
                                                  <button
                                                    key={seg}
                                                    onClick={() => {
                                                      actualizarSerie(index, sIdx, "descansoExtra", seg);
                                                      setActiveDescExtraDropdown(null);
                                                    }}
                                                    className={`w-full text-center px-1 py-2 text-[8px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors ${serie.descansoExtra === seg ? "text-emerald-400" : "text-zinc-400"}`}
                                                  >
                                                    +{seg}s
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* ELIMINAR SERIE */}
                                          <div className="w-4 sm:w-5 flex justify-center shrink-0">
                                            <button 
                                              onClick={() => eliminarSerie(index, sIdx)}
                                              className="text-zinc-600 hover:text-rose-500 transition-colors p-1 opacity-100 sm:opacity-0 sm:group-hover/serie:opacity-100"
                                            >
                                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
                              className="mt-2 text-emerald-500 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors relative z-0"
                            >
                              <Plus className="w-3 h-3" /> Añadir Set
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOTÓN PARA ABRIR VISOR */}
            <div className="mt-6">
              <button 
                onClick={() => setShowPicker(true)}
                className="w-full bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-400 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Agregar Ejercicio
              </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* MODAL DEL VISOR DE EJERCICIOS (Reutilizado Nativamente) */}
      {showPicker && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-[2rem] overflow-hidden flex flex-col relative shadow-[0_0_80px_rgba(16,185,129,0.15)] border border-emerald-500/20">
            <div className="absolute top-4 right-4 z-50">
              <button onClick={() => setShowPicker(false)} className="bg-zinc-900/80 p-3 rounded-full border border-white/10 hover:bg-rose-500/20 hover:text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto w-full pt-12 sm:pt-0">
              <VisorEjercicios 
                onAddExercise={handleAddExercise} 
                mode="add"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DEL EJERCICIO (Nativo) */}
      {ejercicioSeleccionadoDetalle && (
        <DetallesEjercicio 
          ejercicio={ejercicioSeleccionadoDetalle}
          onClose={() => setEjercicioSeleccionadoDetalle(null)}
          onAdd={(ej) => {
            handleAddExercise(ej);
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
                <Info className="w-4 h-4 text-emerald-400" /> Glosario de Series y RIR
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
                  <span className="text-white">Ejemplo:</span> Un RIR 1 significa dejar 1 repetición en el tanque. Un RIR 0 significa llegar al fallo absoluto.
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

      {/* MODAL DE ELIMINACIÓN DE BITÁCORA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(244,63,94,0.15)] overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Eliminar Bitácora
              </h3>
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="bg-rose-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h4 className="text-base font-black text-white mb-2 leading-tight">¿Seguro que deseas borrar este Excel Presencial?</h4>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-6">Esta acción es permanente y no se puede deshacer.</p>
              
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-300 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button onClick={handleDeleteFile} disabled={isDeleting} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}