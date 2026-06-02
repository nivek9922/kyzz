# KYZZ - Luxury Minimal Ecommerce

## Arquitectura del Sistema

KYZZ es un ecommerce fashion premium enfocado exclusivamente en ropa femenina, con experiencia minimalista, elegante y moderna.

El proyecto está siendo migrado y refactorizado desde una base existente hacia una nueva identidad de marca KYZZ.

El objetivo NO es crear desde cero, sino modernizar, reorganizar y optimizar el proyecto actual manteniendo compatibilidad con la arquitectura existente.

---

# Stack Tecnológico

## Frontend

- Framework: Next.js 16 (App Router, Turbopack)
- React: 19.2
- Lenguaje: TypeScript strict
- Estilos: TailwindCSS + SCSS Modules
- UI: Diseño custom KYZZ
- Animaciones: CSS transitions + Tailwind (NO se usa Framer Motion)
- Estado: Server Actions + React hooks
- Forms: React Hook Form + Zod
- Testing: Vitest + React Testing Library

## Backend

- Node.js
- API Routes / Server Actions
- PostgreSQL
- Prisma ORM
- Auth integrada
- Upload de imágenes
- Pasarela de pagos (futuro)

---

# Identidad Visual KYZZ

## Concepto

Marca femenina premium minimalista.

Inspiración:
- Zara
- Massimo Dutti
- Jacquemus
- COS
- Nude Project (minimal side)

---

# Estilo Visual

## Diseño

- Minimalismo elegante
- Mucho espacio en blanco
- Layout limpio
- Experiencia premium
- Nada recargado
- Nada “admin genérico”
- Nada estilo dashboard bootstrap

## Colores

- Beige
- Nude
- Brown
- Ivory
- Soft pink
- Neutral tones

## Tipografía

- Serif elegante para títulos
- Sans minimal para contenido

## UX

Todo debe sentirse:
- suave
- premium
- editorial
- moderno
- responsive
- elegante

---

# Arquitectura Frontend

## Reglas IMPORTANTES

- NO romper arquitectura existente
- Reutilizar componentes existentes cuando sea posible
- Mantener App Router
- Mantener Server Components cuando tenga sentido
- Evitar lógica duplicada
- Mantener separación clara:
  - ui
  - services
  - actions
  - repositories
  - hooks

---

# Catálogo y Negocio

## Categorías oficiales

- jeans
- blusas
- enterizos
- chaquetas

NO usar:
- men
- unisex
- women

La tienda es SOLO femenina.

---

# Colecciones

## Colección Especial

Productos destacados curados manualmente.

### Reglas

- Homepage:
  mostrar SOLO 3 productos destacados

- Página:
  /coleccion/especial
  mostrar TODOS los destacados

- Admin:
  permitir marcar/desmarcar producto destacado

---

## Colecciones normales

Ruta:
- /colecciones

Debe mostrar:
- todos los productos NO destacados

---

# Navegación

## Navbar principal

Debe incluir:
- Colecciones
- Categorías
- Contacto

## Categorías

Dropdown elegante:
- Jeans
- Blusas
- Enterizos
- Chaquetas

---

# Sidebar Usuario

Mantener sidebar lateral elegante KYZZ.

Debe incluir:
- Mi perfil
- Mis pedidos
- Cerrar sesión

NO incluir categorías ahí.

---

# Panel Administrativo

## Objetivo

Debe sentirse como parte de KYZZ.

NO:
- tablas genéricas feas
- bootstrap admin
- interfaces técnicas

SÍ:
- minimalismo premium
- diseño limpio
- consistencia visual

---

# Funcionalidades Admin

## Productos

Debe permitir:
- crear
- editar
- eliminar
- marcar destacados
- asignar categoría
- manejar inventario
- manejar tallas
- subir imágenes

## Usuarios

Debe permitir:
- listar
- editar rol
- eliminar

## Pedidos

Debe permitir:
- listar
- ver detalle
- cambiar estado

---

# Feedback UX (MUY IMPORTANTE)

La aplicación SIEMPRE debe informar al usuario:

- loading
- success
- error

## PROHIBIDO

- alert()
- mensajes nativos navegador
- silencios

## Usar

Sistema global de toasts KYZZ:
- elegante
- minimalista
- animado
- consistente

---

# Manejo de errores

Todos los async flows deben tener:

- try/catch
- loading state
- success state
- error state

---

# Seguridad

Prioridad alta.

## Revisar constantemente

- vulnerabilidades
- auth
- exposición de datos
- validaciones
- sanitización
- uploads
- pasarela de pagos
- server actions

## Nunca

- exponer secrets
- confiar en frontend
- usar lógica insegura

---

# Performance

## Prioridades

- Optimización imágenes
- Lazy loading
- Evitar renders innecesarios
- Buen SEO
- Server Components cuando aplique
- Optimización Lighthouse

---

# Convenciones

## Naming

- camelCase → TS/JS
- kebab-case → rutas
- PascalCase → componentes

---

# Reglas de Desarrollo

## Antes de modificar algo

Claude debe:
1. entender arquitectura existente
2. reutilizar antes de crear
3. mantener consistencia visual KYZZ
4. evitar duplicación
5. mantener tipado estricto

---

# Filosofía del Proyecto

KYZZ NO es una tienda genérica.

Debe sentirse:
- premium
- limpia
- femenina
- moderna
- editorial
- aspiracional

Cada implementación nueva debe respetar completamente esta identidad.