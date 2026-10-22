import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareSalesHistory } from '../src/features/hotmart/sales-history';

const args = process.argv.slice(2);
const allowed = ['--input=', '--output=', '--as-of=', '--utc-offset=', '--python='];
if (args.some((arg) => !allowed.some((prefix) => arg.startsWith(prefix))))
  throw new Error('Unsupported option. This command prepares files only and never applies access.');
for (const prefix of allowed) {
  if (args.filter((arg) => arg.startsWith(prefix)).length > 1)
    throw new Error('Duplicate command option.');
}
const option = (prefix: string) => args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
const input = option('--input=');
const output = option('--output=');
const asOf = option('--as-of=');
const utcOffset = option('--utc-offset=');
if (!input || !output || !asOf || !utcOffset || !/(Z|[+-]\d{2}:\d{2})$/.test(asOf))
  throw new Error(
    'Usage: bun scripts/prepare-sales-history.ts --input=/path/report.xls --output=/private/new-directory --as-of=ISO_TIMESTAMP --utc-offset=-03:00 [--python=/path/python3]',
  );
const source = await readFile(input);
const extractor = fileURLToPath(new URL('./extract-sales-history.py', import.meta.url));
const extracted = Bun.spawnSync([option('--python=') ?? 'python3', extractor, path.resolve(input)]);
if (extracted.exitCode !== 0) throw new Error('Source extraction failed. No import files written.');
const prepared = prepareSalesHistory(
  JSON.parse(extracted.stdout.toString()),
  new Date(asOf),
  utcOffset,
);
const manifest = {
  formatVersion: 1,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  ...prepared.summary,
  accessTerm: 'One calendar year from the original purchase, at the report UTC offset.',
  databaseApplied: false,
  applicationPrerequisites: [
    'Resolve each numeric source product ID to its canonical Hotmart ucode and expert. Never use a numeric ID as a ucode.',
    'Implement and verify purchase-based expiry in server access checks before granting access. The current schema does not store expiry.',
    'Recalculate eligibility at application time. Expired purchases must not grant access.',
    'Reconcile existing transactions, refunds, account ownership, bans, roles and administrative revocations against the destination.',
    'Preserve existing passwords, purchases and manual grants. Never grant Loja Pronta from this report.',
    'Review quarantined rows separately. Never repair buyer emails by guessing.',
    'Record the source fingerprint and import audit trail, and verify idempotent reruns.',
  ],
};
// A new private directory prevents accidental replacement of a previous preparation.
await mkdir(path.dirname(path.resolve(output)), { recursive: true, mode: 0o700 });
await mkdir(output, { mode: 0o700 });
await chmod(output, 0o700);
for (const [filename, content] of [
  ['manifest.json', manifest],
  ['purchases.json', prepared.purchases],
  ['review.json', prepared.review],
] as const) {
  await writeFile(path.join(output, filename), JSON.stringify(content, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
}
console.info(JSON.stringify(manifest, null, 2));
