import { asc } from 'drizzle-orm';
import { db } from '@/server/db';
import { mentorshipLessons, mentorshipLives } from '@/server/db/schema';
import { mentorshipLiveInput } from '../mentorship';

export function getMentorshipLessons() {
  return db.select().from(mentorshipLessons).orderBy(asc(mentorshipLessons.slot));
}

export function getMentorshipLives() {
  return db.select().from(mentorshipLives).orderBy(asc(mentorshipLives.startsAt));
}

export async function getMentorshipSchedule() {
  const lives = await getMentorshipLives();
  const now = new Date();
  const today = mentorshipLiveInput(now).slice(0, 10);
  const upcoming: typeof lives = [];
  const recordings: typeof lives = [];

  for (const live of lives) {
    const scheduledToday = mentorshipLiveInput(live.startsAt).startsWith(today);
    if (live.startsAt >= now || (scheduledToday && !live.recordingUrl)) {
      upcoming.push(live);
    } else {
      recordings.push(live);
    }
  }

  return { upcoming, recordings: recordings.toReversed() };
}
