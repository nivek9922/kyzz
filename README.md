# Kyzz Shop

E-commerce construido con Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind CSS, NextAuth v5, Zustand, PayPal y Cloudinary.

## Correr en dev

1. Clonar el repositorio.
2. Crear una copia de `.env.example` y renombrarlo a `.env`. Completar las variables de entorno.
3. Instalar dependencias: `npm install`
4. Levantar la base de datos: `docker compose up -d`
5. Correr las migraciones de Prisma: `npx prisma migrate dev`
6. Ejecutar seed: `npm run seed`
7. Correr el proyecto: `npm run dev`
8. Limpiar el localStorage del navegador.




## Correr en prod