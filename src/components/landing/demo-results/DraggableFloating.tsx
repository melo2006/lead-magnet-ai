import { useState, useRef, useCallback, type ReactNode } from "react";

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
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);

    const newX = e.clientX - offset.current.x;
    const newY = e.clientY - offset.current.y;

    setPos({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
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
