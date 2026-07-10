/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flowos/shared'],
  // Standalone tracing needs symlinks, which Windows blocks outside
  // Developer Mode — enabled only for the Docker image (see Dockerfile).
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' ? { output: 'standalone' } : {}),
  eslint: {
    // Lint runs as a separate turbo task
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
