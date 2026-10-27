# KYZZ → plantilla white-label → DEMACHOS · 02 · Hoja de ruta

Estrategia, alcance por niveles, fases con puertas de entrada, criterios de aceptación, riesgos y decisiones pendientes.

> Documentos: [01 · Diagnóstico](01-diagnostico.md) · [02 · Hoja de ruta](02-hoja-de-ruta.md) · [03 · EFFI: viabilidad](03-effi-viabilidad.md)

**Fecha:** 27-10-2026 · **Estado:** propuesta para revisión · **Alcance:** solo planificación, sin cambios de código.

**Niveles de evidencia usados en este documento:**
- **[C-código]**: confirmado leyendo el código, con archivo y línea.
- **[C-doc]**: confirmado en la documentación oficial.
- **[C-runtime]**: reproducido en ejecución. Todavía no hay ningún hallazgo con este nivel.
- **[Indicio]**: fuente secundaria.
- **[H]**: hipótesis que requiere prueba.

---

## 2. Estrategia recomendada (sin cambios en lo esencial)

- **Repo privado de plantilla** con **historial nuevo**, creado a partir de una instantánea etiquetada de KYZZ.
- **KYZZ intacto** salvo el hotfix S1.
- **Cada cliente** es un `git clone` de la plantilla con el remoto `template`, y fusiona releases semver.
- **Regla de oro**: lo propio de cada cliente vive solo en `src/brand/`, `public/brand/`, `prisma/seed/brand/`, las variables de entorno y los flags de módulos.
- **Cambio en v2**: la plantilla v1 contiene **solo el núcleo comercial mínimo más los módulos que necesita DEMACHOS**. Los módulos exclusivos de KYZZ quedan en un *backlog de módulos* y se portan, con tests, cuando un cliente los pague. Así hay menos superficie que migrar (Prisma 7, Better Auth) y antes una primera venta.

---

## 3. Núcleo comercial mínimo, módulos de v1 y backlog

| Núcleo comercial mínimo (plantilla v1, siempre) | Módulos v1 (por flag; los usa DEMACHOS) | Backlog de módulos (existen en KYZZ, fuera de v1) |
|---|---|---|
| Catálogo: categorías en BD, productos, variantes con **SKU**, imágenes, búsqueda, filtros básicos (categoría, precio, disponibilidad, oferta) y orden | Estanterías y destacados en el home | Devoluciones / RMA completo |
| Carrito y checkout como invitado (datos mínimos, §5) | Combos / bundles | Cupones |
| Pedidos con estados, código legible y email de confirmación y cambio de estado | Retiro en tienda | Reseñas · Wishlist · Newsletter |
| Pago en línea (Wompi) y contraentrega | Facetas configurables (p. ej. «uso») | Bot de WhatsApp · Carrito abandonado |
| Inventario con reservas (`stock-ops`) y un puerto de inventario externo (§4) | Conector ERP: adaptador CSV manual y adaptador EFFI según la viabilidad | Pedidos manuales por canal · Analítica avanzada · Paleta de color (moda) |
| Admin: productos, inventario, pedidos y usuarios (roles) | «Avísame» (aviso de disponibilidad) · Formulario mayorista | |
| Auth (Better Auth). Admin obligatorio; cuentas de cliente opcionales | | |
| Páginas legales con consentimiento (Ley 1581), FAQ y contacto | | |
| SEO (metadata, sitemap, JSON-LD Product), rendimiento y seguridad base | | |
| Capa de marca, tests y CI, runbook de despliegue | | |

---

## 4. Inventario: cómo evitar discrepancias entre las reservas de la tienda y EFFI

**Principio**: EFFI es la fuente de verdad del **stock físico** (que también se vende en el punto de venta de Popayán). La tienda solo es dueña de sus **reservas**. Esta decisión está pendiente de confirmar con DEMACHOS (D4); si EFFI no tuviera API de lectura, la tienda pasaría a ser la fuente de verdad con importación CSV.

1. **Snapshot por variante**: `externalStock`, `externalStockAt` (marca de tiempo del dato en EFFI o de la lectura) y `bufferUnits` (stock de seguridad configurable por SKU o categoría).
2. **Disponible para vender (ATS)** = `externalStock − reservasActivasNoReflejadas − bufferUnits`. Lo calcula el servidor en cada consulta de checkout; nunca se toma del cliente ni de `"use cache"`.
3. **Ciclo de una reserva**:
   - *Activa* al crear el pedido (con caducidad para pagos en línea pendientes y para contraentrega sin confirmar, como ya hace `stock-ops`).
   - *Enviada al ERP* cuando el pedido se paga o se confirma y el outbox la entrega a EFFI (`erpAckAt`), o cuando el staff la marca como «registrada en EFFI» si no hay API de escritura.
   - *Reflejada* cuando llega un snapshot con `externalStockAt > erpAckAt`. **Solo entonces deja de descontarse.**
   - Esta marca de agua evita **descontar dos veces** (pedido ya restado en EFFI y además reservado) y **descontar de menos** (reserva liberada antes de que EFFI la procese).
4. **Pedidos cancelados**: si ya se enviaron a EFFI, se envía una anulación por la API o se crea una tarea manual. Si no, se libera la reserva.
5. **Sobreventa** (venta física simultánea): se hace una comprobación final del ATS **antes de crear la transacción Wompi** y de nuevo al recibir el webhook de pago. Si el ATS es menor que 0, el pedido pasa a «requiere confirmación»: alerta al admin, contacto al cliente y reembolso o anulación según la política. El buffer reduce la frecuencia.
6. **Combos**: si EFFI no los maneja como SKU propio, ATS(combo) = mín(⌊ATS(componente) / cantidad⌋) y se reservan los componentes.
7. **Frecuencia**: webhooks si EFFI los ofrece. Si no, sondeo cada N minutos dentro de los límites de uso. Conciliación diaria con informe de diferencias por SKU en el admin.
8. **Caché**: el sync invalida el catálogo con `revalidateTag(tag, 'max')`, porque se ejecuta en un Route Handler y allí `updateTag` no está permitido. Los textos «Disponible» y «Últimas unidades» se renderizan de forma dinámica.
9. **Aceptación** (tests de integración con un ERP simulado):
   - Sin doble descuento en ningún orden de eventos.
   - Un pedido enviado dos veces llega una sola vez (idempotencia).
   - Una sobreventa simulada termina en «requiere confirmación».
   - La conciliación detecta las diferencias.

---

## 5. Datos personales en el checkout (minimización, Ley 1581)

| Dato (diseño) | ¿Necesario? | Decisión propuesta |
|---|---|---|
| Email | Sí (confirmación y comprobante) | Obligatorio |
| Celular | Sí (transportadora y coordinación de contraentrega) | Obligatorio |
| Nombre | Sí (destinatario) | Obligatorio |
| **Cédula / NIT** | **No para vender.** Solo si el cliente pide la factura electrónica a su nombre, o si EFFI, la DIAN o la transportadora la exigen **[H, validar en G-EFFI]** | **Opcional**, con la casilla «Quiero factura a mi nombre». Si no se marca, se factura a consumidor final, según lo que permita EFFI y la normativa (**validar con el contador de DEMACHOS**) |
| Departamento, ciudad y dirección | Solo para envío a domicilio | Solo se piden con «domicilio». Con retiro en tienda, no |
| Barrio | Ayuda a la entrega | Opcional |
| Notas | Opcional | Aviso: «no incluyas datos sensibles» |
| Datos de pago | No | Nunca pasan por el servidor (widget de Wompi) |

Además:
- Casilla de **autorización de tratamiento de datos** con enlace a la política. Es obligatoria y separada de la de **marketing**, que va desmarcada y es opcional.
- Política de retención para pedidos de invitados.
- EFFI y Wompi figuran como **encargados del tratamiento** en la política.
- Banner de consentimiento antes de cargar GA4.
- Los datos mínimos se envían al ERP (solo lo que exija el pedido).

---

## 6. Arquitectura objetivo (resumen)

- **Next 16.4.x**:
  - App Router y Server Components, con `cacheComponents` activado.
  - `"use cache"` y `cacheTag` para el contenido de catálogo, PDP y home. El stock y el precio de checkout se leen de forma dinámica.
  - `updateTag` en las acciones del admin y `revalidateTag(tag, 'max')` en los syncs.
  - `ensureStatic = 'navigation'` solo en las páginas estáticas.
  - `typedRoutes`, `catchError`, `proxy.ts` (auth y CSP) y `next.config.ts`.
  - **Si F3g encuentra bloqueos, se registra un ADR y se mantiene el modelo actual sin bloquear a DEMACHOS.**
- **Capas**:
  - `actions/` (con el helper `action()`, que exige auth, rol y esquema Zod).
  - `lib/<dominio>/` (lógica pura y testeable).
  - `lib/db.ts`.
  - **No** se crean capas de repositorios.
- **Datos (Prisma 7)**:
  - Migraciones consolidadas en una línea base.
  - `Product` con `sku` y `kind` (`simple` | `bundle`).
  - `ProductVariant { sku único, label, attributes Json validado, stock, reserved, externalStock, externalStockAt, bufferUnits }`.
  - `BundleItem`.
  - `Order` con `code`, `deliveryMethod`, `customerDocument?`, `invoiceRequested` y `erpStatus`.
  - Outbox `ErpSyncJob`.
  - Enums neutros, sin `paypal`.
- **Seguridad**:
  - Better Auth con sesiones en BD.
  - Zod en el 100 % de las acciones.
  - Validación central de subidas.
  - Crons y webhooks que fallan en cerrado, con `timingSafeEqual`.
  - CSP sin `unsafe-eval` si Wompi lo permite (**[H] verificar**).
  - Rate limit persistente.
  - Logger único.
- **Rendimiento**: `next/image`, fuentes con subconjunto, iconos SVG, presupuesto de Lighthouse en móvil (LCP < 2,5 s, CLS < 0,1, INP < 200 ms).

---

## 7. Agentes y skills de Claude Code

Sin cambios respecto a v1, salvo que pasan a ser parte de F6 y que la skill `integracion-erp` espera al resultado de G-EFFI.

- **Agentes** (frontmatter válido, cortos, herramientas mínimas): `arquitecto` (en `plan` y solo lectura), `backend`, `frontend`, `seguridad` (solo lectura), `integraciones` y `qa`.
- **Skills**:
  - `nuevo-cliente`, `sync-plantilla` y `checklist-lanzamiento`, las tres con `disable-model-invocation: true`.
  - `aplicar-diseno`.
  - `migracion-prisma`, basada en `stockvek/.claude/skills/migracion`.
  - `cerrar-fase`, basada en `stockvek/cerrar-bloque`.
  - `integracion-erp`.
- **`.claude/settings.json`** con `deny` para leer `.env*`, `prisma migrate reset`, `git push --force` y para hacer build contra la BD de producción.
- Se extraerán a un **plugin privado** cuando haya 2 o más clientes. Los agentes de plugin ignoran `hooks`, `mcpServers` y `permissionMode`.

---

## 8. Crear y personalizar un repo de cliente

1. `git clone` de la plantilla (tag `vX.Y.Z`), con `origin` → `template` y un `origin` nuevo.
2. Ejecutar `/nuevo-cliente`: brand, tokens, fuentes, seeds, flags y `.env`.
3. Crear las cuentas según la matriz de titularidad (§11).
4. CI en verde y despliegue de preview.
5. Actualizaciones mediante `/sync-plantilla`, en un PR con CI.

---

## 9. Fases con puertas de entrada (qué debe resolverse antes de empezar cada una)

### Puertas previas (en paralelo y cuanto antes; no requieren código)

**G-EFFI. Estudio de viabilidad de la API de EFFI** · bloquea el **alcance y el precio del contrato con DEMACHOS**, el diseño final del puerto ERP (F5) y F9.
- **Pasos**:
  1. Solicitar a soporte@effisystems.com, a través de DEMACHOS, la documentación oficial, las credenciales (sandbox o empresa de pruebas, con permisos mínimos), los límites, el costo y el plan requerido.
  2. Con esas credenciales, scripts de prueba **fuera de los repos** (en el scratchpad, sin secretos en el código):
     - Lectura de artículos (SKU, precio, variantes).
     - Lectura de stock por bodega.
     - Lectura de clientes.
     - **Escritura de un pedido o venta de prueba** y su anulación.
     - Avisos o webhooks: eventos, firma y reintentos.
     - Medición de los límites de uso.
  3. Responder las preguntas abiertas:
     - ¿Quién emite la factura DIAN y qué datos exige?
     - ¿Cómo se representan los combos?
     - ¿Usa DEMACHOS el POS de EFFI en la tienda física?
     - ¿Hay idempotencia en la creación de pedidos?
- **Entregable**: `docs/integraciones/effi-viabilidad.md`, con cada capacidad marcada **Probada** (con evidencia sin secretos), **Documentada-no-probada** o **No disponible**, y con un veredicto:
  - 🟢 **Verde**: lectura y escritura por API → sincronización automática.
  - 🟡 **Amarillo**: solo lectura → stock automático y pedidos registrados manualmente con la marca «registrada en EFFI».
  - 🔴 **Rojo**: sin API utilizable → importación y exportación CSV.
- **Estrategia elegida** para el inventario (§4) y su frecuencia.
- **Aceptación**: las 6 preguntas de §1.7 y las de este punto tienen respuesta con fuente oficial o prueba; costos y límites documentados; veredicto aceptado por Kevin y por DEMACHOS.

**G-COM. Comercial y operativo** · bloquea **F7**.
- Contrato firmado con: alcance de R1 (§10), titularidad de cuentas y del código (§11), licencia de uso de la plantilla, costos recurrentes y quién los paga, garantía, soporte y plan de mantenimiento.
- Lista de entradas del cliente con fechas: catálogo con SKU, precios y fotos; políticas de envío, garantía, cambios y pagos; datos de contacto; logo vectorial; cuenta Wompi; dominio.

### Fases

**F0. Hotfix S1 en KYZZ (S)** · *Entrada:* **autorización explícita de Kevin** (aprobar este plan no la incluye).
- **Pasos**:
  1. Reproducir S1 en local, con una cuenta que tenga contraseña y además inicie sesión con Google (que pasa a [C-runtime]).
  2. Cambio mínimo en el callback `jwt`: seleccionar campos explícitos sin `password`. Solo en `src/auth.ts`.
  3. Comprobar H5 (advisories de Next) en modo solo lectura.
- **Aceptación**:
  - `/api/auth/session` sin `password` en ambos flujos.
  - Lint, typecheck y build (sin `migrate deploy`) en verde.
  - **Sin push ni PR hasta que Kevin lo indique.**
  - Cualquier otra acción sobre KYZZ (por ejemplo, subir Next por H5) solo con una decisión aparte.

**F1. Repo de plantilla, línea base (S)** · *Entrada:* nombre del repo (D1) y repo privado creado por Kevin.
- **Pasos**: `git archive` del tag de KYZZ; eliminar las imágenes de Tesla, el código muerto y las credenciales del README; build sin migraciones; CI (typecheck, lint, build); escaneo de licencias npm, fuentes e iconos y `THIRD_PARTY_NOTICES.md`.
- **Aceptación**: CI en verde; la app arranca con el seed demo en Docker; ninguna dependencia de producción con licencia incompatible (GPL, AGPL o sin licencia) sin una decisión documentada.

**F2. Red de tests (M)** · *Entrada:* F1.
- **Pasos**: Vitest (unitarios e integración con Postgres en Docker) y Playwright, con patrones de stockvek. Incluye los tests que **demuestran o descartan H1, H2 y H3**.
- **Aceptación**:
  - Cobertura de al menos el 80 % en `lib/` crítico (stock y pedidos).
  - E2E de humo del checkout como invitado con contraentrega.
  - H1, H2 y H3 clasificadas como confirmadas (y corregidas en F3f) o descartadas.

**F3. Modernización (L), un PR por paso** · *Entrada:* F2 en verde y versiones exactas fijadas (repitiendo la verificación de §1.2 con la documentación de esa versión).
- **Pasos**:
  - **a)** Next 16.4.x + React 19.3.
  - **b)** Prisma 7.
  - **c)** Zod 4.
  - **d)** Tailwind 4.
  - **e)** Better Auth (credenciales, Google sin vinculación automática insegura (H4), roles y sesiones en BD).
  - **f)** Endurecimiento de S2 a S8 y de las H confirmadas.
  - **g)** Cache Components con un ADR.
  - Antes de empezar, **se retiran de la plantilla los módulos del backlog** (§3) para reducir superficie.
- **Aceptación**:
  - Suite en verde tras cada paso.
  - El agente `seguridad` no reporta hallazgos altos.
  - Lighthouse móvil ≥ 90 en home y PDP.

**F4. Desacople de marca (M)** · *Entrada:* F3.
- **Aceptación**:
  - `check:brand` devuelve 0 coincidencias de `kyzz` y de los hex prohibidos.
  - Cambiar `brand.config` y `theme.css` cambia la marca en tienda, admin y emails.
  - E2E en verde.

**F5. Dominio genérico y módulos v1 (L)** · *Entrada:* F4 y **veredicto de G-EFFI** (define el puerto de inventario y el outbox).
- **Pasos**:
  - SKU, variantes genéricas, facetas, combos, retiro y datos mínimos del checkout (§5).
  - Puerto de inventario con el diseño de §4.
  - Adaptador CSV.
  - Flags de los módulos v1.
- **Aceptación**: los tests de §4 en verde y cada flag probado activado y desactivado.

**F6. Herramientas de Claude, documentación y release v1.0.0 (S)** · *Entrada:* F5.
- **Aceptación**:
  - Agentes y skills cargan sin errores.
  - El simulacro de `/nuevo-cliente` deja una marca demo funcionando en menos de 1 día.
  - CHANGELOG y ADR publicados.

**F7. DEMACHOS: arranque e identidad (M)** · *Entrada:* **G-COM firmado**, plantilla v1.0.0, hosting decidido (D2), logo vectorial y cuentas creadas según §11.
- **Aceptación**: home, catálogo y PDP coinciden con el prototipo a 1280 px y 390 px (capturas con Playwright).

**F8. DEMACHOS R1, primera entrega vendible (L)** · *Entrada:* F7, políticas comerciales confirmadas y catálogo inicial (al menos los SKU de lanzamiento).
- **Alcance**: §10.
- **Aceptación**: E2E de los 3 flujos (Wompi en sandbox, contraentrega y retiro) y admin operativo.

**F9. Integración con EFFI, nivel según el veredicto (M a L)** · *Entrada:* G-EFFI verde o amarillo, credenciales de producción con permisos mínimos y SLA de sincronización acordado.
- **Aceptación**: los criterios de §4 contra EFFI real (empresa de pruebas) y el panel de errores y reintentos en el admin. Si el veredicto es rojo, F9 = importación y exportación CSV (S).

**F10. Contenido, aceptación del cliente y lanzamiento (M)** · *Entrada:* F8, F9 (o la decisión de lanzar con CSV), textos legales aprobados y dominio.
- **Aceptación**:
  - Acta de aceptación firmada.
  - Lighthouse móvil ≥ 90.
  - Cero hallazgos altos de seguridad.
  - Backups y monitoreo activos.
  - `/checklist-lanzamiento` completo.

**F11. Transferencia y mantenimiento (S, continuo)** · *Entrada:* F10. Detalle en §11.

**R2 (posterior)**:
- Envío automático de pedidos a EFFI, si en R1 se hacía a mano.
- «Avísame» y formulario mayorista.
- Cuentas de cliente.
- Cupones y faceta «uso», si no entraron en R1.
- Recomendaciones de productos.

---

## 10. DEMACHOS R1: primera entrega vendible

- **Incluye**:
  - Home con estanterías y combos.
  - Catálogo con 10 categorías, filtros básicos, orden y búsqueda.
  - PDP con variante, REF (SKU) y estado de stock.
  - Combos (SKU propio o calculado, según G-EFFI).
  - Carrito en panel lateral con «complementa tu compra» por categoría.
  - Checkout como invitado con datos mínimos, domicilio o retiro, y Wompi o contraentrega.
  - Confirmación del pedido con código, email y enlace a WhatsApp.
  - Admin de productos, inventario y pedidos.
  - Páginas legales, FAQ y contacto.
  - SEO y GA4 con consentimiento.
  - Inventario EFFI según el veredicto (sincronización automática o CSV).
- **Excluye** (pasa a R2): envío automático de pedidos a EFFI si el veredicto es amarillo, «Avísame», mayoristas, cuentas de cliente, cupones, reseñas, newsletter, bot y devoluciones (RMA).
- **Criterio de «vendible»**: un cliente real puede comprar y pagar; DEMACHOS ve y gestiona el pedido; el stock es coherente con EFFI dentro del SLA; las políticas legales están publicadas.

---

## 11. Operación y aspectos comerciales

**Titularidad de las cuentas** (recomendación: **a nombre del cliente**, con Kevin como colaborador; es más fácil de transferir y de auditar):

| Recurso | Titular recomendado | Notas |
|---|---|---|
| Dominio y DNS | Cliente | Kevin como administrador delegado |
| Wompi (comercio) | **Cliente, obligatoriamente** (KYC, el dinero va a su cuenta) | Llaves entregadas por un canal seguro |
| EFFI | Cliente | Llave de API con perfil de permisos mínimo |
| Hosting (Vercel Pro o Railway) | Cliente, o Kevin si es servicio gestionado (D7) | Uso comercial: Vercel Hobby no lo permite |
| BD gestionada, Cloudinary y Resend | Igual que el hosting | Backups diarios verificados |
| Repo del cliente | Según el contrato (D8) | La plantilla sigue siendo propiedad intelectual de Kevin; el cliente recibe una licencia de uso no exclusiva |
| Google (GA4, Search Console) y email | Cliente | |

- **Despliegue**: previews por PR y producción desde `main`. Migraciones en un paso separado con comprobación de la BD destino (patrón de stockvek). Crons y sync en Vercel Cron (Pro) o en un worker de Railway (D2). Monitoreo de errores (p. ej. Sentry) y de disponibilidad.
- **Costos recurrentes**: **cotizar con precios vigentes en G-COM**; no se dan cifras sin verificarlas.

  | Concepto | Modelo | Lo paga |
  |---|---|---|
  | Hosting | Mensual o por uso | Cliente |
  | BD Postgres | Mensual o por uso | Cliente |
  | Cloudinary y Resend | Gratis o por tramos | Cliente |
  | Dominio | Anual | Cliente |
  | Wompi | % + cargo fijo por transacción | Cliente |
  | EFFI | Suscripción, más la API si tiene costo | Cliente |
  | Monitoreo | Gratis o por tramos | Cliente |
  | Mantenimiento | Cuota mensual | Cliente a Kevin |

- **Entrega al cliente**:
  - Acta de aceptación por flujos.
  - Sesión de capacitación grabada.
  - Manual de administración corto, con capturas.
  - Traspaso de credenciales con un gestor de contraseñas compartido (nunca por chat).
  - Runbooks (incidente de pagos, fallo de sincronización con EFFI, restaurar un backup).
  - Inventario de cuentas.
  - Periodo de garantía de corrección de defectos (p. ej. 30 a 60 días, a definir en el contrato).
- **Soporte**:
  - Canal (WhatsApp o email).
  - Severidades y tiempos de respuesta por severidad.
  - Horario.
  - Los cambios fuera del alcance se cobran aparte (bolsa de horas).
- **Mantenimiento**:
  - Mensual: parches de seguridad de la plantilla mediante `/sync-plantilla`, actualización de dependencias, verificación de backups y revisión de la conciliación con EFFI.
  - Trimestral: auditoría del agente `seguridad`, Lighthouse y revisión de costos.

---

## 12. Registro de riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| La API de EFFI no permite escribir pedidos o no está en el plan | Media | Alto | G-EFFI antes del contrato; veredicto amarillo o rojo con flujo manual o CSV |
| Sobreventa (POS físico más web) | Media | Medio | ATS con buffer, marca de agua y comprobación previa al pago (§4) |
| Demasiadas subidas de versión simultáneas | Media | Medio | Tests primero; un PR por subida; backlog fuera de v1 |
| Retrasos del cliente con el contenido y las políticas | Alta | Medio | Entradas con fechas en G-COM; R1 con alcance cerrado |
| Datos personales y DIAN mal resueltos | Baja-media | Alto | §5; validación con el contador y en G-EFFI |
| Hosting no apto para uso comercial o crons insuficientes | Media | Medio | D2 antes de F7 |
| Divergencia entre plantilla y clientes | Media | Medio | Regla de oro y releases semver |
| KYZZ en producción con advisories críticos de Next y next-auth (S9 y S10) | Alta | Alto | D11: parche aislado en KYZZ, independiente de la plantilla |

---

## 13. Decisiones pendientes y fase que bloquean

| # | Decisión | Debe resolverse antes de |
|---|---|---|
| D0 | ~~Autorizar el hotfix F0~~ **Autorizado (27-10-2026)**; aplicado en local | F0 |
| D1 | ~~Nombre del repo de la plantilla~~ **`vek-ecommerce`** (privado) | F1 |
| D11 | Subir en KYZZ Next a ≥ 16.4.1 y next-auth a beta.32 (S9 y S10), en un PR aparte con verificación en preview | Lo antes posible (KYZZ está en producción) |
| D2 | Hosting (Vercel Pro o Railway) y mecanismo del sync | F7 (y F9) |
| D3 | Rate limit (Postgres o Upstash) | F3f |
| D4 | Fuente de verdad del stock y del precio | F5 (tras G-EFFI) |
| D5 | Combos: SKU propio en EFFI o calculado | F5 |
| D6 | Medios de pago definitivos (¿transferencia?) y comprobar que la cuenta Wompi de DEMACHOS incluye PSE y Nequi **[H]** | F8 |
| D7 | Modelo de servicio: cuentas del cliente o servicio gestionado | G-COM |
| D8 | Titularidad del repo del cliente y licencia de la plantilla | G-COM |
| D9 | Factura: consumidor final o a nombre del cliente; ¿es obligatoria la cédula? | F5 (§5) |

---

## 14. Orden exacto de implementación

1. **Hecho**: estos documentos, en la rama local `docs/plantilla-whitelabel` (sin commit, push ni PR).
2. **En paralelo, sin código**: **G-EFFI** (solicitud de documentación y credenciales el día 1, porque es lo que más tarda) y **G-COM**.
3. **F0** hotfix S1, solo con la autorización D0. Sin push ni PR hasta que lo indiques.
4. **F1** (tras D1) → **F2** → **F3** (a→g) → **F4** → **F5** (tras el veredicto de G-EFFI y D4, D5, D9) → **F6**, tag **v1.0.0**.
5. **F7** (tras G-COM y D2) → **F8** (R1) → **F9** (según el veredicto) → **F10** lanzamiento → **F11**.
6. R2 según la prioridad del cliente.
