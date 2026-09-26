"use client";

import { Stack } from "@mui/material";
import { use } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TestCaseForm } from "@/features/test-cases/TestCaseForm";
import { RunButton } from "@/features/test-runs/RunButton";
import { WatchToggle } from "@/features/test-runs/watch-mode";

export default function EditTestCasePage({ params }: { params: Promise<{ projectId: string; testCaseId: string }> }) {
  const { projectId, testCaseId } = use(params);
  return (
    <>
      <PageHeader
        title="Edit test case"
        subtitle="Update the steps and save, then press Run to try it against the app."
        action={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <WatchToggle />
            <RunButton projectId={projectId} testCaseId={testCaseId} size="medium" label="Run this test" />
          </Stack>
        }
      />
      <TestCaseForm projectId={projectId} testCaseId={testCaseId} />
    </>
  );
}
