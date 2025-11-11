// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { Kufam } from "next/font/google";

export const metadata: Metadata = {
  title: "MiAlacena Online",
  description: "Organizá tu alacena, ahorrá tiempo y evitá desperdicios",
};

const kufam = Kufam({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* Si usás darkMode:'class', podés forzar oscuro agregando className="dark" en <html> */}
      <body
        className={[
          kufam.className,
          "antialiased min-h-screen transition-colors",
          // Tema claro
          "bg-gradient-to-b from-white to-zinc-100 text-zinc-900",
          // Tema oscuro
          "dark:bg-gradient-to-b dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100",
        ].join(" ")}
      >
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
