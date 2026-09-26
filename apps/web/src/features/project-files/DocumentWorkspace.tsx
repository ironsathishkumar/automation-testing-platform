"use client";

import { Application, ProjectFileText } from "@atp/shared-types";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api, apiUrl, errorMessage } from "@/lib/api";

interface AiStatus {
  configured: boolean;
  model: string | null;
  message: string | null;
}

interface DraftStep {
  action: string;
  target?: string;
  value?: string;
}

interface AiDraft {
  id: string;
  status: string;
  output: { title?: string; objective?: string; engineType?: string; steps?: DraftStep[] } | null;
  createdTestCaseIds: string[];
}

export function DocumentWorkspace({ projectId, fileId }: { projectId: string; fileId: string }) {
  const queryClient = useQueryClient();
  const [applicationId, setApplicationId] = useState("");
  const [drafts, setDrafts] = useState<AiDraft[]>([]);
  const document = useQuery({ queryKey: ["file-text", fileId], queryFn: () => api<ProjectFileText>(`/files/${fileId}/text`) });
  const aiStatus = useQuery({ queryKey: ["ai-status"], queryFn: () => api<AiStatus>("/ai/status") });
  const applications = useQuery({ queryKey: ["applications", projectId], queryFn: () => api<Application[]>(`/projects/${projectId}/applications`) });
  const selectedApp = applicationId || applications.data?.[0]?.id || "";

  const draft = useMutation({
    mutationFn: () => api<AiDraft[]>(`/files/${fileId}/ai-tests`, { method: "POST", body: JSON.stringify({ applicationId: selectedApp }) }),
    onSuccess: (result) => setDrafts(result),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api<AiDraft>(`/ai/requests/${id}/approve`, { method: "POST" }),
    onSuccess: async (updated) => {
      setDrafts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  if (document.error) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">{errorMessage(document.error)}</Alert>
        <Box>
          <Button component="a" href={`${apiUrl()}/files/${fileId}/download`}>Download file</Button>
          <Button component={Link} href={`/projects/${projectId}/documents`}>Back to documents</Button>
        </Box>
      </Stack>
    );
  }
  if (!document.data) return <CircularProgress size={24} />;

  const { file, sections } = document.data;

  return (
    <>
      <PageHeader
        title={file.fileName}
        subtitle="Read each section and press “Write test case” to create a test for it. The section text stays beside the form while you add steps."
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={`/projects/${projectId}/documents`}>All documents</Button>
            <Button component="a" href={`${apiUrl()}/files/${fileId}/download`}>Download</Button>
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AutoAwesomeIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1">Draft test cases with AI (optional)</Typography>
          </Stack>
          {aiStatus.data && !aiStatus.data.configured ? (
            <Alert severity="info">
              AI drafting is off. {aiStatus.data.message} To use OpenAI, add <code>AI_API_KEY=sk-...</code>. To use a free local model with Ollama, add{" "}
              <code>AI_BASE_URL=http://localhost:11434/v1</code>, <code>AI_API_KEY=ollama</code>, and <code>AI_MODEL=llama3.1</code>. You can still write test cases from each section below.
            </Alert>
          ) : null}
          {aiStatus.data?.configured ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Sends this document to {aiStatus.data.model} and returns up to 8 draft tests. Nothing is saved until you approve a draft, and approved tests start as drafts you can edit.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
                {(applications.data?.length ?? 0) > 1 ? (
                  <TextField select size="small" label="Application" value={selectedApp} onChange={(event) => setApplicationId(event.target.value)} sx={{ minWidth: 240 }}>
                    {(applications.data ?? []).map((application) => <MenuItem key={application.id} value={application.id}>{application.name}</MenuItem>)}
                  </TextField>
                ) : null}
                <Button variant="contained" startIcon={<AutoAwesomeIcon />} disabled={draft.isPending || !selectedApp} onClick={() => draft.mutate()}>
                  {draft.isPending ? "Drafting…" : "Draft test cases"}
                </Button>
              </Stack>
              {!selectedApp && applications.isSuccess ? <Alert severity="warning">Add the website URL in Settings first.</Alert> : null}
            </>
          ) : null}
          {draft.error ? <Alert severity="error">{errorMessage(draft.error)}</Alert> : null}
          {approve.error ? <Alert severity="error">{errorMessage(approve.error)}</Alert> : null}
          {drafts.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{item.output?.title ?? "Untitled draft"}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.output?.objective}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.output?.engineType ?? "web"} · {(item.output?.steps ?? []).map((step) => step.action).join(" → ") || "no steps"}
                  </Typography>
                </Box>
                {item.createdTestCaseIds[0] ? (
                  <Button component={Link} href={`/projects/${projectId}/test-cases/${item.createdTestCaseIds[0]}`}>Open test case</Button>
                ) : (
                  <Button variant="outlined" disabled={approve.isPending} onClick={() => approve.mutate(item.id)}>Approve</Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Stack spacing={2}>
        {sections.map((section, index) => (
          <Paper key={`${index}-${section.title}`} variant="outlined" sx={{ p: 2, ml: Math.max(0, section.level - 1) * 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "flex-start" } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <Typography variant={section.level <= 1 ? "h6" : "subtitle1"}>{section.title}</Typography>
                  {section.level > 1 ? <Chip size="small" variant="outlined" label={`Section ${index + 1}`} /> : null}
                </Stack>
                {section.body ? (
                  <Box component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, color: "text.secondary", m: 0 }}>{section.body}</Box>
                ) : null}
              </Box>
              <Button
                variant="outlined"
                startIcon={<EditNoteIcon />}
                component={Link}
                href={`/projects/${projectId}/test-cases/new?fromFile=${fileId}&section=${index}`}
                sx={{ flexShrink: 0 }}
              >
                Write test case
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
