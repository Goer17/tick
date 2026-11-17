import { useState } from "react";
import { Check, ChevronRight, Circle, Clock3, ListTree, Repeat2, Star } from "lucide-react";
import type { Category, Todo } from "../types";
import { categoryPath, formatDue, isOverdue, repeatLabel } from "../lib/dates";

export interface TodoNode {
  todo: Todo;
  children: TodoNode[];
  subtaskCount: number;
}

interface TodoListProps {
  nodes: TodoNode[];
  categories: Category[];
  today: string;
  showCategory: boolean;
  emptyTitle: string;
  emptyHint: string;
  onToggle: (todo: Todo) => void;
  onOpen: (id: string) => void;
}

export function TodoList({
  nodes,
  categories,
  today,
  showCategory,
  emptyTitle,
  emptyHint,
  onToggle,
  onOpen,
}: TodoListProps): React.JSX.Element {
  if (nodes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-mark">
          <ListTree size={22} />
        </div>
        <h3>{emptyTitle}</h3>
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="todo-list">
      {nodes.map((node) => (
        <TodoBranch
          key={node.todo.id}
          node={node}
          depth={0}
          categories={categories}
          today={today}
          showCategory={showCategory}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function TodoBranch({
  node,
  depth,
  categories,
  today,
  showCategory,
  onToggle,
  onOpen,
}: {
  node: TodoNode;
  depth: number;
  categories: Category[];
  today: string;
  showCategory: boolean;
  onToggle: (todo: Todo) => void;
  onOpen: (id: string) => void;
}): React.JSX.Element {
  const { todo, children } = node;
  const overdue = isOverdue(todo, today);
  const [dragging, setDragging] = useState(false);
  return (
    <>
      <div
        className={`todo-row ${todo.completed ? "completed" : ""} ${todo.longTerm ? "long-term" : ""} ${dragging ? "dragging" : ""}`}
        style={{ marginLeft: depth === 0 ? 0 : depth * 22 }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/tick-todo", todo.id);
          event.dataTransfer.setData("text/plain", todo.id);
          event.dataTransfer.effectAllowed = "move";
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        onClick={() => onOpen(todo.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(todo.id);
          }
        }}
      >
        {depth > 0 ? <span className="subtask-rail" aria-hidden="true" /> : null}
        <button
          className={`todo-check ${todo.completed ? "checked" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(todo);
          }}
          aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        >
          {todo.completed ? <Check size={12} strokeWidth={3} /> : <Circle size={13} />}
        </button>
        <div className="todo-main">
          <div className="todo-title-line">
            {todo.longTerm ? <Star size={12} className="todo-star" fill="currentColor" /> : null}
            <span className="todo-title">{todo.title}</span>
            {node.subtaskCount > 0 ? (
              <span className="todo-subcount">
                <ChevronRight size={11} /> {node.subtaskCount}
              </span>
            ) : null}
          </div>
          <div className="todo-meta">
            {showCategory ? <span>{categoryPath(todo.categoryId, categories)}</span> : null}
            {todo.notes ? <span className="todo-note-preview">{todo.notes.replace(/\s+/g, " ").slice(0, 72)}</span> : null}
          </div>
        </div>
        <div className="todo-badges">
          {todo.repeat ? (
            <span className="badge repeat-badge" title={repeatLabel(todo.repeat)}>
              <Repeat2 size={11} /> {todo.repeat.every}
              {todo.repeat.unit[0]}
            </span>
          ) : null}
          {todo.dueDate ? (
            <span className={`badge due-badge ${overdue ? "overdue" : ""}`}>
              <Clock3 size={11} /> {formatDue(todo.dueDate, today)}
            </span>
          ) : (
            <span className="badge muted-badge">No date</span>
          )}
        </div>
      </div>
      {children.map((child) => (
        <TodoBranch
          key={child.todo.id}
          node={child}
          depth={depth + 1}
          categories={categories}
          today={today}
          showCategory={showCategory}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
