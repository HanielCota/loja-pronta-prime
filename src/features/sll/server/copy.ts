import { cache } from 'react';
import { db } from '@/server/db';
import { SLL_COPY, type SllCopy, type SllCopyKey } from '../copy';

/** Mantém os textos originais quando o painel ainda não alterou um campo. */
export const getSllCopy = cache(async (): Promise<SllCopy> => {
  const rows = await db.query.learningTexts.findMany({ columns: { key: true, value: true } });
  const copy: SllCopy = { ...SLL_COPY };
  for (const row of rows) {
    if (Object.hasOwn(SLL_COPY, row.key)) copy[row.key as SllCopyKey] = row.value;
  }
  return copy;
});
