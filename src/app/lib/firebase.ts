import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuración de tu proyecto en Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDleqZVfndLRhGfMktM-XaqZgdbKczai4E",
  authDomain: "coaching-867c5.firebaseapp.com",
  projectId: "coaching-867c5",
  storageBucket: "coaching-867c5.firebasestorage.app",
  messagingSenderId: "725131803948",
  appId: "1:725131803948:web:63810621f71c98e6648089",
  measurementId: "G-RTFS5PZE7K"
};

// Inicialización de Firebase (Evita inicializaciones duplicadas en Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportar los módulos tácticos que usaremos
const auth = getAuth(app);
const db = getFirestore(app);

// Inicializar Analytics de forma segura (solo se ejecuta del lado del cliente)
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics };