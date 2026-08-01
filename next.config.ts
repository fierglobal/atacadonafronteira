import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "web.archive.org" },
      { protocol: "https", hostname: "tapsknrszmfhuwzvovem.supabase.co" },
      { protocol: "https", hostname: "atacadoparaguai.com" },
      { protocol: "https", hostname: "atacadoparaguai.com.py" },
      { protocol: "https", hostname: "assets.olaclick.app" },
      { protocol: "https", hostname: "xjmapfpfgwoivlsalltb.supabase.co" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
  },
};

export default nextConfig;

if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev()).catch(() => {});
}
