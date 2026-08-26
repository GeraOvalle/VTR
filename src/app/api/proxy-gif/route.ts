import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Extraemos los parámetros de la URL que nos manda el frontend
  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get('exerciseId');
  const apiKey = searchParams.get('apiKey');

  if (!exerciseId || !apiKey) {
    return new NextResponse('Faltan parámetros', { status: 400 });
  }

  // URL real de RapidAPI
  const targetUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=360`;

  try {
    // El servidor de Next.js hace la petición (Los servidores no tienen bloqueo CORS)
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "exercisedb.p.rapidapi.com",
        "x-rapidapi-key": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error de RapidAPI: ${response.status}`);
    }

    // Convertimos la respuesta en un ArrayBuffer (Archivo Binario puro)
    const buffer = await response.arrayBuffer();

    // Se lo enviamos de regreso al frontend de forma segura saltando el CORS
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error) {
    console.error("Error en proxy:", error);
    return new NextResponse('Error al descargar imagen', { status: 500 });
  }
}