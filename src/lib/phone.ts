/**
 * Normaliza un número de teléfono colombiano al formato E.164 sin '+'
 * requerido por la WhatsApp Cloud API (ej. "3026889618" → "573026889618").
 * Retorna null si el número no puede normalizarse.
 */
export function toE164Colombia(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
  return null;
}
