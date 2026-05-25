'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type WheelEvent
} from 'react';

type HorizontalScrollSurfaceProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  surfaceRef?: RefObject<HTMLDivElement | null>;
};

type DragState = {
  active: boolean;
  moved: boolean;
  pointerId: number;
  startX: number;
  startScrollLeft: number;
};

const interactiveSelector =
  'a, button, input, textarea, select, label, [draggable="true"], [data-kanban-card="true"]';
const keyboardStep = 220;

export function HorizontalScrollSurface({
  children,
  className,
  ariaLabel = 'Horizontal scroll area',
  surfaceRef
}: HorizontalScrollSurfaceProps) {
  const internalSurfaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!surfaceRef) {
      return;
    }

    surfaceRef.current = internalSurfaceRef.current;
  }, [surfaceRef]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest(interactiveSelector)) {
      return;
    }

    const surface = internalSurfaceRef.current;
    if (!surface) {
      return;
    }

    surface.focus();
    surface.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: surface.scrollLeft
    };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const surface = internalSurfaceRef.current;
    const dragState = dragStateRef.current;

    if (!surface || !dragState.active) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 3) {
      dragState.moved = true;
      if (!dragging) {
        setDragging(true);
      }
    }

    surface.scrollLeft = dragState.startScrollLeft - deltaX;
    event.preventDefault();
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const surface = internalSurfaceRef.current;
    const dragState = dragStateRef.current;

    if (!dragState.active) {
      return;
    }

    if (surface?.hasPointerCapture(dragState.pointerId)) {
      surface.releasePointerCapture(dragState.pointerId);
    }

    dragState.active = false;
    setDragging(false);

    if (dragState.moved) {
      window.setTimeout(() => {
        dragState.moved = false;
      }, 0);
    }

    event.preventDefault();
  };

  const preventClickAfterDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const surface = internalSurfaceRef.current;
    if (!surface) {
      return;
    }

    if (event.key === 'ArrowRight') {
      surface.scrollBy({ left: keyboardStep, behavior: 'smooth' });
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowLeft') {
      surface.scrollBy({ left: -keyboardStep, behavior: 'smooth' });
      event.preventDefault();
      return;
    }

    if (event.key === 'Home') {
      surface.scrollTo({ left: 0, behavior: 'smooth' });
      event.preventDefault();
      return;
    }

    if (event.key === 'End') {
      surface.scrollTo({ left: surface.scrollWidth, behavior: 'smooth' });
      event.preventDefault();
    }
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const surface = internalSurfaceRef.current;
    if (!surface) {
      return;
    }

    const dominantDeltaIsVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);
    if (
      dominantDeltaIsVertical &&
      shouldPreserveVerticalWheel(event.target as HTMLElement | null, surface, event.deltaY)
    ) {
      return;
    }

    const horizontalDelta = dominantDeltaIsVertical ? event.deltaY : event.deltaX;
    if (horizontalDelta !== 0) {
      surface.scrollLeft += horizontalDelta;
      event.preventDefault();
    }
  };

  return (
    <div
      ref={internalSurfaceRef}
      className={joinClasses('horizontal-scroll-surface', dragging ? 'is-dragging' : undefined, className)}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={preventClickAfterDrag}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
    >
      {children}
    </div>
  );
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function shouldPreserveVerticalWheel(
  target: HTMLElement | null,
  surface: HTMLDivElement,
  deltaY: number
) {
  const scrollableAncestor = findScrollableVerticalAncestor(target, surface);
  if (!scrollableAncestor) {
    return false;
  }

  if (deltaY < 0) {
    return scrollableAncestor.scrollTop > 0;
  }

  if (deltaY > 0) {
    return (
      scrollableAncestor.scrollTop + scrollableAncestor.clientHeight <
      scrollableAncestor.scrollHeight
    );
  }

  return false;
}

function findScrollableVerticalAncestor(
  target: HTMLElement | null,
  surface: HTMLDivElement
) {
  let currentElement = target;

  while (currentElement && currentElement !== surface) {
    const { overflowY } = window.getComputedStyle(currentElement);
    const canScrollVertically =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      currentElement.scrollHeight > currentElement.clientHeight;

    if (canScrollVertically) {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  return null;
}
