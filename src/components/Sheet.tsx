import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Sheet.module.css";

interface SheetProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

/** A calm bottom sheet for the rare moments that need a decision or a few words. */
export function Sheet({ open, title, children, actions, onClose }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>("button"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.layer}>
      <div className={styles.scrim} onClick={onClose} />
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <span className={styles.grip} aria-hidden="true" />
        <h2 id="sheet-title" className={`serif ${styles.title}`}>
          {title}
        </h2>
        {children && <div className={styles.body}>{children}</div>}
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  );
}
