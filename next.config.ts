import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,

  // Em dev o Next registra os argumentos das Server Actions no terminal;
  // desligado pra nunca expor email ou senha digitados no login.
  logging: {
    serverFunctions: false,
  },

  // Carregado direto do node_modules: o rate-limiter-flexible importa o drizzle-orm
  // dinamicamente, e o empacotador do Next não resolve esse import.
  serverExternalPackages: ['rate-limiter-flexible'],

  images: {
    // 100: qualidade máxima pro mascote (a arte é pequena na tela; o padrão 75 borra os detalhes).
    qualities: [75, 100],
  },

  // async redirects() {
  //   return [];
  // },

  // async headers() {
  //   return [];
  // },
};

export default nextConfig;
