/**
 * IndexedDB-backed outbox for live encoding writes (spec §71). A thin wrapper
 * over the native indexedDB API — deliberately not a dependency — so an event
 * tagged with zero connectivity survives a page refresh or crashed tab and
 * syncs once the network returns. See docs/OFFLINE_STRATEGY.md.
 */

export const DB_NAME = "hockey-trace-outbox";
const DB_VERSION = 1;
const STORE_NAME = "queue";

export type OutboxKind =
  | "INSERT_EVENT"
  | "UPDATE_EVENT"
  | "DELETE_EVENT"
  | "UPSERT_STINT"
  | "UPDATE_MATCH_CLOCK"
  | "INSERT_EVENT_PARTICIPANTS"
  | "UPSERT_POSSESSION";

export interface OutboxRecord<TPayload = unknown> {
  id: number;
  kind: OutboxKind;
  payload: TPayload;
  createdAt: number;
  status: "pending" | "synced";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue<TPayload>(kind: OutboxKind, payload: TPayload): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const record: Omit<OutboxRecord<TPayload>, "id"> = {
    kind,
    payload,
    createdAt: Date.now(),
    status: "pending",
  };
  const id = await promisifyRequest(store.add(record) as IDBRequest<number>);
  db.close();
  return id;
}

export async function listPending(): Promise<OutboxRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const all = await promisifyRequest(tx.objectStore(STORE_NAME).getAll() as IDBRequest<OutboxRecord[]>);
  db.close();
  return all.filter((r) => r.status === "pending").sort((a, b) => a.id - b.id);
}

export async function markSynced(id: number): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const record = await promisifyRequest(store.get(id) as IDBRequest<OutboxRecord | undefined>);
  if (record) {
    record.status = "synced";
    await promisifyRequest(store.put(record));
  }
  db.close();
}

export async function clearSynced(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const all = await promisifyRequest(store.getAll() as IDBRequest<OutboxRecord[]>);
  for (const record of all) {
    if (record.status === "synced") store.delete(record.id);
  }
  db.close();
}
