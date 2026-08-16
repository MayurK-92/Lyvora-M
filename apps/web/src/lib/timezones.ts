export const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Cairo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export type Timezone = (typeof TIMEZONES)[number];

const LABELS: Record<Timezone, string> = {
  UTC: "UTC",
  "Asia/Kolkata": "India (IST)",
  "Asia/Dubai": "Dubai (GST)",
  "Asia/Singapore": "Singapore",
  "Asia/Shanghai": "China",
  "Asia/Tokyo": "Japan",
  "Europe/London": "London",
  "Europe/Paris": "Paris / Central Europe",
  "Europe/Berlin": "Berlin",
  "Africa/Cairo": "Cairo",
  "America/New_York": "US Eastern",
  "America/Chicago": "US Central",
  "America/Denver": "US Mountain",
  "America/Los_Angeles": "US Pacific",
  "America/Sao_Paulo": "São Paulo",
  "Australia/Sydney": "Sydney",
  "Pacific/Auckland": "Auckland",
};

export function timezoneLabel(value: string): string {
  return LABELS[value as Timezone] ?? value;
}

export function isTimezone(value: string): value is Timezone {
  return (TIMEZONES as readonly string[]).includes(value);
}
