import { dropIndexForOffset, moveIndex } from "@/lib/reorder";

describe("reorder helpers", () => {
  it("moves an item to a new index", () => {
    expect(moveIndex(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveIndex(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("picks the nearest slot from a drag offset", () => {
    const heights = [80, 80, 80];
    expect(dropIndexForOffset(0, 0, heights)).toBe(0);
    expect(dropIndexForOffset(0, 90, heights)).toBe(1);
    expect(dropIndexForOffset(0, 180, heights)).toBe(2);
    expect(dropIndexForOffset(2, -180, heights)).toBe(0);
  });
});
