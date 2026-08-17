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
  PRO_ANNUAL_PRICE_LABEL,
  PRO_ANNUAL_SAVINGS_LABEL,
  PRO_MONTHLY_PRICE_LABEL,
  type PaywallReason,
  type SubscriptionPlanId,
} from "@/lib/subscriptions/constants";
import {
  configurePurchases,
  getCustomerInfo,
  getOfferings,
  isPurchasesAvailable,
  loginPurchases,
  logoutPurchases,
  pickPackageForPlan,
  purchasePackage,
  restorePurchases,
} from "@/lib/subscriptions/purchases";
import { Badge, btnPrimary, btnSecondary, Card } from "@/components/shared/ui";

type SubscriptionContextValue = {
  subscription: SubscriptionSummary | null;
  loading: boolean;
  packageLoading: boolean;
  monthlyPackage: PurchasesPackage | null;
  annualPackage: PurchasesPackage | null;
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
        title: "Love saving time?",
        subtitle: "Pro unlocks unlimited grading so Sunday's pile never waits.",
      };
    case "auto_grade":
      return {
        title: "Smart grade is a Pro feature",
        subtitle: "Upload papers without picking a test — Graider matches or creates the assessment for you.",
      };
    default:
      return {
        title: "Unlock unlimited grading",
        subtitle: "You've used your free tests this month. Pro keeps the marking moving.",
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
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>("annual");
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
        if (cancelled) return;
        const monthly = pickPackageForPlan(offerings, "monthly");
        const annual = pickPackageForPlan(offerings, "annual");
        setMonthlyPackage(monthly);
        setAnnualPackage(annual);
        if (annual) setSelectedPlan("annual");
        else if (monthly) setSelectedPlan("monthly");
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
      let pkg = selectedPlan === "annual" ? annualPackage : monthlyPackage;
      if (!pkg) {
        const offerings = await getOfferings();
        const monthly = pickPackageForPlan(offerings, "monthly");
        const annual = pickPackageForPlan(offerings, "annual");
        setMonthlyPackage(monthly);
        setAnnualPackage(annual);
        pkg = selectedPlan === "annual" ? annual : monthly;
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
  }, [annualPackage, hidePaywall, monthlyPackage, selectedPlan, syncAfterPurchase]);

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
      annualPackage,
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
      annualPackage,
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
  const selectedPackage = selectedPlan === "annual" ? annualPackage : monthlyPackage;
  const priceLabel =
    selectedPackage?.product.priceString ??
    (selectedPlan === "annual" ? PRO_ANNUAL_PRICE_LABEL : PRO_MONTHLY_PRICE_LABEL);
  const selectedAvailable = Boolean(selectedPackage);

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
                    "Unlimited tests graded every month",
                    "Unlimited classes",
                    "The same workflow you already use",
                  ].map((line) => (
                    <Text key={line} className="text-sm text-ink-soft">
                      • {line}
                    </Text>
                  ))}
                </View>
              </Card>

              {subscription && !subscription.isPro ? (
                <Text className="mt-4 text-center text-xs text-ink-faint">
                  {subscription.gradesUsedThisMonth} of {subscription.gradeLimit ?? FREE_TIER_MONTHLY_GRADE_LIMIT} tests graded this month
                </Text>
              ) : null}

              {purchaseError ? (
                <View className="mt-4 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
                  <Text className="text-sm text-pen-deep">{purchaseError}</Text>
                </View>
              ) : null}

              <View className="mt-5 flex-row gap-3">
                {(
                  [
                    {
                      id: "monthly" as const,
                      label: "Monthly",
                      interval: "per month",
                      pkg: monthlyPackage,
                      fallback: PRO_MONTHLY_PRICE_LABEL,
                    },
                    {
                      id: "annual" as const,
                      label: "Annual",
                      interval: "per year",
                      pkg: annualPackage,
                      fallback: PRO_ANNUAL_PRICE_LABEL,
                      badge: PRO_ANNUAL_SAVINGS_LABEL,
                    },
                  ] as const
                ).map((plan) => {
                  const available = Boolean(plan.pkg) || packageLoading;
                  const selected = selectedPlan === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      onPress={() => setSelectedPlan(plan.id)}
                      disabled={purchaseBusy || packageLoading || (!plan.pkg && !packageLoading)}
                      className={`flex-1 rounded-2xl border px-3 py-4 ${
                        selected ? "border-pen bg-pen-wash/40" : "border-line bg-cream"
                      } ${!available && !packageLoading ? "opacity-50" : ""}`}
                    >
                      <View className="flex-row items-center justify-between gap-1">
                        <Text className="text-sm font-bold text-ink">{plan.label}</Text>
                        {"badge" in plan && plan.badge ? <Badge variant="green">{plan.badge}</Badge> : null}
                      </View>
                      <Text className="mt-2 text-xl font-bold text-ink">
                        {plan.pkg?.product.priceString ?? plan.fallback}
                      </Text>
                      <Text className="mt-1 text-xs text-ink-faint">{plan.interval}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className="mt-6 gap-3">
                <TouchableOpacity
                  onPress={() => void purchasePro()}
                  disabled={purchaseBusy || packageLoading || !selectedAvailable}
                  className={`${btnPrimary} items-center py-4`}
                >
                  {purchaseBusy || packageLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      Start {selectedPlan === "annual" ? "annual" : "monthly"} Pro · {priceLabel}
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
