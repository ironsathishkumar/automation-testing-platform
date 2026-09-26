"use client";

import { Application, ProjectFileText } from "@atp/shared-types";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api, apiUrl, errorMessage } from "@/lib/api";
import { GenerateResult, useAiStatus, useGenerateTests } from "./generate-tests";

export function DocumentWorkspace({ projectId, fileId }: { projectId: string; fileId: string }) {
  const [applicationId, setApplicationId] = useState("");
  const [aiChoice, setUseAi] = useState(true);
  const document = useQuery({ queryKey: ["file-text", fileId], queryFn: () => api<ProjectFileText>(`/files/${fileId}/text`) });
  const aiStatus = useAiStatus();
  const applications = useQuery({ queryKey: ["applications", projectId], queryFn: () => api<Application[]>(`/projects/${projectId}/applications`) });
  const selectedApp = applicationId || applications.data?.[0]?.id || "";
  const useAi = Boolean(aiStatus.data?.configured) && aiChoice;
  const generate = useGenerateTests(projectId);

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
  const writable = sections.filter((section) => section.body.trim().length > 0).length;

  return (
    <>
      <PageHeader
        title={file.fileName}
        subtitle="Press “Generate test cases” to create them all at once, or use “Write test case” on a single section to write one by hand."
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={`/projects/${projectId}/documents`}>All documents</Button>
            <Button component="a" href={`${apiUrl()}/files/${fileId}/download`}>Download</Button>
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">Generate test cases from this document</Typography>
              <Typography variant="body2" color="text.secondary">
                {useAi
                  ? `${aiStatus.data?.model} reads the document and writes up to 15 test cases with steps. They are saved as drafts for you to review.`
                  : `Creates one draft test case for each of the ${writable} sections with text, with the requirement and starter steps filled in. Sections already generated are skipped.`}
              </Typography>
            </Box>
            {(applications.data?.length ?? 0) > 1 ? (
              <TextField select size="small" label="Application" value={selectedApp} onChange={(event) => setApplicationId(event.target.value)} sx={{ minWidth: 200 }}>
                {(applications.data ?? []).map((application) => <MenuItem key={application.id} value={application.id}>{application.name}</MenuItem>)}
              </TextField>
            ) : null}
            <Button
              variant="contained"
              startIcon={generate.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              disabled={generate.isPending || !selectedApp || writable === 0}
              onClick={() => generate.mutate({ fileId, applicationId: selectedApp, useAi })}
              sx={{ flexShrink: 0 }}
            >
              {generate.isPending ? "Generating…" : "Generate test cases"}
            </Button>
          </Stack>
          {aiStatus.data?.configured ? (
            <FormControlLabel control={<Switch checked={useAi} onChange={(event) => setUseAi(event.target.checked)} />} label={`Let AI (${aiStatus.data.model}) write the steps`} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              Want AI to write real steps too? <Link href="/ai">Connect an AI provider</Link> (Gemini and Groq have free tiers), then come back.
            </Typography>
          )}
          {!selectedApp && applications.isSuccess ? <Alert severity="warning">Add the website or API URL in project Settings first.</Alert> : null}
          <GenerateResult projectId={projectId} mutation={generate} onClose={() => generate.reset()} />
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
