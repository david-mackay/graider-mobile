import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { FileUp } from "lucide-react-native";
import { Card } from "@/components/shared/ui";
import { GraiderApiError, handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { appendDocumentToFormData, type PickedDocument } from "@/lib/picked-document";
import ParsePresetPicker from "@/components/shared/ParsePresetPicker";
import {
  defaultPresetForSurface,
  type DocumentParsePreset,
  type ParseSurface,
} from "@/lib/parse-presets";

export type ContentImportKind = "question_bank" | "test";

type PdfImportPanelProps = {
  classId: string;
  kind: ContentImportKind;
  onComplete: () => void | Promise<void>;
  onStatus: (message: string, type?: "info" | "error") => void;
  disabled?: boolean;
};

type ImportJobResponse = {
  jobId: string;
  status: string;
  result?: { questionsCreated?: number; testId?: string; testTitle?: string };
  error?: string | null;
};

type ActiveImport = {
  clientId: string;
  label: string;
  phase: "uploading" | "processing";
};

const ENDPOINTS: Record<ContentImportKind, string> = {
  question_bank: "question-bank/import",
  test: "tests/import",
};

const SURFACES: Record<ContentImportKind, ParseSurface> = {
  question_bank: "question_bank_import",
  test: "test_import",
};

const LABELS: Record<ContentImportKind, { title: string; hint: string; success: string }> = {
  question_bank: {
    title: "Import from PDF",
    hint: "Upload a question bank or answer-key PDF — including MCQ letter keys. You can start another upload while one is processing.",
    success: "Question bank imported.",
  },
  test: {
    title: "Import test from PDF",
    hint: "Upload a test PDF — we'll create a test and link matching questions. Uploads can run in parallel.",
    success: "Test imported from PDF.",
  },
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextClientId() {
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function PdfImportPanel({
  classId,
  kind,
  onComplete,
  onStatus,
  disabled = false,
}: PdfImportPanelProps) {
  const graiderFetch = useGraiderFetch();
  const [activeImports, setActiveImports] = useState<ActiveImport[]>([]);
  const surface = SURFACES[kind];
  const [parsePreset, setParsePreset] = useState<DocumentParsePreset>(() =>
    defaultPresetForSurface(surface),
  );
  const labels = LABELS[kind];

  function updateImport(clientId: string, patch: Partial<ActiveImport>) {
    setActiveImports((prev) =>
      prev.map((job) => (job.clientId === clientId ? { ...job, ...patch } : job)),
    );
  }

  function removeImport(clientId: string) {
    setActiveImports((prev) => prev.filter((job) => job.clientId !== clientId));
  }

  async function pollJob(jobId: string): Promise<ImportJobResponse> {
    const path = `/api/classes/${classId}/${ENDPOINTS[kind]}/${jobId}`;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const payload = await handleJson<ImportJobResponse>(
        await graiderFetch(path, { cache: "no-store" }),
      );
      if (payload.status === "completed" || payload.status === "failed") {
        return payload;
      }
      await sleep(2000);
    }
    throw new Error("Import is taking longer than expected. Check back in a moment.");
  }

  async function uploadPdf(doc: PickedDocument, preset: DocumentParsePreset) {
    const clientId = nextClientId();
    setActiveImports((prev) => [
      ...prev,
      { clientId, label: doc.name, phase: "uploading" },
    ]);
    try {
      const formData = new FormData();
      appendDocumentToFormData(formData, "pdf", doc);
      formData.append("parsePreset", preset);
      const created = await handleJson<{ jobId: string; status: string }>(
        await graiderFetch(`/api/classes/${classId}/${ENDPOINTS[kind]}`, {
          method: "POST",
          body: formData,
        }),
      );
      updateImport(clientId, { phase: "processing" });
      const finished = await pollJob(created.jobId);
      if (finished.status === "failed") {
        throw new Error(finished.error ?? "PDF import failed.");
      }
      onStatus(labels.success);
      await onComplete();
    } catch (error) {
      if (error instanceof GraiderApiError && error.status === 404) {
        onStatus("PDF import API is not deployed yet. Deploy the latest Graider backend.", "error");
        return;
      }
      onStatus(
        error instanceof Error ? `${doc.name}: ${error.message}` : `${doc.name}: PDF import failed.`,
        "error",
      );
    } finally {
      removeImport(clientId);
    }
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    void uploadPdf(
      {
        uri: asset.uri,
        name: asset.name ?? "import.pdf",
        mimeType: asset.mimeType ?? "application/pdf",
      },
      parsePreset,
    );
  }

  return (
    <Card className="border-dashed border-line bg-cream/30">
      <Text className="text-sm font-semibold text-ink">{labels.title}</Text>
      <Text className="mt-1 text-xs leading-relaxed text-ink-faint">{labels.hint}</Text>
      <View className="mt-3">
        <ParsePresetPicker
          surface={surface}
          value={parsePreset}
          onChange={setParsePreset}
          disabled={disabled}
        />
      </View>
      <Pressable
        onPress={() => void pickPdf()}
        disabled={disabled}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-line bg-paper py-3 disabled:opacity-50"
      >
        {activeImports.length > 0 ? (
          <ActivityIndicator color="#99291f" />
        ) : (
          <FileUp size={18} color="#99291f" />
        )}
        <Text className="text-sm font-medium text-pen-deep">
          {activeImports.length > 0 ? "Add another PDF" : "Choose PDF"}
        </Text>
      </Pressable>
      {activeImports.length > 0 ? (
        <View className="mt-3 gap-2">
          {activeImports.map((job) => (
            <View
              key={job.clientId}
              className="rounded-lg border border-line bg-paper px-3 py-2"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-xs font-medium text-ink" numberOfLines={1}>
                  {job.label}
                </Text>
                <Text className="text-[11px] text-ink-faint">
                  {job.phase === "uploading" ? "Uploading…" : "Processing…"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
