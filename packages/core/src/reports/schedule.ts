/** True during the Monday 08:00–08:59 hour in `timeZone`. */
export function isLocalMondayDigestHour(
  timeZone: string,
  now: Date = new Date(),
): boolean {
  const zone = timeZone.trim() || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    return weekday === "Mon" && hour === 8;
  } catch {
    if (zone === "UTC") return false;
    return isLocalMondayDigestHour("UTC", now);
  }
}
