import { describe, expect, test } from 'bun:test';
import { describeDevice, deviceClientSchema, deviceDetails, deviceSummary } from './device';

const deviceSchemaSafe = (value: unknown) => deviceClientSchema.safeParse(value).success;

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.12.235 (iPhone14,5; iOS 17_4; pt_BR; pt; scale=3.00; 1170x2532; 600000000)',
  androidSamsung:
    'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidChromeReduced:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 12; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
};

describe('describeDevice', () => {
  test('iPhone com o Safari', () => {
    expect(describeDevice(UA.iphone)).toEqual({
      kind: 'mobile',
      kindLabel: 'Celular',
      os: 'iOS 17.5',
      model: 'iPhone',
      browser: 'Safari 17.5',
      inApp: null,
    });
  });

  test('link aberto dentro do Instagram', () => {
    const device = describeDevice(UA.iphoneInstagram);
    expect(device.inApp).toBe('Instagram');
    expect(deviceSummary(device)).toBe('iPhone · iOS 17.4 · no Instagram');
  });

  test('Samsung com o navegador da Samsung', () => {
    expect(describeDevice(UA.androidSamsung)).toMatchObject({
      kind: 'mobile',
      os: 'Android 13',
      model: 'Samsung SM-A546E',
      browser: 'Samsung Internet 25',
    });
  });

  test('Chrome novo esconde o modelo; as dicas do navegador contam', () => {
    expect(describeDevice(UA.androidChromeReduced).model).toBeNull();
    expect(
      describeDevice(UA.androidChromeReduced, {
        platform: 'Android',
        platformVersion: '14.0.0',
        model: 'SM-S918B',
        mobile: true,
      }),
    ).toMatchObject({ os: 'Android 14', model: 'Samsung SM-S918B', browser: 'Chrome 129' });
  });

  test('tablet Android (sem "Mobile") e iPad que se apresenta como Mac', () => {
    expect(describeDevice(UA.androidTablet).kind).toBe('tablet');
    expect(describeDevice(UA.macSafari, { maxTouchPoints: 5 })).toMatchObject({
      kind: 'tablet',
      kindLabel: 'Tablet',
      os: 'iPadOS',
      model: 'iPad',
    });
  });

  test('computadores', () => {
    expect(describeDevice(UA.windowsChrome)).toMatchObject({
      kind: 'desktop',
      os: 'Windows 10 ou 11',
      browser: 'Chrome 129',
    });
    expect(
      describeDevice(UA.windowsEdge, { platform: 'Windows', platformVersion: '15.0.0' }),
    ).toMatchObject({ os: 'Windows 11', browser: 'Edge 129' });
    expect(describeDevice(UA.macSafari)).toMatchObject({ os: 'macOS', browser: 'Safari 18' });
    expect(describeDevice(UA.firefoxLinux)).toMatchObject({ os: 'Linux', browser: 'Firefox 131' });
  });

  test('sem user agent, não inventa', () => {
    expect(describeDevice(null)).toEqual({
      kind: 'desktop',
      kindLabel: 'Computador',
      os: null,
      model: null,
      browser: null,
      inApp: null,
    });
  });
});

describe('deviceDetails', () => {
  test('mostra só o que o navegador contou', () => {
    const client = {
      screenWidth: 390,
      screenHeight: 844,
      pixelRatio: 3,
      viewportWidth: 390,
      viewportHeight: 664,
      maxTouchPoints: 5,
      standalone: false,
      theme: 'dark' as const,
      language: 'pt-BR',
      timeZone: 'America/Sao_Paulo',
    };
    expect(deviceDetails(describeDevice(UA.iphone, client), client)).toEqual([
      ['Aparelho', 'Celular · iPhone'],
      ['Sistema', 'iOS 17.5'],
      ['Navegador', 'Safari 17.5'],
      ['Tela', '390 × 844 (densidade 3x)'],
      ['Janela', '390 × 664'],
      ['Toque', 'Sim'],
      ['App instalado', 'Não'],
      ['Tema', 'Escuro'],
      ['Idioma', 'pt-BR'],
      ['Fuso horário', 'America/Sao_Paulo'],
    ]);
  });
});

describe('deviceClientSchema', () => {
  test('recusa valores fora do limite', () => {
    expect(deviceSchemaSafe({ screenWidth: 390, theme: 'dark' })).toBe(true);
    expect(deviceSchemaSafe({ screenWidth: -1 })).toBe(false);
    expect(deviceSchemaSafe({ language: 'x'.repeat(100) })).toBe(false);
    expect(deviceSchemaSafe({ theme: 'roxo' })).toBe(false);
  });
});
