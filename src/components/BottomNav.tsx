import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import styles from "./BottomNav.module.css";

const items: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/library", label: "Library", icon: "library" },
  { to: "/you", label: "You", icon: "you" },
];

/** Three places, on purpose. */
export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.inner}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            viewTransition
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
          >
            <Icon name={item.icon} size={24} strokeWidth={1.8} />
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
