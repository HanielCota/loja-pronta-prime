import Link from 'next/link';

/**
 * Cobre uma célula com o link da linha, pra linha toda abrir a conta. Antes um link só, esticado a
 * partir do <tr> com position relative, cobria a linha; em navegadores que ignoram isso o link de
 * uma linha cobria a tabela inteira e abria a conta errada. A célula (com `relative`) segura o
 * link em todo navegador. Fica fora do teclado e do leitor de tela: o link do nome já leva lá.
 */
export function RowCellLink({ href }: { href: string }) {
  return <Link aria-hidden="true" className="absolute inset-0" href={href} tabIndex={-1} />;
}
