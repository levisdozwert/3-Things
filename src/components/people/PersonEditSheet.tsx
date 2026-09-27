import { useEffect, useRef, useState } from "react";
import type { Person } from "../../lib/library";
import { squarePhoto } from "../../lib/photo";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { Sheet } from "../Sheet";
import styles from "./People.module.css";

interface PersonEditSheetProps {
  open: boolean;
  person: Person;
  /** Open with the note ready to write. */
  focusNote?: boolean;
  onSave: (patch: { name: string; note: string; photo?: string }) => void;
  onMerge: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * A name, one small note, maybe a photo. That's all a person is here: no
 * company, no title, no tags. Only the user can see any of it.
 */
export function PersonEditSheet({ open, person, focusNote, onSave, onMerge, onDelete, onClose }: PersonEditSheetProps) {
  const [name, setName] = useState(person.name);
  const [note, setNote] = useState(person.note ?? "");
  const [photo, setPhoto] = useState(person.photo);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const choose = useRef<HTMLInputElement>(null);
  const take = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(person.name);
    setNote(person.note ?? "");
    setPhoto(person.photo);
    setPhotoError(null);
  }, [open, person]);

  const usePhoto = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await squarePhoto(file));
      setPhotoError(null);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Couldn’t use that photo.");
    }
  };

  return (
    <Sheet
      open={open}
      title={`Edit ${person.name}`}
      onClose={onClose}
      actions={
        <>
          <Button
            variant="ink"
            block
            disabled={!name.trim()}
            onClick={() => onSave({ name: name.trim(), note: note.trim(), photo })}
          >
            Save
          </Button>
          <Button variant="text" size="md" block onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className={styles.photoRow}>
        <Avatar name={name || person.name} photo={photo} size="lg" />
        <div className={styles.photoActions}>
          <button type="button" className={styles.link} onClick={() => choose.current?.click()}>
            Choose a photo
          </button>
          <button type="button" className={styles.link} onClick={() => take.current?.click()}>
            Take a photo
          </button>
          {photo && (
            <button type="button" className={styles.link} onClick={() => setPhoto(undefined)}>
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={choose}
          className={styles.hiddenFile}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void usePhoto(e.target.files?.[0])}
        />
        <input
          ref={take}
          className={styles.hiddenFile}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void usePhoto(e.target.files?.[0])}
        />
      </div>
      {photoError && <p className={styles.sheetNote}>{photoError}</p>}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Name</span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          autoCapitalize="words"
          maxLength={48}
          data-autofocus={!focusNote || undefined}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>A little context</span>
        <input
          className={styles.input}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Friend, former manager, met at a conference…"
          autoComplete="off"
          maxLength={80}
          data-autofocus={focusNote || undefined}
        />
      </label>

      <p className={styles.sheetNote}>
        Only you can see {person.name} here. Nothing about them is public, and 3 Things never identifies anyone from
        a photo.
      </p>

      <div className={styles.sheetLinks}>
        <button type="button" className={styles.link} onClick={onMerge}>
          Same person as someone else?
        </button>
        <button type="button" className={`${styles.link} ${styles.danger}`} onClick={onDelete}>
          Delete {person.name}
        </button>
      </div>
    </Sheet>
  );
}
