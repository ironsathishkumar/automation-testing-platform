"use client";

import { Chip, Paper, Stack, Typography } from "@mui/material";
import { PageHeader } from "@/components/PageHeader";

const ENGINES = [
  ["Web", "Playwright actions, screenshots, video, and traces"],
  ["API", "HTTP requests, auth, and response assertions"],
  ["Mobile", "Appium on a later phase"],
  ["Performance", "k6 load profiles on a later phase"],
  ["Quality", "Accessibility, visual, and responsive checks on a later phase"],
];

export default function EnginesPage() {
  return (
    <>
      <PageHeader title="Engines" subtitle="Execution adapters are not part of this build yet. Test cases can already store an engine type." />
      <Stack spacing={2}>
        {ENGINES.map(([name, detail]) => (
          <Paper key={name} sx={{ p: 2.5, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
            <div>
              <Typography variant="h6">{name}</Typography>
              <Typography color="text.secondary">{detail}</Typography>
            </div>
            <Chip label="Not running yet" />
          </Paper>
        ))}
      </Stack>
    </>
  );
}
