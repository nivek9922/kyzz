# KYZZ → plantilla white-label → DEMACHOS · 03 · EFFI ERP: viabilidad e inventario

Qué se sabe de EFFI, cómo se valida su API antes de comprometer alcance y cómo se evitan discrepancias de inventario. No se asume ningún endpoint.

> Documentos: [01 · Diagnóstico](01-diagnostico.md) · [02 · Hoja de ruta](02-hoja-de-ruta.md) · [03 · EFFI: viabilidad](03-effi-viabilidad.md)

**Fecha:** 27-10-2026 · **Estado:** propuesta para revisión · **Alcance:** solo planificación, sin cambios de código.

**Niveles de evidencia usados en este documento:**
- **[C-código]**: confirmado leyendo el código, con archivo y línea.
- **[C-doc]**: confirmado en la documentación oficial.
- **[C-runtime]**: reproducido en ejecución. Todavía no hay ningún hallazgo con este nivel.
- **[Indicio]**: fuente secundaria.
- **[H]**: hipótesis que requiere prueba.

---

## 1. EFFI ERP: lo que se sabe

| Nivel | Contenido | Fuente |
|

---

## 2. Puerta G-EFFI: estudio de viabilidad

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

### Registro de resultados (completar durante el estudio)

| Capacidad | Estado (Probada / Documentada-no-probada / No disponible) | Evidencia (sin secretos) | Notas |
|---|---|---|---|
| Autenticación y gestión de llaves | | | |
| Leer artículos (SKU, precio, variantes) | | | |
| Leer stock por bodega | | | |
| Leer / crear clientes (cédula, NIT) | | | |
| Crear pedido o venta y anularlo | | | |
| Idempotencia en la creación | | | |
| Avisos / webhooks (eventos, firma, reintentos) | | | |
| Límites de uso | | | |
| Costo y plan requerido | | | |
| Factura electrónica DIAN (quién la emite, qué datos) | | | |
| Combos / kits | | | |
| Sandbox o empresa de pruebas | | | |

**Veredicto:** 🟢 / 🟡 / 🔴 · **Aprobado por:** Kevin ☐ · DEMACHOS ☐

---

## 3. Inventario: cómo evitar discrepancias entre las reservas de la tienda y EFFI

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

## 4. Datos personales en el checkout (minimización, Ley 1581)

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
