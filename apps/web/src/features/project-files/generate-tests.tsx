"use client";

import { GeneratedDocumentTests } from "@atp/shared-types";
import { Alert, Button, Chip, Stack } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";

export interface AiStatus {
  configured: boolean;
  model: string | null;
  message: string | null;
}

export function useAiStatus() {
  return useQuery({ queryKey: ["ai-status"], queryFn: () => api<AiStatus>("/ai/status") });
}

export function useGenerateTests(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, applicationId, useAi }: { fileId: string; applicationId?: string; useAi: boolean }) =>
      api<GeneratedDocumentTests>(`/files/${fileId}/generate-tests`, {
        method: "POST",
        body: JSON.stringify({ applicationId: applicationId || undefined, useAi }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function GenerateResult({ projectId, mutation, onClose }: { projectId: string; mutation: ReturnType<typeof useGenerateTests>; onClose?: () => void }) {
  if (mutation.error) return <Alert severity="error" onClose={onClose}>{errorMessage(mutation.error)}</Alert>;
  const result = mutation.data;
  if (!result) return null;
  const created = result.created.length;
  const skipped = result.skipped.length;
  const summary =
    created > 0
      ? `Created ${created} draft test case${created === 1 ? "" : "s"}${result.source === "ai" ? " written by AI" : ", one per section"}.${skipped > 0 ? ` Skipped ${skipped} already created from this document.` : ""} ${
          result.source === "ai" ? "Review the steps before running them." : "Each has the requirement text and starter steps; open one to add the real steps."
        }`
      : `All ${skipped} test cases from this document already exist, so nothing new was created.`;
  return (
    <Alert
      severity={created > 0 ? "success" : "info"}
      onClose={onClose}
      action={<Button color="inherit" size="small" component={Link} href={`/projects/${projectId}/test-cases`}>Open test cases</Button>}
    >
      {summary}
      {created > 0 ? (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {result.created.map((testCase) => (
            <Chip key={testCase.id} size="small" clickable component={Link} href={`/projects/${projectId}/test-cases/${testCase.id}`} label={testCase.title} />
          ))}
        </Stack>
      ) : null}
    </Alert>
  );
}
