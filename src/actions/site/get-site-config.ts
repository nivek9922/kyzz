import prisma from '@/lib/prisma';

const DEFAULT_CONFIG = {
  id: 'main',
  heroTitle: 'Kyzz: Basics for every you',
  heroSubtitle: 'Nueva colección',
  heroCta: 'Explorar colección',
  heroImageUrl: null as string | null,
  updatedAt: new Date(),
};

export const getSiteConfig = async () => {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: 'main' } });
    return config ?? DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};
