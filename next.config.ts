import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Игнорируем ошибки ESLint во время сборки на сервере
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Игнорируем ошибки TypeScript во время сборки
    ignoreBuildErrors: true,
  },
};

export default nextConfig;