import { MonitorIcon, SmartphoneIcon, TabletIcon } from 'lucide-react';
import { deviceSummary, type DeviceInfo } from '@/features/presence/device';

const ICONS = { mobile: SmartphoneIcon, tablet: TabletIcon, desktop: MonitorIcon } as const;

/**
 * O aparelho numa linha: o ícone e o tipo (celular, tablet, computador) e, embaixo, o modelo, o
 * sistema e o navegador. O ícone só reforça: o tipo também vem escrito.
 */
export function DeviceLabel({ device }: { device: DeviceInfo | null }) {
  if (!device) return <span className="text-sm text-muted-foreground">Sem informação</span>;
  const Icon = ICONS[device.kind];
  const summary = deviceSummary(device);
  return (
    <span className="flex min-w-0 items-start gap-2">
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-col">
        <span className="text-body text-foreground">{device.kindLabel}</span>
        {summary ? (
          <span className="text-sm text-pretty break-words text-muted-foreground">{summary}</span>
        ) : null}
      </span>
    </span>
  );
}
