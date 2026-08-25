import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./Icons";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function SelectControl({ value, options, onChange, ariaLabel }: {
  value: string; options: SelectOption[]; onChange: (value: string) => void; ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const selected = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(index: number) {
    if (!options[index] || options[index].disabled) return;
    onChange(options[index].value);
    setOpen(false);
  }

  return <div className={`select-control${open ? " open" : ""}`} data-empty={!value || value === "0"} ref={root}>
    <button type="button" className={`select-trigger${options[selected]?.disabled ? " placeholder" : ""}`} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
      onClick={() => { setActive(selected); setOpen((current) => !current); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) return setOpen(true);
          setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
        }
        if (event.key === "Enter" && open) { event.preventDefault(); choose(active); }
      }}>
      <span>{options[selected]?.label ?? "Select an option"}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    {open && <div className="select-options" role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value}
        disabled={option.disabled}
        className={`select-option${index === active ? " highlighted" : ""}`} key={option.value}
        onMouseEnter={() => setActive(index)} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === value && <CheckIcon className="option-check" />}
      </button>)}
    </div>}
  </div>;
}
