# VisionNav Client

Cliente web de [VisionNav](https://github.com/BrianGomezM/vision-api-object-detection), mi trabajo de grado en la Universidad del Valle. Permite enviar escenas de entornos Web 3D a la API y escuchar la descripción narrativa que genera, pensada para personas con ceguera total.

Versión publicada: [visionnav-client.vercel.app](https://visionnav-client.vercel.app)

## Tecnologías

Next.js con React y TypeScript, Tailwind CSS y componentes de Radix UI. Se despliega en Vercel.

## Correr en local

Necesitas Node.js 18 o superior y la API de VisionNav corriendo.

```bash
pnpm install
cp .env.example .env.local   # ajusta NEXT_PUBLIC_API_URL si la API no está en http://127.0.0.1:8000
pnpm dev
```

La aplicación queda en `http://localhost:3000`.
