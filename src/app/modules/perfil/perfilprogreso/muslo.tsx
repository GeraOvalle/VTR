"use client";
import { useState } from "react";
import GraficaBase from "./graficabase";

type Rango = '7dias' | '1mes' | '3meses' | '6meses' | '1ano' | 'historico';

export default function GraficaMuslo({ data }: { data: any[] }) {
  const [rango, setRango] = useState<Rango>('historico');
  const rangos: { label: string, value: Rango }[] = [{ label: "7D", value: "7dias" }, { label: "1M", value: "1mes" }, { label: "3M", value: "3meses" }, { label: "6M", value: "6meses" }, { label: "1A", value: "1ano" }, { label: "MAX", value: "historico" }];

  return (
    <>
      <div className="absolute top-2 right-2 z-20 flex gap-0.5 bg-black/60 p-1 rounded-md border border-white/5 backdrop-blur-md">
        {rangos.map((r) => (<button key={r.value} onClick={() => setRango(r.value)} className={`text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded transition-colors ${rango === r.value ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{r.label}</button>))}
      </div>
      <GraficaBase data={data} dataKey="muslo" color="#a1a1aa" tipo="barra" unidad="cm" rango={rango} />
    </>
  );
}