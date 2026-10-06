import type { EditorIntent } from './editor-intent';

export type LearningNodeKind = 'track' | 'stage' | 'module' | 'lesson';
export type LearningTrackKind = 'welcome' | 'method' | 'complementary_course';
/** `field` diz qual campo causou o erro, para ligar a mensagem a ele (aria-describedby). */
export type StructureActionState = {
  message: string;
  saved: boolean;
  field?: 'title' | 'description' | 'durationMinutes' | 'relatedLessonId';
};
export type BannerActionState = { message: string; saved: boolean; bannerId?: string };
export type ResourceActionState = { message: string; saved: boolean; resourceId?: string };
/** Resultado dos botões abaixo dos editores do SLL; `intent` diz qual botão foi usado. */
export type EditorActionState = { message: string; saved: boolean; intent?: EditorIntent };

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
  /** Só nas trilhas: elas não têm pai, então a área (tipo) diz onde elas aparecem. */
  trackKind?: LearningTrackKind;
  archivedAt: Date;
};
