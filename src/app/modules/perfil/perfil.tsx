"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, Save, User, Activity, Check, X, AlertTriangle, 
  ChevronDown, ChevronUp, Ruler, TrendingUp, History, Loader2, Plus, Lock, Unlock, Sparkles
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";

import HistorialSesiones from "./historialsesiones";
import HistorialProgreso from "./historialprogreso";
// 🔴 NUEVO MÓDULO DE FECHA
import FechaRegistroData from "./fecharegistrodata";

interface PerfilModuleProps {
  onBack: () => void;
}

const OBJETIVOS_PRINCIPALES = [
  "Salud General", "Condición Física", "Fuerza Máxima", "Hipertrofia", 
  "Pérdida de Grasa", "Recomposición Corporal", "Resistencia Cardiovascular", 
  "Movilidad", "Flexibilidad", "Potencia", "Agilidad", "Equilibrio", 
  "Postura", "Reducción de Estrés", "Aumento de Energía", "Tonificación", 
  "Prevención de Lesiones", "Rehabilitación", "Rendimiento Deportivo", "Bienestar Mental"
];

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
  const [activeView, setActiveView] = useState<'perfil' | 'historial' | 'progreso'>('perfil');

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [rol, setRol] = useState<string>("clasico");

  const [showObjModal, setShowObjModal] = useState(false);
  
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [usernameDisplay, setUsernameDisplay] = useState("");
  const [edad, setEdad] = useState("");
  const [genero, setGenero] = useState("");
  const [objetivos, setObjetivos] = useState<string[]>([]);
  
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userAvailable, setUserAvailable] = useState<boolean | null>(null);
  const [originalUsername, setOriginalUsername] = useState("");

  const [compCorpAbierta, setCompCorpAbierta] = useState(false);
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);
  
  // 🔴 ESTADO PARA LA FECHA DEL REGISTRO FÍSICO
  const [fechaRegistro, setFechaRegistro] = useState<string>(new Date().toISOString().split('T')[0]);

  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [grasa, setGrasa] = useState("");
  const [musculo, setMusculo] = useState("");
  const [bmi, setBmi] = useState("");
  const [metricasPublicas, setMetricasPublicas] = useState(false);
  
  const [medidas, setMedidas] = useState({
    cuello: "", hombros: "", pecho: "", biceps: "", antebrazo: "", 
    cintura: "", cadera: "", muslo: "", pantorrilla: ""
  });

  const DRAFT_KEY = "coachvital_perfil_draft";

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
          setRol(dbData.rol || "clasico"); 
        }

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
          if(draft.fechaRegistro) setFechaRegistro(draft.fechaRegistro);
          setHasChanges(true);
        } else {
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

  useEffect(() => {
    if (!loadingData) {
      const draft = {
        nombres, apellidos, usernameDisplay, edad, genero,
        objetivos, peso, altura, grasa, musculo, bmi, medidas, metricasPublicas, fechaRegistro
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setHasChanges(true);
    }
  }, [nombres, apellidos, usernameDisplay, edad, genero, objetivos, peso, altura, grasa, musculo, bmi, medidas, metricasPublicas, fechaRegistro, loadingData]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloLetras = e.target.value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ]/g, '');
    setUsernameDisplay(soloLetras);
  };

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
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      // 1. SOBRESCRIBIMOS EL PERFIL PRINCIPAL (Para no afectar el resto de la app)
      await updateDoc(userRef, {
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
        metricasPublicas,
        perfilCompletado: true
      });

      // 2. CREAMOS EL REGISTRO HISTÓRICO INMUTABLE EN LA SUBCOLECCIÓN
      const progresoRef = collection(db, "users", auth.currentUser.uid, "progreso_corporal");
      await addDoc(progresoRef, {
        fecha: fechaRegistro, // Formato YYYY-MM-DD
        timestamp: new Date().getTime(),
        peso: peso ? parseFloat(peso) : null,
        altura: altura ? parseFloat(altura) : null,
        grasa: grasa ? parseFloat(grasa) : null,
        musculo: musculo ? parseFloat(musculo) : null,
        bmi: bmi ? parseFloat(bmi) : null,
        medidas: {
          cuello: medidas.cuello ? parseFloat(medidas.cuello) : null,
          hombros: medidas.hombros ? parseFloat(medidas.hombros) : null,
          pecho: medidas.pecho ? parseFloat(medidas.pecho) : null,
          biceps: medidas.biceps ? parseFloat(medidas.biceps) : null,
          antebrazo: medidas.antebrazo ? parseFloat(medidas.antebrazo) : null,
          cintura: medidas.cintura ? parseFloat(medidas.cintura) : null,
          cadera: medidas.cadera ? parseFloat(medidas.cadera) : null,
          muslo: medidas.muslo ? parseFloat(medidas.muslo) : null,
          pantorrilla: medidas.pantorrilla ? parseFloat(medidas.pantorrilla) : null,
        }
      });

      setOriginalUsername(usernameDisplay.toLowerCase());
      setHasChanges(false);
      setUserAvailable(null);
      
      // 🔴 3. LIMPIEZA DE CACHÉ
      sessionStorage.removeItem(DRAFT_KEY); 
      sessionStorage.removeItem("cv_progreso_corporal_cache"); 
      
    } catch (error) {
      console.error("Error guardando:", error);
    } finally {
      setSaving(false);
    }
  };

  if (activeView === 'historial') {
    return <HistorialSesiones onBack={() => setActiveView('perfil')} />;
  }
  
  if (activeView === 'progreso') {
    return <HistorialProgreso onBack={() => setActiveView('perfil')} />;
  }

  const inputStyle = "w-full bg-white/5 border border-white/10 rounded-md sm:rounded-lg p-2 sm:p-3 text-[11px] sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelStyle = "text-[9px] sm:text-[10px] text-zinc-400 font-bold mb-1 sm:mb-1.5 ml-1 block uppercase tracking-widest";
  const cardStyle = "bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_0_30px_-10px_rgba(255,255,255,0.05)]";

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
      <main className="min-h-screen bg-black text-white p-2.5 sm:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30 pb-24 sm:pb-32">
        
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>

        <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col">
          
          <div className="flex justify-between items-center mb-4 sm:mb-8 border-b border-white/10 pb-3 sm:pb-4">
            <button onClick={onBack} className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 hover:text-white transition-colors group">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Volver</span>
            </button>
            <h1 className="text-lg sm:text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              MI PERFIL
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
            
            {/* ====== COLUMNA IZQUIERDA (FORMULARIOS) ====== */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-6 flex flex-col">
              
              {/* Tarjeta 1: Identidad */}
              <div className={cardStyle}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6 border-b border-white/10 pb-2.5 sm:pb-4">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-white">Datos Personales</h2>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-2.5 sm:mb-4">
                  <div>
                    <label className={labelStyle}>Nombre(s)</label>
                    <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Apellidos</label>
                    <input type="text" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={inputStyle} />
                  </div>
                </div>

                <div className="mb-2.5 sm:mb-4 relative">
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
                    <p className="text-[9px] sm:text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Este usuario ya está en uso.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
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
                <div className="mt-3 sm:mt-6 pt-3 sm:pt-6 border-t border-white/5">
                  <label className={labelStyle}>Objetivos Principales</label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    {OBJETIVOS_PRINCIPALES.map((obj) => (
                      <button
                        key={obj}
                        onClick={() => toggleObjetivo(obj)}
                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold transition-all border ${
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
                      className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold transition-all border border-dashed border-white/30 text-white hover:bg-white/10 flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> MOSTRAR MÁS
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
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-emerald-500/10 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-emerald-500/20 text-emerald-500">
                      <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h2 className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-white">Composición Corporal</h2>
                  </div>
                  {compCorpAbierta ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-white" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-white" />}
                </div>

                {compCorpAbierta && (
                  <div className="mt-4 sm:mt-6 animate-in slide-in-from-top-2 fade-in duration-200">
                    
                    {/* 🔴 MÓDULO DE FECHA DE REGISTRO */}
                    <div className="mb-4 sm:mb-6">
                      <FechaRegistroData fecha={fechaRegistro} onChange={setFechaRegistro} />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-3 sm:mb-6">
                      <div>
                        <label className={labelStyle}>Peso (kg)</label>
                        <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}>Altura (m)</label>
                        <input type="number" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} className={inputStyle} />
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-2.5 sm:pt-4">
                      <button 
                        onClick={() => setAvanzadoAbierto(!avanzadoAbierto)}
                        className="w-full flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-300 font-bold uppercase tracking-widest hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-1.5 sm:gap-2"><Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Antropometría Avanzada</span>
                        {avanzadoAbierto ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                      
                      {avanzadoAbierto && (
                        <div className="mt-3 sm:mt-5 space-y-3 sm:space-y-5 animate-in fade-in duration-300">
                          
                          {rol === "clasico" ? (
                            <div className="relative p-3 sm:p-6 flex flex-col items-center justify-center text-center bg-zinc-950/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-rose-500/20 animate-in zoom-in-95 duration-300 overflow-hidden min-h-[130px]">
                              <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none"></div>
                              <div className="bg-rose-500/10 p-2 sm:p-3 rounded-full mb-1.5 sm:mb-3 ring-1 ring-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                                <Lock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-rose-500" />
                              </div>
                              <h4 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest mb-1 relative z-10">Métricas Avanzadas Bloqueadas</h4>
                              <p className="text-[8px] sm:text-[10px] text-zinc-400 font-medium px-2 leading-relaxed mb-2 sm:mb-4 relative z-10 max-w-[280px]">
                                Actualiza tu plan para desbloquear circunferencias, índice de masa corporal, y analítica de grasa/músculo.
                              </p>
                              <button className="relative z-10 bg-white text-black px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                                <Sparkles className="w-3 h-3" /> Próximamente
                              </button>
                            </div>
                          ) : (
                            <>
                              <div 
                                onClick={() => setMetricasPublicas(!metricasPublicas)}
                                className="p-2.5 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-lg sm:rounded-xl flex items-center justify-between cursor-pointer hover:border-white/30 transition-all group"
                              >
                                <div className="flex-1 pr-3 sm:pr-4">
                                  <h4 className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest mb-0.5 sm:mb-1 flex items-center gap-1.5 sm:gap-2">
                                    {metricasPublicas ? <Unlock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> : <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />}
                                    Compartir Métricas
                                  </h4>
                                  <p className="text-[8px] sm:text-[9px] text-zinc-400 leading-relaxed font-medium">
                                    Permitir que tu entrenador y amigos vinculados puedan ver el detalle avanzado de tu composición corporal.
                                  </p>
                                </div>
                                <div className={`shrink-0 w-8 h-4 sm:w-10 sm:h-5 rounded-full relative transition-colors duration-300 ${metricasPublicas ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                                  <div className={`absolute top-[2px] w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 ${metricasPublicas ? 'bg-black left-[18px] sm:left-[22px]' : 'bg-zinc-500 left-[2px]'}`}></div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <div><label className={labelStyle}>% Grasa</label><input type="number" value={grasa} onChange={(e) => setGrasa(e.target.value)} className={inputStyle} placeholder="%" /></div>
                                <div><label className={labelStyle}>% Músculo</label><input type="number" value={musculo} onChange={(e) => setMusculo(e.target.value)} className={inputStyle} placeholder="%" /></div>
                                <div><label className={labelStyle}>BMI</label><input type="number" value={bmi} onChange={(e) => setBmi(e.target.value)} className={inputStyle} placeholder="Índice" /></div>
                              </div>

                              <div>
                                <label className="text-[9px] sm:text-[11px] text-white font-bold uppercase tracking-widest mb-2 sm:mb-3 block border-b border-white/10 pb-1.5 sm:pb-2">Circunferencias (cm)</label>
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                  {Object.keys(medidas).map((zona) => (
                                    <div key={zona}>
                                      <label className="text-[8px] sm:text-[10px] text-zinc-400 capitalize mb-1 block font-bold">{zona}</label>
                                      <input 
                                        type="number" 
                                        value={medidas[zona as keyof typeof medidas]} 
                                        onChange={(e) => handleMedidaChange(zona as keyof typeof medidas, e.target.value)}
                                        className={`${inputStyle} !p-1.5 sm:!p-2.5`} placeholder="cm" 
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ====== COLUMNA DERECHA (TARJETAS HUD Y CONEXIONES A MÓDULOS) ====== */}
            <div className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-6 items-start h-min">
              
              <button 
                onClick={() => setActiveView('historial')}
                className={`${cardStyle} !p-3 sm:!p-6 w-full flex flex-col items-center justify-center text-center min-h-[110px] sm:min-h-[220px] relative overflow-hidden group hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all active:scale-[0.98]`}
              >
                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity"><History className="w-16 h-16 sm:w-32 sm:h-32 text-cyan-500" /></div>
                <div className="bg-cyan-500/10 p-2 sm:p-3 rounded-lg sm:rounded-2xl mb-1.5 sm:mb-4 group-hover:scale-110 transition-transform duration-500 border border-cyan-500/20">
                  <History className="w-4 h-4 sm:w-8 sm:h-8 text-cyan-500" />
                </div>
                <h2 className="text-[9px] sm:text-sm font-black uppercase tracking-widest text-white">Historial</h2>
                <p className="text-[8px] sm:text-[10px] text-zinc-400 mt-1 sm:mt-2 font-medium leading-relaxed max-w-[220px] hidden sm:block">
                  Accede a la bitácora completa de tus entrenamientos, series, pesos y tiempos.
                </p>
              </button>

              <button 
                onClick={() => setActiveView('progreso')}
                className={`${cardStyle} !p-3 sm:!p-6 w-full flex flex-col items-center justify-center text-center min-h-[110px] sm:min-h-[220px] relative overflow-hidden group hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all active:scale-[0.98]`}
              >
                <div className="absolute -left-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity"><TrendingUp className="w-16 h-16 sm:w-32 sm:h-32 text-emerald-500" /></div>
                <div className="bg-emerald-500/10 p-2 sm:p-3 rounded-lg sm:rounded-2xl mb-1.5 sm:mb-4 group-hover:scale-110 transition-transform duration-500 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 sm:w-8 sm:h-8 text-emerald-500" />
                </div>
                <h2 className="text-[9px] sm:text-sm font-black uppercase tracking-widest text-white">Progreso</h2>
                <p className="text-[8px] sm:text-[10px] text-zinc-400 mt-1 sm:mt-2 font-medium leading-relaxed max-w-[220px] hidden sm:block">
                  Analiza tus gráficas de volumen, cambios corporales y métricas de desempeño.
                </p>
              </button>

            </div>
          </div>
        </div>

        {/* Botón Flotante de Guardar */}
        {hasChanges && userAvailable !== false && (
          <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 w-[90%] max-w-sm sm:w-auto">
            <button 
              onClick={guardarCambios}
              disabled={saving}
              className="w-full sm:w-auto bg-white text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-full flex items-center justify-center gap-2 sm:gap-3 font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-all disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-4 h-4 sm:w-4 sm:h-4" />}
              {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
            </button>
          </div>
        )}
      </main>

      {/* MODAL DE OBJETIVOS EXTRAS */}
      {showObjModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.1)] overflow-hidden">
            <div className="p-3.5 sm:p-5 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-widest">Todos los Objetivos</h3>
              <button onClick={() => setShowObjModal(false)} className="text-zinc-500 hover:text-white bg-black/40 hover:bg-zinc-800 p-1.5 sm:p-2 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 flex flex-wrap gap-1.5 sm:gap-2 content-start custom-scrollbar bg-black/20">
              {[...OBJETIVOS_PRINCIPALES, ...OBJETIVOS_EXTRA].map((obj) => (
                <button
                  key={`modal-${obj}`}
                  onClick={() => toggleObjetivo(obj)}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold transition-all border ${
                    objetivos.includes(obj) 
                      ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  {obj}
                </button>
              ))}
            </div>
            <div className="p-3.5 sm:p-5 border-t border-white/10 flex justify-end bg-zinc-900/50">
              <button onClick={() => setShowObjModal(false)} className="w-full sm:w-auto bg-white text-black px-6 py-2.5 sm:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                Aceptar Selección
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}