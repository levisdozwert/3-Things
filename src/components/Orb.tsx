import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import styles from "./Orb.module.css";

interface OrbProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** What's inside the ember circle: a microphone, the three marks, a check. */
  children: ReactNode;
  label: string;
  size?: "md" | "lg";
  /** A soft ring that keeps pulsing while something is listening. */
  live?: boolean;
  /** Lets the circle glide between screens (Home → Ask, Ready → Listening). */
  transitionName?: string;
}

/** The ember circle: the one thing to press on a screen, with its label underneath. */
export function Orb({ children, label, size = "lg", live = false, transitionName, className, type = "button", ...rest }: OrbProps) {
  return (
    <button type={type} className={[styles.orbButton, styles[size], className].filter(Boolean).join(" ")} {...rest}>
      <span
        className={`${styles.orb} ${live ? styles.live : ""}`}
        style={transitionName ? ({ viewTransitionName: transitionName } as CSSProperties) : undefined}
      >
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.icon}>{children}</span>
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
