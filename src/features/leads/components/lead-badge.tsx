import { cn } from '@/lib/utils';
import { stageLabels, type LeadInput } from '../model';

export function LeadBadge({ stage }: { stage: LeadInput['stage'] }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium forced-colors:border forced-colors:border-[CanvasText]',
        stage === 'won'
          ? 'bg-muted text-progress-text'
          : stage === 'lost'
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary-soft text-link',
      )}
    >
      {stageLabels[stage]}
    </span>
  );
}
