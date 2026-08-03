"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Database, Loader2, Play, AlertTriangle, CheckCircle2, RefreshCw, Server, Settings2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, writeBatch, collection, getDocs, getCountFromServer } from "firebase/firestore";

interface ExtraccionProps {
  onBack: () => void;
}

export default function EjerciciosExtraccionModule({ onBack }: ExtraccionProps) {
  const [apiKey, setApiKey] = useState("48ba23b47dmsh3e7c190b8b1db71p1337f9jsned1693f10b3a");
  const [status, setStatus] = useState<"idle" | "fetching" | "saving" | "success" | "error">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [statusText, setStatusText] = useState("");
  
  const [totalDbCount, setTotalDbCount] = useState<number | null>(null);

  // Controles de paginación para la API
  const [apiLimit, setApiLimit] = useState<number>(100);
  const [apiOffset, setApiOffset] = useState<number>(0);

  const fetchDbCount = async () => {
    try {
      const coll = collection(db, "ejercicios");
      const snapshot = await getCountFromServer(coll);
      const count = snapshot.data().count;
      setTotalDbCount(count);
      // Ajuste inteligente: El offset inicia automáticamente donde termina la BD
      setApiOffset(count);
    } catch (error) {
      console.error("Error al obtener conteo de DB:", error);
    }
  };

  useEffect(() => {
    fetchDbCount();
  }, []);

  const iniciarMineria = async () => {
    if (!apiKey) {
      setErrorMsg("SISTEMA: Requiere API Key de RapidAPI (ExerciseDB).");
      return;
    }

    setStatus("fetching");
    setErrorMsg("");
    setStatusText(`Descargando bloque (Limit: ${apiLimit}, Offset: ${apiOffset})...`);

    try {
      // 1. Extraer datos con paginación explícita
      const url = `https://exercisedb.p.rapidapi.com/exercises?limit=${apiLimit}&offset=${apiOffset}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
          "x-rapidapi-key": apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Error API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("La API no devolvió ejercicios. Es posible que hayas extraído todos.");
      }

      setStatus("saving");
      setStatusText("Verificando existencia en Firebase...");

      // 2. Obtener IDs existentes para evitar sobrescribir (Validación contra Base de Datos)
      const querySnapshot = await getDocs(collection(db, "ejercicios"));
      const ejerciciosExistentes = new Set();
      querySnapshot.forEach((doc) => {
        ejerciciosExistentes.add(doc.id);
      });

      // 3. Filtrar los ejercicios nuevos contra Firebase
      let ejerciciosNuevos = data.filter((ejercicio: any) => !ejerciciosExistentes.has(ejercicio.id));

      // EXTRA: Validar que no haya duplicados dentro del mismo bloque recién descargado
      const ejerciciosUnicosMap = new Map();
      ejerciciosNuevos.forEach((ej: any) => ejerciciosUnicosMap.set(ej.id, ej));
      ejerciciosNuevos = Array.from(ejerciciosUnicosMap.values());

      if (ejerciciosNuevos.length === 0) {
        setProgress({ current: 0, total: 0 });
        setStatus("success");
        await fetchDbCount(); 
        return;
      }

      setStatusText("Inyectando ejercicios nuevos...");
      setProgress({ current: 0, total: ejerciciosNuevos.length });

      // 4. Guardar en Firestore por lotes
      const BATCH_SIZE = 400;
      for (let i = 0; i < ejerciciosNuevos.length; i += BATCH_SIZE) {
        const chunk = ejerciciosNuevos.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((ejercicio: any) => {
          const docRef = doc(db, "ejercicios", ejercicio.id);
          const imageUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${ejercicio.id}&resolution=360&rapidapi-key=${apiKey}`;

          batch.set(docRef, {
            id: ejercicio.id,
            nombre: ejercicio.name,
            musculoObjetivo: ejercicio.target,
            musculosSecundarios: ejercicio.secondaryMuscles || [],
            parteCuerpo: ejercicio.bodyPart,
            equipo: ejercicio.equipment,
            instrucciones: ejercicio.instructions || [],
            gifUrl: imageUrl 
          });
        });

        await batch.commit();
        setProgress(prev => ({ ...prev, current: Math.min(i + BATCH_SIZE, ejerciciosNuevos.length) }));
        await fetchDbCount(); // Actualizar el ping en tiempo real
      }

      setStatus("success");

    } catch (error: any) {
      console.error("Error en minería:", error);
      setStatus("error");
      setErrorMsg(`SISTEMA: Fallo de extracción. ${error.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 relative flex flex-col items-center justify-center font-sans">
      
      {/* Fondo Escamoso */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%), repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)`,
        backgroundSize: '100% 100%, 16px 16px, 16px 16px'
      }}></div>

      <div className="w-full max-w-lg bg-zinc-950/90 backdrop-blur-md border border-white/20 rounded-2xl p-8 relative z-10 shadow-[0_0_50px_-10px_rgba(255,255,255,0.15)] ring-1 ring-white/10">
        
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Cerrar Módulo Temporal</span>
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <Database className="w-12 h-12 text-cyan-500 mb-4" />
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            Minería de Datos (ExerciseDB)
          </h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
            Extracción Inteligente Hacia Firestore
          </p>
        </div>

        {/* INDICADOR EN TIEMPO REAL */}
        <div className="mb-8 flex items-center justify-center gap-3 bg-cyan-500/5 border border-cyan-500/20 py-3 rounded-lg shadow-inner">
          <Server className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Ejercicios actuales en DB:
          </span>
          <span className="text-sm font-black font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
            {totalDbCount === null ? "..." : totalDbCount}
          </span>
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
              {progress.total === 0 
                ? "Extracción limpia. No se detectaron ejercicios nuevos en este bloque."
                : `Minería completada. ${progress.total} ejercicios NUEVOS inyectados con éxito.`}
            </p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1.5 block">
              RapidAPI Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={status === "fetching" || status === "saving"}
              className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            />
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 border border-white/10 rounded-lg">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold uppercase tracking-widest">
                <Settings2 className="w-3 h-3" /> Límite a extraer
              </label>
              <input 
                type="number" 
                value={apiLimit}
                onChange={(e) => setApiLimit(Number(e.target.value))}
                disabled={status === "fetching" || status === "saving"}
                className="w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold uppercase tracking-widest">
                <Server className="w-3 h-3" /> Offset (Salto)
              </label>
              <input 
                type="number" 
                value={apiOffset}
                onChange={(e) => setApiOffset(Number(e.target.value))}
                disabled={status === "fetching" || status === "saving"}
                className="w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-mono"
              />
            </div>
          </div>

          {(status === "fetching" || status === "saving") && (
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mb-3" />
              <p className="text-[10px] text-white font-bold uppercase tracking-widest mb-2 text-center">
                {statusText}
              </p>
              {status === "saving" && progress.total > 0 && (
                <p className="text-[12px] font-black text-cyan-400 font-mono tracking-widest">
                  {progress.current} / {progress.total}
                </p>
              )}
            </div>
          )}

          <button 
            onClick={iniciarMineria}
            disabled={status === "fetching" || status === "saving"}
            className="w-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-black uppercase tracking-[0.15em] text-xs py-4 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {status === "success" ? (
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            ) : (
              <Play className="w-4 h-4 fill-cyan-400" />
            )}
            {status === "success" ? "Ejecutar Siguiente Bloque" : "Iniciar Extracción"}
          </button>
        </div>

      </div>
    </main>
  );
}