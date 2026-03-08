/**
 * Timezone-aware date/time formatting for FanXI.
 * Uses native Intl API — zero dependencies.
 */

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Returns the abbreviated timezone name (e.g. "BST", "CEST", "EST").
 */
function getTzAbbr(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/**
 * Formats a UTC ISO string into a human-readable local time string.
 *
 * Examples:
 *   "Today · 19:00 BST"
 *   "Tomorrow · 14:00 CEST"
 *   "Thu 11 Jun · 20:00 UTC"
 */
export function formatMatchTime(
  utcDateString: string,
  options: { showDate?: boolean; showTimezone?: boolean } = {},
): string {
  const { showDate = true, showTimezone = true } = options;
  const d = new Date(utcDateString);
  if (isNaN(d.getTime())) return utcDateString;

  const tz = getUserTimezone();

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-GB', { timeZone: tz });
  const matchDateStr = d.toLocaleDateString('en-GB', { timeZone: tz });

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-GB', { timeZone: tz });

  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  });

  const tzAbbr = showTimezone ? getTzAbbr(d, tz) : '';

  let datePart = '';
  if (showDate) {
    if (matchDateStr === todayStr) {
      datePart = 'Today';
    } else if (matchDateStr === tomorrowStr) {
      datePart = 'Tomorrow';
    } else {
      datePart = d.toLocaleDateString('en-GB', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
  }

  const timePart = tzAbbr ? `${timeStr} ${tzAbbr}` : timeStr;
  return datePart ? `${datePart} · ${timePart}` : timePart;
}

/**
 * Formats just the date portion for a section heading.
 * e.g. "Thursday, 11 June" or "Today" / "Tomorrow"
 */
export function formatMatchDateHeading(utcDateString: string): string {
  const d = new Date(utcDateString);
  if (isNaN(d.getTime())) return utcDateString;

  const tz = getUserTimezone();
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-GB', { timeZone: tz });
  const matchDateStr = d.toLocaleDateString('en-GB', { timeZone: tz });
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-GB', { timeZone: tz });

  if (matchDateStr === todayStr) return 'Today';
  if (matchDateStr === tomorrowStr) return 'Tomorrow';

  return d.toLocaleDateString('en-GB', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Returns the time-only string in local timezone (no date prefix).
 * e.g. "19:00 BST"
 */
export function formatMatchTimeOnly(utcDateString: string): string {
  return formatMatchTime(utcDateString, { showDate: false, showTimezone: true });
}

/**
 * Timezone label for display in headers.
 * e.g. "Times in BST"
 */
export function getTimezoneLabel(): string {
  const tz = getUserTimezone();
  const abbr = getTzAbbr(new Date(), tz);
  return abbr ? `Times in ${abbr}` : `Times in ${tz}`;
}
