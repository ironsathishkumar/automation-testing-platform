"use client";

import { ProjectFileText } from "@atp/shared-types";
import { Alert, Box, Button, Grid, Paper, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TestCaseForm, TestCasePrefill } from "@/features/test-cases/TestCaseForm";
import { api, errorMessage } from "@/lib/api";

export default function NewTestCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ fromFile?: string; section?: string }>;
}) {
  const { projectId } = use(params);
  const { fromFile, section } = use(searchParams);
  const sectionIndex = Number(section ?? 0);
  const source = useQuery({
    queryKey: ["file-text", fromFile],
    queryFn: () => api<ProjectFileText>(`/files/${fromFile}/text`),
    enabled: Boolean(fromFile),
  });
  const requirement = source.data?.sections[sectionIndex];
  const prefill = useMemo<TestCasePrefill | undefined>(() => {
    if (!requirement || !source.data) return undefined;
    const title = requirement.title.length >= 2 ? requirement.title : `${requirement.title} requirement`;
    return {
      title: title.slice(0, 200),
      objective: `Check the "${requirement.title}" requirement from ${source.data.file.fileName}.`.slice(0, 2000),
      description: requirement.body.slice(0, 3900),
      tags: ["from-doc"],
    };
  }, [requirement, source.data]);

  if (!fromFile) {
    return (
      <>
        <PageHeader title="New test case" subtitle="Name the test, pick a test type, and fill in the steps. Every field shows an example." />
        <TestCaseForm projectId={projectId} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="New test case from document" subtitle="The requirement from the document is shown next to the form. Rename the test to what it should prove, then add the steps that check it." />
      {source.error ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage(source.error)}</Alert> : null}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>{prefill ? <TestCaseForm projectId={projectId} prefill={prefill} /> : null}</Grid>
        <Grid size={{ xs: 12, lg: 5 }} sx={{ order: { xs: -1, lg: 0 } }}>
          {requirement && source.data ? (
            <Paper variant="outlined" sx={{ p: 2, position: { lg: "sticky" }, top: 16, maxHeight: { lg: "85vh" }, overflow: "auto" }}>
              <Typography variant="overline" color="text.secondary">{source.data.file.fileName}</Typography>
              <Typography variant="h6" sx={{ mb: 1 }}>{requirement.title}</Typography>
              <Box component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, m: 0 }}>{requirement.body || "This section has no text."}</Box>
              <Button component={Link} href={`/projects/${projectId}/documents/${fromFile}`} sx={{ mt: 2 }}>Back to document</Button>
            </Paper>
          ) : null}
        </Grid>
      </Grid>
    </>
  );
}
