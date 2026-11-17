import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronRight, Clock3, Plus, Repeat2, Star, Trash2, X } from "lucide-react";
import type { Category, RepeatUnit, Todo } from "../types";
import { categoryPath, formatFullDate, repeatLabel } from "../lib/dates";
import { DateField } from "./DatePicker";
import { playSound } from "../lib/sounds";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DraftValues {
  title: string;
  notes: string;
  dueDate: string | null;
  longTerm: boolean;
  repeat: { every: number; unit: RepeatUnit } | null;
  categoryId: string;
}

function valuesFrom(todo: Todo): DraftValues {
  return {
    title: todo.title,
    notes: todo.notes,
    dueDate: todo.dueDate,
    longTerm: todo.longTerm,
    repeat: todo.repeat ? { ...todo.repeat } : null,
    categoryId: todo.categoryId,
  };
}

function sameValues(left: DraftValues, right: DraftValues): boolean {
  return (
    left.title === right.title &&
    left.notes === right.notes &&
    left.dueDate === right.dueDate &&
    left.longTerm === right.longTerm &&
    left.repeat?.every === right.repeat?.every &&
    left.repeat?.unit === right.repeat?.unit &&
    left.categoryId === right.categoryId
  );
}

interface TodoDrawerProps {
  todo: Todo;
  todos: Todo[];
  categories: Category[];
  today: string;
  onClose: () => void;
  onSave: (id: string, values: {
    title: string;
    notes: string;
    dueDate: string | null;
    longTerm: boolean;
    repeat: { every: number; unit: RepeatUnit } | null;
    categoryId: string;
  }) => Promise<void>;
  onRequestDelete: (todo: Todo) => void;
  onAddSubtask: (parent: Todo, title: string) => Promise<void>;
  onToggleSubtask: (todo: Todo) => Promise<void>;
  onOpenTodo: (id: string) => void;
}

export function TodoDrawer({
  todo,
  todos,
  categories,
  onClose,
  onSave,
  onRequestDelete,
  onAddSubtask,
  onToggleSubtask,
  onOpenTodo,
}: TodoDrawerProps): React.JSX.Element {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes);
  const [dueDate, setDueDate] = useState(todo.dueDate ?? "");
  const [longTerm, setLongTerm] = useState(todo.longTerm);
  const [categoryId, setCategoryId] = useState(todo.categoryId);
  const [repeatEnabled, setRepeatEnabled] = useState(Boolean(todo.repeat));
  const [every, setEvery] = useState(todo.repeat?.every ?? 1);
  const [unit, setUnit] = useState<RepeatUnit>(todo.repeat?.unit ?? "week");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const saveTimer = useRef<number | undefined>(undefined);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const hydrating = useRef(true);
  const initial = useRef<DraftValues>(valuesFrom(todo));

  useEffect(() => {
    const next = valuesFrom(todo);
    setTitle(next.title);
    setNotes(next.notes);
    setDueDate(next.dueDate ?? "");
    setLongTerm(next.longTerm);
    setCategoryId(next.categoryId);
    setRepeatEnabled(Boolean(next.repeat));
    setEvery(next.repeat?.every ?? 1);
    setUnit(next.repeat?.unit ?? "week");
    setError("");
    setStatus("idle");
    setSubtaskTitle("");
    initial.current = next;
    hydrating.current = true;
    window.clearTimeout(saveTimer.current);
    const hydrationTimer = window.setTimeout(() => {
      hydrating.current = false;
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [todo.id]);

  function currentValues(): DraftValues {
    return {
      title: title.trim(),
      notes,
      dueDate: dueDate || null,
      longTerm,
      repeat: repeatEnabled ? { every: Math.max(1, Math.floor(every || 1)), unit } : null,
      categoryId,
    };
  }

  async function persist(values: DraftValues): Promise<boolean> {
    const task = saveChain.current.then(async () => {
      await onSave(todo.id, values);
    });
    saveChain.current = task.catch(() => undefined);
    try {
      setStatus("saving");
      await task;
      setStatus("saved");
      return true;
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not save.");
      return false;
    }
  }

  useEffect(() => {
    if (hydrating.current) return;
    const values = currentValues();
    if (!values.title || sameValues(values, initial.current)) return;
    setStatus("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist(values);
    }, 550);
    return () => window.clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, notes, dueDate, longTerm, repeatEnabled, every, unit, categoryId]);

  async function requestClose(): Promise<void> {
    window.clearTimeout(saveTimer.current);
    const values = currentValues();
    if (!values.title) {
      setError("Title cannot be empty.");
      return;
    }
    if (!sameValues(values, initial.current)) {
      const saved = await persist(values);
      if (!saved) return;
    }
    onClose();
  }

  const subtasks = todos.filter((item) => item.parentId === todo.id);

  async function addSubtask(): Promise<void> {
    const value = subtaskTitle.trim();
    if (!value) return;
    setSubtaskTitle("");
    try {
      await onAddSubtask(todo, value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add subtask.");
    }
  }

  return (
    <div className="drawer-backdrop" onClick={() => void requestClose()}>
      <aside className="todo-drawer" onClick={(event) => event.stopPropagation()} aria-label="Task details">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">Task</span>
            <span className="drawer-category">{categoryPath(todo.categoryId, categories)}</span>
          </div>
          <button className="icon-button" onClick={() => void requestClose()} aria-label="Close task details">
            <X size={18} />
          </button>
        </header>

        <div className="drawer-body">
          <label className="field">
            <span className="field-label">Title</span>
            <input className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">List</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryPath(category.id, categories)}
                </option>
              ))}
            </select>
          </label>

          <div className="drawer-grid">
            <div className="field">
              <span className="field-label"><CalendarDays size={13} /> Due date</span>
              <DateField value={dueDate || null} onChange={(value) => setDueDate(value ?? "")} />
            </div>
            <button
              className={`toggle-card ${longTerm ? "on gold" : ""}`}
              onClick={() => {
                const next = !longTerm;
                setLongTerm(next);
                playSound(next ? "important" : "toggle");
              }}
              type="button"
            >
              <Star size={15} fill={longTerm ? "currentColor" : "none"} />
              <span>
                <strong>Important goal</strong>
                <small>Keep it in the top strip</small>
              </span>
              <span className={`switch ${longTerm ? "on" : ""}`}><span /></span>
            </button>
          </div>

          <section className={`repeat-section ${repeatEnabled ? "on" : ""}`}>
            <button
              className="repeat-toggle"
              onClick={() => {
                const next = !repeatEnabled;
                setRepeatEnabled(next);
                playSound(next ? "repeat" : "toggle");
              }}
              type="button"
            >
              <span className="field-label"><Repeat2 size={13} /> Repeat</span>
              <span className={`switch ${repeatEnabled ? "on" : ""}`}><span /></span>
            </button>
            {repeatEnabled ? (
              <div className="repeat-controls">
                <span>Every</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={every}
                  onChange={(event) => setEvery(Number(event.target.value) || 1)}
                />
                <select value={unit} onChange={(event) => setUnit(event.target.value as RepeatUnit)}>
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                </select>
                <span className="repeat-summary">{repeatLabel({ every: Math.max(1, every || 1), unit })}</span>
              </div>
            ) : (
              <p className="muted-copy">Completing this task will not create another occurrence.</p>
            )}
          </section>

          <label className="field">
            <span className="field-label">Notes</span>
            <textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add context, links, or a definition of done…"
            />
          </label>

          <section className="subtasks-section">
            <div className="subtasks-heading">
              <span className="field-label"><ChevronRight size={13} /> Subtasks</span>
              <span className="subtask-count">{subtasks.length.toString().padStart(2, "0")}</span>
            </div>
            {subtasks.length === 0 ? <p className="muted-copy">Break this task into smaller steps.</p> : null}
            <div className="subtask-list">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className={`subtask-row ${subtask.completed ? "completed" : ""}`}>
                  <button
                    className={`todo-check small ${subtask.completed ? "checked" : ""}`}
                    onClick={() => void onToggleSubtask(subtask)}
                    aria-label={subtask.completed ? "Mark subtask incomplete" : "Mark subtask complete"}
                  >
                    {subtask.completed ? <Check size={10} strokeWidth={3} /> : null}
                  </button>
                  <button className="subtask-name" onClick={() => onOpenTodo(subtask.id)}>
                    {subtask.title}
                  </button>
                  {subtask.dueDate ? <span className="subtask-date"><Clock3 size={11} /> {formatFullDate(subtask.dueDate)}</span> : null}
                </div>
              ))}
            </div>
            <div className="subtask-add">
              <Plus size={14} />
              <input
                value={subtaskTitle}
                onChange={(event) => setSubtaskTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addSubtask();
                  }
                }}
                placeholder="Add a subtask…"
              />
              <button className="text-button" onClick={() => void addSubtask()} disabled={!subtaskTitle.trim()}>
                Add
              </button>
            </div>
          </section>

          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <footer className="drawer-footer">
          <button
            className="danger-button"
            onClick={() => {
              window.clearTimeout(saveTimer.current);
              onRequestDelete(todo);
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
          <span className={`save-status ${status}`} aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : ""}
          </span>
          <button className="primary-button" onClick={() => void requestClose()}>
            Done
          </button>
        </footer>
      </aside>
    </div>
  );
}
