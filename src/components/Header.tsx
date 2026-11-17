"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeysModal } from "./KeysModal";
import { CurrencyPicker } from "./Money";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/catalog", label: "Skins" },
];

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("imbalance-theme", dark ? "dark" : "light");
  } catch {}
}

export function Header() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Imbalance
        </Link>
        <nav aria-label="Main" className="flex gap-4 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
              className={
                path === l.href
                  ? "font-semibold text-accent"
                  : "text-muted hover:text-text"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex gap-2">
          <CurrencyPicker />
          <button
            className="btn"
            onClick={toggleTheme}
            aria-label="Switch between dark and light theme"
          >
            Theme
          </button>
          <KeysModal />
        </div>
      </div>
    </header>
  );
}
