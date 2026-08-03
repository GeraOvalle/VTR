"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Loader2, Dumbbell, Filter, ChevronDown, Check, Eye, Star, Upload, Image as ImageIcon, X } from "lucide-react";
import { db, auth } from "../../../lib/firebase";
import { collection, getDocs, doc, setDoc, addDoc, getDoc } from "firebase/firestore";
import DetallesEjercicio from "./detallesejercicio";

interface VisorEjerciciosProps {
  onAddExercise: (ejercicio: any) => void;
}

const MUSCULOS_FILTRO = [
  "Todos", "Favoritos", "Propios", "Pecho", "Abdomen", "Cuello", "Trapecio", "Hombro", 
  "Espalda Superior", "Dorsales", "Espalda Baja", "Bicep", 
  "Tricep", "Antebrazo", "Gluteo", "Cuadriceps", "Femoral", "Gemelos"
];

const MAPA_SINONIMOS: { [key: string]: string[] } = {
  "pecho": ["pecho", "chest", "pectoral", "pectorals", "upper chest", "lower chest"],
  "abdomen": ["abdomen", "abdominal", "abs", "core", "waist", "cintura", "obliques", "oblicuos"],
  "cuello": ["cuello", "neck"],
  "trapecio": ["trapecio", "traps", "trapezius"],
  "hombro": ["hombro", "shoulders", "delts", "deltoids", "anterior delt", "lateral delt", "posterior delt"],
  "espalda superior": ["upper back", "espalda superior", "rhomboids", "romboides", "upper_back"],
  "dorsales": ["lats", "latissimus", "dorsales"],
  "espalda baja": ["lower back", "espalda baja", "spine", "erectors"],
  "bicep": ["bicep", "biceps"],
  "tricep": ["tricep", "triceps"],
  "antebrazo": ["forearm", "forearms", "antebrazo", "antebrazos", "grip"],
  "gluteo": ["glutes", "glute", "glúteos", "gluteus", "hips"],
  "cuadriceps": ["quads", "quadriceps", "cuádriceps", "legs", "piernas"],
  "femoral": ["hamstrings", "femoral", "leg curls", "posterior"],
  "gemelos": ["calves", "gemelos", "calf", "gastronemius", "soleus"]
};

export default function VisorEjercicios({ onAddExercise }: VisorEjerciciosProps) {
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [ejercicioSeleccionadoDetalle, setEjercicioSeleccionadoDetalle] = useState<any | null>(null);
  const [showCrearModal, setShowCrearModal] = useState(false);

  const [filteredExercises, setFilteredExercises] = useState<any[]>([]);
  const [displayedExercises, setDisplayedExercises] = useState<any[]>([]);
  
  // 🔥 SOLUCIÓN AL BUG DEL SCROLL: Cargar 40 al inicio para asegurar que se llene la pantalla
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

  // 1. CARGA INICIAL CON CACHÉ (Solución a la lentitud)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const cacheKey = `cv_cache_ejercicios_${user.uid}`;
          const cachedData = sessionStorage.getItem(cacheKey);

          // Si hay caché, la usamos de inmediato
          if (cachedData) {
            const { lista, favs } = JSON.parse(cachedData);
            setAllExercises(lista);
            setFavoriteIds(favs);
            setLoading(false);
            return;
          }

          // Si no hay caché, descargamos todo
          const globalSnap = await getDocs(collection(db, "ejercicios"));
          const globalList = globalSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

          const customSnap = await getDocs(collection(db, "users", user.uid, "mis_ejercicios"));
          const customList = customSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, isCustom: true }));

          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const favs = userSnap.exists() ? userSnap.data().favoritos || [] : [];

          const listaCompleta = [...customList, ...globalList];
          setAllExercises(listaCompleta);
          setFavoriteIds(favs);

          // Guardamos en caché
          sessionStorage.setItem(cacheKey, JSON.stringify({ lista: listaCompleta, favs }));

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

  // 2. TOGGLE FAVORITOS (Actualiza caché al instante)
  const toggleFavorite = async (ejId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const isFav = favoriteIds.includes(ejId);
    const newFavs = isFav ? favoriteIds.filter(id => id !== ejId) : [...favoriteIds, ejId];

    setFavoriteIds(newFavs); 
    
    // Actualizamos la caché
    const cacheKey = `cv_cache_ejercicios_${user.uid}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({ lista: allExercises, favs: newFavs }));

    try {
      await setDoc(doc(db, "users", user.uid), { favoritos: newFavs }, { merge: true });
    } catch (error) {
      console.error("Error guardando favorito:", error);
    }
  };

  // 3. MOTOR DE BÚSQUEDA Y FILTRO
  useEffect(() => {
    let result = allExercises;

    if (selectedMuscle === "Favoritos") {
      result = result.filter(ej => favoriteIds.includes(ej.id));
    } else if (selectedMuscle === "Propios") {
      result = result.filter(ej => ej.isCustom);
    } else if (selectedMuscle !== "Todos") {
      const claveFiltro = selectedMuscle.toLowerCase();
      const sinónimosPermitidos = MAPA_SINONIMOS[claveFiltro] || [claveFiltro];

      result = result.filter(ej => {
        const principal = (ej.musculoEs || ej.musculoObjetivo || "").toLowerCase();
        const parte = (ej.parteCuerpoEs || ej.parteCuerpo || "").toLowerCase();
        const secundarios = (ej.musculosSecundariosEs || []).map((m: string) => m.toLowerCase());
        const secundariosIngles = (ej.musculosSecundarios || []).map((m: string) => m.toLowerCase());

        return sinónimosPermitidos.some(syn => 
          principal.includes(syn) || 
          parte.includes(syn) || 
          secundarios.some((sec: string | string[]) => sec.includes(syn)) ||
          secundariosIngles.some((sec: string | string[]) => sec.includes(syn))
        );
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(ej => {
        const nombre = (ej.nombreEs || ej.nombre || "").toLowerCase();
        const principal = (ej.musculoEs || ej.musculoObjetivo || "").toLowerCase();
        const parte = (ej.parteCuerpoEs || ej.parteCuerpo || "").toLowerCase();
        const secundarios = (ej.musculosSecundariosEs || []).join(" ").toLowerCase();

        return (
          nombre.includes(term) || 
          principal.includes(term) || 
          parte.includes(term) || 
          secundarios.includes(term)
        );
      });
    }

    setFilteredExercises(result);
    setItemsToShow(40); // Reset a 40 para no romper el scroll
  }, [searchTerm, selectedMuscle, allExercises, favoriteIds]);

  // 4. PAGINACIÓN Y SCROLL
  useEffect(() => {
    setDisplayedExercises(filteredExercises.slice(0, itemsToShow));
  }, [filteredExercises, itemsToShow]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && itemsToShow < filteredExercises.length) {
          setItemsToShow((prev) => Math.min(prev + 20, filteredExercises.length)); // Agrega de a 20
        }
      },
      { root: null, rootMargin: "100px", threshold: 0.1 } // Margen aumentado para cargar antes
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
  }, [itemsToShow, filteredExercises.length]);

  return (
    <>
      <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-inner flex flex-col h-[75vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-5 border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-rose-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white">
              Lista de Ejercicios
            </h2>
          </div>
          
          {!loading && (
            <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded text-[9px] font-black tracking-widest">
              {filteredExercises.length} / {allExercises.length} TOTALES
            </span>
          )}
        </div>

        {/* CONTROLES */}
        <div className="flex gap-2 mb-4 shrink-0 relative" ref={filterRef}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar por ejercicio, músculo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-rose-500 transition-all placeholder:text-zinc-600"
            />
          </div>

          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`flex items-center gap-2 px-3 rounded-lg border transition-all ${
              showFilterDropdown || (selectedMuscle !== "Todos" && selectedMuscle !== "Favoritos" && selectedMuscle !== "Propios")
                ? "bg-rose-500/10 border-rose-500 text-rose-400" 
                : selectedMuscle === "Favoritos" ? "bg-amber-500/10 border-amber-500 text-amber-400"
                : selectedMuscle === "Propios" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {selectedMuscle === "Favoritos" ? <Star className="w-4 h-4 fill-amber-400" /> : <Filter className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
              {selectedMuscle === "Todos" ? "Filtro" : selectedMuscle}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <button 
            onClick={() => setShowCrearModal(true)}
            className="flex items-center justify-center w-10 sm:w-auto sm:px-3 bg-zinc-800 text-white rounded-lg hover:bg-rose-500 transition-colors shadow-lg"
            title="Crear Ejercicio Propio"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block ml-1">Nuevo</span>
          </button>

          {/* DROPDOWN FILTRO */}
          {showFilterDropdown && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50">
                {MUSCULOS_FILTRO.map(musculo => {
                  const isSpecial = musculo === "Favoritos" || musculo === "Propios";
                  return (
                    <button
                      key={musculo}
                      onClick={() => {
                        setSelectedMuscle(musculo);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors ${
                        isSpecial ? "bg-white/5 hover:bg-white/10 border-b border-zinc-800" : "hover:bg-white/5"
                      }`}
                    >
                      <span className={
                        selectedMuscle === musculo && musculo === "Favoritos" ? "text-amber-400 flex gap-2" :
                        selectedMuscle === musculo && musculo === "Propios" ? "text-cyan-400 flex gap-2" :
                        selectedMuscle === musculo ? "text-rose-400" : "text-zinc-400 flex gap-2"
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

        {/* LISTA DE EJERCICIOS (DISEÑO MOSAICO / GRID) */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-rose-500/50 [&::-webkit-scrollbar-thumb]:rounded-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <Loader2 className="w-6 h-6 text-rose-500 animate-spin mb-2" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500">Cargando base de datos...</span>
            </div>
          ) : displayedExercises.length === 0 ? (
            <div className="text-center text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-10">
              Ningún objetivo encontrado
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 pb-4">
              {displayedExercises.map((ej) => {
                const isFav = favoriteIds.includes(ej.id);
                return (
                  <div key={ej.id} className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden group hover:border-rose-500/50 hover:bg-rose-500/10 transition-all flex flex-col relative shadow-md">
                    
                    {/* Contenedor Imagen */}
                    <div className="relative w-full aspect-square bg-black/40 border-b border-zinc-800 flex items-center justify-center">
                      {ej.gifUrl ? (
                        <img src={ej.gifUrl} alt={ej.nombreEs} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Dumbbell className="w-10 h-10 text-zinc-700" />
                      )}
                      
                      {/* Badges Flotantes */}
                      {ej.isCustom && (
                        <div className="absolute top-2 left-2 bg-cyan-500/90 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded backdrop-blur-md shadow-sm">Propio</div>
                      )}
                      
                      <button 
                        onClick={() => toggleFavorite(ej.id)} 
                        className={`absolute top-2 right-2 p-1.5 rounded-md backdrop-blur-md border transition-all ${isFav ? 'bg-amber-500/20 border-amber-500/50' : 'bg-black/60 border-white/10 hover:border-amber-500/50'}`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
                      </button>
                    </div>
                    
                    {/* Info y Acciones */}
                    <div className="p-3 flex flex-col flex-1 justify-between gap-3">
                      <div>
                        <h3 className="text-[10px] sm:text-xs font-bold text-white capitalize line-clamp-2 leading-snug">{ej.nombreEs || ej.nombre}</h3>
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-rose-400 mt-1">{ej.musculoEs || ej.musculoObjetivo}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-auto">
                        <button 
                          onClick={() => setEjercicioSeleccionadoDetalle(ej)} 
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Ver
                        </button>
                        <button 
                          onClick={() => onAddExercise(ej)} 
                          className="bg-rose-500 hover:bg-rose-400 text-white p-1.5 rounded-lg transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-105"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
          
          {/* Vigilante para cargar más en el Scroll */}
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
            
            // Actualizar caché automáticamente tras crear
            const user = auth.currentUser;
            if (user) {
               sessionStorage.setItem(`cv_cache_ejercicios_${user.uid}`, JSON.stringify({ lista: updatedList, favs: favoriteIds }));
            }
          }}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTE: MODAL CREADOR DE EJERCICIOS PROPIOS (COMPRESIÓN CANVAS)
// ----------------------------------------------------------------------

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
        nombre: form.nombreEs.trim(), // Replicar para compatibilidad
        musculoEs: form.musculoEs,
        musculoObjetivo: form.musculoEs,
        musculosSecundariosEs: form.musculosSecundariosEs.split(",").map(s => s.trim()).filter(Boolean),
        equipoEs: form.equipoEs,
        instruccionesEs: form.instruccionesEs.split("\n").filter(Boolean),
        gifUrl: form.gifUrl,
        isCustom: true,
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