"use client";

import { ArrowLeft, FileText, AlertOctagon, Scale } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function PagetTU({ onBack }: Props) {
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
          <Scale className="w-5 h-5 text-rose-500" />
          <h1 className="text-lg font-black uppercase tracking-widest text-white">Términos y Condiciones Generales de Uso</h1>
        </div>
      </div>

      {/* Contenedor con Scroll para el texto */}
      <div className="flex-1 overflow-y-auto pr-3 pb-12 space-y-8 text-sm text-zinc-300 relative z-10 custom-scrollbar text-justify leading-relaxed">
        
        <div className="bg-rose-950/20 border border-rose-500/50 rounded-lg p-5 mb-6 shadow-[0_0_15px_rgba(159,18,57,0.1)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="w-5 h-5 text-rose-500" />
            <p className="text-rose-400 font-black uppercase tracking-widest text-xs">Aviso Legal Vinculante</p>
          </div>
          <p className="text-xs text-rose-200/90 font-medium">
            FECHA DE ÚLTIMA ACTUALIZACIÓN: AGOSTO 2026. <br /><br />
            El presente documento constituye un contrato legalmente vinculante entre usted (en adelante, el "Usuario", "Cliente" o "Atleta") y David Gerardo Vital Ovalle, operando bajo la marca comercial VTR, VTR Vital Trainer y VTR Coaching (en adelante, el "Titular"). Al acceder, navegar, registrarse o utilizar de cualquier forma la aplicación web (la "Plataforma"), usted reconoce haber leído, comprendido y aceptado someterse íntegramente a los presentes Términos y Condiciones. 
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">1. Naturaleza y Objeto del Servicio</h2>
          <p>
            1.1. La Plataforma VTR es un software de servicio (SaaS) diseñado como una bitácora electrónica y sistema de gestión de datos orientado al entrenamiento físico y la salud. Sus funcionalidades incluyen, de manera limitativa, el registro de variables de entrenamiento (volumen, intensidad, carga, series, repeticiones), metodologías de esfuerzo (tales como <i>Top Sets</i>, <i>Rest-Pause</i>, <i>Heavy Duty</i>, entrenamiento al fallo muscular), y métricas de progreso corporal.
          </p>
          <p>
            1.2. <strong>Futuras Implementaciones:</strong> Usted reconoce y acepta que la Plataforma se encuentra en constante evolución. El Titular se reserva el derecho de integrar, modificar o retirar funcionalidades en el futuro, incluyendo módulos de estimación de requerimientos calóricos, distribución de macronutrientes, registro de calidad del sueño, y asignación de roles operativos (tales como <i>Clásico Plus</i> y <i>Entrenador</i>).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">2. Elegibilidad y Capacidad Legal</h2>
          <p>
            2.1. El uso de la Plataforma está estrictamente limitado a personas físicas mayores de dieciocho (18) años de edad que posean plena capacidad legal para celebrar contratos vinculantes según la legislación vigente en los Estados Unidos Mexicanos.
          </p>
          <p>
            2.2. Si usted utiliza la Plataforma en representación de un tercero o entidad, declara y garantiza contar con el mandato expreso y facultades legales suficientes para vincular a dicho tercero a los presentes Términos.
          </p>
        </section>

        <section className="space-y-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
          <h2 className="text-rose-500 font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">3. Exoneración Absoluta de Responsabilidad Médica y Física</h2>
          <p className="font-bold text-white">
            3.1. AUSENCIA DE CONSEJO CLÍNICO:
          </p>
          <p>
            El Titular, los desarrolladores de la Plataforma y el sistema algorítmico asociado NO PROPORCIONAN diagnósticos médicos, prescripciones clínicas, terapias de rehabilitación ni consejos de salud profesionales. Toda información, rutina, cálculo calórico, distribución de macronutrientes o recomendación de hipertrofia/fuerza generada o albergada en la Plataforma tiene un fin <strong>ESTRICTAMENTE INFORMATIVO, REFERENCIAL Y EXPERIMENTAL</strong>.
          </p>
          <p className="font-bold text-white mt-4">
            3.2. ASUNCIÓN DEL RIESGO FÍSICO:
          </p>
          <p>
            El Usuario comprende explícitamente que la práctica deportiva, la alteración de hábitos nutricionales y, en especial, el entrenamiento de fuerza de alta intensidad (llegar al fallo muscular, sobrecarga progresiva, levantamiento de cargas submáximas y máximas) conllevan <strong>RIESGOS INHERENTES, GRAVES E IMPREVISIBLES</strong>, que incluyen pero no se limitan a: desgarros musculares, lesiones articulares, hernias, rabdomiólisis, alteraciones cardiovasculares, infartos, descompensaciones metabólicas graves o, en casos extremos, la muerte.
          </p>
          <p>
            <strong>AL UTILIZAR ESTA PLATAFORMA, EL USUARIO ASUME EL 100% DE DICHOS RIESGOS DE MANERA VOLUNTARIA E IRREVOCABLE.</strong>
          </p>
          <p className="font-bold text-white mt-4">
            3.3. LIBERACIÓN DE RESPONSABILIDAD JURÍDICA:
          </p>
          <p>
            El Usuario renuncia formalmente a iniciar cualquier acción legal, demanda, reclamación por daños y perjuicios (directos, indirectos, lucro cesante o daño moral), querella o procedimiento administrativo en contra de David Gerardo Vital Ovalle, VTR, sus afiliados, socios o proveedores tecnológicos, derivado de cualquier lesión física, enfermedad, deterioro de la salud o daño patrimonial que resulte de la ejecución de rutinas, dietas o métricas gestionadas en la Plataforma. Es obligación ineludible del Usuario contar con la autorización de un médico titulado antes de iniciar cualquier protocolo de entrenamiento o nutrición sugerido directa o indirectamente en este software.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">4. Inteligencia Artificial y Sistemas Automatizados (VIPER)</h2>
          <p>
            4.1. La Plataforma puede integrar motores de Inteligencia Artificial Generativa y algoritmos predictivos (referidos internamente como "VIPER") para la asistencia en la programación de entrenamientos, sugerencias de volumen y futuros cálculos de macronutrientes.
          </p>
          <p>
            4.2. <strong>Riesgo de "Alucinación" de IA:</strong> El Usuario comprende que la Inteligencia Artificial no es infalible. Los resultados generados pueden ser técnica, biomecánica o biológicamente inexactos, peligrosos o inapropiados para la condición específica del Usuario. Es responsabilidad exclusiva del Usuario validar cualquier output algorítmico mediante el sentido común, la experiencia propia y la consulta con un profesional del deporte y/o nutrición certificado.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">5. Uso de la Cuenta, Roles y Seguridad</h2>
          <p>
            5.1. <strong>Confidencialidad:</strong> El acceso a la Plataforma se realiza mediante credenciales unívocas (correo y contraseña). El Usuario es el único responsable de salvaguardar estas credenciales. Cualquier acción ejecutada bajo su cuenta será legalmente imputable a su persona.
          </p>
          <p>
            5.2. <strong>Estructura de Roles:</strong> El Titular se reserva el derecho de categorizar a los Usuarios en diversos perfiles (ej. Clásico, Clásico Plus, Entrenador). Estos roles determinan los privilegios de acceso dentro de la base de datos y la interfaz. El Titular puede revocar, modificar o reclasificar estos roles en cualquier momento y sin previo aviso, especialmente durante las fases de auditoría o mantenimiento del sistema.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">6. Fase de Pruebas (Beta) y Disponibilidad del Software</h2>
          <p>
            6.1. <strong>Software "AS-IS":</strong> La Plataforma se encuentra actualmente en Fase Beta (desarrollo activo). Se proporciona en el estado en que se encuentra ("AS-IS") y según disponibilidad ("AS-AVAILABLE"), sin garantías expresas o implícitas de idoneidad, comerciabilidad o ausencia de errores de código (<i>bugs</i>).
          </p>
          <p>
            6.2. <strong>Pérdida de Datos:</strong> El Titular no asume responsabilidad alguna por la pérdida accidental de bases de datos, borrado de rutinas, métricas o perfiles derivado de fallas en los servidores de alojamiento (incluyendo Firebase/Google Cloud), actualizaciones del sistema, cierres de sesión de emergencia (<i>Kill Switches</i>), o cualquier caso fortuito o de fuerza mayor. El Usuario es responsable de mantener un respaldo físico o externo de sus métricas si así lo considera necesario.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">7. Disposiciones sobre Futuros Pagos y Suscripciones</h2>
          <p>
            7.1. Aunque la Plataforma pueda ofrecerse de manera gratuita en su fase inicial, el Titular se reserva el derecho irrestricto de implementar muros de pago (<i>paywalls</i>), pasarelas de cobro (ej. Stripe, MercadoPago), y modelos de suscripción para acceder a roles premium (ej. Clásico Plus, Entrenador) u otras herramientas avanzadas.
          </p>
          <p>
            7.2. <strong>Condiciones Futuras de Pago:</strong> En el momento de implementarse integraciones financieras, todo cargo será definitivo y no reembolsable, salvo que la ley exija lo contrario. El Titular no almacenará datos sensibles de tarjetas de crédito, delegando dicha responsabilidad fiduciaria y de cifrado a procesadores de pago de terceros.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">8. Propiedad Intelectual e Industrial</h2>
          <p>
            8.1. Todos los derechos de propiedad intelectual sobre el código fuente, código objeto, diseño de interfaz (UI/UX), logotipos (incluyendo la isotipia de "VTR"), paletas de colores institucionales, nombres comerciales, textos, algoritmos, y bases de datos son propiedad exclusiva de David Gerardo Vital Ovalle.
          </p>
          <p>
            8.2. <strong>Prohibición Estricta:</strong> Queda determinantemente prohibida la reproducción, distribución, ingeniería inversa, descompilación, extracción de datos (<i>web scraping</i>), o comercialización del software de la Plataforma sin el consentimiento previo, expreso y por escrito del Titular.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">9. Limitación General de Responsabilidad</h2>
          <p>
            En la máxima medida permitida por la ley aplicable, la responsabilidad total, acumulada y máxima del Titular frente al Usuario por cualquier causa de acción (sea contractual, extracontractual, por negligencia o responsabilidad estricta) no excederá en ningún caso la cantidad monetaria que el Usuario haya pagado directamente al Titular por el uso de la Plataforma durante los doce (12) meses previos al evento que originó el reclamo, o la cantidad de $100.00 MXN (Cien Pesos Mexicanos), lo que resulte menor.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-white font-black uppercase tracking-widest text-sm border-l-4 border-rose-500 pl-3">10. Jurisdicción y Legislación Aplicable</h2>
          <p>
            10.1. El presente contrato se rige e interpreta de conformidad con las Leyes Federales de los Estados Unidos Mexicanos y la normativa vigente en el Estado de Chihuahua.
          </p>
          <p>
            10.2. Para la resolución de cualquier controversia, litigio, disputa o reclamación que surja del uso de la Plataforma o la interpretación de estos Términos, el Usuario y el Titular se someten expresamente a la jurisdicción exclusiva de los tribunales competentes con sede en Ciudad Juárez, Chihuahua, México, renunciando expresa e irrevocablemente a cualquier otro fuero que pudiera corresponderles por razón de su domicilio presente, futuro o por cualquier otra causa.
          </p>
        </section>

        <div className="pt-10 pb-6 border-t border-white/10 flex flex-col items-center justify-center text-center gap-2">
          <img src="/logo_coach.png" alt="VTR Logo" className="w-10 h-10 opacity-50 grayscale" />
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
            © {new Date().getFullYear()} VTR Coaching | David Gerardo Vital Ovalle
            <br />Todos los derechos reservados a nivel global.
          </p>
        </div>

      </div>
    </main>
  );
}