import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atp/shared-types", "@atp/validation"],
};

export default nextConfig;
