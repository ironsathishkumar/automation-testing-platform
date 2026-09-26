"use client";

import { Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { TestCase } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { ENGINE_GUIDE } from "@/features/test-cases/engine-guide";
import { RunButton } from "@/features/test-runs/RunButton";
import { WatchToggle } from "@/features/test-runs/watch-mode";
import { api, errorMessage } from "@/lib/api";
import { Alert } from "@mui/material";

export default function TestCasesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const cases = useQuery({
    queryKey: ["test-cases", projectId],
    queryFn: () => api<TestCase[]>(`/projects/${projectId}/test-cases`),
  });
  const runnable = (cases.data ?? []).filter((testCase) => testCase.status !== "deprecated" && testCase.steps.length > 0).length;

  return (
    <>
      <PageHeader
        title="Test cases"
        subtitle="Each test case is one check. Press Run for one, or Run all to test the whole app. Turn on “Show browser” to watch it happen."
        action={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <WatchToggle />
            {runnable > 0 ? <RunButton projectId={projectId} all size="medium" label={`Run all (${runnable})`} /> : null}
            <Button variant="outlined" component={Link} href={`/projects/${projectId}/test-cases/new`}>New test case</Button>
          </Stack>
        }
      />
      {cases.error ? <Alert severity="error">{errorMessage(cases.error)}</Alert> : null}
      {cases.data?.length === 0 ? (
        <EmptyState
          title="No test cases yet"
          body="Start with a simple web test: open a page and check something is visible."
          action={<Button variant="contained" component={Link} href={`/projects/${projectId}/test-cases/new`}>New test case</Button>}
        />
      ) : null}
      {cases.data && cases.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Test type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Run</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cases.data.map((testCase) => (
              <TableRow key={testCase.id} hover>
                <TableCell>{testCase.key}</TableCell>
                <TableCell>
                  <Link href={`/projects/${projectId}/test-cases/${testCase.id}`}>{testCase.title}</Link>
                </TableCell>
                <TableCell>{ENGINE_GUIDE[testCase.engineType].label}</TableCell>
                <TableCell>{testCase.priority}</TableCell>
                <TableCell><Chip size="small" label={testCase.status} /></TableCell>
                <TableCell align="right"><RunButton projectId={projectId} testCaseId={testCase.id} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </>
  );
}
