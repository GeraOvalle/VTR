"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, FileText, Table2, TrendingUp, MoreVertical, X, Calendar, Dumbbell, Loader2, Search, User } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import NotaTextEditor from "./notatextoeditor";
import ExcelClienteEditor from "./excelclienteeditor";
import RendimientoClienteModule from "./rendimientocliente";

interface ClienteDashboardProps {
  cliente: any;
  onBack: () => void;
}

type EditorType = "none" | "nota_texto" | "excel" | "rendimiento";

export default function ClienteDashboardNotas({ cliente, onBack }: ClienteDashboardProps) {
  const [archivos, setArchivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de navegación interna
  const [activeEditor, setActiveEditor] = useState<EditorType>("none");
  const [selectedArchivoId, setSelectedArchivoId] = useState<string | null>(null);
  
  // Menú Flotante del Botón +
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [creating, setCreating] = useState(false);

  // 🔴 VARIABLE CLAVE: ¿Es un cliente presencial sin cuenta en la app?
  const isOfflineClient = cliente.tipo !== "vtr_app";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !cliente?.uid) return;

    // Ruta segura y privada: users/{trainerId}/notas_clientes/{clienteId}/archivos
    const q = query(
      collection(db, "users", user.uid, "notas_clientes", cliente.uid, "archivos"),
      orderBy("fechaActualizacion", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setArchivos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [cliente]);

  // Función para crear un archivo nuevo en blanco y abrirlo
  const handleCrearArchivo = async (tipo: "nota_texto" | "excel") => {
    const user = auth.currentUser;
    if (!user) return;

    setCreating(true);
    try {
      const nuevoArchivo = {
        tipo: tipo,
        titulo: tipo === "excel" ? "Entrenamiento Presencial" : "Nueva Nota",
        contenido: "[]", // String JSON vacío inicial para la arquitectura Local-First
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "users", user.uid, "notas_clientes", cliente.uid, "archivos"), 
        nuevoArchivo
      );

      setShowAddMenu(false);
      setSelectedArchivoId(docRef.id);
      setActiveEditor(tipo);
    } catch (error) {
      console.error("Error al crear archivo:", error);
    } finally {
      setCreating(false);
    }
  };

  const openArchivo = (id: string, tipo: string) => {
    setSelectedArchivoId(id);
    setActiveEditor(tipo as EditorType);
  };

  // 🔴 PLACEHOLDERS DE LOS EDITORES
  if (activeEditor === "nota_texto" && selectedArchivoId) {
    return (
      <NotaTextEditor 
        clienteId={cliente.uid} 
        archivoId={selectedArchivoId} 
        onBack={() => {
          setActiveEditor("none");
          setSelectedArchivoId(null);
        }} 
      />
    );
  }  
  if (activeEditor === "excel" && selectedArchivoId) {
    return (
      <ExcelClienteEditor 
        clienteId={cliente.uid} 
        archivoId={selectedArchivoId} 
        onBack={() => {
          setActiveEditor("none");
          setSelectedArchivoId(null);
        }} 
      />
    );
  }
if (activeEditor === "rendimiento") {
  return <RendimientoClienteModule clienteId={cliente.uid} onBack={() => setActiveEditor("none")} />;
}
  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 relative">
      
      {/* CABECERA DEL CLIENTE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-zinc-900/40 p-4 sm:p-5 rounded-3xl border border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-black border border-zinc-700 shrink-0">
              {cliente.fotoPerfil ? (
                <img src={cliente.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-zinc-500" /></div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider leading-tight">
                {!isOfflineClient ? `@${cliente.username}` : cliente.nombre}
              </h2>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border mt-1 inline-block ${
                !isOfflineClient ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}>
                {!isOfflineClient ? "Usuario App" : "Cliente Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* 🔴 BOTÓN DE RENDIMIENTO CON LÓGICA DE BLOQUEO */}
        <button 
          onClick={() => !isOfflineClient && setActiveEditor("rendimiento")}
          disabled={isOfflineClient}
          title={isOfflineClient ? "Métricas no disponibles para clientes sin cuenta de VTR App" : "Ver Progreso"}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            isOfflineClient 
              ? "bg-zinc-900/50 border border-zinc-800 text-zinc-600 cursor-not-allowed" 
              : "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-white/10 text-white hover:border-white/30 shadow-lg"
          }`}
        >
          <TrendingUp className={`w-4 h-4 ${isOfflineClient ? "text-zinc-600" : "text-emerald-400"}`} />
          Ver Rendimiento
        </button>
      </div>

      {/* LISTA DE ARCHIVOS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cargando expediente...</span>
          </div>
        ) : archivos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 opacity-60 text-center px-4">
            <div className="bg-zinc-900/50 p-6 rounded-full border border-white/5 mb-4">
              <FileText className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">Expediente Vacío</h3>
            <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
              No tienes registros ni notas para este cliente. Presiona el botón <strong className="text-cyan-500">"+"</strong> para crear su primera bitácora o apunte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
            {archivos.map((archivo) => (
              <div 
                key={archivo.id}
                onClick={() => openArchivo(archivo.id, archivo.tipo)}
                className="bg-zinc-900/40 border border-white/5 hover:border-cyan-500/40 hover:bg-zinc-900/80 rounded-2xl p-5 cursor-pointer group transition-all relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${archivo.tipo === 'excel' ? 'bg-emerald-500/20' : 'bg-cyan-500/20'}`}></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`p-2.5 rounded-xl border ${archivo.tipo === 'excel' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                    {archivo.tipo === 'excel' ? <Table2 className="w-5 h-5 text-emerald-400" /> : <FileText className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <button className="text-zinc-500 hover:text-white p-1 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                
                <h4 className="text-sm font-black text-white truncate mb-1 relative z-10">{archivo.titulo}</h4>
                <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest relative z-10">
                  <Calendar className="w-3 h-3" />
                  {archivo.fechaActualizacion ? new Date(archivo.fechaActualizacion.toDate()).toLocaleDateString() : 'Hoy'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÓN FLOTANTE MAGICO (+) */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        
        {/* Menú Desplegable */}
        {showAddMenu && (
          <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200 origin-bottom">
            <button 
              onClick={() => handleCrearArchivo("excel")}
              disabled={creating}
              className="bg-zinc-900 border border-emerald-500/30 text-white px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 w-48"
            >
              <div className="bg-emerald-500/20 p-1.5 rounded-lg"><Table2 className="w-4 h-4 text-emerald-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">Bitácora<br/>Presencial</span>
            </button>

            <button 
              onClick={() => handleCrearArchivo("nota_texto")}
              disabled={creating}
              className="bg-zinc-900 border border-cyan-500/30 text-white px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 w-48"
            >
              <div className="bg-cyan-500/20 p-1.5 rounded-lg"><FileText className="w-4 h-4 text-cyan-400" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">Nota<br/>Libre</span>
            </button>
          </div>
        )}

        {/* Botón Principal (Toggle) */}
        <button 
          onClick={() => setShowAddMenu(!showAddMenu)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 z-50 ${
            showAddMenu ? 'bg-rose-500 rotate-45 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'bg-cyan-400'
          }`}
        >
          {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>

      {/* Overlay para cerrar el menú si se hace click fuera */}
      {showAddMenu && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAddMenu(false)}></div>
      )}

    </div>
  );
}