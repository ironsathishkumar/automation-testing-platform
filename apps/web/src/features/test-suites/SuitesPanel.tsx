"use client";

import { EXECUTION_MODES, TestCase, TestSuite } from "@atp/shared-types";
import { createTestSuiteSchema } from "@atp/validation";
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

type FormValues = z.output<typeof createTestSuiteSchema>;

const shrink = { inputLabel: { shrink: true } };

export function SuitesPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TestSuite | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TestSuite | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const suites = useQuery({ queryKey: ["suites", projectId], queryFn: () => api<TestSuite[]>(`/projects/${projectId}/test-suites`) });
  const cases = useQuery({ queryKey: ["test-cases", projectId], queryFn: () => api<TestCase[]>(`/projects/${projectId}/test-cases`) });
  const form = useForm<z.input<typeof createTestSuiteSchema>, unknown, FormValues>({
    resolver: zodResolver(createTestSuiteSchema),
    defaultValues: { name: "", description: "", testCaseIds: [], executionMode: "sequential", retryCount: 0, tags: [] },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    form.reset({ name: "", description: "", testCaseIds: [], executionMode: "sequential", retryCount: 0, tags: [] });
    setOpen(true);
  }

  function openEdit(suite: TestSuite) {
    setEditing(suite);
    form.reset({
      name: suite.name,
      description: suite.description ?? "",
      testCaseIds: suite.testCaseIds,
      executionMode: suite.executionMode,
      retryCount: suite.retryCount,
      tags: suite.tags,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const path = editing ? `/test-suites/${editing.id}` : `/projects/${projectId}/test-suites`;
      return api(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify(values) });
    },
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["suites", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (suite: TestSuite) => api(`/test-suites/${suite.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["suites", projectId] });
    },
  });

  const selected = form.watch("testCaseIds") ?? [];

  return (
    <>
      <PageHeader
        title="Test suites"
        subtitle="Optional. A suite is a named group of test cases you run together with one click, for example “Smoke tests” or “Checkout flow”."
        action={<Button variant="contained" onClick={openCreate}>Add suite</Button>}
      />
      {suites.error ? <Alert severity="error">{errorMessage(suites.error)}</Alert> : null}
      {suites.data?.length === 0 ? <EmptyState title="No suites" body="You can run test cases one by one without a suite. Create one when you want to run several cases together." /> : null}
      {suites.data && suites.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Run order</TableCell>
              <TableCell>Cases</TableCell>
              <TableCell>Retries</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suites.data.map((suite) => (
              <TableRow key={suite.id}>
                <TableCell>{suite.name}</TableCell>
                <TableCell>{suite.executionMode === "parallel" ? "Parallel" : "One by one"}</TableCell>
                <TableCell>{suite.testCaseIds.length}</TableCell>
                <TableCell>{suite.retryCount}</TableCell>
                <TableCell align="right">
                  <RunButton projectId={projectId} suiteId={suite.id} />
                  <Button size="small" onClick={() => openEdit(suite)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(suite)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit suite" : "Add suite"}</DialogTitle>
        <Stack component="form" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          <DialogContent>
            <Stack spacing={2}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <TextField
                label="Name"
                placeholder="Smoke tests"
                slotProps={shrink}
                {...form.register("name")}
                error={Boolean(form.formState.errors.name)}
                helperText={form.formState.errors.name?.message}
              />
              <TextField label="Description (optional)" placeholder="Quick checks to run after every deploy." slotProps={shrink} multiline minRows={2} {...form.register("description")} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Run order"
                  value={form.watch("executionMode")}
                  onChange={(event) => form.setValue("executionMode", event.target.value as FormValues["executionMode"])}
                  helperText={form.watch("executionMode") === "parallel" ? "Up to two cases at a time. Faster, but cases must not depend on each other." : "One after another, in the order ticked below."}
                >
                  {EXECUTION_MODES.map((mode) => <MenuItem key={mode} value={mode}>{mode === "parallel" ? "Parallel" : "One by one"}</MenuItem>)}
                </TextField>
                <TextField
                  fullWidth
                  label="Retries on failure"
                  type="number"
                  placeholder="0"
                  slotProps={{ ...shrink, htmlInput: { min: 0, max: 5 } }}
                  {...form.register("retryCount", { valueAsNumber: true })}
                  error={Boolean(form.formState.errors.retryCount)}
                  helperText={form.formState.errors.retryCount?.message ?? "0–5. Re-runs a failed case before marking it failed."}
                />
              </Stack>
              <Typography variant="subtitle2">Test cases to include</Typography>
              {(cases.data ?? []).map((testCase) => (
                <FormControlLabel
                  key={testCase.id}
                  control={
                    <Checkbox
                      checked={selected.includes(testCase.id)}
                      onChange={(_, checked) => {
                        const next = checked ? [...selected, testCase.id] : selected.filter((id) => id !== testCase.id);
                        form.setValue("testCaseIds", next);
                      }}
                    />
                  }
                  label={`${testCase.key} · ${testCase.title}`}
                />
              ))}
              {(cases.data ?? []).length === 0 ? <Typography color="text.secondary">Create a test case before building a suite.</Typography> : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={save.isPending}>Save</Button>
          </DialogActions>
        </Stack>
      </Dialog>
      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete suite" body="Plans that include this suite will need to be updated." pending={remove.isPending} onClose={() => setPendingDelete(null)} onConfirm={() => pendingDelete && remove.mutate(pendingDelete)} />
    </>
  );
}
