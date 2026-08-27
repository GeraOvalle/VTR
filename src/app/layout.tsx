import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// IMPORTAMOS LOS CONTEXTOS GLOBALES
import { RestTimerProvider } from "./context/resttimercontext"; 
import { SyncProvider } from "./context/synccontext"; 
import { WorkoutProvider } from "./context/workoutcontext";
import { NotificacionesProvider } from "./context/notificacionescontext";

// 🔴 IMPORTAMOS EL TRAY (Interfaz visual de notificaciones)
import NotificacionesTray from "./modules/notificaciones/notificacionestray";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VTR",
  description: "Plataforma de entrenamiento inteligente",
  appleWebApp: {
    title: "VTR",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-white">
        
        {/* 1. EL RELOJ ES EL PADRE ABSOLUTO (No depende de internet) */}
        <RestTimerProvider> 
          
          {/* 2. EL MOTOR DE SINCRONIZACIÓN (Vigila la red y el caché global) */}
          <SyncProvider>
            
            {/* 3. SISTEMA GLOBAL DE NOTIFICACIONES */}
            <NotificacionesProvider>
              
              {/* 🔴 Inyectamos el Tray visual para que exista en toda la app */}
              <NotificacionesTray />

              {/* 4. EL CEREBRO DE RUTINAS */}
              <WorkoutProvider>
                {children}
              </WorkoutProvider>

            </NotificacionesProvider>

          </SyncProvider>
          
        </RestTimerProvider>

      </body>
    </html>
  );
}