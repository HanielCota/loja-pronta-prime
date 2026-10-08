import { DATABASE_CACHE_SCOPE } from '@/server/cache-context';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { SLL_CONTENT_SECONDS, SLL_CONTENT_TAG } from './content-cache';
import { db } from '@/server/db';
import { SLL_COPY, type SllCopy, type SllCopyKey } from '../copy';

/** Mantém os textos originais quando o painel ainda não alterou um campo. */
export const getSllCopy = cache(
  unstable_cache(
    async (): Promise<SllCopy> => {
      const rows = await db.query.learningTexts.findMany({ columns: { key: true, value: true } });
      const copy: SllCopy = { ...SLL_COPY };
      for (const row of rows) {
        if (Object.hasOwn(SLL_COPY, row.key)) copy[row.key as SllCopyKey] = row.value;
      }
      return copy;
    },
    ['sll-published-copy', DATABASE_CACHE_SCOPE],
    { revalidate: SLL_CONTENT_SECONDS, tags: [SLL_CONTENT_TAG] },
  ),
);
