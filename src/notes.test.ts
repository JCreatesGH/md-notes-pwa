import { describe, it, expect } from "vitest";
import { NotesStore, titleOf } from "./notes";
import { MemoryBackend } from "./storage";

function fixedClock() { let t = 1000; return () => (t += 10); }

describe("titleOf", () => {
  it("uses the first non-empty line, stripped of heading marks", () => {
    expect(titleOf("# Hello world\nbody")).toBe("Hello world");
    expect(titleOf("\n\nplain first line")).toBe("plain first line");
    expect(titleOf("   ")).toBe("Untitled");
  });
});

describe("NotesStore", () => {
  it("creates, gets and saves notes", async () => {
    const store = new NotesStore(new MemoryBackend(), fixedClock());
    const n = await store.create("hello");
    expect((await store.get(n.id))?.body).toBe("hello");
    const updated = await store.save(n.id, "hello world");
    expect(updated.body).toBe("hello world");
    expect(updated.updated).toBeGreaterThan(n.updated);
  });

  it("lists notes newest-first and only note keys", async () => {
    const backend = new MemoryBackend();
    await backend.set("other:thing", { junk: true });   // unrelated key ignored
    const store = new NotesStore(backend, fixedClock());
    await store.create("first");
    await store.create("second");
    const list = await store.list();
    expect(list.map((n) => n.body)).toEqual(["second", "first"]);
  });

  it("removes notes", async () => {
    const store = new NotesStore(new MemoryBackend(), fixedClock());
    const n = await store.create("bye");
    await store.remove(n.id);
    expect(await store.get(n.id)).toBeUndefined();
    expect(await store.list()).toEqual([]);
  });

  it("searches by body, case-insensitive", async () => {
    const store = new NotesStore(new MemoryBackend(), fixedClock());
    await store.create("Grocery list: Milk");
    await store.create("Meeting notes");
    expect((await store.search("milk")).length).toBe(1);
    expect((await store.search("")).length).toBe(2);
  });

  it("exports and re-imports notes round-trip", async () => {
    const a = new NotesStore(new MemoryBackend(), fixedClock());
    await a.create("first");
    await a.create("second");
    const backup = await a.exportAll();

    const b = new NotesStore(new MemoryBackend(), fixedClock());
    const count = await b.importAll(backup);
    expect(count).toBe(2);
    expect((await b.list()).map((n) => n.body).sort()).toEqual(["first", "second"]);
  });

  it("import accepts a bare array and skips malformed entries", async () => {
    const store = new NotesStore(new MemoryBackend(), fixedClock());
    const count = await store.importAll(JSON.stringify([
      { id: "note:keep", body: "good", updated: 5 },
      { id: "note:bad", updated: 5 },          // no body -> skipped
      "garbage",                                // not an object -> skipped
    ]));
    expect(count).toBe(1);
    expect((await store.list())[0].body).toBe("good");
  });

  it("import returns 0 on invalid JSON", async () => {
    const store = new NotesStore(new MemoryBackend(), fixedClock());
    expect(await store.importAll("{not json")).toBe(0);
  });
});
