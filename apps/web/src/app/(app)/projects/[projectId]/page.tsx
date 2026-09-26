"use client";

import { Alert, Grid, Paper, Typography } from "@mui/material";
import { ProjectDetail } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { api, errorMessage } from "@/lib/api";

export default function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<ProjectDetail>(`/projects/${projectId}`),
  });

  if (project.error) return <Alert severity="error">{errorMessage(project.error)}</Alert>;
  if (!project.data) return null;

  const cards = [
    ["Applications", project.data.counts.applications],
    ["Environments", project.data.counts.environments],
    ["Test cases", project.data.counts.testCases],
    ["Suites", project.data.counts.suites],
    ["Plans", project.data.counts.plans],
  ];

  return (
    <>
      <Typography sx={{ mb: 2 }}>{project.data.description || "No description yet."}</Typography>
      <Grid container spacing={2}>
        {cards.map(([label, value]) => (
          <Grid key={String(label)} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h5">{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
