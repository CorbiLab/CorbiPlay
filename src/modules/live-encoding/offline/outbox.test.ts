import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSynced, DB_NAME, enqueue, listPending, markSynced } from "./outbox";

beforeEach(async () => {
  // Fresh database per test so records don't leak across tests.
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe("outbox", () => {
  it("enqueues a record and lists it as pending", async () => {
    await enqueue("INSERT_EVENT", { type: "BALL_WIN" });
    const pending = await listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].kind).toBe("INSERT_EVENT");
    expect(pending[0].status).toBe("pending");
  });

  it("preserves insertion order across multiple records", async () => {
    await enqueue("INSERT_EVENT", { order: 1 });
    await enqueue("INSERT_EVENT", { order: 2 });
    await enqueue("INSERT_EVENT", { order: 3 });
    const pending = await listPending();
    expect(pending.map((r) => (r.payload as { order: number }).order)).toEqual([1, 2, 3]);
  });

  it("marking a record synced removes it from the pending list", async () => {
    const id = await enqueue("INSERT_EVENT", { type: "GOAL" });
    await markSynced(id);
    const pending = await listPending();
    expect(pending).toHaveLength(0);
  });

  it("clearSynced removes synced records but keeps pending ones", async () => {
    const syncedId = await enqueue("INSERT_EVENT", { a: 1 });
    await enqueue("INSERT_EVENT", { a: 2 });
    await markSynced(syncedId);
    await clearSynced();
    const pending = await listPending();
    expect(pending).toHaveLength(1);
  });
});
