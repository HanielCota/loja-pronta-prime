import { BlockList, isIP } from 'node:net';

const reserved = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  reserved.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const)
  reserved.addSubnet(address, prefix, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

/** Só destinos públicos. O transporte fixa o IP resolvido na conexão TLS. */
export function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    return !reserved.check(address, 'ipv4');
  }
  if (isIP(address) === 6)
    return globalV6.check(address, 'ipv6') && !reserved.check(address, 'ipv6');
  return false;
}

export function allowedRemoteUrl(value: string, hosts: string[]) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== '443') ||
    !hosts.includes(url.hostname) ||
    isIP(url.hostname)
  )
    throw new Error('Endereço remoto não permitido.');
  return url;
}
