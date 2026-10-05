import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sem o cabeçalho "X-Powered-By: Next.js" (não conta pra ninguém com o que o site é feito).
  poweredByHeader: false,
  agentRules: false,

  // Em dev o Next registra os argumentos das Server Actions no terminal;
  // desligado pra nunca expor email ou senha digitados no login.
  logging: {
    serverFunctions: false,
  },

  experimental: {
    serverActions: {
      // O logo já aceita até 5 MB; reserva mais 1 MB pro formulário que leva a imagem.
      bodySizeLimit: '6mb',
    },
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
          // O microfone só pra este site (falar em vez de escrever, no chat do logo).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          // Depois da primeira visita, o navegador só abre o site por https (os navegadores
          // ignoram esse cabeçalho em http, então o dev local não muda).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
