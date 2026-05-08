"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IoCloseOutline, IoSearchOutline } from "react-icons/io5";
import { useUIStore } from "@/store";

const SUGGESTIONS = [
  "Jeans tiro alto",
  "Blusas cropped",
  "Enterizos",
  "Chaquetas oversize",
];

export const SearchOverlay = () => {
  const isSearchOpen = useUIStore((state) => state.isSearchOpen);
  const closeSearch  = useUIStore((state) => state.closeSearch);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Foco automático al abrir
  useEffect(() => {
    if (isSearchOpen) {
      setValue("");
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isSearchOpen]);

  // Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeSearch(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    closeSearch();
  };

  const handleSuggestion = (s: string) => {
    router.push(`/search?q=${encodeURIComponent(s)}`);
    closeSearch();
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-kyzz-dark/40 backdrop-blur-sm fade-in"
        onClick={closeSearch}
      />

      {/* Panel superior */}
      <div className="relative bg-kyzz-neutral border-b border-kyzz-secondary shadow-xl fade-in">
        <div className="max-w-2xl mx-auto px-6 py-6">

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-4">
            <IoSearchOutline className="w-5 h-5 text-kyzz-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Buscar en la colección..."
              className="flex-1 bg-transparent text-lg text-kyzz-dark placeholder-kyzz-muted focus:outline-none"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="text-kyzz-muted hover:text-kyzz-dark transition-colors"
              aria-label="Cerrar búsqueda"
            >
              <IoCloseOutline className="w-6 h-6" />
            </button>
          </form>

          {/* Sugerencias */}
          {!value && (
            <div className="mt-5 pt-5 border-t border-kyzz-secondary">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
                Búsquedas populares
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="px-4 py-1.5 text-xs tracking-wide border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-[10px] text-kyzz-muted/60 tracking-wide">
            Enter para buscar · Esc para cerrar
          </p>
        </div>
      </div>
    </div>
  );
};
