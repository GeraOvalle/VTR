"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, ShieldAlert, CheckSquare, Square, AlertTriangle, Loader2 } from "lucide-react";

// Importación de módulos
import RegisterModule from "./modules/principal/registro";
import HomeModule from "./modules/home/home";
import CompletarPerfil from "./modules/principal/completarperfil";

// Importación de Firebase
import { auth, db } from "./lib/firebase";
import { 
  signInWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getCountFromServer // <-- IMPORTANTE: Para contar usuarios eficientemente
} from "firebase/firestore";

export default function LoginModule() {
  const [currentView, setCurrentView] = useState<"login" | "register" | "home">("login");
  const [needsProfile, setNeedsProfile] = useState(false);
  
  const [isInitializing, setIsInitializing] = useState(true);

  // Estados del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Estados de proceso
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1. Efecto para jalar el correo automáticamente si venimos del registro
  useEffect(() => {
    const emailGuardado = localStorage.getItem("cv_registered_email");
    if (emailGuardado) {
      setEmail(emailGuardado);
      localStorage.removeItem("cv_registered_email");
    }
  }, []);

  // 2. OBSERVADOR DEL SISTEMA: El "Cadenero"
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        
        // BLOQUEO ESTRICTO: Si el correo no está verificado, lo pateamos fuera.
        if (!user.emailVerified) {
          await signOut(auth); // Cerramos esa sesión "fantasma"
          setIsInitializing(false);
          return; // Detenemos la ejecución, no entra a Home.
        }

        // Si pasó el bloqueo, verificamos si existe el documento y si tiene nombre
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists() || !userDocSnap.data().nombre) {
          setNeedsProfile(true);
        } else {
          setNeedsProfile(false);
        }
        
        setCurrentView("home");
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Manejador de Inicio de Sesión Manual
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("SISTEMA: Credenciales incompletas.");
      return;
    }

    setLoading(true);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // BLOQUEO ESTRICTO EN LOGIN MANUAL: Validar correo verificado
      if (!user.emailVerified) {
        await signOut(auth); // Lo sacamos
        setError("SISTEMA: Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada o SPAM.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // --- LÓGICA DE PRIMERA VEZ (CREACIÓN DE DOCUMENTO) ---
      if (!userDocSnap.exists() || !userDocSnap.data().nombre) {
        
        // 1. Contar cuántos usuarios tienen el rol "tester"
        const q = query(collection(db, "users"), where("rol", "==", "tester"));
        const snapshot = await getCountFromServer(q);
        const testerCount = snapshot.data().count;

        // 2. Asignar rol: Si hay menos de 10 testers, le damos el lugar. Si no, es clásico.
        const rolAsignado = testerCount < 10 ? "tester" : "clasico";

        // 3. Guardar el documento con el rol correspondiente
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          rol: rolAsignado, 
          fechaRegistro: serverTimestamp(),
          estado: "activo",
          perfilCompletado: false
        }, { merge: true });
        
        setNeedsProfile(true);
      } else {
        setNeedsProfile(false);
      }

      setCurrentView("home");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("SISTEMA: Acceso denegado. Credenciales incorrectas.");
      } else if (err.code === "auth/too-many-requests") {
        setError("SISTEMA: Demasiados intentos. Cuenta bloqueada temporalmente.");
      } else {
        setError("SISTEMA: Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  // PANTALLA DE CARGA DEL SISTEMA
  if (isInitializing) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(38, 38, 38, 0.4) 0%, rgba(10, 10, 10, 0.8) 70%, #000000 100%),
              repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px),
              repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 8px)
            `,
            backgroundSize: '100% 100%, 16px 16px, 16px 16px'
          }}
        ></div>
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4 relative z-10" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] animate-pulse relative z-10">
          Verificando Integridad de Sesión...
        </p>
      </main>
    );
  }

  // Renderizado condicional de módulos
  if (currentView === "register") {
    return <RegisterModule onBackToLogin={() => setCurrentView("login")} />;
  }

  if (currentView === "home") {
    if (needsProfile) {
      return <CompletarPerfil onComplete={() => setNeedsProfile(false)} />;
    }
    return <HomeModule />;
  }

  // Vista Principal de Login
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-rose-500/30">
      
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

      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 z-10"></div>

      <div className="w-full max-w-sm bg-zinc-950/95 backdrop-blur-xl border border-white/40 rounded-2xl p-8 pt-10 relative z-10 shadow-[0_0_50px_-10px_rgba(255,255,255,0.25)] ring-1 ring-white/20">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-5 w-28 h-28 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(159,18,57,0.25)] ring-1 ring-white/10 group">
             <div className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-transparent to-black/40 pointer-events-none z-10"></div>
             <img 
               src="/logo_coach.png" 
               alt="Logo Coach Vital" 
               className="w-full h-full object-cover scale-105 drop-shadow-[0_0_12px_rgba(159,18,57,0.5)] relative z-0"
             />
          </div>

          <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            VTR
          </h1>

          <div className="mt-2 space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500">
              Bienvenido
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              Lleva el registro de tus entrenamientos como un profesional
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 flex items-start gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col">
            <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1.5 ml-1">
              Username o Correo
            </label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col relative">
            <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1.5 ml-1">
              Contraseña
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/15 rounded-lg p-3 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all tabular-nums tracking-widest disabled:opacity-50"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div 
            className="flex items-center gap-2 cursor-pointer w-max group"
            onClick={() => !loading && setRememberMe(!rememberMe)}
          >
            {rememberMe ? (
              <CheckSquare className="w-4 h-4 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transition-all" />
            ) : (
              <Square className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            )}
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-colors ${rememberMe ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
              Recordar Sesión
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-white text-black font-black uppercase tracking-[0.15em] text-xs py-3.5 rounded-lg hover:bg-zinc-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> VERIFICANDO...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => setCurrentView("register")}
            disabled={loading}
            className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em] hover:text-zinc-200 transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
          >
            ¿Aún no tienes cuenta? <span className="text-white underline underline-offset-4 ml-1 hover:text-rose-400 transition-colors">Regístrate</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 flex flex-col items-center gap-3 z-10 opacity-70 hover:opacity-100 transition-opacity">
        <ShieldAlert className="w-3 h-3 text-zinc-600" />
        <div className="flex gap-4 text-[8px] text-zinc-500 font-black uppercase tracking-[0.2em]">
          <a href="#" className="hover:text-zinc-300 transition-colors">Términos de Uso</a>
          <span className="text-zinc-800">|</span>
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacidad</a>
          <span className="text-zinc-800">|</span>
          <a href="#" className="hover:text-zinc-300 transition-colors">Soporte Operativo</a>
        </div>
      </div>
    </main>
  );
}