/**
 * Avança uma mola criticamente amortecida (sem quique) por chave; diz se tudo já assentou.
 * `response` é o tempo de resposta em segundos, como nas molas da Apple (pode variar por chave).
 */
export function springStep<K extends string>(
  value: Record<K, number>,
  velocity: Record<K, number>,
  target: Readonly<Record<K, number>>,
  response: number | ((key: K) => number),
  dt: number,
): boolean {
  let settled = true;
  for (const key of Object.keys(target) as K[]) {
    const omega = (2 * Math.PI) / (typeof response === 'number' ? response : response(key));
    const acceleration = -omega * omega * (value[key] - target[key]) - 2 * omega * velocity[key];
    velocity[key] += acceleration * dt;
    value[key] += velocity[key] * dt;
    if (Math.abs(value[key] - target[key]) > 0.002 || Math.abs(velocity[key]) > 0.01) {
      settled = false;
    }
  }
  return settled;
}
