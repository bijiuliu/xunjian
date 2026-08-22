import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
