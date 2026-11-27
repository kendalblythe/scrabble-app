import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

type PointerDrag = {
  tileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  isDragging: boolean;
};

function usePointerTileDrag(onDrop: (tileId: string, target: Element, x: number) => void) {
  const [drag, setDrag] = useState<PointerDrag | null>(null);
  const dragRef = useRef<PointerDrag | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const currentDrag = dragRef.current;
      if (!currentDrag || event.pointerId !== currentDrag.pointerId) {
        return;
      }

      const isDragging =
        currentDrag.isDragging ||
        Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY) >= 6;
      const nextDrag = {
        ...currentDrag,
        x: event.clientX,
        y: event.clientY,
        isDragging,
      };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    };

    const finishDrag = (event: PointerEvent, drop: boolean) => {
      const currentDrag = dragRef.current;
      if (!currentDrag || event.pointerId !== currentDrag.pointerId) {
        return;
      }

      if (drop && currentDrag.isDragging) {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (target) {
          onDropRef.current(currentDrag.tileId, target, event.clientX);
        }
      }

      dragRef.current = null;
      setDrag(null);
    };

    const handlePointerUp = (event: PointerEvent) => finishDrag(event, true);
    const handlePointerCancel = (event: PointerEvent) => finishDrag(event, false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, []);

  const startDrag = (tileId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) {
      return;
    }

    const nextDrag: PointerDrag = {
      tileId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      isDragging: false,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  };

  return { drag, startDrag };
}

export default usePointerTileDrag;
