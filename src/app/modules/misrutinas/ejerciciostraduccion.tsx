"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, Languages, Save, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, Bot, Fingerprint, Clock, Database, BrainCircuit
} from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface TraduccionProps {
  onBack: () => void;
}

// ==========================================
// 🧠 DICCIONARIOS DE CONTEXTO FITNESS
// ==========================================
const DICC_MUSCULOS: Record<string, string> = {
  "chest": "Pecho", "pectorals": "Pectorales",
  "back": "Espalda", "lats": "Dorsales", "latissimus dorsi": "Dorsales",
  "lower back": "Espalda Baja", "upper back": "Espalda Superior",
  "traps": "Trapecios", "trapezius": "Trapecios",
  "shoulders": "Hombro", "delts": "Deltoides", "deltoids": "Deltoides",
  "arms": "Brazos", "biceps": "Bíceps", "triceps": "Tríceps", "forearms": "Antebrazos",
  "legs": "Piernas", "quads": "Cuádriceps", "quadriceps": "Cuádriceps",
  "hamstrings": "Femorales", "calves": "Gemelos", "glutes": "Glúteos",
  "abs": "Abdomen", "core": "Core", "cardio": "Cardio", "neck": "Cuello",
  "abductors": "Abductores", "adductors": "Aductores"
};

const DICC_EQUIPO: Record<string, string> = {
  "body weight": "Peso Corporal", "bodyweight": "Peso Corporal",
  "dumbbell": "Mancuerna", "barbell": "Barra",
  "cable": "Polea", "machine": "Máquina", "leverage machine": "Máquina de Palanca",
  "kettlebell": "Pesa Rusa", "band": "Banda de Resistencia", "resistance band": "Banda de Resistencia",
  "medicine ball": "Balón Medicinal", "stability ball": "Pelota Suiza", "bosu ball": "Bosu",
  "ez barbell": "Barra Z", "smith machine": "Máquina Smith",
  "roller": "Rodillo", "step": "Step", "trap bar": "Barra Hexagonal", "rope": "Cuerda"
};

// 🔴 CORRECCIONES ESTRICTAS PARA TÍTULOS (El orden importa: FRASES LARGAS PRIMERO)
const CORRECCIONES_TITULOS: [RegExp, string][] = [
  // Poleas y Cables
  [/cable underhand pulldown/gi, "jalón al pecho con agarre supino en polea"],
  [/underhand pulldown/gi, "jalón al pecho con agarre supino"],
  [/cable upright row/gi, "remo vertical en polea"],
  [/upright row/gi, "remo vertical"],
  [/pulldown con cable por debajo/gi, "jalón al pecho con agarre supino en polea"],
  [/pulldown de cable por debajo/gi, "jalón al pecho con agarre supino en polea"],
  [/remo vertical del cable/gi, "remo vertical en polea"],
  [/remo vertical con cable/gi, "remo vertical en polea"],
  [/jalón hacia abajo/gi, "jalón al pecho"],
  [/empuje hacia abajo/gi, "extensión"],
  [/empujar hacia abajo/gi, "extensión"],
  [/agarre por debajo/gi, "agarre supino"],
  [/por debajo/gi, "con agarre supino"],
  [/agarre por encima/gi, "agarre prono"],
  [/con cable/gi, "en polea"],
  [/del cable/gi, "en polea"],
  [/cable/gi, "polea"],
  
  // Elevaciones de talones (Calf Raises)
  [/donkey calf raise/gi, "elevación de talones tipo burro"],
  [/calf raises/gi, "elevaciones de talones"],
  [/calf raise/gi, "elevación de talones"],
  [/cría de cría de burro/gi, "elevación de talones tipo burro"], // Por si se escapa
  [/cría de burro/gi, "talones tipo burro"],
  
  // Ejercicios Core / Crunch
  [/floor crunch/gi, "crunch en el suelo"],
  [/decline crunch/gi, "crunch declinado"],
  [/incline crunch/gi, "crunch inclinado"],
  [/crisis de declive/gi, "crunch declinado"],
  [/crujido del piso/gi, "crunch en el suelo"],
  [/piso crujiente/gi, "crunch en el suelo"],
  [/crujidos/gi, "crunches"],
  [/crujido/gi, "crunch"],
  [/plank/gi, "plancha"],
  [/tabla/gi, "plancha"],
  
  // Fondos y Push-ups
  [/chest dip/gi, "fondos para pecho"],
  [/triceps dip/gi, "fondos para tríceps"],
  [/inmersión en el pecho/gi, "fondos para pecho"],
  [/inmersión de tríceps/gi, "fondos para tríceps"],
  [/fondos en el pecho/gi, "fondos para pecho"],
  [/inmersiones/gi, "fondos"],
  [/inmersión/gi, "fondo"],
  [/push-up/gi, "flexiones"],
  [/push up/gi, "flexiones"],
  [/flexiones de reloj/gi, "flexiones (clock)"],
  
  // Mancuernas y Equipo
  [/pesa de gimnasia/gi, "mancuerna"],
  [/pesas de gimnasia/gi, "mancuernas"],
  [/campana de la caldera/gi, "pesa rusa"],
  [/barra con pesas/gi, "barra"],
  
  // Prensas y Press
  [/prensa de banca/gi, "press de banca"],
  [/prensa de piernas/gi, "prensa de piernas"],
  [/prensa de hombros/gi, "press de hombros"],
  [/prensa de/gi, "press de"],
  [/rompecráneos/gi, "press francés"],
  [/trituradora de cráneos/gi, "press francés"],
  
  // Aperturas / Fly
  [/mosca con mancuernas/gi, "aperturas con mancuernas"],
  [/mosca de/gi, "apertura de"],
  [/moscas/gi, "aperturas"],
  [/mosca/gi, "apertura"],
  
  // Remos, Curls y Piernas
  [/fila vertical/gi, "remo vertical"],
  [/fila/gi, "remo"],
  [/filas/gi, "remos"],
  [/rizo/gi, "curl"],
  [/rizos/gi, "curls"],
  [/contragolpe/gi, "patada de tríceps"],
  [/estocadas/gi, "desplantes"],
  [/estocada/gi, "desplante"],
  [/pulldown/gi, "jalón al pecho"],
  [/desplegable/gi, "jalón al pecho"]
];

// 🔴 CORRECCIONES MÁS SUAVES PARA INSTRUCCIONES (Para no dañar la gramática de oraciones)
const CORRECCIONES_INSTRUCCIONES: [RegExp, string][] = [
  [/pesa de gimnasia/gi, "mancuerna"],
  [/pesas de gimnasia/gi, "mancuernas"],
  [/campana de la caldera/gi, "pesa rusa"],
  [/barra con pesas/gi, "barra"],
  [/núcleo/gi, "core"],
  [/terneros/gi, "gemelos"],
  [/isquiotibiales/gi, "femorales"],
  [/desplegable/gi, "polea"],
  [/mosca/gi, "apertura"],
  [/rizo/gi, "curl"],
  [/tabla/gi, "plancha"],
  [/inmersión/gi, "fondo"],
  [/crujido/gi, "crunch"],
  [/cría de burro/gi, "talones tipo burro"]
];

// Capitalización de títulos (Title Case pero ignorando conectores)
const toTitleCase = (str: string) => {
  const minorWords = ['de', 'en', 'el', 'la', 'los', 'las', 'con', 'para', 'a', 'y', 'o', 'del', 'al'];
  return str.toLowerCase().split(' ').map((word, index) => {
    if (index > 0 && minorWords.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

export default function EjerciciosTraduccionModule({ onBack }: TraduccionProps) {
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  
  const [stats, setStats] = useState({ total: 0, traducidos: 0, pendientes: 0 });

  const [nombreEs, setNombreEs] = useState("");
  const [parteCuerpoEs, setParteCuerpoEs] = useState("");
  const [musculoEs, setMusculoEs] = useState("");
  const [musculosSecundariosEs, setMusculosSecundariosEs] = useState<string[]>([]);
  const [equipoEs, setEquipoEs] = useState("");
  const [instruccionesEs, setInstruccionesEs] = useState<string[]>([]);

  // ==========================================
  // 🧠 MOTOR DE TRADUCCIÓN INTELIGENTE
  // ==========================================
  const traducirTextoInteligente = async (texto: string, contexto: "titulo" | "instruccion" | "musculo" | "equipo" = "instruccion") => {
    if (!texto) return "";
    const txtLower = texto.trim().toLowerCase();
    
    // 1. Metadatos exactos se mapean sin usar API (100% precisos)
    if (contexto === "musculo" && DICC_MUSCULOS[txtLower]) return DICC_MUSCULOS[txtLower];
    if (contexto === "equipo" && DICC_EQUIPO[txtLower]) return DICC_EQUIPO[txtLower];

    let traducido = texto;
    let preProcesado = false;

    // 2. Pre-Procesamiento para Títulos (Evita que Google rompa frases hechas en inglés)
    if (contexto === "titulo") {
      for (const [regex, reemplazo] of CORRECCIONES_TITULOS) {
        // Si el texto ORIGINAL en inglés ya hace match con nuestra regla fuerte, lo reemplazamos directamente
        if (regex.test(texto)) {
          traducido = texto.replace(regex, reemplazo);
          preProcesado = true; // Ya no lo mandamos a Google para que no lo arruine
          break;
        }
      }
    }

    // 3. Traducción de sintaxis con Google (Si no lo pre-procesamos)
    if (!preProcesado) {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(texto)}`;
        const res = await fetch(url);
        const data = await res.json();
        traducido = data[0].map((item: any) => item[0]).join("");
      } catch (e) {
        console.error("Error en API traductor:", e);
      }
    }

    // 4. Post-Procesamiento Inteligente (Reemplazo de la jerga sobre lo que devolvió Google)
    let corregido = traducido;
    const correcciones = (contexto === "titulo" || contexto === "equipo") ? CORRECCIONES_TITULOS : CORRECCIONES_INSTRUCCIONES;
    
    correcciones.forEach(([regex, reemplazo]) => {
      corregido = corregido.replace(regex, reemplazo);
    });

    // 5. Limpieza final de capitalización
    if (contexto === "titulo" || contexto === "equipo" || contexto === "musculo") {
      return toTitleCase(corregido);
    }
    
    // Para instrucciones: solo primera letra mayúscula
    return corregido.charAt(0).toUpperCase() + corregido.slice(1);
  };

  useEffect(() => {
    const cargarEjercicios = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "ejercicios"));
        const lista: any[] = [];
        let countTraducidos = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          lista.push(data);
          if (data.traducido) countTraducidos++;
        });
        
        setEjercicios(lista);
        setStats({ 
          total: lista.length, 
          traducidos: countTraducidos, 
          pendientes: lista.length - countTraducidos 
        });
        
        if (lista.length > 0) {
          const primerPendiente = lista.findIndex(e => !e.traducido);
          const indexInicial = primerPendiente !== -1 ? primerPendiente : lista.length - 1;
          
          setCurrentIndex(indexInicial);
          prepararEdicion(lista[indexInicial]);
        }
      } catch (error) {
        console.error("Error cargando ejercicios:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarEjercicios();
  }, []);

  const prepararEdicion = async (ejercicio: any) => {
    setTranslating(true);

    if (ejercicio.traducido) {
      setNombreEs(ejercicio.nombreEs || "");
      setParteCuerpoEs(ejercicio.parteCuerpoEs || "");
      setMusculoEs(ejercicio.musculoEs || "");
      setEquipoEs(ejercicio.equipoEs || "");
      setMusculosSecundariosEs(ejercicio.musculosSecundariosEs || []);
      setInstruccionesEs(ejercicio.instruccionesEs || []);
      setTranslating(false);
      return;
    }

    setNombreEs("Traduciendo...");
    setParteCuerpoEs("Traduciendo...");
    setMusculoEs("Traduciendo...");
    setEquipoEs("Traduciendo...");
    setMusculosSecundariosEs(new Array(ejercicio.musculosSecundarios?.length || 0).fill("Traduciendo..."));
    setInstruccionesEs(new Array(ejercicio.instrucciones?.length || 0).fill("Traduciendo..."));

    const [tNombre, tParte, tMusculo, tEquipo] = await Promise.all([
      traducirTextoInteligente(ejercicio.nombre, "titulo"),
      traducirTextoInteligente(ejercicio.parteCuerpo, "musculo"),
      traducirTextoInteligente(ejercicio.musculoObjetivo, "musculo"),
      traducirTextoInteligente(ejercicio.equipo, "equipo")
    ]);

    const tSecundarios = await Promise.all(
      (ejercicio.musculosSecundarios || []).map((musc: string) => traducirTextoInteligente(musc, "musculo"))
    );

    const tInst = await Promise.all(
      (ejercicio.instrucciones || []).map((inst: string) => traducirTextoInteligente(inst, "instruccion"))
    );

    setNombreEs(tNombre);
    setParteCuerpoEs(tParte);
    setMusculoEs(tMusculo);
    setEquipoEs(tEquipo);
    setMusculosSecundariosEs(tSecundarios);
    setInstruccionesEs(tInst);
    setTranslating(false);
  };

  const handleInstruccionChange = (index: number, valor: string) => {
    const nuevas = [...instruccionesEs];
    nuevas[index] = valor;
    setInstruccionesEs(nuevas);
  };

  const handleSecundarioChange = (index: number, valor: string) => {
    const nuevas = [...musculosSecundariosEs];
    nuevas[index] = valor;
    setMusculosSecundariosEs(nuevas);
  };

  const irAnterior = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      prepararEdicion(ejercicios[prevIndex]);
    }
  };

  const guardarYSiguiente = async () => {
    const ejercicioActual = ejercicios[currentIndex];
    setSaving(true);

    try {
      const docRef = doc(db, "ejercicios", ejercicioActual.id);
      
      const datosNuevos = {
        nombreEs,
        parteCuerpoEs,
        musculoEs,
        musculosSecundariosEs,
        equipoEs,
        instruccionesEs,
        traducido: true 
      };

      await updateDoc(docRef, datosNuevos);

      const listaActualizada = [...ejercicios];
      const eraNuevo = !listaActualizada[currentIndex].traducido;
      listaActualizada[currentIndex] = { ...ejercicioActual, ...datosNuevos };
      setEjercicios(listaActualizada);

      if (eraNuevo) {
        setStats(prev => ({
          ...prev,
          traducidos: prev.traducidos + 1,
          pendientes: prev.pendientes - 1
        }));
      }

      if (currentIndex < ejercicios.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        prepararEdicion(listaActualizada[nextIndex]); 
      } else {
        alert("¡Misión Cumplida! Has llegado al final de la base de datos.");
      }
    } catch (error) {
      console.error("Error guardando traducción:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em] animate-pulse">
          Analizando Base de Datos...
        </p>
      </div>
    );
  }

  if (ejercicios.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Database className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Base de Datos Vacía</h2>
        <p className="text-zinc-400 text-xs mb-8">No hay ejercicios para traducir. Ejecuta la extracción primero.</p>
        <button onClick={onBack} className="bg-white text-black px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-xs">
          Volver al panel
        </button>
      </div>
    );
  }

  const ejercicio = ejercicios[currentIndex];
  const labelStyle = "text-[9px] text-cyan-500 font-bold uppercase tracking-widest mb-1 block";
  const inputStyle = "w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all";

  return (
    <main className="min-h-screen bg-black text-white p-4 relative overflow-x-hidden font-sans selection:bg-cyan-500/30">
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/90 to-black pointer-events-none z-0"></div>

      <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col pb-32">
        
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 mt-4">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Salir</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] flex items-center gap-2">
              <Languages className="w-5 h-5 text-cyan-400" /> CURACIÓN DE DATOS
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded text-[10px] font-black tracking-widest items-center gap-1.5" title="Traducidos y verificados">
              <CheckCircle2 className="w-3 h-3" /> {stats.traducidos}
            </div>
            <div className="hidden md:flex bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded text-[10px] font-black tracking-widest items-center gap-1.5" title="Pendientes por traducir">
              <Clock className="w-3 h-3" /> {stats.pendientes}
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-3 py-1 rounded text-[10px] font-black tracking-widest" title="Posición actual / Total">
              {currentIndex + 1} / {stats.total}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* PANEL IZQUIERDO: Original */}
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-5 shadow-inner relative">
            <div className="flex justify-between items-center mb-6 border-b border-zinc-700 pb-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Datos Base (Inglés)</h2>
              <div 
                className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-700/50 px-2.5 py-1 rounded-md text-zinc-400 select-all cursor-text hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                title="Copia este ID para buscarlo en Firestore"
              >
                <Fingerprint className="w-3 h-3" />
                <span className="text-[9px] font-mono tracking-wider">ID: {ejercicio.id}</span>
              </div>
            </div>
            
            <div className="flex gap-4 mb-4">
              {ejercicio.gifUrl && (
                <img src={ejercicio.gifUrl} alt="GIF" className="w-24 h-24 object-cover rounded-lg border border-zinc-700 bg-black" />
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Name</span>
                  <p className="text-sm font-bold text-zinc-300 capitalize">{ejercicio.nombre}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Body Part</span>
                    <p className="text-xs font-bold text-zinc-300 capitalize">{ejercicio.parteCuerpo}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Target Muscle</span>
                    <p className="text-xs font-bold text-zinc-300 capitalize">{ejercicio.musculoObjetivo}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Secondary Muscles</span>
                    <p className="text-xs font-bold text-zinc-300 capitalize">
                      {ejercicio.musculosSecundarios?.length > 0 ? ejercicio.musculosSecundarios.join(", ") : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">Equipment</span>
                    <p className="text-xs font-bold text-zinc-300 capitalize">{ejercicio.equipo}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-2">Instructions</span>
              <ul className="space-y-2">
                {ejercicio.instrucciones?.map((inst: string, i: number) => (
                  <li key={i} className="text-[11px] text-zinc-400 leading-relaxed bg-black/40 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-600 font-bold mr-1">{i + 1}.</span> {inst}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* PANEL DERECHO: Edición y Verificación */}
          <div className="bg-zinc-950/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-6 border-b border-cyan-500/20 pb-2 flex justify-between items-center">
              Revisión (Español)
              {translating ? (
                <span className="text-[9px] text-cyan-500 animate-pulse flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3" /> Auto-Traduciendo...
                </span>
              ) : ejercicio.traducido ? (
                <span className="text-[9px] text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ya traducido
                </span>
              ) : (
                <span className="text-[9px] text-amber-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Listo para revisar
                </span>
              )}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={labelStyle}>Nombre del Ejercicio</label>
                <input type="text" value={nombreEs} onChange={e => setNombreEs(e.target.value)} className={inputStyle} disabled={translating} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Parte del Cuerpo</label>
                  <input type="text" value={parteCuerpoEs} onChange={e => setParteCuerpoEs(e.target.value)} className={inputStyle} disabled={translating} />
                </div>
                <div>
                  <label className={labelStyle}>Músculo Objetivo</label>
                  <input type="text" value={musculoEs} onChange={e => setMusculoEs(e.target.value)} className={inputStyle} disabled={translating} />
                </div>
                
                {/* Músculos Secundarios Editables */}
                {musculosSecundariosEs.length > 0 && (
                  <div className="col-span-2">
                    <label className={labelStyle}>Músculos Secundarios</label>
                    <div className="grid grid-cols-2 gap-2">
                      {musculosSecundariosEs.map((musc, i) => (
                        <input
                          key={`sec-${i}`}
                          type="text"
                          value={musc}
                          onChange={e => handleSecundarioChange(i, e.target.value)}
                          className={inputStyle}
                          disabled={translating}
                          placeholder={`Secundario ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className={labelStyle}>Equipo Necesario</label>
                  <input type="text" value={equipoEs} onChange={e => setEquipoEs(e.target.value)} className={inputStyle} disabled={translating} />
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <label className={labelStyle}>Instrucciones</label>
                <div className="space-y-2 mt-2">
                  {instruccionesEs.map((inst, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[10px] font-black text-cyan-600 mt-2">{i + 1}.</span>
                      <textarea 
                        value={inst} 
                        onChange={(e) => handleInstruccionChange(i, e.target.value)}
                        className={`${inputStyle} min-h-[60px] resize-y`}
                        disabled={translating}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Botonera Flotante de Navegación y Guardado */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        <button 
          onClick={irAnterior}
          disabled={currentIndex === 0 || saving || translating}
          className="bg-zinc-800 text-zinc-300 px-6 py-4 rounded-full flex items-center gap-2 font-black uppercase tracking-widest text-xs shadow-lg hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-30"
          title="Ver ejercicio anterior"
        >
          <ChevronLeft className="w-4 h-4" /> Atrás
        </button>

        <button 
          onClick={guardarYSiguiente}
          disabled={saving || translating}
          className={`${ejercicio.traducido ? 'bg-emerald-500' : 'bg-cyan-500'} text-black px-8 py-4 rounded-full flex items-center gap-3 font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105 transition-all disabled:opacity-50`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving 
            ? "ACTUALIZANDO DB..." 
            : ejercicio.traducido 
              ? "ACTUALIZAR Y SIGUIENTE" 
              : "VERIFICADO Y SIGUIENTE"}
          {!saving && <ChevronRight className="w-4 h-4 ml-1" />}
        </button>
      </div>
    </main>
  );
}