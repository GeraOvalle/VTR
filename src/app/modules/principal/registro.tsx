"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldAlert, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
// IMPORTANTE: Ajusta el path relativo si no usas alias de TypeScript/Next.js
import { auth } from "../../lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

interface RegisterModuleProps {
  onBackToLogin: () => void;
}

export default function RegisterModule({ onBackToLogin }: RegisterModuleProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password || !confirmPassword) {
      setError("SISTEMA: Todos los campos son requeridos.");
      return;
    }

    if (!passwordsMatch) {
      setError("SISTEMA: Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Enviar correo de verificación
      await sendEmailVerification(userCredential.user);
      
      // 3. Mostrar mensaje de éxito
      setSuccess("Se ha enviado un correo de verificación. Por favor, revisa tu bandeja de entrada para activar tu cuenta (recuerda revisar la carpeta de spam).");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está en uso.");
      } else if (err.code === "auth/weak-password") {
        setError("Contraseña débil. Usa al menos 6 caracteres.");
      } else if (err.code === "auth/invalid-email") {
        setError("Formato de correo inválido.");
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-rose-500/30">
      
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

      {/* HUD Vignette & Light Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black pointer-events-none z-0"></div>
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 z-10"></div>

      {/* Main Panel */}
      <div className="w-full max-w-sm bg-zinc-950/95 backdrop-blur-xl border border-white/40 rounded-2xl p-8 pt-8 relative z-10 shadow-[0_0_50px_-10px_rgba(255,255,255,0.25)] ring-1 ring-white/20">
        
        {/* Header con Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4 w-24 h-24 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(159,18,57,0.25)] ring-1 ring-white/10 group">
             <div className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-transparent to-black/40 pointer-events-none z-10"></div>
             <img 
               src="/logo_coach.png" 
               alt="Logo Coach Vital" 
               className="w-full h-full object-cover scale-105 drop-shadow-[0_0_12px_rgba(159,18,57,0.5)] relative z-0"
             />
          </div>

          <h1 className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            REGISTRO
          </h1>
          <span className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-black mt-1">
            Crear Nueva Cuenta de Acceso
          </span>
        </div>

        {/* Alertas del Sistema HUD */}
        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 flex items-start gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{success}</p>
          </div>
        )}

        {/* Inputs Section (Envuelto en un form) */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1.5 ml-1">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all"
              disabled={loading}
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
                className="w-full bg-white/5 border border-white/15 rounded-lg p-3 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all tabular-nums tracking-widest"
                disabled={loading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col relative">
            <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
              <label className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                Confirmar Contraseña
              </label>
              {passwordsMatch && (
                <span className="flex items-center gap-1 text-[8px] text-emerald-400 font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Coinciden
                </span>
              )}
            </div>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-white/5 border rounded-lg p-3 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:bg-white/10 transition-all tabular-nums tracking-widest ${
                  confirmPassword ? (passwordsMatch ? 'border-emerald-500/50' : 'border-rose-500/50') : 'border-white/15'
                }`}
                disabled={loading}
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors focus:outline-none"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón de Registrarse */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-white text-black font-black uppercase tracking-[0.15em] text-xs py-3.5 rounded-lg hover:bg-zinc-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> PROCESANDO...
              </>
            ) : (
              "Registrarse"
            )}
          </button>
        </form>

        {/* Back to Login Text */}
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={onBackToLogin}
            disabled={loading}
            className="inline-flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em] hover:text-white transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> ¿Ya tienes cuenta? <span className="text-white underline underline-offset-4 ml-0.5">Inicia Sesión</span>
          </button>
        </div>
      </div>

      {/* Footer / Legal */}
      <div className="absolute bottom-6 flex flex-col items-center gap-2 z-10 opacity-70 hover:opacity-100 transition-opacity">
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