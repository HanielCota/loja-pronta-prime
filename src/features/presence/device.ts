import { z } from 'zod';

/**
 * O que a página aberta conta sobre o aparelho, junto do aviso de presença. Tudo vem do próprio
 * navegador (sem IP nem localização) e tudo é opcional: navegadores diferentes contam coisas
 * diferentes. Os limites evitam que um aviso forjado encha o banco.
 */
export const deviceClientSchema = z.object({
  /** Largura e altura da tela, em pixels de CSS. */
  screenWidth: z.number().int().min(0).max(20_000).optional(),
  screenHeight: z.number().int().min(0).max(20_000).optional(),
  /** Tamanho da janela (a parte da página que aparece). */
  viewportWidth: z.number().int().min(0).max(20_000).optional(),
  viewportHeight: z.number().int().min(0).max(20_000).optional(),
  pixelRatio: z.number().min(0).max(10).optional(),
  /** Pontos de toque: iPad com o Safari se apresenta como Mac; isso desfaz a confusão. */
  maxTouchPoints: z.number().int().min(0).max(32).optional(),
  language: z.string().max(35).optional(),
  timeZone: z.string().max(64).optional(),
  /** Aberto como app instalado (ícone na tela inicial). */
  standalone: z.boolean().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  /** Tipo de conexão que o navegador estima (4g, 3g...); só o Chrome conta. */
  connection: z.string().max(16).optional(),
  /** Dicas do Chrome e do Edge (mais exatas que o user agent). */
  platform: z.string().max(32).optional(),
  platformVersion: z.string().max(32).optional(),
  model: z.string().max(64).optional(),
  mobile: z.boolean().optional(),
});

export type DeviceClient = z.infer<typeof deviceClientSchema>;

export type DeviceKind = 'mobile' | 'tablet' | 'desktop';

export type DeviceInfo = {
  kind: DeviceKind;
  /** "Celular", "Tablet" ou "Computador". */
  kindLabel: string;
  /** Sistema com versão, quando dá pra saber: "Android 14", "iOS 17.5", "Windows 11". */
  os: string | null;
  /** Modelo do aparelho: "iPhone", "iPad", "Samsung SM-A546E"... */
  model: string | null;
  /** Navegador com a versão principal: "Chrome 129", "Safari 17". */
  browser: string | null;
  /** Dentro de outro app (o link aberto no Instagram, por exemplo). */
  inApp: string | null;
};

const KIND_LABELS: Record<DeviceKind, string> = {
  mobile: 'Celular',
  tablet: 'Tablet',
  desktop: 'Computador',
};

const IN_APP: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB/i, 'Facebook'],
  [/WhatsApp/i, 'WhatsApp'],
  [/musical_ly|TikTok|BytedanceWebview/i, 'TikTok'],
  [/Line\//, 'LINE'],
];

/** Versão com até duas partes, sem o zero final ("17.5.1" vira "17.5"; "14.0" vira "14"). */
function shortVersion(raw: string | undefined, parts = 2): string | null {
  if (!raw) return null;
  const pieces = raw.replace(/_/g, '.').split('.').slice(0, parts);
  while (pieces.length > 1 && pieces.at(-1) === '0') pieces.pop();
  return pieces.join('.');
}

function detectOs(ua: string, client: DeviceClient): string | null {
  // As dicas do Chrome são mais exatas: o user agent congela o Windows em "10" e o Android em "10".
  if (client.platform === 'Windows' && client.platformVersion) {
    const major = Number.parseInt(client.platformVersion, 10);
    return major >= 13 ? 'Windows 11' : 'Windows 10';
  }
  if (client.platform === 'Android' && client.platformVersion) {
    return `Android ${shortVersion(client.platformVersion)}`;
  }
  if (client.platform === 'macOS' && client.platformVersion) {
    return `macOS ${shortVersion(client.platformVersion)}`;
  }

  const ios = /(?:iPhone|iPad|iPod).*?OS (\d+[_.]\d+(?:[_.]\d+)?)/.exec(ua);
  if (ios) return `iOS ${shortVersion(ios[1])}`;
  const android = /Android (\d+(?:\.\d+)?)/.exec(ua);
  if (android) return `Android ${shortVersion(android[1])}`;
  if (/Windows NT 10/.test(ua)) return 'Windows 10 ou 11';
  const windows = /Windows NT (\d+\.\d+)/.exec(ua);
  if (windows) return `Windows (NT ${windows[1]})`;
  if (/CrOS/.test(ua)) return 'ChromeOS';
  const mac = /Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)/.exec(ua);
  if (mac) {
    // iPad com o Safari em modo "computador" diz que é Mac; o toque denuncia.
    if ((client.maxTouchPoints ?? 0) > 1) return 'iPadOS';
    return 'macOS';
  }
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

function detectBrowser(ua: string): string | null {
  const rules: [RegExp, string][] = [
    [/EdgA?\/(\d+)/, 'Edge'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/OPR\/(\d+)/, 'Opera'],
    [/OPiOS\/(\d+)/, 'Opera'],
    [/EdgiOS\/(\d+)/, 'Edge'],
    [/CriOS\/(\d+)/, 'Chrome'],
    [/FxiOS\/(\d+)/, 'Firefox'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+(?:\.\d+)?).*Safari/, 'Safari'],
  ];
  for (const [pattern, name] of rules) {
    const match = pattern.exec(ua);
    if (match) return `${name} ${shortVersion(match[1], name === 'Safari' ? 2 : 1)}`;
  }
  return null;
}

function detectModel(ua: string, client: DeviceClient): string | null {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Macintosh/.test(ua) && (client.maxTouchPoints ?? 0) > 1) return 'iPad';
  const model = client.model?.trim();
  if (model) return /^SM-/i.test(model) ? `Samsung ${model}` : model;
  // Android pelo user agent: "Android 14; SM-A546E Build/..." (o Chrome novo esconde com "K").
  const android = /Android [\d.]+; ([^;)]+?)(?: Build|\))/.exec(ua);
  const fromUa = android?.[1]?.trim();
  if (fromUa && fromUa !== 'K' && !/^wv$/i.test(fromUa)) {
    return /^SM-/i.test(fromUa) ? `Samsung ${fromUa}` : fromUa;
  }
  return null;
}

function detectKind(ua: string, client: DeviceClient): DeviceKind {
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && (client.maxTouchPoints ?? 0) > 1))
    return 'tablet';
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet';
  if (client.mobile === true || /Mobi|iPhone|iPod|Android/.test(ua)) return 'mobile';
  return 'desktop';
}

/** Traduz o user agent e as dicas do navegador no aparelho, em palavras. */
export function describeDevice(userAgent: string | null, client: DeviceClient = {}): DeviceInfo {
  const ua = userAgent ?? '';
  const kind = detectKind(ua, client);
  return {
    kind,
    kindLabel: KIND_LABELS[kind],
    os: detectOs(ua, client),
    model: detectModel(ua, client),
    browser: detectBrowser(ua),
    inApp: IN_APP.find(([pattern]) => pattern.test(ua))?.[1] ?? null,
  };
}

/** Uma linha curta pra listas: "Android 14 · Chrome 129" ou "iOS 17.5 · no Instagram". */
export function deviceSummary(device: DeviceInfo): string {
  const browser = device.inApp ? `no ${device.inApp}` : device.browser;
  return [
    device.model && device.model !== device.kindLabel ? device.model : null,
    device.os,
    browser,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Os detalhes que a tela da conta mostra, já em palavras, na ordem de leitura. */
export function deviceDetails(device: DeviceInfo, client: DeviceClient): [string, string][] {
  const rows: [string, string | null][] = [
    ['Aparelho', device.model ? `${device.kindLabel} · ${device.model}` : device.kindLabel],
    ['Sistema', device.os],
    ['Navegador', device.inApp ? `Dentro do ${device.inApp}` : device.browser],
    [
      'Tela',
      client.screenWidth && client.screenHeight
        ? `${client.screenWidth} × ${client.screenHeight}${client.pixelRatio ? ` (densidade ${client.pixelRatio.toLocaleString('pt-BR')}x)` : ''}`
        : null,
    ],
    [
      'Janela',
      client.viewportWidth && client.viewportHeight
        ? `${client.viewportWidth} × ${client.viewportHeight}`
        : null,
    ],
    [
      'Toque',
      client.maxTouchPoints === undefined ? null : client.maxTouchPoints > 0 ? 'Sim' : 'Não',
    ],
    ['App instalado', client.standalone === undefined ? null : client.standalone ? 'Sim' : 'Não'],
    ['Tema', client.theme ? (client.theme === 'dark' ? 'Escuro' : 'Claro') : null],
    ['Idioma', client.language ?? null],
    ['Fuso horário', client.timeZone ?? null],
    ['Conexão', client.connection ? client.connection.toUpperCase() : null],
  ];
  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}
