import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

if (!apiKey) {
  console.error("SISTEMA: Falta la llave de API de Gemini.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Usamos el alias "latest" recomendado para que siempre apunte al modelo activo de tu cuenta
export const IA_MODEL = genAI.getGenerativeModel({ 
  model: "gemini-flash-latest", 
});