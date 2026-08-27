"use client";

import { useEffect } from "react";

export default function GestureShield() {
  useEffect(() => {
    // 1. Bloquea el "efecto liga" y el gesto de deslizar nativo en navegadores móviles
    document.body.style.overscrollBehavior = 'none';

    // 2. Trampa de historial para evitar que la app se cierre abruptamente
    const trapHistory = () => {
      window.history.pushState({ noExit: true }, "");
    };

    trapHistory(); // Empujamos un estado falso al entrar

    const handlePopState = (e: PopStateEvent) => {
      // El usuario hizo el gesto de "atrás" en su celular.
      // En lugar de que la app se cierre, volvemos a poner la trampa.
      trapHistory();
      
      // Emitimos un evento global para que tus otros módulos puedan escucharlo
      // y reaccionar (ej. cerrar un pop-up o regresar al login)
      window.dispatchEvent(new Event("hardware-back-press"));
    };

    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  return null; // Este componente es invisible, solo ejecuta código en segundo plano
}