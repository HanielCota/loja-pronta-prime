import { expect, test } from 'bun:test';
import { bannerDraftSchema, bannerLines, escapeSvg, kitIsApproved } from './model';

test('banner text cannot inject SVG or overflow its declared line width', () => {
  expect(escapeSvg('<script a="b">&\'</script>')).toBe(
    '&lt;script a=&quot;b&quot;&gt;&amp;&apos;&lt;/script&gt;',
  );
  const lines = bannerLines('A'.repeat(80) + ' loja com carinho', 28);
  expect(lines.every((line) => line.length <= 28)).toBe(true);
  expect(lines.join('').replaceAll(' ', '')).toBe('A'.repeat(80) + 'lojacomcarinho');
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
