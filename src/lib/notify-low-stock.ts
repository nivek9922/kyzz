import { render } from '@react-email/components';
import prisma from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { logger } from '@/lib/logger';
import { LOW_STOCK_THRESHOLD } from '@/config/constants';
import { LowStockAlertEmail } from '@/emails/LowStockAlertEmail';

/**
 * Alerta por email al admin cuando uno o más productos CRUZAN por debajo del
 * umbral de stock bajo tras una compra (antes >= umbral, ahora < umbral).
 * Solo dispara en el cruce para evitar spam en cada venta de un ítem ya bajo.
 *
 * Es fire-and-forget seguro: cualquier error se loguea y nunca se propaga,
 * por lo que jamás afecta el resultado de la orden.
 *
 * @param previousStock mapa productId → inStock ANTES de descontar la compra
 */
export async function notifyLowStock(previousStock: Map<string, number>): Promise<void> {
  const adminEmail = process.env.EMAIL_CONTACT;
  if (!adminEmail || !process.env.RESEND_API_KEY || previousStock.size === 0) return;

  try {
    const ids = Array.from(previousStock.keys());
    const products = await prisma.product.findMany({
      where:  { id: { in: ids } },
      select: { id: true, title: true, inStock: true },
    });

    const crossed = products.filter((p) => {
      const before = previousStock.get(p.id) ?? 0;
      return before >= LOW_STOCK_THRESHOLD && p.inStock < LOW_STOCK_THRESHOLD;
    });
    if (crossed.length === 0) return;

    const html = await render(
      LowStockAlertEmail({ products: crossed.map((p) => ({ title: p.title, inStock: p.inStock })) }),
    );

    await resend.emails.send({
      from:    EMAIL_FROM,
      to:      adminEmail,
      subject: `KYZZ · ${crossed.length} ${crossed.length === 1 ? 'producto' : 'productos'} con stock bajo`,
      html,
    });
  } catch (err) {
    logger.error({ error: String(err) }, 'Error enviando alerta de stock bajo');
  }
}
