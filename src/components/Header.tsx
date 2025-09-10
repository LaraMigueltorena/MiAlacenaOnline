// src/components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Header() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    clsx(
      "text-sm md:text-base px-2 transition",
      pathname === href ? "font-medium text-black" : "text-zinc-700 hover:text-black"
    );

  return (
    <header className="w-full border-b border-zinc-200 bg-[#e4e2dd]">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex h-14 items-center gap-6">
          {/* Título */}
          <span className="text-lg md:text-xl font-bold text-black">
            MiAlacena Online
          </span>

          {/* Navegación pegada al título */}
          <nav className="flex items-center text-zinc-700">
            <Link href="/" className={linkClass("/")}>
              Home
            </Link>
            <span className="px-2">|</span>
            <Link href="/products" className={linkClass("/products")}>
              Lista de productos
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
