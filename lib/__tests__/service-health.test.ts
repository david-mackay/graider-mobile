import { formatServiceHealthBanner, type HealthReport } from "@/lib/service-health";

function report(partial: Partial<HealthReport["services"]>): HealthReport {
  return {
    ok: false,
    checkedAt: new Date().toISOString(),
    services: {
      api: { status: "ok" },
      database: { status: "ok" },
      worker: { status: "ok" },
      ...partial,
    },
  };
}

describe("formatServiceHealthBanner", () => {
  it("returns null when everything is healthy", () => {
    expect(
      formatServiceHealthBanner(
        {
          ok: true,
          checkedAt: new Date().toISOString(),
          services: {
            api: { status: "ok" },
            database: { status: "ok" },
            worker: { status: "ok" },
          },
        },
        null,
      ),
    ).toBeNull();
  });

  it("surfaces fetch errors when the API is unreachable", () => {
    expect(formatServiceHealthBanner(null, "Can't reach the Graider API")).toBe(
      "Can't reach the Graider API",
    );
  });

  it("lists unavailable services with detail", () => {
    const message = formatServiceHealthBanner(
      report({
        worker: { status: "error", message: "No grading workers connected" },
      }),
      null,
    );
    expect(message).toContain("Grading worker");
    expect(message).toContain("No grading workers connected");
  });

  it("joins multiple outages", () => {
    const message = formatServiceHealthBanner(
      report({
        database: { status: "error", message: "Database unreachable" },
        worker: { status: "error", message: "No grading workers connected" },
      }),
      null,
    );
    expect(message).toContain("Database");
    expect(message).toContain("Grading worker");
    expect(message).toContain(" and ");
  });
});
