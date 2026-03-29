import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

const VIEWPORT_PADDING = 12;

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

interface DraggableFloatingProps {
  children: ReactNode;
  initialX: number;
  initialY: number;
  dragLabel?: string;
}

const DraggableFloating = ({
  children,
  initialX,
  initialY,
  dragLabel = "Drag me",
}: DraggableFloatingProps) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampPosition = useCallback((nextPosition?: { x: number; y: number }) => {
    const el = containerRef.current;
    if (!el) return;

    const maxX = window.innerWidth - el.offsetWidth - VIEWPORT_PADDING;
    const maxY = window.innerHeight - el.offsetHeight - VIEWPORT_PADDING;

    setPos((prev) => {
      const base = nextPosition ?? prev;
      const clamped = {
        x: clampValue(base.x, VIEWPORT_PADDING, maxX),
        y: clampValue(base.y, VIEWPORT_PADDING, maxY),
      };

      return prev.x === clamped.x && prev.y === clamped.y ? prev : clamped;
    });
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => clampPosition());
    return () => window.cancelAnimationFrame(frame);
  }, [children, clampPosition]);

  useEffect(() => {
    const handleResize = () => clampPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;

    const el = containerRef.current;
    if (!el) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxX = window.innerWidth - w - VIEWPORT_PADDING;
    const maxY = window.innerHeight - h - VIEWPORT_PADDING;

    const newX = e.clientX - offset.current.x;
    const newY = e.clientY - offset.current.y;

    setPos({
      x: clampValue(newX, VIEWPORT_PADDING, maxX),
      y: clampValue(newY, VIEWPORT_PADDING, maxY),
    });
  }, []);

  const stopDragging = useCallback(() => {
    dragging.current = false;
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onLostPointerCapture={stopDragging}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        touchAction: "auto",
      }}
    >
      <button
        type="button"
        data-drag-handle
        className="mx-auto mb-1.5 inline-flex select-none items-center gap-1.5 rounded-full border border-border bg-card/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm"
        aria-label="Drag widget"
      >
        <span className="text-xs leading-none">⋮⋮</span>
        <span>{isDragging ? "Moving..." : dragLabel}</span>
      </button>
      {children}
    </div>
  );
};

export default DraggableFloating;
