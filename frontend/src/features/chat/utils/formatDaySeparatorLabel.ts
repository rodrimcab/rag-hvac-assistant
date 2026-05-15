import { sameCalendarDay } from "./sameCalendarDay";

/** Explicit system IANA zone (same default `Intl` would use, but stable if the app stays open across rare TZ changes). */
const SYSTEM_TZ =
  typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  ...(SYSTEM_TZ ? { timeZone: SYSTEM_TZ } : {}),
});

const pastDateFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  ...(SYSTEM_TZ ? { timeZone: SYSTEM_TZ } : {}),
});

export function formatDaySeparatorLabel(date: Date, now = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const time = timeFmt.format(date);

  if (sameCalendarDay(date, now)) {
    return `Hoy · ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameCalendarDay(date, yesterday)) {
    return `Ayer · ${time}`;
  }

  return `${pastDateFmt.format(date)} · ${time}`;
}
