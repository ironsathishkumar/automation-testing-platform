"use client";

import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Application, Project } from "@atp/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiSettingsCard, useAiSettings } from "@/features/ai/AiSettingsCard";
import { api, errorMessage } from "@/lib/api";

interface AiRequestView {
  id: string;
  kind: string;
  prompt: string;
  output: unknown;
  status: string;
  createdTestCaseIds: string[];
  createdAt: string;
}

export default function AiPage() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [prompt, setPrompt] = useState("");
  const aiReady = Boolean(useAiSettings().data?.configured);
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  const applications = useQuery({
    queryKey: ["applications", projectId],
    queryFn: () => api<Application[]>(`/projects/${projectId}/applications`),
    enabled: Boolean(projectId),
  });
  const requests = useQuery({
    queryKey: ["ai", projectId],
    queryFn: () => api<AiRequestView[]>(`/projects/${projectId}/ai/requests`),
    enabled: Boolean(projectId),
  });

  const generate = useMutation({
    mutationFn: (kind: "scenarios" | "tests" | "suggestions") => {
      const body = kind === "tests" ? { prompt, applicationId } : { prompt };
      return api(`/projects/${projectId}/ai/${kind}`, { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai", projectId] });
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api(`/ai/requests/${id}/approve`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai", projectId] });
    },
  });

  return (
    <Stack spacing={2}>
      <PageHeader title="AI" subtitle="Connect a model once, then use it to draft tests, write steps from documents, and explain failures. Nothing is saved as a test until you approve it." />
      <AiSettingsCard />
      <Typography variant="h6" sx={{ pt: 1 }}>Ask AI</Typography>
      {aiReady ? null : <Alert severity="warning">Set up an AI provider above to use these buttons.</Alert>}
      {generate.error ? <Alert severity="error">{errorMessage(generate.error)}</Alert> : null}
      {approve.error ? <Alert severity="error">{errorMessage(approve.error)}</Alert> : null}
      <TextField select label="Project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setApplicationId(""); }}>
        {(projects.data ?? []).map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
      </TextField>
      <TextField select label="Application" value={applicationId} onChange={(event) => setApplicationId(event.target.value)} disabled={!projectId}>
        {(applications.data ?? []).map((application) => <MenuItem key={application.id} value={application.id}>{application.name}</MenuItem>)}
      </TextField>
      <TextField
        label="Prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        multiline
        minRows={3}
        placeholder="A logged-in user creates a task with a title and due date, and sees it on the board"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={!aiReady || !projectId || prompt.trim().length < 2 || generate.isPending} onClick={() => generate.mutate("scenarios")}>Scenarios</Button>
        <Button variant="contained" disabled={!aiReady || !projectId || !applicationId || prompt.trim().length < 2 || generate.isPending} onClick={() => generate.mutate("tests")}>Draft test</Button>
        <Button disabled={!aiReady || !projectId || prompt.trim().length < 2 || generate.isPending} onClick={() => generate.mutate("suggestions")}>Suggestions</Button>
        {generate.isPending ? <Typography color="text.secondary" sx={{ alignSelf: "center" }}>Waiting for the model…</Typography> : null}
      </Stack>
      {(requests.data ?? []).map((request) => (
        <Paper key={request.id} sx={{ p: 2 }}>
          <Typography variant="subtitle1">{request.kind} · {request.status}</Typography>
          <Typography color="text.secondary">{request.prompt}</Typography>
          <Typography component="pre" variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(request.output, null, 2)}</Typography>
          {request.kind === "test" && request.status === "completed" ? (
            <Button size="small" onClick={() => approve.mutate(request.id)} disabled={approve.isPending}>Approve and create draft</Button>
          ) : null}
        </Paper>
      ))}
    </Stack>
  );
}
