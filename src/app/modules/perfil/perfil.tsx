"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, Save, User, Activity, Check, X, AlertTriangle, 
  ChevronDown, ChevronUp, Ruler, TrendingUp, History, Loader2, Plus, Lock, Unlock
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

interface PerfilModuleProps {
  onBack: () => void;
}

// 20 Objetivos Principales
const OBJETIVOS_PRINCIPALES = [
  "Salud General", "Condición Física", "Fuerza Máxima", "Hipertrofia", 
  "Pérdida de Grasa", "Recomposición Corporal", "Resistencia Cardiovascular", 
  "Movilidad", "Flexibilidad", "Potencia", "Agilidad", "Equilibrio", 
  "Postura", "Reducción de Estrés", "Aumento de Energía", "Tonificación", 
  "Prevención de Lesiones", "Rehabilitación", "Rendimiento Deportivo", "Bienestar Mental"
];

// 30 Objetivos Extra para el Modal
const OBJETIVOS_EXTRA = [
  "Definición Muscular", "Acondicionamiento Metabólico", "Fuerza Explosiva", 
  "Resistencia Muscular", "Fortalecimiento del Core", "Salud Articular", 
  "Recuperación Activa", "Entrenamiento Funcional", "Calistenia Básica", 
  "Preparación para Competencia", "Estética Corporal", "Salud Ósea", 
  "Control de Peso", "Longevidad", "Calidad de Sueño", "Capacidad Pulmonar", 
  "Velocidad", "Coordinación", "Disciplina", "Creación de Hábitos", 
  "Autoestima", "Volumen (Aumento de Peso)", "Fuerza de Agarre", 
  "Movilidad de Cadera", "Estabilidad de Hombros", "Corrección de Asimetrías", 
  "Resiliencia Física", "Fuerza Isométrica", "Pliometría", "Salud Cardiovascular"
];

export default function PerfilModule({ onBack }: PerfilModuleProps) {
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Modal de Objetivos
  const [showObjModal, setShowObjModal] = useState(false);
  
  // Estados de Identidad
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [usernameDisplay, setUsernameDisplay] = useState("");
  const [edad, setEdad] = useState("");
  const [genero, setGenero] = useState("");
  const [objetivos, setObjetivos] = useState<string[]>([]);
  
  // Verificación de Username
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userAvailable, setUserAvailable] = useState<boolean | null>(null);
  const [originalUsername, setOriginalUsername] = useState("");

  // Estados de Composición Corporal
  const [compCorpAbierta, setCompCorpAbierta] = useState(false);
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [grasa, setGrasa] = useState("");
  const [musculo, setMusculo] = useState("");
  const [bmi, setBmi] = useState("");
  
  // 🔴 NUEVO ESTADO: Privacidad de Métricas Avanzadas
  const [metricasPublicas, setMetricasPublicas] = useState(false);
  
  // Circunferencias
  const [medidas, setMedidas] = useState({
    cuello: "", hombros: "", pecho: "", biceps: "", antebrazo: "", 
    cintura: "", cadera: "", muslo: "", pantorrilla: ""
  });

  const DRAFT_KEY = "coachvital_perfil_draft";

  // Cargar datos al montar (DB + Caché local)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        let dbData: any = {};
        if (docSnap.exists()) {
          dbData = docSnap.data();
          setOriginalUsername(dbData.username || "");
        }

        // Recuperar caché si se recargó la página por error
        const cachedDraft = sessionStorage.getItem(DRAFT_KEY);
        if (cachedDraft) {
          const draft = JSON.parse(cachedDraft);
          setNombres(draft.nombres || dbData.nombres || "");
          setApellidos(draft.apellidos || dbData.apellidos || "");
          setUsernameDisplay(draft.usernameDisplay || dbData.usernameDisplay || dbData.username || "");
          setEdad(draft.edad || dbData.edad || "");
          setGenero(draft.genero || dbData.genero || "");
          setObjetivos(draft.objetivos || dbData.objetivos || []);
          setPeso(draft.peso || dbData.peso || "");
          setAltura(draft.altura || dbData.altura || "");
          setGrasa(draft.grasa || dbData.grasa || "");
          setMusculo(draft.musculo || dbData.musculo || "");
          setBmi(draft.bmi || dbData.bmi || "");
          setMetricasPublicas(draft.metricasPublicas !== undefined ? draft.metricasPublicas : (dbData.metricasPublicas || false));
          setMedidas(draft.medidas || dbData.medidas || { cuello: "", hombros: "", pecho: "", biceps: "", antebrazo: "", cintura: "", cadera: "", muslo: "", pantorrilla: "" });
          setHasChanges(true);
        } else {
          // Si no hay caché, cargar de DB
          setNombres(dbData.nombres || "");
          setApellidos(dbData.apellidos || "");
          setUsernameDisplay(dbData.usernameDisplay || dbData.username || "");
          setEdad(dbData.edad || "");
          setGenero(dbData.genero || "");
          setObjetivos(dbData.objetivos || []);
          setPeso(dbData.peso || "");
          setAltura(dbData.altura || "");
          setGrasa(dbData.grasa || "");
          setMusculo(dbData.musculo || "");
          setBmi(dbData.bmi || "");
          setMetricasPublicas(dbData.metricasPublicas || false);
          if (dbData.medidas) setMedidas(dbData.medidas);
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchUserData();
  }, []);

  // Guardar en caché automáticamente al detectar cambios
  useEffect(() => {
    if (!loadingData) {
      const draft = {
        nombres, apellidos, usernameDisplay, edad, genero,
        objetivos, peso, altura, grasa, musculo, bmi, medidas, metricasPublicas
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setHasChanges(true);
    }
  }, [nombres, apellidos, usernameDisplay, edad, genero, objetivos, peso, altura, grasa, musculo, bmi, medidas, metricasPublicas, loadingData]);

  // Restringir Username (Solo letras)
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloLetras = e.target.value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ]/g, '');
    setUsernameDisplay(soloLetras);
  };

  // Verificar disponibilidad de Username en Firebase
  useEffect(() => {
    const userToSave = usernameDisplay.toLowerCase();
    
    if (userToSave === originalUsername) {
      setUserAvailable(null);
      setIsCheckingUser(false);
      return;
    }
    
    if (userToSave.length < 3) {
      setUserAvailable(false);
      return;
    }

    const checkUser = setTimeout(async () => {
      setIsCheckingUser(true);
      const q = query(collection(db, "users"), where("username", "==", userToSave));
      const querySnapshot = await getDocs(q);
      setUserAvailable(querySnapshot.empty);
      setIsCheckingUser(false);
    }, 600);

    return () => clearTimeout(checkUser);
  }, [usernameDisplay, originalUsername]);

  const toggleObjetivo = (obj: string) => {
    setObjetivos(prev => 
      prev.includes(obj) ? prev.filter(item => item !== obj) : [...prev, obj]
    );
  };

  const handleMedidaChange = (zona: keyof typeof medidas, valor: string) => {
    setMedidas(prev => ({ ...prev, [zona]: valor }));
  };

  const guardarCambios = async () => {
    if (userAvailable === false) return; 
    if (!auth.currentUser) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, {
        nombres,
        apellidos,
        usernameDisplay, 
        username: usernameDisplay.toLowerCase(),
        edad,
        genero,
        objetivos,
        peso,
        altura,
        grasa,
        musculo,
        bmi,
        medidas,
        metricasPublicas, // 🔴 Se guarda en Firebase
        perfilCompletado: true
      });
      setOriginalUsername(usernameDisplay.toLowerCase());
      setHasChanges(false);
      setUserAvailable(null);
      sessionStorage.removeItem(DRAFT_KEY); 
    } catch (error) {
      console.error("Error guardando:", error);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = "w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelStyle = "text-[10px] text-zinc-400 font-bold mb-1.5 ml-1 block";
  const cardStyle = "bg-zinc-950/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-[0_0_30px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10";

  if (loadingData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
        <p className="text-[10px] text-white font-bold uppercase tracking-[0.2em] animate-pulse">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-black text-white p-4 md:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30 pb-32">
        
        {/* Fondo */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>

        <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Volver</span>
            </button>
            <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              MI PERFIL
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ====== COLUMNA IZQUIERDA (FORMULARIOS) ====== */}
            <div className="lg:col-span-7 space-y-6 flex flex-col">
              
              {/* Tarjeta 1: Identidad */}
              <div className={cardStyle}>
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <User className="w-5 h-5 text-white" />
                  <h2 className="text-sm font-bold tracking-wider text-white">Datos Personales</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Nombre(s)</label>
                    <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Apellidos</label>
                    <input type="text" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={inputStyle} />
                  </div>
                  
                  {/* Validación de Username */}
                  <div className="md:col-span-2 relative">
                    <label className={labelStyle}>Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                      <input 
                        type="text" 
                        value={usernameDisplay} 
                        onChange={handleUsernameChange} 
                        className={`${inputStyle} pl-8 ${userAvailable === false ? 'border-rose-500/50 bg-rose-500/5 focus:border-rose-500' : ''}`} 
                        placeholder="Solo letras" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingUser ? <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" /> : 
                         userAvailable === true ? <Check className="w-4 h-4 text-emerald-500" /> : 
                         userAvailable === false ? <X className="w-4 h-4 text-rose-500" /> : null}
                      </div>
                    </div>
                    {userAvailable === false && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Este usuario ya está en uso.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>Edad</label>
                    <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Género</label>
                    <select value={genero} onChange={(e) => setGenero(e.target.value)} className={inputStyle}>
                      <option value="" disabled className="bg-zinc-900 text-zinc-500">Seleccionar...</option>
                      <option value="masculino" className="bg-zinc-900 text-white">Masculino</option>
                      <option value="femenino" className="bg-zinc-900 text-white">Femenino</option>
                    </select>
                  </div>
                </div>

                {/* Objetivos */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <label className={labelStyle}>Objetivos Principales</label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {OBJETIVOS_PRINCIPALES.map((obj) => (
                      <button
                        key={obj}
                        onClick={() => toggleObjetivo(obj)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          objetivos.includes(obj) 
                            ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        {obj}
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowObjModal(true)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-dashed border-white/30 text-white hover:bg-white/10 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> MOSTRAR MÁS
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Composición Corporal */}
              <div className={cardStyle}>
                <div 
                  className="flex justify-between items-center cursor-pointer group"
                  onClick={() => setCompCorpAbierta(!compCorpAbierta)}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-white" />
                    <h2 className="text-sm font-bold tracking-wider text-white">Composición Corporal</h2>
                  </div>
                  {compCorpAbierta ? <ChevronUp className="w-5 h-5 text-zinc-400 group-hover:text-white" /> : <ChevronDown className="w-5 h-5 text-zinc-400 group-hover:text-white" />}
                </div>

                {compCorpAbierta && (
                  <div className="mt-6 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className={labelStyle}>Peso (kg)</label>
                        <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}>Altura (m)</label>
                        <input type="number" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} className={inputStyle} />
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <button 
                        onClick={() => setAvanzadoAbierto(!avanzadoAbierto)}
                        className="w-full flex items-center justify-between text-[11px] text-zinc-300 font-bold uppercase tracking-widest hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2"><Ruler className="w-4 h-4" /> Antropometría Avanzada</span>
                        {avanzadoAbierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {avanzadoAbierto && (
                        <div className="mt-5 space-y-5 animate-in fade-in duration-300">
                          
                          {/* 🔴 CONTROL DE PRIVACIDAD */}
                          <div 
                            onClick={() => setMetricasPublicas(!metricasPublicas)}
                            className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/30 transition-all group"
                          >
                            <div className="flex-1 pr-4">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                {metricasPublicas ? <Unlock className="w-3.5 h-3.5 text-white" /> : <Lock className="w-3.5 h-3.5 text-zinc-500" />}
                                Compartir Métricas
                              </h4>
                              <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
                                Permitir que tu entrenador y amigos vinculados puedan ver el detalle avanzado de tu composición corporal.
                              </p>
                            </div>
                            <div className={`shrink-0 w-10 h-5 rounded-full relative transition-colors duration-300 ${metricasPublicas ? 'bg-white' : 'bg-zinc-800'}`}>
                              <div className={`absolute top-[2px] w-4 h-4 rounded-full transition-all duration-300 ${metricasPublicas ? 'bg-black left-[22px]' : 'bg-zinc-500 left-[2px]'}`}></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div><label className={labelStyle}>% Grasa</label><input type="number" value={grasa} onChange={(e) => setGrasa(e.target.value)} className={inputStyle} placeholder="%" /></div>
                            <div><label className={labelStyle}>% Músculo</label><input type="number" value={musculo} onChange={(e) => setMusculo(e.target.value)} className={inputStyle} placeholder="%" /></div>
                            <div><label className={labelStyle}>BMI</label><input type="number" value={bmi} onChange={(e) => setBmi(e.target.value)} className={inputStyle} placeholder="Índice" /></div>
                          </div>

                          <div>
                            <label className="text-[11px] text-white font-bold uppercase tracking-widest mb-3 block border-b border-white/10 pb-2">Circunferencias (cm)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {Object.keys(medidas).map((zona) => (
                                <div key={zona}>
                                  <label className="text-[10px] text-zinc-400 capitalize mb-1 block">{zona}</label>
                                  <input 
                                    type="number" 
                                    value={medidas[zona as keyof typeof medidas]} 
                                    onChange={(e) => handleMedidaChange(zona as keyof typeof medidas, e.target.value)}
                                    className={`${inputStyle} !p-2.5`} placeholder="cm" 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ====== COLUMNA DERECHA (TARJETAS HUD) ====== */}
            <div className="lg:col-span-5 space-y-6">
              <div className={`${cardStyle} flex flex-col items-center justify-center text-center min-h-[250px] relative overflow-hidden group`}>
                <History className="w-12 h-12 text-zinc-700 mb-4 group-hover:scale-110 transition-transform duration-500" />
                <h2 className="text-base font-bold tracking-wider text-zinc-400">Historial</h2>
                <p className="text-[11px] text-zinc-500 mt-2 max-w-[200px]">
                  Tus cargas y sesiones pasadas aparecerán aquí pronto.
                </p>
              </div>

              <div className={`${cardStyle} flex flex-col items-center justify-center text-center min-h-[250px] relative overflow-hidden group`}>
                <TrendingUp className="w-12 h-12 text-zinc-700 mb-4 group-hover:scale-110 transition-transform duration-500" />
                <h2 className="text-base font-bold tracking-wider text-zinc-400">Progreso</h2>
                <p className="text-[11px] text-zinc-500 mt-2 max-w-[200px]">
                  Gráficas de volumen y evolución corporal en construcción.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Flotante de Guardar */}
        {hasChanges && userAvailable !== false && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5">
            <button 
              onClick={guardarCambios}
              disabled={saving}
              className="bg-white text-black px-8 py-4 rounded-full flex items-center gap-3 font-black uppercase tracking-widest text-xs shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-all disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
            </button>
          </div>
        )}
      </main>

      {/* MODAL DE OBJETIVOS EXTRAS */}
      {showObjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white tracking-wider">Todos los Objetivos</h3>
              <button onClick={() => setShowObjModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 flex flex-wrap gap-2 content-start custom-scrollbar">
              {[...OBJETIVOS_PRINCIPALES, ...OBJETIVOS_EXTRA].map((obj) => (
                <button
                  key={`modal-${obj}`}
                  onClick={() => toggleObjetivo(obj)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all border ${
                    objetivos.includes(obj) 
                      ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  {obj}
                </button>
              ))}
            </div>
            <div className="p-5 border-t border-white/10 flex justify-end">
              <button onClick={() => setShowObjModal(false)} className="bg-white text-black px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider">
                Hecho
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}