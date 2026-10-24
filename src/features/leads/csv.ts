import { EMPTY_LEAD, leadSchema, type LeadInput } from './model';

export const CSV_HEADERS = [
  'nome',
  'email',
  'whatsapp',
  'origem',
  'produto',
  'etapa',
  'proximo_contato',
  'etiquetas',
  'motivo_perda',
] as const;
export const MAX_IMPORT_ROWS = 1000;

/**
 * O Excel do Windows salva CSV em Windows-1252, não UTF-8. Ler tudo como UTF-8 trocava "João" por
 * "Jo?o" em silêncio e gravava o nome estragado. Tenta UTF-8 estrito e, se o arquivo não for
 * UTF-8 válido, lê como Windows-1252 (o formato do Excel em português).
 */
export function decodeLeadCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Aceita CSV do Excel (; ou ,), aspas escapadas e notas com quebra de linha. */
export function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === '"') {
      if (cell || closed) throw new Error('Aspas fora do lugar na planilha.');
      quoted = true;
    } else if (char === delimiter || char === '\n' || char === '\r') {
      row.push(cell);
      cell = '';
      closed = false;
      if (char !== delimiter) {
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
        if (char === '\r' && text[i + 1] === '\n') i++;
        if (rows.length > MAX_IMPORT_ROWS + 1)
          throw new Error(`Envie até ${MAX_IMPORT_ROWS} contatos por vez.`);
      }
    } else {
      if (closed) throw new Error('Há texto depois das aspas na planilha.');
      cell += char;
    }
  }
  if (quoted) throw new Error('Faltou fechar as aspas na planilha.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function readLeadCsv(content: string): { leads: LeadInput[]; errors: string[] } {
  const [headers, ...rows] = parseCsv(content);
  if (!headers || !rows.length)
    throw new Error('A planilha precisa ter cabeçalho e pelo menos um contato.');
  if (rows.length > MAX_IMPORT_ROWS)
    throw new Error(`Envie até ${MAX_IMPORT_ROWS} contatos por vez.`);
  const names = headers.map((name) => name.trim().toLowerCase());
  if (new Set(names).size !== names.length) throw new Error('A planilha tem colunas repetidas.');
  if (!names.includes('nome') || (!names.includes('email') && !names.includes('whatsapp')))
    throw new Error('Use as colunas nome e email ou whatsapp. Baixe o modelo para começar.');
  const unknown = names.filter(
    (name) => !CSV_HEADERS.includes(name as (typeof CSV_HEADERS)[number]),
  );
  if (unknown.length)
    throw new Error(`Colunas não reconhecidas: ${unknown.join(', ')}. Use o modelo do painel.`);
  const leads: LeadInput[] = [],
    errors: string[] = [];
  rows.forEach((row, index) => {
    if (row.length !== names.length) {
      errors.push(`Linha ${index + 2}: quantidade de colunas diferente do cabeçalho.`);
      return;
    }
    const values = Object.fromEntries(names.map((name, col) => [name, row[col]?.trim() ?? '']));
    const parsed = leadSchema.safeParse({
      ...EMPTY_LEAD,
      name: values.nome,
      email: values.email ?? '',
      phone: values.whatsapp ?? '',
      source: values.origem || 'Planilha',
      product: values.produto || 'undecided',
      stage: values.etapa || 'new',
      nextContact: values.proximo_contato ?? '',
      tags: values.etiquetas ?? '',
      lostReason: values.motivo_perda ?? '',
    });
    if (parsed.success) leads.push(parsed.data);
    else
      errors.push(
        `Linha ${index + 2}: ${parsed.error.issues.map((issue) => issue.message).join(' ')}`,
      );
  });
  return { leads, errors };
}

/** A exportação não pode transformar conteúdo de um contato em fórmula ao abrir no Excel. */
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function writeCsv(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}
