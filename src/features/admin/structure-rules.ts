/** Cria um endereço legível e estável a partir do nome escrito no admin. */
export function learningSlugFromTitle(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'conteudo'
  );
}
