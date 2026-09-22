"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FsNode } from "@/lib/fs-types";
import type { WindowsThemeId } from "@/lib/windows-themes";
import { getNode, updateNode } from "@/lib/local-fs";
import { runOssScript } from "@/lib/oss-script";

export default function OssScriptApp(props: {
  fileId: number;
  onSetTheme: (id: WindowsThemeId) => void;
}) {
  const [file, setFile] = useState<FsNode | null>(null);
  const [content, setContent] = useState<string>("");
  const [output, setOutput] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(() => {
    const node = getNode(props.fileId);
    if (!node || node.type !== "file") {
      setFile(null);
      setContent("");
      setErrors(["File not found"]);
      return;
    }
    setFile(node);
    setContent(node.content ?? "");
  }, [props.fileId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    return (file?.content ?? "") !== content;
  }, [file, content]);

  function run() {
    if (!file) return;

    setBusy(true);
    try {
      const res = runOssScript(content, {
        startFolderId: file.parentId ?? null,
        onTheme: props.onSetTheme,
      });
      setOutput(res.output);
      setErrors(res.errors);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!file) return;
    setBusy(true);
    try {
      const node = updateNode(file.id, { content });
      setFile(node);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Save failed"]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {file ? `OSS Runner — ${file.name}` : "OSS Runner"}
          </div>
          <div className="text-xs opacity-80">
            {dirty ? "Unsaved changes" : "Saved"}
            {savedAt ? ` · ${savedAt}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.12)" }}
            onClick={save}
            disabled={busy || !dirty}
          >
            Save
          </button>
          <button
            className="rounded px-3 py-1 text-sm"
            style={{ background: "var(--win-accent)", color: "white" }}
            onClick={run}
            disabled={busy || !file}
          >
            Run
          </button>
        </div>
      </div>

      <div className="grid h-full grid-rows-[1fr_auto] gap-3">
        <textarea
          className="w-full resize-none rounded p-3 font-mono text-xs"
          style={{
            border: "1px solid rgba(0,0,0,0.15)",
            background: "rgba(255,255,255,0.85)",
          }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />

        <div
          className="rounded p-3"
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            background: "rgba(0,0,0,0.06)",
          }}
        >
          <div className="mb-2 text-xs font-semibold">Output</div>

          {errors.length ? (
            <div className="mb-2 rounded border border-red-400/60 bg-red-500/10 px-2 py-1 text-xs text-red-800">
              {errors.map((e, idx) => (
                <div key={idx}>{e}</div>
              ))}
            </div>
          ) : null}

          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
            {output.length ? output.join("\n") : "(no output)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
