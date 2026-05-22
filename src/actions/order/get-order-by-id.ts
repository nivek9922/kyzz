'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';


export const getOrderById = async( id: string ) => {

  const session = await auth();

  try {

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        OrderAddress:  true,
        returnRequest: true,
        user:         { select: { email: true, name: true } },
        OrderItem: {
          select: {
            price:     true,
            quantity:  true,
            size:      true,
            colorName: true,

            product: {
              select: {
                title: true,
                slug:  true,

                ProductImage: {
                  select: { url: true },
                  take: 1,
                },

                ProductColors: {
                  select: {
                    images: {
                      select: { url: true },
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                    },
                    paletteColor: {
                      select: { hex: true },
                    },
                  },
                  take: 1,
                },
              },
            },

            variant: {
              select: {
                colorId: true,
                color: {
                  select: {
                    paletteColor: {
                      select: { name: true, hex: true },
                    },
                    images: {
                      select: { url: true },
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        }
      }
    });

    if( !order ) throw `${ id } no existe`;

    if ( !session?.user ) {
      // Permitir acceso sin sesión SOLO si es una orden de invitado (userId === null).
      // El UUID de 128 bits sirve como token de acceso opaco.
      if ( order.userId !== null ) {
        return { ok: false, message: 'Debe de estar autenticado' };
      }
      return { ok: true, order };
    }

    if ( session.user.role === 'user' ) {
      if ( session.user.id !== order.userId ) {
        throw `${ id } no es de ese usuario`
      }
    }



    return {
      ok: true,
      order: order,
    }


  } catch (error) {

    console.log(error);

    return {
      ok: false,
      message: 'Orden no existe'
    }


  }


}