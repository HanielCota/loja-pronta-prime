import type { DeviceKind } from '@/features/presence/device';

/** Um aparelho com a conta aberta, pronto pra lista do perfil. */
export type AccountDevice = {
  id: string;
  kind: DeviceKind;
  /** "Celular", "Tablet" ou "Computador". */
  kindLabel: string;
  /** "Android 14 · Chrome 129" (vazio quando o navegador não conta nada). */
  summary: string;
  signedInAt: Date;
  current: boolean;
};
