"use client";

import { ArrowLeft, Bug, Wrench, MessageSquareWarning } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function PageBug({ onBack }: Props) {
  return (
    <main className="fixed inset-0 h-[100dvh] w-full bg-black text-white flex flex-col p-4 md:p-8 font-sans overflow-hidden">
      
      {/* Cabecera Fija */}
      <div className="flex items-center gap-4 mb-6 pt-4 relative z-10 shrink-0 border-b border-white/10 pb-4">
        <button 
          onClick={onBack}
          className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-300" />
        </button>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-rose-500" />
          <h1 className="text-lg font-black uppercase tracking-widest text-white">Soporte Operativo</h1>
        </div>
      </div>

      {/* Contenedor con Scroll para el texto */}
      <div className="flex-1 overflow-y-auto pr-3 pb-12 space-y-8 text-sm text-zinc-300 relative z-10 custom-scrollbar text-justify leading-relaxed">
        
        <div className="bg-rose-950/20 border border-rose-500/50 rounded-lg p-5 mb-6 shadow-[0_0_15px_rgba(159,18,57,0.1)]">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquareWarning className="w-5 h-5 text-rose-500" />
            <p className="text-rose-400 font-black uppercase tracking-widest text-xs">Fase de Pruebas (BETA)</p>
          </div>
          <p className="text-xs text-rose-200/90 font-medium">
            VTR es un sistema en desarrollo activo. Durante esta fase inicial de auditoría y pruebas, tu retroalimentación es el activo más importante para garantizar la estabilidad de la plataforma antes del lanzamiento público general.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">1. Naturaleza del Soporte Técnico</h2>
          <p>
            El Soporte Operativo de VTR tiene como objetivo principal la identificación, documentación y resolución de anomalías de software (<i>bugs</i>), fallas de conectividad con la base de datos (Firebase), y el refinamiento de la interfaz de usuario (UI/UX).
          </p>
          <p>
            <strong>Tiempos de Respuesta:</strong> Al encontrarse en fase Beta, el servicio de soporte opera en un esquema de "mejor esfuerzo" (<i>best-effort</i>). Las incidencias críticas (ej. pérdida de datos de entrenamiento o caída del sistema) tendrán prioridad técnica absoluta.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">2. Reporte de Incidencias (Bugs)</h2>
          <p>
            Si experimentas un comportamiento inesperado en la plataforma, te solicitamos enviar un reporte detallado. Para agilizar la solución, tu reporte idealmente debe incluir:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>Descripción del error:</strong> Qué intentabas hacer y qué sucedió en su lugar.</li>
            <li><strong>Dispositivo utilizado:</strong> Marca, modelo y navegador (ej. iPhone 13 Pro en Safari, o PC Windows en Chrome).</li>
            <li><strong>Evidencia:</strong> De ser posible, capturas de pantalla o grabaciones del momento exacto del fallo.</li>
            <li><strong>Módulo afectado:</strong> (ej. <i>Registro de Top Set</i>, <i>Asistente VIPER</i>, <i>Inicio de Sesión</i>).</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">3. Sugerencias de Mejora (Feature Requests)</h2>
          <p>
            VTR está diseñado por y para atletas que buscan el máximo rendimiento. Si detectas que el flujo operativo de registro podría ser más rápido, o si tienes ideas para nuevas herramientas (cálculo de RM, temporizadores integrados, integración nutricional), nuestro canal de soporte está abierto a evaluar e integrar la viabilidad de tus propuestas.
          </p>
        </section>

        <section className="space-y-4 bg-white/[0.02] p-6 rounded-xl border border-white/5 text-center mt-8">
          <Bug className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
          <h2 className="text-white font-black uppercase tracking-widest text-sm mb-4">Canal Oficial de Asistencia</h2>
          <p className="text-xs text-zinc-400 mb-4">
            Para cualquier reporte técnico, duda sobre la plataforma o envío de sugerencias operativas, comunícate directamente con la administración de VTR a través de nuestro correo oficial:
          </p>
          <div className="p-4 bg-black/60 border border-rose-500/30 rounded-lg inline-block">
            <a href="mailto:vtr.fitness.contacto@gmail.com" className="text-rose-500 font-black tracking-widest hover:text-rose-400 transition-colors">
              vtr.fitness.contacto@gmail.com
            </a>
          </div>
        </section>

        <div className="pt-10 pb-6 border-t border-white/10 flex flex-col items-center justify-center text-center gap-2">
          <img src="/logo_coach.png" alt="VTR Logo" className="w-10 h-10 opacity-50 grayscale" />
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
            © {new Date().getFullYear()} VTR Coaching | Departamento Técnico
          </p>
        </div>

      </div>
    </main>
  );
}