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
    hint: "Upload a question bank or answer-key PDF — including MCQ letter keys. We'll extract questions.",
    success: "Question bank imported.",
  },
  test: {
    title: "Import test from PDF",
    hint: "Upload a test PDF — we'll create a test and link matching questions.",
    success: "Test imported from PDF.",
  },
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PdfImportPanel({
  classId,
  kind,
  onComplete,
  onStatus,
  disabled = false,
}: PdfImportPanelProps) {
  const graiderFetch = useGraiderFetch();
  const [busy, setBusy] = useState(false);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const surface = SURFACES[kind];
  const [parsePreset, setParsePreset] = useState<DocumentParsePreset>(() =>
    defaultPresetForSurface(surface),
  );
  const labels = LABELS[kind];

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
    setBusy(true);
    setPickedName(doc.name);
    try {
      const formData = new FormData();
      appendDocumentToFormData(formData, "pdf", doc);
      formData.append("parsePreset", parsePreset);
      const created = await handleJson<{ jobId: string; status: string }>(
        await graiderFetch(`/api/classes/${classId}/${ENDPOINTS[kind]}`, {
          method: "POST",
          body: formData,
        }),
      );
      const finished = await pollJob(created.jobId);
      if (finished.status === "failed") {
        throw new Error(finished.error ?? "PDF import failed.");
      }
      onStatus(labels.success);
      setPickedName(null);
      await onComplete();
    } catch (error) {
      if (error instanceof GraiderApiError && error.status === 404) {
        onStatus("PDF import API is not deployed yet. Deploy the latest Graider backend.", "error");
        return;
      }
      onStatus(error instanceof Error ? error.message : "PDF import failed.", "error");
    } finally {
      setBusy(false);
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
    await uploadPdf({
      uri: asset.uri,
      name: asset.name ?? "import.pdf",
      mimeType: asset.mimeType ?? "application/pdf",
    });
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
          disabled={disabled || busy}
        />
      </View>
      <Pressable
        onPress={() => void pickPdf()}
        disabled={disabled || busy}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-line bg-paper py-3 disabled:opacity-50"
      >
        {busy ? (
          <ActivityIndicator color="#99291f" />
        ) : (
          <FileUp size={18} color="#99291f" />
        )}
        <Text className="text-sm font-medium text-pen-deep">
          {busy ? `Processing ${pickedName ?? "PDF"}…` : "Choose PDF"}
        </Text>
      </Pressable>
    </Card>
  );
}
