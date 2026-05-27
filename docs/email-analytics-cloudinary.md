# PLAN DE PRODUCCIÓN — Correo, Analytics, Cloudinary y Carga Masiva

## Context

KYZZ está a punto de salir a producción real. El código ya está listo; lo que falta es **infraestructura operativa** para que la tienda funcione "de verdad":
- Los emails transaccionales (10 tipos) hoy salen desde `onboarding@resend.dev` (sandbox) → **solo llegan a emails verificados, no a clientas reales**.
- No hay buzón empresarial para *recibir* correos (Resend solo envía).
- Google Analytics usa un ID que debe confirmarse para producción.
- Cloudinary funciona pero conviene revisar plan/credenciales.
- **Falta una forma de cargar productos en lote** — hoy solo se crean uno por uno, inviable para subir 10-20 piezas de una colección.

**Decisiones tomadas con el dueño:**
- Buzón: **Google Workspace** (~$7 USD/mes, con alias gratis para soporte@/hola@/pedidos@).
- Carga masiva: **fotos pre-subidas a Cloudinary + CSV que referencia URLs** (estándar de la industria).
- Productos en lote: **mezcla** de simples y con variantes de color → el CSV soporta ambos.
- Wompi: ya en producción con cuenta personal; cuenta empresarial vendrá después (sin acción ahora).

**Resultado esperado:** que solo quede subir productos reales (fotos + datos) y empezar a vender.

---

## Part A — Correo empresarial (Google Workspace + Resend)

**Concepto clave:** son dos cosas distintas y ambas necesarias.
- **Resend** = *enviar* los emails automáticos de la app (confirmaciones, envíos, devoluciones, etc.).
- **Google Workspace** = el *buzón* donde recibes y respondes correos de clientas (soporte@, hola@).

### A.1 — Comprar el dominio (si no lo tienes)
1. Compra `kyzz.co` (o el que elijas) en Namecheap / GoDaddy / Google Domains.
   - `.co` colombiano: ~$30 USD/año · `.com`: ~$12 USD/año.
2. Apunta el dominio a Vercel (registros A/CNAME que te da Vercel en el proyecto → Settings → Domains).

### A.2 — Configurar Google Workspace (recibir + responder)
1. Ve a `workspace.google.com` → "Empezar".
2. Verifica la propiedad del dominio (agrega un registro TXT en tu proveedor de dominio).
3. Crea **un solo usuario de pago** (ej. `kevin@kyzz.co`) — Business Starter ~$7 USD/mes.
4. **Alias gratis** (clave para ahorrar): en Admin → Usuarios → ese usuario → "Agregar alias":
   - `hola@kyzz.co`, `soporte@kyzz.co`, `pedidos@kyzz.co`, `contacto@kyzz.co`
   - Todos llegan al mismo buzón sin costo extra (hasta 30 alias por usuario).
5. Agrega los registros **MX** de Google en tu proveedor de dominio (para recibir correo).

### A.3 — Verificar el dominio en Resend (enviar)
1. En `resend.com` → Domains → Add Domain → `kyzz.co`.
2. Resend te da 3 registros DNS (**SPF**, **DKIM**, **DMARC**) → agrégalos en tu proveedor de dominio.
3. Espera verificación (minutos a horas).
4. Una vez verde, ya puedes enviar desde cualquier `@kyzz.co`.

> ⚠️ SPF/DKIM/DMARC son obligatorios; sin ellos los correos caen en spam o son rechazados.

### A.4 — Actualizar variables de entorno (Vercel)
| Variable | Valor producción | Por qué |
|----------|------------------|---------|
| `EMAIL_FROM` | `KYZZ <pedidos@kyzz.co>` | Remitente de todos los emails automáticos |
| `EMAIL_CONTACT` | `soporte@kyzz.co` | A dónde llega el formulario de contacto |

> Los 10 puntos de envío de la app ya usan estas variables — solo cambiar los valores, sin tocar código.

### A.5 — Costos email
- Google Workspace: **~$7 USD/mes** (1 buzón + alias gratis).
- Resend: **gratis** hasta 3,000 emails/mes (100/día). Suficiente para empezar; $20/mes si creces.

---

## Part B — Google Analytics 4

> Sí, puedes (y conviene) crear GA con el mismo correo de Google Workspace (`kevin@kyzz.co`).

1. Ve a `analytics.google.com` con tu cuenta `@kyzz.co`.
2. Admin → Crear cuenta → nombre "KYZZ".
3. Crea una **propiedad GA4** → zona horaria Colombia, moneda COP.
4. Crea un **flujo de datos web** con tu dominio `https://kyzz.co`.
5. Copia el **Measurement ID** (`G-XXXXXXXXXX`).
6. Ponlo en Vercel como `NEXT_PUBLIC_GA_ID`.

> El código ya inyecta GA solo si la variable existe, y ya trackea 13 eventos (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, etc.). No requiere cambios de código.
> **Tip:** crea una propiedad GA4 *nueva* para producción y deja la actual para pruebas, así no mezclas datos reales con tests.

---

## Part C — Cloudinary

**Veredicto: la cuenta actual sirve para producción tal cual.** No existe un "modo producción" en Cloudinary — la free tier (25 créditos/mes ≈ 25GB almacenamiento + 25GB ancho de banda) cubre de sobra el arranque.

**Acciones recomendadas:**
1. **Credenciales:** confirmar que `CLOUDINARY_URL` está como variable de entorno en Vercel (no en el repo). Ya está fuera del código, solo verificar en el dashboard de Vercel.
2. **Unificar carpeta** (mejora de orden, no bloqueante): hoy hay inconsistencia — `manage-product-color.ts` sube a `kyzz/products` y el seed a `kyzz-products`. Unificar a **`kyzz/products`** en ambos para que todo viva en una carpeta.
3. **Más adelante:** si el volumen crece, crear una cuenta Cloudinary a nombre de la empresa y migrar (opcional, no urgente).

**Costo:** gratis hasta superar 25 créditos/mes.

---

## Part D — Wompi (sin acción ahora)

Ya está en producción con cuenta personal. Solo confirmar en Vercel:
- `WOMPI_BASE_URL = https://production.wompi.co/v1` (no sandbox).
- Llaves `pub_prod_*` / `prv_prod_*` y los secretos de integridad/eventos de producción.

La cuenta empresarial de Wompi se hará después; no requiere cambios de código (solo cambiar las llaves cuando exista).

---

## Part E — Carga masiva de productos (IMPLEMENTACIÓN DE CÓDIGO)

### Objetivo
Subir 10-20 productos de una colección sin crearlos uno por uno, soportando **tanto productos simples como con variantes de color**, de forma profesional (estilo Shopify).

### Flujo de trabajo para el admin (lo que harás tú)
```
1. Tomas las fotos de los productos.
2. Las subes en lote a Cloudinary (Media Library → arrastrar y soltar) en la carpeta kyzz/products,
   usando una convención de nombres: <slug>-<color>-<n>.jpg  (ej. blusa-lino-beige-1.jpg)
3. Llenas un CSV (plantilla descargable) — una fila por variante (color × talla).
   Las URLs de las imágenes se arman solas en la hoja con una fórmula (patrón fijo de Cloudinary).
4. En /admin/products/import: subes el CSV → ves un PREVIEW con validación fila por fila.
5. Si todo está OK → "Confirmar importación" → se crean todos los productos en una transacción.
```

### Formato CSV (una fila por variante, estilo Shopify)
| Columna | Requerido | Notas |
|---------|-----------|-------|
| `handle` | sí | = slug; agrupa las filas de un mismo producto |
| `title` | sí (1ª fila) | solo en la primera fila del handle |
| `description` | sí (1ª fila) | |
| `category` | sí (1ª fila) | slug: jeans/blusas/enterizos/chaquetas |
| `price` | sí (1ª fila) | número COP |
| `tags` | no | separados por `;` (no coma, para no romper CSV) |
| `featured` | no | true/false |
| `color` | no | nombre exacto de la paleta (`Beige`, `Negro carbón`...). **Vacío = producto simple** |
| `size` | sí | XS/S/M/L/XL/XXL/XXXL |
| `stock` | sí | número |
| `sku` | no | único si se da |
| `images` | sí (por color o producto) | URLs de Cloudinary separadas por `|` |

- **Producto simple:** filas con `color` vacío → imágenes van a `ProductImage` (galería general, máx 2).
- **Producto con color:** filas con `color` → imágenes van a `ProductColorImage` por color.
- `inStock` y `sizes` se calculan solos desde las variantes (igual que hoy).

### Arquitectura

**Nuevos archivos:**
1. `src/actions/product/bulk-import-products.ts` — dos funciones:
   - `validateBulkImport(rows)` → *dry-run*: valida y devuelve resumen + errores por fila (NO escribe en BD).
   - `commitBulkImport(rows)` → transacción Prisma que crea todo. Admin-only (`auth()` + `role === 'admin'`).
2. `src/app/(shop)/admin/products/import/page.tsx` — página servidor (gate admin).
3. `src/app/(shop)/admin/products/import/ui/BulkImportClient.tsx` — cliente: input de archivo, parseo CSV en el navegador, tabla de preview con estado por fila, botón confirmar.
4. Plantilla CSV descargable (`public/plantilla-productos.csv`) + instructivo corto.

**Validaciones (en `validateBulkImport`):**
- `category` existe (resolver por slug, como hace el seed).
- `color` existe en `ColorPalette` por nombre (si se da).
- `slug`/handle único (no choca con productos existentes, salvo modo "actualizar").
- `size` ∈ enum `Size`.
- `images` son URLs de **tu** cloud de Cloudinary (`https://res.cloudinary.com/<cloud>/...`) — rechazar URLs externas.
- Máx 2 imágenes para productos simples.
- Combinación `(handle, color, size)` no duplicada en el CSV.

**Lógica de `commitBulkImport`** (reutiliza el patrón ya probado en `src/seed/seed-new-color-products.ts`):
- Agrupa filas por handle.
- Por producto: `product.create` → por color `productColor.create` + `productColorImage.createMany` (URLs directas, **sin** re-subir a Cloudinary) → `productVariant.create` por talla.
- Productos simples: `productImage.createMany` en vez de color.
- Sincroniza `inStock` (suma) y `sizes` (únicas) desde variantes.
- Todo dentro de `prisma.$transaction` → atómico (si algo falla, rollback total).
- `revalidatePath('/admin/products')` + `revalidateTag` por slug.

**Parsing CSV:** usar **`papaparse`** (parseo en el navegador, maneja comillas/comas en descripciones). Se envía JSON estructurado a las server actions → sin subida de archivos pesados, sin límite de 4MB (las imágenes son URLs, strings cortos).

**Reúso de código existente:**
- Patrón de resolución categoría/paleta por nombre y sync de stock → `src/seed/seed-new-color-products.ts`.
- Normalización de slug → `create-update-product.ts:44`.
- Gate admin → mismo patrón `auth()` de las demás actions de producto.

**Decisión de modo:** la v1 hace **solo crear** (rechaza handles existentes). "Actualizar existentes" queda como mejora futura para no arriesgar sobrescrituras accidentales.

### Por qué este enfoque es el profesional
- Es exactamente cómo Shopify hace su *CSV product import*: una fila por variante, imágenes por URL.
- Separar "subir fotos" (Cloudinary) de "subir datos" (CSV) evita timeouts y límites de tamaño.
- El *dry-run* con preview evita crear basura: ves los errores antes de escribir nada.
- La transacción atómica garantiza que nunca quede una colección a medio crear.

---

## Resumen de costos mensuales (arranque)
| Servicio | Costo | Nota |
|----------|-------|------|
| Dominio | ~$2-3 USD/mes | (~$30/año .co) |
| Google Workspace | ~$7 USD/mes | 1 buzón + alias gratis |
| Resend | $0 | hasta 3,000 emails/mes |
| Cloudinary | $0 | free tier 25 créditos |
| Wompi | $0 fijo | cobra por transacción |
| Vercel | $0 | Hobby (o $20 Pro si necesitas) |
| **Total** | **~$10 USD/mes** | + comisión Wompi por venta |

---

## Verificación (end-to-end)

**Emails:**
- Tras configurar DNS, hacer una compra de prueba real → confirmar que llega el email de confirmación a un correo externo (Gmail personal), no solo a verificados.
- Enviar el formulario de contacto → confirmar que llega a `soporte@kyzz.co` y que la auto-respuesta llega al remitente.

**Analytics:**
- Abrir la tienda en producción → en GA4 → Informes → Tiempo real, ver tu propia visita y un `view_item` al abrir un producto.

**Carga masiva:**
- Subir 2-3 fotos a Cloudinary, armar un CSV con 1 producto simple + 1 con color (3 tallas c/u).
- En `/admin/products/import`: cargar CSV → verificar que el preview marca OK y detecta un error a propósito (ej. categoría mal escrita).
- Confirmar → verificar en `/admin/products` que aparecen, con stock y tallas correctos, y que se ven en la tienda con sus imágenes.
- Probar rollback: meter una fila inválida y confirmar que NO se crea nada (atómico).

> Nota: las Parts A-D son configuración externa (no requieren cambios de código salvo los valores de env vars). La Part E es la única que implica escribir código.
