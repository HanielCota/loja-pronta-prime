// Generate the Shopee review PDF from the adjacent Markdown source.
// Usage: bun docs/shopee-auditoria/gerar-pdf.ts
import { chromium } from 'playwright';

const folder = import.meta.dir;
const source = `${folder}/security-overview.md`;
const target = `${folder}/security-overview.pdf`;

const markdown = await Bun.file(source).text();
const body = Bun.markdown.html(markdown, { tables: true });

// Use document typography; the platform UI design does not apply to a review PDF.
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  body { font: 10.5pt/1.5 Helvetica, Arial, sans-serif; color: #1d1d1f; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; border-bottom: 1px solid #ddd; padding-bottom: 3pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9.5pt; }
  th, td { border: 1px solid #ccc; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; }
  code { font: 9pt Menlo, Consolas, monospace; background: #f4f4f4; padding: 0 2pt; }
  pre { background: #f4f4f4; padding: 8pt; font-size: 8.5pt; overflow: hidden; }
  pre code { background: none; }
  h2, table, pre { break-inside: avoid; }
  h2 { break-after: avoid; }
  p { orphans: 3; widows: 3; }
</style></head><body>${body}</body></html>`;

// Prefer the project Chromium version, falling back to an installed headless shell.
async function launch() {
  try {
    return await chromium.launch();
  } catch (error) {
    const glob = new Bun.Glob(
      'chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell',
    );
    const cache = `${process.env.HOME}/.cache/ms-playwright`;
    for await (const path of glob.scan({ cwd: cache })) {
      return chromium.launch({ executablePath: `${cache}/${path}` });
    }
    throw error;
  }
}

const browser = await launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: target,
  format: 'A4',
  margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="font-size:8pt;width:100%;text-align:center;color:#888">Loja Pronta Prime — Security Overview — <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
});
await browser.close();
console.log(`Generated PDF: ${target}`);
