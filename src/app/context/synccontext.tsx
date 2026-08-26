"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, db } from "../lib/firebase";
import { doc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string, type: 'success' | 'syncing' | 'offline' } | null>(null);

  // 1. VIGILAR EL ESTADO DE LA RED
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage({ text: "Conexión restaurada. Sincronizando...", type: 'syncing' });
      procesarColaPendiente(); // INTENTAR SINCRONIZAR AL VOLVER EL INTERNET
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage({ text: "Estás sin conexión. Los cambios se guardarán localmente.", type: 'offline' });
      setTimeout(() => setSyncMessage(null), 4000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Intentar sincronizar al arrancar la app por si quedó algo de la sesión anterior
    procesarColaPendiente();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. EL MOTOR DE SINCRONIZACIÓN EN SEGUNDO PLANO
  const procesarColaPendiente = async () => {
    if (!navigator.onLine) return; // Si no hay internet, abortar

    const user = auth.currentUser;
    if (!user) return; // Si no hay usuario logueado, abortar

    const syncKey = `cv_pending_sync_${user.uid}`;
    const pendingJobs = JSON.parse(localStorage.getItem(syncKey) || '[]');

    if (pendingJobs.length === 0) {
      if (isOnline) setSyncMessage(null); // Quitar mensaje si no hay nada que hacer
      return; 
    }

    setIsSyncing(true);

    try {
      // Procesamos cada trabajo pendiente
      for (const job of pendingJobs) {
        
        // AQUÍ PROCESAMOS EL TIPO DE TRABAJO "GUARDAR RUTINA"
        if (job.payloadHistorialGeneral) {
          const batch = writeBatch(db);

          // 1. Historial
          const rutinasCompletadasRef = collection(db, "users", user.uid, "rutinascompletadas");
          const nuevoHistorialDoc = doc(rutinasCompletadasRef);
          batch.set(nuevoHistorialDoc, {
            ...job.payloadHistorialGeneral,
            fecha: serverTimestamp() // Usamos la hora del servidor actual
          });

          // 2. Pesos
          job.payloadsPesosRegistro.forEach((payloadEj: any) => {
            const registroRef = doc(collection(db, "users", user.uid, "pesosregistro"));
            batch.set(registroRef, {
              ...payloadEj,
              rutinaCompletadaId: nuevoHistorialDoc.id,
              fecha: serverTimestamp()
            });
          });

          // 3. Plantilla
          if (job.actualizarPlantilla) {
            const plantillaRef = doc(db, "users", user.uid, "rutinas", job.rutinaId);
            batch.update(plantillaRef, { ejercicios: job.payloadPlantillaLimpia });
          }

          await batch.commit();
        }

        // PRÓXIMAMENTE: Aquí puedes agregar `else if (job.tipo === "CREAR_RUTINA") { ... }`
      }

      // Si todo salió bien, vaciamos la papelera
      localStorage.removeItem(syncKey);
      
      setSyncMessage({ text: `${pendingJobs.length} elemento(s) sincronizados con éxito.`, type: 'success' });
      setTimeout(() => setSyncMessage(null), 4000);

    } catch (error) {
      console.error("Error sincronizando en segundo plano:", error);
      // Si falla, lo dejamos en el localStorage para intentarlo la próxima vez
      setSyncMessage({ text: "Error al sincronizar. Se intentará más tarde.", type: 'offline' });
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing }}>
      {children}
      
      {/* TOAST GLOBAL DE SINCRONIZACIÓN (Se mostrará por encima de toda la app) */}
      {syncMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-full flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 transition-colors ${
          syncMessage.type === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]' :
          syncMessage.type === 'syncing' ? 'bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.4)]' :
          'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)]'
        }`}>
          {syncMessage.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {syncMessage.type === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
          {syncMessage.type === 'offline' && <WifiOff className="w-4 h-4" />}
          
          <span className="text-[10px] font-black uppercase tracking-widest">{syncMessage.text}</span>
        </div>
      )}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync debe usarse dentro de SyncProvider");
  return context;
};