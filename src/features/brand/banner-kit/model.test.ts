import { expect, test } from 'bun:test';
import { bannerDraftSchema, escapeSvg, kitIsApproved } from './model';

test('banner drafts escape markup and reject unsupported settings', () => {
  expect(escapeSvg('<script a="b">&\'</script>')).toBe(
    '&lt;script a=&quot;b&quot;&gt;&amp;&apos;&lt;/script&gt;',
  );
  expect(
    bannerDraftSchema.safeParse({ title: 'A'.repeat(49), subtitle: 'B', palette: 'violet' })
      .success,
  ).toBe(false);
  expect(
    bannerDraftSchema.safeParse({ title: 'A', subtitle: 'B', palette: 'url(https://invalid)' })
      .success,
  ).toBe(false);
});

test('downloads require approval of the current brand snapshot', () => {
  expect(kitIsApproved({ approvedAt: null, brandFingerprint: 'a' }, 'a')).toBe(false);
  expect(kitIsApproved({ approvedAt: new Date(), brandFingerprint: 'a' }, 'b')).toBe(false);
  expect(kitIsApproved({ approvedAt: new Date(), brandFingerprint: 'a' }, 'a')).toBe(true);
});

test('banner title and subtitle made only of invisible characters are refused', () => {
  for (const title of ['', '   ', '\u200B', '\uFEFF\u00A0'])
    expect(
      bannerDraftSchema.safeParse({ title, subtitle: 'Bem-vinda', palette: 'violet' }).success,
    ).toBe(false);
  const parsed = bannerDraftSchema.parse({
    title: ' Loja\u200B ',
    subtitle: 'Bem-vinda',
    palette: 'violet',
  });
  expect(parsed.title).toBe('Loja');
});
