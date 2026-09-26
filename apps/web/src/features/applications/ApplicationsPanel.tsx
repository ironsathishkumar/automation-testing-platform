"use client";

import { APPLICATION_TYPES, Application } from "@atp/shared-types";
import { createApplicationSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

type FormValues = z.output<typeof createApplicationSchema>;

export function ApplicationsPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const records = useQuery({
    queryKey: ["applications", projectId],
    queryFn: () => api<Application[]>(`/projects/${projectId}/applications`),
  });
  const form = useForm<z.input<typeof createApplicationSchema>, unknown, FormValues>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { name: "", type: "web", description: "", baseUrl: "", apiBaseUrl: "", repository: { url: "", branch: "", provider: "" } },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", type: "web", description: "", baseUrl: "", apiBaseUrl: "", repository: { url: "", branch: "", provider: "" } });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(application: Application) {
    setEditing(application);
    form.reset({
      name: application.name,
      type: application.type,
      description: application.description,
      baseUrl: application.baseUrl ?? "",
      apiBaseUrl: application.apiBaseUrl ?? "",
      repository: {
        url: application.repository?.url ?? "",
        branch: application.repository?.branch ?? "",
        provider: application.repository?.provider ?? "",
      },
    });
    setFormError(null);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const path = editing ? `/applications/${editing.id}` : `/projects/${projectId}/applications`;
      return api(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify(values) });
    },
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["applications", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (application: Application) => api(`/applications/${application.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["applications", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  return (
    <>
      <PageHeader title="Applications" subtitle="Systems under test for this project." action={<Button variant="contained" onClick={openCreate}>Add application</Button>} />
      {records.error ? <Alert severity="error">{errorMessage(records.error)}</Alert> : null}
      {records.data?.length === 0 ? <EmptyState title="No applications" body="Add the web app, API, or service you want to test." /> : null}
      {records.data && records.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Base URL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.data.map((application) => (
              <TableRow key={application.id}>
                <TableCell>{application.name}</TableCell>
                <TableCell>{application.type}</TableCell>
                <TableCell>{application.baseUrl || application.apiBaseUrl || "—"}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(application)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(application)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit application" : "Add application"}</DialogTitle>
        <Stack component="form" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <DialogContent>
            <Stack spacing={2}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <TextField label="Name" {...form.register("name")} error={Boolean(form.formState.errors.name)} helperText={form.formState.errors.name?.message} />
              <TextField select label="Type" value={form.watch("type")} onChange={(event) => form.setValue("type", event.target.value as FormValues["type"])}>
                {APPLICATION_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
              <TextField label="Description" multiline minRows={2} {...form.register("description")} />
              <TextField label="Base URL" {...form.register("baseUrl")} error={Boolean(form.formState.errors.baseUrl)} helperText={form.formState.errors.baseUrl?.message} />
              <TextField label="API base URL" {...form.register("apiBaseUrl")} />
              <TextField label="Repository URL" {...form.register("repository.url")} />
              <TextField label="Branch" {...form.register("repository.branch")} />
              <TextField label="Provider" {...form.register("repository.provider")} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending}>Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete application"
        body="Test cases that point at this application will keep the stored id until you edit them."
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </>
  );
}
