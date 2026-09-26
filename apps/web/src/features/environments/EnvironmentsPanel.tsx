"use client";

import { ENVIRONMENT_TYPES, Environment, SECRET_MASK } from "@atp/shared-types";
import { createEnvironmentSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";
import { parseEnvFile } from "@/lib/env-file";

type FormValues = z.output<typeof createEnvironmentSchema>;

const MAX_VARIABLES = 50;

const shrink = { inputLabel: { shrink: true } };

const BROWSERS = [
  { value: "chromium", label: "Chrome (Chromium)" },
  { value: "firefox", label: "Firefox" },
  { value: "webkit", label: "Safari (WebKit)" },
];

const emptyValues = (): z.input<typeof createEnvironmentSchema> => ({
  name: "",
  type: "local",
  baseUrl: "",
  apiBaseUrl: "",
  variables: [],
  settings: { browser: "chromium", timeoutMs: 30000 },
});

export function EnvironmentsPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Environment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const records = useQuery({
    queryKey: ["environments", projectId],
    queryFn: () => api<Environment[]>(`/projects/${projectId}/environments`),
  });
  const form = useForm<z.input<typeof createEnvironmentSchema>, unknown, FormValues>({ resolver: zodResolver(createEnvironmentSchema), defaultValues: emptyValues() });
  const variables = useFieldArray({ control: form.control, name: "variables" });
  const [importNote, setImportNote] = useState<{ severity: "success" | "warning" | "error"; text: string } | null>(null);

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 256 * 1024) {
      setImportNote({ severity: "error", text: "That file is too large. Environment files must be under 256 KB." });
      return;
    }
    const { variables: parsed, skipped } = parseEnvFile(await file.text());
    if (parsed.length === 0) {
      setImportNote({ severity: "error", text: `No KEY=VALUE lines found in ${file.name}.` });
      return;
    }
    const merged = [...(form.getValues("variables") ?? [])];
    let added = 0;
    let updated = 0;
    for (const item of parsed) {
      const existing = merged.findIndex((variable) => variable.key === item.key);
      if (existing >= 0) {
        merged[existing] = { ...merged[existing], value: item.value, isSecret: Boolean(merged[existing].isSecret) || item.isSecret };
        updated += 1;
      } else if (merged.length < MAX_VARIABLES) {
        merged.push(item);
        added += 1;
      }
    }
    variables.replace(merged);
    const dropped = parsed.length - added - updated;
    const parts = [`Imported from ${file.name}: ${added} added, ${updated} updated.`];
    if (skipped.length > 0) parts.push(`Skipped line${skipped.length === 1 ? "" : "s"} ${skipped.slice(0, 10).join(", ")}${skipped.length > 10 ? "…" : ""} (not KEY=VALUE).`);
    if (dropped > 0) parts.push(`${dropped} not added: an environment holds at most ${MAX_VARIABLES} variables.`);
    parts.push("Review the Secret ticks, then Save.");
    setImportNote({ severity: skipped.length > 0 || dropped > 0 ? "warning" : "success", text: parts.join(" ") });
  }

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues());
    setFormError(null);
    setImportNote(null);
    setOpen(true);
  }

  function openEdit(environment: Environment) {
    setEditing(environment);
    form.reset({
      name: environment.name,
      type: environment.type,
      baseUrl: environment.baseUrl ?? "",
      apiBaseUrl: environment.apiBaseUrl ?? "",
      variables: environment.variables,
      settings: {
        browser: typeof environment.settings.browser === "string" ? environment.settings.browser : "chromium",
        timeoutMs: typeof environment.settings.timeoutMs === "number" ? environment.settings.timeoutMs : 30000,
      },
    });
    setFormError(null);
    setImportNote(null);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const path = editing ? `/environments/${editing.id}` : `/projects/${projectId}/environments`;
      return api(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify(values) });
    },
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["environments", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (environment: Environment) => api(`/environments/${environment.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["environments", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  return (
    <>
      <PageHeader
        title="Environments (optional)"
        subtitle="Only needed if you test the same site on several servers (dev, QA, staging) or need variables and secrets such as passwords or API tokens."
        action={<Button variant="outlined" onClick={openCreate}>Add environment</Button>}
      />
      {records.error ? <Alert severity="error">{errorMessage(records.error)}</Alert> : null}
      {records.data?.length === 0 ? (
        <EmptyState title="No environments" body="Tests use the website URL above by default. Add an environment to override the URL or store values like {{USER_PASSWORD}}." />
      ) : null}
      {records.data && records.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Variables</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.data.map((environment) => (
              <TableRow key={environment.id}>
                <TableCell>{environment.name}</TableCell>
                <TableCell>{environment.type}</TableCell>
                <TableCell>{environment.baseUrl || environment.apiBaseUrl || "Project URL"}</TableCell>
                <TableCell>{environment.variables.length}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(environment)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(environment)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit environment" : "Add environment"}</DialogTitle>
        <Stack component="form" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <DialogContent>
            <Stack spacing={2}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Name"
                  placeholder="QA server"
                  slotProps={shrink}
                  fullWidth
                  {...form.register("name")}
                  error={Boolean(form.formState.errors.name)}
                  helperText={form.formState.errors.name?.message ?? "Shown when choosing where to run."}
                />
                <TextField select label="Stage" value={form.watch("type")} onChange={(event) => form.setValue("type", event.target.value as FormValues["type"])} sx={{ minWidth: 160 }} helperText="For your reference.">
                  {ENVIRONMENT_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </TextField>
              </Stack>
              <TextField
                label="Website URL"
                placeholder="https://qa.example.com"
                slotProps={shrink}
                {...form.register("baseUrl")}
                error={Boolean(form.formState.errors.baseUrl)}
                helperText={form.formState.errors.baseUrl?.message ?? "Leave empty to use the project's website URL."}
              />
              <TextField
                label="API URL"
                placeholder="https://qa-api.example.com"
                slotProps={shrink}
                {...form.register("apiBaseUrl")}
                error={Boolean(form.formState.errors.apiBaseUrl)}
                helperText={form.formState.errors.apiBaseUrl?.message ?? "Leave empty to use the project's API URL."}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField select fullWidth label="Default browser" value={form.watch("settings.browser") ?? "chromium"} onChange={(event) => form.setValue("settings.browser", event.target.value)} helperText="Used when a plan does not pick browsers.">
                  {BROWSERS.map((browser) => <MenuItem key={browser.value} value={browser.value}>{browser.label}</MenuItem>)}
                </TextField>
                <TextField
                  fullWidth
                  label="Step timeout (ms)"
                  type="number"
                  placeholder="30000"
                  slotProps={shrink}
                  {...form.register("settings.timeoutMs", { valueAsNumber: true })}
                  helperText="How long a step may wait. 30000 = 30 seconds."
                />
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Typography variant="subtitle1">Variables</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Write {"{{NAME}}"} in any step to insert the value, for example {"{{USER_PASSWORD}}"} in a “Type text” step.
                  </Typography>
                </div>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button component="label" startIcon={<UploadFileIcon />}>
                    Upload .env / .txt
                    <input
                      hidden
                      type="file"
                      accept=".env,.txt,.properties,text/plain"
                      onChange={(event) => {
                        void importFile(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </Button>
                  <Button onClick={() => variables.append({ key: "", value: "", isSecret: false })}>Add variable</Button>
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                File format: one KEY=VALUE per line, for example USER_EMAIL=asha@example.com. Lines starting with # are ignored. Keys that look like passwords or tokens are ticked as Secret automatically.
              </Typography>
              {importNote ? <Alert severity={importNote.severity} onClose={() => setImportNote(null)}>{importNote.text}</Alert> : null}
              {variables.fields.map((field, index) => (
                <Stack key={field.id} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                  <TextField
                    label="Name"
                    placeholder="USER_PASSWORD"
                    slotProps={shrink}
                    {...form.register(`variables.${index}.key`)}
                    error={Boolean(form.formState.errors.variables?.[index]?.key)}
                    helperText={form.formState.errors.variables?.[index]?.key?.message}
                  />
                  <TextField
                    label="Value"
                    type={form.watch(`variables.${index}.isSecret`) ? "password" : "text"}
                    placeholder={form.watch(`variables.${index}.value`) === SECRET_MASK ? "Stored secret" : "s3cret-Pass!"}
                    slotProps={shrink}
                    {...form.register(`variables.${index}.value`)}
                    fullWidth
                  />
                  <FormControlLabel control={<Checkbox checked={form.watch(`variables.${index}.isSecret`)} onChange={(_, checked) => form.setValue(`variables.${index}.isSecret`, checked)} />} label="Secret" />
                  <IconButton aria-label="Remove variable" onClick={() => variables.remove(index)}><DeleteOutlineIcon /></IconButton>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                Tick Secret for passwords and tokens: they are hidden after saving. Leave the dots in place to keep the stored value. Database tests need a variable named DATABASE_URL.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending}>Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete environment" body="Plans that use this environment will need a new environment." pending={remove.isPending} onClose={() => setPendingDelete(null)} onConfirm={() => pendingDelete && remove.mutate(pendingDelete)} />
    </>
  );
}
