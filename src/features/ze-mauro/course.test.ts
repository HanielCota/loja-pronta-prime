import { expect, test } from 'bun:test';
import { initialZeCourse, validateZeCourse, zeLessonVideo } from './course';

test('the supplied catalog preserves all 57 recordings and eight unavailable lessons', () => {
  const content = initialZeCourse();
  const lessons = content.stages.flatMap((stage) => stage.modules.flatMap((item) => item.lessons));
  expect(content.stages).toHaveLength(1);
  expect(lessons).toHaveLength(65);
  expect(new Set(lessons.flatMap((item) => (item.videoId ? [item.videoId] : []))).size).toBe(57);
  expect(lessons.filter((item) => item.videoId === null)).toHaveLength(8);
  expect(
    lessons.filter((item) => item.title.includes('Como postar da maneira certa')),
  ).toHaveLength(2);
});

test('unavailable videos cannot become playable through malformed or foreign providers', () => {
  const videoId = initialZeCourse().stages[0]!.modules[0]!.lessons[0]!.videoId!;
  expect(zeLessonVideo([])).toBeNull();
  expect(zeLessonVideo([{ kind: 'video', data: null }])).toBeNull();
  expect(zeLessonVideo([{ kind: 'video', data: { provider: 'other', videoId } }])).toBeNull();
  expect(
    zeLessonVideo([{ kind: 'video', data: { provider: 'pandavideo', videoId: 'invalid' } }]),
  ).toBeNull();
  expect(zeLessonVideo([{ kind: 'video', data: { provider: 'pandavideo', videoId } }])).toEqual({
    provider: 'pandavideo',
    videoId,
  });
});

test('validation rejects malformed videos and duplicate paths before importing', () => {
  const malformed = initialZeCourse();
  malformed.stages[0]!.modules[0]!.lessons[0]!.videoId = 'invalid';
  expect(() => validateZeCourse(malformed)).toThrow('Invalid Panda video');
  const duplicate = initialZeCourse();
  duplicate.stages.push(structuredClone(duplicate.stages[0]!));
  expect(() => validateZeCourse(duplicate)).toThrow('duplicate');
  expect(initialZeCourse().stages).toHaveLength(1);
});
