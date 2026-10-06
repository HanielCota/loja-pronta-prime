'use server';

import {
  setSllLessonCompletionForm as setLessonCompletion,
  recordSllLessonView as recordLessonView,
} from './progress-actions';
import type { SllProgressActionResult } from './progress-actions';

export async function setSllLessonCompletionForm(
  previous: SllProgressActionResult,
  formData: FormData,
): Promise<SllProgressActionResult> {
  return setLessonCompletion(previous, formData);
}

export async function recordSllLessonView(
  trackId: string,
  lessonId: string,
): Promise<SllProgressActionResult> {
  return recordLessonView(trackId, lessonId);
}
