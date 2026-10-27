import inventory from '../../../data/ze-mauro/course.json';
import { pandaVideoId } from '@/features/sll/panda-video';
import { lessonPublicationIssue } from '@/features/admin/publication-rules';

export const ZE_COURSE_SLUG = 'ze-mauro';
export const ZE_COURSE_PATH = '/ze-mauro';
export const ZE_PENDING_DESCRIPTION = 'O vídeo desta aula estará disponível em breve.';
export type ZeCourseInventory = typeof inventory;

export function zeLessonVideo(blocks: Array<{ kind: string; data: unknown }>) {
  for (const block of blocks) {
    if (block.kind !== 'video' || !block.data || typeof block.data !== 'object') continue;
    const data = block.data as Record<string, unknown>;
    if (data.provider === 'pandavideo' && typeof data.videoId === 'string') {
      const videoId = pandaVideoId(data.videoId);
      if (videoId) return { provider: 'pandavideo', videoId };
    }
  }
  return null;
}

export function validateZeCourse(content: ZeCourseInventory): void {
  if (content.slug !== ZE_COURSE_SLUG || !content.title.trim() || !content.stages.length)
    throw new Error('Invalid Zé Mauro course inventory.');
  const paths = new Set<string>();
  const register = (path: string, slug: string, title: string) => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !title.trim() || paths.has(path))
      throw new Error(`Invalid or duplicate course entry: ${path}`);
    paths.add(path);
  };
  for (const stage of content.stages) {
    register(stage.slug, stage.slug, stage.title);
    for (const group of stage.modules) {
      const path = `${stage.slug}/${group.slug}`;
      register(path, group.slug, group.title);
      for (const lesson of group.lessons) {
        register(`${path}/${lesson.slug}`, lesson.slug, lesson.title);
        if (lesson.videoId !== null && pandaVideoId(lesson.videoId) !== lesson.videoId)
          throw new Error(`Invalid Panda video: ${path}/${lesson.slug}`);
        const issue = lessonPublicationIssue(
          lesson.title,
          lesson.videoId ? null : ZE_PENDING_DESCRIPTION,
          lesson.videoId
            ? [{ kind: 'video', data: { provider: 'pandavideo', videoId: lesson.videoId } }]
            : [],
        );
        if (issue) throw new Error(`Unpublishable lesson: ${path}/${lesson.slug}`);
      }
    }
  }
}

export function initialZeCourse(): ZeCourseInventory {
  const content = structuredClone(inventory);
  validateZeCourse(content);
  return content;
}
