import { describe, expect, test } from 'bun:test';
import {
  mentorshipLessonUrl,
  mentorshipLiveInput,
  parseMentorshipLiveTime,
  youtubeWatchUrl,
} from './mentorship';

describe('mentorship content', () => {
  test('normalizes individual YouTube videos and scheduled lives', () => {
    const canonical = 'https://www.youtube.com/watch?v=abcdefghijk';
    expect(youtubeWatchUrl('https://youtu.be/abcdefghijk?si=share')).toBe(canonical);
    expect(youtubeWatchUrl('https://www.youtube.com/live/abcdefghijk')).toBe(canonical);
    expect(youtubeWatchUrl('https://www.youtube.com/playlist?list=abcdefghijk')).toBeNull();
    expect(youtubeWatchUrl('https://youtube.com.example.org/watch?v=abcdefghijk')).toBeNull();
    expect(youtubeWatchUrl('http://youtube.com/watch?v=abcdefghijk')).toBeNull();
  });

  test('allows Panda lessons while keeping live links restricted to YouTube', () => {
    const panda =
      'https://player-vz-dbb97dad-52b.tv.pandavideo.com.br/embed/?v=9e6a17d5-b60f-4c04-8275-cd9e05f2e8b8';
    expect(mentorshipLessonUrl(panda)).toBe(`${panda}&autoplay=false`);
    expect(youtubeWatchUrl(panda)).toBeNull();
  });

  test('round-trips Brasília time and rejects out-of-range dates and hours', () => {
    const input = '2026-11-13T23:30';
    const date = parseMentorshipLiveTime(input)!;
    expect(date.toISOString()).toBe('2026-11-14T02:30:00.000Z');
    expect(mentorshipLiveInput(date)).toBe(input);
    expect(parseMentorshipLiveTime('2026-02-30T19:00')).toBeNull();
    expect(parseMentorshipLiveTime('2026-11-13T24:00')).toBeNull();
  });
});
