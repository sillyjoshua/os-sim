"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FsNode } from "@/lib/fs-types";
import type { WindowsTheme, WindowsThemeId } from "@/lib/windows-themes";
import {
  DEFAULT_THEME_ID,
  WINDOWS_THEMES,
  themeToCssVars,
} from "@/lib/windows-themes";
import WindowFrame, { type WindowFrameState } from "@/components/os/WindowFrame";
import ExplorerApp from "@/components/os/ExplorerApp";
import NotepadApp from "@/components/os/NotepadApp";
import SettingsApp from "@/components/os/SettingsApp";
import { createNode, deleteNode, listChildren } from "@/lib/local-fs";

type AppKind = "explorer" | "notepad" | "settings";

type AppWindow = {
  wid: string;
  app: AppKind;
  title: string;
  frame: WindowFrameState;
  data: Record<string, unknown>;
};


function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const LS_THEME_ID = "win-sim:themeId";
const LS_CUSTOM_THEME = "win-sim:customTheme";
const COOKIE_THEME_ID = "win_sim_theme";

function setCookie(name: string, value: string) {
  // 1 year
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (const c of cookies) {
    const [k, ...rest] = c.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function defaultCustomTheme(): WindowsTheme {
  const base = WINDOWS_THEMES.win11;
  return {
    ...base,
    id: "custom",
    label: "Custom",
  };
}

export default function WindowsWorkspace() {
  const [desktopNodes, setDesktopNodes] = useState<FsNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  const [themeId, setThemeId] = useState<WindowsThemeId>(DEFAULT_THEME_ID);
  const [customTheme, setCustomTheme] = useState<WindowsTheme>(defaultCustomTheme);

  const zCounter = useRef(10);
  const [windows, setWindows] = useState<AppWindow[]>([]);

  const theme: WindowsTheme = useMemo(() => {
    if (themeId === "custom") return customTheme;
    return WINDOWS_THEMES[themeId];
  }, [themeId, customTheme]);

  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

  const loadDesktop = useCallback(async () => {
    setUiError(null);
    try {
      const nodes = listChildren(null);
      setDesktopNodes(nodes);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Failed to load desktop");
    }
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = () => {
      void loadDesktop();
    };
    window.addEventListener("win-sim:fs-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("win-sim:fs-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, [loadDesktop]);

  useEffect(() => {
    // restore theme
    try {
      const cookieId = getCookie(COOKIE_THEME_ID);
      const storedId = window.localStorage.getItem(LS_THEME_ID);
      const candidate = (cookieId ?? storedId) as string | null;
      if (candidate) {
        const ok =
          candidate === "custom" ||
          Object.prototype.hasOwnProperty.call(WINDOWS_THEMES, candidate);
        if (ok) setThemeId(candidate as WindowsThemeId);
      }
      const storedCustom = window.localStorage.getItem(LS_CUSTOM_THEME);
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom) as WindowsTheme;
        setCustomTheme({ ...defaultCustomTheme(), ...parsed, id: "custom", label: "Custom" });
      }
    } catch {
      // ignore
    }

    void loadDesktop();
  }, [loadDesktop]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_THEME_ID, themeId);
      setCookie(COOKIE_THEME_ID, themeId);
      if (themeId === "custom") {
        window.localStorage.setItem(LS_CUSTOM_THEME, JSON.stringify(customTheme));
      }
    } catch {
      // ignore
    }
  }, [themeId, customTheme]);

  const openWindow = useCallback(
    (app: AppKind, opts: { title: string; w: number; h: number; data?: Record<string, unknown> }) => {
      const wid = makeId();
      const z = ++zCounter.current;
      const x = Math.max(12, Math.round(window.innerWidth / 2 - opts.w / 2));
      const y = Math.max(12, Math.round(window.innerHeight / 2 - opts.h / 2) - 20);

      const win: AppWindow = {
        wid,
        app,
        title: opts.title,
        frame: { x, y, w: opts.w, h: opts.h, z },
        data: opts.data ?? {},
      };
      setWindows((prev) => [...prev, win]);
      return wid;
    },
    [],
  );

  const focusWindow = useCallback((wid: string) => {
    setWindows((prev) => {
      const maxZ = Math.max(10, ...prev.map((w) => w.frame.z));
      return prev.map((w) =>
        w.wid === wid
          ? { ...w, frame: { ...w.frame, z: maxZ + 1, minimized: false } }
          : w,
      );
    });
  }, []);

  const closeWindow = useCallback((wid: string) => {
    setWindows((prev) => prev.filter((w) => w.wid !== wid));
  }, []);

  const toggleMinimize = useCallback((wid: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.wid === wid ? { ...w, frame: { ...w.frame, minimized: !w.frame.minimized } } : w,
      ),
    );
  }, []);

  const openExplorer = useCallback(() => {
    openWindow("explorer", { title: "File Explorer", w: 720, h: 520, data: { folderId: null } });
  }, [openWindow]);

  const openSettings = useCallback(() => {
    openWindow("settings", { title: "Settings", w: 620, h: 520 });
  }, [openWindow]);

  const openNotepadForNode = useCallback(
    (node: FsNode) => {
      openWindow("notepad", {
        title: `Notepad — ${node.name}`,
        w: 680,
        h: 520,
        data: { fileId: node.id },
      });
    },
    [openWindow],
  );

  async function createOnDesktop(type: "file" | "folder") {
    const name = window.prompt(
      type === "file" ? "New file name" : "New folder name",
      type === "file" ? "New Text Document.txt" : "New Folder",
    );
    if (!name) return;

    setBusy(true);
    setUiError(null);
    try {
      createNode({ parentId: null, type, name, content: type === "file" ? "" : null });
      await loadDesktop();
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFromDesktop(node: FsNode) {
    const ok = window.confirm(`Delete ${node.name}?`);
    if (!ok) return;

    setBusy(true);
    setUiError(null);
    try {
      deleteNode(node.id);
      await loadDesktop();
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  function openDesktopNode(node: FsNode) {
    if (node.type === "folder") {
      openWindow("explorer", {
        title: `File Explorer — ${node.name}`,
        w: 720,
        h: 520,
        data: { folderId: node.id },
      });
      return;
    }
    openNotepadForNode(node);
  }

  return (
    <div
      className="win-root relative h-dvh w-full overflow-hidden"
      style={{
        ...cssVars,
        background: "var(--win-wallpaper)",
      }}
      onClick={() => setStartOpen(false)}
    >
      {/* Desktop */}
      <div className="absolute inset-0 pb-12">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold text-white/90 drop-shadow">
            Windows Simulator
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded px-3 py-1 text-sm"
              style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
              onClick={(e) => {
                e.stopPropagation();
                void createOnDesktop("folder");
              }}
              disabled={busy}
            >
              New Folder
            </button>
            <button
              className="rounded px-3 py-1 text-sm"
              style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}
              onClick={(e) => {
                e.stopPropagation();
                void createOnDesktop("file");
              }}
              disabled={busy}
            >
              New File
            </button>
          </div>
        </div>

        {uiError ? (
          <div className="px-4">
            <div
              className="rounded px-3 py-2 text-sm"
              style={{
                background: "rgba(255,0,0,0.18)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {uiError}
            </div>
          </div>
        ) : null}

        <div className="grid auto-rows-max grid-cols-[repeat(auto-fill,96px)] gap-4 px-4 py-2">
          {desktopNodes.map((n) => (
            <div key={n.id} className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="grid h-14 w-14 place-items-center rounded"
                style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.18)" }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  openDesktopNode(n);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                title="Double-click to open"
              >
                <span className="text-2xl" aria-hidden>
                  {n.type === "folder" ? "📁" : "📄"}
                </span>
              </button>
              <div className="w-24 truncate text-center text-xs text-white drop-shadow" title={n.name}>
                {n.name}
              </div>
              <button
                className="rounded px-2 py-0.5 text-[11px]"
                style={{ background: "rgba(0,0,0,0.20)", color: "white", border: "1px solid rgba(255,255,255,0.18)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteFromDesktop(n);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Windows */}
      {windows.map((w) => (
        <WindowFrame
          key={w.wid}
          id={w.wid}
          title={w.title}
          state={w.frame}
          onChangeState={(next) =>
            setWindows((prev) => prev.map((x) => (x.wid === w.wid ? { ...x, frame: next } : x)))
          }
          onRequestClose={() => closeWindow(w.wid)}
          onRequestFocus={() => focusWindow(w.wid)}
        >
          {w.app === "explorer" ? (
            <ExplorerApp
              initialFolderId={(w.data.folderId as number | null | undefined) ?? null}
              onOpenFile={(node) => openNotepadForNode(node)}
            />
          ) : null}

          {w.app === "notepad" ? (
            <NotepadApp fileId={w.data.fileId as number} />
          ) : null}

          {w.app === "settings" ? (
            <SettingsApp
              themeId={themeId}
              customTheme={customTheme}
              onChangeThemeId={(id) => {
                setThemeId(id);
              }}
              onChangeCustomTheme={(t) => {
                setCustomTheme({ ...t, id: "custom", label: "Custom" });
                setThemeId("custom");
              }}
            />
          ) : null}
        </WindowFrame>
      ))}

      {/* Taskbar */}
      <div
        className="absolute inset-x-0 bottom-0 flex h-12 items-center gap-2 px-2"
        style={{
          background: "var(--win-taskbar-bg)",
          color: "var(--win-taskbar-fg)",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(10px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="rounded px-3 py-2 text-sm font-semibold"
          style={{
            background: "var(--win-start-bg)",
            color: "var(--win-start-fg)",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
          onClick={() => setStartOpen((v) => !v)}
        >
          Start
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-auto">
          {windows.map((w) => (
            <button
              key={w.wid}
              className="truncate rounded px-3 py-2 text-sm"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.16)" }}
              onClick={() => {
                if (w.frame.minimized) {
                  focusWindow(w.wid);
                } else {
                  toggleMinimize(w.wid);
                }
              }}
              title={w.title}
            >
              {w.title}
            </button>
          ))}
        </div>

        <div className="text-xs opacity-90">
          {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>

        {startOpen ? (
          <div
            className="absolute bottom-14 left-2 w-[min(360px,calc(100vw-16px))] rounded p-2"
            style={{
              background: "rgba(20,20,28,0.75)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(12px)",
              color: "white",
            }}
          >
            <div className="px-2 py-2 text-sm font-semibold">Apps</div>
            <div className="grid gap-2">
              <StartItem
                label="File Explorer"
                sub="Browse folders & files"
                onClick={() => {
                  setStartOpen(false);
                  openExplorer();
                }}
              />
              <StartItem
                label="Settings"
                sub="Change Windows version theme"
                onClick={() => {
                  setStartOpen(false);
                  openSettings();
                }}
              />
              <div className="my-1 h-px bg-white/10" />
              <StartItem
                label="New Folder (Desktop)"
                sub="Create a folder on the desktop"
                onClick={() => {
                  setStartOpen(false);
                  void createOnDesktop("folder");
                }}
              />
              <StartItem
                label="New File (Desktop)"
                sub="Create a text file on the desktop"
                onClick={() => {
                  setStartOpen(false);
                  void createOnDesktop("file");
                }}
              />
            </div>

            <div className="mt-2 px-2 py-2 text-xs text-white/80">
              Tip: Double-click desktop icons to open.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StartItem(props: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      className="w-full rounded px-3 py-2 text-left"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      onClick={props.onClick}
      type="button"
    >
      <div className="text-sm font-semibold">{props.label}</div>
      <div className="text-xs text-white/75">{props.sub}</div>
    </button>
  );
}
