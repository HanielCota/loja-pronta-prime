import { expect, test } from 'bun:test';
import { courseCoverSrc, courseCoverVersion } from './course-cover';

test('a capa muda de endereço com o arquivo e não expõe as pastas do bucket', () => {
  const before = courseCoverSrc('curso', 'sll/course-covers/curso/anterior.webp');
  const after = courseCoverSrc('curso', 'sll/course-covers/curso/nova.webp');
  expect(before).not.toBe(after);
  expect(after).toBe('/api/sll/course-cover/curso?v=nova.webp');
  expect(after).not.toContain('sll/course-covers');
  expect(courseCoverVersion('nova.webp')).toBe('nova.webp');
});

test('identificadores e nomes de arquivo não criam parâmetros extras na URL', () => {
  const url = new URL(
    courseCoverSrc('curso/com espaço', 'pasta/capa&outra=1.webp'),
    'https://exemplo.com',
  );
  expect(url.pathname).toBe('/api/sll/course-cover/curso%2Fcom%20espa%C3%A7o');
  expect(url.searchParams.get('v')).toBe('capa&outra=1.webp');
  expect(url.searchParams.has('outra')).toBe(false);
});
