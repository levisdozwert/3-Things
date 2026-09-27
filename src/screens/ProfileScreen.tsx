import { useRef, useState } from "react";
import { Avatar } from "../components/Avatar";
import { Button, IconButton } from "../components/Button";
import people from "../components/people/People.module.css";
import { squarePhoto } from "../lib/photo";
import { useStore } from "../lib/store";
import { useBack } from "../lib/useBack";
import styles from "./ProfileScreen.module.css";

/**
 * Just enough to be you in the app: a name, the name you go by, a photo if
 * you like. No birthday, job, school or handles. Changes save as you go.
 */
export function ProfileScreen() {
  const { settings, updateProfile } = useStore();
  const back = useBack("/you");
  const { profile } = settings;
  const [photoError, setPhotoError] = useState<string | null>(null);
  const choose = useRef<HTMLInputElement>(null);
  const take = useRef<HTMLInputElement>(null);
  const shown = profile.preferredName.trim() || profile.firstName.trim();

  const usePhoto = async (file?: File) => {
    if (!file) return;
    try {
      updateProfile({ photo: await squarePhoto(file) });
      setPhotoError(null);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Couldn’t use that photo.");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <IconButton icon="back" label="Back" onClick={back} />
        <Button variant="text" size="sm" onClick={back}>
          Done
        </Button>
      </div>

      <h1 className={`serif ${styles.title}`}>Your profile</h1>

      <div className={styles.photo}>
        <Avatar name={shown} photo={profile.photo} size="xl" />
        <div className={people.photoActions}>
          <button type="button" className={people.link} onClick={() => choose.current?.click()}>
            Choose a photo
          </button>
          <button type="button" className={people.link} onClick={() => take.current?.click()}>
            Take a photo
          </button>
          {profile.photo && (
            <button type="button" className={people.link} onClick={() => updateProfile({ photo: undefined })}>
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={choose}
          className={people.hiddenFile}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void usePhoto(e.target.files?.[0])}
        />
        <input
          ref={take}
          className={people.hiddenFile}
          type="file"
          accept="image/*"
          capture="user"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void usePhoto(e.target.files?.[0])}
        />
      </div>
      {photoError && <p className={styles.hint}>{photoError}</p>}

      <div className={styles.fields}>
        <label className={people.field}>
          <span className={people.fieldLabel}>First name</span>
          <input
            className={people.input}
            value={profile.firstName}
            onChange={(e) => updateProfile({ firstName: e.target.value })}
            autoComplete="given-name"
            autoCapitalize="words"
            maxLength={40}
          />
        </label>
        <label className={people.field}>
          <span className={people.fieldLabel}>Last name</span>
          <input
            className={people.input}
            value={profile.lastName}
            onChange={(e) => updateProfile({ lastName: e.target.value })}
            placeholder="Optional"
            autoComplete="family-name"
            autoCapitalize="words"
            maxLength={40}
          />
        </label>
        <div className={people.field}>
          <label htmlFor="preferred-name" className={people.fieldLabel}>
            Preferred name
          </label>
          <input
            id="preferred-name"
            className={people.input}
            value={profile.preferredName}
            onChange={(e) => updateProfile({ preferredName: e.target.value })}
            placeholder={profile.firstName.trim() || "What 3 Things calls you"}
            aria-describedby="preferred-name-hint"
            autoComplete="nickname"
            autoCapitalize="words"
            maxLength={40}
          />
          <span id="preferred-name-hint" className={styles.hint}>
            What 3 Things calls you. Leave it empty to use your first name.
          </span>
        </div>
      </div>

      <p className={styles.enough}>That’s all 3 Things needs. No birthday, no job title, no social handles.</p>
    </main>
  );
}
