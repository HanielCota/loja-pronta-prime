'use server';

import { runAsStudent } from '@/features/support/server/impersonation';
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
  return runAsStudent('setSllLessonCompletionForm', async () => {
    return setLessonCompletion(previous, formData);
  });
}

export async function recordSllLessonView(
  trackId: string,
  lessonId: string,
): Promise<SllProgressActionResult> {
  return runAsStudent(
    'recordSllLessonView',
    async () => {
      return recordLessonView(trackId, lessonId);
    },
    { saved: false, message: '' },
  );
}

export async function saveSllPlanIntake(
  previous: SllPlanIntakeActionResult,
  formData: FormData,
): Promise<SllPlanIntakeActionResult> {
  return runAsStudent('saveSllPlanIntake', async () => {
    return savePlanIntake(previous, formData);
  });
}
