import { KVBackend } from "./storage.js";

export interface Note {
  id: string;
  body: string;
  updated: number;
}

export function titleOf(body: string): string {
  const first = body.split("\n").find((l) => l.trim().length > 0) ?? "";
  return first.replace(/^#+\s*/, "").trim() || "Untitled";
}

const PREFIX = "note:";

export class NotesStore {
  constructor(private backend: KVBackend, private clock: () => number = Date.now) {}

  private id() { return PREFIX + this.clock().toString(36) + Math.random().toString(36).slice(2, 6); }

  async create(body = ""): Promise<Note> {
    const note: Note = { id: this.id(), body, updated: this.clock() };
    await this.backend.set(note.id, note);
    return note;
  }

  async save(id: string, body: string): Promise<Note> {
    const note: Note = { id, body, updated: this.clock() };
    await this.backend.set(id, note);
    return note;
  }

  async get(id: string): Promise<Note | undefined> {
    return this.backend.get<Note>(id);
  }

  async remove(id: string): Promise<void> {
    await this.backend.delete(id);
  }

  async list(): Promise<Note[]> {
    const keys = (await this.backend.keys()).filter((k) => k.startsWith(PREFIX));
    const notes = await Promise.all(keys.map((k) => this.backend.get<Note>(k)));
    return notes.filter((n): n is Note => !!n).sort((a, b) => b.updated - a.updated);
  }

  async search(query: string): Promise<Note[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    return (await this.list()).filter((n) => n.body.toLowerCase().includes(q));
  }

  /** Serialize every note to a JSON backup string. */
  async exportAll(): Promise<string> {
    return JSON.stringify({ version: 1, notes: await this.list() }, null, 2);
  }

  /** Restore notes from a backup (accepts `{notes:[...]}` or a bare array).
   *  Returns how many were imported; bad/duplicate entries are skipped. */
  async importAll(json: string): Promise<number> {
    let data: any;
    try { data = JSON.parse(json); } catch { return 0; }
    const incoming: any[] = Array.isArray(data) ? data : data?.notes;
    if (!Array.isArray(incoming)) return 0;
    let count = 0;
    for (const raw of incoming) {
      if (!raw || typeof raw.body !== "string") continue;
      const id = typeof raw.id === "string" && raw.id.startsWith(PREFIX) ? raw.id : this.id();
      const updated = typeof raw.updated === "number" ? raw.updated : this.clock();
      await this.backend.set(id, { id, body: raw.body, updated });
      count++;
    }
    return count;
  }
}
