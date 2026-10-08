import { createHash } from 'node:crypto';
import { env } from '@/config/env';

// Um deploy que troca de banco não pode reutilizar dados do anterior. A chave não expõe a conexão.
export const DATABASE_CACHE_SCOPE = createHash('sha256').update(env.DATABASE_URL).digest('hex');
