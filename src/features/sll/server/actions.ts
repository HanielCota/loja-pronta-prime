'use server';

import {
  setSllLessonCompletionForm as setLessonCompletion,
  recordSllLessonView as recordLessonView,
} from './progress-actions';
import type { SllProgressActionResult } from './progress-actions';
import type { SllPlanIntakeActionResult } from './plan-actions';
export type { SllProgressActionResult } from './progress-actions';
import { saveSllPlanIntake as savePlanIntake } from './plan-actions';
export type { SllPlanIntakeActionResult } from './plan-actions';

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

export async function saveSllPlanIntake(
  previous: SllPlanIntakeActionResult,
  formData: FormData,
): Promise<SllPlanIntakeActionResult> {
  return savePlanIntake(previous, formData);
}
