"use client";

import { useState, useEffect } from "react";
import { Folder, FolderPlus, Dumbbell, Search, PlusCircle, Loader2, MoreVertical, Edit2, Trash2, AlertTriangle, X, CheckCircle2, Palette, ChevronRight, Eye, ClipboardCheck } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";

// IMPORTA TU MÓDULO DE CREACIÓN AQUÍ 
import CreacionRutinaModule from "../../../misrutinas/creacionrutina/creacionrutina";

const MAX_RUTINAS = 100;

// Paleta Neón para carpetas
const COLORES_CARPETAS = [
  { id: "cyan", label: "Cyan", class: "bg-cyan-500", border: "border-cyan-500", text: "text-cyan-500" },
  { id: "rose", label: "Rojo Vino", class: "bg-rose-500", border: "border-rose-500", text: "text-rose-500" },
  { id: "emerald", label: "Esmeralda", class: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-500" },
  { id: "amber", label: "Ámbar", class: "bg-amber-500", border: "border-amber-500", text: "text-amber-500" },
  { id: "purple", label: "Púrpura", class: "bg-purple-500", border: "border-purple-500", text: "text-purple-500" },
  { id: "white", label: "Blanco", class: "bg-white", border: "border-white", text: "text-white" },
];

// INTERFAZ DE PROPS PARA EL MODO SELECCIÓN
interface RutinasPrearmadasProps {
  modoSeleccion?: boolean;
  onSelectRutina?: (rutina: any) => void;
  clienteAAsignar?: any; 
}

export default function RutinasPrearmadasModule({ modoSeleccion = false, onSelectRutina, clienteAAsignar }: RutinasPrearmadasProps) {
  // Estados Generales
  const [loading, setLoading] = useState(true);
  const [rutinas, setRutinas] = useState<any[]>([]);
  const [carpetas, setCarpetas] = useState<any[]>([]);
  const [filtroCarpeta, setFiltroCarpeta] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");

  // Estado de Vista (Lista vs Creador)
  const [isCreating, setIsCreating] = useState(false);

  // Estados de Modales
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showOrganizeModal, setShowOrganizeModal] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any | null>(null);
  
  // NUEVOS ESTADOS PARA ASIGNACIÓN
  const [rutinaViewDetail, setRutinaViewDetail] = useState<any | null>(null); 
  const [showAsignarConfirm, setShowAsignarConfirm] = useState<any | null>(null); 

  const [sysAlert, setSysAlert] = useState<{ text: string, type: 'success' | 'warning' } | null>(null);

  // Formularios de Modales
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState("");
  const [nuevaCarpetaColor, setNuevaCarpetaColor] = useState("cyan");

  const mostrarAlerta = (text: string, type: 'success' | 'warning' = 'success') => {
    setSysAlert({ text, type });
    setTimeout(() => setSysAlert(null), 3000);
  };

  // 1. OBTENER RUTINAS PREARMADAS Y CARPETAS
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qRutinas = query(collection(db, "users", user.uid, "rutinasprearmadas"));
    const unsubRutinas = onSnapshot(qRutinas, (snapshot) => {
      const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRutinas(templates);
    });

    const unsubCarpetas = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCarpetas(data.carpetasPrearmadas || []); 
      }
      setLoading(false);
    });

    return () => {
      unsubRutinas();
      unsubCarpetas();
    };
  }, []);

  // 2. CREAR NUEVA CARPETA
  const handleCrearCarpeta = async () => {
    if (!nuevaCarpetaNombre.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      const nuevaCarpeta = {
        id: `folder_pre_${Date.now()}`,
        nombre: nuevaCarpetaNombre.trim(),
        color: nuevaCarpetaColor
      };
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        carpetasPrearmadas: [...carpetas, nuevaCarpeta]
      });

      setShowFolderModal(false);
      setNuevaCarpetaNombre("");
      mostrarAlerta("Carpeta creada con éxito");
    } catch (error) {
      console.error(error);
      mostrarAlerta("Error al crear carpeta", "warning");
    }
  };

  // 3. ORGANIZAR RUTINA (Asignar a Carpeta)
  const handleAsignarCarpeta = async (rutinaId: string, carpetaId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "rutinasprearmadas", rutinaId), {
        carpetaId: carpetaId === "sin_asignar" ? null : carpetaId
      });
      setShowOrganizeModal(null);
      mostrarAlerta("Plantilla organizada");
    } catch (error) {
      console.error(error);
      mostrarAlerta("Error al organizar", "warning");
    }
  };

  // 4. ELIMINAR RUTINA
  const handleEliminarRutina = async () => {
    if (!showDeleteConfirm) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "rutinasprearmadas", showDeleteConfirm.id));
      setShowDeleteConfirm(null);
      mostrarAlerta("Plantilla eliminada", "success");
    } catch (error) {
      console.error(error);
      mostrarAlerta("Error al eliminar", "warning");
    }
  };

  // 5. ACCIONES PRINCIPALES
  const handleCrearNueva = () => {
    if (rutinas.length >= MAX_RUTINAS) {
      mostrarAlerta(`Límite alcanzado: Tienes ${MAX_RUTINAS}/${MAX_RUTINAS} plantillas.`, "warning");
      return;
    }
    sessionStorage.removeItem("cv_prearmada_edit_rutina_id");
    sessionStorage.removeItem("cv_prearmada_draft_nombre");
    sessionStorage.removeItem("cv_prearmada_draft_ejercicios");
    setIsCreating(true);
  };

  const handleEditarRutina = (rutina: any) => {
    sessionStorage.setItem("cv_prearmada_edit_rutina_id", rutina.id);
    sessionStorage.setItem("cv_prearmada_draft_nombre", rutina.nombre || "");
    sessionStorage.setItem("cv_prearmada_draft_ejercicios", JSON.stringify(rutina.ejercicios || []));
    setIsCreating(true);
  };

  // FILTROS
  const rutinasFiltradas = rutinas.filter(r => {
    const coincideTexto = r.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const coincideCarpeta = filtroCarpeta === "todas" 
      ? true 
      : filtroCarpeta === "sin_asignar" 
        ? !r.carpetaId 
        : r.carpetaId === filtroCarpeta;
    return coincideTexto && coincideCarpeta;
  });

  const getCarpetaColor = (carpetaId: string) => {
    const c = carpetas.find(c => c.id === carpetaId);
    return COLORES_CARPETAS.find(col => col.id === c?.color) || COLORES_CARPETAS[5]; 
  };


  // RENDERIZA EL CREADOR DE RUTINAS SI ESTÁ ACTIVO
  if (isCreating) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
        <CreacionRutinaModule 
          onBack={() => setIsCreating(false)} 
          tipoRutina="prearmada" 
        />
      </div>
    );
  }

  // RENDERIZA EL DASHBOARD DE PLANTILLAS
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 relative">
      
      {/* ALERTA CUSTOM */}
      {sysAlert && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[500] border rounded-full py-3 px-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-5 shadow-2xl ${
          sysAlert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
          : 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]'
        }`}>
          {sysAlert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{sysAlert.text}</p>
        </div>
      )}

      {/* HEADER & BARRA DE PROGRESO */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 mb-6 shadow-inner relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none"></div>
        
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Dumbbell className="w-5 h-5" /> Tu Bóveda de Rutinas
            </h2>
            <p className="text-[10px] text-zinc-400 font-medium mt-1">
              {modoSeleccion 
                ? "Selecciona la plantilla que deseas clonar y asignar." 
                : "Crea plantillas maestras para asignar a tus clientes al instante."}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Capacidad</span>
            <span className="text-2xl font-black text-white leading-none">{rutinas.length}</span>
            <span className="text-sm font-bold text-zinc-600">/{MAX_RUTINAS}</span>
          </div>
        </div>

        {/* Barra de Límite */}
        <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5 relative z-10">
          <div 
            className={`h-full transition-all duration-1000 ${rutinas.length >= MAX_RUTINAS ? 'bg-rose-500' : 'bg-white'}`}
            style={{ width: `${Math.min((rutinas.length / MAX_RUTINAS) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* CONTROLES: BUSCADOR Y CARPETAS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
        <div className="relative w-full md:max-w-xs group shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar plantilla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-white focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0 flex-1 border-l border-white/10 md:pl-4">
          <button 
            onClick={() => setFiltroCarpeta("todas")}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filtroCarpeta === "todas" ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
            }`}
          >
            Todas
          </button>
          
          <button 
            onClick={() => setFiltroCarpeta("sin_asignar")}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-dashed ${
              filtroCarpeta === "sin_asignar" ? "bg-white/10 text-white border-white" : "border-white/20 text-zinc-500 hover:text-white"
            }`}
          >
            Sin Carpeta
          </button>

          {carpetas.map(carpeta => {
            const color = COLORES_CARPETAS.find(c => c.id === carpeta.color) || COLORES_CARPETAS[5];
            const isActive = filtroCarpeta === carpeta.id;
            return (
              <button 
                key={carpeta.id}
                onClick={() => setFiltroCarpeta(carpeta.id)}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
                  isActive ? `${color.class} text-black${color.border}` : `bg-zinc-900/50 ${color.text} ${color.border}/30 hover:${color.border}`
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                {carpeta.nombre}
              </button>
            );
          })}

          {!modoSeleccion && (
            <button 
              onClick={() => setShowFolderModal(true)}
              className="shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all bg-black border border-zinc-800 hover:border-white/30 flex items-center gap-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* GRID DE RUTINAS PREARMADAS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
          </div>
        ) : rutinasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center opacity-70">
            <Dumbbell className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-xs font-black text-white uppercase tracking-widest">Ninguna Plantilla</p>
            <p className="text-[10px] text-zinc-500 mt-1">Crea una nueva plantilla maestra para empezar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rutinasFiltradas.map(rutina => {
              const colorInfo = getCarpetaColor(rutina.carpetaId);
              const carpetaNombre = carpetas.find(c => c.id === rutina.carpetaId)?.nombre || "Sin Asignar";

              return (
                <div key={rutina.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-5 relative group shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-between min-h-[140px]">
                  
                  {/* Borde de color de la carpeta */}
                  <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl opacity-50 ${rutina.carpetaId ? colorInfo.class : 'bg-zinc-700'}`}></div>

                  <div className="pl-2">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${rutina.carpetaId ? `${colorInfo.class}/10 ${colorInfo.text}${colorInfo.border}/30` : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                        {carpetaNombre}
                      </span>
                      
                      <div className="flex opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-black/50 backdrop-blur-md rounded-lg p-1 border border-white/5">
                        {modoSeleccion ? (
                          <button onClick={() => setRutinaViewDetail(rutina)} className="p-1.5 text-zinc-400 hover:text-white rounded" title="Ver Detalle">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => setShowOrganizeModal(rutina)} className="p-1.5 text-zinc-400 hover:text-white rounded" title="Organizar">
                              <Palette className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEditarRutina(rutina)} className="p-1.5 text-zinc-400 hover:text-white rounded" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setShowDeleteConfirm(rutina)} className="p-1.5 text-zinc-400 hover:text-rose-500 rounded" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-black text-white truncate drop-shadow-md pr-4">{rutina.nombre}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1">
                      {rutina.ejercicios?.length || 0} Ejercicios registrados
                    </p>
                  </div>

                  <div className="pl-2 mt-4">
                    <button 
                      onClick={() => {
                        if (modoSeleccion) {
                          setShowAsignarConfirm(rutina); 
                        } else {
                          handleEditarRutina(rutina);
                        }
                      }}
                      className={`w-full flex items-center justify-between text-[9px] font-black uppercase tracking-widest hover:text-white group/btn ${modoSeleccion ? 'text-white' : 'text-zinc-400'}`}
                    >
                      {modoSeleccion ? "ASIGNAR ESTA PLANTILLA" : "ABRIR PLANTILLA"} 
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTÓN FLOTANTE: CREAR NUEVA (Solo si no estamos seleccionando) */}
      {!modoSeleccion && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button 
            onClick={handleCrearNueva}
            className="bg-white text-black px-6 py-4 rounded-full flex items-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Crear Nueva Plantilla
          </button>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ASIGNACIÓN */}
      {showAsignarConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(255,255,255,0.1)] text-center p-8 relative overflow-hidden">
            <div className="w-16 h-16 bg-white/10 rounded-full border border-white/20 mx-auto mb-6 flex items-center justify-center">
              <ClipboardCheck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest truncate">{showAsignarConfirm.nombre}</h3>
            
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-6">
              Estás a punto de enviar una copia exacta de esta rutina al perfil de <strong className="text-white">@{clienteAAsignar?.username || 'tu cliente'}</strong>.
            </p>

            <div className="bg-black/50 border border-white/5 rounded-xl p-4 mb-8 text-left max-h-[150px] overflow-y-auto custom-scrollbar">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Resumen de Ejercicios</span>
              <ul className="space-y-1">
                {showAsignarConfirm.ejercicios?.map((ej: any, idx: number) => (
                  <li key={idx} className="text-[10px] text-zinc-300 truncate flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span> {ej.nombreEs || ej.nombre}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAsignarConfirm(null)} className="flex-1 bg-zinc-900 text-zinc-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Cancelar</button>
              <button 
                onClick={() => {
                  if (onSelectRutina) onSelectRutina(showAsignarConfirm);
                  setShowAsignarConfirm(null);
                }} 
                className="flex-1 bg-white text-black py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: VER DETALLE RÁPIDO CORREGIDO */}
      {rutinaViewDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden max-h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-white/5 shrink-0">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 truncate">
                <Eye className="w-4 h-4 shrink-0" /> {rutinaViewDetail.nombre}
              </h3>
              <button onClick={() => setRutinaViewDetail(null)} className="text-zinc-400 hover:text-white p-1 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              {rutinaViewDetail.ejercicios?.map((ej: any, i: number) => (
                <div key={i} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                  <h4 className="text-xs font-black text-white mb-2">{ej.nombreEs || ej.nombre}</h4>
                  <div className="flex flex-wrap gap-2">
                    {ej.series?.map((serie: any, sIdx: number) => {
                      // Corrección visual de Tipos de Serie
                      const icon = serie.tipo === "normal" ? "⚡" 
                                 : (serie.tipo === "calentamiento" || serie.tipo === "aproximacion") ? "🔥" 
                                 : "💥"; // Para topset, dropset, restpause
                      
                      const repsDisplay = serie.repsTipo === "fijas" ? serie.reps : `${serie.minReps}-${serie.maxReps}`;

                      return (
                        <span key={sIdx} className="text-[9px] bg-black px-2 py-1 rounded text-zinc-400 border border-zinc-800 font-bold tracking-widest">
                          {icon} {repsDisplay} reps
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* MODAL: CREAR CARPETA */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <FolderPlus className="w-4 h-4" /> Nueva Carpeta
            </h3>
            
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2 block">Nombre de la Carpeta</label>
            <input 
              type="text" 
              value={nuevaCarpetaNombre}
              onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
              placeholder="Ej. Hipertrofia Avanzada"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-white mb-6 outline-none"
            />

            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-3 block">Color de Identificación</label>
            <div className="flex gap-3 mb-8 flex-wrap">
              {COLORES_CARPETAS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setNuevaCarpetaColor(c.id)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${c.class} ${nuevaCarpetaColor === c.id ? `ring-2 ring-offset-2 ring-offset-zinc-950 ${c.border}` : 'border-transparent opacity-50 hover:opacity-100'}`}
                  title={c.label}
                ></button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowFolderModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 rounded-xl hover:text-white">Cancelar</button>
              <button onClick={handleCrearCarpeta} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-black bg-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORGANIZAR (ASIGNAR CARPETA) */}
      {showOrganizeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Mover Plantilla</h3>
            <p className="text-xs text-zinc-400 mb-6 truncate">{showOrganizeModal.nombre}</p>

            <div className="space-y-2 mb-8 max-h-[40vh] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => handleAsignarCarpeta(showOrganizeModal.id, "sin_asignar")}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border border-dashed ${!showOrganizeModal.carpetaId ? 'bg-white/10 text-white border-white' : 'text-zinc-500 border-zinc-700 hover:text-white'}`}
              >
                Sin Carpeta Asignada
              </button>
              
              {carpetas.map(c => {
                const color = COLORES_CARPETAS.find(col => col.id === c.color) || COLORES_CARPETAS[5];
                const isActive = showOrganizeModal.carpetaId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleAsignarCarpeta(showOrganizeModal.id, c.id)}
                    className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border ${isActive ? `${color.class}/20 ${color.text} ${color.border}/50` : 'text-zinc-400 bg-zinc-900 border-transparent hover:bg-zinc-800'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${color.class}`}></div>
                    {c.nombre}
                  </button>
                );
              })}
            </div>

            <button onClick={() => setShowOrganizeModal(null)} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 rounded-xl hover:text-white">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-950 border border-rose-500/50 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(244,63,94,0.2)] text-center p-8 relative overflow-hidden">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full border border-rose-500/30 mx-auto mb-6 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest">¿Eliminar Plantilla?</h3>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-8">
              Estás a punto de borrar <strong className="text-white">"{showDeleteConfirm.nombre}"</strong>. Esta acción no se puede deshacer. Los clientes que ya tienen esta rutina asignada no la perderán.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-zinc-900 text-zinc-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleEliminarRutina} className="flex-1 bg-rose-500 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}