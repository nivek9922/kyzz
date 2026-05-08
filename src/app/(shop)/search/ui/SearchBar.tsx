'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IoSearchOutline } from 'react-icons/io5';

interface Props {
  initialValue?: string;
}

export const SearchBar = ({ initialValue = '' }: Props) => {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <IoSearchOutline size={16} className="absolute left-0 text-kyzz-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar en la colección..."
        autoFocus
        className="w-full bg-transparent pl-6 pb-2 text-sm text-kyzz-dark placeholder-kyzz-muted border-b border-kyzz-secondary focus:outline-none focus:border-kyzz-primary transition-colors"
      />
      <button
        type="submit"
        className="ml-4 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors whitespace-nowrap"
      >
        Buscar
      </button>
    </form>
  );
};
