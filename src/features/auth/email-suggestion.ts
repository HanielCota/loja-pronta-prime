const COMMON_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.com.br',
  'outlook.com',
  'outlook.com.br',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'ig.com.br',
  'mail.com',
  'ymail.com',
];

const MAX_DISTANCE = 2;

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution);
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

/** Sugere a correção de domínios digitados errado, como "gmial.com" → "gmail.com". */
export function suggestEmail(value: string): string | undefined {
  const parts = value.trim().toLowerCase().split('@');
  if (parts.length !== 2) return undefined;

  const [local, domain] = parts;
  if (!local || !domain || COMMON_DOMAINS.includes(domain)) return undefined;

  let bestDomain: string | undefined;
  let bestDistance = MAX_DISTANCE + 1;

  for (const candidate of COMMON_DOMAINS) {
    const distance = editDistance(domain, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestDomain = candidate;
    }
  }

  return bestDomain ? `${local}@${bestDomain}` : undefined;
}
