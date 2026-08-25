import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon } from "./Icons";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const toIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIso = (value?: string) => value ? new Date(`${value}T00:00:00`) : new Date();

export function DatePicker({ value, min, onChange, ariaLabel }: {
  value: string; min?: string; onChange: (value: string) => void; ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => fromIso(value || min));
  const [position, setPosition] = useState({ top: 0, left: 0, width: 292 });
  const root = useRef<HTMLDivElement>(null);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [month]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const displayValue = value
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(fromIso(value))
    : "Select date";

  function toggleCalendar() {
    if (open) return setOpen(false);
    const bounds = root.current?.getBoundingClientRect();
    if (bounds) {
      const width = Math.min(292, window.innerWidth - 24);
      const left = Math.min(Math.max(12, bounds.left), window.innerWidth - width - 12);
      const height = 330;
      const top = window.innerHeight - bounds.bottom >= height
        ? bounds.bottom + 7
        : Math.max(12, bounds.top - height - 7);
      setPosition({ top, left, width });
    }
    setMonth(fromIso(value || min));
    setOpen(true);
  }

  return <div className={`date-picker${open ? " open" : ""}`} data-empty={!value} ref={root}>
    <button type="button" className="date-trigger" aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open}
      onClick={toggleCalendar}>
      <span className={value ? "" : "placeholder"}>{displayValue}</span><CalendarIcon />
    </button>
    {open && <div className="calendar-popover" role="dialog" aria-label={ariaLabel} style={position}>
      <div className="calendar-header">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
        <strong>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</strong>
        <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
      </div>
      <div className="calendar-grid">
        {weekdays.map((day) => <span className="weekday" key={day}>{day}</span>)}
        {days.map((day) => {
          const iso = toIso(day);
          const disabled = Boolean(min && iso < min);
          return <button type="button" key={iso} disabled={disabled}
            className={`${day.getMonth() === month.getMonth() ? "" : "outside"}${iso === value ? " selected" : ""}${iso === toIso(new Date()) ? " today" : ""}`}
            aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(day)}
            onClick={() => { onChange(iso); setOpen(false); }}>{day.getDate()}</button>;
        })}
      </div>
    </div>}
  </div>;
}
