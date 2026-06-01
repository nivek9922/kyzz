import { NextResponse } from 'next/server';
import { runReturnSlaCheck } from '@/actions/return/cron-return-sla';

/**
 * GET /api/cron/return-sla
 *
 * Invocado diariamente por Vercel Cron a las 8:00 AM UTC.
 * Alerta al admin sobre:
 *   - Solicitudes PENDING sin atender > 48h (SLA)
 *   - Solicitudes RECEIVED/INSPECTING en cuarentena > 30 días
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await runReturnSlaCheck();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  console.log(`[Cron] return-sla → pending: ${result.pendingCount}, cuarentena: ${result.quarantineCount}, alta tasa: ${result.highReturnProductCount}`);
  return NextResponse.json(result);
}
