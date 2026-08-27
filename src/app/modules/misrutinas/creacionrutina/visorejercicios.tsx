"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Loader2, Dumbbell, Filter, ChevronDown, Check, Eye, Star, Upload, Image as ImageIcon, X, Wrench, XCircle } from "lucide-react";
import { db, auth } from "../../../lib/firebase";
import { collection, getDocs, doc, setDoc, addDoc, getDoc, writeBatch } from "firebase/firestore";
import DetallesEjercicio from "./detallesejercicio";

interface VisorEjerciciosProps {
  onAddExercise: (ejercicio: any) => void;
}

const MUSCULOS_FILTRO = [
  "Todos", "Favoritos", "Propios", "Pecho", "Abdomen", "Cuello", "Trapecio", "Hombro", 
  "Espalda Superior", "Dorsales", "Espalda Baja", "Bicep", 
  "Tricep", "Antebrazo", "Gluteo", "Cuadriceps", "Femoral", "Gemelos"
];

// Mapa ampliado y optimizado
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

export default function VisorEjercicios({ onAddExercise }: VisorEjerciciosProps) {
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState<string>("clasico");
  const [curandoGifs, setCurandoGifs] = useState(false);
  
  const [failedImages, setFailedImages] = useState<{ [key: string]: boolean }>({});
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [ejercicioSeleccionadoDetalle, setEjercicioSeleccionadoDetalle] = useState<any | null>(null);
  const [showCrearModal, setShowCrearModal] = useState(false);

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

  // 1. CARGA INICIAL
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          const userRol = userSnap.exists() ? userSnap.data().rol || "clasico" : "clasico";
          setRol(userRol);
          const favs = userSnap.exists() ? userSnap.data().favoritos || [] : [];

          const cacheKey = `cv_cache_ejercicios_v7_${user.uid}`;
          const cachedData = sessionStorage.getItem(cacheKey);

          if (cachedData) {
            const { lista, favsCache } = JSON.parse(cachedData);
            setAllExercises(lista);
            setFavoriteIds(favsCache);
            setLoading(false);
            return;
          }

          // Traemos todos los ejercicios globales y los personales
          const globalSnap = await getDocs(collection(db, "ejercicios"));
          const globalList = globalSnap.docs.map(d => ({ ...d.data(), id: d.id }));

          const customSnap = await getDocs(collection(db, "users", user.uid, "mis_ejercicios"));
          const customList = customSnap.docs.map(d => ({ ...d.data(), id: d.id, isCustom: true }));

          const listaCompleta = [...customList, ...globalList];
          setAllExercises(listaCompleta);
          setFavoriteIds(favs);

          sessionStorage.setItem(cacheKey, JSON.stringify({ lista: listaCompleta, favsCache: favs }));

        } catch (error) {
          console.error("Error cargando base de datos:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const curarGifsGlobales = async () => {
    if (rol !== "admin") return;
    setCurandoGifs(true);
    try {
      const querySnap = await getDocs(collection(db, "ejercicios"));
      const batch = writeBatch(db);
      let contador = 0;

      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.id && data.gifUrl) {
          const ref = doc(db, "ejercicios", data.id);
          batch.update(ref, { gifUrl: data.gifUrl });
          contador++;
        }
      });

      if (contador > 0) {
        await batch.commit();
        sessionStorage.clear();
        alert(`¡Sincronización completa! Se han asegurado ${contador} referencias en Firestore.`);
        window.location.reload();
      } else {
        alert("No hay registros pendientes.");
      }
    } catch (error) {
      console.error("Error al curar GIFs:", error);
      alert("Error al sincronizar.");
    } finally {
      setCurandoGifs(false);
    }
  };

  const toggleFavorite = async (ejId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const isFav = favoriteIds.includes(ejId);
    const newFavs = isFav ? favoriteIds.filter(id => id !== ejId) : [...favoriteIds, ejId];

    setFavoriteIds(newFavs); 
    
    const cacheKey = `cv_cache_ejercicios_v7_${user.uid}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({ lista: allExercises, favsCache: newFavs }));

    try {
      await setDoc(doc(db, "users", user.uid), { favoritos: newFavs }, { merge: true });
    } catch (error) {
      console.error("Error guardando favorito:", error);
    }
  };

  // MOTOR DE BÚSQUEDA INTELIGENTE
  useEffect(() => {
    let result = allExercises;

    // 1. Aplicar Filtro de Dropdown
    if (selectedMuscle === "Favoritos") {
      result = result.filter(ej => favoriteIds.includes(ej.id));
    } else if (selectedMuscle === "Propios") {
      result = result.filter(ej => ej.isCustom);
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

        return sinónimosPermitidos.some(syn => 
          camposMusculares.some(campo => campo.includes(syn))
        );
      });
    }

    // 2. Aplicar Búsqueda por Texto
    if (searchTerm.trim() !== "") {
      const terms = normalizeText(searchTerm).split(" ").filter(Boolean);
      
      result = result.filter(ej => {
        const searchableText = normalizeText([
          ej.nombreEs, ej.nombre,
          ej.musculoEs, ej.musculoObjetivo,
          ej.parteCuerpoEs, ej.parteCuerpo,
          ej.equipoEs, ej.equipo,
          ...(ej.musculosSecundariosEs || []),
          ...(ej.musculosSecundarios || [])
        ].join(" "));

        return terms.every(term => searchableText.includes(term));
      });
    }

    // 3. ORDENAMIENTO: PONER LOS QUE TIENEN GIF PRIMERO
    result.sort((a, b) => {
      const aHasGif = !!(a.gifUrl && a.gifUrl.trim() !== "");
      const bHasGif = !!(b.gifUrl && b.gifUrl.trim() !== "");
      
      if (aHasGif && !bHasGif) return -1; 
      if (!aHasGif && bHasGif) return 1;  
      return 0; 
    });

    setFilteredExercises(result);
    setItemsToShow(40); 
  }, [searchTerm, selectedMuscle, allExercises, favoriteIds]);

  useEffect(() => {
    setDisplayedExercises(filteredExercises.slice(0, itemsToShow));
  }, [filteredExercises, itemsToShow]);

  // CORRECCIÓN DEL SCROLL INFINITO
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
  }, [filteredExercises]); // Solo se recrea si cambia la lista filtrada, no la cantidad mostrada

  return (
    <>
      <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 sm:p-5 shadow-inner flex flex-col h-[75vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-rose-500" />
            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">
              Lista de Ejercicios
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {rol === "admin" && (
              <button 
                onClick={curarGifsGlobales}
                disabled={curandoGifs}
                className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {curandoGifs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
                Curar
              </button>
            )}

            {!loading && (
              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded text-[9px] font-black tracking-widest">
                {filteredExercises.length} / {allExercises.length}
              </span>
            )}
          </div>
        </div>

        {/* CONTROLES INTELIGENTES */}
        <div className="flex gap-2 mb-4 shrink-0 relative" ref={filterRef}>
          <div className="relative flex-1 group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchTerm ? 'text-rose-500' : 'text-zinc-500 group-focus-within:text-zinc-400'}`} />
            <input 
              type="text" 
              placeholder="Buscar ejercicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-8 md:pr-10 text-[10px] md:text-xs text-white focus:outline-none focus:border-rose-500 focus:bg-white/10 transition-all placeholder:text-zinc-600 font-medium tracking-wide"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-rose-500 transition-colors"
              >
                <XCircle className="w-4 h-4 fill-zinc-900" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 rounded-lg border transition-all ${
              showFilterDropdown || (selectedMuscle !== "Todos" && selectedMuscle !== "Favoritos" && selectedMuscle !== "Propios")
                ? "bg-rose-500/10 border-rose-500 text-rose-400" 
                : selectedMuscle === "Favoritos" ? "bg-amber-500/10 border-amber-500 text-amber-400"
                : selectedMuscle === "Propios" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {selectedMuscle === "Favoritos" ? <Star className="w-4 h-4 fill-amber-400" /> : <Filter className="w-4 h-4" />}
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden sm:block">
              {selectedMuscle === "Todos" ? "Filtro" : selectedMuscle}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <button 
            onClick={() => setShowCrearModal(true)}
            className="flex items-center justify-center w-10 sm:w-auto sm:px-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-rose-500 hover:border-rose-500 transition-all shadow-lg active:scale-95"
            title="Crear Ejercicio Propio"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block ml-1">Nuevo</span>
          </button>

          {showFilterDropdown && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-950 border border-zinc-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="w-full">
                {MUSCULOS_FILTRO.map(musculo => {
                  const isSpecial = musculo === "Favoritos" || musculo === "Propios";
                  return (
                    <button
                      key={musculo}
                      onClick={() => {
                        setSelectedMuscle(musculo);
                        setShowFilterDropdown(false);
                      }}
                      // Redujimos py-3 a py-1.5 y text-[10px] a text-[9px] para hacerlo más delgado
                      className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors ${
                        isSpecial ? "bg-zinc-900 hover:bg-zinc-800 border-b border-zinc-800" : "hover:bg-zinc-800"
                      }`}
                    >
                      <span className={
                        selectedMuscle === musculo && musculo === "Favoritos" ? "text-amber-400 flex gap-1.5 items-center" :
                        selectedMuscle === musculo && musculo === "Propios" ? "text-cyan-400 flex gap-1.5 items-center" :
                        selectedMuscle === musculo ? "text-rose-400" : "text-zinc-400 flex gap-1.5 items-center"
                      }>
                        {musculo === "Favoritos" && <Star className="w-3 h-3" />}
                        {musculo === "Propios" && <Upload className="w-3 h-3" />}
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

        {/* LISTA DE EJERCICIOS (REJILLA DE 4 COLUMNAS EN MÓVIL) */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50 [&::-webkit-scrollbar-thumb]:rounded-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <Loader2 className="w-6 h-6 text-rose-500 animate-spin mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500">Cargando base de datos...</span>
            </div>
          ) : displayedExercises.length === 0 ? (
            
            /* ESTADO VACÍO */
            <div className="flex flex-col items-center justify-center h-full opacity-80 text-center px-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-zinc-900/80 p-5 rounded-full mb-4 border border-zinc-800">
                <Search className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-sm font-black text-white uppercase tracking-widest mb-1">
                Sin Resultados
              </p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6 max-w-[250px] leading-relaxed">
                No encontramos ejercicios que coincidan con los filtros actuales.
              </p>
              <button
                onClick={() => { setSearchTerm(""); setSelectedMuscle("Todos"); }}
                className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              >
                Limpiar Filtros
              </button>
            </div>

          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 pb-4">
              {displayedExercises.map((ej) => {
                const isFav = favoriteIds.includes(ej.id);
                const imageKey = ej.id || ej.nombre;
                const hasFailed = failedImages[imageKey];

                return (
                  <div key={ej.id} className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden group hover:border-rose-500/50 hover:bg-rose-500/10 transition-all flex flex-col relative shadow-md">
                    
                    {/* CONTENEDOR IMAGEN ULTRA COMPACTO */}
                    <div className="relative w-full aspect-square bg-black/40 border-b border-zinc-800 flex items-center justify-center overflow-hidden">
                      
                      {ej.gifUrl && !hasFailed ? (
                        <img 
                          src={ej.gifUrl} 
                          alt={ej.nombreEs || ej.nombre} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          onError={() => setFailedImages(prev => ({ ...prev, [ej.id || ej.nombre]: true }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-1 opacity-70">
                          <Dumbbell className="w-5 h-5 md:w-6 md:h-6 text-zinc-700 mb-1" />
                          <span className="text-[5px] md:text-[6px] tracking-widest font-black text-zinc-500">SIN VISTA</span>
                        </div>
                      )}
                      
                      {ej.isCustom && (
                        <div className="absolute top-1 left-1 bg-cyan-500/90 text-white text-[5px] md:text-[6px] font-black uppercase px-1 py-0.5 rounded backdrop-blur-md shadow-sm">Propio</div>
                      )}
                      
                      <button 
                        onClick={() => toggleFavorite(ej.id)} 
                        className={`absolute top-1 right-1 p-1 rounded-md backdrop-blur-md border transition-all ${isFav ? 'bg-amber-500/20 border-amber-500/50' : 'bg-black/60 border-white/10 hover:border-amber-500/50'}`}
                      >
                        <Star className={`w-2.5 h-2.5 md:w-3 md:h-3 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
                      </button>
                    </div>
                    
                    {/* Info y Acciones Ultra Compactas */}
                    <div className="p-1.5 md:p-2 flex flex-col flex-1 justify-between gap-1.5">
                      <div>
                        <h3 className="text-[7px] md:text-[9px] font-bold text-white capitalize line-clamp-2 leading-tight" title={ej.nombreEs || ej.nombre}>
                          {ej.nombreEs || ej.nombre}
                        </h3>
                        <p className="text-[5px] md:text-[6.5px] font-black uppercase tracking-widest text-rose-400 mt-0.5 line-clamp-1">
                          {ej.musculoEs || ej.musculoObjetivo}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 mt-auto pt-1">
                        <button 
                          onClick={() => setEjercicioSeleccionadoDetalle(ej)} 
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1 rounded-md transition-colors flex justify-center items-center"
                          title="Ver Detalle"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => onAddExercise(ej)} 
                          className="bg-rose-500 hover:bg-rose-400 text-white p-1 rounded-md transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95"
                          title="Añadir a la Rutina"
                        >
                          <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
          
          {/* EL LOADER DEL SCROLL INFINITO */}
          {displayedExercises.length > 0 && displayedExercises.length < filteredExercises.length && (
            <div ref={loaderRef} className="py-6 flex justify-center w-full">
              <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {ejercicioSeleccionadoDetalle && (
        <DetallesEjercicio 
          ejercicio={ejercicioSeleccionadoDetalle}
          onClose={() => setEjercicioSeleccionadoDetalle(null)}
          onAdd={onAddExercise}
        />
      )}

      {showCrearModal && (
        <CrearEjercicioModal 
          onClose={() => setShowCrearModal(false)}
          onSave={(nuevoEj) => {
            const updatedList = [nuevoEj, ...allExercises];
            setAllExercises(updatedList);
            setShowCrearModal(false);
            
            const user = auth.currentUser;
            if (user) {
               sessionStorage.setItem(`cv_cache_ejercicios_v7_${user.uid}`, JSON.stringify({ lista: updatedList, favsCache: favoriteIds }));
            }
          }}
        />
      )}
    </>
  );
}

function CrearEjercicioModal({ onClose, onSave }: { onClose: () => void, onSave: (ej: any) => void }) {
  const [form, setForm] = useState({
    nombreEs: "",
    musculoEs: "Pecho",
    musculosSecundariosEs: "",
    equipoEs: "Peso Corporal",
    instruccionesEs: "",
    gifUrl: ""
  });
  const [guardando, setGuardando] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300; 
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64Url = canvas.toDataURL("image/webp", 0.6); 
          setForm(prev => ({ ...prev, gifUrl: base64Url }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.nombreEs.trim()) return alert("El nombre es obligatorio");
    
    const user = auth.currentUser;
    if (!user) return alert("Debes iniciar sesión");

    setGuardando(true);
    try {
      const nuevoEjercicio = {
        nombreEs: form.nombreEs.trim(),
        nombre: form.nombreEs.trim(),
        musculoEs: form.musculoEs,
        musculoObjetivo: form.musculoEs,
        musculosSecundariosEs: form.musculosSecundariosEs.split(",").map(s => s.trim()).filter(Boolean),
        equipoEs: form.equipoEs,
        instruccionesEs: form.instruccionesEs.split("\n").filter(Boolean),
        gifUrl: form.gifUrl,
        isCustom: true,
        estadoRevision: "pendiente", 
        creadorUid: user.uid,
        fechaCreacion: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "users", user.uid, "mis_ejercicios"), nuevoEjercicio);
      
      onSave({ ...nuevoEjercicio, id: docRef.id });

    } catch (error) {
      console.error("Error creando ejercicio:", error);
      alert("Error al guardar el ejercicio.");
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "w-full bg-black/60 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 transition-all";
  const labelClass = "text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-rose-500/30 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden">
        
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Upload className="w-4 h-4 text-rose-500" /> Crear Ejercicio Propio
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-800 flex-1">
          
          <div>
            <label className={labelClass}>Foto o GIF del Ejercicio (Opcional)</label>
            <div className="flex items-center gap-4">
              {form.gifUrl ? (
                <img src={form.gifUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-zinc-700 bg-black" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-black border border-zinc-800 border-dashed flex flex-col items-center justify-center text-zinc-600">
                  <ImageIcon className="w-6 h-6 mb-1" />
                </div>
              )}
              <label className="bg-white/5 border border-white/10 text-white text-xs px-4 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                Subir Imagen
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Nombre del Ejercicio *</label>
            <input type="text" value={form.nombreEs} onChange={e => setForm({...form, nombreEs: e.target.value})} placeholder="Ej. Press Inclinado en Máquina" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Músculo Principal *</label>
              <select value={form.musculoEs} onChange={e => setForm({...form, musculoEs: e.target.value})} className={inputClass}>
                {MUSCULOS_FILTRO.filter(m => !["Todos", "Favoritos", "Propios"].includes(m)).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Equipo Necesario</label>
              <input type="text" value={form.equipoEs} onChange={e => setForm({...form, equipoEs: e.target.value})} placeholder="Ej. Mancuernas" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Músculos Secundarios (Separados por coma)</label>
            <input type="text" value={form.musculosSecundariosEs} onChange={e => setForm({...form, musculosSecundariosEs: e.target.value})} placeholder="Ej. Tricep, Hombro frontal" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Instrucciones de Ejecución (Paso a paso, un paso por línea)</label>
            <textarea 
              value={form.instruccionesEs} 
              onChange={e => setForm({...form, instruccionesEs: e.target.value})} 
              placeholder="1. Ajusta el banco a 30 grados.&#10;2. Mantén los codos a 45 grados..." 
              className={`${inputClass} min-h-[100px] resize-y`} 
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white">Cancelar</button>
          <button 
            onClick={handleSubmit}
            disabled={guardando || !form.nombreEs.trim()}
            className="bg-rose-500 text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar Ejercicio
          </button>
        </div>

      </div>
    </div>
  );
}