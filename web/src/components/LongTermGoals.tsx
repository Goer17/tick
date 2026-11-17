import { Star, Target } from "lucide-react";
import type { Category, Todo } from "../types";
import { categoryPath, formatDue, isOverdue } from "../lib/dates";

interface LongTermGoalsProps {
  goals: Todo[];
  categories: Category[];
  today: string;
  onOpen: (id: string) => void;
}

export function LongTermGoals({ goals, categories, today, onOpen }: LongTermGoalsProps): React.JSX.Element {
  return (
    <section className="goals-panel" aria-label="Important goals">
      <div className="goals-heading">
        <span className="goals-title">
          <Star size={14} fill="currentColor" /> Important Goals
        </span>
        <span className="goals-count">{goals.length.toString().padStart(2, "0")}</span>
      </div>
      {goals.length === 0 ? (
        <div className="goals-empty">
          <Target size={16} />
          <span>Mark a task important to keep it in view across every list.</span>
        </div>
      ) : (
        <div className="goals-strip">
          {goals.map((goal) => (
            <button key={goal.id} className={`goal-card ${goal.completed ? "completed" : ""}`} onClick={() => onOpen(goal.id)}>
              <span className="goal-star">
                <Star size={13} fill="currentColor" />
              </span>
              <span className="goal-content">
                <span className="goal-name">{goal.title}</span>
                <span className="goal-meta">
                  {categoryPath(goal.categoryId, categories)}
                  {goal.dueDate ? (
                    <span className={isOverdue(goal, today) ? "overdue-text" : ""}> · {formatDue(goal.dueDate, today)}</span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
