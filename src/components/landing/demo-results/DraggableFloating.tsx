import { useState, useRef, useCallback, type ReactNode } from "react";

interface DraggableFloatingProps {
  children: ReactNode;
  initialX: number;
  initialY: number;
}

const DraggableFloating = ({ children, initialX, initialY }: DraggableFloatingProps) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from the container itself or its direct button child, not inner interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, [data-no-drag]")) return;

    dragging.current = true;
    moved.current = false;
    const rect = containerRef.current!.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    moved.current = true;

    const newX = e.clientX - offset.current.x;
    const newY = e.clientY - offset.current.y;

    // Clamp to viewport
    const el = containerRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - h;

    setPos({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        touchAction: "none",
        cursor: dragging.current ? "grabbing" : "grab",
      }}
    >
      {children}
    </div>
  );
};

export default DraggableFloating;
