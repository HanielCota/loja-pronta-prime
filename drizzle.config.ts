import { defineConfig } from 'drizzle-kit';

// Sem o endereço, o drizzle-kit falharia com um erro de conexão confuso: melhor dizer o que falta.
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definida (veja .env.example).');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url,
  },
});
