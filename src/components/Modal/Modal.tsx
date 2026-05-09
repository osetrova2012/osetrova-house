import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;

  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;

  /**
   * Можно передать футер (кнопки "Ок/Отмена" и т.п.)
   */
  footer?: React.ReactNode;
}

function getFocusable(container: HTMLElement) {
  const selector =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
  );
}

export default function Modal({
  open,
  title,
  children,
  onClose,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  footer,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElRef = useRef<HTMLElement | null>(null);

  const modalId = useMemo(() => `modal-${Math.random().toString(36).slice(2)}`, []);
  const titleId = `${modalId}-title`;

  // Блокируем скролл body, пока модалка открыта
  useEffect(() => {
    if (!open) return;

    lastActiveElRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      // Возвращаем фокус туда, где он был
      lastActiveElRef.current?.focus?.();
    };
  }, [open]);

  // ESC + focus trap (Tab)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      const root = contentRef.current;
      if (!root) return;

      const focusables = getFocusable(root);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      const active = document.activeElement as HTMLElement | null;

      // Shift+Tab на первом -> на последний
      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab на последнем -> на первый
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeOnEsc, onClose]);

  // При открытии ставим фокус на первую фокусируемую кнопку/инпут, иначе — на кнопку закрытия
  useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => {
      const root = contentRef.current;
      if (!root) return;

      const focusables = getFocusable(root);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        // fallback: фокусим кнопку закрытия, если есть
        const closeBtn = root.querySelector<HTMLButtonElement>('[data-modal-close]');
        closeBtn?.focus();
      }
    }, 0);

    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown} role="presentation">
      <div
        className={`modal-card modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        ref={contentRef}
      >
        <div className="modal-header">
          {title ? (
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
          ) : (
            <div />
          )}

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Закрыть"
            data-modal-close
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
