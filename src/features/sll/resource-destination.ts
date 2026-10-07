/** Classifica destinos publicados sem tratar um protocolo relativo como rota interna. */
export function isInternalSllDestination(destination: string) {
  return destination.startsWith('/') && !destination.startsWith('//');
}

/** Os GPTs publicados no SLL pertencem ao ChatGPT externo, não à execução interna da Prime. */
export function isChatGptDestination(destination: string) {
  return destination.startsWith('https://chatgpt.com/');
}
