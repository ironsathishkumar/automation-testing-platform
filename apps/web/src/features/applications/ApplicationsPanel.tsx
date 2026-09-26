"use client";

import { APPLICATION_TYPES, Application } from "@atp/shared-types";
import { createApplicationSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

type FormValues = z.output<typeof createApplicationSchema>;

const shrink = { inputLabel: { shrink: true } };

const TYPE_LABELS: Record<FormValues["type"], string> = {
  web: "Website",
  api: "API",
  mobile: "Mobile app",
  desktop: "Desktop app",
  service: "Backend service",
};

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
      <PageHeader
        title="Website & API"
        subtitle="Where tests run. Most projects need just one entry. Add more only if the project covers several separate apps."
        action={<Button variant="contained" onClick={openCreate}>Add application</Button>}
      />
      {records.error ? <Alert severity="error">{errorMessage(records.error)}</Alert> : null}
      {records.data?.length === 0 ? (
        <EmptyState title="No website or API yet" body="Add the URL of the site or API you want to test. Test cases need this before they can run." action={<Button variant="contained" onClick={openCreate}>Add URL</Button>} />
      ) : null}
      {records.data && records.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>URL</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.data.map((application) => (
              <TableRow key={application.id}>
                <TableCell>{application.name}</TableCell>
                <TableCell>{TYPE_LABELS[application.type]}</TableCell>
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
              <TextField
                label="Name"
                placeholder="Storefront"
                slotProps={shrink}
                {...form.register("name")}
                error={Boolean(form.formState.errors.name)}
                helperText={form.formState.errors.name?.message ?? "Shown when you pick where a test runs."}
              />
              <TextField select label="Kind" value={form.watch("type")} onChange={(event) => form.setValue("type", event.target.value as FormValues["type"])} helperText="For your reference. It does not change how tests run.">
                {APPLICATION_TYPES.map((type) => <MenuItem key={type} value={type}>{TYPE_LABELS[type]}</MenuItem>)}
              </TextField>
              <TextField
                label="Website URL"
                placeholder="https://staging.example.com"
                slotProps={shrink}
                {...form.register("baseUrl")}
                error={Boolean(form.formState.errors.baseUrl)}
                helperText={form.formState.errors.baseUrl?.message ?? "Browser steps like “Open page /login” are joined to this URL."}
              />
              <TextField
                label="API URL"
                placeholder="https://api.example.com"
                slotProps={shrink}
                {...form.register("apiBaseUrl")}
                error={Boolean(form.formState.errors.apiBaseUrl)}
                helperText={form.formState.errors.apiBaseUrl?.message ?? "API steps like “Send request /users/1” are joined to this URL. Optional."}
              />
              <TextField label="Description" placeholder="Customer-facing shop" slotProps={shrink} multiline minRows={2} {...form.register("description")} />
              <Accordion disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Source repository (optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField
                      label="Repository URL"
                      placeholder="https://github.com/acme/storefront"
                      slotProps={shrink}
                      {...form.register("repository.url")}
                      error={Boolean(form.formState.errors.repository?.url)}
                      helperText={form.formState.errors.repository?.url?.message ?? "For reference only."}
                    />
                    <TextField label="Branch" placeholder="main" slotProps={shrink} {...form.register("repository.branch")} />
                    <TextField label="Provider" placeholder="github" slotProps={shrink} {...form.register("repository.provider")} />
                  </Stack>
                </AccordionDetails>
              </Accordion>
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
