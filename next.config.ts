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
      { protocol: "https", hostname: "img.expressoparaguai.com" },
    ],
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
  },
  async redirects() {
    // Categoria raiz "Apple" virou "Eletrônicos" em 12/10/2026 (departamento
    // já tinha Xiaomi/Samsung/Motorola/Realme misturados) — link antigo já
    // mandado hoje no WhatsApp/divulgação não pode quebrar.
    return [
      { source: '/categoria/apple', destination: '/categoria/eletronicos', permanent: true },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev()).catch(() => {});
}
