import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatFullDate, localDateString, parseLocalDate } from "../lib/dates";

interface DateFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateField({ value, onChange }: DateFieldProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const date = value ? parseLocalDate(value) : new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    const date = value ? parseLocalDate(value) : new Date();
    setView({ year: date.getFullYear(), month: date.getMonth() });
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => monthCells(view.year, view.month), [view]);
  const today = localDateString();
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    new Date(view.year, view.month, 1),
  );

  function moveMonth(delta: number): void {
    setView((current) => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function choose(date: string): void {
    onChange(date);
    setOpen(false);
  }

  return (
    <div className="date-field" ref={rootRef}>
      <button
        type="button"
        className={`date-field-button ${value ? "" : "empty"}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={13} />
        <span>{value ? formatFullDate(value) : "No date"}</span>
      </button>
      {open ? (
        <div className="date-popover" role="dialog" aria-label="Choose a due date">
          <div className="date-popover-head">
            <button type="button" className="mini-icon" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={14} />
            </button>
            <span className="date-month">{monthLabel}</span>
            <button type="button" className="mini-icon" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="date-grid">
            {WEEKDAYS.map((day) => (
              <span key={day} className="date-weekday">{day}</span>
            ))}
            {cells.map((date, index) =>
              date ? (
                <button
                  key={date}
                  type="button"
                  className={`date-day ${date === value ? "selected" : ""} ${date === today ? "today" : ""}`}
                  onClick={() => choose(date)}
                >
                  {Number(date.slice(8))}
                </button>
              ) : (
                <span key={`empty-${index}`} className="date-day empty" />
              ),
            )}
          </div>
          <div className="date-footer">
            <button type="button" className="text-button" onClick={() => { onChange(null); setOpen(false); }}>
              Clear
            </button>
            <button type="button" className="text-button" onClick={() => choose(today)}>
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
