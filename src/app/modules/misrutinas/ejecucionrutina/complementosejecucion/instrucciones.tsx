"use client";

import { useState } from "react";
import { Info } from "lucide-react";
// Asegúrate de que la ruta hacia detallesejercicio.tsx sea correcta en tu estructura.
// Generalmente está un nivel arriba si este archivo está en 'complementosejecucion'
import DetallesEjercicio from "../../creacionrutina/detallesejercicio";

interface InstruccionesProps {
  ejercicio: any;
}

export default function InstruccionesButton({ ejercicio }: InstruccionesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all shrink-0 shadow-sm active:scale-95"
        title="Ver instrucciones y técnica"
      >
        <Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <DetallesEjercicio 
          ejercicio={ejercicio}
          onClose={() => setIsOpen(false)}
          // NOTA: NO le pasamos la propiedad "onAdd", así que el modal 
          // ocultará el botón de "Agregar ejercicio" automáticamente.
        />
      )}
    </>
  );
}