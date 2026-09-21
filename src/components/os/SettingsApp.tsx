"use client";

import type { WindowsTheme, WindowsThemeId } from "@/lib/windows-themes";
import { WINDOWS_THEMES } from "@/lib/windows-themes";

export default function SettingsApp(props: {
  themeId: WindowsThemeId;
  customTheme: WindowsTheme;
  onChangeThemeId: (id: WindowsThemeId) => void;
  onChangeCustomTheme: (theme: WindowsTheme) => void;
}) {
  const presets = Object.values(WINDOWS_THEMES);

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <div className="text-sm font-semibold">Settings</div>
        <div className="text-xs opacity-80">
          Pick a Windows version look, or choose Custom and tweak colors.
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Windows version theme</label>
        <select
          className="rounded px-3 py-2 text-sm"
          style={{ border: "1px solid rgba(0,0,0,0.15)", background: "rgba(255,255,255,0.85)" }}
          value={props.themeId}
          onChange={(e) => props.onChangeThemeId(e.target.value as WindowsThemeId)}
        >
          {presets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>

      {props.themeId === "custom" ? (
        <div className="grid gap-3 rounded p-3" style={{ border: "1px solid rgba(0,0,0,0.12)", background: "rgba(255,255,255,0.45)" }}>
          <div className="text-sm font-semibold">Custom theme</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Accent</span>
              <input
                type="color"
                value={props.customTheme.accent}
                onChange={(e) => props.onChangeCustomTheme({ ...props.customTheme, accent: e.target.value })}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Taskbar background</span>
              <input
                type="color"
                value={normalizeToColor(props.customTheme.taskbarBg)}
                onChange={(e) => props.onChangeCustomTheme({ ...props.customTheme, taskbarBg: e.target.value })}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Titlebar background</span>
              <input
                type="color"
                value={normalizeToColor(props.customTheme.titlebarBg)}
                onChange={(e) => props.onChangeCustomTheme({ ...props.customTheme, titlebarBg: e.target.value })}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Window background</span>
              <input
                type="color"
                value={normalizeToColor(props.customTheme.windowBg)}
                onChange={(e) => props.onChangeCustomTheme({ ...props.customTheme, windowBg: e.target.value })}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Wallpaper (start color)</span>
              <input
                type="color"
                value={extractGradientColor(props.customTheme.wallpaper, 0) ?? "#1f2a7a"}
                onChange={(e) => {
                  const c1 = e.target.value;
                  const c2 = extractGradientColor(props.customTheme.wallpaper, 1) ?? "#6b8cff";
                  props.onChangeCustomTheme({
                    ...props.customTheme,
                    wallpaper: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                  });
                }}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Wallpaper (end color)</span>
              <input
                type="color"
                value={extractGradientColor(props.customTheme.wallpaper, 1) ?? "#6b8cff"}
                onChange={(e) => {
                  const c1 = extractGradientColor(props.customTheme.wallpaper, 0) ?? "#1f2a7a";
                  const c2 = e.target.value;
                  props.onChangeCustomTheme({
                    ...props.customTheme,
                    wallpaper: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                  });
                }}
              />
            </label>
          </div>

          <div className="text-xs opacity-80">
            Tip: these controls don’t match every historic Windows detail, but they let you approximate almost any version.
          </div>
        </div>
      ) : null}

      <div className="mt-auto text-xs opacity-80">
        Themes are stored locally in your browser (localStorage).
      </div>
    </div>
  );
}

function normalizeToColor(value: string) {
  // If it’s already a hex color, pass through; otherwise fallback.
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
  return "#222222";
}

function extractGradientColor(gradient: string, index: 0 | 1): string | null {
  const match = gradient.match(/#([0-9a-fA-F]{6})/g);
  if (!match) return null;
  return match[index] ?? null;
}
