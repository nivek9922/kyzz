import type { Carrier } from '@prisma/client';

/**
 * Catálogo de transportadoras. Fuente única de verdad para etiquetas y
 * construcción de URLs de rastreo (quick-win Fase 1, sin API).
 *
 * NOTA: las URLs de rastreo de las transportadoras colombianas cambian con
 * frecuencia. Donde el deep-link directo no es fiable, se apunta a la página
 * de rastreo y el cliente pega/usa el código. Verificar/ajustar al integrar.
 */

interface CarrierMeta {
  label:        string;
  /** Construye la URL de rastreo para un código de guía. `null` = sin link (texto plano). */
  trackingUrl: ((code: string) => string) | null;
}

export const CARRIERS: Record<Carrier, CarrierMeta> = {
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
  heka: {
    label:       'Heka',
    trackingUrl: (code) => `https://app.heka.com.co/rastreo?guia=${encodeURIComponent(code)}`,
  },
  mipaquete: {
    label:       'Mipaquete',
    trackingUrl: (code) => `https://app.mipaquete.com/rastreo?guia=${encodeURIComponent(code)}`,
  },
  mensajeros_urbanos: {
    label:       'Mensajeros Urbanos',
    trackingUrl: null, // rastreo vía app, sin deep-link público fiable
  },
  noventa_y_nueve: {
    label:       '99minutos',
    trackingUrl: (code) => `https://ras.99minutos.com/?guia=${encodeURIComponent(code)}`,
  },
  manual: {
    label:       'Otra / manual',
    trackingUrl: null, // sin transportadora con link → se muestra como texto
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

/** Opciones para selects del admin (excluye o incluye `manual` según se necesite). */
export const CARRIER_OPTIONS: { value: Carrier; label: string }[] =
  (Object.keys(CARRIERS) as Carrier[]).map((value) => ({ value, label: CARRIERS[value].label }));
