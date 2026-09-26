"use client";

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { Alert, Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { Artifact, TestCase, TestResult } from "@atp/shared-types";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAiStatus } from "@/features/project-files/generate-tests";
import { ACTION_GUIDE } from "@/features/test-cases/engine-guide";
import { formatDuration, statusColor, variantLabel } from "@/features/test-runs/status";
import { api, apiUrl, errorMessage } from "@/lib/api";

function stepLabel(action: string) {
  return (ACTION_GUIDE as Record<string, { label: string } | undefined>)[action]?.label ?? action;
}

function describe(step: TestCase["steps"][number] | undefined) {
  if (!step) return "";
  const parts = [step.target, typeof step.value === "string" ? step.value : step.value === undefined ? undefined : JSON.stringify(step.value)].filter(Boolean);
  return parts.join(" → ");
}

export default function ResultDetailPage({ params }: { params: Promise<{ projectId: string; runId: string; resultId: string }> }) {
  const { projectId, runId, resultId } = use(params);
  const result = useQuery({ queryKey: ["result", resultId], queryFn: () => api<TestResult>(`/test-results/${resultId}`) });
  const artifacts = useQuery({ queryKey: ["result-artifacts", resultId], queryFn: () => api<Artifact[]>(`/test-results/${resultId}/artifacts`) });
  const testCase = useQuery({
    queryKey: ["test-case", result.data?.testCaseId],
    queryFn: () => api<TestCase>(`/test-cases/${result.data?.testCaseId}`),
    enabled: Boolean(result.data?.testCaseId),
    retry: false,
  });
  const aiStatus = useAiStatus();
  const analysis = useMutation({ mutationFn: () => api<{ output: { analysis?: string } }>(`/test-results/${resultId}/analyze`, { method: "POST" }) });

  if (result.error) return <Alert severity="error">{errorMessage(result.error)}</Alert>;
  if (!result.data) return <LinearProgress />;

  const files = artifacts.data ?? [];
  const url = (artifact: Artifact) => `${apiUrl()}/artifacts/${artifact.id}`;
  const shotFor = (order: number) => files.find((artifact) => artifact.fileName === `step-${order}.png` || artifact.fileName === `failure-${order}.png`);
  const stepShots = new Set(result.data.steps.map((step) => shotFor(step.order)?.id).filter(Boolean));
  const video = files.find((artifact) => artifact.type === "video");
  const trace = files.find((artifact) => artifact.type === "trace");
  const others = files.filter((artifact) => artifact !== video && artifact !== trace && !stepShots.has(artifact.id));
  const definedSteps = testCase.data?.steps ?? [];

  return (
    <>
      <PageHeader
        title={testCase.data?.title ?? "Test result"}
        subtitle={`${result.data.steps.length} step${result.data.steps.length === 1 ? "" : "s"} · ${formatDuration(result.data.durationMs)}${variantLabel(result.data.variant) ? ` · ${variantLabel(result.data.variant)}` : ""}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={`/projects/${projectId}/test-runs/${runId}`}>Back to run</Button>
            {testCase.data ? <Button variant="outlined" component={Link} href={`/projects/${projectId}/test-cases/${testCase.data.id}`}>Edit test case</Button> : null}
          </Stack>
        }
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <Chip color={statusColor(result.data.status)} label={result.data.status} />
        {result.data.status === "passed" ? <Typography color="text.secondary">Every step passed.</Typography> : null}
      </Stack>

      {result.data.error ? (
        <Alert
          severity="error"
          sx={{ mb: 2, "& .MuiAlert-message": { whiteSpace: "pre-wrap", wordBreak: "break-word" } }}
          action={
            aiStatus.data?.configured ? (
              <Button color="inherit" size="small" startIcon={<AutoAwesomeIcon />} disabled={analysis.isPending} onClick={() => analysis.mutate()}>
                {analysis.isPending ? "Asking AI…" : "Explain with AI"}
              </Button>
            ) : (
              <Button color="inherit" size="small" component={Link} href="/ai">Set up AI to explain</Button>
            )
          }
        >
          {result.data.error.message}
        </Alert>
      ) : null}
      {analysis.error ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(analysis.error)}</Alert> : null}
      {analysis.data?.output?.analysis ? <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mb: 2, whiteSpace: "pre-wrap" }}>{analysis.data.output.analysis}</Alert> : null}

      {video ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Recording</Typography>
          <Box component="video" controls src={url(video)} sx={{ width: "100%", maxHeight: 520, bgcolor: "black", borderRadius: 1 }} />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" component="a" href={url(video)} download>Download video</Button>
            {trace ? (
              <Button size="small" component="a" href={url(trace)} download title="Open with: npx playwright show-trace trace.zip">
                Download Playwright trace
              </Button>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      <Typography variant="h6" sx={{ mb: 1 }}>Steps</Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        {result.data.steps.map((step) => {
          const shot = shotFor(step.order);
          const defined = definedSteps.find((item) => item.id === step.id) ?? definedSteps[step.order];
          return (
            <Paper key={`${step.id}-${step.order}`} variant="outlined" sx={{ p: 2, borderColor: step.status === "failed" ? "error.main" : undefined }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {step.status === "passed" ? <CheckCircleIcon color="success" /> : step.status === "failed" ? <CancelIcon color="error" /> : <RadioButtonUncheckedIcon color="disabled" />}
                <Typography variant="subtitle1">
                  {step.order + 1}. {stepLabel(step.action)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {describe(defined)}
                </Typography>
                <Typography variant="caption" color="text.secondary">{formatDuration(step.durationMs)}</Typography>
              </Stack>
              {step.error ? <Typography variant="body2" color="error" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>{step.error}</Typography> : null}
              {shot ? (
                <Box component="a" href={url(shot)} target="_blank" rel="noreferrer" sx={{ display: "block", mt: 1.5 }}>
                  <Box component="img" src={url(shot)} alt={`Screen after step ${step.order + 1}`} sx={{ maxWidth: "100%", maxHeight: 360, border: 1, borderColor: "divider", borderRadius: 1 }} />
                </Box>
              ) : null}
            </Paper>
          );
        })}
        {result.data.steps.length === 0 ? <Typography color="text.secondary">No steps ran.</Typography> : null}
      </Stack>

      {others.length > 0 ? (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>Other evidence</Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
            {others.map((artifact) => (
              <Paper key={artifact.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" sx={{ display: "block" }}>{artifact.fileName}</Typography>
                {artifact.mimeType.startsWith("image/") ? (
                  <Box component="img" src={url(artifact)} alt={artifact.fileName} sx={{ maxWidth: 320, display: "block", my: 1 }} />
                ) : null}
                <Button size="small" component="a" href={url(artifact)} target="_blank" rel="noreferrer">Open</Button>
              </Paper>
            ))}
          </Stack>
        </>
      ) : null}
    </>
  );
}
