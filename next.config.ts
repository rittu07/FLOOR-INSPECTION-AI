import type { NextConfig } from "next";

// Backend the hosted app talks to. The browser calls same-origin /backend/* and Vercel proxies it here,
// so there is no cross-origin (CORS) request and networks/extensions that block the backend's domain
// (e.g. *.onrender.com) do not matter.
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "https://floor-inspection-api.onrender.com").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
