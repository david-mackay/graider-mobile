import {
  flattenStudentBuckets,
  movePageInBucket,
  totalPageCount,
  type StudentBucket,
} from "@/lib/student-grade";
import type { PickedImage } from "@/lib/picked-image";

function mockPage(id: string): PickedImage {
  return { uri: `file://${id}`, name: `${id}.jpg`, mimeType: "image/jpeg", size: 1000 };
}

describe("student-grade helpers", () => {
  it("flattens buckets preserving page order per student", () => {
    const buckets: StudentBucket[] = [
      { studentId: "s1", studentName: "Alice", pages: [mockPage("a1"), mockPage("a2")] },
      { studentId: "s2", studentName: "Bob", pages: [mockPage("b1")] },
    ];

    const { files, pageToStudentId, studentPageIndices } = flattenStudentBuckets(buckets);

    expect(files).toHaveLength(3);
    expect(pageToStudentId.get(0)).toBe("s1");
    expect(pageToStudentId.get(1)).toBe("s1");
    expect(pageToStudentId.get(2)).toBe("s2");
    expect(studentPageIndices.get("s1")).toEqual([0, 1]);
    expect(studentPageIndices.get("s2")).toEqual([2]);
  });

  it("reorders pages within a bucket", () => {
    const pages = [mockPage("p1"), mockPage("p2"), mockPage("p3")];
    const moved = movePageInBucket(pages, 2, 0);
    expect(moved.map((p) => p.name)).toEqual(["p3.jpg", "p1.jpg", "p2.jpg"]);
  });

  it("counts total pages across buckets", () => {
    const buckets: StudentBucket[] = [
      { studentId: "s1", studentName: "A", pages: [mockPage("1"), mockPage("2")] },
      { studentId: "s2", studentName: "B", pages: [] },
    ];
    expect(totalPageCount(buckets)).toBe(2);
  });
});
