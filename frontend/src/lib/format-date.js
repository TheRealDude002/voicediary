// VoiceDiary date helpers — mirrors apps/mobile/src/utils/formatDate.js.
// Pure JS, no platform-specific code, ported verbatim from src/lib/format-date.ts.

export function formatRelative(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfEntry = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (startOfEntry.getTime() === startOfToday.getTime()) return "Today";
  if (startOfEntry.getTime() === startOfYesterday.getTime()) return "Yesterday";

  const diffDays = Math.round((startOfToday.getTime() - startOfEntry.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatFull(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationWords(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso) {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthMatrix(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let cursor = 1;
  for (let week = 0; week < 6; week++) {
    const row = [];
    for (let dow = 0; dow < 7; dow++) {
      if (week === 0 && dow < startDay) {
        row.push(null);
      } else if (cursor > daysInMonth) {
        row.push(null);
      } else {
        row.push(new Date(year, month, cursor));
        cursor++;
      }
    }
    grid.push(row);
  }
  return grid;
}
