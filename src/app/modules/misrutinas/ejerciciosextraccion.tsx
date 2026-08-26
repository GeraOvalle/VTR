"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Database, Loader2, Play, AlertTriangle, CheckCircle2, RefreshCw, Server, Settings2, Image as ImageIcon, HardDriveUpload, CheckSquare, Search } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, writeBatch, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface ExtraccionProps {
  onBack: () => void;
}

export default function EjerciciosExtraccionModule({ onBack }: ExtraccionProps) {
  const [apiKey, setApiKey] = useState("cc0600f47emsh28e465a3fe96f2ep1d6c87jsn0ca6e298eeab");
  const [status, setStatus] = useState<"idle" | "fetching" | "preview" | "saving" | "success" | "error">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [statusText, setStatusText] = useState("");
  
  // ESTADÍSTICAS EN TIEMPO REAL DE FIREBASE
  const [dbStats, setDbStats] = useState({ total: 0, conGifLocal: 0, sinGifLocal: 0 });
  const [localEjercicios, setLocalEjercicios] = useState<Map<string, any>>(new Map());

  // Lote pendiente de aprobación
  const [pendingBatch, setPendingBatch] = useState<any[]>([]);

  // Controles de API
  const [apiLimit, setApiLimit] = useState<number>(20); 
  const [apiOffset, setApiOffset] = useState<number>(0);

  // 1. ESCANEAR BASE DE DATOS LOCAL
  const cargarEstadisticas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ejercicios"));
      let total = 0;
      let conGif = 0;
      const mapaLocal = new Map();

      querySnapshot.forEach((docSnap) => {
        total++;
        const data = docSnap.data();
        const tieneGifLocal = data.gifUrl && data.gifUrl.includes("firebasestorage.googleapis.com");
        if (tieneGifLocal) conGif++;
        
        mapaLocal.set(docSnap.id, { tieneGifLocal, ...data });
      });

      setDbStats({ total, conGifLocal: conGif, sinGifLocal: total - conGif });
      setLocalEjercicios(mapaLocal);
      
      if (apiOffset === 0 && total > 0) {
        setApiOffset(total);
      }
    } catch (error) {
      console.error("Error al obtener estadísticas de DB:", error);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // 2. BUSCAR EN LA API Y FILTRAR (PUNTO DE CONTROL)
  const buscarEnApi = async () => {
    if (!apiKey) {
      setErrorMsg("SISTEMA: Requiere API Key de RapidAPI (ExerciseDB).");
      return;
    }

    setStatus("fetching");
    setErrorMsg("");
    setStatusText(`Buscando bloque en la API (Limit: ${apiLimit}, Offset: ${apiOffset})...`);

    try {
      const url = `https://exercisedb.p.rapidapi.com/exercises?limit=${apiLimit}&offset=${apiOffset}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
          "x-rapidapi-key": apiKey
        }
      });

      if (!response.ok) throw new Error(`Error API: ${response.status}`);
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("La API no devolvió ejercicios. Es posible que ya hayas extraído todos.");
      }

      // FILTRO INTELIGENTE
      const paraProcesar = data.filter((apiEj: any) => {
        const local = localEjercicios.get(apiEj.id);
        if (!local) return true; // Es nuevo
        if (!local.tieneGifLocal) return true; // Existe pero no tiene GIF en nuestro Storage
        return false; // Ignorar
      });

      if (paraProcesar.length === 0) {
        setStatus("success");
        setStatusText("Todos los ejercicios de este bloque ya están actualizados en Firebase.");
        setApiOffset(prev => prev + apiLimit);
        return;
      }

      setPendingBatch(paraProcesar);
      setStatus("preview");

    } catch (error: any) {
      console.error("Error en minería:", error);
      setStatus("error");
      setErrorMsg(`SISTEMA: Fallo de extracción. ${error.message}`);
    }
  };

  // 3. DESCARGAR, SUBIR A STORAGE Y GUARDAR (EJECUCIÓN FINAL)
  const procesarYGuardar = async () => {
    setStatus("saving");
    setStatusText("Descargando GIFs mediante Proxy y guardando en Firebase...");
    setProgress({ current: 0, total: pendingBatch.length });

    const storage = getStorage();
    let batch = writeBatch(db);
    let batchCount = 0;
    let procesados = 0;

    for (const ejercicio of pendingBatch) {
      try {
        const local = localEjercicios.get(ejercicio.id);
        
        // 🔴 A) USAMOS EL PROXY DE NEXT.JS PARA SALTAR EL CORS
        const proxyUrl = `/api/proxy-gif?exerciseId=${ejercicio.id}&apiKey=${apiKey}`;
        
        const imgResponse = await fetch(proxyUrl);
        if (!imgResponse.ok) throw new Error(`Fallo descarga del GIF desde Proxy para ${ejercicio.id}`);
        const imageBlob = await imgResponse.blob();

        // B) Lo subimos a nuestro Firebase Storage
        const gifRef = ref(storage, `ejercicios_gifs/${ejercicio.id}.gif`);
        await uploadBytes(gifRef, imageBlob, { contentType: 'image/gif' });
        
        // C) Obtenemos el link público PERMANENTE
        const firebaseUrl = await getDownloadURL(gifRef);

        const docRef = doc(db, "ejercicios", ejercicio.id);

        // D) PROTECCIÓN DE DATOS
        if (local) {
          batch.update(docRef, { gifUrl: firebaseUrl });
        } else {
          batch.set(docRef, {
            id: ejercicio.id,
            nombre: ejercicio.name,
            musculoObjetivo: ejercicio.target,
            musculosSecundarios: ejercicio.secondaryMuscles || [],
            parteCuerpo: ejercicio.bodyPart,
            equipo: ejercicio.equipment,
            instrucciones: ejercicio.instructions || [],
            gifUrl: firebaseUrl 
          });
        }

        batchCount++;
        procesados++;
        setProgress({ current: procesados, total: pendingBatch.length });

        if (batchCount === 25) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.error(`Error procesando ${ejercicio.id}:`, err);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    setApiOffset(prev => prev + apiLimit);
    await cargarEstadisticas();
    setStatus("success");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 relative flex flex-col items-center justify-center font-sans">
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>

      <div className="w-full max-w-2xl bg-zinc-950/90 backdrop-blur-md border border-white/20 rounded-3xl p-8 relative z-10 shadow-[0_0_50px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10">
        
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Cerrar Consola de Extracción</span>
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <Database className="w-12 h-12 text-cyan-500 mb-4" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            Minería de Ejercicios
          </h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 max-w-sm">
            Descarga, procesa y almacena GIFs directamente en tu propio Firebase Storage
          </p>
        </div>

        {/* LECTOR DE ESTADO DE BASE DE DATOS */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-center">
            <Server className="w-5 h-5 text-cyan-500 mx-auto mb-2" />
            <span className="block text-2xl font-black font-mono text-white">{dbStats.total}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Ejercicios DB</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
            <ImageIcon className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <span className="block text-2xl font-black font-mono text-emerald-400">{dbStats.conGifLocal}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">GIFs Descargados</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <span className="block text-2xl font-black font-mono text-amber-400">{dbStats.sinGifLocal}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-600">Sin GIF Local</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider text-left">{errorMsg}</p>
          </div>
        )}

        {status === "success" && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-left">
              {statusText || "Lote procesado exitosamente. Base de datos actualizada."}
            </p>
          </div>
        )}

        {/* MODO IDLE O SUCCESS (CONFIGURACIÓN) */}
        {(status === "idle" || status === "success" || status === "error") && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1.5 block">RapidAPI Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 border border-white/10 rounded-lg">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold uppercase tracking-widest">
                  <Settings2 className="w-3 h-3" /> Extraer N
                </label>
                <input 
                  type="number" 
                  value={apiLimit}
                  onChange={(e) => setApiLimit(Number(e.target.value))}
                  className="w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold uppercase tracking-widest">
                  <Server className="w-3 h-3" /> Saltar N
                </label>
                <input 
                  type="number" 
                  value={apiOffset}
                  onChange={(e) => setApiOffset(Number(e.target.value))}
                  className="w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
                />
              </div>
            </div>

            <button 
              onClick={buscarEnApi}
              className="w-full bg-cyan-500 text-black font-black uppercase tracking-[0.15em] text-xs py-4 rounded-xl hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] flex justify-center items-center gap-2 mt-2"
            >
              <Search className="w-4 h-4" />
              Buscar Bloque en API
            </button>
          </div>
        )}

        {/* MODO PREVIEW (CHEQUEO ANTES DE GUARDAR) */}
        {status === "preview" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Punto de Control
              </h3>
              <p className="text-[10px] text-amber-200/70 font-medium leading-relaxed">
                Se encontraron <strong>{pendingBatch.length}</strong> ejercicios que son nuevos o que les falta descargar el GIF a tu Storage local. Revisa la muestra y confirma la descarga.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2 py-2">
              {pendingBatch.map((ej) => {
                const isUpdate = localEjercicios.has(ej.id);
                // 🔴 USAMOS EL PROXY TAMBIÉN EN EL PREVIEW PARA EVITAR EL ERROR DE CORS AQUÍ
                const proxyUrl = `/api/proxy-gif?exerciseId=${ej.id}&apiKey=${apiKey}`;

                return (
                  <div key={ej.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col relative group">
                    <img 
                      src={proxyUrl} 
                      alt="" 
                      className="w-full h-24 object-cover bg-black opacity-80 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="p-2 bg-zinc-950 flex-1 flex flex-col justify-center">
                      <span className="text-[8px] font-black text-white truncate w-full uppercase">{ej.name}</span>
                      <span className={`text-[7px] font-bold uppercase tracking-widest mt-1 ${isUpdate ? 'text-amber-500' : 'text-cyan-500'}`}>
                        {isUpdate ? "Falta GIF" : "Nuevo Ejercicio"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setStatus("idle")}
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 rounded-xl hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={procesarYGuardar}
                className="flex-[2] bg-emerald-500 text-black py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                <HardDriveUpload className="w-4 h-4" /> Confirmar y Subir
              </button>
            </div>
          </div>
        )}

        {/* MODO CARGANDO / GUARDANDO */}
        {(status === "fetching" || status === "saving") && (
          <div className="bg-black/50 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Procesando...</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">
              {statusText}
            </p>
            {status === "saving" && progress.total > 0 && (
              <div className="w-full max-w-xs mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Archivos GIF</span>
                  <span className="text-[10px] font-black text-cyan-400 font-mono tracking-widest">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}