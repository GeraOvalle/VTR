"use client";

import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip, YAxis } from 'recharts';

interface GraficaBaseProps {
  data: any[];
  dataKey: string;
  color: string;
  tipo: 'area' | 'barra';
  unidad: string;
  rango?: '7dias' | '1mes' | '3meses' | '6meses' | '1ano' | 'historico';
}

export default function GraficaBase({ data, dataKey, color, tipo, unidad, rango = 'historico' }: GraficaBaseProps) {
  
  const validData = data
    .filter(d => d[dataKey] !== undefined && d[dataKey] !== null && d[dataKey] !== "")
    .map((d, index) => {
      let dateObj = new Date();
      if (d.fecha && d.fecha.includes('-')) {
        const [y, m, dNum] = d.fecha.split('-');
        dateObj = new Date(Number(y), Number(m) - 1, Number(dNum));
      } else {
        dateObj = new Date();
        dateObj.setHours(dateObj.getHours() - (10 - index)); 
      }
      return {
        ...d,
        [dataKey]: parseFloat(d[dataKey]),
        dateObj
      };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  let chartData: any[] = [];
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  const agruparPorSemanas = (totalSemanas: number) => {
    const semanas = [];
    for (let i = totalSemanas - 1; i >= 0; i--) {
      const fin = new Date(hoy);
      fin.setDate(hoy.getDate() - (i * 7));
      const inicio = new Date(fin);
      inicio.setDate(fin.getDate() - 7);

      const chunk = validData.filter(d => d.dateObj > inicio && d.dateObj <= fin);
      if (chunk.length > 0) {
        const promedio = chunk.reduce((acc, curr) => acc + curr[dataKey], 0) / chunk.length;
        semanas.push({
          fecha: i === 0 ? 'Sem Actual' : `Sem -${i}`,
          [dataKey]: Number(promedio.toFixed(2))
        });
      }
    }
    return semanas;
  };

  const agruparPorMeses = (totalMeses: number) => {
    const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const meses = [];
    for (let i = totalMeses - 1; i >= 0; i--) {
      const targetMonth = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const m = targetMonth.getMonth();
      const y = targetMonth.getFullYear();

      const chunk = validData.filter(d => d.dateObj.getMonth() === m && d.dateObj.getFullYear() === y);
      if (chunk.length > 0) {
        const promedio = chunk.reduce((acc, curr) => acc + curr[dataKey], 0) / chunk.length;
        meses.push({
          fecha: `${nombresMeses[m]} '${y.toString().slice(-2)}`,
          [dataKey]: Number(promedio.toFixed(2))
        });
      }
    }
    return meses;
  };

  if (rango === '7dias') {
    chartData = validData.slice(-7).map(d => ({ fecha: d.fecha, [dataKey]: d[dataKey] }));
  } else if (rango === '1mes') {
    chartData = agruparPorSemanas(4);
  } else if (rango === '3meses') {
    chartData = agruparPorSemanas(12);
  } else if (rango === '6meses') {
    chartData = agruparPorMeses(6);
  } else if (rango === '1ano') {
    chartData = agruparPorMeses(12);
  } else {
    chartData = validData.map(d => ({ fecha: d.fecha, [dataKey]: d[dataKey] }));
  }

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Sin datos</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-2 rounded-lg shadow-xl z-50">
          <p className="text-[9px] font-black text-white uppercase tracking-widest mb-1">
            {payload[0].payload.fecha}
          </p>
          <p className="text-[11px] font-mono font-bold" style={{ color }}>
            {payload[0].value} {unidad}
          </p>
        </div>
      );
    }
    return null;
  };

  const calcAreaMin = (dataMin: number) => Math.max(0, dataMin - (dataMin * 0.02));
  const calcAreaMax = (dataMax: number) => dataMax + (dataMax * 0.02);
  const calcBarMin = (dataMin: number) => Math.max(0, dataMin - (dataMin * 0.03));
  const calcBarMax = (dataMax: number) => dataMax + (dataMax * 0.03);

  return (
    <div className="w-full h-full absolute inset-0 pt-4 pb-2 px-2 sm:px-4">
      <ResponsiveContainer width="100%" height="100%">
        {tipo === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis domain={[calcAreaMin, calcAreaMax]} hide />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
            
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3} 
              fillOpacity={1} 
              fill={`url(#grad-${dataKey})`} 
              dot={{ r: 4, fill: '#000', stroke: color, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: color, stroke: '#000', strokeWidth: 2 }}
            />
          </AreaChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
            <YAxis domain={[calcBarMin, calcBarMax]} hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={[4, 4, 0, 0]} 
              maxBarSize={30} 
              activeBar={{ stroke: '#ffffff', strokeWidth: 1.5, fill: color }}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}