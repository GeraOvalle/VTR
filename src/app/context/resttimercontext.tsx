"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Función para emitir sonido y vibrar
const playAlert = () => {
  if (typeof window !== "undefined") {
    if ('vibrate' in navigator) navigator.vibrate([300, 150, 300]);
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playTone = (time: number, freq: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            osc.start(time);
            osc.stop(time + 0.3);
        };
        playTone(ctx.currentTime, 800);
        playTone(ctx.currentTime + 0.4, 1000);
      }
    } catch (e) {
      console.warn("Audio API no soportada", e);
    }
  }
};

export interface ActiveTimerInfo {
  ejIdx: number;
  sIdx: number;
}

interface RestTimerContextType {
  timeLeft: number;
  totalTime: number;
  running: boolean;
  isExtra: boolean;
  activeTimerInfo: ActiveTimerInfo | null;
  setActiveTimerInfo: (info: ActiveTimerInfo | null) => void;
  startTimer: (total: number, extra: boolean) => void;
  stopTimer: () => void;
  togglePause: () => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [isExtra, setIsExtra] = useState(false);
  const [activeTimerInfo, setActiveTimerInfo] = useState<ActiveTimerInfo | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && running) {
      setRunning(false);
      setActiveTimerInfo(null); // Cierra visualmente el reloj en la rutina al terminar
      playAlert();
    }
    return () => clearInterval(interval);
  }, [running, timeLeft]);

  const startTimer = (total: number, extra: boolean) => {
    setTotalTime(total);
    setTimeLeft(total);
    setIsExtra(extra);
    setRunning(true);
  };

  const stopTimer = () => {
    setRunning(false);
    setTimeLeft(0);
    setTotalTime(0);
    setActiveTimerInfo(null);
  };

  const togglePause = () => setRunning(prev => !prev);

  return (
    <RestTimerContext.Provider value={{ timeLeft, totalTime, running, isExtra, activeTimerInfo, setActiveTimerInfo, startTimer, stopTimer, togglePause }}>
      {children}
    </RestTimerContext.Provider>
  );
}

export const useRestTimer = () => {
  const context = useContext(RestTimerContext);
  if (!context) throw new Error("useRestTimer debe usarse dentro de RestTimerProvider");
  return context;
};