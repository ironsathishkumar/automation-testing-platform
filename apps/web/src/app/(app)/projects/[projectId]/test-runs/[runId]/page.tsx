"use client";

import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import { ExecutionLogEntry, TestResult, TestRun } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { api, errorMessage } from "@/lib/api";

export default function RunDetailPage({ params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = use(params);
  const run = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api<TestRun>(`/test-runs/${runId}`),
    refetchInterval: (query) => (query.state.data && ["queued", "running"].includes(query.state.data.status) ? 2000 : false),
  });
  const results = useQuery({
    queryKey: ["run-results", runId],
    queryFn: () => api<TestResult[]>(`/test-runs/${runId}/results`),
    refetchInterval: 2000,
  });
  const logs = useQuery({
    queryKey: ["run-logs", runId],
    queryFn: () => api<ExecutionLogEntry[]>(`/test-runs/${runId}/logs`),
    refetchInterval: 2000,
  });

  async function post(action: "cancel" | "retry" | "rerun-failed") {
    await api(`/test-runs/${runId}/${action}`, { method: "POST" });
    await run.refetch();
  }

  if (run.error) return <Alert severity="error">{errorMessage(run.error)}</Alert>;
  if (!run.data) return null;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="h5">Run</Typography>
        <Chip label={run.data.status} />
        <Typography color="text.secondary">
          {run.data.passed} passed · {run.data.failed} failed · {run.data.total} total
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button onClick={() => void post("cancel")}>Cancel</Button>
        <Button onClick={() => void post("retry")}>Retry failed</Button>
        <Button onClick={() => void post("rerun-failed")}>Re-run failed</Button>
        <Button component={Link} href={`/projects/${projectId}/test-runs`}>Back</Button>
        <Button onClick={() => void api(`/test-runs/${runId}/report/export`, { method: "POST" })}>Export report</Button>
      </Stack>
      <Typography variant="h6">Results</Typography>
      {(results.data ?? []).map((result) => (
        <Typography key={result.id}>
          <Link href={`/projects/${projectId}/test-runs/${runId}/results/${result.id}`}>{result.status}</Link>
          {" · "}
          {result.durationMs} ms
          {result.error ? ` · ${result.error.message}` : ""}
        </Typography>
      ))}
      <Typography variant="h6">Logs</Typography>
      {(logs.data ?? []).map((entry) => (
        <Typography key={entry.id} variant="body2">
          {entry.level}: {entry.message}
        </Typography>
      ))}
    </Stack>
  );
}
