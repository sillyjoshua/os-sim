import type { CSSProperties } from "react";

export type WindowsThemeId =
  | "win95"
  | "winxp"
  | "win7"
  | "win10"
  | "win11"
  | "custom";

export type WindowsTheme = {
  id: WindowsThemeId;
  label: string;
  fontFamily: string;
  wallpaper: string;
  taskbarBg: string;
  taskbarFg: string;
  startBg: string;
  startFg: string;
  windowBg: string;
  windowFg: string;
  windowBorder: string;
  titlebarBg: string;
  titlebarFg: string;
  accent: string;
  radius: string;
};

export const WINDOWS_THEMES: Record<Exclude<WindowsThemeId, "custom">, WindowsTheme> = {
  win95: {
    id: "win95",
    label: "Windows 95",
    fontFamily: '"MS Sans Serif", Tahoma, system-ui, sans-serif',
    wallpaper: "linear-gradient(135deg, #008080 0%, #007070 50%, #005f5f 100%)",
    taskbarBg: "#c0c0c0",
    taskbarFg: "#000000",
    startBg: "#c0c0c0",
    startFg: "#000000",
    windowBg: "#c0c0c0",
    windowFg: "#000000",
    windowBorder: "#000000",
    titlebarBg: "#000080",
    titlebarFg: "#ffffff",
    accent: "#000080",
    radius: "0px",
  },
  winxp: {
    id: "winxp",
    label: "Windows XP",
    fontFamily: 'Tahoma, "Trebuchet MS", system-ui, sans-serif',
    wallpaper: "radial-gradient(circle at 30% 30%, #8fd3ff 0%, #2b7bd8 50%, #0c2f6c 100%)",
    taskbarBg: "linear-gradient(180deg, #2a6ad8 0%, #1a4fb0 100%)",
    taskbarFg: "#ffffff",
    startBg: "linear-gradient(180deg, #3bb54a 0%, #1c8d2a 100%)",
    startFg: "#ffffff",
    windowBg: "#f3f7ff",
    windowFg: "#0b1020",
    windowBorder: "#1b4fae",
    titlebarBg: "linear-gradient(180deg, #3f7fe6 0%, #245fd6 100%)",
    titlebarFg: "#ffffff",
    accent: "#2a6ad8",
    radius: "10px",
  },
  win7: {
    id: "win7",
    label: "Windows 7",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    wallpaper: "radial-gradient(circle at 50% 30%, #bfe9ff 0%, #2f6eea 55%, #0b1a4a 100%)",
    taskbarBg: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)",
    taskbarFg: "#ffffff",
    startBg: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)",
    startFg: "#ffffff",
    windowBg: "rgba(255,255,255,0.92)",
    windowFg: "#0b1020",
    windowBorder: "rgba(255,255,255,0.45)",
    titlebarBg: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.25) 100%)",
    titlebarFg: "#0b1020",
    accent: "#2f6eea",
    radius: "12px",
  },
  win10: {
    id: "win10",
    label: "Windows 10",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    wallpaper: "linear-gradient(135deg, #0b4aa2 0%, #0c7bdc 45%, #1b9af5 100%)",
    taskbarBg: "rgba(0,0,0,0.72)",
    taskbarFg: "#ffffff",
    startBg: "rgba(0,120,215,0.95)",
    startFg: "#ffffff",
    windowBg: "#ffffff",
    windowFg: "#111827",
    windowBorder: "rgba(0,0,0,0.25)",
    titlebarBg: "#f3f4f6",
    titlebarFg: "#111827",
    accent: "#0078d7",
    radius: "10px",
  },
  win11: {
    id: "win11",
    label: "Windows 11",
    fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    wallpaper: "radial-gradient(circle at 25% 20%, #b4d7ff 0%, #6b8cff 40%, #1f2a7a 100%)",
    taskbarBg: "rgba(20,20,28,0.55)",
    taskbarFg: "#ffffff",
    startBg: "rgba(255,255,255,0.15)",
    startFg: "#ffffff",
    windowBg: "rgba(255,255,255,0.88)",
    windowFg: "#0b1020",
    windowBorder: "rgba(255,255,255,0.5)",
    titlebarBg: "rgba(255,255,255,0.55)",
    titlebarFg: "#0b1020",
    accent: "#2563eb",
    radius: "16px",
  },
};

export const DEFAULT_THEME_ID: WindowsThemeId = "win11";

export function themeToCssVars(theme: WindowsTheme) {
  return {
    "--win-font": theme.fontFamily,
    "--win-wallpaper": theme.wallpaper,
    "--win-taskbar-bg": theme.taskbarBg,
    "--win-taskbar-fg": theme.taskbarFg,
    "--win-start-bg": theme.startBg,
    "--win-start-fg": theme.startFg,
    "--win-window-bg": theme.windowBg,
    "--win-window-fg": theme.windowFg,
    "--win-window-border": theme.windowBorder,
    "--win-titlebar-bg": theme.titlebarBg,
    "--win-titlebar-fg": theme.titlebarFg,
    "--win-accent": theme.accent,
    "--win-radius": theme.radius,
  } as CSSProperties;
}
