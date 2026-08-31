"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, AlertTriangle, Sparkles, CheckCircle2, FileText, Lock, Activity, BrainCircuit } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
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

  const [rolUsuario, setRolUsuario] = useState<string>("clasico");
  const [bloqueado, setBloqueado] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [usosRestantes, setUsosRestantes] = useState<number | "∞">(1);
  const [usosMaximos, setUsosMaximos] = useState<number | "∞">(1);

  const [showBetaDisclaimer, setShowBetaDisclaimer] = useState(false);

  useEffect(() => {
    const obtenerRolYVerificar = async () => {
      let rolDetectado = "clasico";
      let ultimaVez = 0;

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            rolDetectado = data.rol ? data.rol.toLowerCase().trim() : "clasico";
            // 🔴 NUBE: Leemos el último uso directamente desde Firestore
            ultimaVez = data.viperUltimoUso || 0;
          }
        }
      } catch (e) {
        console.warn("No se pudo leer Firestore, usando clásico por defecto.", e);
      }

      setRolUsuario(rolDetectado);
      verificarLimiteUso(rolDetectado, ultimaVez);
    };

    obtenerRolYVerificar();
  }, []);

  // 🔴 Recibe el timestamp de Firestore en lugar de leer el LocalStorage
  const verificarLimiteUso = (rol: string, ultimaVez: number) => {
    const LIMITES: Record<string, number | "∞"> = {
      admin: "∞",
      entrenador: 1,
      clasicoplus: 1,
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

    const ahora = Date.now();
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

  // 🔴 NUBE: Guardamos el uso en el documento del usuario en Firestore
  const registrarUsoExitoso = async () => {
    if (rolUsuario === "admin") return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          viperUltimoUso: Date.now()
        });
      }
    } catch (error) {
      console.error("Error al registrar el uso de VIPER en la base de datos:", error);
    }
    
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
          setEstadoCargaTexto("ANALIZANDO BIOMECÁNICA, DAME UN SEGUNDITO MÁS...");
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
    setEstadoCargaTexto("VIPER ESTÁ ESTRUCTURANDO TU RUTINA...");
    setAiError("");
    setExplicacionViper("");
    setDatosEjerciciosTemp(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      const globalSnap = await getDocs(collection(db, "ejercicios"));
      const globalList = globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let customList: any[] = [];
      if (user) {
        const customSnap = await getDocs(collection(db, "users", user.uid, "mis_ejercicios"));
        customList = customSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isCustom: true }));
      }
      
      const listaDB = [...customList, ...globalList];
      
      const contextoEjercicios = listaDB.map(ej => 
        `ID: ${ej.id} | Nombre: ${ej.nombreEs || ej.nombre} | Músculo: ${ej.musculoEs || ej.musculoObjetivo} | Equipo: ${ej.equipo || 'Libre'}`
      ).join("\n");

      const prompt = `Tu nombre es VIPER. Eres el Entrenador Personal de Élite definitivo, un maestro absoluto en biomecánica, hipertrofia y programación estructural. Tienes un tono directo, profesional, empático y altamente analítico.

ANÁLISIS DEL USUARIO Y ASUNCIONES POR DEFECTO (CRÍTICO):
- Petición del cliente: "${aiPrompt}".
- Identifica su nivel, tiempo disponible, material, lesiones y objetivo.
- SI LA PETICIÓN ES VAGA O MUY CORTA (Ej: "Rutina de pecho" o "Pierna"), DEBES ASUMIR LO SIGUIENTE PARA CREAR LA RUTINA:
  * Nivel: Intermedio.
  * Tiempo: 60 minutos (5 a 6 ejercicios en total).
  * Material: Gimnasio comercial completo.
  * Métodos: Estándar (Calentamiento + Series Normales). Agrega un Topset o método avanzado solo en 1 o 2 ejercicios seguros al final para darle el toque VIPER.

REGLA DE FILTRO DE DOMINIO Y SEGURIDAD:
- Si la pregunta NO tiene relación con entrenamiento físico, pesas, gimnasio o rehabilitación, RECHÁZALA en la "explicacion" y deja "ejercicios" vacío ([]).
- Si menciona dolor agudo o lesiones, incluye en la "explicacion" la recomendación OBLIGATORIA de consultar a un médico, aclarando que tu diseño es conservador y adaptado.

LEYES DE PROGRAMACIÓN BIOMECÁNICA (ESTRICTAS):
1. Orden Lógico: Ejercicios compuestos pesados primero (cuando el SNC está fresco). Aislamiento y máquinas al final.
2. Volumen Óptimo: 3-5 ejercicios (<45 min), 5-7 ejercicios (60 min), 7-9 ejercicios (+90 min). No satures con volumen basura.
3. Descansos lógicos: Compuestos pesados = 120 a 180 seg. Aislamientos o máquinas = 60 a 90 seg.
4. RIR (Reps In Reserve): Compuestos pesados RIR 1-2. Aislamiento RIR 0-1 (cerca del fallo).
5. Métodos Avanzados: Usa 'Topset' / 'Backoffs' para la fuerza principal. Usa 'Rest-pause' o 'Dropsets' SOLO en el último o penúltimo ejercicio de aislamiento para rematar. NUNCA pongas un dropset en sentadilla libre o peso muerto.

REGLA DEL SISTEMA DE NOTAS (ESTRUCTURA VISUAL OBLIGATORIA):
- En el gimnasio, el usuario no puede leer párrafos largos. La propiedad "nota" DEBE usar el símbolo "•" y saltos de línea (\\n) para separar exactamente 3 puntos:
  • Propósito: [Por qué elegiste este ejercicio aquí]
  • Foco Técnico: [El tip biomecánico más importante para no lesionarse o aislar el músculo]
  • Método: [Solo si aplica técnica avanzada o indicación de tempo, ej: "Excéntrica controlada de 3s"]

REGLA ANTI-ALUCINACIÓN (ESTRICTA):
- SOLO PUEDES ELEGIR EJERCICIOS DE LA SIGUIENTE LISTA.
- SI EL USUARIO PIDE UN EJERCICIO QUE NO ESTÁ EN LA LISTA, ELIGE EL SUSTITUTO BIOMECÁNICO MÁS CERCANO.
- NUNCA, BAJO NINGUNA CIRCUNSTANCIA, INVENTES UN "id". DEBE COINCIDIR EXACTAMENTE CON ALGUNO DE ESTOS:
${contextoEjercicios}

DEBES RESPONDER EXTREMADAMENTE ESTRICTO EN FORMATO JSON con la siguiente estructura exacta:
{
  "explicacion": "¡Hola! Soy VIPER. [Análisis profundo de cómo estructuraste la rutina basado en sus datos o en las asunciones estándar si la petición fue corta. Justifica los descansos, volumen y precauciones. Motivador y experto].",
  "ejercicios": [
    {
      "id": "ID_DEL_EJERCICIO_COPIADO_EXACTAMENTE",
      "nota": "• Propósito: Movimiento principal pesado para sobrecarga progresiva.\\n• Foco Técnico: Mantén el core apretado y los codos a 45 grados.\\n• Método: RIR 1-2, no llegues al fallo absoluto.",
      "descansoSegundos": 120,
      "series": [
        { "tipo": "calentamiento", "repsTipo": "rango", "minReps": "10", "maxReps": "15", "rir": "-", "descansoExtra": 0 },
        { "tipo": "aproximacion", "repsTipo": "rango", "minReps": "5", "maxReps": "8", "rir": "2", "descansoExtra": 0 },
        { "tipo": "topset", "repsTipo": "rango", "minReps": "5", "maxReps": "8", "rir": "1", "descansoExtra": 60 },
        { "tipo": "normal", "repsTipo": "rango", "minReps": "8", "maxReps": "10", "rir": "1", "descansoExtra": 30 }
      ]
    }
  ]
}

NO uses etiquetas markdown de bloque de código como \`\`\`json. Devuelve ÚNICAMENTE el texto plano del objeto JSON.`;

      const textRaw = await ejecutarConReintento(prompt);
      const textClean = textRaw.replace(/```json/g, "").replace(/```/g, "").trim();
      const respuestaParseada = JSON.parse(textClean);

      if (!respuestaParseada.ejercicios || respuestaParseada.ejercicios.length === 0) {
        setExplicacionViper(respuestaParseada.explicacion || "VIPER: Lo siento, mi especialidad es exclusivamente ayudarte con rutinas de gimnasio y programación de entrenamiento.");
        setAiLoading(false);
        return;
      }

      const nuevosEjercicios = respuestaParseada.ejercicios.map((item: any) => {
        const base = listaDB.find(e => e.id === item.id);
        if (!base) return null; 

        return {
          ...base, 
          nota: item.nota || "",
          descansoSegundos: item.descansoSegundos || 90,
          series: item.series && item.series.length > 0 ? item.series : [
            { tipo: "normal", repsTipo: "fijas", reps: "10", minReps: "", maxReps: "", rir: "1", descansoExtra: 0 }
          ]
        };
      }).filter(Boolean);

      // 🔴 Esperamos a que la base de datos se actualice antes de mostrar los resultados
      await registrarUsoExitoso();

      setExplicacionViper(respuestaParseada.explicacion);
      setDatosEjerciciosTemp(nuevosEjercicios);

    } catch (error: any) {
      console.error("Error VIPER IA:", error);
      if (error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("503")) {
        setAiError("Se nos acabaron las peticiones a la IA por ahora. Los servidores están saturados. Inténtalo de nuevo en unos minutos.");
      } else if (error?.message?.includes("403") || error?.message?.includes("Method doesn't allow")) {
         setAiError("Error de Autorización: No se pudo verificar la API Key (Error 403). Contacta al administrador del sistema.");
      } else {
        setAiError("Ocurrió un error al procesar la rutina. Por favor, intenta de nuevo dando instrucciones un poco más sencillas.");
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
      <div className="mb-4 flex flex-col bg-zinc-900/90 border border-rose-500/40 rounded-2xl animate-in slide-in-from-top-2 fade-in duration-300 shadow-[0_0_30px_rgba(244,63,94,0.1)] relative max-h-[85dvh] sm:max-h-[75vh] overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none z-0"></div>

        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/50 shrink-0 z-10 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">VIPER • Tu Entrenador IA</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider hidden sm:block">
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

        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 z-10">
          {explicacionViper ? (
            
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-rose-400">
                <FileText className="w-4 h-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Respuesta de VIPER</h4>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                {explicacionViper}
              </p>
            </div>

          ) : bloqueado ? (
            
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center space-y-3">
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

            <div className="space-y-4">
              <div className="text-[11px] text-zinc-300 font-medium leading-relaxed space-y-2 hidden sm:block">
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
              </div>
              
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ej: Tengo 22 años, soy intermedio y hoy solo tengo 45 min para entrenar pecho y tríceps..."
                className="w-full bg-black/60 border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 transition-colors min-h-[140px] sm:min-h-[110px] resize-none sm:resize-y"
                disabled={aiLoading}
              />
            </div>
          )}
        </div>

        {(!bloqueado || explicacionViper) && (
          <div className="p-4 sm:p-5 border-t border-zinc-800/50 shrink-0 bg-zinc-900/60 rounded-b-2xl z-10">
            
            {aiError && !explicacionViper && (
              <div className="flex items-start gap-2 text-[10px] text-rose-400 mb-3 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>{aiError}</p>
              </div>
            )}

            {explicacionViper && datosEjerciciosTemp && datosEjerciciosTemp.length > 0 ? (
              
              <button 
                onClick={confirmarInyeccion}
                className="w-full bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all flex justify-center items-center gap-2 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> ACEPTAR Y REMPLAZAR RUTINA
              </button>

            ) : !explicacionViper && !bloqueado ? (
              
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

            ) : null}
          </div>
        )}

      </div>

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