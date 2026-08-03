"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Save, Upload, Camera, Loader2, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface FotoModuleProps {
  onBack: () => void;
  currentPhoto?: string | null; // Para mostrar la foto que ya tiene (si existe)
}

export default function FotoModule({ onBack, currentPhoto }: FotoModuleProps) {
  const [compressedImage, setCompressedImage] = useState<string | null>(currentPhoto || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MOTOR DE COMPRESIÓN TÁCTICA (Canvas)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess(false);
    
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar si es imagen
    if (!file.type.startsWith("image/")) {
      setError("SISTEMA: Formato no válido. Selecciona una imagen.");
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Crear el canvas en memoria
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400; // Tamaño máximo táctico para el avatar
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        // Calcular nueva proporción para no deformar
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        // Dibujar y comprimir
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Exportar a JPEG con calidad al 70% (0.7) - Super ligero
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        
        setCompressedImage(dataUrl);
        setLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!compressedImage || !auth.currentUser) return;
    
    setSaving(true);
    setError("");
    
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      // Guardamos la imagen en Base64 directamente en el documento
      await updateDoc(userRef, {
        fotoPerfil: compressedImage
      });
      setSuccess(true);
      setTimeout(() => {
        onBack();
      }, 1500); // Regresa automáticamente después de un segundo y medio
    } catch (err) {
      console.error("Error al guardar imagen:", err);
      setError("SISTEMA: Fallo al encriptar imagen en la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-4 md:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-white/30">
      
      {/* Fondo Escamoso Táctico */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px),
            repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)
          `,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}
      ></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>

      <div className="w-full max-w-md mx-auto relative z-10 flex flex-col items-center mt-4">
        
        {/* Top Bar */}
        <div className="w-full flex justify-between items-center mb-10 border-b border-white/10 pb-4">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Volver</span>
          </button>
          <h1 className="text-xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            FOTO DE PERFIL
          </h1>
        </div>

        {/* Panel Central */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-[0_0_50px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10 w-full flex flex-col items-center text-center">
          
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mb-8 max-w-[250px]">
            La imagen será comprimida localmente para optimizar el almacenamiento del servidor.
          </p>

          {/* Recuadro de Vista Previa */}
          <div className="relative w-40 h-40 mb-8 bg-black rounded-full border-2 border-white/30 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] overflow-hidden group">
            {loading ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : compressedImage ? (
              <img src={compressedImage} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-zinc-600" />
            )}

            {/* Overlay para subir/cambiar */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
            >
              <Upload className="w-8 h-8 text-white mb-2" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Cargar Imagen</span>
            </div>
          </div>

          <input 
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Alertas */}
          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 flex items-start gap-2 w-full animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider text-left">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-3 flex items-start gap-2 w-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-left">Imagen guardada con éxito.</p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="w-full flex gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || loading}
              className="flex-1 bg-white/5 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-lg hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="flex justify-center items-center gap-2">
                <Camera className="w-4 h-4" /> Buscar
              </span>
            </button>
            
            <button 
              onClick={handleSave}
              disabled={saving || loading || !compressedImage}
              className="flex-1 bg-white text-black border border-white/50 font-black uppercase tracking-widest text-[10px] py-4 rounded-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex justify-center items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </span>
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}