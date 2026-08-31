"use client";

import { useState, useEffect } from "react";
import { Trophy, Award, Camera, Trash2, Sparkles, Medal } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface LogrosRutinaProps {
  ejercicios: any[];
  postTexto: string;
  setPostTexto: (val: string) => void;
  postFotos: string[];
  setPostFotos: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function LogrosRutina({
  ejercicios,
  postTexto,
  setPostTexto,
  postFotos,
  setPostFotos,
}: LogrosRutinaProps) {
  const [loadingPrs, setLoadingPrs] = useState(true);
  const [recordsRotos, setRecordsRotos] = useState<any[]>([]);

  useEffect(() => {
    const verificarRecords = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoadingPrs(false);
        return;
      }

      try {
        const nuevosRecords: any[] = [];

        for (const ej of ejercicios) {
          if (!ej.id || !ej.series) continue;

          let maxPesoHoy = 0;
          ej.series.forEach((s: any) => {
            if (s.completado && s.pesoReal) {
              const p = parseFloat(s.pesoReal) || 0;
              if (p > maxPesoHoy) maxPesoHoy = p;
            }
          });

          if (maxPesoHoy === 0) continue;

          const q = query(
            collection(db, "users", user.uid, "pesosregistro"),
            where("ejercicioId", "==", ej.id)
          );
          const snap = await getDocs(q);

          let maxPesoHistorico = 0;
          if (!snap.empty) {
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              data.series?.forEach((s: any) => {
                if (s.pesoReal) {
                  const p = parseFloat(s.pesoReal) || 0;
                  if (p > maxPesoHistorico) maxPesoHistorico = p;
                }
              });
            });
          }

          if (maxPesoHoy > maxPesoHistorico) {
            nuevosRecords.push({
              nombre: ej.nombreEs || ej.nombre,
              peso: maxPesoHoy,
              esNuevo: maxPesoHistorico === 0,
            });
          }
        }

        setRecordsRotos(nuevosRecords);
      } catch (error) {
        console.error("Error al calcular récords:", error);
      } finally {
        setLoadingPrs(false);
      }
    };

    verificarRecords();
  }, [ejercicios]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - postFotos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; 
          const scaleSize = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;

          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL("image/webp", 0.7);
            setPostFotos((prev) => [...prev, compressedBase64]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const eliminarFoto = (index: number) => {
    const filtradas = postFotos.filter((_, i) => i !== index);
    setPostFotos(filtradas);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-40 sm:pb-6">
      
      {/* SECCIÓN 1: LOGROS Y RÉCORDS (PRs) */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-inner relative overflow-hidden">
        <div className="absolute -right-2 -top-2 opacity-5"><Medal className="w-24 h-24 sm:w-32 sm:h-32 text-amber-500" /></div>
        
        <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
          <div className="bg-amber-500/20 text-amber-500 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-widest">Nuevos Récords (PR)</h3>
            <p className="text-[8px] sm:text-[9px] text-amber-500/80 font-bold uppercase tracking-widest mt-0.5">
              {loadingPrs ? "Auditando registros..." : recordsRotos.length > 0 ? `Has superado ${recordsRotos.length} marca(s) máxima(s)` : "Entrenamiento completado"}
            </p>
          </div>
        </div>

        {loadingPrs ? (
          <div className="py-6 sm:py-8 text-center text-[9px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-amber-500/50" /> Analizando tu progreso histórico...
          </div>
        ) : recordsRotos.length === 0 ? (
          <div className="bg-black/40 border border-zinc-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center relative z-10">
            <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-relaxed">
              No registraste récords hoy, ¡pero el volumen acumulado es lo que construye el verdadero progreso!
            </p>
          </div>
        ) : (
          <div className="space-y-2 relative z-10">
            {recordsRotos.map((pr, idx) => (
              <div key={idx} className="flex items-center justify-between bg-black/60 border border-amber-500/30 px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:border-amber-500/60 transition-colors">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[11px] sm:text-xs font-bold text-white capitalize">{pr.nombre}</p>
                    <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-amber-500/80 mt-0.5">
                      {pr.esNuevo ? "Primer PR Registrado" : "Nuevo límite superado"}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg border border-amber-500/20 shadow-inner shrink-0 ml-2">
                  {pr.peso} kg
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: PUBLICACIÓN PARA LA COMUNIDAD */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-inner">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="bg-rose-500/20 text-rose-500 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-widest">Feedback y Comunidad</h3>
            <p className="text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Opcional • Documenta tu sesión</p>
          </div>
        </div>

        {/* Cuadro de texto */}
        <div>
          <textarea 
            value={postTexto}
            onChange={(e) => setPostTexto(e.target.value)}
            placeholder="¿Cómo se sintió el entreno? Escribe tus sensaciones o algo para motivar a la comunidad..."
            className="w-full bg-black/60 border border-zinc-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[10px] sm:text-[11px] text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all resize-y min-h-[70px] sm:min-h-[90px] placeholder:text-zinc-600 font-medium leading-relaxed"
          />
        </div>

        {/* Galería de Fotos y Selector */}
        <div>
          <label className="text-[8px] sm:text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-2 block">
            Evidencia Gráfica ({postFotos.length}/3)
          </label>
          
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 custom-scrollbar">
            
            {postFotos.map((foto, index) => (
              <div key={index} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl border border-zinc-700 overflow-hidden shrink-0 group shadow-md">
                <img src={foto} alt="Evidencia" className="w-full h-full object-cover" />
                <button 
                  onClick={() => eliminarFoto(index)}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-500 text-white p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-colors shadow-lg"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ))}

            {postFotos.length < 3 && (
              <label className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl border-2 border-dashed border-zinc-700/80 bg-black/30 hover:bg-zinc-900 hover:border-rose-500/50 flex flex-col items-center justify-center text-zinc-500 hover:text-rose-400 cursor-pointer transition-all shrink-0 active:scale-95">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-1.5 opacity-80" />
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Añadir Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />
              </label>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}