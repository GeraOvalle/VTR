"use client";

import { useState, useEffect } from "react";
import { User, Check, Loader2, X, AlertTriangle, Info } from "lucide-react";
import { auth, db } from "../../lib/firebase"; 
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

interface CompletarPerfilProps {
  onComplete: () => void;
}

export default function CompletarPerfil({ onComplete }: CompletarPerfilProps) {
  const [usernameDisplay, setUsernameDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estados de Verificación
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userAvailable, setUserAvailable] = useState<boolean | null>(null);
  const [suggestion, setSuggestion] = useState("");

  // 1. Efecto inicial: Sugerir nombre basado en el correo
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.email) {
      // Extrae la parte antes del @ y quita caracteres raros
      const baseName = user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      setUsernameDisplay(baseName);
      
      // Si llegara a estar ocupado ese baseName, creamos una sugerencia alternativa con números
      setSuggestion(`${baseName}${Math.floor(Math.random() * 1000)}`);
    }
  }, []);

  // 2. Control del input (Letras y números para el username)
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.replace(/[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ]/g, '');
    setUsernameDisplay(limpio);
  };

  // 3. Motor de validación en tiempo real (Igual que en Perfil)
  useEffect(() => {
    const userToSave = usernameDisplay.toLowerCase();
    
    if (userToSave.length < 3) {
      setUserAvailable(null); // Muy corto para verificar
      return;
    }

    const checkUser = setTimeout(async () => {
      setIsCheckingUser(true);
      try {
        const q = query(collection(db, "users"), where("username", "==", userToSave));
        const querySnapshot = await getDocs(q);
        setUserAvailable(querySnapshot.empty);
      } catch (error) {
        console.error("Error verificando usuario:", error);
      } finally {
        setIsCheckingUser(false);
      }
    }, 600); // 600ms de retraso para no saturar la base de datos mientras teclea

    return () => clearTimeout(checkUser);
  }, [usernameDisplay]);

  // 4. Guardar datos
  const handleSave = async () => {
    if (!usernameDisplay.trim() || userAvailable === false || usernameDisplay.length < 3) return;
    
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        nombre: usernameDisplay,
        usernameDisplay: usernameDisplay,
        username: usernameDisplay.toLowerCase(),
        perfilCompletado: true
      }, { merge: true });

      onComplete(); // Cerramos esta pantalla y mandamos al Home
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("SISTEMA: Hubo un problema de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Fondo Escamoso Táctico / Patrón de Piel de Serpiente */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px),
            repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)
          `,
          backgroundSize: '100% 100%, 16px 16px, 16px 16px'
        }}
      ></div>

      <div className="w-full max-w-sm bg-zinc-950/95 backdrop-blur-xl border border-white/40 rounded-2xl p-8 text-center relative z-10 shadow-[0_0_50px_-10px_rgba(255,255,255,0.25)] ring-1 ring-white/20">
        
        <div className="mx-auto w-16 h-16 bg-white/5 border border-white/15 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
          <User className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
          ¡Bienvenido!
        </h2>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em] mb-8 leading-relaxed">
          Para terminar de configurar tu cuenta, elige un nombre de usuario único.
        </p>

        <div className="text-left mb-8">
          <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-2 ml-1 block">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
            <input 
              type="text" 
              placeholder="Ej. CoachVital"
              value={usernameDisplay}
              onChange={handleUsernameChange}
              className={`w-full bg-white/5 border rounded-lg p-3 pl-8 text-sm text-white focus:outline-none focus:bg-white/10 transition-all font-bold tracking-wider ${
                userAvailable === false ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/15 focus:border-white/50'
              }`}
              disabled={loading}
            />
            {/* Iconos de validación dinámica */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isCheckingUser ? <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" /> : 
               userAvailable === true && usernameDisplay.length >= 3 ? <Check className="w-4 h-4 text-emerald-500" /> : 
               userAvailable === false ? <X className="w-4 h-4 text-rose-500" /> : null}
            </div>
          </div>

          {/* Mensajes de error / sugerencia */}
          {userAvailable === false && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-1">
              <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Este username ya está en uso.
              </p>
              <p className="text-[9px] text-zinc-400 font-bold mt-1 pl-4">
                Sugerencia: <button onClick={() => setUsernameDisplay(suggestion)} className="text-white hover:text-rose-400 transition-colors underline">{suggestion}</button>
              </p>
            </div>
          )}

          <div className="mt-4 flex items-start gap-1.5 opacity-70">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-black leading-snug">
              Puedes cambiar tu nombre más adelante desde los ajustes de tu perfil.
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading || !usernameDisplay.trim() || userAvailable === false || usernameDisplay.length < 3}
          className="w-full bg-rose-500 text-white py-3.5 rounded-lg font-black uppercase tracking-[0.15em] text-xs hover:bg-rose-400 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
          Guardar y Entrar
        </button>

      </div>
    </main>
  );
}