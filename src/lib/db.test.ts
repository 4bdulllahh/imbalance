import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  getMeta,
  migrate,
  openDb,
  SCHEMA_VERSION,
  setMeta,
  transaction,
} from "./db";

describe("db", () => {
  it("migrates a new database to the latest version", () => {
    const db = openDb(":memory:");
    const { user_version } = db.prepare("PRAGMA user_version").get() as {
      user_version: number;
    };
    expect(user_version).toBe(SCHEMA_VERSION);
  });

  it("is safe to migrate twice", () => {
    const db = openDb(":memory:");
    expect(() => migrate(db)).not.toThrow();
  });

  it("refuses a database from a newer app version", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    expect(() => migrate(db)).toThrow(/git pull/);
  });

  it("stores meta values and rolls back failed transactions", () => {
    const db = openDb(":memory:");
    setMeta(db, "a", "1");
    setMeta(db, "a", "2");
    expect(getMeta(db, "a")).toBe("2");
    expect(() =>
      transaction(db, () => {
        setMeta(db, "b", "x");
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(getMeta(db, "b")).toBeUndefined();
  });
});
