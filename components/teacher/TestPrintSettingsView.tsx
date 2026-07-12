import { Platform, View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Card, SectionHeader, SettingSwitchRow, btnPrimary, btnSecondary } from "@/components/shared/ui";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { TestSummary } from "@/lib/types";

type TestPrintSettingsViewProps = {
  testId?: string;
  classId?: string;
};

export default function TestPrintSettingsView({ testId, classId }: TestPrintSettingsViewProps) {
  const graiderFetch = useGraiderFetch();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testTitle, setTestTitle] = useState("Selected Test");
  const [versionId, setVersionId] = useState("version-a");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"compact" | "standard" | "spacious">("standard");
  const hasContext = Boolean(testId);

  useEffect(() => {
    async function load() {
      if (!testId) return;
      setIsLoading(true);
      setError("");
      try {
        const testsPayload = await handleJson<{ tests: TestSummary[] }>(
          await graiderFetch("/api/tests", { cache: "no-store" }),
        );
        const test = (testsPayload.tests ?? []).find((t) => t.id === testId);
        if (test?.title) setTestTitle(test.title);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load test context.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [graiderFetch, testId]);

  const canGenerate = useMemo(() => hasContext && !isGenerating, [hasContext, isGenerating]);

  async function generatePdf() {
    if (!testId) return;
    setIsGenerating(true);
    setError("");
    setMessage("");
    try {
      const response = await graiderFetch("/api/tests/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          versionId,
          includeAnswerKey,
          layoutMode,
        }),
      });

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.includes("application/pdf")) {
        if (!response.ok) {
          throw new Error("Failed to generate PDF.");
        }
        if (Platform.OS === "web") {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
          setMessage("PDF generated and opened in a new tab.");
        } else {
          setMessage("PDF generated successfully.");
        }
        return;
      }

      const payload = await handleJson<{ downloadUrl?: string }>(response);
      if (payload.downloadUrl) {
        if (Platform.OS === "web") {
          window.open(payload.downloadUrl, "_blank");
          setMessage("PDF generated and opened in a new tab.");
        } else {
          setMessage("PDF generated. Download link is ready.");
        }
      } else {
        setMessage("Print request submitted. PDF is being prepared.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  }


  return (
    <View className="flex-1 bg-cream px-4 py-4">
      <SectionHeader
        title="Test Print Settings"
        subtitle="Configure version, answer key, and layout before exporting."
        action={
          <Link href="/(teacher)" asChild>
            <TouchableOpacity className={btnSecondary}>
              <Text className="text-sm font-medium text-pen-deep">Back</Text>
            </TouchableOpacity>
          </Link>
        }
      />

      {!hasContext ? (
        <Card className="border-marigold/30 bg-marigold-wash">
          <Text className="text-sm font-semibold text-marigold-deep">No test selected</Text>
          <Text className="mt-1 text-xs text-marigold-deep">
            Open this from the Tests screen so we know which test to configure.
          </Text>
          <Link href="/(teacher)" asChild>
            <TouchableOpacity className={`${btnPrimary} mt-4 justify-center`}>
              <Text className="text-sm font-semibold text-white">Go to Tests</Text>
            </TouchableOpacity>
          </Link>
        </Card>
      ) : (
        <View className="gap-3">
          <Card>
            <Text className="text-sm font-semibold text-ink">{testTitle}</Text>
            <Text className="mt-1 text-xs text-ink-soft">Class ID: {classId ?? "—"}</Text>
            {isLoading ? <Text className="mt-2 text-xs text-ink-soft">Loading test details…</Text> : null}
          </Card>

          {error ? (
            <Card className="border-pen-soft/60 bg-pen-wash">
              <Text className="text-sm font-medium text-pen-deep">{error}</Text>
            </Card>
          ) : null}
          {message ? (
            <Card className="border-moss/30 bg-moss-wash">
              <Text className="text-sm font-medium text-moss-deep">{message}</Text>
            </Card>
          ) : null}

          <Card>
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Select version</Text>
            <View className="mt-2 flex-row gap-2">
              {["version-a", "version-b"].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setVersionId(v)}
                  className={`rounded-lg border px-3 py-2 ${versionId === v ? "border-pen bg-pen-wash" : "border-line bg-cream"}`}
                >
                  <Text className={`text-xs font-medium ${versionId === v ? "text-pen-deep" : "text-ink-soft"}`}>
                    {v === "version-a" ? "Version A" : "Version B"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">Layout settings</Text>
            <View className="mt-2 flex-row gap-2">
              {(["compact", "standard", "spacious"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setLayoutMode(mode)}
                  className={`rounded-lg border px-3 py-2 ${layoutMode === mode ? "border-pen bg-pen-wash" : "border-line bg-cream"}`}
                >
                  <Text className={`text-xs font-medium capitalize ${layoutMode === mode ? "text-pen-deep" : "text-ink-soft"}`}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mt-4">
              <SettingSwitchRow
                label="Include answer key"
                value={includeAnswerKey}
                onValueChange={setIncludeAnswerKey}
              />
            </View>
          </Card>

          <TouchableOpacity
            className={`${btnPrimary} justify-center`}
            onPress={() => void generatePdf()}
            disabled={!canGenerate}
          >
            <Text className="text-sm font-semibold text-white">
              {isGenerating ? "Generating PDF…" : "Download PDF"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
