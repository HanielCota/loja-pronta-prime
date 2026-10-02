export function CardHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8 flex flex-col gap-2 text-center">
      <h1 className="text-title font-semibold text-balance sm:text-title-lg">{title}</h1>
      <p className="text-body text-pretty text-muted-foreground">{description}</p>
    </div>
  );
}
