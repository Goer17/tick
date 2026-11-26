import { useMemo } from "react";
import type { Todo } from "../types";
import { addDays, endOfWeek, formatFullDate, localDateString, parseLocalDate } from "../lib/dates";

const WEEKS = 52;

interface DayStat {
  date: string;
  total: number;
  done: number;
}

interface DayCell extends DayStat {
  future: boolean;
  fill: number;
  rate: number | null;
}

function monthLabel(date: string): string {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(parseLocalDate(date));
}

export function CompletionHeatmap({ todos, today }: { todos: Todo[]; today: string }): React.JSX.Element {
  const weeks = useMemo(() => {
    const stats = new Map<string, DayStat>();
    for (const todo of todos) {
      if (todo.parentId !== null || !todo.dueDate) continue;
      const current = stats.get(todo.dueDate) ?? { date: todo.dueDate, total: 0, done: 0 };
      current.total += 1;
      if (todo.completed) current.done += 1;
      stats.set(todo.dueDate, current);
    }

    // Align the grid to Monday–Sunday weeks, ending with the current week.
    const end = parseLocalDate(endOfWeek(today));
    const start = addDays(localDateString(end), -(WEEKS * 7) + 1);
    const result: { cells: DayCell[]; label: string }[] = [];
    let previousMonth = "";
    for (let week = 0; week < WEEKS; week += 1) {
      const cells: DayCell[] = [];
      for (let day = 0; day < 7; day += 1) {
        const date = addDays(start, week * 7 + day);
        const stat = stats.get(date);
        const total = stat?.total ?? 0;
        const done = stat?.done ?? 0;
        const rate = total > 0 ? done / total : null;
        cells.push({
          date,
          total,
          done,
          future: date > today,
          rate,
          fill: rate === null ? 0 : Math.max(2, Math.round(rate * 8)),
        });
      }
      const label = monthLabel(cells[0].date);
      result.push({ cells, label: label === previousMonth ? "" : label });
      previousMonth = label;
    }
    return result;
  }, [todos, today]);

  const totalDue = todos.filter((todo) => todo.parentId === null && todo.dueDate).length;

  return (
    <section className="completion-panel" aria-label="Daily completion rate">
      <div className="completion-head">
        <div>
          <span className="eyebrow">Completion</span>
          <span className="completion-title">Last 52 weeks</span>
        </div>
        <div className="completion-legend" aria-hidden="true">
          <span>Less</span>
          <i className="legend-cell"><i style={{ width: 3, height: 3 }} /></i>
          <i className="legend-cell"><i style={{ width: 5, height: 5 }} /></i>
          <i className="legend-cell"><i style={{ width: 8, height: 8 }} /></i>
          <span>More</span>
        </div>
      </div>
      <div className="heatmap-scroll">
        <div className="heatmap-months" aria-hidden="true">
          {weeks.map((week, index) => (
            <span key={index} className="heatmap-month">{week.label}</span>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-weekdays" aria-hidden="true">
            <span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /><span>Sun</span>
          </div>
          <div className="heatmap-grid">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="heatmap-week">
                {week.cells.map((cell) => (
                  <span
                    key={cell.date}
                    className={`heatmap-cell ${cell.future ? "future" : ""}`}
                    title={
                      cell.future
                        ? ""
                        : `${formatFullDate(cell.date)} — ${
                            cell.total === 0
                              ? "No tasks due"
                              : `${cell.done}/${cell.total} completed (${Math.round((cell.rate ?? 0) * 100)}%)`
                          }`
                    }
                  >
                    {!cell.future && cell.fill > 0 ? (
                      <i className="heatmap-fill" style={{ width: cell.fill, height: cell.fill }} />
                    ) : null}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="completion-note">
        Share of tasks completed on their due day. {totalDue} scheduled {totalDue === 1 ? "task" : "tasks"}.
      </p>
    </section>
  );
}
