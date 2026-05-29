import type { Carrier } from '@prisma/client';

/**
 * Catálogo de transportadoras. Fuente única de verdad para etiquetas y
 * construcción de URLs de rastreo (sin API).
 *
 * `envia` = pedidos gestionados a través del agregador Envia.com; el tracking
 * se hace en el portal de la transportadora subyacente que Envia asignó.
 *
 * NOTA: las URLs de rastreo cambian con frecuencia. Verificar/ajustar al integrar.
 */

interface CarrierMeta {
  label:       string;
  /** Construye la URL de rastreo para un código de guía. `null` = sin link (texto plano). */
  trackingUrl: ((code: string) => string) | null;
}

export const CARRIERS: Record<Carrier, CarrierMeta> = {
  envia: {
    label:       'Envia.com',
    trackingUrl: (code) => `https://app.envia.com/tracking?guide=${encodeURIComponent(code)}`,
  },
  interrapidisimo: {
    label:       'Interrapidísimo',
    trackingUrl: (code) => `https://www.interrapidisimo.com/Tracking/Guias?guia=${encodeURIComponent(code)}`,
  },
  servientrega: {
    label:       'Servientrega',
    trackingUrl: (code) => `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${encodeURIComponent(code)}`,
  },
  coordinadora: {
    label:       'Coordinadora',
    trackingUrl: (code) => `https://www.coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${encodeURIComponent(code)}`,
  },
  tcc: {
    label:       'TCC',
    trackingUrl: (code) => `https://www.tcc.com.co/rastreo-de-mercancia/?guia=${encodeURIComponent(code)}`,
  },
  mensajeros_urbanos: {
    label:       'Mensajeros Urbanos',
    trackingUrl: null,
  },
  noventa_y_nueve: {
    label:       '99minutos',
    trackingUrl: (code) => `https://ras.99minutos.com/?guia=${encodeURIComponent(code)}`,
  },
  manual: {
    label:       'Otra / manual',
    trackingUrl: null,
  },
};

/** Etiqueta legible de una transportadora. */
export function carrierLabel(carrier: Carrier): string {
  return CARRIERS[carrier]?.label ?? carrier;
}

/**
 * URL de rastreo para una transportadora + código de guía.
 * Retorna `null` si la transportadora no tiene link o falta el código.
 */
export function carrierTrackingUrl(carrier: Carrier | null | undefined, code: string | null | undefined): string | null {
  if (!carrier || !code) return null;
  const builder = CARRIERS[carrier]?.trackingUrl;
  return builder ? builder(code) : null;
}

/** Opciones para selects del admin. */
export const CARRIER_OPTIONS: { value: Carrier; label: string }[] =
  (Object.keys(CARRIERS) as Carrier[]).map((value) => ({ value, label: CARRIERS[value].label }));
