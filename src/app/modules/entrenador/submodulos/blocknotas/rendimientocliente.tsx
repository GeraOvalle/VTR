"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Dumbbell, Filter, ChevronDown, Check, Eye, XCircle, TrendingUp, Activity, ArrowLeft } from "lucide-react";
import { db, auth } from "../../../../lib/firebase";
import { collection, getDocs, doc, getDoc, query } from "firebase/firestore";
import DetallesEjercicio from "../../../misrutinas/creacionrutina/detallesejercicio"; // Ajusta la ruta si es necesario

interface RendimientoClienteProps {
  clienteId: string;
  onBack: () => void;
}

const MUSCULOS_FILTRO = [
  "Todos", "Historial Activo", "Pecho", "Abdomen", "Cuello", "Trapecio", "Hombro", 
  "Espalda Superior", "Dorsales", "Espalda Baja", "Bicep", 
  "Tricep", "Antebrazo", "Gluteo", "Cuadriceps", "Femoral", "Gemelos"
];

const MAPA_SINONIMOS: { [key: string]: string[] } = {
  "pecho": ["pecho", "chest", "pectoral", "pectorales"],
  "abdomen": ["abdomen", "abdominal", "abs", "core", "cintura", "oblicuo"],
  "cuello": ["cuello", "neck"],
  "trapecio": ["trapecio", "traps", "trapezius"],
  "hombro": ["hombro", "shoulder", "deltoid", "deltoide", "delt"],
  "espalda superior": ["upper back", "espalda superior", "rhomboid", "romboide"],
  "dorsales": ["lat", "latissimus", "dorsal", "espalda"],
  "espalda baja": ["lower back", "espalda baja", "lumbar", "erector"],
  "bicep": ["bicep", "brazo", "arm"],
  "tricep": ["tricep", "brazo", "arm"],
  "antebrazo": ["forearm", "antebrazo", "agarre", "grip"],
  "gluteo": ["glute", "gluteo", "cadera", "hip"],
  "cuadriceps": ["quad", "cuadricep", "pierna", "leg"],
  "femoral": ["hamstring", "femoral", "isquio", "pierna", "leg", "posterior"],
  "gemelos": ["calf", "calves", "gemelo", "pantorrilla", "soleo"]
};

const normalizeText = (text: string | null | undefined) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export default function RendimientoClienteModule({ clienteId, onBack }: RendimientoClienteProps) {
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [exerciseCounts, setExerciseCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  
  const [searchTerm, setSearchTerm] = useState("");
  // Por defecto, empezamos mostrando solo los que tienen historial
  const [selectedMuscle, setSelectedMuscle] = useState("Historial Activo");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [ejercicioSeleccionadoDetalle, setEjercicioSeleccionadoDetalle] = useState<any | null>(null);

  const [filteredExercises, setFilteredExercises] = useState<any[]>([]);
  const [displayedExercises, setDisplayedExercises] = useState<any[]>([]);
  
  const [itemsToShow, setItemsToShow] = useState(40); 
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. CARGA DE EJERCICIOS Y CÁLCULO DE FRECUENCIA
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // A. Cargar Frecuencia del Cliente (Cuántas veces ha hecho cada ejercicio)
        const counts: { [key: string]: number } = {};
        const registrosRef = collection(db, "users", clienteId, "pesosregistro");
        const snapRegistros = await getDocs(registrosRef);
        
        snapRegistros.forEach(doc => {
          const data = doc.data();
          if (data.ejercicioId) {
            counts[data.ejercicioId] = (counts[data.ejercicioId] || 0) + 1;
          }
        });
        setExerciseCounts(counts);

        // B. Cargar Catálogo (Usamos Caché si existe)
        const cacheKey = `cv_cache_ejercicios_v7_${user.uid}`;
        const cachedData = sessionStorage.getItem(cacheKey);

        let listaCompleta = [];

        if (cachedData) {
          const { lista } = JSON.parse(cachedData);
          listaCompleta = lista;
        } else {
          const globalSnap = await getDocs(collection(db, "ejercicios"));
          const globalList = globalSnap.docs.map(d => ({ ...d.data(), id: d.id }));

          const customSnap = await getDocs(collection(db, "users", user.uid, "mis_ejercicios"));
          const customList = customSnap.docs.map(d => ({ ...d.data(), id: d.id, isCustom: true }));

          listaCompleta = [...customList, ...globalList];
          sessionStorage.setItem(cacheKey, JSON.stringify({ lista: listaCompleta, favsCache: [] }));
        }

        setAllExercises(listaCompleta);

      } catch (error) {
        console.error("Error cargando rendimiento:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clienteId]);

  // 2. FILTRADO Y ORDENAMIENTO (MÁGIA DE RENDIMIENTO)
  useEffect(() => {
    let result = allExercises;

    // Filtro especial "Historial Activo"
    if (selectedMuscle === "Historial Activo") {
      result = result.filter(ej => exerciseCounts[ej.id] > 0);
    } else if (selectedMuscle !== "Todos") {
      const claveFiltro = normalizeText(selectedMuscle);
      const sinónimosPermitidos = (MAPA_SINONIMOS[claveFiltro] || []).map(normalizeText);
      sinónimosPermitidos.push(claveFiltro);

      result = result.filter(ej => {
        const camposMusculares = [
          normalizeText(ej.musculoEs), normalizeText(ej.musculoObjetivo),
          normalizeText(ej.parteCuerpoEs), normalizeText(ej.parteCuerpo),
          ...(ej.musculosSecundariosEs || []).map(normalizeText),
          ...(ej.musculosSecundarios || []).map(normalizeText)
        ];
        return sinónimosPermitidos.some(syn => camposMusculares.some(campo => campo.includes(syn)));
      });
    }

    // Buscador de texto
    if (searchTerm.trim() !== "") {
      const terms = normalizeText(searchTerm).split(" ").filter(Boolean);
      result = result.filter(ej => {
        const searchableText = normalizeText([
          ej.nombreEs, ej.nombre, ej.musculoEs, ej.musculoObjetivo,
          ej.parteCuerpoEs, ej.parteCuerpo, ej.equipoEs, ej.equipo
        ].join(" "));
        return terms.every(term => searchableText.includes(term));
      });
    }

    // ORDENAMIENTO: Primero los que tienen más registros, luego alfabético
    result.sort((a, b) => {
      const countA = exerciseCounts[a.id] || 0;
      const countB = exerciseCounts[b.id] || 0;
      
      if (countA !== countB) return countB - countA; // Descendente por frecuencia
      
      return (a.nombreEs || a.nombre || "").localeCompare(b.nombreEs || b.nombre || "");
    });

    setFilteredExercises(result);
    setItemsToShow(40); 
  }, [searchTerm, selectedMuscle, allExercises, exerciseCounts]);

  // 3. PAGINACIÓN INFINITA
  useEffect(() => {
    setDisplayedExercises(filteredExercises.slice(0, itemsToShow));
  }, [filteredExercises, itemsToShow]);

  useEffect(() => {
    const currentLoader = loaderRef.current;
    if (!currentLoader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setItemsToShow((prev) => prev + 40);
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );

    observer.observe(currentLoader);
    return () => observer.disconnect();
  }, [filteredExercises]);

  return (
    <>
      <div className="bg-zinc-950/80 backdrop-blur-md border border-emerald-500/30 rounded-[2rem] p-4 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col h-full transition-colors animate-in fade-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all active:scale-95">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Analítica de Progreso
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
                Ejercicios ordenados por frecuencia de entrenamiento
              </p>
            </div>
          </div>
          
          {!loading && (
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest">
              {filteredExercises.length} Ejercicios
            </span>
          )}
        </div>

        {/* CONTROLES INTELIGENTES */}
        <div className="flex gap-2 mb-6 shrink-0 relative" ref={filterRef}>
          <div className="relative flex-1 group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchTerm ? 'text-emerald-500' : 'text-zinc-500 group-focus-within:text-zinc-400'}`} />
            <input 
              type="text" 
              placeholder="Buscar ejercicio específico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-8 md:pr-10 text-xs text-white focus:outline-none transition-all placeholder:text-zinc-600 font-medium tracking-wide focus:border-emerald-500 focus:bg-white/10"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-500 transition-colors"
              >
                <XCircle className="w-4 h-4 fill-zinc-900" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 rounded-xl border transition-all ${
              showFilterDropdown || (selectedMuscle !== "Todos" && selectedMuscle !== "Historial Activo")
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : selectedMuscle === "Historial Activo" ? "bg-amber-500/10 border-amber-500 text-amber-400"
                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {selectedMuscle === "Historial Activo" ? <Activity className="w-4 h-4 text-amber-400" /> : <Filter className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
              {selectedMuscle === "Todos" ? "Filtros" : selectedMuscle}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showFilterDropdown && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-950 border border-zinc-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="w-full">
                {MUSCULOS_FILTRO.map(musculo => {
                  const isSpecial = musculo === "Historial Activo";
                  return (
                    <button
                      key={musculo}
                      onClick={() => {
                        setSelectedMuscle(musculo);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors ${
                        isSpecial ? "bg-zinc-900 hover:bg-zinc-800 border-b border-zinc-800" : "hover:bg-zinc-800"
                      }`}
                    >
                      <span className={
                        selectedMuscle === musculo && isSpecial ? "text-amber-400 flex gap-2 items-center" :
                        selectedMuscle === musculo ? "text-emerald-400" : "text-zinc-400 flex gap-2 items-center"
                      }>
                        {isSpecial && <Activity className="w-3 h-3" />}
                        {musculo}
                      </span>
                      {selectedMuscle === musculo && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* LISTA DE EJERCICIOS */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Analizando Historial...</span>
            </div>
          ) : displayedExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-80 text-center px-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-zinc-900/80 p-5 rounded-full mb-4 border border-zinc-800">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-sm font-black text-white uppercase tracking-widest mb-1">Sin Resultados</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6 max-w-[250px] leading-relaxed">
                {selectedMuscle === "Historial Activo" 
                  ? "Este cliente aún no tiene registros guardados de ningún ejercicio."
                  : "No encontramos ejercicios que coincidan con tus filtros."}
              </p>
              <button
                onClick={() => { setSearchTerm(""); setSelectedMuscle("Todos"); }}
                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hover:bg-emerald-500 hover:text-white"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-4">
              {displayedExercises.map((ej) => {
                const count = exerciseCounts[ej.id] || 0;
                const hasHistory = count > 0;
                const imageKey = ej.id || ej.nombre;
                const hasFailed = failedImages[imageKey];

                return (
                  <div 
                    key={ej.id} 
                    onClick={() => setEjercicioSeleccionadoDetalle(ej)}
                    className={`bg-zinc-900/40 border rounded-2xl overflow-hidden group transition-all flex flex-col relative shadow-md cursor-pointer ${
                      hasHistory ? 'border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5' : 'border-white/5 hover:border-white/20 hover:bg-white/5 opacity-60 hover:opacity-100'
                    }`}
                  >
                    
                    <div className="relative w-full aspect-square bg-black/60 border-b border-zinc-800/50 flex items-center justify-center overflow-hidden">
                      {ej.gifUrl && !hasFailed ? (
                        <img 
                          src={ej.gifUrl} 
                          alt={ej.nombreEs || ej.nombre} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          onError={() => setFailedImages(prev => ({ ...prev, [ej.id || ej.nombre]: true }))}
                        />
                      ) : (
                        <Dumbbell className="w-8 h-8 text-zinc-700" />
                      )}

                      {/* BADGE MÁGICO DE FRECUENCIA */}
                      {hasHistory && (
                        <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 animate-in zoom-in">
                          <Activity className="w-3 h-3" /> {count} Sesiones
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1 gap-1 text-center">
                      <h3 className="text-[10px] font-bold text-white capitalize line-clamp-2 leading-tight" title={ej.nombreEs || ej.nombre}>
                        {ej.nombreEs || ej.nombre}
                      </h3>
                      <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-auto pt-1">
                        {ej.musculoEs || ej.musculoObjetivo}
                      </p>
                    </div>

                    {/* Overlay Hover */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <Eye className={`w-8 h-8 ${hasHistory ? 'text-emerald-400' : 'text-zinc-300'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Ver Progreso</span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
          
          {/* EL LOADER DEL SCROLL INFINITO */}
          {displayedExercises.length > 0 && displayedExercises.length < filteredExercises.length && (
            <div ref={loaderRef} className="py-6 flex justify-center w-full">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* MODAL NATIVO DE DETALLES (Cargará las gráficas de progreso) */}
      {ejercicioSeleccionadoDetalle && (
        <DetallesEjercicio 
          ejercicio={ejercicioSeleccionadoDetalle}
          onClose={() => setEjercicioSeleccionadoDetalle(null)}
          // 🔴 PASAMOS EL TARGET USER ID PARA QUE MUESTRE LA GRÁFICA DE ESTE CLIENTE, NO LA DEL ENTRENADOR
          targetUserId={clienteId}
          onAdd={() => {}} // No necesitamos el botón agregar aquí
        />
      )}
    </>
  );
}