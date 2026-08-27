"use client";

import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function PagePriv({ onBack }: Props) {
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
          <ShieldCheck className="w-5 h-5 text-rose-500" />
          <h1 className="text-lg font-black uppercase tracking-widest text-white">Aviso de Privacidad Integral</h1>
        </div>
      </div>

      {/* Contenedor con Scroll para el texto */}
      <div className="flex-1 overflow-y-auto pr-3 pb-12 space-y-8 text-sm text-zinc-300 relative z-10 custom-scrollbar text-justify leading-relaxed">
        
        <div className="bg-rose-950/20 border border-rose-500/50 rounded-lg p-5 mb-6 shadow-[0_0_15px_rgba(159,18,57,0.1)]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-rose-500" />
            <p className="text-rose-400 font-black uppercase tracking-widest text-xs">Cumplimiento Normativo (LFPDPPP)</p>
          </div>
          <p className="text-xs text-rose-200/90 font-medium">
            FECHA DE ÚLTIMA ACTUALIZACIÓN: AGOSTO 2026. <br /><br />
            En cumplimiento a lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (en adelante, la "Ley"), su Reglamento y demás disposiciones aplicables, se emite el presente Aviso de Privacidad para informar sobre el tratamiento de la información recopilada a través de la plataforma VTR.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">1. Identidad del Responsable</h2>
          <p>
            David Gerardo Vital Ovalle, operando bajo las denominaciones comerciales "VTR", "VTR Coaching" y "VTR Vital Trainer" (en adelante, el "Responsable"), es el único responsable del uso, tratamiento, almacenamiento y protección de sus datos personales recabados a través de la presente aplicación web (la "Plataforma").
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">2. Datos Personales Sometidos a Tratamiento</h2>
          <p>
            Para la prestación de los servicios de gestión de entrenamiento, el Responsable recabará y tratará las siguientes categorías de datos personales:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>Datos de Identificación y Contacto:</strong> Nombre, identificadores de usuario (UID) y dirección de correo electrónico.</li>
            <li><strong>Datos Físicos y Biométricos (Datos Sensibles):</strong> Historial de entrenamiento, volumen de carga, pesos levantados, medidas corporales y, de forma prospectiva, información nutricional, conteo de macronutrientes/calorías y métricas de calidad de sueño. <em>Debido a la naturaleza de esta información de salud, se le otorgará una protección de alta seguridad.</em></li>
            <li><strong>Datos de Navegación y Dispositivo:</strong> Dirección IP, tipo de navegador, datos de sesión y comportamiento dentro de la interfaz.</li>
            <li><strong>Datos Financieros (Implementación Futura):</strong> En caso de activarse servicios de suscripción o roles <i>Premium</i>, los datos bancarios serán procesados EXCLUSIVAMENTE por entidades financieras de terceros (ej. Stripe, MercadoPago) bajo la normativa PCI-DSS. El Responsable NO almacenará datos de tarjetas de crédito o débito en sus propios servidores.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">3. Finalidades del Tratamiento</h2>
          <p>
            Sus datos personales serán utilizados para las siguientes finalidades primarias (estrictamente necesarias para el servicio):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Creación, gestión, mantenimiento y autenticación de su cuenta de Usuario.</li>
            <li>Almacenamiento cronológico de su bitácora de entrenamiento de alta intensidad.</li>
            <li>Análisis estadístico de su progreso mediante el motor interno de la Plataforma.</li>
            <li>Generación de rutinas dinámicas asistidas por Inteligencia Artificial (VIPER).</li>
          </ul>
        </section>

        <section className="space-y-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
          <h2 className="text-rose-500 font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">4. Transferencia de Datos, IA y Nube</h2>
          <p className="font-bold text-white">4.1. Almacenamiento en el Extranjero (Google Cloud / Firebase):</p>
          <p>
            Usted consiente expresamente que sus datos (incluyendo Datos Sensibles) sean transferidos, procesados y almacenados en servidores ubicados en los Estados Unidos de América (región <code>us-central1</code> u otras aplicables) a través de la infraestructura de <strong>Google Firebase</strong> y <strong>Google Cloud Platform</strong>, quienes actúan como Entidades Encargadas cumpliendo con certificaciones globales de seguridad (ISO 27001).
          </p>
          <p className="font-bold text-white mt-4">4.2. Procesamiento mediante Inteligencia Artificial:</p>
          <p>
            Para el funcionamiento del asistente virtual "VIPER", ciertos fragmentos de sus datos (anonimizados en la medida de lo posible) podrán ser enviados a través de APIs de proveedores de Inteligencia Artificial de terceros para la generación algorítmica de sugerencias de entrenamiento. Al usar VIPER, usted autoriza este flujo de información.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">5. Uso de Cookies y Persistencia de Sesión</h2>
          <p>
            La Plataforma utiliza tecnologías de almacenamiento local (<code>localStorage</code>, <code>browserLocalPersistence</code>, <code>browserSessionPersistence</code>) y cookies técnicas esenciales para mantener su sesión activa, evitar el reingreso continuo de credenciales y optimizar los tiempos de carga en navegadores web y dispositivos móviles iOS/Android. Usted puede deshabilitar estas tecnologías desde la configuración de su navegador, aunque esto degradará significativamente la experiencia de uso de la Plataforma.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">6. Medidas de Seguridad de la Información</h2>
          <p>
            El Responsable emplea reglas de seguridad de Firestore (Firebase Security Rules) y protocolos de encriptación SSL/TLS para asegurar que los datos en tránsito y en reposo se mantengan confidenciales. Se implementan barreras a nivel código para que ninguna persona (incluyendo otros usuarios) pueda acceder a su bitácora o perfil de entrenamiento sin la debida autenticación por token (UID).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">7. Ejercicio de Derechos ARCO</h2>
          <p>
            Usted tiene derecho en todo momento a ejercer sus derechos ARCO: <strong>A</strong>cceder a sus datos, <strong>R</strong>ectificarlos si son inexactos, <strong>C</strong>ancelarlos (eliminar su cuenta y base de datos permanentemente) u <strong>O</strong>ponerse a su tratamiento para fines específicos. Para ejercer cualquiera de estos derechos, deberá enviar una solicitud formal, acompañada de un documento de identificación oficial, al correo electrónico de soporte técnico:
          </p>
          <div className="mt-4 p-4 bg-black/50 border border-white/5 rounded-lg flex items-center justify-center">
            <span className="text-rose-500 font-bold tracking-wider">soporte@vtr.app</span>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">8. Modificaciones al Aviso de Privacidad</h2>
          <p>
            El Responsable se reserva el derecho de efectuar en cualquier momento modificaciones o actualizaciones al presente Aviso de Privacidad, para la atención de novedades legislativas, jurisprudenciales, políticas internas o la incorporación de nuevas funciones tecnológicas (incluyendo servicios de pago y nutrición). Cualquier cambio será notificado a través de la misma Plataforma.
          </p>
        </section>

        <div className="pt-10 pb-6 border-t border-white/10 flex flex-col items-center justify-center text-center gap-2">
          <img src="/logo_coach.png" alt="VTR Logo" className="w-10 h-10 opacity-50 grayscale" />
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
            © {new Date().getFullYear()} VTR Coaching | David Gerardo Vital Ovalle
          </p>
        </div>

      </div>
    </main>
  );
}