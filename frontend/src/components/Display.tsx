import type { ReactNode } from "react";
import type { SortKey } from "../types/booking";

export function Detail({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{children ?? value}</dd>
    </div>
  );
}

export function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; direction: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  return (
    <th>
      <button className="sort-button" onClick={() => onSort(column)}>
        {label}
        {sort.key === column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}
