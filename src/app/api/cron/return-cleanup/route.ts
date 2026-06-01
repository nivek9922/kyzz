import { NextResponse } from 'next/server';
import { runReturnCleanup } from '@/actions/return/cron-return-cleanup';

/**
 * GET /api/cron/return-cleanup
 *
 * Invocado diariamente por Vercel Cron a las 9:00 AM UTC.
 * Cierra las solicitudes APPROVED cuyo plazo de envío venció (expiresAt < ahora).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await runReturnCleanup();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  console.log(`[Cron] return-cleanup → cerradas: ${result.closedCount}`);
  return NextResponse.json(result);
}
