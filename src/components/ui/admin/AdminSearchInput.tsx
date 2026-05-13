'use client';

import { useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { IoSearchOutline, IoCloseOutline } from 'react-icons/io5';

interface Props {
  defaultValue?: string;
  placeholder?:  string;
}

export const AdminSearchInput = ({ defaultValue, placeholder = 'Buscar...' }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (term.trim()) {
      params.set('q', term.trim());
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(e.target.value), 400);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    navigate('');
  };

  return (
    <div className="relative">
      <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kyzz-muted pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="kyzz-input pl-9 pr-8 text-sm w-60"
      />
      {defaultValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-kyzz-muted hover:text-kyzz-dark transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <IoCloseOutline size={14} />
        </button>
      )}
    </div>
  );
};
