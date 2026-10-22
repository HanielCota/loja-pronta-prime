/** One calendar year in the report's explicit UTC offset, including leap-day clamping. */
export function purchaseExpiresAt(purchasedAt: Date, utcOffset = '-03:00'): Date {
  const sign = utcOffset[0] === '-' ? -1 : 1;
  const offset = sign * (Number(utcOffset.slice(1, 3)) * 60 + Number(utcOffset.slice(4))) * 60_000;
  const wall = new Date(purchasedAt.getTime() + offset);
  const month = wall.getUTCMonth();
  wall.setUTCFullYear(wall.getUTCFullYear() + 1);
  if (wall.getUTCMonth() !== month) wall.setUTCDate(0);
  return new Date(wall.getTime() - offset);
}
