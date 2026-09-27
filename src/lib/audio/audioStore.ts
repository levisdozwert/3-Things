/**
 * Original recordings live on this device only, in IndexedDB, keyed by capture id:
 * the conversation, then any follow-ups. They exist so the user can verify what
 * someone said, not as the saved object.
 */

const DB_NAME = "three-things";
const STORE = "recordings";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecording(id: string, clips: Blob[]): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.put(clips, id));
    return true;
  } catch {
    return false;
  }
}

export async function loadRecording(id: string): Promise<Blob[]> {
  try {
    const stored = (await run("readonly", (s) => s.get(id))) as Blob | Blob[] | undefined;
    if (!stored) return [];
    return Array.isArray(stored) ? stored : [stored];
  } catch {
    return [];
  }
}

export async function deleteRecording(id: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {
    /* nothing to delete */
  }
}

export async function deleteAllRecordings(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    /* nothing to delete */
  }
}
