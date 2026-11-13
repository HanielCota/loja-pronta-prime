'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/features/admin/server/access';
import { hasCurrentAdminSession } from '@/features/admin/server/current-session';
import { db } from '@/server/db';
import { mentorshipLessons, mentorshipLives } from '@/server/db/schema';
import {
  MENTORSHIP_LESSONS,
  MENTORSHIP_PATH,
  mentorshipLessonUrl,
  parseMentorshipLiveTime,
  youtubeWatchUrl,
} from '../mentorship';

const ADMIN_PATH = '/admin/mentoria';

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function saved() {
  revalidatePath(MENTORSHIP_PATH);
  revalidatePath(ADMIN_PATH);
  redirect(`${ADMIN_PATH}?resultado=salvo`);
}

type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function writeMentorship(
  admin: AdminSession,
  operation: 'save-lesson' | 'save-live' | 'remove-live',
  write: (tx: Transaction) => Promise<boolean>,
) {
  let result: 'saved' | 'missing' | 'access' | 'error';
  try {
    result = await db.transaction(async (tx) => {
      const actor = { userId: admin.user.id, sessionId: admin.session.id };
      if (!(await hasCurrentAdminSession(tx, actor))) {
        return 'access';
      }

      return (await write(tx)) ? 'saved' : 'missing';
    });
  } catch (error) {
    console.error('[mentorship] Could not save a change.', {
      operation,
      errorKind: error instanceof Error ? error.name : typeof error,
    });
    result = 'error';
  }

  if (result === 'access') {
    redirect(`${ADMIN_PATH}?resultado=acesso`);
  }

  if (result === 'missing') {
    redirect(`${ADMIN_PATH}?resultado=removida`);
  }

  if (result === 'error') {
    redirect(`${ADMIN_PATH}?resultado=erro`);
  }

  saved();
}

export async function saveMentorshipLesson(slot: number, form: FormData) {
  const admin = await requireAdmin(ADMIN_PATH);
  const title = text(form, 'title');
  const link = text(form, 'video');
  const videoUrl = mentorshipLessonUrl(link);
  if (
    !Number.isInteger(slot) ||
    !MENTORSHIP_LESSONS[slot] ||
    !title ||
    title.length > 120 ||
    (link && !videoUrl)
  ) {
    redirect(`${ADMIN_PATH}?resultado=aula`);
  }

  const values = { title, videoUrl: videoUrl ?? '' };
  await writeMentorship(admin, 'save-lesson', async (tx) => {
    await tx
      .insert(mentorshipLessons)
      .values({ slot, ...values })
      .onConflictDoUpdate({ target: mentorshipLessons.slot, set: values });
    return true;
  });
}

export async function saveMentorshipLive(id: string | null, form: FormData) {
  const admin = await requireAdmin(ADMIN_PATH);
  const title = text(form, 'title');
  const startsAt = parseMentorshipLiveTime(text(form, 'startsAt'));
  const live = text(form, 'live');
  const recording = text(form, 'recording');
  const liveUrl = youtubeWatchUrl(live);
  const recordingUrl = youtubeWatchUrl(recording);
  if (
    (id !== null && !z.uuid().safeParse(id).success) ||
    !title ||
    title.length > 120 ||
    !startsAt ||
    (live && !liveUrl) ||
    (recording && !recordingUrl)
  ) {
    redirect(`${ADMIN_PATH}?resultado=live`);
  }

  const values = { title, startsAt, liveUrl, recordingUrl };
  await writeMentorship(admin, 'save-live', async (tx) => {
    if (id === null) {
      await tx.insert(mentorshipLives).values(values);
      return true;
    }

    const [updated] = await tx
      .update(mentorshipLives)
      .set(values)
      .where(eq(mentorshipLives.id, id))
      .returning({ id: mentorshipLives.id });
    return Boolean(updated);
  });
}

export async function removeMentorshipLive(id: string) {
  const admin = await requireAdmin(ADMIN_PATH);
  if (!z.uuid().safeParse(id).success) {
    redirect(`${ADMIN_PATH}?resultado=removida`);
  }

  await writeMentorship(admin, 'remove-live', async (tx) => {
    const [removed] = await tx
      .delete(mentorshipLives)
      .where(eq(mentorshipLives.id, id))
      .returning({ id: mentorshipLives.id });
    return Boolean(removed);
  });
}
