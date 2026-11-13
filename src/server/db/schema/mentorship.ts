import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const mentorshipLessons = pgTable('mentorship_lessons', {
  slot: integer('slot').primaryKey(),
  title: text('title').notNull(),
  videoUrl: text('video_url').notNull(),
});

export const mentorshipLives = pgTable('mentorship_lives', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  liveUrl: text('live_url'),
  recordingUrl: text('recording_url'),
});
