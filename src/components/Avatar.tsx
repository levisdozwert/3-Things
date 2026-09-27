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

interface AvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/** A warm monogram for the person the knowledge came from. */
export function Avatar({ name, size = "md" }: AvatarProps) {
  const letter = initial(name);
  return (
    <span className={`${styles.avatar} ${styles[size]} ${styles[letter ? toneFor(name) : "empty"]}`} aria-hidden="true">
      {letter || <span className={styles.dot} />}
    </span>
  );
}
