"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { formatIn, type Rates } from "@/lib/currency";

const STORAGE = "imbalance-currency";
const COMMON = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "CAD",
  "AUD",
  "SAR",
  "TRY",
  "PLN",
  "BRL",
  "CNY",
  "INR",
  "RUB",
];

type Money = {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Rates["rates"];
  money: (usdCents: number | null | undefined) => string;
};

const MoneyContext = createContext<Money>({
  currency: "USD",
  setCurrency: () => {},
  rates: { USD: 1 },
  money: (c) => formatIn(c, "USD", 1),
});

/** Holds the chosen display currency. Prices stay in USD cents underneath. */
export function MoneyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<Rates["rates"]>({ USD: 1 });
  const [currency, setCurrencyState] = useState("USD");

  useEffect(() => {
    fetch("/api/currency")
      .then((r) => r.json() as Promise<Rates>)
      .then((r) => {
        setRates(r.rates);
        try {
          const saved = localStorage.getItem(STORAGE);
          if (saved) setCurrencyState(saved);
        } catch {}
      })
      .catch((err: unknown) => console.error(err));
  }, []);

  function setCurrency(c: string) {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE, c);
    } catch {}
  }

  const rate = rates[currency];
  const shown = rate ? currency : "USD";
  const money = (cents: number | null | undefined) =>
    formatIn(cents, shown, rate ?? 1);
  return (
    <MoneyContext value={{ currency: shown, setCurrency, rates, money }}>
      {children}
    </MoneyContext>
  );
}

export const useMoney = () => useContext(MoneyContext);

export function CurrencyPicker() {
  const { currency, setCurrency, rates } = useMoney();
  const all = Object.keys(rates).sort();
  const options = [
    ...COMMON.filter((c) => rates[c]),
    ...all.filter((c) => !COMMON.includes(c)),
  ];
  return (
    <>
      <label className="sr-only" htmlFor="currency">
        Currency
      </label>
      <select
        id="currency"
        className="input"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        {options.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </>
  );
}
