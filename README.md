# KYZZ Shop

E-commerce de moda femenina con estética minimalista y premium.  
Stack: **Next.js 15 · React 19 · TypeScript · Prisma · PostgreSQL · NextAuth v5 · Zustand · PayPal · Cloudinary · Resend · Tailwind CSS**

---

## Requisitos previos

- Node.js **20 LTS** (recomendado)
- Docker + Docker Compose (para la base de datos local)
- Cuentas en: [PayPal Developer](https://developer.paypal.com/), [Cloudinary](https://cloudinary.com/), [Resend](https://resend.com/) y opcionalmente [Google Cloud Console](https://console.cloud.google.com/)

---

## Correr en desarrollo

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd kyzz

# 2. Copiar variables de entorno y completarlas
cp .env.example .env
# → Editar .env con tus credenciales reales (ver sección Variables de entorno)

# 3. Instalar dependencias
npm install

# 4. Levantar la base de datos PostgreSQL (puerto 5436)
docker compose up -d

# 5. Correr migraciones de Prisma
npx prisma migrate deploy

# 6. Ejecutar seed (datos de ejemplo: productos, categorías, países, usuario admin)
npm run seed

# 7. Correr el proyecto
npm run dev
```

> Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Variables de entorno

Ver [.env.example](.env.example) con descripción detallada de cada variable.

### Variables obligatorias

| Variable | Descripción | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL | Se construye con los valores `DB_*` de abajo |
| `DB_USER` / `DB_NAME` / `DB_PASSWORD` | Usadas por docker-compose | Definir a gusto |
| `AUTH_SECRET` | Secret JWT de NextAuth | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Requerido en producción/Docker | Siempre `true` |
| `NEXTAUTH_URL` / `AUTH_URL` | URL base del sitio | `http://localhost:3000` en dev |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client ID de PayPal (público) | [developer.paypal.com](https://developer.paypal.com/) → Apps & Credentials |
| `PAYPAL_SECRET` | Secret de PayPal (solo servidor) | Misma app de PayPal |
| `PAYPAL_OAUTH_URL` | URL OAuth de PayPal | Sandbox o producción (ver .env.example) |
| `PAYPAL_ORDERS_URL` | URL Orders de PayPal | Sandbox o producción |
| `CLOUDINARY_URL` | URL completa de Cloudinary | [cloudinary.com](https://cloudinary.com/) → Dashboard |

### Variables opcionales

| Variable | Descripción | Cómo obtenerla |
|---|---|---|
| `AUTH_GOOGLE_ID` | Client ID OAuth de Google | [console.cloud.google.com](https://console.cloud.google.com/) → APIs & Services → Credentials |
| `AUTH_GOOGLE_SECRET` | Secret OAuth de Google | Misma credencial de Google |
| `RESEND_API_KEY` | API key de Resend para emails transaccionales | [resend.com/api-keys](https://resend.com/api-keys) |
| `EMAIL_FROM` | Remitente de emails | `onboarding@resend.dev` en dev, dominio verificado en prod |
| `EMAIL_CONTACT` | Correo de destino para mensajes de contacto | Tu email de negocio |
| `NEXT_PUBLIC_GA_ID` | ID de Google Analytics 4 | [analytics.google.com](https://analytics.google.com/) → Flujos de datos |
| `NEXT_PUBLIC_PAYPAL_CURRENCY` | Moneda ISO 4217 | `USD`, `EUR`, `COP`, etc. |

> **Nota Google OAuth:** Las redirect URIs autorizadas deben incluir:
> - Dev: `http://localhost:3000/api/auth/callback/google`
> - Prod: `https://tu-dominio.com/api/auth/callback/google`

---

## Estructura del proyecto

```
src/
├── app/             # App Router (pages, layouts, API routes)
│   ├── (shop)/      # Layout público: home, productos, carrito, checkout, pedidos
│   ├── admin/       # Panel administrativo (requiere rol admin)
│   └── auth/        # Login, registro
├── actions/         # Server Actions (auth, products, orders, payments, admin)
├── components/      # Componentes React (ui, product, auth, paypal, providers)
├── emails/          # Templates de email con React Email
├── store/           # Estado global con Zustand (cart, address, ui)
├── interfaces/      # Tipos TypeScript compartidos
├── lib/             # Prisma client, Resend client
├── config/          # Constantes, fuentes
├── auth.config.ts   # Config Edge-safe de NextAuth (solo para middleware)
├── auth.ts          # Config completa de NextAuth (Node.js runtime)
└── middleware.ts    # Protección de rutas (Edge Runtime)
prisma/
├── schema.prisma    # Modelos de base de datos
└── migrations/      # Historial de migraciones SQL
```

---

## Arquitectura de autenticación

El proyecto usa el patrón recomendado de **NextAuth v5** con separación Edge/Node.js:

- `auth.config.ts` → Solo configuración Edge-safe (sin bcryptjs ni Prisma). Usado por el middleware.
- `auth.ts` → Config completa con Credentials + Google OAuth (usa bcryptjs + Prisma). Usado por Server Actions y Server Components.

---

## Modelos de base de datos

| Modelo | Descripción |
|---|---|
| `User` | Usuario con soporte para credenciales y OAuth (password nullable) |
| `Product` | Producto con tallas, imágenes, categoría, destacado |
| `Category` | Categoría con nombre y slug (jeans, blusas, enterizos, chaquetas) |
| `Order` | Pedido con estado de pago y estado de envío (`ShippingStatus`) |
| `OrderItem` | Línea de pedido (producto + cantidad + talla) |
| `OrderAddress` | Dirección de envío snapshot al momento del pedido |
| `UserAddress` | Dirección guardada del usuario |
| `Country` | Catálogo de países (cargado en seed) |
| `SiteConfig` | Configuración del hero de la página principal |
| `Subscriber` | Suscriptores al newsletter |

---

## Correr en producción

### Vercel (recomendado)

```bash
# 1. Conectar el repositorio a Vercel
# 2. Configurar las variables de entorno en el dashboard de Vercel
# 3. En "Build & Development Settings" → Build Command: npx prisma generate && next build
# 4. Agregar el comando de migración en Vercel (Settings → General → Post-Build Command):
#    npx prisma migrate deploy
```

> Cambiar las URLs de PayPal a producción:
> ```
> PAYPAL_OAUTH_URL=https://api-m.paypal.com/v1/oauth2/token
> PAYPAL_ORDERS_URL=https://api-m.paypal.com/v2/checkout/orders
> ```
> Cambiar `EMAIL_FROM` a tu dominio verificado en Resend: `pedidos@kyzz.com`

### Node.js server (VPS / Railway / Render)

```bash
# Generar el cliente de Prisma y aplicar migraciones
npx prisma generate
npx prisma migrate deploy

# Build de producción
npm run build

# Iniciar servidor
npm start
```

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Iniciar servidor en producción |
| `npm run seed` | Poblar la base de datos con datos de ejemplo |
| `npx prisma studio` | GUI visual para la base de datos |
| `npx prisma migrate deploy` | Aplicar migraciones pendientes (dev y prod) |
| `npx prisma migrate status` | Ver estado de migraciones vs BD actual |

---

## Usuarios por defecto (seed)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@kyzz.co` | `Kyzz2025!` |
| Usuario demo | `cliente@kyzz.co` | `cliente123` |

> **Importante:** Cambiar la contraseña del admin inmediatamente después del primer despliegue desde `/admin/cuenta`.
