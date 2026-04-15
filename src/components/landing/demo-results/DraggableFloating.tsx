import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

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
  const activePointerId = useRef<number | null>(null);
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
    activePointerId.current = e.pointerId;
    setIsDragging(true);
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, []);

  const stopDragging = useCallback((pointerId?: number | null) => {
    if (pointerId != null && activePointerId.current != null && pointerId !== activePointerId.current) return;

    dragging.current = false;
    activePointerId.current = null;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;

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
    };

    const handlePointerEnd = (e: PointerEvent) => stopDragging(e.pointerId);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
    };
  }, [isDragging, stopDragging]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onLostPointerCapture={() => stopDragging()}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        touchAction: isDragging ? "none" : "auto",
      }}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          data-drag-handle
          className="mt-2 flex cursor-grab touch-none select-none flex-col items-center justify-center rounded-lg border border-border bg-card/95 p-1.5 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
          aria-label="Drag widget"
        >
          <GripVertical className="h-4 w-4" />
          <span className="text-[7px] font-bold uppercase leading-tight tracking-wider">{isDragging ? "Moving" : "Drag"}</span>
        </button>
        <div className="flex-1">

      {children}
        </div>
      </div>
    </div>
  );
};

export default DraggableFloating;
