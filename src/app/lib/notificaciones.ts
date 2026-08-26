import { db } from "./firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";

// 🔴 Añadimos "rutina_modificada" a los tipos permitidos
export type TipoNotificacion = "invitacion" | "rutina_nueva" | "rutina_modificada" | "sistema" | "mensaje";

export interface DataExtraNotificacion {
  entrenadorId?: string;
  rutinaId?: string;
  clienteId?: string;
  [key: string]: any;
}

export const enviarNotificacion = async (
  uidDestino: string, 
  titulo: string, 
  mensaje: string, 
  tipo: TipoNotificacion, 
  dataExtra: DataExtraNotificacion = {}
) => {
  try {
    const fechaActual = new Date();
    fechaActual.setDate(fechaActual.getDate() + 30);
    
    const notifRef = collection(db, "users", uidDestino, "notificaciones");
    await addDoc(notifRef, {
      titulo,
      mensaje,
      tipo,
      dataExtra,
      leida: false,
      fecha: serverTimestamp(),
      fechaExpiracion: Timestamp.fromDate(fechaActual)
    });
    return true;
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    return false;
  }
};

export const marcarNotificacionLeida = async (uidUsuario: string, notificacionId: string) => {
  try {
    const docRef = doc(db, "users", uidUsuario, "notificaciones", notificacionId);
    await updateDoc(docRef, { leida: true });
  } catch (error) {
    console.error("Error al marcar como leída:", error);
  }
};

export const eliminarNotificacion = async (uidUsuario: string, notificacionId: string) => {
  try {
    const docRef = doc(db, "users", uidUsuario, "notificaciones", notificacionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error al eliminar notificación:", error);
  }
};