"use client";

import { ENVIRONMENT_TYPES, Environment, SECRET_MASK } from "@atp/shared-types";
import { createEnvironmentSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

type FormValues = z.output<typeof createEnvironmentSchema>;

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

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues());
    setFormError(null);
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
      <PageHeader title="Environments" subtitle="URLs, variables, and secrets for a target environment." action={<Button variant="contained" onClick={openCreate}>Add environment</Button>} />
      {records.error ? <Alert severity="error">{errorMessage(records.error)}</Alert> : null}
      {records.data?.length === 0 ? <EmptyState title="No environments" body="Add local, dev, QA, or a custom target before planning a run." /> : null}
      {records.data && records.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Variables</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.data.map((environment) => (
              <TableRow key={environment.id}>
                <TableCell>{environment.name}</TableCell>
                <TableCell>{environment.type}</TableCell>
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
              <TextField label="Name" {...form.register("name")} error={Boolean(form.formState.errors.name)} helperText={form.formState.errors.name?.message} />
              <TextField select label="Type" value={form.watch("type")} onChange={(event) => form.setValue("type", event.target.value as FormValues["type"])}>
                {ENVIRONMENT_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
              <TextField label="Base URL" {...form.register("baseUrl")} />
              <TextField label="API base URL" {...form.register("apiBaseUrl")} />
              <TextField label="Browser" {...form.register("settings.browser")} />
              <TextField label="Timeout (ms)" type="number" {...form.register("settings.timeoutMs", { valueAsNumber: true })} />
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1">Variables</Typography>
                <Button onClick={() => variables.append({ key: "", value: "", isSecret: false })}>Add variable</Button>
              </Stack>
              {variables.fields.map((field, index) => (
                <Stack key={field.id} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                  <TextField label="Key" {...form.register(`variables.${index}.key`)} />
                  <TextField
                    label="Value"
                    type={form.watch(`variables.${index}.isSecret`) ? "password" : "text"}
                    placeholder={form.watch(`variables.${index}.value`) === SECRET_MASK ? "Stored secret" : ""}
                    {...form.register(`variables.${index}.value`)}
                    fullWidth
                  />
                  <FormControlLabel control={<Checkbox checked={form.watch(`variables.${index}.isSecret`)} onChange={(_, checked) => form.setValue(`variables.${index}.isSecret`, checked)} />} label="Secret" />
                  <IconButton aria-label="Remove variable" onClick={() => variables.remove(index)}><DeleteOutlineIcon /></IconButton>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                Secret values are masked after save. Leave the mask in place to keep the stored value.
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
