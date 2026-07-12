import { rosterEntryMatchesQuery, rosterMatchScore, searchAndSortRoster } from "@/lib/roster-display";
import type { RosterEntry } from "@/lib/types";

const alice: RosterEntry = {
  user_id: "1",
  full_name: "Alice Johnson",
  email: "alice.j@school.edu",
};

const bob: RosterEntry = {
  user_id: "2",
  full_name: "Bob Smith",
  email: "bob.s@school.edu",
};

const alice2: RosterEntry = {
  user_id: "3",
  full_name: "Alice Johnson",
  email: "alice.m@school.edu",
};

describe("roster-display search", () => {
  it("matches last name tokens", () => {
    expect(rosterEntryMatchesQuery(alice, "johnson")).toBe(true);
    expect(rosterEntryMatchesQuery(bob, "smith")).toBe(true);
  });

  it("matches first name tokens", () => {
    expect(rosterEntryMatchesQuery(alice, "ali")).toBe(true);
    expect(rosterEntryMatchesQuery(bob, "bob")).toBe(true);
  });

  it("ranks exact first-name matches higher", () => {
    const roster = [bob, alice, alice2];
    const results = searchAndSortRoster(roster, "alice");
    expect(results[0].user_id).toBe("1");
    expect(rosterMatchScore(alice, "alice")).toBeGreaterThan(rosterMatchScore(bob, "alice"));
  });

  it("matches email local part", () => {
    expect(rosterEntryMatchesQuery(alice2, "alice.m")).toBe(true);
  });
});
