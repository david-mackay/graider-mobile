import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";
import {
  PRO_ANNUAL_PRODUCT_ID,
  PRO_MONTHLY_PRODUCT_ID,
  REVENUECAT_ENTITLEMENT_PRO,
  type SubscriptionPlanId,
} from "@/lib/subscriptions/constants";

let configured = false;

function getApiKey(): string | null {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;
  }
  return null;
}

export function isPurchasesAvailable(): boolean {
  return Boolean(getApiKey());
}

export function configurePurchases(): void {
  const apiKey = getApiKey();
  if (!apiKey || configured) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.INFO);
  }

  Purchases.configure({ apiKey });
  configured = true;
}

export async function loginPurchases(appUserId: string): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  configurePurchases();
  const result = await Purchases.logIn(appUserId);
  return result.customerInfo;
}

export async function logoutPurchases(): Promise<void> {
  if (!isPurchasesAvailable() || !configured) return;
  await Purchases.logOut();
}

export function customerHasProEntitlement(customerInfo: CustomerInfo | null): boolean {
  return Boolean(customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_PRO]);
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isPurchasesAvailable()) return null;
  configurePurchases();
  return Purchases.getOfferings();
}

function productIdOf(pkg: PurchasesPackage): string {
  return pkg.product?.identifier ?? "";
}

export function pickPackageForPlan(
  offerings: PurchasesOfferings | null,
  planId: SubscriptionPlanId,
): PurchasesPackage | null {
  const current = offerings?.current;
  if (!current) return null;

  if (planId === "annual") {
    return (
      current.annual ??
      current.availablePackages.find(
        (pkg) =>
          pkg.packageType === "ANNUAL" ||
          productIdOf(pkg) === PRO_ANNUAL_PRODUCT_ID ||
          /annual|yearly/i.test(productIdOf(pkg)),
      ) ??
      null
    );
  }

  return (
    current.monthly ??
    current.availablePackages.find(
      (pkg) =>
        pkg.packageType === "MONTHLY" ||
        productIdOf(pkg) === PRO_MONTHLY_PRODUCT_ID ||
        /monthly/i.test(productIdOf(pkg)),
    ) ??
    current.availablePackages[0] ??
    null
  );
}

export function pickMonthlyPackage(
  offerings: PurchasesOfferings | null,
): PurchasesPackage | null {
  return pickPackageForPlan(offerings, "monthly");
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  configurePurchases();
  const result = await Purchases.purchasePackage(pkg);
  return result.customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  configurePurchases();
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isPurchasesAvailable()) return null;
  configurePurchases();
  return Purchases.getCustomerInfo();
}
