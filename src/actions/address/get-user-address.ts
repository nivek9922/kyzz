'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';


export const getUserAddress = async( userId?: string ) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const targetId = (session.user.role === 'admin' && userId) ? userId : session.user.id;

    const address = await prisma.userAddress.findUnique({
      where: { userId: targetId },
    });

    if (!address) return null;

    // Excluir id y userId — no forman parte de Address y romperían orderAddress.create()
    const { countryId, address2, state, id: _id, userId: _userId, ...rest } = address;

    return {
      ...rest,
      country:  countryId,
      address2: address2 ?? '',
      state:    state    ?? '',
    };

  } catch {
    return null;
  }
}




