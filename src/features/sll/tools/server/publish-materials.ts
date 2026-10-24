import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { storage } from '@/server/storage';
import { validateDownloadFile } from '@/features/admin/media-validation';
import { TOOL_MATERIALS } from '../catalog';

/** Os dois arquivos da entrega têm chaves imutáveis e ficam no mesmo bucket privado do projeto. */
export async function publishToolMaterials() {
  for (const material of TOOL_MATERIALS) {
    const bytes = await readFile(`data/sll/tools/${material.fileName}`);
    if (!validateDownloadFile(material.fileName, bytes))
      throw new Error(`Material SLL inválido: ${material.fileName}`);
    const current = await storage().get(material.storageKey);
    if (!current) {
      await storage().put(material.storageKey, bytes, material.contentType);
      continue;
    }
    if (
      createHash('sha256').update(current).digest('hex') !==
      createHash('sha256').update(bytes).digest('hex')
    )
      throw new Error(`Material SLL diferente no bucket: ${material.fileName}`);
  }
}
