import { describe, expect, test } from 'bun:test';
import { csvCell, parseCsv, readLeadCsv, writeCsv } from './csv';
import {
  EMPTY_LEAD,
  leadSchema,
  leadTags,
  leadRecord,
  parseLeadFilters,
  todayInBrazil,
} from './model';

describe('cadastro de leads', () => {
  test('contatos encerrados saem dos retornos e dados opcionais vazios viram nulos', () => {
    const input = leadSchema.parse({
      ...EMPTY_LEAD,
      name: 'Ana',
      email: 'ana@example.com',
      stage: 'won',
      nextContact: '2026-10-08',
    });
    expect(leadRecord(input).nextContact).toBeNull();
    expect(leadRecord(input).phone).toBeNull();
    expect(leadRecord(input).ownerId).toBeNull();
    expect(leadRecord({ ...input, stage: 'new' }).nextContact).toBe('2026-10-08');
  });
  test('exige um meio de contato e normaliza os dados usados para duplicados', () => {
    expect(leadSchema.safeParse({ ...EMPTY_LEAD, name: 'Ana' }).success).toBe(false);
    const parsed = leadSchema.parse({
      ...EMPTY_LEAD,
      name: ' Ana ',
      email: ' ANA@EXAMPLE.COM ',
      phone: '+55 (11) 98765-4321',
    });
    expect(parsed.name).toBe('Ana');
    expect(parsed.email).toBe('ana@example.com');
    expect(parsed.phone).toBe('11987654321');
    expect(leadSchema.safeParse({ ...EMPTY_LEAD, name: 'Ana', email: 'invalido' }).success).toBe(
      false,
    );
  });
  test('recusa etapas, produtos, datas e números inválidos', () => {
    for (const invalid of [
      { stage: 'fake' },
      { product: 'fake' },
      { nextContact: '2026-02-30' },
      { nextContact: '08/10/2026' },
      { phone: '123' },
    ])
      expect(
        leadSchema.safeParse({ ...EMPTY_LEAD, name: 'Ana', email: 'ana@example.com', ...invalid })
          .success,
      ).toBe(false);
    expect(
      leadSchema.safeParse({
        ...EMPTY_LEAD,
        name: 'Ana',
        email: 'ana@example.com',
        nextContact: '2026-10-08',
      }).success,
    ).toBe(true);
  });
  test('exige motivo ao encerrar sem interesse', () => {
    expect(
      leadSchema.safeParse({ ...EMPTY_LEAD, name: 'Ana', email: 'ana@example.com', stage: 'lost' })
        .success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({
        ...EMPTY_LEAD,
        name: 'Ana',
        email: 'ana@example.com',
        stage: 'lost',
        lostReason: 'Não é o momento',
      }).success,
    ).toBe(true);
  });
  test('data de retorno usa São Paulo e etiquetas não se repetem', () => {
    expect(todayInBrazil(new Date('2026-10-09T01:30:00Z'))).toBe('2026-10-08');
    expect(leadTags(' vip, indicação, vip, ')).toEqual(['vip', 'indicação']);
  });
  test('filtros desconhecidos e paginação inválida têm reserva', () => {
    const filters = parseLeadFilters(
      new URLSearchParams('etapa=invalid&produto=invalid&pagina=-9&retornos=hoje&arquivados=sim'),
    );
    expect(filters.stage).toBe('');
    expect(filters.product).toBe('');
    expect(filters.page).toBe(1);
    expect(filters.due).toBe(true);
    expect(filters.archived).toBe(true);
  });
});

describe('planilha de leads', () => {
  test('aceita UTF-8, Excel, Google Sheets, aspas e linhas dentro de células', () => {
    expect(
      parseCsv(
        '\uFEFFnome;email;origem\r\n"Ana; Maria";ana@example.com;"Um ""anúncio""\nnovo"\r\n',
      ),
    ).toEqual([
      ['nome', 'email', 'origem'],
      ['Ana; Maria', 'ana@example.com', 'Um "anúncio"\nnovo'],
    ]);
    expect(readLeadCsv('nome,email\nAna,ana@example.com').leads[0]?.source).toBe('Planilha');
  });
  test('valida todas as linhas sem ocultar linhas inválidas', () => {
    const result = readLeadCsv('nome;email;whatsapp\nAna;ana@example.com;\nBia;invalido;');
    expect(result.leads.length).toBe(1);
    expect(result.errors[0]).toContain('Linha 3');
    expect(readLeadCsv('nome;whatsapp\nBia;11987654321').errors).toEqual([]);
  });
  test('recusa formato incorreto e planilha grande demais', () => {
    expect(() => parseCsv('nome;email\n"Ana;ana@example.com')).toThrow();
    expect(() => readLeadCsv('nome;nome;email\nAna;Ana;ana@example.com')).toThrow();
    expect(() => readLeadCsv('nome;telefone\nAna;123')).toThrow();
    expect(() => readLeadCsv('nome;email\n' + 'Ana;ana@example.com\n'.repeat(1001))).toThrow();
    expect(readLeadCsv('nome;email\nAna;ana@example.com;extra').errors).toHaveLength(1);
  });
  test('exportação escapa aspas e impede fórmulas em células', () => {
    for (const value of ['=HYPERLINK("url")', '+123', '-cmd', '@SUM(1)', '  =2+2', '\tformula'])
      expect(csvCell(value)).toStartWith('"\'');
    expect(csvCell('Ana "Maria"')).toBe('"Ana ""Maria"""');
    expect(
      parseCsv(
        writeCsv([
          ['nome', 'email'],
          ['Ana', 'ana@example.com'],
        ]),
      ),
    ).toEqual([
      ['nome', 'email'],
      ['Ana', 'ana@example.com'],
    ]);
  });
});
