/** Uma barra com a mesma leitura visual e acessível nas aulas, etapas e cursos do SLL. */
export function SllProgress({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) {
  return (
    <progress
      aria-label={label}
      aria-valuetext={`${completed} de ${total} concluídas`}
      className="block h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-progress-track forced-colors:border forced-colors:border-[CanvasText] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-progress forced-colors:[&::-moz-progress-bar]:bg-[Highlight] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-progress-track [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-progress motion-safe:[&::-webkit-progress-value]:transition-[width] motion-safe:[&::-webkit-progress-value]:duration-300 forced-colors:[&::-webkit-progress-value]:bg-[Highlight]"
      max={total || 1}
      value={completed}
    >
      {completed} de {total} concluídas
    </progress>
  );
}
