"use client";

import { Alert, Chip, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { TestRun } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

export default function RunsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const runs = useQuery({
    queryKey: ["runs", projectId],
    queryFn: () => api<TestRun[]>(`/test-runs?projectId=${projectId}`),
    refetchInterval: 3000,
  });

  return (
    <>
      <PageHeader title="Test runs" subtitle="Queued work is picked up by the local worker." />
      {runs.error ? <Alert severity="error">{errorMessage(runs.error)}</Alert> : null}
      {runs.data?.length === 0 ? <EmptyState title="No runs yet" body="Start a run from a test case, suite, or plan." /> : null}
      {runs.data && runs.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Started</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Passed</TableCell>
              <TableCell>Failed</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.data.map((run) => (
              <TableRow key={run.id} hover>
                <TableCell>
                  <Link href={`/projects/${projectId}/test-runs/${run.id}`}>{new Date(run.createdAt).toLocaleString()}</Link>
                </TableCell>
                <TableCell><Chip size="small" label={run.status} /></TableCell>
                <TableCell>{run.passed}</TableCell>
                <TableCell>{run.failed}</TableCell>
                <TableCell>{run.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </>
  );
}
