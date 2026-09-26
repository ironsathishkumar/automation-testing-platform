"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ExecutionLogEntry, TestCase, TestResult, TestRun } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { formatDuration, statusColor, variantLabel } from "@/features/test-runs/status";
import { api, errorMessage } from "@/lib/api";

export default function RunDetailPage({ params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = use(params);
  const run = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api<TestRun>(`/test-runs/${runId}`),
    refetchInterval: (query) => (query.state.data && ["queued", "running"].includes(query.state.data.status) ? 1500 : false),
  });
  const active = !run.data || ["queued", "running"].includes(run.data.status);
  const results = useQuery({
    queryKey: ["run-results", runId],
    queryFn: () => api<TestResult[]>(`/test-runs/${runId}/results`),
    refetchInterval: active ? 1500 : false,
  });
  const logs = useQuery({
    queryKey: ["run-logs", runId],
    queryFn: () => api<ExecutionLogEntry[]>(`/test-runs/${runId}/logs`),
    refetchInterval: active ? 1500 : false,
  });
  const cases = useQuery({ queryKey: ["test-cases", projectId], queryFn: () => api<TestCase[]>(`/projects/${projectId}/test-cases`) });
  const titles = new Map((cases.data ?? []).map((testCase) => [testCase.id, testCase.title]));

  async function post(action: "cancel" | "retry" | "rerun-failed") {
    await api(`/test-runs/${runId}/${action}`, { method: "POST" });
    await Promise.all([run.refetch(), results.refetch()]);
  }

  async function exportReport() {
    const report = await api<unknown>(`/test-runs/${runId}/report/export`, { method: "POST" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    link.download = `run-${runId}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (run.error) return <Alert severity="error">{errorMessage(run.error)}</Alert>;
  if (!run.data) return <LinearProgress />;

  const done = run.data.passed + run.data.failed + run.data.skipped + run.data.cancelled;
  const progress = run.data.total > 0 ? Math.min(100, (done / run.data.total) * 100) : 0;
  const lastStarted = [...(logs.data ?? [])].reverse().find((entry) => entry.message.startsWith("Started "));

  return (
    <>
      <PageHeader
        title="Test run"
        subtitle={`Started ${new Date(run.data.createdAt).toLocaleString()} · ${run.data.total} test${run.data.total === 1 ? "" : "s"}`}
        action={
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {active ? <Button color="warning" onClick={() => void post("cancel")}>Cancel</Button> : null}
            {!active && run.data.failed > 0 ? <Button variant="outlined" onClick={() => void post("rerun-failed")}>Re-run failed</Button> : null}
            {!active ? <Button onClick={() => void exportReport()}>Export report</Button> : null}
            <Button component={Link} href={`/projects/${projectId}/test-cases`}>Test cases</Button>
            <Button component={Link} href={`/projects/${projectId}/test-runs`}>All runs</Button>
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, mb: 1.5 }}>
          <Chip color={statusColor(run.data.status)} label={run.data.status} />
          <Typography>
            <b>{run.data.passed}</b> passed · <b>{run.data.failed}</b> failed · {done} of {run.data.total} done
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography color="text.secondary">{formatDuration(run.data.durationMs)}</Typography>
        </Stack>
        <LinearProgress
          variant={active && done === 0 ? "indeterminate" : "determinate"}
          value={progress}
          color={run.data.failed > 0 ? "error" : "success"}
          sx={{ height: 8, borderRadius: 4 }}
        />
        {active && lastStarted ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Running {titles.get(lastStarted.testCaseId ?? "") ?? lastStarted.message.replace("Started ", "")}…
          </Typography>
        ) : null}
      </Paper>

      {(results.data ?? []).length > 0 ? (
        <Table sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Test case</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Steps</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Problem</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {(results.data ?? []).map((result) => {
              const passedSteps = result.steps.filter((step) => step.status === "passed").length;
              return (
                <TableRow key={result.id} hover>
                  <TableCell>
                    {titles.get(result.testCaseId) ?? "Deleted test case"}
                    {variantLabel(result.variant) ? <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{variantLabel(result.variant)}</Typography> : null}
                  </TableCell>
                  <TableCell><Chip size="small" color={statusColor(result.status)} label={result.status} /></TableCell>
                  <TableCell>{passedSteps} / {result.steps.length}</TableCell>
                  <TableCell>{formatDuration(result.durationMs)}</TableCell>
                  <TableCell sx={{ maxWidth: 320, color: "error.main", fontSize: 13 }}>{result.error?.message.split("\n")[0]}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" component={Link} href={`/projects/${projectId}/test-runs/${runId}/results/${result.id}`} sx={{ whiteSpace: "nowrap" }}>
                      Screenshots &amp; video
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : active ? (
        <Alert severity="info" sx={{ mb: 3 }}>Tests are running. Results appear here as each one finishes.</Alert>
      ) : null}

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Run log ({logs.data?.length ?? 0} lines)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>
            {(logs.data ?? []).map((entry) => `${new Date(entry.createdAt).toLocaleTimeString()}  ${entry.level.padEnd(5)}  ${entry.message}`).join("\n")}
          </Box>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
