'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

const schema = z.object({
  returnId: z.string().uuid(),
  base64:   z.string().min(10),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
});

/**
 * El cliente sube una foto como evidencia cuando el admin requiere más pruebas.
 * Sube a Cloudinary y guarda la URL en `proofImageUrl`, luego crea un ReturnEvent.
 */
export async function uploadReturnEvidence(input: {
  returnId: string;
  base64:   string;
  mimeType: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'Debes iniciar sesión.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Archivo no válido. Usa JPG, PNG o WebP (máx. 5MB).' };

  const { returnId, base64, mimeType } = parsed.data;

  try {
    const ret = await prisma.returnRequest.findUnique({
      where:   { id: returnId },
      include: { order: { select: { userId: true } } },
    });

    if (!ret)                                 return { ok: false, message: 'Solicitud no encontrada.' };
    if (ret.order.userId !== session.user.id) return { ok: false, message: 'No autorizado.' };
    if (ret.status !== 'EVIDENCE_REQUIRED')   return { ok: false, message: 'No se requiere evidencia en este momento.' };

    // Validar tamaño aprox. (base64 ~4/3 del tamaño real)
    const estimatedBytes = (base64.length * 3) / 4;
    if (estimatedBytes > 5 * 1024 * 1024) {
      return { ok: false, message: 'La imagen no puede superar 5MB.' };
    }

    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64}`,
      { folder: 'kyzz/customer-returns' },
    );

    const customerName = session.user.name ?? session.user.email ?? 'Clienta';

    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnId },
        data:  { proofImageUrl: result.secure_url },
      });

      await tx.returnEvent.create({
        data: {
          returnRequestId: returnId,
          actor:           `customer:${session.user.id}`,
          actorName:       customerName,
          fromStatus:      ret.status,
          toStatus:        ret.status, // estado no cambia — admin lo revisa y aprueba
          notes:           'Evidencia fotográfica adjuntada por la clienta.',
        },
      });
    });

    revalidatePath(`/devoluciones/${returnId}`);
    revalidatePath(`/admin/devoluciones/${returnId}`);
    return { ok: true, url: result.secure_url };
  } catch (err) {
    console.error('[uploadReturnEvidence]', err);
    return { ok: false, message: 'Error al subir la imagen. Intenta de nuevo.' };
  }
}
