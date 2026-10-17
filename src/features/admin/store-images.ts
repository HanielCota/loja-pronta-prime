/** Only saved PNG objects in this account's logo folder can appear in its preview. */
export function isStoreLogoKey(userId: string, key: unknown): key is string {
  const owner = userId.replace(/[^\w-]/g, '');
  if (!owner || typeof key !== 'string' || key.length > 200) return false;
  const prefix = `logos/${owner}/`;
  if (!key.startsWith(prefix)) return false;
  const fileName = key.slice(prefix.length);
  return /^[\w.-]+\.png$/.test(fileName) && !fileName.includes('..');
}
