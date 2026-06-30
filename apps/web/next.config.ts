import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['korey-hydrometric-soughfully.ngrok-free.dev'],
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:5000/api/auth/:path*",
      },
      {
        source: "/trpc/:path*",
        destination: "http://localhost:5000/trpc/:path*",
      },
    ];
  },
};

export default nextConfig;
