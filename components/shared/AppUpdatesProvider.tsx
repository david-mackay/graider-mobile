import { useEffect } from "react";
import { checkAndApplyOTAUpdate, subscribeToOTAUpdates } from "@/lib/ota-updates";

/** Silently checks for EAS Update bundles on launch and foreground. */
export default function AppUpdatesProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void checkAndApplyOTAUpdate();
    return subscribeToOTAUpdates(() => {
      void checkAndApplyOTAUpdate();
    });
  }, []);

  return children;
}
