'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/features/admin/server/access';
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

export async function saveMentorshipLesson(slot: number, form: FormData) {
  await requireAdmin(ADMIN_PATH);
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
  await db
    .insert(mentorshipLessons)
    .values({ slot, ...values })
    .onConflictDoUpdate({
      target: mentorshipLessons.slot,
      set: values,
    });
  saved();
}

export async function saveMentorshipLive(id: string | null, form: FormData) {
  await requireAdmin(ADMIN_PATH);
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
  if (id === null) {
    await db.insert(mentorshipLives).values(values);
  } else {
    const updated = await db
      .update(mentorshipLives)
      .set(values)
      .where(eq(mentorshipLives.id, id))
      .returning({ id: mentorshipLives.id });
    if (!updated.length) {
      redirect(`${ADMIN_PATH}?resultado=removida`);
    }
  }

  saved();
}

export async function removeMentorshipLive(id: string) {
  await requireAdmin(ADMIN_PATH);
  if (!z.uuid().safeParse(id).success) {
    redirect(`${ADMIN_PATH}?resultado=removida`);
  }

  await db.delete(mentorshipLives).where(eq(mentorshipLives.id, id));
  saved();
}
