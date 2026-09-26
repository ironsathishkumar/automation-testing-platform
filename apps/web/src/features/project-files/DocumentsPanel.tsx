"use client";

import { PROJECT_FILE_CATEGORIES, ProjectFile, ProjectFileCategory } from "@atp/shared-types";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, apiUrl, errorMessage } from "@/lib/api";
import { GenerateResult, useAiStatus, useGenerateTests } from "./generate-tests";

const CATEGORY_LABELS: Record<ProjectFileCategory, string> = {
  requirements: "Requirements / specs",
  "test-cases": "Existing test cases",
  design: "Designs / screenshots",
  other: "Other",
};

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md,.json,.yaml,.yml,.feature,.png,.jpg,.jpeg,.zip";
const MAX_BYTES = 25 * 1024 * 1024;
const READABLE = /\.(md|txt|csv|json|ya?ml|feature)$/i;

function isReadable(fileName: string) {
  return READABLE.test(fileName);
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ProjectFileCategory>("requirements");
  const [note, setNote] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ProjectFile | null>(null);
  const files = useQuery({ queryKey: ["project-files", projectId], queryFn: () => api<ProjectFile[]>(`/projects/${projectId}/files`) });
  const aiStatus = useAiStatus();
  const generate = useGenerateTests(projectId);
  const generatingId = generate.isPending ? generate.variables?.fileId : undefined;

  const upload = useMutation({
    mutationFn: async (selected: File[]) => {
      const problems: string[] = [];
      for (const file of selected) {
        if (file.size > MAX_BYTES) {
          problems.push(`${file.name}: larger than 25 MB.`);
          continue;
        }
        const body = new FormData();
        body.append("category", category);
        body.append("note", note);
        body.append("file", file);
        try {
          await api<ProjectFile>(`/projects/${projectId}/files`, { method: "POST", body });
        } catch (error) {
          problems.push(`${file.name}: ${errorMessage(error)}`);
        }
      }
      return problems;
    },
    onSuccess: async (problems) => {
      setMessages(problems);
      if (problems.length === 0) setNote("");
      await queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    },
  });

  const remove = useMutation({
    mutationFn: (file: ProjectFile) => api(`/files/${file.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    },
  });

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Requirements, specs, designs, and existing test sheets shared by the client. Your team reviews them and writes the test cases here."
      />
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField select label="Document type" value={category} onChange={(event) => setCategory(event.target.value as ProjectFileCategory)} sx={{ minWidth: 240 }}>
              {PROJECT_FILE_CATEGORIES.map((item) => <MenuItem key={item} value={item}>{CATEGORY_LABELS[item]}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              label="Note (optional)"
              placeholder="Checkout requirements v2 from the client, shared 25 Sep"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 500 } }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button component="label" variant="contained" startIcon={<UploadFileIcon />} disabled={upload.isPending} sx={{ flexShrink: 0, alignSelf: { md: "center" } }}>
              Upload files
              <input
                hidden
                multiple
                type="file"
                accept={ACCEPT}
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  if (selected.length > 0) upload.mutate(selected);
                }}
              />
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            PDF, Word, Excel, PowerPoint, CSV, text, Markdown, JSON, YAML, Gherkin .feature, images, or ZIP. Up to 25 MB each. Files stay on this machine under storage/documents.
            Text formats (.md, .txt, .csv, .json, .yaml, .feature) can generate test cases in one click; save Word or PDF requirements as Markdown or text to use that.
          </Typography>
          {upload.isPending ? <LinearProgress /> : null}
          {messages.length > 0 ? <Alert severity="error" onClose={() => setMessages([])}>{messages.join(" ")}</Alert> : null}
        </Stack>
      </Paper>

      {files.error ? <Alert severity="error">{errorMessage(files.error)}</Alert> : null}
      <Box sx={{ mb: generate.data || generate.error ? 2 : 0 }}>
        <GenerateResult projectId={projectId} mutation={generate} onClose={() => generate.reset()} />
      </Box>
      {files.data?.length === 0 ? <EmptyState title="No documents yet" body="Upload the client's requirement documents or test sheets so the team can review them while writing tests." /> : null}
      {files.data && files.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.data.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>
                  {isReadable(file.fileName) ? (
                    <Link href={`/projects/${projectId}/documents/${file.id}`}>{file.fileName}</Link>
                  ) : (
                    <a href={`${apiUrl()}/files/${file.id}/download`}>{file.fileName}</a>
                  )}
                  {file.note ? <Typography variant="body2" color="text.secondary">{file.note}</Typography> : null}
                </TableCell>
                <TableCell><Chip size="small" label={CATEGORY_LABELS[file.category]} /></TableCell>
                <TableCell>{formatSize(file.sizeBytes)}</TableCell>
                <TableCell>{new Date(file.createdAt).toLocaleString()}</TableCell>
                <TableCell align="right">
                  {isReadable(file.fileName) ? (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={generatingId === file.id ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                        disabled={generate.isPending}
                        onClick={() => generate.mutate({ fileId: file.id, useAi: Boolean(aiStatus.data?.configured) })}
                      >
                        {generatingId === file.id ? "Generating…" : "Generate test cases"}
                      </Button>
                      <Button size="small" component={Link} href={`/projects/${projectId}/documents/${file.id}`}>Open</Button>
                    </>
                  ) : null}
                  <Button size="small" component="a" href={`${apiUrl()}/files/${file.id}/download`}>Download</Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(file)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete document"
        body={`This permanently removes ${pendingDelete?.fileName ?? "the file"} from this machine.`}
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </>
  );
}
