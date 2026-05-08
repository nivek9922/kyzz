# KYZZ Shop

E-commerce de moda con estética minimalista y luxury accesible.  
Stack: **Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth v5 · Zustand · PayPal · Cloudinary · Tailwind CSS**

---

## Requisitos previos

- Node.js **18 LTS o 20 LTS** (recomendado; el proyecto usa las últimas APIs de Next.js 14)
- Docker + Docker Compose (para la base de datos local)
- Cuentas en: [PayPal Developer](https://developer.paypal.com/) y [Cloudinary](https://cloudinary.com/)

---

## Correr en desarrollo

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd kyzz

# 2. Copiar variables de entorno y completarlas
cp .env.example .env
# → Editar .env con tus credenciales reales

# 3. Instalar dependencias
npm install

# 4. Levantar la base de datos PostgreSQL
docker compose up -d

# 5. Correr migraciones de Prisma
npx prisma migrate dev

# 6. Ejecutar seed (datos de ejemplo)
npm run seed

# 7. Correr el proyecto
npm run dev
```

> Abrir http://localhost:3000 en el navegador.  
> Si hay datos en caché del localStorage de una sesión anterior, limpiarlos desde DevTools → Application → Local Storage.

---

## Variables de entorno

Ver [.env.example](.env.example) con descripción de cada variable.  
Las variables obligatorias son:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `AUTH_SECRET` | Secret para JWT (generar con `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL base del sitio |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client ID de PayPal (público) |
| `PAYPAL_SECRET` | Secret de PayPal (solo servidor) |
| `PAYPAL_OAUTH_URL` | URL OAuth de PayPal (sandbox o producción) |
| `PAYPAL_ORDERS_URL` | URL de Orders de PayPal (sandbox o producción) |
| `CLOUDINARY_URL` | URL completa de Cloudinary |

---

## Estructura del proyecto

```
src/
├── app/             # App Router (pages, layouts, API routes)
├── actions/         # Server Actions (auth, products, orders, payments)
├── components/      # Componentes React (ui, product, products, paypal)
├── store/           # Estado global con Zustand (cart, address, ui)
├── interfaces/      # Tipos TypeScript compartidos
├── lib/             # Instancia de Prisma
├── config/          # Constantes, fuentes
├── auth.config.ts   # Config Edge-safe de NextAuth (solo para middleware)
├── auth.ts          # Config completa de NextAuth (Node.js runtime)
└── middleware.ts    # Protección de rutas (Edge Runtime)
prisma/
├── schema.prisma    # Modelos de base de datos
└── migrations/      # Historial de migraciones
```

---

## Arquitectura de autenticación

El proyecto usa el patrón recomendado de **NextAuth v5** con separación Edge/Node.js:

- `auth.config.ts` → Solo configuración Edge-safe, sin bcryptjs ni Prisma. Usado por el middleware.
- `auth.ts` → Configuración completa con el proveedor Credentials (usa bcryptjs + Prisma). Usado por Server Actions y Server Components.

---

## Correr en producción

### Vercel (recomendado)

```bash
# 1. Conectar el repositorio a Vercel
# 2. Configurar las variables de entorno en el dashboard de Vercel
# 3. Cambiar las URLs de PayPal a producción en las variables de entorno:
#    PAYPAL_OAUTH_URL=https://api-m.paypal.com/v1/oauth2/token
#    PAYPAL_ORDERS_URL=https://api-m.paypal.com/v2/checkout/orders
```

### Node.js server (VPS / AWS / DigitalOcean)

```bash
# Build de producción
npm run build

# Iniciar servidor
npm start
```

> Asegurarse de que `NEXTAUTH_URL` apunte al dominio real de producción.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Iniciar servidor en producción |
| `npm run seed` | Poblar la base de datos con datos de ejemplo |
| `npx prisma studio` | GUI visual para la base de datos |
| `npx prisma migrate dev` | Aplicar nuevas migraciones |
