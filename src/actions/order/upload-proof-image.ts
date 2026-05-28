'use server';

import { auth } from '@/auth';
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config(process.env.CLOUDINARY_URL ?? '');

/**
 * Sube un comprobante de pago (imagen) a Cloudinary y retorna la URL segura.
 * Acepta base64 + mimeType porque las Server Actions no pueden recibir File directamente.
 * Solo admin.
 */
export const uploadProofImage = async (
  base64:   string,
  mimeType: string,
): Promise<{ ok: boolean; url?: string; message?: string }> => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!ALLOWED.includes(mimeType)) {
    return { ok: false, message: 'Formato no permitido. Usa JPG, PNG o WebP.' };
  }

  try {
    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${base64}`,
      { folder: 'kyzz/payment-proofs' },
    );
    return { ok: true, url: result.secure_url };
  } catch (err) {
    console.error('[uploadProofImage]', err);
    return { ok: false, message: 'Error subiendo imagen' };
  }
};
