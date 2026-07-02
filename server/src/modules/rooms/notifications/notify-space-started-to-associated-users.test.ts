import { describe, expect, it } from "bun:test";

import { collectSpaceStartedRecipientUserIds } from "./collect-space-started-recipients";

describe("collectSpaceStartedRecipientUserIds", () => {
  it("dedupes invitees and participants and excludes host", () => {
    const ids = collectSpaceStartedRecipientUserIds(
      "host-1",
      ["user-a", "user-b", "host-1"],
      ["user-b", "user-c"],
    );
    expect(ids.sort()).toEqual(["user-a", "user-b", "user-c"]);
  });

  it("returns empty when only host is associated", () => {
    expect(collectSpaceStartedRecipientUserIds("host-1", [], ["host-1"])).toEqual([]);
  });
});
