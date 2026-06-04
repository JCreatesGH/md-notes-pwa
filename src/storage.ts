// Async key-value backend interface + an IndexedDB implementation and an
// in-memory one (used by tests, and as a fallback).
export interface KVBackend {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryBackend implements KVBackend {
  private map = new Map<string, unknown>();
  async get<T>(key: string) { return this.map.get(key) as T | undefined; }
  async set<T>(key: string, value: T) { this.map.set(key, value); }
  async delete(key: string) { this.map.delete(key); }
  async keys() { return [...this.map.keys()]; }
}

export class IndexedDBBackend implements KVBackend {
  private dbp: Promise<IDBDatabase>;
  constructor(private dbName = "md-notes", private store = "notes") {
    this.dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this.store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async tx(mode: IDBTransactionMode) {
    const db = await this.dbp;
    return db.transaction(this.store, mode).objectStore(this.store);
  }
  private wrap<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  }
  async get<T>(key: string) { return this.wrap((await this.tx("readonly")).get(key)) as Promise<T | undefined>; }
  async set<T>(key: string, value: T) { await this.wrap((await this.tx("readwrite")).put(value as any, key)); }
  async delete(key: string) { await this.wrap((await this.tx("readwrite")).delete(key)); }
  async keys() { return this.wrap((await this.tx("readonly")).getAllKeys()) as Promise<string[]>; }
}
