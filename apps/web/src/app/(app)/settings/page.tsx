"use client";

import { Alert, Paper, Stack, Typography } from "@mui/material";
import { HealthStatus } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

export default function SettingsPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<HealthStatus>("/health"),
  });

  return (
    <>
      <PageHeader title="Settings" subtitle="This workstation copy talks only to the local API." />
      {health.error ? <Alert severity="error">{errorMessage(health.error)}</Alert> : null}
      <Stack spacing={2}>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6">API</Typography>
          <Typography>http://127.0.0.1:4000/api</Typography>
          <Typography color="text.secondary">Swagger is at http://127.0.0.1:4000/api/docs</Typography>
        </Paper>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6">MongoDB</Typography>
          <Typography>{health.data ? health.data.mongo : "Checking"}</Typography>
        </Paper>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6">Artifacts</Typography>
          <Typography color="text.secondary">Screenshots, videos, and traces will be stored under storage/artifacts when execution is added.</Typography>
        </Paper>
      </Stack>
    </>
  );
}
