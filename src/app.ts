// Wiring layer: connects NotesStore (IndexedDB) to the DOM. Browser-only.
import { NotesStore } from "./notes.js";
import { IndexedDBBackend, MemoryBackend } from "./storage.js";
import { renderMarkdown } from "./markdown.js";

const backend = "indexedDB" in globalThis ? new IndexedDBBackend() : new MemoryBackend();
const store = new NotesStore(backend);
let currentId: string | null = null;

const $ = (id: string) => document.getElementById(id)!;

async function refreshList(filter = "") {
  const notes = await store.search(filter);
  $("list").innerHTML = notes.map((n) => {
    const title = (n.body.split("\n").find((l) => l.trim()) || "Untitled").replace(/^#+\s*/, "");
    return `<button class="item ${n.id === currentId ? "active" : ""}" data-id="${n.id}">${title.slice(0, 40)}</button>`;
  }).join("") || '<p class="empty">No notes yet</p>';
  document.querySelectorAll<HTMLButtonElement>(".item").forEach((b) => b.onclick = () => open(b.dataset.id!));
}

async function open(id: string) {
  const note = await store.get(id);
  if (!note) return;
  currentId = id;
  ($("editor") as HTMLTextAreaElement).value = note.body;
  render();
  refreshList();
}

function render() {
  $("preview").innerHTML = renderMarkdown(($("editor") as HTMLTextAreaElement).value);
}

async function onInput() {
  render();
  if (currentId) await store.save(currentId, ($("editor") as HTMLTextAreaElement).value);
  refreshList();
}

(async function init() {
  ($("editor") as HTMLTextAreaElement).addEventListener("input", debounce(onInput, 250));
  $("new").addEventListener("click", async () => { const n = await store.create(""); open(n.id); });
  ($("search") as HTMLInputElement).addEventListener("input", (e) =>
    refreshList((e.target as HTMLInputElement).value));
  const notes = await store.list();
  if (notes[0]) open(notes[0].id); else { const n = await store.create("# Welcome\n\nStart typing…"); open(n.id); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();

function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: any; return (...a: any[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
