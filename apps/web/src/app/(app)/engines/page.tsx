"use client";

import { Alert, Chip, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

interface EngineInfo {
  type: string;
  actions?: string[];
  browsers?: string[];
}

export default function EnginesPage() {
  const engines = useQuery({ queryKey: ["engines"], queryFn: () => api<EngineInfo[]>("/engines") });

  return (
    <>
      <PageHeader title="Engines" subtitle="Registered adapters that the local worker can run." />
      {engines.error ? <Alert severity="error">{errorMessage(engines.error)}</Alert> : null}
      <Stack spacing={2}>
        {(engines.data ?? []).map((engine) => (
          <Paper key={engine.type} sx={{ p: 2.5, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center" }}>
            <div>
              <Typography variant="h6">{engine.type}</Typography>
              <Typography color="text.secondary">
                {(engine.actions ?? []).join(", ") || "No actions declared"}
                {engine.browsers ? ` · ${engine.browsers.join(", ")}` : ""}
              </Typography>
            </div>
            <Chip color="success" label="Registered" />
          </Paper>
        ))}
      </Stack>
    </>
  );
}
