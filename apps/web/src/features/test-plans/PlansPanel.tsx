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
import { RunButton } from "@/features/test-runs/RunButton";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

type FormValues = z.output<typeof createTestPlanSchema>;

const shrink = { inputLabel: { shrink: true } };

const BROWSERS = [
  { value: "chromium", label: "Chrome (Chromium)" },
  { value: "firefox", label: "Firefox" },
  { value: "webkit", label: "Safari (WebKit)" },
];

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 720 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Mobile", width: 390, height: 844 },
];

function storedBrowsers(config?: Record<string, unknown>) {
  if (Array.isArray(config?.browsers)) {
    const names = config.browsers.filter((item): item is string => typeof item === "string");
    if (names.length > 0) return names;
  }
  return typeof config?.browser === "string" ? [config.browser] : ["chromium"];
}

function storedViewports(config?: Record<string, unknown>) {
  if (!Array.isArray(config?.viewports)) return [];
  return config.viewports.flatMap((item) => {
    if (!item || typeof item !== "object" || !("name" in item) || typeof item.name !== "string") return [];
    return [item.name];
  });
}

export function PlansPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TestPlan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TestPlan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [browsers, setBrowsers] = useState<string[]>(["chromium"]);
  const [viewports, setViewports] = useState<string[]>([]);
  const plans = useQuery({ queryKey: ["plans", projectId], queryFn: () => api<TestPlan[]>(`/projects/${projectId}/test-plans`) });
  const suites = useQuery({ queryKey: ["suites", projectId], queryFn: () => api<TestSuite[]>(`/projects/${projectId}/test-suites`) });
  const environments = useQuery({ queryKey: ["environments", projectId], queryFn: () => api<Environment[]>(`/projects/${projectId}/environments`) });
  const form = useForm<z.input<typeof createTestPlanSchema>, unknown, FormValues>({
    resolver: zodResolver(createTestPlanSchema),
    defaultValues: { name: "", suiteIds: [], environmentId: "" },
  });

  function openCreate() {
    setEditing(null);
    setBrowsers(["chromium"]);
    setViewports([]);
    form.reset({ name: "", suiteIds: [], environmentId: "" });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(plan: TestPlan) {
    setEditing(plan);
    setBrowsers(storedBrowsers(plan.browserConfig));
    setViewports(storedViewports(plan.browserConfig));
    form.reset({ name: plan.name, suiteIds: plan.suiteIds, environmentId: plan.environmentId ?? "", browserConfig: plan.browserConfig, variables: plan.variables });
    setFormError(null);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        environmentId: values.environmentId ?? (editing ? "" : undefined),
        browserConfig: {
          browsers,
          viewports: VIEWPORTS.filter((viewport) => viewports.includes(viewport.name)).map(({ name, width, height }) => ({ name, width, height })),
        },
      };
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
  const environmentName = (id?: string) => (id ? environments.data?.find((environment) => environment.id === id)?.name ?? id : "Project URL");
  const caseCount = (suites.data ?? []).filter((suite) => selected.includes(suite.id)).reduce((total, suite) => total + suite.testCaseIds.length, 0);
  const jobCount = caseCount * Math.max(1, browsers.length) * Math.max(1, viewports.length);

  return (
    <>
      <PageHeader
        title="Test plans"
        subtitle="Optional. A plan runs one or more suites across several browsers and screen sizes, for example a full regression before a release."
        action={<Button variant="contained" onClick={openCreate}>Add plan</Button>}
      />
      {plans.error ? <Alert severity="error">{errorMessage(plans.error)}</Alert> : null}
      {plans.data?.length === 0 ? <EmptyState title="No plans" body="Create a suite first, then add a plan when you want to test it in several browsers or screen sizes." /> : null}
      {plans.data && plans.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Where</TableCell>
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
                  <RunButton projectId={projectId} planId={plan.id} />
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
              <TextField
                label="Name"
                placeholder="Release regression"
                slotProps={shrink}
                {...form.register("name")}
                error={Boolean(form.formState.errors.name)}
                helperText={form.formState.errors.name?.message}
              />
              <TextField
                select
                label="Where to run"
                value={form.watch("environmentId") ?? ""}
                onChange={(event) => form.setValue("environmentId", event.target.value)}
                error={Boolean(form.formState.errors.environmentId)}
                helperText={form.formState.errors.environmentId?.message ?? "Default uses the project URL. Pick an environment to use its URL and variables."}
                slotProps={{ select: { displayEmpty: true }, ...shrink }}
              >
                <MenuItem value="">Default (project URL)</MenuItem>
                {(environments.data ?? []).map((environment) => <MenuItem key={environment.id} value={environment.id}>{environment.name}</MenuItem>)}
              </TextField>
              <div>
                <Typography variant="subtitle2">Browsers</Typography>
                <Typography variant="caption" color="text.secondary">Browser tests run once in each ticked browser. Pick at least one.</Typography>
              </div>
              {BROWSERS.map((browser) => (
                <FormControlLabel
                  key={browser.value}
                  control={<Checkbox checked={browsers.includes(browser.value)} onChange={(_, checked) => setBrowsers(checked ? [...browsers, browser.value] : browsers.filter((item) => item !== browser.value))} />}
                  label={browser.label}
                />
              ))}
              <div>
                <Typography variant="subtitle2">Screen sizes</Typography>
                <Typography variant="caption" color="text.secondary">Optional. Leave all unticked to use the default desktop size.</Typography>
              </div>
              {VIEWPORTS.map((viewport) => (
                <FormControlLabel
                  key={viewport.name}
                  control={<Checkbox checked={viewports.includes(viewport.name)} onChange={(_, checked) => setViewports(checked ? [...viewports, viewport.name] : viewports.filter((item) => item !== viewport.name))} />}
                  label={`${viewport.name} ${viewport.width}×${viewport.height}`}
                />
              ))}
              <Typography variant="subtitle2">Suites to run</Typography>
              {form.formState.errors.suiteIds ? <Typography variant="caption" color="error">{form.formState.errors.suiteIds.message}</Typography> : null}
              {(suites.data ?? []).length === 0 ? <Typography color="text.secondary">Create a suite on the Suites tab first.</Typography> : null}
              {(suites.data ?? []).map((suite) => (
                <FormControlLabel
                  key={suite.id}
                  control={
                    <Checkbox
                      checked={selected.includes(suite.id)}
                      onChange={(_, checked) => form.setValue("suiteIds", checked ? [...selected, suite.id] : selected.filter((id) => id !== suite.id))}
                    />
                  }
                  label={`${suite.name} (${suite.testCaseIds.length} case${suite.testCaseIds.length === 1 ? "" : "s"})`}
                />
              ))}
              {caseCount > 0 ? (
                <Alert severity="info">
                  Each run queues {jobCount} job{jobCount === 1 ? "" : "s"}: {caseCount} case{caseCount === 1 ? "" : "s"} × {Math.max(1, browsers.length)} browser{browsers.length > 1 ? "s" : ""} × {Math.max(1, viewports.length)} screen size{viewports.length > 1 ? "s" : ""}.
                </Alert>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending || browsers.length === 0}>Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete plan" body="This removes the plan only. Suites and cases stay." pending={remove.isPending} onClose={() => setPendingDelete(null)} onConfirm={() => pendingDelete && remove.mutate(pendingDelete)} />
    </>
  );
}
