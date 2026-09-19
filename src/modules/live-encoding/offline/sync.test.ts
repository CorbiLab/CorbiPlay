import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { enqueue, listFailed, listPending, DB_NAME } from "./outbox";
import { drainOutbox, isPermanentError } from "./sync";

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

describe("drainOutbox", () => {
  it("reports SYNCED when the outbox is empty", async () => {
    expect(await drainOutbox({ applyRecord: async () => {} })).toBe("SYNCED");
  });

  it("applies records in order and reports SYNCED on success", async () => {
    const applied: unknown[] = [];
    await enqueue("INSERT_EVENT", { order: 1 });
    await enqueue("INSERT_EVENT", { order: 2 });

    const status = await drainOutbox({
      applyRecord: async (record) => {
        applied.push(record.payload);
      },
    });

    expect(status).toBe("SYNCED");
    expect(applied).toEqual([{ order: 1 }, { order: 2 }]);
  });

  it("stops at the first failure and reports OFFLINE, leaving later records pending", async () => {
    const applied: unknown[] = [];
    await enqueue("INSERT_EVENT", { order: 1 });
    await enqueue("INSERT_EVENT", { order: 2 });

    const status = await drainOutbox({
      applyRecord: async () => {
        throw new Error("network down");
      },
    });

    expect(status).toBe("OFFLINE");
    expect(applied).toEqual([]);

    // Retrying once the network is back applies both, in order.
    const secondAttempt = await drainOutbox({
      applyRecord: async (record) => {
        applied.push(record.payload);
      },
    });
    expect(secondAttempt).toBe("SYNCED");
    expect(applied).toEqual([{ order: 1 }, { order: 2 }]);
  });

  it("skips a permanent failure (e.g. a foreign key pointing at a deleted match) instead of blocking everything behind it", async () => {
    const applied: unknown[] = [];
    await enqueue("INSERT_EVENT", { order: 1 });
    await enqueue("INSERT_EVENT", { order: 2, badRef: true });
    await enqueue("INSERT_EVENT", { order: 3 });

    const status = await drainOutbox({
      applyRecord: async (record) => {
        const payload = record.payload as { badRef?: boolean };
        if (payload.badRef) {
          const error = { code: "23503", message: "violates foreign key constraint" };
          throw error;
        }
        applied.push(record.payload);
      },
    });

    expect(status).toBe("SYNCED_WITH_ERRORS");
    expect(applied).toEqual([{ order: 1 }, { order: 3 }]);
    expect(await listPending()).toEqual([]);

    const failed = await listFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].lastError).toContain("foreign key");
  });

  it("does not retry a permanently-failed record on a later drain", async () => {
    await enqueue("INSERT_EVENT", { badRef: true });

    await drainOutbox({
      applyRecord: async () => {
        throw { code: "23503", message: "violates foreign key constraint" };
      },
    });

    let secondAttemptCalled = false;
    const status = await drainOutbox({
      applyRecord: async () => {
        secondAttemptCalled = true;
      },
    });

    expect(secondAttemptCalled).toBe(false);
    expect(status).toBe("SYNCED_WITH_ERRORS");
  });
});

describe("isPermanentError", () => {
  it("treats Postgres integrity-constraint violations (23xxx) as permanent", () => {
    expect(isPermanentError({ code: "23503" })).toBe(true);
    expect(isPermanentError({ code: "23505" })).toBe(true);
    expect(isPermanentError({ code: "23502" })).toBe(true);
  });

  it("treats an RLS/permission denial (42501) as permanent", () => {
    expect(isPermanentError({ code: "42501" })).toBe(true);
  });

  it("treats a network error (no Postgres code) as retryable, not permanent", () => {
    expect(isPermanentError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isPermanentError(null)).toBe(false);
  });
});
