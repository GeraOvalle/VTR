import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

if (!apiKey) {
  console.error("SISTEMA: Falta la llave de API de Gemini.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const IA_MODEL = genAI.getGenerativeModel({ 
  model: "gemini-3.6-flash", 
});