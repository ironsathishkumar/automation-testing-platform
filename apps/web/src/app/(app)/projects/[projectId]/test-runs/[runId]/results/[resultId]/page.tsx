"use client";

import { Alert, Button, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Artifact, TestResult } from "@atp/shared-types";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { api, apiUrl, errorMessage } from "@/lib/api";

export default function ResultDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string; resultId: string }>;
}) {
  const { projectId, runId, resultId } = use(params);
  const result = useQuery({ queryKey: ["result", resultId], queryFn: () => api<TestResult>(`/test-results/${resultId}`) });
  const artifacts = useQuery({ queryKey: ["result-artifacts", resultId], queryFn: () => api<Artifact[]>(`/test-results/${resultId}/artifacts`) });
  const analysis = useMutation({ mutationFn: () => api<{ output: { analysis?: string } }>(`/test-results/${resultId}/analyze`, { method: "POST" }) });

  if (result.error) return <Alert severity="error">{errorMessage(result.error)}</Alert>;
  if (!result.data) return null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Result · {result.data.status}</Typography>
      <MuiLink component={Link} href={`/projects/${projectId}/test-runs/${runId}`}>Back to run</MuiLink>
      {result.data.error ? <Alert severity="error">{result.data.error.message}</Alert> : null}
      <Button onClick={() => analysis.mutate()} disabled={analysis.isPending}>Analyze failure</Button>
      {analysis.error ? <Alert severity="error">{errorMessage(analysis.error)}</Alert> : null}
      {analysis.data?.output?.analysis ? <Alert severity="info">{analysis.data.output.analysis}</Alert> : null}
      <Typography variant="h6">Steps</Typography>
      {result.data.steps.map((step) => (
        <Typography key={step.id} variant="body2">
          {step.order + 1}. {step.action} · {step.status} · {step.durationMs} ms {step.error ? `· ${step.error}` : ""}
        </Typography>
      ))}
      <Typography variant="h6">Evidence</Typography>
      {(artifacts.data ?? []).map((artifact) => (
        <Stack key={artifact.id} spacing={1}>
          <MuiLink href={`${apiUrl()}/artifacts/${artifact.id}`} target="_blank" rel="noreferrer">
            {artifact.type}: {artifact.fileName}
          </MuiLink>
          {artifact.mimeType.startsWith("image/") ? (
            <img src={`${apiUrl()}/artifacts/${artifact.id}`} alt={artifact.fileName} style={{ maxWidth: 480 }} />
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}
