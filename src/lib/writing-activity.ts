export interface WritingEvent { createdAt: Date | string; wordsAdded: number; wordsRemoved: number; bookTitle: string; action: string; }
export interface ActivityDay { date: string; edits: number; wordsAdded: number; wordsRemoved: number; books: string[]; imported: boolean; }
export function dateKey(date: Date | string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(date));
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function shiftDay(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
export function groupWritingActivity(events: WritingEvent[], timeZone: string): ActivityDay[] {
  const days = new Map<string, ActivityDay>();
  for (const event of events) {
    const date = dateKey(event.createdAt, timeZone), day = days.get(date) ?? { date, edits: 0, wordsAdded: 0, wordsRemoved: 0, books: [], imported: false };
    day.edits++; day.wordsAdded += event.wordsAdded; day.wordsRemoved += event.wordsRemoved; day.imported ||= event.action === "BASELINE";
    if (!day.books.includes(event.bookTitle)) day.books.push(event.bookTitle);
    days.set(date, day);
  }
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
export function writingStreaks(days: ActivityDay[], today: string) {
  const active = new Set(days.filter(day => day.edits > 0).map(day => day.date));
  let current = 0, cursor = active.has(today) ? today : shiftDay(today, -1);
  while (active.has(cursor)) { current++; cursor = shiftDay(cursor, -1); }
  let longest = 0, run = 0, previous = "";
  for (const date of Array.from(active).sort()) { run = previous && shiftDay(previous, 1) === date ? run + 1 : 1; longest = Math.max(longest, run); previous = date; }
  return { current, longest };
}
export function calendarDays(today: string, length: number) {
  const first = shiftDay(today, -(length - 1)), start = shiftDay(first, -new Date(`${first}T12:00:00Z`).getUTCDay());
  const end = shiftDay(today, 6 - new Date(`${today}T12:00:00Z`).getUTCDay());
  const days: string[] = [];
  for (let date = start; date <= end; date = shiftDay(date, 1)) days.push(date);
  return days;
}
