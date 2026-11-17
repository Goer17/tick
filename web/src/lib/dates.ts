import type { Repeat, TimeBucket, Todo } from "../types";

export const BUCKET_META: Record<TimeBucket, { label: string; hint: string }> = {
  today: { label: "Today", hint: "Due today" },
  tomorrow: { label: "Tomorrow", hint: "Due tomorrow" },
  "this-week": { label: "This Week", hint: "Later this week" },
  planned: { label: "Planned", hint: "All active tasks, by date" },
  done: { label: "Done", hint: "Archived" },
};

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

export function endOfWeek(value: string): string {
  const date = parseLocalDate(value);
  const day = date.getDay();
  const untilSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + untilSunday);
  return localDateString(date);
}

export function bucketFor(todo: Todo, today = localDateString()): TimeBucket | null {
  if (todo.completed) return "done";
  if (!todo.dueDate) return "planned";
  if (todo.dueDate <= today) return "today";
  if (todo.dueDate === addDays(today, 1)) return "tomorrow";
  if (todo.dueDate <= endOfWeek(today)) return "this-week";
  return "planned";
}

export function isOverdue(todo: Todo, today = localDateString()): boolean {
  return !todo.completed && Boolean(todo.dueDate && todo.dueDate < today);
}

export function formatDue(value: string | null, today = localDateString()): string {
  if (!value) return "No date";
  if (value === today) return "Today";
  if (value === addDays(today, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    parseLocalDate(value),
  );
}

export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalDate(value));
}

export function repeatLabel(repeat: Repeat | null): string {
  if (!repeat) return "";
  const unit = repeat.every === 1 ? repeat.unit : `${repeat.unit}s`;
  return `Every ${repeat.every} ${unit}`;
}

export function categoryPath(
  categoryId: string,
  categories: { id: string; name: string; parentId: string | null }[],
): string {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const parts: string[] = [];
  let current = byId.get(categoryId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(" / ") || "Default";
}
