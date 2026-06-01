import prisma from '@/lib/prisma';
import { resend, EMAIL_FROM } from '@/lib/resend';

const SLA_HOURS            = 48;
const QUARANTINE_DAYS      = 30;
const RETURN_RATE_THRESHOLD = 15; // % — alerta si un producto supera esta tasa

/**
 * Revisión diaria de SLA de devoluciones.
 * - Solicitudes PENDING sin atender > 48h → alerta admin
 * - Solicitudes RECEIVED/INSPECTING en cuarentena > 30d → alerta admin
 * - Productos con tasa de devolución > 15% → alerta admin
 * Fire-and-forget seguro: nunca lanza, siempre retorna.
 */
export async function runReturnSlaCheck(): Promise<{
  ok: boolean;
  pendingCount?: number;
  quarantineCount?: number;
  highReturnProductCount?: number;
  message?: string;
}> {
  const adminEmail = process.env.EMAIL_CONTACT;
  if (!adminEmail || !process.env.RESEND_API_KEY) {
    return { ok: true, pendingCount: 0, quarantineCount: 0, highReturnProductCount: 0 };
  }

  try {
    const now                 = new Date();
    const slaThreshold        = new Date(now.getTime() - SLA_HOURS * 3_600_000);
    const quarantineThreshold = new Date(now.getTime() - QUARANTINE_DAYS * 86_400_000);

    const [overduePending, longInspection, activeReturns] = await Promise.all([
      prisma.returnRequest.findMany({
        where:   { status: 'PENDING', createdAt: { lt: slaThreshold } },
        select: {
          id: true, rmaCode: true, reason: true, createdAt: true,
          order: { select: { user: { select: { name: true } }, guestEmail: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.returnRequest.findMany({
        where:   { status: { in: ['RECEIVED', 'INSPECTING'] }, updatedAt: { lt: quarantineThreshold } },
        select:  { id: true, rmaCode: true, status: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
      // Para calcular tasas de devolución por producto
      prisma.returnRequest.findMany({
        where:  { status: { notIn: ['REJECTED', 'CLOSED', 'REJECTED_AFTER_INSPECT'] } },
        select: {
          order: {
            select: {
              OrderItem: {
                select: { productId: true, quantity: true, product: { select: { title: true } } },
              },
            },
          },
        },
      }),
    ]);

    // Calcular productos con tasa de devolución >= 15%
    const returnedMap = new Map<string, { title: string; returned: number }>();
    for (const ret of activeReturns) {
      for (const item of ret.order.OrderItem) {
        const cur = returnedMap.get(item.productId);
        if (cur) { cur.returned += item.quantity; }
        else { returnedMap.set(item.productId, { title: item.product.title, returned: item.quantity }); }
      }
    }

    let highReturnProducts: { title: string; rate: number; returned: number; sold: number }[] = [];
    if (returnedMap.size > 0) {
      const soldGroups = await prisma.orderItem.groupBy({
        by:    ['productId'],
        where: { productId: { in: Array.from(returnedMap.keys()) }, order: { isPaid: true } },
        _sum:  { quantity: true },
      });
      highReturnProducts = soldGroups
        .map((s) => {
          const meta    = returnedMap.get(s.productId);
          const sold    = s._sum.quantity ?? 0;
          const returned = meta?.returned ?? 0;
          const rate    = sold > 0 ? (returned / sold) * 100 : 0;
          return { title: meta?.title ?? '—', sold, returned, rate };
        })
        .filter((p) => p.rate >= RETURN_RATE_THRESHOLD)
        .sort((a, b) => b.rate - a.rate);
    }

    if (overduePending.length === 0 && longInspection.length === 0 && highReturnProducts.length === 0) {
      return { ok: true, pendingCount: 0, quarantineCount: 0, highReturnProductCount: 0 };
    }

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const sections: string[] = [];

    if (overduePending.length > 0) {
      const rows = overduePending.map((ret) => {
        const customer = ret.order.user?.name ?? ret.order.guestEmail ?? 'Invitado';
        const hours    = Math.floor((now.getTime() - ret.createdAt.getTime()) / 3_600_000);
        return `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px">
              <a href="${appUrl}/admin/devoluciones/${ret.id}" style="color:#8C7365;text-decoration:none">
                ${ret.rmaCode ?? ret.id.slice(-8).toUpperCase()}
              </a>
            </td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px">${customer}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#A89080">${ret.reason.slice(0, 60)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#b45309;font-weight:500">${hours}h sin atender</td>
          </tr>`;
      }).join('');

      sections.push(`
        <h2 style="color:#3D2B1F;font-size:14px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px">
          Solicitudes sin atender · más de ${SLA_HOURS}h
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#F5EBE0">
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">RMA</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Cliente</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Motivo</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Tiempo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`);
    }

    if (longInspection.length > 0) {
      const STATUS_ES: Record<string, string> = { RECEIVED: 'Recibida', INSPECTING: 'En inspección' };
      const rows = longInspection.map((ret) => {
        const days = Math.floor((now.getTime() - ret.updatedAt.getTime()) / 86_400_000);
        return `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px">
              <a href="${appUrl}/admin/devoluciones/${ret.id}" style="color:#8C7365;text-decoration:none">
                ${ret.rmaCode ?? ret.id.slice(-8).toUpperCase()}
              </a>
            </td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#A89080">${STATUS_ES[ret.status] ?? ret.status}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#b45309;font-weight:500">${days} días en cuarentena</td>
          </tr>`;
      }).join('');

      sections.push(`
        <h2 style="color:#3D2B1F;font-size:14px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px">
          Cuarentena sin resolver · más de ${QUARANTINE_DAYS} días
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#F5EBE0">
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">RMA</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Estado</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Tiempo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`);
    }

    // Sección productos con alta tasa de devolución
    if (highReturnProducts.length > 0) {
      const rows = highReturnProducts.map((p) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#3D2B1F">${p.title}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#A89080">${p.returned} de ${p.sold} vendidas</td>
            <td style="padding:8px 10px;border-bottom:1px solid #E3D5CA;font-size:13px;color:#dc2626;font-weight:600">${p.rate.toFixed(1)}%</td>
          </tr>`).join('');

      sections.push(`
        <h2 style="color:#dc2626;font-size:14px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px">
          ⚠ Productos con tasa de devolución ≥${RETURN_RATE_THRESHOLD}%
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#FEF2F2">
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Producto</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Devoluciones</th>
              <th style="padding:6px 10px;font-size:11px;font-weight:500;text-align:left;color:#A89080;letter-spacing:0.1em;text-transform:uppercase">Tasa</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`);
    }

    const subjects: string[] = [];
    if (overduePending.length > 0)    subjects.push(`${overduePending.length} sin atender`);
    if (longInspection.length > 0)    subjects.push(`${longInspection.length} en cuarentena`);
    if (highReturnProducts.length > 0) subjects.push(`${highReturnProducts.length} producto${highReturnProducts.length > 1 ? 's' : ''} con alta tasa`);

    const html = `
      <div style="font-family:'Manrope',sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;background:#FAF9F6;color:#3D2B1F">
        <p style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#A89080;margin:0 0 24px">KYZZ · Alertas de devoluciones</p>
        ${sections.join('')}
        <p style="margin:24px 0 0;font-size:12px;color:#A89080">
          <a href="${appUrl}/admin/devoluciones/analytics" style="color:#8C7365;text-decoration:underline">Ver analytics →</a>
          &nbsp;&nbsp;
          <a href="${appUrl}/admin/devoluciones" style="color:#8C7365;text-decoration:underline">Ver todas las solicitudes →</a>
        </p>
      </div>`;

    await resend.emails.send({
      from:    EMAIL_FROM,
      to:      adminEmail,
      subject: `KYZZ · Devoluciones: ${subjects.join(' · ')}`,
      html,
    });

    return {
      ok: true,
      pendingCount:           overduePending.length,
      quarantineCount:        longInspection.length,
      highReturnProductCount: highReturnProducts.length,
    };
  } catch (err) {
    console.error('[runReturnSlaCheck]', err);
    return { ok: false, message: 'Error en SLA check' };
  }
}
