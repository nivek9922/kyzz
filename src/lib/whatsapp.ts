/** Número de WhatsApp comercial de KYZZ (formato internacional, ej. 573001234567). */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';

/** Construye un enlace wa.me con mensaje opcional pre-llenado. */
export function whatsappUrl(message?: string, number: string = WHATSAPP_NUMBER): string {
  const digits = number.replace(/\D/g, '');
  const base   = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
