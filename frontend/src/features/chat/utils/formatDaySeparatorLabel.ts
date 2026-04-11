import { sameCalendarDay } from "./sameCalendarDay";

export function formatDaySeparatorLabel(date: Date, now = new Date()): string {
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  if (sameCalendarDay(date, now)) {
    return `Hoy, ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameCalendarDay(date, yesterday)) {
    return `Ayer, ${time}`;
  }

  return (
    date.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    }) + ` · ${time}`
  );
}
