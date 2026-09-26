"use client";

import { Application, ENGINE_TYPES, Environment, STEP_ACTIONS, TEST_CASE_STATUSES, TEST_CASE_TYPES, TestCase, PRIORITIES } from "@atp/shared-types";
import { createTestCaseSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Alert, Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { api, errorMessage } from "@/lib/api";

type FormValues = z.output<typeof createTestCaseSchema>;
type FormInput = z.input<typeof createTestCaseSchema>;

function defaults(): FormInput {
  return {
    applicationId: "",
    environmentId: undefined,
    key: "",
    title: "",
    description: "",
    objective: "",
    type: "functional",
    engineType: "web",
    priority: "medium",
    status: "draft",
    tags: [],
    preconditions: [],
    steps: [{ order: 0, action: "navigate", target: "", value: "" }],
  };
}

export function TestCaseForm({ projectId, testCaseId }: { projectId: string; testCaseId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tagsText, setTagsText] = useState("");
  const [preconditionsText, setPreconditionsText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string[] | null>(null);
  const applications = useQuery({ queryKey: ["applications", projectId], queryFn: () => api<Application[]>(`/projects/${projectId}/applications`) });
  const environments = useQuery({ queryKey: ["environments", projectId], queryFn: () => api<Environment[]>(`/projects/${projectId}/environments`) });
  const existing = useQuery({
    queryKey: ["test-case", testCaseId],
    queryFn: () => api<TestCase>(`/test-cases/${testCaseId}`),
    enabled: Boolean(testCaseId),
  });
  const form = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(createTestCaseSchema), defaultValues: defaults() });
  const steps = useFieldArray({ control: form.control, name: "steps" });

  useEffect(() => {
    if (!existing.data) return;
    form.reset({
      applicationId: existing.data.applicationId,
      environmentId: existing.data.environmentId,
      key: existing.data.key,
      title: existing.data.title,
      description: existing.data.description ?? "",
      objective: existing.data.objective ?? "",
      type: existing.data.type,
      engineType: existing.data.engineType,
      priority: existing.data.priority,
      status: existing.data.status,
      tags: existing.data.tags,
      preconditions: existing.data.preconditions,
      steps: (existing.data.steps.length > 0 ? existing.data.steps : defaults().steps) as FormInput["steps"],
      testData: existing.data.testData,
    });
    setTagsText(existing.data.tags.join(", "));
    setPreconditionsText(existing.data.preconditions.join("\n"));
  }, [existing.data, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        environmentId: values.environmentId || undefined,
        tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
        preconditions: preconditionsText.split("\n").map((line) => line.trim()).filter(Boolean),
      };
      const path = testCaseId ? `/test-cases/${testCaseId}` : `/projects/${projectId}/test-cases`;
      return api<TestCase>(path, { method: testCaseId ? "PATCH" : "POST", body: JSON.stringify(payload) });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      router.push(`/projects/${projectId}/test-cases/${saved.id}`);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  async function validateCase() {
    if (!testCaseId) return;
    setValidation(null);
    try {
      const result = await api<{ valid: boolean; issues: string[] }>(`/test-cases/${testCaseId}/validate`, { method: "POST" });
      setValidation(result.valid ? [] : result.issues);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <Stack component="form" spacing={2} onSubmit={form.handleSubmit((values) => save.mutate(values))} sx={{ maxWidth: 860 }}>
      {formError ? <Alert severity="error">{formError}</Alert> : null}
      {validation ? (
        <Alert severity={validation.length === 0 ? "success" : "warning"}>
          {validation.length === 0 ? "This test case is valid." : validation.join(" ")}
        </Alert>
      ) : null}
      <TextField label="Title" {...form.register("title")} error={Boolean(form.formState.errors.title)} helperText={form.formState.errors.title?.message} />
      <TextField label="Key" placeholder="Generated from the title if empty" {...form.register("key")} />
      <TextField select label="Application" value={form.watch("applicationId")} onChange={(event) => form.setValue("applicationId", event.target.value)} error={Boolean(form.formState.errors.applicationId)} helperText={form.formState.errors.applicationId?.message ?? "Create an application first if this list is empty."}>
        {(applications.data ?? []).map((application) => <MenuItem key={application.id} value={application.id}>{application.name}</MenuItem>)}
      </TextField>
      <TextField select label="Environment" value={form.watch("environmentId") ?? ""} onChange={(event) => form.setValue("environmentId", event.target.value || undefined)}>
        <MenuItem value="">None</MenuItem>
        {(environments.data ?? []).map((environment) => <MenuItem key={environment.id} value={environment.id}>{environment.name}</MenuItem>)}
      </TextField>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField select fullWidth label="Type" value={form.watch("type")} onChange={(event) => form.setValue("type", event.target.value as FormValues["type"])}>
          {TEST_CASE_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
        </TextField>
        <TextField select fullWidth label="Engine" value={form.watch("engineType")} onChange={(event) => form.setValue("engineType", event.target.value as FormValues["engineType"])}>
          {ENGINE_TYPES.map((engine) => <MenuItem key={engine} value={engine}>{engine}</MenuItem>)}
        </TextField>
        <TextField select fullWidth label="Priority" value={form.watch("priority")} onChange={(event) => form.setValue("priority", event.target.value as FormValues["priority"])}>
          {PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{priority}</MenuItem>)}
        </TextField>
        <TextField select fullWidth label="Status" value={form.watch("status")} onChange={(event) => form.setValue("status", event.target.value as FormValues["status"])}>
          {TEST_CASE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
        </TextField>
      </Stack>
      <TextField label="Objective" multiline minRows={2} {...form.register("objective")} />
      <TextField label="Description" multiline minRows={2} {...form.register("description")} />
      <TextField label="Tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} helperText="Comma-separated" />
      <TextField label="Preconditions" value={preconditionsText} onChange={(event) => setPreconditionsText(event.target.value)} multiline minRows={3} helperText="One precondition per line" />
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Steps</Typography>
        <Button onClick={() => steps.append({ order: steps.fields.length, action: "click", target: "", value: "" })}>Add step</Button>
      </Stack>
      {steps.fields.map((field, index) => (
        <Stack key={field.id} direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField select label="Action" value={form.watch(`steps.${index}.action`)} onChange={(event) => form.setValue(`steps.${index}.action`, event.target.value as FormValues["steps"][number]["action"])} sx={{ minWidth: 160 }}>
            {STEP_ACTIONS.map((action) => <MenuItem key={action} value={action}>{action}</MenuItem>)}
          </TextField>
          <TextField label="Target" fullWidth {...form.register(`steps.${index}.target`)} />
          <TextField label="Value" fullWidth {...form.register(`steps.${index}.value`)} />
          <IconButton aria-label="Remove step" onClick={() => steps.remove(index)}><DeleteOutlineIcon /></IconButton>
        </Stack>
      ))}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={save.isPending}>{testCaseId ? "Save changes" : "Create test case"}</Button>
        {testCaseId ? <Button type="button" onClick={() => void validateCase()}>Validate</Button> : null}
      </Stack>
    </Stack>
  );
}
