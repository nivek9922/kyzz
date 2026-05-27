'use server';

import { auth } from '@/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

export const getCloudinaryVideoSignature = async () => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false as const, message: 'No autorizado' };

  const cfg       = cloudinary.config();
  const timestamp = Math.round(Date.now() / 1000);
  const folder    = 'kyzz/hero-video';

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    cfg.api_secret as string,
  );

  return {
    ok:         true as const,
    signature,
    timestamp,
    api_key:    cfg.api_key    as string,
    cloud_name: cfg.cloud_name as string,
    folder,
  };
};
