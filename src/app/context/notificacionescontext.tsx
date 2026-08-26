"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { marcarNotificacionLeida, eliminarNotificacion } from "../lib/notificaciones";

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  fecha: any;
  dataExtra?: any;
}

interface NotificacionesContextType {
  notificaciones: Notificacion[];
  unreadCount: number;
  isTrayOpen: boolean;
  toggleTray: () => void;
  closeTray: () => void;
  marcarLeida: (id: string) => void;
  borrarNotificacion: (id: string) => void;
}

const NotificacionesContext = createContext<NotificacionesContextType | undefined>(undefined);

export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
      if (!user) setNotificaciones([]); 
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "notificaciones"),
      orderBy("fecha", "desc")
    );

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notificacion[];
      setNotificaciones(notifs);
    });

    return () => unsubscribeSnapshot();
  }, [userId]);

  const unreadCount = notificaciones.filter(n => !n.leida).length;
  const toggleTray = () => setIsTrayOpen(!isTrayOpen);
  const closeTray = () => setIsTrayOpen(false);

  const marcarLeida = (id: string) => {
    if (userId) marcarNotificacionLeida(userId, id);
  };

  const borrarNotificacion = (id: string) => {
    if (userId) eliminarNotificacion(userId, id);
  };

  return (
    <NotificacionesContext.Provider value={{ 
      notificaciones, unreadCount, isTrayOpen, toggleTray, closeTray, marcarLeida, borrarNotificacion 
    }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export const useNotificaciones = () => {
  const context = useContext(NotificacionesContext);
  if (!context) throw new Error("useNotificaciones debe usarse dentro de NotificacionesProvider");
  return context;
};