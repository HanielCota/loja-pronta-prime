/**
 * O atributo do `<html>` que o perfil (Aparência) liga pra pedir menos movimento, além do pedido
 * do próprio aparelho.
 */
export const REDUCED_MOTION_ATTRIBUTE = { name: 'data-motion', value: 'reduce' } as const;

/**
 * Pra animações feitas em JavaScript (o mascote, rolagens suaves): menos movimento se o aparelho
 * pede ou se ela ligou no perfil. Lido na hora, então acompanha a troca sem recarregar.
 */
export function prefersReducedMotion(): boolean {
  return (
    document.documentElement.getAttribute(REDUCED_MOTION_ATTRIBUTE.name) ===
      REDUCED_MOTION_ATTRIBUTE.value ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
