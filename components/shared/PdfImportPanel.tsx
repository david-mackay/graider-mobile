import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import * as DocumentPicker from "expo-document-picker";
import { FileUp } from "lucide-react-native";
import { Card } from "@/components/shared/ui";
import DeterminateProgressBar from "@/components/shared/DeterminateProgressBar";
import { GraiderApiError, handleJson } from "@/lib/dashboard-client";
import { resolveGraiderApiUrl, useGraiderFetch } from "@/lib/graider-fetch";
import {
  postFormDataWithProgress,
  resultFromProgressHttp,
} from "@/lib/upload-progress";
import { appendDocumentToFormData, type PickedDocument } from "@/lib/picked-document";
import { UNIFIED_PARSE_PRESET } from "@/lib/parse-presets";

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
  percent: number;
  statusLabel: string;
};

const ENDPOINTS: Record<ContentImportKind, string> = {
  question_bank: "question-bank/import",
  test: "tests/import",
};

const LABELS: Record<ContentImportKind, { title: string; success: string }> = {
  question_bank: {
    title: "Import from PDF",
    success: "Question bank imported.",
  },
  test: {
    title: "Import test from PDF",
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
  const { getToken } = useAuth();
  const [activeImports, setActiveImports] = useState<ActiveImport[]>([]);
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

  async function uploadPdf(doc: PickedDocument) {
    const clientId = nextClientId();
    setActiveImports((prev) => [
      ...prev,
      { clientId, label: doc.name, phase: "uploading", percent: 0, statusLabel: "Uploading…" },
    ]);
    try {
      const formData = new FormData();
      appendDocumentToFormData(formData, "pdf", doc);
      formData.append("parsePreset", UNIFIED_PARSE_PRESET);
      const headers: Record<string, string> = {};
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const http = await postFormDataWithProgress({
        url: resolveGraiderApiUrl(`/api/classes/${classId}/${ENDPOINTS[kind]}`),
        formData,
        headers,
        onProgress: (progress) => {
          updateImport(clientId, {
            phase: "uploading",
            percent: progress.percent,
            statusLabel: progress.label,
          });
        },
      });
      const created = resultFromProgressHttp(http);
      if (created.status < 200 || created.status >= 300) {
        throw new GraiderApiError(
          (typeof created.payload.error === "string" && created.payload.error) || "PDF import failed.",
          created.status,
        );
      }
      const jobId = typeof created.payload.jobId === "string" ? created.payload.jobId : null;
      if (!jobId) {
        throw new Error("PDF import did not return a job id.");
      }
      updateImport(clientId, { phase: "processing", percent: 45, statusLabel: "Processing…" });
      const finished = await pollJob(jobId);
      if (finished.status === "failed") {
        throw new Error(finished.error ?? "PDF import failed.");
      }
      updateImport(clientId, { percent: 100, statusLabel: "Done" });
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
    );
  }

  return (
    <Card className="border-dashed border-line bg-cream/30">
      <Text className="text-sm font-semibold text-ink">{labels.title}</Text>
      <Pressable
        onPress={() => void pickPdf()}
        disabled={disabled}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-line bg-paper py-3 disabled:opacity-50"
      >
        <FileUp size={18} color="#99291f" />
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
                  {job.phase === "uploading" ? `${job.percent}%` : job.statusLabel}
                </Text>
              </View>
              <DeterminateProgressBar
                className="mt-2"
                percent={job.percent}
                label={job.statusLabel}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
