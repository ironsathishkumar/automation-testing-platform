"use client";

import { Divider, Stack } from "@mui/material";
import { use } from "react";
import { ApplicationsPanel } from "@/features/applications/ApplicationsPanel";
import { EnvironmentsPanel } from "@/features/environments/EnvironmentsPanel";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return (
    <Stack spacing={4}>
      <ApplicationsPanel projectId={projectId} />
      <Divider />
      <EnvironmentsPanel projectId={projectId} />
    </Stack>
  );
}
