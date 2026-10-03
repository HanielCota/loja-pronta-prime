import { cn } from '@/lib/utils';

type CardHeadingProps = {
  title: string;
  description: string;
  /** Ajustes de quem usa (ex.: `mb-0` quando o espaço já vem do layout). */
  className?: string;
};

export function CardHeading({ title, description, className }: CardHeadingProps) {
  return (
    <div className={cn('mb-8 flex flex-col gap-2 text-center short:mb-4', className)}>
      <h1 className="text-title font-semibold text-balance sm:text-title-lg short:text-title">
        {title}
      </h1>
      <p className="text-body text-pretty text-muted-foreground">{description}</p>
    </div>
  );
}
