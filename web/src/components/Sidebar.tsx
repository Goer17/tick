import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CornerDownRight,
  ChevronRight,
  Folder,
  FolderPlus,
  Menu,
  Moon,
  Pencil,
  Plus,
  Search,
  Sun,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";
import type { Category, TimeBucket, Todo, View } from "../types";
import { BUCKET_META } from "../lib/dates";

interface SidebarProps {
  categories: Category[];
  todos: Todo[];
  view: View;
  search: string;
  bucketCounts: Record<TimeBucket, number>;
  categoryCounts: Map<string, number>;
  mobileOpen: boolean;
  onSearch: (value: string) => void;
  onSelectView: (view: View) => void;
  onNewList: (parentId: string | null) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string) => void;
  onMoveTodo: (id: string, target: View) => void;
  onCloseMobile: () => void;
}

const TIME_ITEMS: { bucket: TimeBucket; icon: React.ReactNode }[] = [
  { bucket: "today", icon: <Sun size={17} /> },
  { bucket: "tomorrow", icon: <Sunrise size={17} /> },
  { bucket: "this-week", icon: <CalendarDays size={17} /> },
  { bucket: "planned", icon: <CalendarClock size={17} /> },
  { bucket: "done", icon: <CheckCircle2 size={17} /> },
];

export function Sidebar({
  categories,
  view,
  search,
  bucketCounts,
  categoryCounts,
  mobileOpen,
  onSearch,
  onSelectView,
  onNewList,
  onDeleteCategory,
  onRenameCategory,
  onMoveTodo,
  onCloseMobile,
}: SidebarProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);

  function dropProps(key: string, target: View) {
    return {
      onDragOver: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOver(key);
      },
      onDragLeave: (event: React.DragEvent<HTMLElement>) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) {
          setDragOver((current) => (current === key ? null : current));
        }
      },
      onDrop: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const todoId = event.dataTransfer.getData("text/tick-todo") || event.dataTransfer.getData("text/plain");
        setDragOver(null);
        if (todoId) onMoveTodo(todoId, target);
      },
    };
  }

  const children = new Map<string | null, Category[]>();
  for (const category of categories) {
    const key = category.parentId ?? null;
    const list = children.get(key) ?? [];
    list.push(category);
    children.set(key, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  function toggle(id: string): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function categoryRow(category: Category, depth: number): React.ReactNode {
    const nested = children.get(category.id) ?? [];
    const isCollapsed = collapsed.has(category.id);
    const selected = view.kind === "category" && view.id === category.id;
    return (
      <div key={category.id} className="category-branch">
        <div
          className={`category-row ${selected ? "selected" : ""} ${dragOver === `cat-${category.id}` ? "drag-over" : ""}`}
          style={{ paddingLeft: `${14 + depth * 16}px` }}
          {...dropProps(`cat-${category.id}`, { kind: "category", id: category.id })}
          onClick={() => onSelectView({ kind: "category", id: category.id })}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelectView({ kind: "category", id: category.id });
            }
          }}
        >
          <button
            className={`tree-toggle ${nested.length === 0 ? "invisible" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              toggle(category.id);
            }}
            aria-label={isCollapsed ? "Expand list" : "Collapse list"}
          >
            <ChevronRight size={13} className={isCollapsed ? "" : "rotated"} />
          </button>
          <Folder size={14} className="category-folder" />
          <span className="category-name">{category.name}</span>
          <span className="category-count">{categoryCounts.get(category.id) ?? 0}</span>
          <span className="category-actions">
            <button
              className="mini-icon rename"
              title="Rename list"
              onClick={(event) => {
                event.stopPropagation();
                onRenameCategory(category.id);
              }}
            >
              <Pencil size={13} />
            </button>
            <button
              className="mini-icon"
              title="Add sublist"
              onClick={(event) => {
                event.stopPropagation();
                onNewList(category.id);
              }}
            >
              <Plus size={13} />
            </button>
            {!category.system ? (
              <button
                className="mini-icon danger"
                title="Delete list"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteCategory(category.id);
                }}
              >
                <Trash2 size={13} />
              </button>
            ) : null}
          </span>
        </div>
        {!isCollapsed ? nested.map((child) => categoryRow(child, depth + 1)) : null}
      </div>
    );
  }

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand-row">
          <div className="sidebar-brand">
            <img className="brand-logo" src="/logo.svg" alt="" />
            <span>TICK</span>
          </div>
          <button className="icon-button mobile-only" onClick={onCloseMobile} aria-label="Close lists">
            <X size={18} />
          </button>
        </div>
        <label className="search-box">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
          />
        </label>
        <nav className="time-nav" aria-label="Time filters">
          {TIME_ITEMS.map(({ bucket, icon }) => (
            <button
              key={bucket}
              className={`time-item ${view.kind === "bucket" && view.bucket === bucket ? "active" : ""} ${dragOver === `bucket-${bucket}` ? "drag-over" : ""}`}
              {...dropProps(`bucket-${bucket}`, { kind: "bucket", bucket })}
              onClick={() => onSelectView({ kind: "bucket", bucket })}
            >
              <span className={`time-icon time-${bucket}`}>{icon}</span>
              <span>{BUCKET_META[bucket].label}</span>
              <span className="time-count">{bucketCounts[bucket]}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="section-heading">
          <span>Lists</span>
          <button className="mini-icon" onClick={() => onNewList(null)} title="Create list">
            <FolderPlus size={15} />
          </button>
        </div>
        <div className="category-tree">
          {(children.get(null) ?? []).map((category) => categoryRow(category, 0))}
        </div>
        <button className="create-list-button" onClick={() => onNewList(null)}>
          <Plus size={15} /> New list
        </button>
        {view.kind === "category" ? (
          <button className="create-list-button sublist" onClick={() => onNewList(view.id)}>
            <CornerDownRight size={15} /> New sublist
          </button>
        ) : null}
      </div>

      <div className="sidebar-footer">
        <Menu size={13} /> <span>Lists, deadlines, important goals</span>
        <Moon size={13} />
      </div>
    </aside>
  );
}
