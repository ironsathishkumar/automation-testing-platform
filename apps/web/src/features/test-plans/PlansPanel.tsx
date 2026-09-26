"use client";

import { Environment, TestPlan, TestSuite } from "@atp/shared-types";
import { createTestPlanSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

type FormValues = z.output<typeof createTestPlanSchema>;

export function PlansPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TestPlan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TestPlan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [browser, setBrowser] = useState("chromium");
  const plans = useQuery({ queryKey: ["plans", projectId], queryFn: () => api<TestPlan[]>(`/projects/${projectId}/test-plans`) });
  const suites = useQuery({ queryKey: ["suites", projectId], queryFn: () => api<TestSuite[]>(`/projects/${projectId}/test-suites`) });
  const environments = useQuery({ queryKey: ["environments", projectId], queryFn: () => api<Environment[]>(`/projects/${projectId}/environments`) });
  const form = useForm<z.input<typeof createTestPlanSchema>, unknown, FormValues>({
    resolver: zodResolver(createTestPlanSchema),
    defaultValues: { name: "", suiteIds: [], environmentId: "" },
  });

  function openCreate() {
    setEditing(null);
    setBrowser("chromium");
    form.reset({ name: "", suiteIds: [], environmentId: "" });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(plan: TestPlan) {
    setEditing(plan);
    const storedBrowser = plan.browserConfig && typeof plan.browserConfig.browser === "string" ? plan.browserConfig.browser : "chromium";
    setBrowser(storedBrowser);
    form.reset({ name: plan.name, suiteIds: plan.suiteIds, environmentId: plan.environmentId, browserConfig: plan.browserConfig, variables: plan.variables });
    setFormError(null);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = { ...values, browserConfig: { browser } };
      const path = editing ? `/test-plans/${editing.id}` : `/projects/${projectId}/test-plans`;
      return api(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["plans", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (plan: TestPlan) => api(`/test-plans/${plan.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["plans", projectId] });
    },
  });

  const selected = form.watch("suiteIds");
  const environmentName = (id: string) => environments.data?.find((environment) => environment.id === id)?.name ?? id;

  return (
    <>
      <PageHeader title="Test plans" subtitle="Choose suites, an environment, and a browser for a future run." action={<Button variant="contained" onClick={openCreate}>Add plan</Button>} />
      {plans.error ? <Alert severity="error">{errorMessage(plans.error)}</Alert> : null}
      {plans.data?.length === 0 ? <EmptyState title="No plans" body="A plan ties suites to one environment." /> : null}
      {plans.data && plans.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Suites</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.data.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>{environmentName(plan.environmentId)}</TableCell>
                <TableCell>{plan.suiteIds.length}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(plan)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(plan)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit plan" : "Add plan"}</DialogTitle>
        <Stack component="form" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <DialogContent>
            <Stack spacing={2}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <TextField label="Name" {...form.register("name")} error={Boolean(form.formState.errors.name)} helperText={form.formState.errors.name?.message} />
              <TextField select label="Environment" value={form.watch("environmentId")} onChange={(event) => form.setValue("environmentId", event.target.value)} error={Boolean(form.formState.errors.environmentId)} helperText={form.formState.errors.environmentId?.message}>
                {(environments.data ?? []).map((environment) => <MenuItem key={environment.id} value={environment.id}>{environment.name}</MenuItem>)}
              </TextField>
              <TextField select label="Browser" value={browser} onChange={(event) => setBrowser(event.target.value)}>
                {["chromium", "firefox", "webkit"].map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
              </TextField>
              <Typography variant="subtitle2">Suites</Typography>
              {(suites.data ?? []).map((suite) => (
                <FormControlLabel
                  key={suite.id}
                  control={
                    <Checkbox
                      checked={selected.includes(suite.id)}
                      onChange={(_, checked) => form.setValue("suiteIds", checked ? [...selected, suite.id] : selected.filter((id) => id !== suite.id))}
                    />
                  }
                  label={suite.name}
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending}>Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete plan" body="This removes the plan only. Suites and cases stay." pending={remove.isPending} onClose={() => setPendingDelete(null)} onConfirm={() => pendingDelete && remove.mutate(pendingDelete)} />
    </>
  );
}
