const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** O domínio público vem da configuração, nunca do endereço interno ou de um Host enviado. */
export function isApplicationOrigin(origin: string | null, applicationUrl: string): boolean {
  if (!origin) return false;
  try {
    const expected = new URL(applicationUrl);
    if (origin === expected.origin) return true;
    const received = new URL(origin);
    // localhost e 127.0.0.1 chegam ao mesmo app no desenvolvimento; porta e protocolo continuam iguais.
    return (
      origin === received.origin &&
      LOOPBACK_HOSTS.has(expected.hostname) &&
      LOOPBACK_HOSTS.has(received.hostname) &&
      received.protocol === expected.protocol &&
      received.port === expected.port
    );
  } catch {
    return false;
  }
}
