import type { Category, Repeat, StatePayload, Todo } from "./types";

const TOKEN_KEY = "tick-access-token";
export const UNAUTHORIZED_EVENT = "tick:unauthorized";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Unable to reach the server.", 0);
  }

  if (response.status === 401 && options.auth !== false) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status message.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export type StateResponse = StatePayload & {
  category?: Category;
  todo?: Todo;
};

export interface TodoInput {
  categoryId: string;
  parentId?: string | null;
  title: string;
  notes?: string;
  dueDate?: string | null;
  longTerm?: boolean;
  repeat?: Repeat | null;
}

export type TodoPatch = Partial<{
  title: string;
  notes: string;
  dueDate: string | null;
  longTerm: boolean;
  repeat: Repeat | null;
  completed: boolean;
  categoryId: string;
}>;

export const api = {
  login: (token: string) =>
    request<{ ok: boolean }>("/api/login", { method: "POST", body: { token }, auth: false }),

  state: () => request<StatePayload>("/api/state"),

  createCategory: (input: { name: string; parentId?: string | null }) =>
    request<StateResponse>("/api/categories", { method: "POST", body: input }),

  updateCategory: (id: string, input: { name?: string }) =>
    request<StateResponse>(`/api/categories/${id}`, { method: "PATCH", body: input }),

  deleteCategory: (id: string) =>
    request<StateResponse>(`/api/categories/${id}`, { method: "DELETE" }),

  createTodo: (input: TodoInput) =>
    request<StateResponse>("/api/todos", { method: "POST", body: input }),

  updateTodo: (id: string, input: TodoPatch) =>
    request<StateResponse>(`/api/todos/${id}`, { method: "PATCH", body: input }),

  deleteTodo: (id: string) =>
    request<StateResponse>(`/api/todos/${id}`, { method: "DELETE" }),
};
