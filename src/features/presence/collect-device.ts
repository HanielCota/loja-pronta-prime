import type { DeviceClient } from './device';

type UserAgentData = {
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ platformVersion?: string; model?: string }>;
};

let highEntropy: Promise<Pick<DeviceClient, 'platformVersion' | 'model'>> | null = null;

/**
 * As dicas detalhadas do Chrome e do Edge (versão do sistema e modelo do Android). Pedidas uma vez
 * só por página aberta; nos outros navegadores, ficam vazias.
 */
function readHighEntropy(data: UserAgentData | undefined) {
  highEntropy ??= (async () => {
    if (!data?.getHighEntropyValues) return {};
    try {
      const values = await data.getHighEntropyValues(['platformVersion', 'model']);
      return {
        ...(values.platformVersion ? { platformVersion: values.platformVersion.slice(0, 32) } : {}),
        ...(values.model ? { model: values.model.slice(0, 64) } : {}),
      };
    } catch {
      return {};
    }
  })();
  return highEntropy;
}

/** O que o navegador conta sobre o aparelho agora (a janela e o tema podem mudar entre avisos). */
export async function collectDevice(): Promise<DeviceClient> {
  const nav = navigator as Navigator & {
    userAgentData?: UserAgentData;
    connection?: { effectiveType?: string };
  };
  const data = nav.userAgentData;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    screenWidth: Math.round(screen.width),
    screenHeight: Math.round(screen.height),
    viewportWidth: Math.round(window.innerWidth),
    viewportHeight: Math.round(window.innerHeight),
    pixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
    maxTouchPoints: Math.min(nav.maxTouchPoints ?? 0, 32),
    language: nav.language?.slice(0, 35),
    ...(timeZone ? { timeZone: timeZone.slice(0, 64) } : {}),
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (nav as Navigator & { standalone?: boolean }).standalone === true,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    ...(nav.connection?.effectiveType
      ? { connection: nav.connection.effectiveType.slice(0, 16) }
      : {}),
    ...(data?.platform ? { platform: data.platform.slice(0, 32) } : {}),
    ...(data?.mobile === undefined ? {} : { mobile: data.mobile }),
    ...(await readHighEntropy(data)),
  };
}
