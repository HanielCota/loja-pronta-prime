/** Primeiro nome pra saudação ("Ana Souza" → "Ana"); vazio se não houver nome. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}
