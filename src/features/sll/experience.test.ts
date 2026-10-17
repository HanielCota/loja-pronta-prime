import { expect, test } from 'bun:test';
import { expertContentData } from './experience';
test('Zé nunca herda silenciosamente o vídeo da Pri nem o rascunho de uma variante', () => {
  const data = { provider: 'pandavideo', videoId: 'pri-video', note: 'Aula compartilhada' };
  expect(expertContentData('video', data, 'pri', undefined).videoId).toBe('pri-video');
  expect(expertContentData('video', data, 'ze', undefined).videoId).toBe('');
  expect(expertContentData('video', data, 'ze', null).videoId).toBe('');
  expect(expertContentData('video', data, 'ze', 'ze-publicado').videoId).toBe('ze-publicado');
  expect(data.videoId).toBe('pri-video');
  expect(expertContentData('text', { text: 'Texto comum' }, 'ze', undefined)).toEqual({
    text: 'Texto comum',
  });
});
