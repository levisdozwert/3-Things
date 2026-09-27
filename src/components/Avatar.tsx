import styles from "./Avatar.module.css";

const tones = ["ember", "sage", "sand", "dusk", "clay"] as const;

function toneFor(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

function initial(name: string) {
  const words = name.trim().split(/\s+/);
  // "Professor Reyes" → R, "Grandpa Joe" → J, "Mom" → M
  const honorifics = /^(professor|prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?|grandpa|grandma|uncle|aunt|auntie|coach)$/i;
  const word = words.length > 1 && honorifics.test(words[0]) ? words[1] : words[0];
  return (word?.[0] ?? "").toUpperCase();
}

type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  /** A photo the user chose for them. Otherwise, a warm initial. */
  photo?: string;
  size?: Size;
}

/**
 * A warm monogram for the person the knowledge came from, or the photo the
 * user added. Several people ("Jason + Sarah") overlap, quietly.
 */
export function Avatar({ name, photo, size = "md" }: AvatarProps) {
  const names = name.split(" + ").filter((n) => n.trim());
  if (names.length > 1 && !photo) {
    return (
      <span className={`${styles.pair} ${styles[size]}`} aria-hidden="true">
        <Avatar name={names[0]} size={size} />
        <Avatar name={names[1]} size={size} />
      </span>
    );
  }
  if (photo) {
    return (
      <span className={`${styles.avatar} ${styles[size]} ${styles.photo}`} aria-hidden="true">
        <img src={photo} alt="" />
      </span>
    );
  }
  const letter = initial(name);
  return (
    <span className={`${styles.avatar} ${styles[size]} ${styles[letter ? toneFor(name) : "empty"]}`} aria-hidden="true">
      {letter || <span className={styles.dot} />}
    </span>
  );
}
