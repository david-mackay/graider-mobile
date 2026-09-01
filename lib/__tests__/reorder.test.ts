import { dropIndexForOffset, indexFromWindowMids, moveIndex, scrollDeltaForEdge } from "@/lib/reorder";

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

  it("picks the nearest window midpoint", () => {
    expect(indexFromWindowMids(140, [40, 120, 200])).toBe(1);
    expect(indexFromWindowMids(10, [40, 120, 200])).toBe(0);
    expect(indexFromWindowMids(240, [40, 120, 200])).toBe(2);
  });

  it("scrolls when the finger is in the viewport edge", () => {
    expect(scrollDeltaForEdge(50, 0, 400, 80, 20)).toBeLessThan(0);
    expect(scrollDeltaForEdge(380, 0, 400, 80, 20)).toBeGreaterThan(0);
    expect(scrollDeltaForEdge(200, 0, 400, 80, 20)).toBe(0);
  });
});
