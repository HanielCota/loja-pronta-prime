import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import pandaCatalog from '../data/sll/panda-videos.json';
import { importInitialSllContent } from '../src/features/sll/server/import-initial-content';
import { importZeCourse } from '../src/features/ze-mauro/server/import-course';
import { importSllTools } from '../src/features/sll/tools/server/import-tools';
import { publishToolMaterials } from '../src/features/sll/tools/server/publish-materials';
import { ensureInitialAssistantPlaybooks } from '../src/features/assistant/server/initial-playbooks';
import { db } from '../src/server/db';

async function applyMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    // Mantém a tabela drizzle.__drizzle_migrations usada pelo CLI e só aplica SQL pendente.
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.log('Migrações aplicadas com sucesso.');
    // O banco online não recebe os importadores locais; leva o conteúdo conferido na própria imagem.
    const imported = await importInitialSllContent(pool);
    const ze = await importZeCourse(pool);
    console.log(
      `Zé Mauro course imported: ${ze.tracks} tracks, ${ze.lessons} lessons, ${ze.videos} videos, ${ze.pending} pending.`,
    );
    console.log(
      `Conteúdo SLL importado: ${imported.tracks} trilhas, ${imported.lessons} aulas, ${imported.videos} vídeos e ${imported.resources} recursos.`,
    );
    await publishToolMaterials();
    const tools = await importSllTools(pool);
    await ensureInitialAssistantPlaybooks();
    console.log('Roteiros iniciais do assistente disponíveis; versões existentes preservadas.');
    console.log(
      `Ferramentas SLL: ${tools.applied ? 'entrega aplicada' : 'entrega já aplicada'}, ${tools.resources} recursos e ${tools.links} ligações. Materiais conferidos no bucket.`,
    );
    // Só contagens: o log permite conferir a vinculação no deploy sem expor conteúdo de alunas.
    const videoIds = pandaCatalog.sections.flatMap((section) =>
      section.groups.flatMap((group) => group.lessons.map((lesson) => lesson.videoId)),
    );
    const videos = await pool.query<{ lessons: number }>(
      `SELECT count(DISTINCT lesson.id)::integer AS lessons
       FROM learning_content_blocks AS block
       JOIN learning_lessons AS lesson ON lesson.id = block.lesson_id
       JOIN learning_modules AS module ON module.id = lesson.module_id
       JOIN learning_stages AS stage ON stage.id = module.stage_id
       JOIN learning_tracks AS track ON track.id = stage.track_id
       WHERE block.kind = 'video' AND block.data->>'provider' = 'pandavideo'
         AND block.data->>'videoId' = ANY($1::text[])
         AND lesson.archived_at IS NULL AND module.archived_at IS NULL
         AND stage.archived_at IS NULL AND track.archived_at IS NULL`,
      [videoIds],
    );
    console.log(`Vídeos Panda vinculados a ${videos.rows[0]!.lessons} aulas SLL existentes.`);
  } finally {
    await pool.end();
    await db.$client.end();
  }
}

// Um erro termina o processo com falha: o comando de início não deve abrir o servidor sem migrar.
applyMigrations().catch((error: unknown) => {
  console.error(
    'Falha nas migrações:',
    error instanceof Error ? error.message : 'Erro inesperado.',
  );
  process.exitCode = 1;
});
