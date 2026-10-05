'use server';

import {
  completeSllLessonForm as completeLesson,
  recordSllLessonView as recordLessonView,
} from './progress-actions';
import type { SllProgressActionResult } from './progress-actions';

export async function completeSllLessonForm(
  previous: SllProgressActionResult,
  formData: FormData,
): Promise<SllProgressActionResult> {
  return completeLesson(previous, formData);
}

export async function recordSllLessonView(
  trackId: string,
  lessonId: string,
): Promise<SllProgressActionResult> {
  return recordLessonView(trackId, lessonId);
}
