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
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Artifact, ExecutionLogEntry, TestCase, TestResult, TestRun } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useCallback, useEffect, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { formatDuration, statusColor, variantLabel } from "@/features/test-runs/status";
import { api, apiUrl, errorMessage } from "@/lib/api";

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
  const runFiles = useQuery({
    queryKey: ["run-artifacts", runId],
    queryFn: () => api<Artifact[]>(`/test-runs/${runId}/artifacts`),
    refetchInterval: active ? 3000 : false,
  });
  const recording = (runFiles.data ?? []).find((artifact) => artifact.type === "video");
  const player = useRef<HTMLVideoElement>(null);

  const watchFrom = useCallback((offsetMs: number) => {
    const video = player.current;
    if (!video) return;
    video.currentTime = Math.max(0, offsetMs / 1000);
    video.scrollIntoView({ behavior: "smooth", block: "center" });
    void video.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const at = Number(new URLSearchParams(window.location.search).get("at"));
    const video = player.current;
    if (!recording || !video || !Number.isFinite(at) || at <= 0) return;
    const seek = () => watchFrom(at);
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [recording, watchFrom]);

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

      {recording ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1">Recording of the whole run</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            All tests ran one after another in the same browser. Press Watch on a test below to jump to it.
          </Typography>
          <Box component="video" ref={player} controls preload="metadata" src={`${apiUrl()}/artifacts/${recording.id}`} sx={{ width: "100%", maxHeight: 560, bgcolor: "black", borderRadius: 1 }} />
          <Button size="small" component="a" href={`${apiUrl()}/artifacts/${recording.id}`} download sx={{ mt: 1 }}>Download video</Button>
        </Paper>
      ) : active && (results.data ?? []).some((result) => result.metrics?.recordingOffsetMs !== undefined) ? (
        <Alert severity="info" sx={{ mb: 3 }}>The tests share one browser. The recording of the whole run appears here when the last test finishes.</Alert>
      ) : null}

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
              const offset = result.metrics?.recordingOffsetMs;
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
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {recording && offset !== undefined ? (
                      <Button size="small" startIcon={<PlayArrowIcon />} onClick={() => watchFrom(offset)} sx={{ mr: 1 }}>
                        Watch
                      </Button>
                    ) : null}
                    <Button size="small" variant="outlined" component={Link} href={`/projects/${projectId}/test-runs/${runId}/results/${result.id}`}>
                      {offset !== undefined ? "Screenshots" : "Screenshots & video"}
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
