import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

type Variant = "ember" | "ink" | "quiet" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "lg" | "md" | "sm";
  icon?: IconName;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "ember",
  size = "lg",
  icon,
  block = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, styles[variant], styles[size], block ? styles.block : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 18 : 20} strokeWidth={1.9} />}
      <span>{children}</span>
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  tone?: "plain" | "soft";
}

/** A 44pt circular icon button for top bars and inline controls. */
export function IconButton({ icon, label, tone = "plain", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[styles.iconButton, tone === "soft" ? styles.soft : "", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}
