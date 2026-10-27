import { expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function isolatedRuntime() {
  const directory = await mkdtemp(path.join(tmpdir(), 'banner-fonts-'));
  await mkdir(path.join(directory, 'empty-fonts'));
  await Promise.all([
    cp('assets/fonts', path.join(directory, 'assets/fonts'), { recursive: true }),
    symlink(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir'),
    writeFile(
      path.join(directory, 'fonts.conf'),
      '<fontconfig><dir prefix="relative">empty-fonts</dir>' +
        '<cachedir prefix="relative">cache</cachedir></fontconfig>',
    ),
  ]);
  const bundle = await Bun.build({
    entrypoints: [path.resolve('src/features/brand/banner-kit/server/render.ts')],
    outdir: directory,
    naming: 'render.mjs',
    target: 'node',
    external: ['sharp'],
  });
  if (!bundle.success) throw new AggregateError(bundle.logs, 'Failed to bundle banner renderer.');
  return directory;
}

async function run(directory: string, script: string) {
  // Font discovery is cached globally, so each assertion needs a fresh Node process.
  const child = Bun.spawn(['node', '--input-type=module', '-e', script], {
    cwd: directory,
    env: {
      ...process.env,
      FONTCONFIG_FILE: path.join(directory, 'fonts.conf'),
      FONTCONFIG_PATH: directory,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}

const renderScript = `
  import sharp from 'sharp';
  import { createHash } from 'node:crypto';
  import { renderBanner } from './render.mjs';
  const logo = await sharp({
    create: { width: 64, height: 64, channels: 4, background: '#21628e' },
  }).png().toBuffer();
  const render = (text, variant) => renderBanner({
    title: text, subtitle: text, palette: 'ocean',
  }, text, logo, variant);
  const hash = async (image, region) => createHash('sha256')
    .update(await sharp(image).extract(region).raw().toBuffer()).digest('hex');
`;

test('bundled fonts render distinct regular and bold letters without any system fonts', async () => {
  const directory = await isolatedRuntime();
  try {
    const result = await run(
      directory,
      renderScript +
        `
        // Prove this environment reproduces the original missing-glyph defect first.
        const unregistered = (text) => sharp(Buffer.from(
          '<svg width="200" height="50"><text y="30" font-family="DejaVu Sans">' +
          text + '</text></svg>'
        )).raw().toBuffer();
        const before = (await unregistered('IIII')).equals(await unregistered('WWWW'));
        const results = [];
        for (const variant of ['welcome', 'selection']) {
          // Concurrent first requests must wait for both fonts to finish registering.
          const [narrow, wide] = await Promise.all([render('IIII', variant), render('WWWW', variant)]);
          const left = variant === 'welcome' ? 270 : 48;
          const baseline = variant === 'welcome' ? 90 : 300;
          const region = (top) => ({ left, top, width: 200, height: 32 });
          results.push({
            boldDistinct: await hash(narrow, region(baseline - 27)) !== await hash(wide, region(baseline - 27)),
            regularDistinct: await hash(narrow, region(baseline + 25)) !== await hash(wide, region(baseline + 25)),
            width: (await sharp(wide).metadata()).width,
            height: (await sharp(wide).metadata()).height,
          });
        }
        console.log(JSON.stringify({ before, results }));
      `,
    );
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      before: true,
      results: [
        { boldDistinct: true, regularDistinct: true, width: 750, height: 300 },
        { boldDistinct: true, regularDistinct: true, width: 750, height: 500 },
      ],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

for (const file of ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf']) {
  test(`missing ${file} rejects the export instead of silently generating broken text`, async () => {
    const directory = await isolatedRuntime();
    try {
      await rm(path.join(directory, 'assets/fonts/dejavu', file));
      const result = await run(
        directory,
        renderScript + "await render('Ação e seleção', 'welcome');",
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain(file);
      expect(result.stderr).toContain('ENOENT');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}
