import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import type { PurchasesPackage } from "react-native-purchases";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { SubscriptionSummary } from "@/lib/types";
import {
  FREE_TIER_MONTHLY_GRADE_LIMIT,
  type PaywallReason,
} from "@/lib/subscriptions/constants";
import {
  configurePurchases,
  getCustomerInfo,
  getOfferings,
  isPurchasesAvailable,
  loginPurchases,
  logoutPurchases,
  pickMonthlyPackage,
  purchasePackage,
  restorePurchases,
} from "@/lib/subscriptions/purchases";
import { btnPrimary, btnSecondary, Card } from "@/components/shared/ui";

type SubscriptionContextValue = {
  subscription: SubscriptionSummary | null;
  loading: boolean;
  packageLoading: boolean;
  monthlyPackage: PurchasesPackage | null;
  refreshSubscription: () => Promise<void>;
  canGradeStack: boolean;
  showPaywall: (reason?: PaywallReason) => void;
  hidePaywall: () => void;
  purchasePro: () => Promise<boolean>;
  restorePro: () => Promise<boolean>;
  paywallVisible: boolean;
  paywallReason: PaywallReason;
};

const defaultSummary: SubscriptionSummary = {
  tier: "free",
  isPro: false,
  gradesUsedThisMonth: 0,
  gradeLimit: FREE_TIER_MONTHLY_GRADE_LIMIT,
  gradesRemaining: FREE_TIER_MONTHLY_GRADE_LIMIT,
  classesOwned: 0,
  classLimit: 1,
  subscriptionExpiresAt: null,
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function reasonCopy(reason: PaywallReason): { title: string; subtitle: string } {
  switch (reason) {
    case "class_limit":
      return {
        title: "Add more classes with Pro",
        subtitle: "Free includes one class. Upgrade to organize every period you teach.",
      };
    case "soft_upsell":
      return {
        title: "Love grading stacks?",
        subtitle: "Pro unlocks unlimited stack grading so Sunday's pile never waits.",
      };
    case "auto_grade":
      return {
        title: "Smart grade is a Pro feature",
        subtitle: "Upload papers without picking a test — Graider matches or creates the assessment for you.",
      };
    default:
      return {
        title: "Unlock unlimited stack grading",
        subtitle: "You've used your free stack grades this month. Pro keeps the red pen moving.",
      };
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const graiderFetch = useGraiderFetch();
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [packageLoading, setPackageLoading] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>("grade_limit");
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!isSignedIn) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    try {
      const payload = await handleJson<{ subscription: SubscriptionSummary }>(
        await graiderFetch("/api/me/subscription", { cache: "no-store" }),
      );
      setSubscription(payload.subscription);
    } catch {
      setSubscription(defaultSummary);
    } finally {
      setLoading(false);
    }
  }, [graiderFetch, isSignedIn]);

  const syncAfterPurchase = useCallback(async () => {
    await handleJson<{ subscription: SubscriptionSummary }>(
      await graiderFetch("/api/me/subscription/sync", { method: "POST" }),
    );
    await refreshSubscription();
  }, [graiderFetch, refreshSubscription]);

  useEffect(() => {
    configurePurchases();
  }, []);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setSubscription(null);
      void logoutPurchases();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await loginPurchases(userId);
        if (!cancelled) await refreshSubscription();
      } catch {
        if (!cancelled) await refreshSubscription();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, refreshSubscription]);

  useEffect(() => {
    if (!paywallVisible || !isPurchasesAvailable()) return;
    let cancelled = false;
    setPackageLoading(true);
    (async () => {
      try {
        const offerings = await getOfferings();
        if (!cancelled) setMonthlyPackage(pickMonthlyPackage(offerings));
      } finally {
        if (!cancelled) setPackageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paywallVisible]);

  const showPaywall = useCallback((reason: PaywallReason = "grade_limit") => {
    setPaywallReason(reason);
    setPurchaseError(null);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
    setPurchaseError(null);
  }, []);

  const purchasePro = useCallback(async () => {
    setPurchaseBusy(true);
    setPurchaseError(null);
    try {
      if (!isPurchasesAvailable()) {
        setPurchaseError("In-app purchases require a TestFlight or App Store build.");
        return false;
      }
      let pkg = monthlyPackage;
      if (!pkg) {
        const offerings = await getOfferings();
        pkg = pickMonthlyPackage(offerings);
        setMonthlyPackage(pkg);
      }
      if (!pkg) {
        setPurchaseError("Pro subscription is not available yet. Check RevenueCat setup.");
        return false;
      }
      await purchasePackage(pkg);
      await syncAfterPurchase();
      hidePaywall();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase failed.";
      if (!message.toLowerCase().includes("cancel")) {
        setPurchaseError(message);
      }
      return false;
    } finally {
      setPurchaseBusy(false);
    }
  }, [hidePaywall, monthlyPackage, syncAfterPurchase]);

  const restorePro = useCallback(async () => {
    setPurchaseBusy(true);
    setPurchaseError(null);
    try {
      if (!isPurchasesAvailable()) {
        setPurchaseError("Restore requires a TestFlight or App Store build.");
        return false;
      }
      await restorePurchases();
      await syncAfterPurchase();
      const info = await getCustomerInfo();
      const active = info?.entitlements.active.pro;
      if (active) {
        hidePaywall();
        return true;
      }
      setPurchaseError("No active Pro subscription found for this Apple ID.");
      await refreshSubscription();
      return false;
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Restore failed.");
      return false;
    } finally {
      setPurchaseBusy(false);
    }
  }, [hidePaywall, refreshSubscription, syncAfterPurchase]);

  const canGradeStack = subscription?.isPro || (subscription?.gradesRemaining ?? 1) > 0;

  const value = useMemo(
    () => ({
      subscription,
      loading,
      packageLoading,
      monthlyPackage,
      refreshSubscription,
      canGradeStack,
      showPaywall,
      hidePaywall,
      purchasePro,
      restorePro,
      paywallVisible,
      paywallReason,
    }),
    [
      subscription,
      loading,
      packageLoading,
      monthlyPackage,
      refreshSubscription,
      canGradeStack,
      showPaywall,
      hidePaywall,
      purchasePro,
      restorePro,
      paywallVisible,
      paywallReason,
    ],
  );

  const copy = reasonCopy(paywallReason);
  const priceLabel = monthlyPackage?.product.priceString ?? "$14.99/mo";

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <Modal visible={paywallVisible} animationType="slide" transparent onRequestClose={hidePaywall}>
        <View className="flex-1 justify-end bg-ink/40">
          <View className="max-h-[90%] rounded-t-3xl bg-paper px-5 pb-8 pt-6">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4 items-center">
                <Text className="rounded-full bg-pen-wash px-3 py-1 text-xs font-semibold text-pen-deep">
                  Graider Pro
                </Text>
                <Text className="mt-4 text-center font-display text-2xl font-semibold text-ink">
                  {copy.title}
                </Text>
                <Text className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
                  {copy.subtitle}
                </Text>
              </View>

              <Card className="border-line bg-cream/50">
                <Text className="text-sm font-semibold text-ink">Pro includes</Text>
                <View className="mt-3 gap-2">
                  {[
                    "Unlimited stack grading every month",
                    "Unlimited classes",
                    "Same warm paper-stack workflow you already use",
                  ].map((line) => (
                    <Text key={line} className="text-sm text-ink-soft">
                      • {line}
                    </Text>
                  ))}
                </View>
              </Card>

              {subscription && !subscription.isPro ? (
                <Text className="mt-4 text-center text-xs text-ink-faint">
                  {subscription.gradesUsedThisMonth} of {subscription.gradeLimit ?? FREE_TIER_MONTHLY_GRADE_LIMIT} free stack grades used this month
                </Text>
              ) : null}

              {purchaseError ? (
                <View className="mt-4 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
                  <Text className="text-sm text-pen-deep">{purchaseError}</Text>
                </View>
              ) : null}

              <View className="mt-6 gap-3">
                <TouchableOpacity
                  onPress={() => void purchasePro()}
                  disabled={purchaseBusy || packageLoading}
                  className={`${btnPrimary} items-center py-4`}
                >
                  {purchaseBusy || packageLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      Start Pro · {priceLabel}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void restorePro()}
                  disabled={purchaseBusy}
                  className={`${btnSecondary} items-center py-3`}
                >
                  <Text className="text-sm font-medium text-pen-deep">Restore purchases</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={hidePaywall} disabled={purchaseBusy} className="items-center py-2">
                  <Text className="text-sm text-ink-faint">Not now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}
