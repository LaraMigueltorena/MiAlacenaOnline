import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ ignora errores de ESLint en build (Vercel)
  },
};

export default nextConfig;
