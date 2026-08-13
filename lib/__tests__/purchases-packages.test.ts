import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";
import { pickPackageForPlan } from "@/lib/subscriptions/purchases";

jest.mock("react-native-purchases", () => ({
  LOG_LEVEL: { INFO: 0 },
}));

function pkg(identifier: string, packageType: PurchasesPackage["packageType"]): PurchasesPackage {
  return {
    identifier: `$${packageType.toLowerCase()}`,
    packageType,
    offeringIdentifier: "default",
    product: {
      identifier,
      description: identifier,
      title: identifier,
      price: 0,
      priceString: identifier.includes("annual") ? "$239.99" : "$24.99",
      currencyCode: "USD",
    },
  } as PurchasesPackage;
}

function offerings(packages: PurchasesPackage[]): PurchasesOfferings {
  const monthly = packages.find((item) => item.packageType === "MONTHLY") ?? null;
  const annual = packages.find((item) => item.packageType === "ANNUAL") ?? null;
  return {
    current: {
      identifier: "default",
      serverDescription: "default",
      metadata: {},
      availablePackages: packages,
      lifetime: null,
      annual,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
      monthly,
      weekly: null,
    },
    all: {},
  } as PurchasesOfferings;
}

describe("pickPackageForPlan", () => {
  const monthly = pkg("graider_pro_monthly", "MONTHLY");
  const annual = pkg("graider_pro_annual", "ANNUAL");

  it("picks monthly and annual from the current offering", () => {
    const current = offerings([monthly, annual]);
    expect(pickPackageForPlan(current, "monthly")?.product.identifier).toBe("graider_pro_monthly");
    expect(pickPackageForPlan(current, "annual")?.product.identifier).toBe("graider_pro_annual");
  });

  it("finds annual by product id when packageType is custom", () => {
    const customAnnual = pkg("graider_pro_annual", "CUSTOM");
    const current = offerings([monthly, customAnnual]);
    expect(pickPackageForPlan(current, "annual")?.product.identifier).toBe("graider_pro_annual");
  });

  it("returns null annual when only monthly exists", () => {
    expect(pickPackageForPlan(offerings([monthly]), "annual")).toBeNull();
  });
});
