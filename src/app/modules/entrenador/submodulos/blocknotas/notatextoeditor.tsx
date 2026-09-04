"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Trash2, Cloud, CloudOff, CheckCircle2, Loader2, X, AlertTriangle, 
  FileText, Bold, Italic, List, CheckSquare, Heading1, Heading2, Quote, 
  Maximize, Minimize, Download, LayoutTemplate, Type
} from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

interface NotaTextoEditorProps {
  clienteId: string;
  archivoId: string;
  onBack: () => void;
}

// 🔴 PLANTILLAS PREDEFINIDAS PARA ACELERAR EL TRABAJO
const TEMPLATES = {
  sesion: `## Registro de Sesión\n**Fecha:** \n**Enfoque:** \n\n### Observaciones Físicas:\n- \n\n### Rendimiento (RIR/RPE):\n- \n\n### Tareas para el cliente:\n- [ ] `,
  evaluacion: `## Evaluación Física Mensual\n**Peso Actual:**  kg\n**% Grasa:**  %\n\n### Medidas (cm):\n- Pecho: \n- Brazo: \n- Cintura: \n- Pierna: \n\n### Notas Posturales:\n> `,
  dieta: `## Ajuste Nutricional\n**Calorías Objetivo:**  kcal\n\n### Macros:\n- Proteína:  g\n- Carbos:  g\n- Grasas:  g\n\n### Notas o Sensaciones:\n- `
};

export default function NotaTextoEditor({ clienteId, archivoId, onBack }: NotaTextoEditorProps) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  // Estados de Sincronización
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "error" | "waiting">("saved");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estados de Interfaz Premium
  const [focusMode, setFocusMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  
  // Modal de Eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localKey = `vtr_nota_local_${archivoId}`;

  // 1. CARGA INICIAL (Local-First Priority)
  useEffect(() => {
    const loadNote = async () => {
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
            const contentClean = parsed.content === "[]" ? "" : parsed.content;
            setContent(contentClean || (data.contenido === "[]" ? "" : data.contenido));
            setHasChanges(true); 
          } else {
            setTitle(data.titulo || "");
            setContent(data.contenido === "[]" ? "" : data.contenido);
          }
        }
      } catch (error) {
        console.error("Error cargando nota:", error);
      } finally {
        setLoading(false);
        setTimeout(autoResizeTextarea, 100);
      }
    };
    loadNote();
  }, [archivoId, clienteId, localKey]);

  // 2. AUTO-RESIZE DEL TEXTAREA
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 50}px`;
    }
  };

  // 3. MOTOR DE AUTO-GUARDADO (DEBOUNCE + LOCAL STORAGE)
  useEffect(() => {
    if (loading || !hasChanges) return;

    setSyncStatus("waiting");
    localStorage.setItem(localKey, JSON.stringify({ title, content }));

    const timer = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, "users", user.uid, "notas_clientes", clienteId, "archivos", archivoId);
        await updateDoc(docRef, {
          titulo: title.trim() || "Nota Sin Título",
          contenido: content,
          fechaActualizacion: serverTimestamp()
        });

        setSyncStatus("saved");
        setHasChanges(false);
        localStorage.removeItem(localKey);
      } catch (error) {
        console.error("Error subiendo nota a Firebase:", error);
        setSyncStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [title, content, hasChanges, archivoId, clienteId, localKey, loading]);

  // 4. PROTECCIÓN ANTI-CIERRE ACCIDENTAL
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // 🔴 5. MOTOR DE INSERCIÓN INTELIGENTE DE FORMATO
  const insertFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    // Si es un prefijo de bloque (como # o -) y no estamos al inicio de una línea, añadimos un salto
    const needsNewLine = prefix.endsWith(" ") && beforeText.length > 0 && !beforeText.endsWith("\n");
    const actualPrefix = needsNewLine ? `\n${prefix}` : prefix;

    const newText = beforeText + actualPrefix + selectedText + suffix + afterText;
    setContent(newText);
    setHasChanges(true);

    // Restaurar el cursor después de la inyección
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + actualPrefix.length, end + actualPrefix.length);
      autoResizeTextarea();
    }, 0);
  };

  const insertTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const beforeText = content.substring(0, start);
    const afterText = content.substring(start);
    
    const newText = beforeText + (beforeText.length > 0 && !beforeText.endsWith("\n\n") ? "\n\n" : "") + TEMPLATES[templateKey] + afterText;
    
    setContent(newText);
    setHasChanges(true);
    setShowTemplates(false);
    
    setTimeout(() => {
      textarea.focus();
      autoResizeTextarea();
    }, 0);
  };

  const exportToTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([`${title.toUpperCase()}\n\n${content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title || "Nota_VTR"}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // MANEJADORES DE TEXTO
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
    autoResizeTextarea();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(doc(db, "users", user.uid, "notas_clientes", clienteId, "archivos", archivoId));
      localStorage.removeItem(localKey);
      onBack();
    } catch (error) {
      console.error("Error al borrar nota:", error);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Desencriptando Expediente...</span>
      </div>
    );
  }

  // Clases dinámicas de fuente
  const fontSizeClass = fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg" : "text-base";
  const wordsCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordsCount / 200));

  return (
    <div className={`flex flex-col animate-in fade-in zoom-in-95 duration-300 relative transition-all ${focusMode ? 'fixed inset-0 z-[500] bg-zinc-950 p-4 sm:p-10' : 'h-full'}`}>
      
      {/* TOOLBAR SUPERIOR (Oculta en Focus Mode) */}
      {!focusMode && (
        <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-2xl border border-white/10 mb-6 shrink-0 backdrop-blur-xl sticky top-0 z-40 shadow-lg">
          <button onClick={onBack} className="w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/40 transition-all shadow-inner hover:scale-105 active:scale-95">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 pr-2">
            {/* INDICADOR DE SINCRONIZACIÓN PREMIUM */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/5 shadow-inner">
              {syncStatus === "saved" && <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest hidden sm:block">En la Nube</span></>}
              {syncStatus === "waiting" && <><Cloud className="w-3.5 h-3.5 text-zinc-500" /><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hidden sm:block">En Caché</span></>}
              {syncStatus === "saving" && <><Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin" /><span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest hidden sm:block">Sincronizando</span></>}
              {syncStatus === "error" && <><CloudOff className="w-3.5 h-3.5 text-rose-500" /><span className="text-[9px] font-black text-rose-500 uppercase tracking-widest hidden sm:block">Error Nube</span></>}
            </div>

            <div className="w-px h-5 bg-zinc-800"></div>

            {/* HERRAMIENTAS ADICIONALES */}
            <div className="flex items-center gap-1">
              <button onClick={() => setFocusMode(true)} className="text-zinc-500 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5" title="Modo Enfoque">
                <Maximize className="w-4 h-4" />
              </button>
              <button onClick={exportToTxt} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5" title="Exportar a TXT">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="text-zinc-500 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10" title="Eliminar Nota">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE EDICIÓN TIPO NOTION/OBSIDIAN */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-8 ${focusMode ? 'pb-10' : 'pb-32'}`}>
        <div className={`mx-auto w-full transition-all duration-500 ${focusMode ? 'max-w-4xl mt-10' : 'max-w-3xl'}`}>
          
          {focusMode && (
            <button onClick={() => setFocusMode(false)} className="mb-10 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full w-fit">
              <Minimize className="w-3 h-3" /> Salir de Modo Enfoque
            </button>
          )}

          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Título de la Nota..."
            className="w-full bg-transparent border-none text-3xl sm:text-5xl font-black text-white placeholder-zinc-800 focus:outline-none focus:ring-0 mb-8 tracking-tight leading-none"
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Comienza a escribir aquí o usa una plantilla..."
            className={`w-full bg-transparent border-none text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-0 resize-none min-h-[60vh] leading-relaxed custom-scrollbar-hidden transition-all ${fontSizeClass}`}
            spellCheck="false"
          />
          
        </div>
      </div>

      {/* 🔴 BARRA DE FORMATO FLOTANTE (ESTILO PREMIUM) */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ${focusMode ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
        
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <button onClick={() => insertFormat("**", "**")} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" title="Negrita"><Bold className="w-4 h-4" /></button>
          <button onClick={() => insertFormat("*", "*")} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" title="Cursiva"><Italic className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-1 border-r border-white/10 pr-2 pl-1">
          <button onClick={() => insertFormat("## ")} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" title="Título"><Heading2 className="w-4 h-4" /></button>
          <button onClick={() => insertFormat("- ")} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" title="Lista"><List className="w-4 h-4" /></button>
          <button onClick={() => insertFormat("- [ ] ")} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" title="Checklist"><CheckSquare className="w-4 h-4" /></button>
          <button onClick={() => insertFormat("> ")} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" title="Cita"><Quote className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-1 pl-1 relative">
          <button 
            onClick={() => setFontSize(prev => prev === "sm" ? "base" : prev === "base" ? "lg" : "sm")}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 flex items-center gap-1" title="Tamaño de Letra"
          >
            <Type className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase">{fontSize}</span>
          </button>

          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 ${showTemplates ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'}`} 
            title="Plantillas"
          >
            <LayoutTemplate className="w-4 h-4" />
          </button>

          {/* Menú de Plantillas */}
          {showTemplates && (
            <div className="absolute bottom-[120%] right-0 w-48 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 origin-bottom animate-in zoom-in-95">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-2 py-1">Insertar Plantilla</span>
              <button onClick={() => insertTemplate("sesion")} className="text-left px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500/20 hover:text-cyan-400 rounded-xl transition-colors">Sesión Presencial</button>
              <button onClick={() => insertTemplate("evaluacion")} className="text-left px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl transition-colors">Evaluación Mensual</button>
              <button onClick={() => insertTemplate("dieta")} className="text-left px-3 py-2 text-xs font-bold text-white hover:bg-amber-500/20 hover:text-amber-400 rounded-xl transition-colors">Ajuste Nutricional</button>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER METRICS PREMIUM */}
      {!focusMode && (
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none flex items-end justify-center pb-2 z-10">
          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-black/50 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
            <span>{wordsCount} Palabras</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
            <span>{content.split('\n').filter(p => p.trim().length > 0).length} Párrafos</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
            <span>~{readingTime} Min Lectura</span>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-zinc-950 border border-rose-500/30 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(244,63,94,0.15)] overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Eliminar Expediente
              </h3>
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <div className="bg-rose-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <FileText className="w-8 h-8 text-rose-500" />
              </div>
              <h4 className="text-base font-black text-white mb-2 leading-tight">¿Estás seguro de que deseas borrar esta nota?</h4>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-6">Esta acción es permanente y no se puede deshacer.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-300 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] flex justify-center items-center gap-2 disabled:opacity-50"
                >
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