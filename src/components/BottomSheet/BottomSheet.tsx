import { useEffect, useMemo, useRef, useState } from 'react';
import './BottomSheet.css';

type SheetHeight = 'sm' | 'md' | 'lg';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;

  title?: string;

  /**
   * Оставил для совместимости со старым кодом,
   * но теперь высота считается по контенту (auto) + max-height в CSS.
   */
  height?: SheetHeight;

  children: React.ReactNode;

  closeOnOverlay?: boolean;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  closeOnOverlay = true,
}: BottomSheetProps) {
  const startYRef = useRef<number>(0);
  const draggingRef = useRef<boolean>(false);
  const [dragY, setDragY] = useState(0);

  // Сбрасываем drag при закрытии/открытии, чтобы не оставалось "залипшего" смещения
  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  // Блокируем скролл body, когда шит открыт
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape закрывает
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const panelStyle = useMemo(() => {
    const y = Math.max(0, dragY);
    return {
      transform: open ? `translate3d(0, ${y}px, 0)` : `translate3d(0, 110%, 0)`,
    } as React.CSSProperties;
  }, [dragY, open]);

  const overlayClass = open ? 'sheet-overlay is-open' : 'sheet-overlay';
  const panelClass = open ? 'sheet-panel is-open' : 'sheet-panel';

  const onOverlayPointerDown = () => {
    if (!closeOnOverlay) return;
    onClose();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!open) return;

    draggingRef.current = true;
    startYRef.current = e.clientY;
    setDragY(0);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - startYRef.current;
    setDragY(Math.max(0, dy));
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    // Свайп вниз — закрываем
    if (dragY > 90) {
      setDragY(0);
      onClose();
      return;
    }
    setDragY(0);
  };

  return (
    <>
      <div
        className={overlayClass}
        onPointerDown={onOverlayPointerDown}
        aria-hidden={!open}
      />

      <div
        className={panelClass}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div
          className="sheet-handle-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="sheet-handle" />
        </div>

        <div
          className="sheet-header"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="sheet-title">{title ?? 'Меню'}</div>

          <button
  className="sheet-close"
  type="button"
  aria-label="Закрыть"
  onPointerDown={(e) => e.stopPropagation()}
  onClick={onClose}
>
  ✕
</button>
        </div>

        <div className="sheet-content">{children}</div>
      </div>
    </>
  );
}
