import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronRight, Menu, Plus, Settings2, Star, Sun, Target } from "lucide-react";
import { api, ApiError, clearToken, getToken, setToken, type StateResponse } from "./api";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { LongTermGoals } from "./components/LongTermGoals";
import { TodoList, type TodoNode } from "./components/TodoList";
import { TodoDrawer } from "./components/TodoDrawer";
import { Settings } from "./components/Settings";
import { NewListModal } from "./components/NewListModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import {
  BUCKET_META,
  addDays,
  bucketFor,
  endOfWeek,
  formatFullDate,
  localDateString,
} from "./lib/dates";
import { applyTheme, getThemeMode, setThemeMode as persistThemeMode } from "./lib/theme";
import { getSoundSettings, playSound, previewSound, setSoundEnabled, setSoundVolume } from "./lib/sounds";
import type { Category, StatePayload, ThemeMode, TimeBucket, Todo, View } from "./types";

const BUCKETS: TimeBucket[] = ["today", "tomorrow", "this-week", "planned", "done"];

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

function flattenNodes(nodes: TodoNode[]): Todo[] {
  return nodes.flatMap((node) => [node.todo, ...flattenNodes(node.children)]);
}

function subtreeIds(categories: Category[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}

function byDueDate(left: Todo, right: Todo): number {
  if (left.dueDate && right.dueDate) {
    const byDate = left.dueDate.localeCompare(right.dueDate);
    return byDate !== 0 ? byDate : left.createdAt.localeCompare(right.createdAt);
  }
  if (left.dueDate) return -1;
  if (right.dueDate) return 1;
  return left.createdAt.localeCompare(right.createdAt);
}

function matchesSearch(todo: Todo, query: string): boolean {
  if (!query) return true;
  const haystack = `${todo.title} ${todo.notes}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function rootNodes(allTodos: Todo[], roots: Todo[], query: string): TodoNode[] {
  return roots
    .filter((todo) => todo.parentId === null && matchesSearch(todo, query))
    .map((todo) => ({
      todo,
      children: [],
      subtaskCount: allTodos.filter((item) => item.parentId === todo.id).length,
    }));
}

function nodeFor(todo: Todo, allTodos: Todo[]): TodoNode {
  return {
    todo,
    children: [],
    subtaskCount: allTodos.filter((item) => item.parentId === todo.id).length,
  };
}

function App(): React.JSX.Element {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [authState, setAuthState] = useState<"loading" | "in" | "out">(token ? "loading" : "out");
  const [state, setState] = useState<StatePayload | null>(null);
  const [view, setView] = useState<View>({ kind: "bucket", bucket: "today" });
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [newListParent, setNewListParent] = useState<string | null | undefined>(undefined);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getThemeMode());
  const [soundSettings, setSoundSettings] = useState(() => getSoundSettings());
  const [today, setToday] = useState(localDateString());
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  function notify(message: string): void {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }

  function applyResponse(response: StateResponse): void {
    setState({ categories: response.categories, todos: response.todos });
  }

  function logout(): void {
    clearToken();
    setTokenState(null);
    setState(null);
    setAuthState("out");
    setDrawerId(null);
    setSettingsOpen(false);
  }

  async function load(): Promise<void> {
    if (!token) {
      setAuthState("out");
      return;
    }
    setAuthState("loading");
    try {
      const next = await api.state();
      setState(next);
      setAuthState("in");
    } catch {
      clearToken();
      setTokenState(null);
      setState(null);
      setAuthState("out");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const onUnauthorized = (): void => logout();
    window.addEventListener("tick:unauthorized", onUnauthorized);
    return () => window.removeEventListener("tick:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "auto") return;
    const timer = window.setInterval(() => applyTheme("auto"), 30_000);
    return () => window.clearInterval(timer);
  }, [themeMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = localDateString();
      setToday((current) => (current === next ? current : next));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view.kind === "category" && state && !state.categories.some((category) => category.id === view.id)) {
      setView({ kind: "bucket", bucket: "today" });
    }
  }, [state, view]);

  useEffect(() => {
    if (drawerId && state && !state.todos.some((todo) => todo.id === drawerId)) setDrawerId(null);
  }, [drawerId, state]);

  const categories = state?.categories ?? [];
  const todos = state?.todos ?? [];
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const drawerTodo = drawerId ? todos.find((todo) => todo.id === drawerId) ?? null : null;

  const bucketCounts = useMemo(() => {
    const counts: Record<TimeBucket, number> = { today: 0, tomorrow: 0, "this-week": 0, planned: 0, done: 0 };
    for (const todo of todos) {
      if (todo.parentId !== null) continue;
      if (todo.completed) {
        counts.done += 1;
        continue;
      }
      // Planned is the master list of every active top-level todo.
      counts.planned += 1;
      const bucket = bucketFor(todo, today);
      if (bucket === "today" || bucket === "tomorrow" || bucket === "this-week") {
        counts[bucket] += 1;
      }
    }
    return counts;
  }, [todos, today]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const category of categories) {
      const ids = subtreeIds(categories, category.id);
      counts.set(
        category.id,
        todos.filter((todo) => ids.has(todo.categoryId) && todo.parentId === null && !todo.completed).length,
      );
    }
    return counts;
  }, [categories, todos]);

  const currentCategoryId = useMemo(() => {
    if (view.kind === "category") return view.id;
    return categories.find((category) => category.system)?.id ?? categories[0]?.id ?? "";
  }, [view, categories]);

  const categoryTodos = view.kind === "category" ? todos.filter((todo) => todo.categoryId === view.id) : [];
  const categoryNodes = view.kind === "category" ? rootNodes(todos, categoryTodos, search) : [];
  const bucketTodos = view.kind === "bucket"
    ? (view.bucket === "planned"
        ? todos.filter((todo) => todo.parentId === null && !todo.completed && matchesSearch(todo, search))
        : view.bucket === "done"
          ? todos.filter((todo) => todo.parentId === null && todo.completed && matchesSearch(todo, search))
          : todos.filter(
              (todo) =>
                todo.parentId === null &&
                !todo.completed &&
                bucketFor(todo, today) === view.bucket &&
                matchesSearch(todo, search),
            )
      ).sort(byDueDate)
    : [];
  const visibleNodes: TodoNode[] = view.kind === "category"
    ? categoryNodes
    : bucketTodos.map((todo) => nodeFor(todo, todos));
  const visibleCount = view.kind === "category" ? flattenNodes(categoryNodes).length : bucketTodos.length;

  const longTermGoals = useMemo(
    () =>
      todos
        .filter((todo) => todo.longTerm && todo.parentId === null && matchesSearch(todo, search))
        .sort((left, right) => {
          if (left.completed !== right.completed) return left.completed ? 1 : -1;
          if (!left.dueDate) return 1;
          if (!right.dueDate) return -1;
          return left.dueDate.localeCompare(right.dueDate);
        }),
    [todos, search],
  );

  const selectedCategory = view.kind === "category" ? categoryMap.get(view.id) : undefined;
  const viewTitle = selectedCategory?.name ?? (view.kind === "bucket" ? BUCKET_META[view.bucket].label : "Tasks");
  const viewHint = selectedCategory ? "List" : BUCKET_META[view.kind === "bucket" ? view.bucket : "today"].hint;
  const showCategory = view.kind === "bucket";

  function selectView(next: View): void {
    const changed = next.kind !== view.kind || (next.kind === "bucket" ? next.bucket !== (view.kind === "bucket" ? view.bucket : "") : next.id !== (view.kind === "category" ? view.id : ""));
    if (changed) playSound("nav");
    setView(next);
    setMobileMenu(false);
  }

  function openTodo(id: string): void {
    if (id !== drawerId) playSound("open");
    setDrawerId(id);
  }

  function closeDrawer(): void {
    if (drawerId) playSound("close");
    setDrawerId(null);
  }

  function dueForCurrentView(): string | null {
    if (view.kind !== "bucket") return null;
    if (view.bucket === "today") return today;
    if (view.bucket === "tomorrow") return addDays(today, 1);
    if (view.bucket === "this-week") return endOfWeek(today);
    return null;
  }

  async function addTask(): Promise<void> {
    const title = draft.trim();
    if (!title || adding) return;
    if (view.kind === "bucket" && view.bucket === "done") {
      notify("Done is a read-only view. Add tasks from another list.");
      return;
    }
    if (!currentCategoryId) {
      notify("Create a list before adding tasks.");
      return;
    }
    setAdding(true);
    try {
      const response = await api.createTodo({
        categoryId: currentCategoryId,
        title,
        dueDate: dueForCurrentView(),
      });
      applyResponse(response);
      playSound("add");
      setDraft("");
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : "Could not add task.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleTodo(todo: Todo): Promise<void> {
    try {
      const response = await api.updateTodo(todo.id, { completed: !todo.completed });
      applyResponse(response);
      playSound(todo.completed ? "uncomplete" : "complete");
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : "Could not update task.");
    }
  }

  async function saveTodo(
    id: string,
    values: { title: string; notes: string; dueDate: string | null; longTerm: boolean; repeat: Todo["repeat"]; categoryId: string },
  ): Promise<void> {
    try {
      const response = await api.updateTodo(id, values);
      applyResponse(response);
    } catch (caught) {
      throw caught;
    }
  }

  async function deleteTodo(id: string): Promise<void> {
    try {
      const response = await api.deleteTodo(id);
      applyResponse(response);
      playSound("delete");
      setDrawerId(null);
      notify("Task deleted.");
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : "Could not delete task.");
    }
  }

  async function addSubtask(parent: Todo, title: string): Promise<void> {
    const response = await api.createTodo({
      categoryId: parent.categoryId,
      parentId: parent.id,
      title,
      dueDate: null,
    });
    applyResponse(response);
    playSound("add");
    notify("Subtask added.");
  }

  async function createCategory(input: { name: string; parentId: string | null }): Promise<void> {
    const response = await api.createCategory(input);
    applyResponse(response);
    playSound("add");
    if (response.category) selectView({ kind: "category", id: response.category.id });
    notify("List created.");
  }

  async function deleteCategory(id: string): Promise<void> {
    try {
      const response = await api.deleteCategory(id);
      applyResponse(response);
      playSound("delete");
      if (view.kind === "category" && view.id === id) setView({ kind: "bucket", bucket: "today" });
      notify("List deleted.");
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : "Could not delete list.");
    }
  }

  function requestDeleteCategory(id: string): void {
    const category = categoryMap.get(id);
    if (!category) return;
    setConfirm({
      title: "Delete list?",
      message: `"${category.name}" and everything inside it will be permanently removed.`,
      confirmLabel: "Delete list",
      action: async () => {
        await deleteCategory(id);
      },
    });
  }

  function requestDeleteTodo(todo: Todo): void {
    setConfirm({
      title: "Delete task?",
      message: `"${todo.title}" and its subtasks will be permanently removed.`,
      confirmLabel: "Delete task",
      action: async () => {
        await deleteTodo(todo.id);
        setDrawerId(null);
      },
    });
  }

  async function moveTodo(id: string, target: View): Promise<void> {
    const todo = todos.find((item) => item.id === id);
    if (!todo) return;
    try {
      if (target.kind === "category") {
        if (todo.categoryId === target.id) return;
        const response = await api.updateTodo(id, { categoryId: target.id });
        applyResponse(response);
        playSound("save");
        notify(`Moved to ${categoryMap.get(target.id)?.name ?? "list"}.`);
        return;
      }

      const patch: { completed: boolean; dueDate?: string | null } = {
        completed: target.bucket === "done",
      };
      if (target.bucket === "today") patch.dueDate = today;
      else if (target.bucket === "tomorrow") patch.dueDate = addDays(today, 1);
      else if (target.bucket === "this-week") patch.dueDate = endOfWeek(today);
      else if (target.bucket === "planned") patch.dueDate = null;

      const response = await api.updateTodo(id, patch);
      applyResponse(response);
      playSound(target.bucket === "done" ? "complete" : "save");
      notify(`Deadline moved to ${BUCKET_META[target.bucket].label}.`);
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : "Could not move task.");
    }
  }

  function changeTheme(mode: ThemeMode): void {
    setThemeModeState(mode);
    persistThemeMode(mode);
    playSound("theme");
  }

  function changeSoundEnabled(enabled: boolean): void {
    setSoundEnabled(enabled);
    setSoundSettings((current) => ({ ...current, enabled }));
    if (enabled) window.setTimeout(() => previewSound(), 80);
  }

  function changeSoundVolume(volume: number): void {
    const next = Math.min(1, Math.max(0, volume));
    setSoundVolume(next);
    setSoundSettings((current) => ({ ...current, volume: next }));
  }

  if (authState === "out" || !token) {
    return <Login onSuccess={() => setTokenState(getToken())} />;
  }

  if (authState === "loading" || !state) {
    return (
      <div className="splash-screen">
        <img className="brand-logo" src="/logo.svg" alt="" />
        <span>Loading Tick…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        categories={categories}
        todos={todos}
        view={view}
        search={search}
        bucketCounts={bucketCounts}
        categoryCounts={categoryCounts}
        mobileOpen={mobileMenu}
        onSearch={setSearch}
        onSelectView={selectView}
        onNewList={(parentId) => setNewListParent(parentId)}
        onDeleteCategory={requestDeleteCategory}
        onMoveTodo={(id, target) => void moveTodo(id, target)}
        onCloseMobile={() => setMobileMenu(false)}
      />
      {mobileMenu ? <div className="sidebar-backdrop" onClick={() => setMobileMenu(false)} /> : null}

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMobileMenu(true)} aria-label="Open lists">
            <Menu size={19} />
          </button>
          <div className="topbar-location">
            <span className="topbar-brand">TICK</span>
            <ChevronRight size={13} />
            <span>{viewTitle}</span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-date"><CalendarDays size={13} /> {formatFullDate(today)}</span>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
              <Settings2 size={18} />
            </button>
          </div>
        </header>

        <div className="mobile-buckets" aria-label="Time filters">
          {BUCKETS.map((bucket) => (
            <button
              key={bucket}
              className={`mobile-bucket ${view.kind === "bucket" && view.bucket === bucket ? "active" : ""}`}
              onClick={() => selectView({ kind: "bucket", bucket })}
            >
              {BUCKET_META[bucket].label}
              <span>{bucketCounts[bucket]}</span>
            </button>
          ))}
        </div>

        <LongTermGoals goals={longTermGoals} categories={categories} today={today} onOpen={openTodo} />

        <section className="content">
          <div className="content-heading">
            <div>
              <span className="eyebrow">{viewHint}</span>
              <h1>{viewTitle}</h1>
            </div>
            <span className="content-count">
              {visibleCount.toString().padStart(2, "0")} {visibleCount === 1 ? "task" : "tasks"}
            </span>
          </div>

          {view.kind === "bucket" && view.bucket === "done" ? (
            <div className="done-banner">
              <Target size={15} /> Completed tasks are archived here.
            </div>
          ) : (
            <form
              className="add-task"
              onSubmit={(event) => {
                event.preventDefault();
                void addTask();
              }}
            >
              <Plus size={18} />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a task and press Enter…"
                aria-label="Add a task"
              />
              <span className="add-due-hint">
                {view.kind === "category" ? "No date" : `Due ${view.bucket === "this-week" ? "this week" : view.bucket}`}
              </span>
              <button className="primary-button small" type="submit" disabled={adding || !draft.trim()}>
                {adding ? "…" : "Add"}
              </button>
            </form>
          )}

          <TodoList
            nodes={visibleNodes}
            categories={categories}
            today={today}
            showCategory={showCategory}
            emptyTitle={
              view.kind === "category"
                ? "This list is clear."
                : view.bucket === "done"
                  ? "Nothing completed yet."
                  : "Nothing here yet."
            }
            emptyHint={
              view.kind === "category"
                ? "Add a task above, or open a task to break it into steps."
                : "Add a task above, or move something into this window."
            }
            onToggle={(todo) => void toggleTodo(todo)}
            onOpen={openTodo}
          />
        </section>
      </main>

      {drawerTodo ? (
        <TodoDrawer
          todo={drawerTodo}
          todos={todos}
          categories={categories}
          today={today}
          onClose={closeDrawer}
          onSave={saveTodo}
          onRequestDelete={requestDeleteTodo}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleTodo}
          onOpenTodo={openTodo}
        />
      ) : null}

      {newListParent !== undefined ? (
        <NewListModal
          parentId={newListParent}
          categories={categories}
          onClose={() => setNewListParent(undefined)}
          onCreate={createCategory}
        />
      ) : null}

      {settingsOpen ? (
        <Settings
          mode={themeMode}
          onChange={changeTheme}
          onClose={() => setSettingsOpen(false)}
          onLogout={logout}
          soundEnabled={soundSettings.enabled}
          soundVolume={soundSettings.volume}
          onSoundEnabled={changeSoundEnabled}
          onSoundVolume={changeSoundVolume}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Delete"}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          await confirm.action();
          setConfirm(null);
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

export default App;
