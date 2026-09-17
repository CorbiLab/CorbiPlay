import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { enqueue, DB_NAME } from "./outbox";
import { drainOutbox } from "./sync";

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
});
