type CardHeadingProps = {
  title: string;
  description: string;
  /** Linha pequena acima do título, pra dizer onde ela está (ex.: o nome do produto). */
  eyebrow?: string;
};

export function CardHeading({ title, description, eyebrow }: CardHeadingProps) {
  return (
    <div className="mb-8 flex flex-col gap-2 text-center short:mb-4">
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-title font-semibold text-balance sm:text-title-lg short:text-title">
        {title}
      </h1>
      <p className="text-body text-pretty text-muted-foreground">{description}</p>
    </div>
  );
}
