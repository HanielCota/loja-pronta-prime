import { describe, expect, test } from 'bun:test';
import {
  advertisingLimits,
  calculateSale,
  simulateDiscount,
  suggestPrice,
  type SaleCosts,
} from './calculations';
import { feeAt, type FeePolicy } from './fees';
import { parseDecimalInput, formatMoney, formatRoas } from './number-input';
import { readCalculatorInput } from './form-input';
import { ASSISTANT_GUIDES, ORIGINAL_MATERIALS, resourceHref } from './catalog';
import { initialSllContent } from '../initial-content';

const policy: FeePolicy = { mode: 'shopee', seller: 'cnpj', moreThan450Orders: false };
const costs: SaleCosts = {
  policy,
  productCents: 2000,
  packagingCents: 200,
  shippingCents: 0,
  otherCents: 0,
  advertisingCents: 0,
  taxBps: 0,
  extraFeeBps: 0,
};

describe('simulações SLL', () => {
  test('preserva as faixas oficiais e o ajuste de outubro, inclusive um centavo antes e depois', () => {
    for (const [price, commission, fixed] of [
      [7999, 1600, 450],
      [8000, 1120, 1600],
      [9999, 1400, 1600],
      [10000, 1400, 2000],
      [19999, 2800, 2000],
      [20000, 2800, 2600],
      [49999, 7000, 2600],
      [50000, 7000, 2600],
      [898, 180, 449],
      [900, 180, 450],
    ] as const)
      expect(feeAt(price, policy)).toEqual({ commissionCents: commission, fixedCents: fixed });
    expect(feeAt(1200, { mode: 'shopee', seller: 'cpf', moreThan450Orders: true })).toEqual({
      commissionCents: 240,
      fixedCents: 750,
    });
    expect(
      feeAt(1200, { mode: 'shopee', seller: 'cpf', moreThan450Orders: false }).fixedCents,
    ).toBe(450);
    expect(() => feeAt(1199, { mode: 'shopee', seller: 'cpf', moreThan450Orders: true })).toThrow(
      'personalizadas',
    );
    expect(() => feeAt(899, { mode: 'shopee', seller: 'cpf', moreThan450Orders: false })).toThrow(
      'personalizadas',
    );
  });
  test('reconcilia custos e margem por unidade', () => {
    const sale = calculateSale(5000, {
      ...costs,
      taxBps: 600,
      extraFeeBps: 200,
      advertisingCents: 500,
    });
    expect(sale.totalCents).toBe(4550);
    expect(sale.profitCents).toBe(450);
    expect(sale.marginPercent).toBe(9);
    expect(sale.priceCents).toBe(sale.totalCents + sale.profitCents);
    expect(formatMoney(sale.profitCents)).toContain('4,50');
  });
  test('calcula desconto, depois cupom e reconfere a faixa de taxa no preço final', () => {
    const result = simulateDiscount(10000, 1000, 1000, costs);
    expect(result.discounted.priceCents).toBe(8000);
    expect(result.discounted.fixedCents).toBe(1600);
    expect(result.profitDifferenceCents).toBe(
      result.discounted.profitCents - result.original.profitCents,
    );
    expect(() => simulateDiscount(1000, 9000, 100, costs)).toThrow('maior que zero');
    expect(calculateSale(1000, costs).profitCents).toBeLessThan(0);
  });
  test('preço recomendado encontra o primeiro valor com margem em todas as faixas', () => {
    const examples = [
      costs,
      { ...costs, productCents: 4300 },
      { ...costs, productCents: 12000, taxBps: 599, extraFeeBps: 215 },
      { ...costs, productCents: 15, packagingCents: 0 },
      { ...costs, policy: { mode: 'custom', commissionBps: 1833, fixedCents: 499 } as FeePolicy },
    ];
    for (const example of examples) {
      const margin = 2000;
      const recommended = suggestPrice(example, margin);
      expect(recommended.profitCents).toBeGreaterThanOrEqual(
        Math.ceil((recommended.priceCents * margin) / 10000),
      );
      let first = 1;
      while (calculateSale(first, example).profitCents < Math.ceil((first * margin) / 10000))
        first++;
      expect(recommended.priceCents).toBe(first);
    }
    expect(() => suggestPrice({ ...costs, taxBps: 8000 }, 2000)).toThrow('não há preço');
  });
  test('o gasto existente não é subtraído duas vezes na verba de anúncios', () => {
    const limits = advertisingLimits(5000, { ...costs, advertisingCents: 1500 }, 2000);
    expect(limits.breakEvenBudgetCents).toBe(1350);
    expect(limits.targetBudgetCents).toBe(350);
    expect(limits.breakEvenRoas).toBeCloseTo(5000 / 1350);
    expect(formatRoas(2.714)).toBe('2,72');
    expect(formatRoas(5000 / 350)).toBe('14,29');
    expect(advertisingLimits(1000, costs, 2000).breakEvenRoas).toBeNull();
    expect(advertisingLimits(5000, costs, 5000).targetRoas).toBeNull();
  });
  test('recusa valores não finitos, negativos, fracionários em centavos e percentuais impossíveis', () => {
    for (const value of [-1, NaN, Infinity, 0, 1.5, 100000001])
      expect(() => calculateSale(value, costs)).toThrow();
    expect(() => calculateSale(5000, { ...costs, productCents: -1 })).toThrow();
    expect(() =>
      calculateSale(5000, {
        ...costs,
        policy: { mode: 'custom', commissionBps: 10001, fixedCents: 0 },
      }),
    ).toThrow();
    expect(() => suggestPrice(costs, 10000)).toThrow();
  });
});

describe('entrada e destinos das ferramentas', () => {
  test('aceita vírgula e ponto sem transformar vazio ou notação ambígua em dinheiro', () => {
    expect(parseDecimalInput(' 12,34 ')).toBe(1234);
    expect(parseDecimalInput('12.3')).toBe(1230);
    expect(parseDecimalInput('0')).toBe(0);
    for (const raw of ['', '1.234,56', '-1', '1e3', 'NaN', '1,234', '1.2.3', '0x10'])
      expect(parseDecimalInput(raw)).toBeNull();
  });
  test('valida campos obrigatórios e preserva zero explícito', () => {
    const form = new FormData();
    form.set('policy', 'custom');
    form.set('commission', '0');
    form.set('fixed', '0');
    form.set('product', '10,50');
    form.set('margin', '20');
    const result = readCalculatorInput(form, 'price');
    expect(result.errors).toEqual({});
    expect(result.costs.productCents).toBe(1050);
    expect(result.costs.packagingCents).toBe(0);
    form.set('commission', '');
    expect(readCalculatorInput(form, 'price').errors.commission).toBeDefined();
    form.set('policy', 'javascript:');
    expect(readCalculatorInput(form, 'price').errors.policy).toBeDefined();
  });
  test('os guias levam a aulas reais e não mudam destinos de parceiros ou recursos em breve', () => {
    const content = initialSllContent();
    const slugs = new Set(
      content.tracks.flatMap((track) =>
        track.stages.flatMap((stage) =>
          stage.modules.flatMap((module) => module.lessons.map((lesson) => lesson.slug)),
        ),
      ),
    );
    for (const guide of Object.values(ASSISTANT_GUIDES))
      for (const slug of guide.lessonSlugs) expect(slugs.has(slug)).toBe(true);
    for (const material of ORIGINAL_MATERIALS) expect(slugs.has(material.lessonSlug)).toBe(true);
    expect(resourceHref({ slug: 'mentora-pri', destination: 'https://chatgpt.com/' })).toBe(
      '/sll/recursos/assistentes/mentora-pri',
    );
    expect(resourceHref({ slug: 'mentora-pri', destination: null })).toBeNull();
    expect(resourceHref({ slug: 'bling', destination: 'https://www.bling.com.br/' })).toBe(
      'https://www.bling.com.br/',
    );
  });
});
