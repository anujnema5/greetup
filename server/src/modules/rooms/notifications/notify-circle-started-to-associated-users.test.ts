import { describe, expect, it } from "bun:test";

import { collectCircleStartedRecipientUserIds } from "./collect-circle-started-recipients";

describe("collectCircleStartedRecipientUserIds", () => {
  it("dedupes invitees and participants and excludes host", () => {
    const ids = collectCircleStartedRecipientUserIds(
      "host-1",
      ["user-a", "user-b", "host-1"],
      ["user-b", "user-c"],
    );
    expect(ids.sort()).toEqual(["user-a", "user-b", "user-c"]);
  });

  it("returns empty when only host is associated", () => {
    expect(collectCircleStartedRecipientUserIds("host-1", [], ["host-1"])).toEqual([]);
  });
});
