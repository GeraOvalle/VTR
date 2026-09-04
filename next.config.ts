import type { NextConfig } from "next";

// @ts-expect-error - next-pwa no tiene tipos oficiales para TypeScript
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.101'],
  
  // 🔴 Agregamos esto para calmar a Next.js 16 y su Turbopack
  turbopack: {},
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);