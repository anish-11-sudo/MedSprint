import("@opennextjs/cloudflare").then((cloudflare) => cloudflare.initOpenNextCloudflareForDev());

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
