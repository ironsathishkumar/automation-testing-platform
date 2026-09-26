"use client";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Alert, Button, Snackbar } from "@mui/material";
import { TestRun } from "@atp/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useWatchMode } from "./watch-mode";

export function RunButton({
  projectId,
  planId,
  suiteId,
  testCaseId,
  all,
  label = "Run",
  size = "small",
}: {
  projectId: string;
  planId?: string;
  suiteId?: string;
  testCaseId?: string;
  all?: boolean;
  label?: string;
  size?: "small" | "medium";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [watching] = useWatchMode();
  const run = useMutation({
    mutationFn: () =>
      api<TestRun>("/test-runs", {
        method: "POST",
        body: JSON.stringify({ projectId, planId, suiteId, testCaseId, all, headed: watching }),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["runs", projectId] });
      router.push(`/projects/${projectId}/test-runs/${created.id}`);
    },
  });

  return (
    <>
      <Button size={size} variant="contained" startIcon={all ? <PlayArrowIcon /> : undefined} disabled={run.isPending} onClick={() => run.mutate()} sx={{ whiteSpace: "nowrap" }}>
        {run.isPending ? "Starting…" : label}
      </Button>
      <Snackbar open={Boolean(run.error)} autoHideDuration={6000} onClose={() => run.reset()}>
        <Alert severity="error" onClose={() => run.reset()}>{errorMessage(run.error)}</Alert>
      </Snackbar>
    </>
  );
}
