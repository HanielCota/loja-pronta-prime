/**
 * Valor que o editor mostra: o do rascunho quando ele mexeu no campo, senão o publicado. No
 * rascunho, `null` quer dizer "a admin apagou" (é assim que a publicação lê) e só `undefined`
 * quer dizer "não mexeu". Com `??`, o campo apagado voltava ao valor publicado depois de salvar,
 * e o próximo "Salvar rascunho" desfazia a limpeza.
 */
export function draftOrLive<Value>(
  draft: Value | null | undefined,
  live: Value | null | undefined,
): Value | null | undefined {
  return draft !== undefined ? draft : live;
}
