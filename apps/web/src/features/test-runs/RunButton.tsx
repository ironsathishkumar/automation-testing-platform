"use client";

import { Button } from "@mui/material";
import { TestRun } from "@atp/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function RunButton({
  projectId,
  planId,
  suiteId,
  testCaseId,
  label = "Run",
}: {
  projectId: string;
  planId?: string;
  suiteId?: string;
  testCaseId?: string;
  label?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const run = useMutation({
    mutationFn: () =>
      api<TestRun>("/test-runs", {
        method: "POST",
        body: JSON.stringify({ projectId, planId, suiteId, testCaseId }),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["runs", projectId] });
      router.push(`/projects/${projectId}/test-runs/${created.id}`);
    },
  });

  return (
    <Button size="small" variant="contained" disabled={run.isPending} onClick={() => run.mutate()}>
      {run.isPending ? "Starting" : label}
    </Button>
  );
}
