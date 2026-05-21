const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter en memoria (best-effort). En serverless funciona en instancias
 * "warm"; en cold starts el contador se resetea, y entre nodos no comparte
 * estado — suficiente para frenar abuso casual desde un mismo cliente. Para
 * algo estricto multi-instancia, migrar a Upstash Redis u otro store
 * compartido.
 *
 * Devuelve `true` si el request está dentro del límite, `false` si debe
 * rechazarse.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
