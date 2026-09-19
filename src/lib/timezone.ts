import { getCalendars } from 'expo-localization';

// The device's timezone, e.g. "Europe/Helsinki". Falls back to UTC.
export function deviceTimezone(): string {
  return getCalendars()[0]?.timeZone ?? 'UTC';
}
