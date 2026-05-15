'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';


export const getOrderById = async( id: string ) => {

  const session = await auth();

  if ( !session?.user ) {
    return {
      ok: false,
      message: 'Debe de estar autenticado'
    }
  }


  try {

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        OrderAddress: true,
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