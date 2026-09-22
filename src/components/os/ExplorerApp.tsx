"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FsNode } from "@/lib/fs-types";
import { createNode, deleteNode, getNode, listChildren, updateNode } from "@/lib/local-fs";

export default function ExplorerApp(props: {
  initialFolderId: number | null;
  onOpenFile: (node: FsNode) => void;
}) {
  const [folderId, setFolderId] = useState<number | null>(props.initialFolderId);
  const [history, setHistory] = useState<(number | null)[]>([]);
  const [nodes, setNodes] = useState<FsNode[]>([]);
  const [folderLabel, setFolderLabel] = useState<string>("Desktop");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextNodes = listChildren(folderId);
      setNodes(nextNodes);

      if (folderId === null) {
        setFolderLabel("Desktop");
      } else {
        const folder = getNode(folderId);
        if (!folder || folder.type !== "folder") {
          setFolderId(null);
          setFolderLabel("Desktop");
          return;
        }
        setFolderLabel(folder.name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, [folderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => {
      void load();
    };

    window.addEventListener("win-sim:fs-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("win-sim:fs-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [load]);

  const breadcrumbs = useMemo(() => {
    const parts = ["Desktop"];
    if (folderId !== null) parts.push(folderLabel);
    return parts.join(" > ");
  }, [folderId, folderLabel]);

  async function createItem(type: "file" | "folder") {
    const name = window.prompt(type === "file" ? "New file name" : "New folder name", type === "file" ? "New Text Document.txt" : "New Folder");
    if (!name) return;

    setBusy(true);
    try {
      createNode({ parentId: folderId, type, name, content: type === "file" ? "" : null });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function renameItem(node: FsNode) {
    const name = window.prompt("Rename to", node.name);
    if (!name || name === node.name) return;

    setBusy(true);
    try {
      updateNode(node.id, { name });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(node: FsNode) {
    const ok = window.confirm(`Delete ${node.name}?`);
    if (!ok) return;

    setBusy(true);
    try {
      deleteNode(node.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function open(node: FsNode) {
    if (node.type === "folder") {
      setHistory((h) => [...h, folderId]);
      setFolderId(node.id);
      return;
    }

    props.onOpenFile(node);
  }

  function goUp() {
    if (history.length === 0) {
      setFolderId(null);
      return;
    }
    const nextHistory = [...history];
    const prev = nextHistory.pop() ?? null;
    setHistory(nextHistory);
    setFolderId(prev);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <div className="font-semibold">File Explorer</div>
          <div className="text-xs opacity-80">{breadcrumbs}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.12)" }}
            onClick={goUp}
            disabled={busy}
          >
            Up
          </button>
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "var(--win-accent)", color: "white" }}
            onClick={() => createItem("folder")}
            disabled={busy}
          >
            New Folder
          </button>
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "var(--win-accent)", color: "white" }}
            onClick={() => createItem("file")}
            disabled={busy}
          >
            New File
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-red-400/60 bg-red-500/10 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "1fr" }}
      >
        {nodes.length === 0 ? (
          <div className="rounded border border-black/10 bg-black/5 px-3 py-3 text-sm opacity-80">
            This folder is empty.
          </div>
        ) : null}

        {nodes.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between gap-3 rounded px-3 py-2"
            style={{ border: "1px solid rgba(0,0,0,0.10)", background: "rgba(255,255,255,0.55)" }}
          >
            <button
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onDoubleClick={() => open(n)}
              onClick={() => open(n)}
              title="Open"
              type="button"
            >
              <span className="text-lg" aria-hidden>
                {n.type === "folder"
                  ? "📁"
                  : n.name.toLowerCase().endsWith(".oss")
                    ? "🧩"
                    : "📄"}
              </span>
              <span className="truncate text-sm font-medium">{n.name}</span>
              <span className="ml-auto hidden text-xs opacity-70 sm:inline">
                {n.type === "folder" ? "Folder" : "File"}
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                className="rounded px-2 py-1 text-xs"
                style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.10)" }}
                onClick={() => renameItem(n)}
                disabled={busy}
              >
                Rename
              </button>
              <button
                className="rounded px-2 py-1 text-xs"
                style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.10)" }}
                onClick={() => deleteItem(n)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
