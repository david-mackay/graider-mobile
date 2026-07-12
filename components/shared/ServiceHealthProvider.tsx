import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import ServiceHealthBanner from "@/components/shared/ServiceHealthBanner";
import {
  fetchServiceHealth,
  SERVICE_HEALTH_POLL_MS,
  type HealthReport,
} from "@/lib/service-health";

/** Polls /api/health and shows a thin top banner when API, database, or worker is down. */
export default function ServiceHealthProvider({ children }: { children: React.ReactNode }) {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const next = await fetchServiceHealth();
      setReport(next);
      setFetchError(null);
    } catch (error) {
      setReport(null);
      setFetchError(error instanceof Error ? error.message : "Service health check failed.");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, SERVICE_HEALTH_POLL_MS);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  return (
    <View className="flex-1">
      {children}
      <ServiceHealthBanner report={report} fetchError={fetchError} />
    </View>
  );
}
