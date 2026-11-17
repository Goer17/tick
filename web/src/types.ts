export type RepeatUnit = "day" | "week" | "month" | "year";

export interface Repeat {
  every: number;
  unit: RepeatUnit;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  order: number;
  system?: boolean;
}

export interface Todo {
  id: string;
  categoryId: string;
  parentId: string | null;
  title: string;
  notes: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  longTerm: boolean;
  repeat: Repeat | null;
  seriesId: string | null;
  createdAt: string;
}

export interface StatePayload {
  categories: Category[];
  todos: Todo[];
}

export type TimeBucket = "today" | "tomorrow" | "this-week" | "planned" | "done";

export type View =
  | { kind: "bucket"; bucket: TimeBucket }
  | { kind: "category"; id: string };

export type ThemeMode = "light" | "dark" | "auto";
