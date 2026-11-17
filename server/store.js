import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(
  process.env.TICK_DATA_DIR ?? path.join(here, "data"),
);
const STATE_FILE = path.join(DATA_DIR, "state.json");

const COLORS = [
  "#d97757",
  "#e08a4f",
  "#d6a84a",
  "#b5b04a",
  "#88a85a",
  "#5fa47a",
  "#4fa39a",
  "#56a1b5",
  "#5b8fc4",
  "#6f7fc4",
  "#8a7ac6",
  "#a875bf",
  "#bf76a8",
  "#c9788d",
  "#bd7a70",
  "#a6856b",
  "#8b8f91",
  "#7d9a8a",
];

function freshState() {
  return {
    version: 1,
    categories: [
      {
        id: "inbox",
        name: "Default",
        parentId: null,
        color: COLORS[0],
        order: 0,
        system: true,
      },
    ],
    todos: [],
  };
}

function ensureShape(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid state file.");
  data.version = 1;
  data.categories = Array.isArray(data.categories) ? data.categories : [];
  data.todos = Array.isArray(data.todos) ? data.todos : [];
  for (const category of data.categories) {
    category.order ??= 0;
    category.color ??= COLORS[0];
    category.parentId ??= null;
  }
  for (const todo of data.todos) {
    todo.parentId ??= null;
    todo.notes ??= "";
    todo.dueDate ??= null;
    todo.completed = todo.completed === true;
    todo.completedAt ??= null;
    todo.longTerm = todo.longTerm === true;
    todo.repeat ??= null;
    todo.seriesId ??= null;
    todo.createdAt ??= new Date().toISOString();
  }
  if (!data.categories.some((category) => category.id === "inbox")) {
    data.categories.unshift({
      id: "inbox",
      name: "Default",
      parentId: null,
      color: COLORS[0],
      order: 0,
      system: true,
    });
  }
  const defaultCategory = data.categories.find((category) => category.id === "inbox");
  if (defaultCategory?.system) defaultCategory.name = "Default";
  return data;
}

function loadState() {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(STATE_FILE)) {
    const data = freshState();
    writeState(data);
    return data;
  }
  const raw = fs.readFileSync(STATE_FILE, "utf8");
  const data = ensureShape(JSON.parse(raw));
  writeState(data);
  return data;
}

function writeState(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, STATE_FILE);
}

let state = loadState();

export function getState() {
  return state;
}

export function mutateState(mutator) {
  const next = structuredClone(state);
  const result = mutator(next);
  state = next;
  writeState(state);
  return result;
}

export function newId() {
  return crypto.randomUUID();
}

export function randomPaletteColor() {
  return COLORS[crypto.randomInt(COLORS.length)];
}

export { COLORS };
