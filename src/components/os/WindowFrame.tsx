"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useRef } from "react";

export type WindowFrameState = {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized?: boolean;
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function WindowFrame(props: {
  id: string;
  title: string;
  state: WindowFrameState;
  onChangeState: (next: WindowFrameState) => void;
  onRequestClose: () => void;
  onRequestFocus: () => void;
  children: ReactNode;
}) {
  const { state } = props;
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    pointerId: number;
  } | null>(null);

  const style = useMemo(() => {
    return {
      left: state.x,
      top: state.y,
      width: state.w,
      height: state.h,
      zIndex: state.z,
      borderRadius: "var(--win-radius)",
      background: "var(--win-window-bg)",
      color: "var(--win-window-fg)",
      border: `1px solid var(--win-window-border)`,
      boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
      backdropFilter: "blur(10px)",
    } as CSSProperties;
  }, [state]);

  if (state.minimized) return null;

  return (
    <div
      className="absolute overflow-hidden"
      style={style}
      onPointerDown={() => props.onRequestFocus()}
    >
      <div
        className="flex items-center justify-between select-none px-3 py-2"
        style={{
          background: "var(--win-titlebar-bg)",
          color: "var(--win-titlebar-fg)",
          borderBottom: "1px solid var(--win-window-border)",
          cursor: "grab",
        }}
        onPointerDown={(e) => {
          props.onRequestFocus();
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          draggingRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: state.x,
            originY: state.y,
            pointerId: e.pointerId,
          };
        }}
        onPointerMove={(e) => {
          const drag = draggingRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;

          const dx = e.clientX - drag.startX;
          const dy = e.clientY - drag.startY;

          const nextX = drag.originX + dx;
          const nextY = drag.originY + dy;

          const maxX = Math.max(0, window.innerWidth - state.w);
          const maxY = Math.max(0, window.innerHeight - state.h - 48);

          props.onChangeState({
            ...state,
            x: clamp(nextX, 0, maxX),
            y: clamp(nextY, 0, maxY),
          });
        }}
        onPointerUp={(e) => {
          const drag = draggingRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;
          draggingRef.current = null;
        }}
      >
        <div className="text-sm font-semibold truncate">{props.title}</div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-6 w-6 rounded text-xs font-bold"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              background: "rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.12)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              props.onRequestClose();
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-40px)] overflow-auto p-3">{props.children}</div>
    </div>
  );
}
