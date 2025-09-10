// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { Kufam } from "next/font/google";   // 👈 importamos la fuente

export const metadata: Metadata = {
  title: "MiAlacena Online",
  description: "Organizá tu alacena, ahorrá tiempo y evitá desperdicios",
};

// 👇 configuramos la fuente
const kufam = Kufam({
  subsets: ["latin"],
  weight: ["400", "500", "700"], // podés ajustar según necesites
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* 👇 aplicamos la fuente global si querés */}
      <body
        className={`${kufam.className} antialiased bg-gradient-to-b from-white to-zinc-100 min-h-screen`}
      >
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
