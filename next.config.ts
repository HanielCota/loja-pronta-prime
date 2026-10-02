import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,

  // Em dev o Next registra os argumentos das Server Actions no terminal;
  // desligado pra nunca expor email ou senha digitados no login.
  logging: {
    serverFunctions: false,
  },

  images: {
    // 100: qualidade máxima pro mascote (a arte é pequena na tela; o padrão 75 borra os detalhes).
    qualities: [75, 100],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Ninguém embute as telas em outro site (protege o login contra clickjacking).
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
