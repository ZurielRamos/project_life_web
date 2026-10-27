# Front

Proyecto [Astro](https://astro.build) con renderizado del lado del servidor (SSR) usando el adaptador de [Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/), listo para desplegar en Vercel.

## Requisitos

- Node.js >= 22

## Comandos

| Comando           | Acción                                                        |
| :---------------- | :------------------------------------------------------------ |
| `npm install`     | Instala las dependencias                                      |
| `npm run dev`     | Inicia el servidor de desarrollo en `localhost:4321`          |
| `npm run build`   | Compila el sitio para Vercel en `./.vercel/output/`           |
| `npm run preview` | Previsualiza la build localmente                              |

## Despliegue en Vercel

El proyecto usa `@astrojs/vercel` con `output: 'server'`, por lo que genera funciones serverless para las rutas SSR.

Opciones de despliegue:

1. **Desde Git (recomendado):** conecta el repositorio en el panel de Vercel. Al detectar Astro, Vercel ejecuta `astro build` automáticamente; no se requiere configuración extra.
2. **Con la CLI:**
   ```bash
   npm i -g vercel
   vercel        # despliegue de previsualización
   vercel --prod # despliegue a producción
   ```

> Si el proyecto está dentro de un monorepo, configura el "Root Directory" del proyecto de Vercel como `front`.

## Estructura

```
front/
├── astro.config.mjs      # output: 'server' + adaptador @astrojs/node
├── public/               # recursos estáticos
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro   # página renderizada en el servidor
│       └── api/
│           └── health.ts # endpoint de API
└── package.json
```

## SSR

El sitio está configurado con `output: 'server'`, por lo que todas las rutas se renderizan en el servidor por defecto. El adaptador `@astrojs/node` en modo `standalone` genera un servidor Node autónomo en `dist/server/entry.mjs`.
