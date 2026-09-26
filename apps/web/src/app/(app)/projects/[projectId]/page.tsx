"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { Alert, Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { Application, ProjectDetail, ProjectFile, TestRun } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { api, errorMessage } from "@/lib/api";

export default function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const base = `/projects/${projectId}`;
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<ProjectDetail>(`/projects/${projectId}`),
  });
  const applications = useQuery({ queryKey: ["applications", projectId], queryFn: () => api<Application[]>(`/projects/${projectId}/applications`) });
  const runs = useQuery({ queryKey: ["runs", projectId], queryFn: () => api<TestRun[]>(`/test-runs?projectId=${projectId}`) });
  const documents = useQuery({ queryKey: ["project-files", projectId], queryFn: () => api<ProjectFile[]>(`/projects/${projectId}/files`) });

  if (project.error) return <Alert severity="error">{errorMessage(project.error)}</Alert>;
  if (!project.data) return null;

  const counts = project.data.counts;
  const target = applications.data?.[0];
  const lastRun = runs.data?.[0];
  const steps = [
    {
      done: (documents.data?.length ?? 0) > 0,
      title: "Collect the client's material",
      body: target?.repository?.url
        ? `Repository: ${target.repository.url}. Upload the requirement documents or test sheets you received.`
        : "Upload requirement documents or test sheets they shared. Add the repository link in Settings.",
      action: <Button component={Link} href={`${base}/documents`}>Documents</Button>,
    },
    {
      done: counts.applications > 0,
      title: "Set the website or API URL",
      body: target ? `Tests run against ${target.baseUrl || target.apiBaseUrl || target.name}.` : "Tell the platform where the site you want to test lives.",
      action: <Button component={Link} href={`${base}/settings`}>{counts.applications > 0 ? "Change" : "Add URL"}</Button>,
    },
    {
      done: counts.testCases > 0,
      title: "Write a test case",
      body: "Pick a test type and fill in the steps. Every field shows an example.",
      action: <Button variant={counts.applications > 0 && counts.testCases === 0 ? "contained" : "text"} component={Link} href={`${base}/test-cases/new`}>New test case</Button>,
    },
    {
      done: Boolean(lastRun),
      title: "Run it and review the result",
      body: "Press Run on a test case. Screenshots, video, and logs appear on the result page.",
      action: <Button component={Link} href={`${base}/test-cases`}>Open test cases</Button>,
    },
  ];

  const more = [
    { label: "Test cases", value: counts.testCases, href: `${base}/test-cases`, hint: "Individual checks" },
    { label: "Suites", value: counts.suites, href: `${base}/test-suites`, hint: "Optional: run several cases together" },
    { label: "Plans", value: counts.plans, href: `${base}/test-plans`, hint: "Optional: suites across browsers and screen sizes" },
    { label: "Environments", value: counts.environments, href: `${base}/settings`, hint: "Optional: dev, QA, staging URLs and secrets" },
  ];

  return (
    <Stack spacing={3}>
      {project.data.description ? <Typography>{project.data.description}</Typography> : null}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Get started</Typography>
        <Stack spacing={1.5}>
          {steps.map((step, index) => (
            <Stack key={step.title} direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
              {step.done ? <CheckCircleIcon color="success" /> : <RadioButtonUncheckedIcon color="disabled" />}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{index + 1}. {step.title}</Typography>
                <Typography variant="body2" color="text.secondary">{step.body}</Typography>
              </Box>
              {step.action}
            </Stack>
          ))}
        </Stack>
      </Paper>
      {lastRun ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">Latest run</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(lastRun.createdAt).toLocaleString()} · {lastRun.passed} passed · {lastRun.failed} failed · {lastRun.total} total
              </Typography>
            </Box>
            <Chip size="small" label={lastRun.status} color={lastRun.status === "passed" ? "success" : lastRun.status === "failed" ? "error" : "default"} />
            <Button component={Link} href={`${base}/test-runs/${lastRun.id}`}>Open</Button>
          </Stack>
        </Paper>
      ) : null}
      <Grid container spacing={2}>
        {more.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper component={Link} href={card.href} variant="outlined" sx={{ p: 2, display: "block", textDecoration: "none", color: "inherit", height: "100%" }}>
              <Typography variant="body2" color="text.secondary">{card.label}</Typography>
              <Typography variant="h5">{card.value}</Typography>
              <Typography variant="caption" color="text.secondary">{card.hint}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
