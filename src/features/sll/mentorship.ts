import { pandaVideoId, PANDA_PLAYER_ORIGIN } from './panda-video';

export const MENTORSHIP_PATH = '/sll/mentoria';
export const MENTORSHIP_TITLE = 'Mentoria C/ Zé Mauro';
export const MENTORSHIP_LESSONS = [
  'Aula de boas-vindas',
  'Aula 1',
  'Aula 2',
  'Aula 3',
  'Aula 4',
  'Aula 5',
  'Aula 6',
] as const;

export function youtubeWatchUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      return null;
    }

    const youtube = ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname);
    const id =
      url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : youtube && url.pathname === '/watch'
          ? url.searchParams.get('v')
          : youtube
            ? /^\/live\/([^/]+)\/?$/.exec(url.pathname)?.[1]
            : null;
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch {
    return null;
  }
}

export function mentorshipLessonUrl(value: string): string | null {
  const id = pandaVideoId(value);
  return id ? `${PANDA_PLAYER_ORIGIN}/embed/?v=${id}&autoplay=false` : youtubeWatchUrl(value);
}

const localDateTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function mentorshipLiveInput(date: Date) {
  return localDateTime.format(date).replace(' ', 'T');
}

export function parseMentorshipLiveTime(value: string): Date | null {
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}:00-03:00`);
  return Number.isFinite(+date) && mentorshipLiveInput(date) === value ? date : null;
}

export const mentorshipLiveDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'full',
  timeStyle: 'short',
});
