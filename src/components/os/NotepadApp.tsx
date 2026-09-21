"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FsNode } from "@/lib/fs-types";
import { getNode, updateNode } from "@/lib/local-fs";

export default function NotepadApp(props: { fileId: number }) {
  const [file, setFile] = useState<FsNode | null>(null);
  const [content, setContent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const node = getNode(props.fileId);
      if (!node || node.type !== "file") {
        setFile(null);
        setContent("");
        setError("File not found");
        return;
      }
      setFile(node);
      setContent(node.content ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, [props.fileId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => {
      try {
        const node = getNode(props.fileId);
        if (!node || node.type !== "file") {
          setFile(null);
          setError("File not found");
          return;
        }

        setFile(node);
        setError(null);

        // If the user hasn’t changed the editor since the last load/save,
        // keep the editor in sync with the stored content.
        setContent((current) => {
          const lastKnown = node.content ?? "";
          if (file && (file.content ?? "") === current) return lastKnown;
          return current;
        });
      } catch {
        // ignore
      }
    };

    window.addEventListener("win-sim:fs-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("win-sim:fs-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [props.fileId, file]);

  const dirty = useMemo(() => {
    return (file?.content ?? "") !== content;
  }, [file, content]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const node = updateNode(props.fileId, { content });
      setFile(node);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    if (!file) return;
    const name = window.prompt("Rename file", file.name);
    if (!name || name === file.name) return;

    setBusy(true);
    setError(null);
    try {
      const node = updateNode(props.fileId, { name });
      setFile(node);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{file ? `Notepad — ${file.name}` : "Notepad"}</div>
          <div className="text-xs opacity-80">
            {dirty ? "Unsaved changes" : "Saved"}
            {savedAt ? ` · ${savedAt}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.12)" }}
            onClick={rename}
            disabled={busy || !file}
          >
            Rename
          </button>
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "var(--win-accent)", color: "white" }}
            onClick={save}
            disabled={busy || !dirty}
          >
            Save
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-red-400/60 bg-red-500/10 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <textarea
        className="h-full w-full resize-none rounded p-3 font-mono text-sm"
        style={{
          border: "1px solid rgba(0,0,0,0.15)",
          background: "rgba(255,255,255,0.85)",
        }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
