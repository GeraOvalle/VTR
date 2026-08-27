import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VTR Vital Trainer',
    short_name: 'VTR',
    description: 'Plataforma de entrenamiento inteligente',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/logo_coach.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}