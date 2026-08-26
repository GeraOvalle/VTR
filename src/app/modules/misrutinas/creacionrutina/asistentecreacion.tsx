"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, AlertTriangle, Sparkles, CheckCircle2, FileText, Lock, Activity, BrainCircuit } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { IA_MODEL } from "../../../lib/gemini";

interface AsistenteCreacionProps {
  onInyectarEjercicios: (nuevosEjercicios: any[]) => void;
  onClose: () => void;
}

export default function AsistenteCreacionModule({ onInyectarEjercicios, onClose }: AsistenteCreacionProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [estadoCargaTexto, setEstadoCargaTexto] = useState("VIPER ESTÁ ARMANDO TU RUTINA...");
  const [aiError, setAiError] = useState("");
  const [explicacionViper, setExplicacionViper] = useState("");
  const [datosEjerciciosTemp, setDatosEjerciciosTemp] = useState<any[] | null>(null);

  // Estados de Control de Bloqueo, Rol y Usos
  const [rolUsuario, setRolUsuario] = useState<string>("clasico");
  const [bloqueado, setBloqueado] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [usosRestantes, setUsosRestantes] = useState<number | "∞">(1);
  const [usosMaximos, setUsosMaximos] = useState<number | "∞">(1);

  // Estado del Pop-up de Fase Beta
  const [showBetaDisclaimer, setShowBetaDisclaimer] = useState(false);

  // Cargar rol desde Firebase Auth / Firestore y verificar límites al abrir
  useEffect(() => {
    const obtenerRolYVerificar = async () => {
      let rolDetectado = "clasico";

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().rol) {
            rolDetectado = userDoc.data().rol.toLowerCase().trim();
          }
        }
      } catch (e) {
        console.warn("No se pudo leer el rol de Firestore, usando clásico por defecto.", e);
      }

      setRolUsuario(rolDetectado);
      verificarLimiteUso(rolDetectado);
    };

    obtenerRolYVerificar();
  }, []);

  const verificarLimiteUso = (rol: string) => {
    const LIMITES: Record<string, number | "∞"> = {
      admin: "∞",
      entrenador: 1,
      tester: 1,
      clasico: 1
    };

    const maxUsos = LIMITES[rol] || 1;
    setUsosMaximos(maxUsos);

    if (maxUsos === "∞") {
      setUsosRestantes("∞");
      setBloqueado(false);
      setShowBetaDisclaimer(false); 
      return;
    }

    const registroUso = JSON.parse(localStorage.getItem("viper_uso_ia") || "{}");
    const ahora = Date.now();
    const ultimaVez = registroUso.timestampUltimoUso || 0;
    const unDiaEnMs = 24 * 60 * 60 * 1000;

    if (ultimaVez && (ahora - ultimaVez < unDiaEnMs)) {
      setUsosRestantes(0);
      setBloqueado(true);
      setShowBetaDisclaimer(false); 
      
      const horasRestantes = Math.ceil((unDiaEnMs - (ahora - ultimaVez)) / (1000 * 60 * 60));
      setTiempoRestante(`Podrás pedir otra rutina en unas ${horasRestantes} hora(s).`);
    } else {
      setUsosRestantes(maxUsos);
      setShowBetaDisclaimer(true); 
    }
  };

  const registrarUsoExitoso = () => {
    if (rolUsuario === "admin") return;

    const hoy = new Date().toISOString().split("T")[0];
    const nuevoUsoObj = {
      fecha: hoy,
      usos: 1,
      timestampUltimoUso: Date.now()
    };
    
    localStorage.setItem("viper_uso_ia", JSON.stringify(nuevoUsoObj));
    
    if (usosMaximos !== "∞") {
      setUsosRestantes(0);
      setBloqueado(true);
      setTiempoRestante("Podrás usar a VIPER de nuevo mañana.");
    }
  };

  const ejecutarConReintento = async (prompt: string, intentosMaximos = 2): Promise<string> => {
    for (let intento = 1; intento <= intentosMaximos; intento++) {
      try {
        if (intento > 1) {
          setEstadoCargaTexto("HAY MUCHA GENTE CONECTADA, DAME UN SEGUNDITO MÁS...");
        }
        const result = await IA_MODEL.generateContent(prompt);
        const text = await result.response.text();
        if (text) return text;
      } catch (error) {
        console.warn(`Intento ${intento} fallido:`, error);
        if (intento === intentosMaximos) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    throw new Error("No se pudo obtener respuesta tras varios reintentos.");
  };

  const generarConIA = async () => {
    if (!aiPrompt.trim() || bloqueado) return;
    setAiLoading(true);
    setEstadoCargaTexto("VIPER ESTÁ ARMANDO TU RUTINA...");
    setAiError("");
    setExplicacionViper("");
    setDatosEjerciciosTemp(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      // 1. Extraemos los Ejercicios Globales
      const globalSnap = await getDocs(collection(db, "ejercicios"));
      const globalList = globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 2. Extraemos los Ejercicios Propios del Usuario
      let customList: any[] = [];
      if (user) {
        const customSnap = await getDocs(collection(db, "users", user.uid, "mis_ejercicios"));
        customList = customSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isCustom: true }));
      }
      
      // Combinamos ambas listas para que VIPER tenga todo el arsenal
      const listaDB = [...customList, ...globalList];
      
      const contextoEjercicios = listaDB.map(ej => 
        `ID: ${ej.id} | Nombre: ${ej.nombreEs || ej.nombre} | Músculo: ${ej.musculoEs || ej.musculoObjetivo} | Equipo: ${ej.equipo || 'Libre'}`
      ).join("\n");

      const prompt = `Tu nombre es VIPER. Eres un Entrenador Personal de Élite, experto en biomecánica y muy empático. 

REGLA DE FILTRO DE DOMINIO (GUARDRAIL):
- Analiza la petición del cliente: "${aiPrompt}".
- Si la pregunta NO tiene nada que ver con entrenamiento de fuerza, gimnasio, rutinas, selección de ejercicios, biomecánica o adaptación por edad/condición física, DEBES RECHAZARLA amablemente en la propiedad "explicacion" diciendo que tu enfoque exclusivo es el entrenamiento y las estructuras de gimnasio, y deja el array de "ejercicios" completamente vacío ([]).
- Si te hablan de su edad (ej. "tengo 60 años"), condiciones físicas o adaptaciones por salud, SÍ debes responder creando una rutina segura y adaptada.

REGLA DE DESLINDE DE RESPONSABILIDAD (SAFETY DISCLAIMER):
- Si el usuario menciona lesiones, dolores articulares, molestias o condiciones médicas, incluye en la explicación una advertencia clara: recuérdale que esta es una estructura orientativa, que si siente dolor punzante debe detenerse de inmediato y consultar a un especialista.

REGLA DE NOTAS EXPLICATIVAS PROFUNDAS (MUY IMPORTANTE):
- En la propiedad "nota" de cada ejercicio, VIPER debe explicar obligatoriamente:
  1. Por qué se eligió este ejercicio específico.
  2. El propósito exacto de las series avanzadas (ej: por qué se usa un *topset* o un *dropset* y cómo ejecutarlo sin lesionarse).
  3. Consejos de postura y sensaciones esperadas.

REGLA DE TIEMPO Y VOLUMEN:
- Analiza el tiempo disponible especificado por el cliente para adaptar la densidad y cantidad de ejercicios (de 8 a 12 ejercicios si el tiempo es amplio como 1.5 o 2 horas).

REGLA DE IDs ESTRICTOS:
- SOLO PUEDES ELEGIR EJERCICIOS DE ESTA LISTA EXACTA. COPIA EL 'ID' EXACTO QUE APARECE AQUÍ PARA CADA EJERCICIO ELEGIDO. NO INVENTES IDs.
LISTA DE LA BASE DE DATOS DISPONIBLES:
${contextoEjercicios}

DEBES RESPONDER EXTREMADAMENTE ESTRICTO EN FORMATO JSON con la siguiente estructura exacta:
{
  "explicacion": "¡Hola! Soy VIPER. [Tu mensaje de análisis, adaptado a su edad o requerimiento físico, incluyendo el descargo médico si mencionó molestias].",
  "ejercicios": [
    {
      "id": "ID_DEL_EJERCICIO_AQUI",
      "nota": "VIPER te explica: Usamos este movimiento al inicio porque... Colocamos un Topset para... Y cerramos con un Dropset...",
      "descansoSegundos": 90,
      "series": [
        { "tipo": "calentamiento", "repsTipo": "fijas", "reps": "15", "rir": "-", "descansoExtra": 0 },
        { "tipo": "topset", "repsTipo": "rango", "minReps": "6", "maxReps": "8", "rir": "0", "descansoExtra": 30 },
        { "tipo": "dropset", "repsTipo": "fijas", "reps": "10", "rir": "0", "descansoExtra": 60 }
      ]
    }
  ]
}

NO uses etiquetas markdown de bloque de código como \`\`\`json. Devuelve únicamente el texto plano del objeto JSON.`;

      const textRaw = await ejecutarConReintento(prompt);
      const textClean = textRaw.replace(/```json/g, "").replace(/```/g, "").trim();
      const respuestaParseada = JSON.parse(textClean);

      if (!respuestaParseada.ejercicios || respuestaParseada.ejercicios.length === 0) {
        setExplicacionViper(respuestaParseada.explicacion || "VIPER: Lo siento, mi especialidad es exclusivamente ayudarte con rutinas de gimnasio y ejercicios.");
        setAiLoading(false);
        return;
      }

      const nuevosEjercicios = respuestaParseada.ejercicios.map((item: any) => {
        const base = listaDB.find(e => e.id === item.id);
        if (!base) return null; // Ignora IDs alucinados por la IA

        return {
          ...base, // Clonamos los datos base como GIF, nombre, etc.
          nota: item.nota || "",
          descansoSegundos: item.descansoSegundos || 90,
          series: item.series && item.series.length > 0 ? item.series : [
            { tipo: "normal", repsTipo: "fijas", reps: "10", minReps: "", maxReps: "", rir: "1", descansoExtra: 0 }
          ]
        };
      }).filter(Boolean); // Limpiamos los nulos

      // Descuenta el uso de la cuota PERO ya no bloquea la vista de resultados
      registrarUsoExitoso();

      setExplicacionViper(respuestaParseada.explicacion);
      setDatosEjerciciosTemp(nuevosEjercicios);

    } catch (error: any) {
      console.error("Error VIPER IA:", error);
      if (error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
        setAiError("Se nos acabaron las peticiones gratuitas a la Inteligencia Artificial por hoy. Inténtalo un poco más tarde.");
      } else {
        setAiError("Los servidores de IA están saturados ahora mismo. Tomó demasiado tiempo, inténtalo de nuevo.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const confirmarInyeccion = () => {
    if (datosEjerciciosTemp) {
      onInyectarEjercicios(datosEjerciciosTemp);
      onClose();
    }
  };

  return (
    <>
      <div className="mb-8 p-5 bg-zinc-900/90 border border-rose-500/40 rounded-2xl animate-in slide-in-from-top-2 fade-in duration-300 shadow-[0_0_30px_rgba(244,63,94,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">VIPER • Tu Entrenador IA</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {rolUsuario}
            </span>
            <div className={`flex items-center gap-1.5 font-bold px-2 py-0.5 rounded shadow-inner border ${usosRestantes === 0 ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`} title="Usos Restantes">
              <Activity className="w-3 h-3" />
              <span className="text-[9px] uppercase tracking-widest">
                {usosRestantes} / {usosMaximos}
              </span>
            </div>
          </div>
        </div>

        {/* 🔴 CORRECCIÓN DE LA LÓGICA DE DIBUJADO */}
        {explicacionViper ? (
          
          /* 1. PRIORIDAD MÁXIMA: Si hay resultados, muéstralos siempre */
          <div className="mb-4 p-4 bg-black/80 border border-rose-500/30 rounded-xl space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-rose-400">
              <FileText className="w-4 h-4" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Respuesta de VIPER</h4>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
              {explicacionViper}
            </p>

            {datosEjerciciosTemp && datosEjerciciosTemp.length > 0 && (
              <button 
                onClick={confirmarInyeccion}
                className="w-full mt-2 bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all flex justify-center items-center gap-2 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> ACEPTAR Y REMPLAZAR RUTINA
              </button>
            )}
          </div>

        ) : bloqueado ? (
          
          /* 2. PRIORIDAD MEDIA: Si no hay resultados y estás bloqueado, muestra el candado */
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center space-y-3 my-2">
            <div className="flex justify-center text-rose-400">
              <Lock className="w-6 h-6 animate-bounce" />
            </div>
            <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest">Intento agotado por hoy</h4>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
              {aiError || "Ya usaste tu turno para crear una rutina hoy."}
            </p>
            {tiempoRestante && (
              <p className="text-[10px] text-zinc-400 font-bold">{tiempoRestante}</p>
            )}
          </div>

        ) : (

          /* 3. PRIORIDAD BAJA: Pantalla de inicio si tienes usos y no has generado nada */
          <>
            <div className="text-[11px] text-zinc-300 font-medium leading-relaxed mb-4 space-y-2">
              <p><strong className="text-white">¡Hola! Soy VIPER, tu entrenador virtual.</strong></p>
              <p>
                Como solo tienes un intento al día, trata de darme la mayor cantidad de detalles posible para que tu rutina quede perfecta. Cuéntame cosas como:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                <li>Tu edad y nivel (principiante, intermedio, avanzado).</li>
                <li>Qué músculos quieres entrenar hoy o <strong className="text-zinc-300">ejercicios en específico</strong> que quieras incluir.</li>
                <li>Cuánto tiempo tienes libre.</li>
                <li>Si tienes molestias, poco equipo, o prefieres fuerza o hipertrofia.</li>
              </ul>
              <p className="pt-1 text-rose-400/90 font-bold">
                ¡Puedes decirme casi cualquier cosa por más técnica que sea! Entiendo a la perfección de biomecánica, RIR, métodos avanzados y programación de entrenamiento.
              </p>
            </div>
            
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej: Tengo 22 años, soy intermedio y hoy solo tengo 45 min para entrenar pecho y tríceps. Me duele un poco el hombro, así que evita press con barra plana..."
              className="w-full bg-black/60 border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 transition-colors min-h-[110px] resize-y mb-3"
              disabled={aiLoading}
            />

            {aiError && (
              <div className="flex items-start gap-2 text-[10px] text-rose-400 mb-3 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>{aiError}</p>
              </div>
            )}

            <button 
              onClick={generarConIA}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full bg-white text-black font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {aiLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin text-black" /> {estadoCargaTexto}</>
              ) : (
                <><Zap className="w-4 h-4 fill-black" /> CREAR MI RUTINA</>
              )}
            </button>
          </>
        )}
      </div>

      {/* MODAL DE ADVERTENCIA FASE BETA */}
      {showBetaDisclaimer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-rose-500/50 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(244,63,94,0.2)] overflow-hidden text-center p-8 relative">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50"></div>

            <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 ring-1 ring-rose-500/30">
              <BrainCircuit className="w-8 h-8" />
            </div>
            
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">VIPER en fase de pruebas</h3>
            
            <p className="text-[11px] text-zinc-300 leading-relaxed mb-5">
              VIPER es una herramienta impulsada por Inteligencia Artificial que aún estamos ajustando. Para evitar que el sistema colapse, 
              <strong className="text-white"> solo tienes 1 intento al día</strong> para crear tu rutina.
            </p>
            
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl mb-7">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Un consejo rápido</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Aprovecha bien tu intento contándome todos los detalles: cuánto tiempo tienes, si te duele algo o qué quieres trabajar. Si te equivocas en pedirla, <strong className="text-amber-400">tendrás que esperar hasta mañana</strong> para intentar de nuevo.
              </p>
            </div>
            
            <button 
              onClick={() => setShowBetaDisclaimer(false)}
              className="w-full bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-rose-600 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-[0.98]"
            >
              ¡Entendido, seré bien específico!
            </button>

          </div>
        </div>
      )}
    </>
  );
}