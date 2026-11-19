"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { nameColor } from "@/lib/rarity";

/**
 * Centered popup. Native <dialog> gives focus trapping, Esc to close and a backdrop.
 * Mount it to open it; it calls onClose on Esc, the Close button or a backdrop click.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = "lg",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const width = { md: "42rem", lg: "64rem", xl: "80rem" }[size];
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="m-auto overflow-hidden rounded-xl border border-line bg-panel p-0 text-text shadow-2xl backdrop:bg-black/70"
      style={{ width: `min(${width}, calc(100% - 1.5rem))` }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the dialog itself, not its content.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[88vh] overflow-y-auto p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-semibold">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-1 text-sm text-muted">{subtitle}</div>
            )}
          </div>
          <button className="btn shrink-0" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** A skin or item name in its rarity colour. */
export function SkinName({
  name,
  rarity,
  className = "",
}: {
  name: string;
  rarity?: string | null;
  className?: string;
}) {
  return (
    <span className={className} style={{ color: nameColor(name, rarity) }}>
      {name}
    </span>
  );
}

export type SortDir = "asc" | "desc";

/** Sort rows by a numeric or text column; click a header again to flip the order. */
export function useSort<T, K extends string>(
  rows: readonly T[],
  columns: Record<K, (row: T) => number | string | null>,
  initial: NoInfer<K>,
  initialDir: SortDir = "desc",
) {
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const sorted = useMemo(() => {
    const get = columns[key];
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      // Blanks always go last, whatever the direction.
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      const c =
        typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number);
      return dir === "asc" ? c : -c;
    });
    // columns is a constant object at each call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir]);
  const toggle = (k: K) => {
    if (k === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(k);
      setDir("desc");
    }
  };
  return { sorted, key, dir, toggle, setKey, setDir };
}

/** Clickable table header that shows and flips the sort order. */
export function SortTh<K extends string>({
  k,
  sort,
  children,
  title,
  className = "",
}: {
  k: NoInfer<K>;
  sort: { key: K; dir: SortDir; toggle: (k: K) => void };
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <th
      className={`p-2 font-normal whitespace-nowrap ${className}`}
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      title={title}
    >
      <button
        className={`inline-flex items-center gap-1 hover:text-text ${active ? "text-accent" : ""}`}
        onClick={() => sort.toggle(k)}
      >
        {children}
        <span aria-hidden className="text-[10px]">
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/** A labelled filter field for the filter bars at the top of pages. */
export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-sm ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Small stat tile used in popups. */
export function Stat({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "good" | "bad" | "accent";
}) {
  const color = tone
    ? { good: "text-good", bad: "text-bad", accent: "text-accent" }[tone]
    : "";
  return (
    <div className="rounded-lg border border-line bg-bg p-3 text-center">
      <div
        className={`text-[11px] font-semibold tracking-wide uppercase ${color || "text-muted"}`}
      >
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{children}</div>
    </div>
  );
}

/** Keeps only digits and one dot, for money and number inputs. */
export const numeric = (v: string) =>
  v.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
