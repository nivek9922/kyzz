'use client';

import { generatePaginationNumbers } from '@/utils';
import Link from 'next/link';
import clsx from 'clsx';
import { redirect, usePathname, useSearchParams } from 'next/navigation';
import { IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';

interface Props {
  totalPages: number;
}

export const Pagination = ({ totalPages }: Props) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageString = searchParams.get('page') ?? 1;
  const currentPage = isNaN(+pageString) ? 1 : +pageString;

  if (currentPage < 1 || isNaN(+pageString)) {
    redirect(pathname);
  }

  const allPages = generatePaginationNumbers(currentPage, totalPages);

  const createPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    if (pageNumber === '...') return `${pathname}?${params.toString()}`;
    if (+pageNumber <= 0) return pathname;
    if (+pageNumber > totalPages) return `${pathname}?${params.toString()}`;
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-12">
      {/* Anterior */}
      <Link
        href={createPageUrl(currentPage - 1)}
        aria-label="Página anterior"
        className={clsx(
          'flex items-center justify-center w-9 h-9 text-kyzz-muted transition-colors duration-200',
          currentPage <= 1
            ? 'pointer-events-none opacity-30'
            : 'hover:text-kyzz-dark'
        )}
      >
        <IoChevronBackOutline size={16} />
      </Link>

      {/* Páginas */}
      {allPages.map((page, index) => (
        <Link
          key={`${page}-${index}`}
          href={createPageUrl(page)}
          className={clsx(
            'flex items-center justify-center w-9 h-9 text-[11px] tracking-widest transition-colors duration-200',
            {
              'text-kyzz-dark border-b border-kyzz-dark font-medium': page === currentPage,
              'text-kyzz-muted hover:text-kyzz-dark': page !== currentPage && page !== '...',
              'text-kyzz-muted pointer-events-none': page === '...',
            }
          )}
        >
          {page}
        </Link>
      ))}

      {/* Siguiente */}
      <Link
        href={createPageUrl(currentPage + 1)}
        aria-label="Página siguiente"
        className={clsx(
          'flex items-center justify-center w-9 h-9 text-kyzz-muted transition-colors duration-200',
          currentPage >= totalPages
            ? 'pointer-events-none opacity-30'
            : 'hover:text-kyzz-dark'
        )}
      >
        <IoChevronForwardOutline size={16} />
      </Link>
    </div>
  );
};
