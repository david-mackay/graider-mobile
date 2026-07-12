import { useEffect } from "react";
import { useRouter } from "expo-router";
import { getResumeStep, getVault } from "@/lib/onboarding/vault";

export default function VaultResumeGate() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const vault = await getVault();
      if (!vault) return;
      const step = getResumeStep(vault);
      if (step === "hook" || step === "completed") return;
      router.push(`/onboarding/${step}`);
    })();
  }, [router]);

  return null;
}
