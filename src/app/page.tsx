// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Kufam } from "next/font/google";  // 👈

const kufam = Kufam({
  subsets: ["latin"],
  weight: ["700"], // título en bold
});

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center py-10 md:py-16">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md shadow-sm">
          <Image
            src="/pantry.jpg"
            alt="Estantes con productos organizados"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col items-start">
          {/* 👇 aplicamos Kufam solo al título */}
          <h1 className={`${kufam.className} text-2xl md:text-3xl font-bold text-zinc-900 leading-snug`}>
            ¡Organizá tu alacena, ahorrá
            <br className="hidden md:block" />
            tiempo y evitá desperdicios!
          </h1>

          <Link
            href="/products"
            className="mt-6 inline-block rounded-full px-6 md:px-7 py-3 md:py-3.5 bg-zinc-900 text-white text-sm md:text-base font-medium shadow hover:bg-zinc-800 transition"
          >
            Ir a lista de productos
          </Link>
        </div>
      </div>
    </section>
  );
}
