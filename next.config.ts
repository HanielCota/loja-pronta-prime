import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from 'next/constants';

const contentPolicy = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

const nextConfig: NextConfig = {
  // A imagem leva só os arquivos usados pelo servidor, sem as ferramentas de desenvolvimento.
  output: 'standalone',
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

  async redirects() {
    return [
      // A tela da etapa da aluna se chamava /journey; links salvos continuam funcionando.
      {
        source: '/admin/contas/:id/journey',
        destination: '/admin/contas/:id/etapa',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return {
      // Antes dos arquivos: a página inicial já existe para as alunas no domínio principal.
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'leads\\.lojaprontaprime\\.com' }],
          destination: '/leads',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Ninguém embute as telas em outro site (protege o login contra clickjacking).
          {
            key: 'Content-Security-Policy',
            value: `${contentPolicy}; form-action 'self'`,
          },
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
      // A regra específica vem por último: o Next sobrescreve o cabeçalho definido pela rota.
      // O código e o estado do retorno não podem aparecer no Referer da página seguinte.
      ...['/api/shopee/callback', '/api/bling/callback'].map((source) => ({
        source,
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      })),
      {
        source: '/api/auth/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      // Native form submissions follow the 303 to Shopee when JavaScript is unavailable.
      ...[
        '/loja-pronta/shopee/conectar',
        '/loja-pronta/produtos/recovered/connect',
        '/sll/minhas-lojas/conectar',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `${contentPolicy}; form-action 'self' https://open.shopee.com https://open.sandbox.test-stable.shopee.com`,
          },
        ],
      })),
      {
        source: '/admin/bling',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `${contentPolicy}; form-action 'self' https://www.bling.com.br`,
          },
        ],
      },
    ];
  },
};

export default function configForPhase(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const deploymentId = process.env.NEXT_DEPLOYMENT_ID || randomUUID();
    return { ...nextConfig, deploymentId, generateBuildId: async () => deploymentId };
  }

  // The standalone server embeds the build config. `next start` reads the same ID from disk.
  if (phase === PHASE_PRODUCTION_SERVER && existsSync('.next/BUILD_ID')) {
    return { ...nextConfig, deploymentId: readFileSync('.next/BUILD_ID', 'utf8').trim() };
  }

  return nextConfig;
}
