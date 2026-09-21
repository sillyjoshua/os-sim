import type { FsNode, FsNodeType } from "@/lib/fs-types";

const STORAGE_KEY = "win-sim:fs";

type LocalFsStore = {
  nextId: number;
  nodes: FsNode[];
};

function nowIso() {
  return new Date().toISOString();
}

function defaultStore(): LocalFsStore {
  const t = nowIso();
  return {
    nextId: 3,
    nodes: [
      {
        id: 1,
        parentId: null,
        type: "folder",
        name: "Documents",
        content: null,
        createdAt: t,
        updatedAt: t,
      },
      {
        id: 2,
        parentId: 1,
        type: "file",
        name: "Welcome.txt",
        content: "Welcome to the Windows Simulator!\n\n- Create files and folders\n- Double-click to open\n- Use Settings to change the Windows version theme\n",
        createdAt: t,
        updatedAt: t,
      },
    ],
  };
}

function readStoreUnsafe(): LocalFsStore {
  if (typeof window === "undefined") {
    // Should never happen in normal usage (client components), but keep it safe.
    return defaultStore();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultStore();

  try {
    const parsed = JSON.parse(raw) as LocalFsStore;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.nextId !== "number" ||
      !Array.isArray(parsed.nodes)
    ) {
      return defaultStore();
    }
    return parsed;
  } catch {
    return defaultStore();
  }
}

function writeStoreUnsafe(store: LocalFsStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("win-sim:fs-changed"));
}

function siblingsOf(store: LocalFsStore, parentId: number | null) {
  return store.nodes.filter((n) => n.parentId === parentId);
}

function makeUniqueName(desired: string, taken: Set<string>) {
  const trimmed = desired.trim() || "New Item";
  if (!taken.has(trimmed)) return trimmed;

  let i = 2;
  while (taken.has(`${trimmed} (${i})`)) i += 1;
  return `${trimmed} (${i})`;
}

function sortWindowsLike(nodes: FsNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function listChildren(parentId: number | null): FsNode[] {
  const store = readStoreUnsafe();
  return sortWindowsLike(store.nodes.filter((n) => n.parentId === parentId));
}

export function getNode(id: number): FsNode | null {
  const store = readStoreUnsafe();
  return store.nodes.find((n) => n.id === id) ?? null;
}

export function createNode(input: {
  parentId: number | null;
  type: FsNodeType;
  name: string;
  content?: string | null;
}): FsNode {
  const store = readStoreUnsafe();

  const taken = new Set(siblingsOf(store, input.parentId).map((n) => n.name));
  const name = makeUniqueName(input.name, taken);

  const t = nowIso();
  const node: FsNode = {
    id: store.nextId,
    parentId: input.parentId,
    type: input.type,
    name,
    content: input.type === "file" ? input.content ?? "" : null,
    createdAt: t,
    updatedAt: t,
  };

  store.nextId += 1;
  store.nodes.push(node);
  writeStoreUnsafe(store);
  return node;
}

export function updateNode(
  id: number,
  patch: { name?: string; content?: string | null; parentId?: number | null },
): FsNode {
  const store = readStoreUnsafe();
  const idx = store.nodes.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error("Not found");

  const existing = store.nodes[idx];
  const next: FsNode = { ...existing };

  if (typeof patch.parentId !== "undefined") {
    next.parentId = patch.parentId;
  }

  if (typeof patch.name === "string") {
    const newName = patch.name.trim();
    if (!newName) throw new Error("Name required");

    const taken = new Set(
      siblingsOf(store, next.parentId).filter((n) => n.id !== id).map((n) => n.name),
    );
    next.name = makeUniqueName(newName, taken);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "content")) {
    next.content = typeof patch.content === "string" ? patch.content : "";
  }

  next.updatedAt = nowIso();
  store.nodes[idx] = next;
  writeStoreUnsafe(store);
  return next;
}

function collectDescendants(store: LocalFsStore, rootId: number) {
  const toDelete = new Set<number>();
  const stack = [rootId];

  while (stack.length) {
    const cur = stack.pop()!;
    if (toDelete.has(cur)) continue;
    toDelete.add(cur);
    for (const child of store.nodes) {
      if (child.parentId === cur) stack.push(child.id);
    }
  }

  return toDelete;
}

export function deleteNode(id: number) {
  const store = readStoreUnsafe();
  const toDelete = collectDescendants(store, id);
  const before = store.nodes.length;
  store.nodes = store.nodes.filter((n) => !toDelete.has(n.id));

  if (store.nodes.length === before) throw new Error("Not found");

  writeStoreUnsafe(store);
}

export function resetFs() {
  const store = defaultStore();
  writeStoreUnsafe(store);
}
