export type LearningNodeKind = 'track' | 'stage' | 'module' | 'lesson';
export type LearningTrackKind = 'welcome' | 'method' | 'complementary_course';
export type StructureActionState = { message: string; saved: boolean };
export type BannerActionState = { message: string; saved: boolean; bannerId?: string };
export type ResourceActionState = { message: string; saved: boolean; resourceId?: string };

export type EditableLearningNode = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes?: number | null;
  countsTowardProgress?: boolean;
  relatedLessonId?: string | null;
  trackKind?: LearningTrackKind;
  coverStorageKey?: string | null;
  coverAlt?: string | null;
  featured?: boolean;
  hasDraft?: boolean;
  hasHistory?: boolean;
  status?: 'draft' | 'published';
};

export type ArchivedLearningNode = {
  id: string;
  title: string;
  kind: LearningNodeKind;
  parentId: string | null;
  archivedAt: Date;
};
