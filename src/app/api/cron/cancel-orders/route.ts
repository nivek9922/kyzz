import { NextResponse } from 'next/server';
import { runCancelUnpaidOrders } from '@/actions/order/cancel-unpaid-orders';

/**
 * GET /api/cron/cancel-orders
 *
 * Invocado automáticamente por Vercel Cron (vercel.json).
 * Vercel envía el header Authorization: Bearer <CRON_SECRET>.
 * En desarrollo (sin CRON_SECRET) se puede llamar libremente para pruebas.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await runCancelUnpaidOrders();

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  console.log(`[Cron] cancel-orders → canceladas: ${result.cancelledCount}`);
  return NextResponse.json(result);
}
