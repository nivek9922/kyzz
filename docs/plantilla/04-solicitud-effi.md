# Solicitud a EFFI: documentación y acceso a la API

> Documentos: [01 · Diagnóstico](01-diagnostico.md) · [02 · Hoja de ruta](02-hoja-de-ruta.md) · [03 · EFFI: viabilidad](03-effi-viabilidad.md)

Correo para iniciar la puerta **G-EFFI**. Conviene enviarlo con copia al responsable de DEMACHOS: la cuenta y el plan de EFFI son suyos y es probable que EFFI pida su autorización.

- **Para:** soporte@effisystems.com
- **CC:** [responsable de DEMACHOS]
- **Asunto:** Solicitud de documentación y acceso a la API de Effi: integración de tienda online de Distribuidora DEMACHOS Barber

---

Hola, equipo de Effi:

Soy Kevin Rodríguez, desarrollador de la tienda online de **Distribuidora DEMACHOS Barber** (Popayán), cliente de Effi. Copio a [nombre], de DEMACHOS, que autoriza esta solicitud.

Estamos construyendo su tienda online sobre una plataforma propia (Next.js con PostgreSQL), no sobre Shopify, WooCommerce ni PrestaShop. Queremos integrarla con Effi mediante la interfaz para desarrolladores que mencionan en su sitio web. Para diseñar la integración correctamente, les agradecemos:

**1. Documentación y acceso**
- La documentación técnica oficial de la API: URL base, autenticación y referencia de endpoints.
- Un entorno de pruebas (sandbox o empresa de pruebas) y credenciales con permisos mínimos, para no tocar los datos reales mientras desarrollamos.
- Si el acceso a la API está incluido en el plan actual de DEMACHOS o si tiene un costo adicional.

**2. Capacidades que necesitamos confirmar**
1. Consultar artículos con su código o referencia (SKU), precio y variantes (por ejemplo, el color).
2. Consultar el stock disponible por bodega.
3. Registrar desde un sistema externo una venta o pedido de la tienda online, con forma de pago (en línea o contraentrega), y anularlo si se cancela.
4. Consultar y registrar clientes por cédula o NIT.
5. Si existe algún mecanismo para evitar pedidos duplicados ante reintentos (idempotencia).
6. Cómo se representan los combos o kits (varios artículos vendidos juntos) y cómo afectan al inventario.

**3. Notificaciones y límites**
- Si los «avisos automáticos de cada cambio» funcionan como webhooks: qué eventos existen (por ejemplo, cambios de stock o de precio), cómo se verifica su autenticidad y la política de reintentos.
- Los límites de uso de la API (peticiones por minuto o por día).

**4. Facturación electrónica**
- Si la factura electrónica DIAN se emite desde Effi al registrar la venta y qué datos del comprador exige, en particular si se puede facturar a «consumidor final» cuando el cliente no pide factura a su nombre.

Si existen guías o ejemplos de integraciones personalizadas, también nos serían de gran ayuda. Podemos agendar una llamada corta si les resulta más práctico.

Muchas gracias por su ayuda.

Kevin Rodríguez
Desarrollador · Tienda online Distribuidora DEMACHOS Barber
nivek9922@gmail.com · [teléfono]
