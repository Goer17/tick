import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { z } from "zod";
import { addRepeat, isDateString, todayUtc } from "./dates.js";
import { getState, mutateState, newId, randomPaletteColor } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.TICK_PORT ?? 3456);
const HOST = process.env.TICK_HOST ?? "0.0.0.0";
const WEB_DIST = path.resolve(process.env.TICK_WEB_DIST ?? path.join(here, "..", "web", "dist"));
const ACCESS_TOKEN = process.env.TICK_ACCESS_TOKEN?.trim() || "tick-demo-token";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  if (request.path.startsWith("/api/")) response.setHeader("Cache-Control", "no-store");
  next();
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(status, message) {
  throw new HttpError(status, message);
}

function tokensMatch(left, right) {
  const a = crypto.createHash("sha256").update(String(left)).digest();
  const b = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAuth(request, _response, next) {
  const header = request.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token || !tokensMatch(token, ACCESS_TOKEN)) {
    next(new HttpError(401, "Invalid access token."));
    return;
  }
  next();
}

function categoryById(state, id) {
  return state.categories.find((category) => category.id === id) ?? null;
}

function todoById(state, id) {
  return state.todos.find((todo) => todo.id === id) ?? null;
}

function categorySubtreeIds(state, rootId) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of state.categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}

function todoSubtreeIds(state, rootId) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const todo of state.todos) {
      if (todo.parentId && ids.has(todo.parentId) && !ids.has(todo.id)) {
        ids.add(todo.id);
        changed = true;
      }
    }
  }
  return ids;
}

function normalizeRepeat(repeat) {
  if (!repeat) return null;
  return { every: Math.max(1, Math.floor(repeat.every)), unit: repeat.unit };
}

function maybeSpawnNext(state, todo) {
  if (!todo.repeat) return;
  todo.seriesId ||= todo.id;
  const alreadyQueued = state.todos.some(
    (candidate) =>
      candidate.id !== todo.id &&
      candidate.seriesId === todo.seriesId &&
      candidate.completed === false,
  );
  if (alreadyQueued) return;

  const next = {
    id: newId(),
    categoryId: todo.categoryId,
    parentId: todo.parentId ?? null,
    title: todo.title,
    notes: todo.notes ?? "",
    dueDate: addRepeat(todo.dueDate ?? todayUtc(), todo.repeat),
    completed: false,
    completedAt: null,
    longTerm: todo.longTerm === true,
    repeat: { ...todo.repeat },
    seriesId: todo.seriesId,
    createdAt: new Date().toISOString(),
  };
  state.todos.push(next);
  cloneSubtasksForNext(state, todo, next, todo.repeat);
}

function cloneSubtasksForNext(state, completed, next, repeat) {
  const descendants = [];
  const visit = (parentId) => {
    for (const child of state.todos.filter((item) => item.parentId === parentId)) {
      descendants.push(child);
      visit(child.id);
    }
  };
  visit(completed.id);

  const idMap = new Map([[completed.id, next.id]]);
  for (const item of descendants) {
    const clone = {
      ...item,
      id: newId(),
      parentId: idMap.get(item.parentId) ?? next.id,
      completed: false,
      completedAt: null,
      seriesId: null,
      repeat: item.repeat ? { ...item.repeat } : null,
      dueDate: item.dueDate ? addRepeat(item.dueDate, repeat) : null,
      createdAt: new Date().toISOString(),
    };
    idMap.set(item.id, clone.id);
    state.todos.push(clone);
  }
}

const repeatSchema = z.object({
  every: z.number().int().min(1).max(365),
  unit: z.enum(["day", "week", "month", "year"]),
});

const dateSchema = z.string().refine(isDateString, "Use a valid YYYY-MM-DD date.").nullable();

const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  parentId: z.string().min(1).nullable().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

const todoCreateSchema = z.object({
  categoryId: z.string().min(1),
  parentId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(10000).optional().default(""),
  dueDate: dateSchema.optional().default(null),
  longTerm: z.boolean().optional().default(false),
  repeat: repeatSchema.nullable().optional().default(null),
});

const todoUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(10000).optional(),
  dueDate: dateSchema.optional(),
  longTerm: z.boolean().optional(),
  repeat: repeatSchema.nullable().optional(),
  completed: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
});

const loginSchema = z.object({ token: z.string().min(1).max(500) });

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, name: "tick" });
});

app.post("/api/login", (request, response) => {
  const { token } = loginSchema.parse(request.body);
  if (!tokensMatch(token, ACCESS_TOKEN)) fail(401, "Invalid access token.");
  response.json({ ok: true });
});

app.use("/api", requireAuth);

app.get("/api/state", (_request, response) => {
  const state = getState();
  response.json({ categories: state.categories, todos: state.todos });
});

app.post("/api/categories", (request, response) => {
  const body = categoryCreateSchema.parse(request.body);
  const state = getState();
  if (body.parentId && !categoryById(state, body.parentId)) fail(404, "Parent list not found.");

  const maxOrder = state.categories.reduce((max, category) => Math.max(max, category.order ?? 0), -1);
  const category = {
    id: newId(),
    name: body.name,
    parentId: body.parentId ?? null,
    color: body.color ?? randomPaletteColor(),
    order: maxOrder + 1,
    system: false,
  };
  mutateState((draft) => {
    draft.categories.push(category);
  });
  response.status(201).json({ category, ...getStateResponse() });
});

app.patch("/api/categories/:id", (request, response) => {
  const body = categoryUpdateSchema.parse(request.body);
  const updated = mutateState((draft) => {
    const category = categoryById(draft, request.params.id);
    if (!category) fail(404, "List not found.");
    if (body.name !== undefined) category.name = body.name;
    if (body.color !== undefined) category.color = body.color;
    return category;
  });
  response.json({ category: updated, ...getStateResponse() });
});

app.delete("/api/categories/:id", (request, response) => {
  const state = getState();
  const category = categoryById(state, request.params.id);
  if (!category) fail(404, "List not found.");
  if (category.system) fail(400, "The Default list cannot be deleted.");
  const ids = categorySubtreeIds(state, category.id);
  mutateState((draft) => {
    draft.categories = draft.categories.filter((item) => !ids.has(item.id));
    draft.todos = draft.todos.filter((item) => !ids.has(item.categoryId));
  });
  response.json({ ok: true, ...getStateResponse() });
});

app.post("/api/todos", (request, response) => {
  const body = todoCreateSchema.parse(request.body);
  const state = getState();
  const category = categoryById(state, body.categoryId);
  if (!category) fail(404, "List not found.");
  if (body.parentId) {
    const parent = todoById(state, body.parentId);
    if (!parent) fail(404, "Parent task not found.");
    if (parent.categoryId !== body.categoryId) fail(400, "A subtask must use its parent's list.");
  }

  const repeat = normalizeRepeat(body.repeat);
  const todo = {
    id: newId(),
    categoryId: body.categoryId,
    parentId: body.parentId ?? null,
    title: body.title,
    notes: body.notes ?? "",
    dueDate: body.dueDate ?? null,
    completed: false,
    completedAt: null,
    longTerm: body.longTerm === true,
    repeat,
    seriesId: repeat ? newId() : null,
    createdAt: new Date().toISOString(),
  };
  mutateState((draft) => {
    draft.todos.push(todo);
  });
  response.status(201).json({ todo, ...getStateResponse() });
});

app.patch("/api/todos/:id", (request, response) => {
  const body = todoUpdateSchema.parse(request.body);
  const updated = mutateState((draft) => {
    const todo = todoById(draft, request.params.id);
    if (!todo) fail(404, "Task not found.");

    if (body.categoryId !== undefined) {
      if (!categoryById(draft, body.categoryId)) fail(404, "List not found.");
      const ids = todoSubtreeIds(draft, todo.id);
      const parent = todo.parentId ? todoById(draft, todo.parentId) : null;
      if (parent && parent.categoryId !== body.categoryId) todo.parentId = null;
      for (const item of draft.todos) {
        if (ids.has(item.id)) item.categoryId = body.categoryId;
      }
    }
    if (body.title !== undefined) todo.title = body.title;
    if (body.notes !== undefined) todo.notes = body.notes;
    if (body.dueDate !== undefined) todo.dueDate = body.dueDate;
    if (body.longTerm !== undefined) todo.longTerm = body.longTerm;
    if (body.repeat !== undefined) {
      todo.repeat = normalizeRepeat(body.repeat);
      if (todo.repeat) todo.seriesId ||= todo.id;
      else todo.seriesId = null;
    }

    if (body.completed !== undefined && body.completed !== todo.completed) {
      const completing = body.completed === true;
      todo.completed = completing;
      todo.completedAt = completing ? new Date().toISOString() : null;
      if (completing && todo.repeat) maybeSpawnNext(draft, todo);
    }
    return todo;
  });
  response.json({ todo: updated, ...getStateResponse() });
});

app.delete("/api/todos/:id", (request, response) => {
  const state = getState();
  if (!todoById(state, request.params.id)) fail(404, "Task not found.");
  const ids = todoSubtreeIds(state, request.params.id);
  mutateState((draft) => {
    draft.todos = draft.todos.filter((todo) => !ids.has(todo.id));
  });
  response.json({ ok: true, ...getStateResponse() });
});

function getStateResponse() {
  const state = getState();
  return { categories: state.categories, todos: state.todos };
}

if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { index: false, maxAge: "1h" }));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(path.join(WEB_DIST, "index.html"));
  });
}

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.use((error, _request, response, _next) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({ error: error.issues[0]?.message ?? "Invalid request." });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, HOST, () => {
  console.log(`Tick listening on http://${HOST}:${PORT}`);
  if (!process.env.TICK_ACCESS_TOKEN) {
    console.warn("TICK_ACCESS_TOKEN is not set; using the development default.");
  }
});
