'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { CouponType, CouponCampaign } from '@prisma/client';
import { z } from 'zod';

const couponSchema = z.object({
  id:             z.string().optional(),
  code:           z.string().min(2).max(30).transform((v) => v.trim().toUpperCase()),
  type:           z.nativeEnum(CouponType),
  value:          z.number().positive(),
  campaign:       z.nativeEnum(CouponCampaign).default(CouponCampaign.general),
  description:    z.string().max(200).optional().nullable(),
  isActive:       z.boolean().default(true),
  subscriberOnly: z.boolean().default(false),
  minimumAmount:  z.number().nonnegative().nullable().optional(),
  usageLimit:     z.number().int().positive().nullable().optional(),
  expiresAt:      z.string().datetime().nullable().optional(),
});

export type CouponInput = z.infer<typeof couponSchema>;

export const createUpdateCoupon = async (input: CouponInput) => {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.errors[0]?.message ?? 'Datos inválidos' };
  }

  const { id, code, type, value, campaign, description, isActive, subscriberOnly, minimumAmount, usageLimit, expiresAt } = parsed.data;
  const data = {
    code, type, value, campaign, description: description ?? null,
    isActive, subscriberOnly, minimumAmount: minimumAmount ?? null,
    usageLimit: usageLimit ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  };

  try {
    if (id) {
      const updated = await prisma.coupon.update({ where: { id }, data });
      return { ok: true, coupon: updated };
    }
    const created = await prisma.coupon.create({ data });
    return { ok: true, coupon: created };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('Unique constraint')) {
      return { ok: false, message: `El código "${code}" ya existe.` };
    }
    return { ok: false, message: msg };
  }
};
