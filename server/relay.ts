import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RelayData, RelayStorage } from "../src/lib/remote/core";

/**
 * The relay's memory on a server: one small JSON file, written atomically.
 * Answers leave it as soon as the asker's app collects them.
 */
export function fileStorage(path: string): RelayStorage {
  let cache: RelayData | null = null;
  return {
    load() {
      if (!cache) {
        try {
          cache = JSON.parse(readFileSync(path, "utf8")) as RelayData;
        } catch {
          cache = { questions: {} };
        }
      }
      return cache;
    },
    save(data) {
      cache = data;
      mkdirSync(dirname(path), { recursive: true });
      const temp = `${path}.tmp`;
      writeFileSync(temp, JSON.stringify(data));
      renameSync(temp, path);
    },
  };
}
