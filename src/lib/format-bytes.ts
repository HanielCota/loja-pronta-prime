/** Tamanho de arquivo do jeito que se lê no Brasil: "850 KB", "2,3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB`;
  }
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}
