"use client";

import { Application, ENGINE_TYPES, EngineType, Environment, PRIORITIES, STEP_ACTIONS, StepAction, TEST_CASE_STATUSES, TEST_CASE_TYPES, TestCase } from "@atp/shared-types";
import { createTestCaseSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, IconButton, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { api, errorMessage } from "@/lib/api";
import { ACTION_GUIDE, ActionGuide, ENGINE_GUIDE, StepTemplate } from "./engine-guide";

const formSchema = createTestCaseSchema.omit({ steps: true, tags: true, preconditions: true, testData: true }).extend({
  applicationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Choose an application"),
  steps: z
    .array(
      z.object({
        stepId: z.string().optional(),
        timeoutMs: z.number().optional(),
        action: z.enum(STEP_ACTIONS),
        target: z.string(),
        value: z.string(),
        assertion: z.string(),
      }),
    )
    .min(1, "Add at least one step"),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;
type StepRow = FormInput["steps"][number];

const shrink = { inputLabel: { shrink: true } };

function rowFrom(template: StepTemplate): StepRow {
  return { action: template.action, target: template.target ?? "", value: template.value ?? "", assertion: template.assertion ?? "" };
}

function starterSteps(engine: EngineType) {
  return ENGINE_GUIDE[engine].starter.map(rowFrom);
}

function asText(value: unknown) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

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
    steps: starterSteps("web"),
  };
}

function parseJson(text: string, where: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${where} is not valid JSON. Check quotes and commas.`);
  }
}

function toSteps(rows: FormValues["steps"]) {
  return rows.map((row, index) => {
    const hint: ActionGuide = ACTION_GUIDE[row.action] ?? { label: row.action };
    const valueText = row.value.trim();
    const assertionText = row.assertion.trim();
    const where = `Step ${index + 1}`;
    const assertion = assertionText ? parseJson(assertionText, `${where} checks`) : undefined;
    if (assertion !== undefined && (typeof assertion !== "object" || assertion === null || Array.isArray(assertion))) {
      throw new Error(`${where} checks must be a JSON object like { "status": 200 }.`);
    }
    return {
      id: row.stepId,
      timeoutMs: row.timeoutMs,
      order: index,
      action: row.action,
      target: row.target.trim() || undefined,
      value: !valueText ? undefined : hint.value?.json ? parseJson(valueText, `${where} ${hint.value.label}`) : valueText,
      assertion: assertion as Record<string, unknown> | undefined,
    };
  });
}

export interface TestCasePrefill {
  title: string;
  objective?: string;
  description?: string;
  tags?: string[];
}

export function TestCaseForm({ projectId, testCaseId, prefill }: { projectId: string; testCaseId?: string; prefill?: TestCasePrefill }) {
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
  const form = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults() });
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
      steps:
        existing.data.steps.length > 0
          ? existing.data.steps.map((step) => ({
              stepId: step.id,
              timeoutMs: step.timeoutMs,
              action: step.action as StepAction,
              target: step.target ?? "",
              value: asText(step.value),
              assertion: asText(step.assertion),
            }))
          : starterSteps(existing.data.engineType),
    });
    setTagsText(existing.data.tags.join(", "));
    setPreconditionsText(existing.data.preconditions.join("\n"));
  }, [existing.data, form]);

  useEffect(() => {
    if (!prefill || testCaseId) return;
    form.reset({ ...defaults(), title: prefill.title, objective: prefill.objective ?? "", description: prefill.description ?? "" });
    setTagsText((prefill.tags ?? []).join(", "));
  }, [prefill, testCaseId, form]);

  const applicationId = form.watch("applicationId");
  useEffect(() => {
    const list = applications.data ?? [];
    if (!applicationId && list.length === 1) form.setValue("applicationId", list[0].id);
  }, [applications.data, applicationId, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        environmentId: values.environmentId || undefined,
        steps: toSteps(values.steps),
        tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
        preconditions: preconditionsText.split("\n").map((line) => line.trim()).filter(Boolean),
      };
      const path = testCaseId ? `/test-cases/${testCaseId}` : `/projects/${projectId}/test-cases`;
      return api<TestCase>(path, { method: testCaseId ? "PATCH" : "POST", body: JSON.stringify(payload) });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["test-cases", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["test-case", saved.id] });
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

  function changeEngine(engine: EngineType) {
    const guide = ENGINE_GUIDE[engine];
    form.setValue("engineType", engine);
    form.setValue("type", guide.type);
    const current = form.getValues("steps");
    const fits = current.length > 0 && current.every((step) => guide.actions.includes(step.action)) && (!guide.singleStep || current.length === 1);
    if (!fits) steps.replace(starterSteps(engine));
  }

  const engineType = form.watch("engineType");
  const engine = ENGINE_GUIDE[engineType];
  const appList = applications.data ?? [];
  const selectedApp = appList.find((application) => application.id === applicationId);
  const errors = form.formState.errors;

  return (
    <Stack
      component="form"
      spacing={3}
      onSubmit={form.handleSubmit((values) => {
        setFormError(null);
        save.mutate(values);
      })}
      sx={{ maxWidth: 900 }}
    >
      {formError ? <Alert severity="error">{formError}</Alert> : null}
      {validation ? (
        <Alert severity={validation.length === 0 ? "success" : "warning"}>
          {validation.length === 0 ? "This test case is valid." : validation.join(" ")}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        <TextField
          label="What should this test prove?"
          placeholder="User can sign in with a valid email and password"
          slotProps={shrink}
          {...form.register("title")}
          error={Boolean(errors.title)}
          helperText={errors.title?.message ?? "A short sentence. It becomes the test name."}
        />
        <TextField
          select
          label="Test type"
          value={engineType}
          onChange={(event) => changeEngine(event.target.value as EngineType)}
          helperText={engine.summary}
          slotProps={{ select: { renderValue: (value) => ENGINE_GUIDE[value as EngineType].label } }}
        >
          {ENGINE_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              <ListItemText primary={ENGINE_GUIDE[type].label} secondary={ENGINE_GUIDE[type].summary} />
            </MenuItem>
          ))}
        </TextField>
        {engine.note ? <Alert severity="info">{engine.note}</Alert> : null}

        {applications.isSuccess && appList.length === 0 ? (
          <Alert severity="warning" action={<Button component={Link} href={`/projects/${projectId}/settings`} size="small">Open settings</Button>}>
            Add the website or API URL for this project first.
          </Alert>
        ) : null}
        {appList.length > 1 ? (
          <TextField
            select
            label="Application"
            value={applicationId}
            onChange={(event) => form.setValue("applicationId", event.target.value)}
            error={Boolean(errors.applicationId)}
            helperText={errors.applicationId?.message ?? "Which site or service this test runs against."}
          >
            {appList.map((application) => (
              <MenuItem key={application.id} value={application.id}>
                <ListItemText primary={application.name} secondary={application.baseUrl || application.apiBaseUrl} />
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {appList.length === 1 && selectedApp ? (
          <Typography variant="body2" color="text.secondary">
            Runs against <strong>{selectedApp.baseUrl || selectedApp.apiBaseUrl || selectedApp.name}</strong>. Change it in project settings.
          </Typography>
        ) : null}
      </Stack>

      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6">{engine.singleStep ? "Settings" : "Steps"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {engine.singleStep ? "Fill in the fields below. The examples show the expected format." : "Steps run top to bottom. The examples in each field show the expected format."}
            </Typography>
          </Box>
          {engine.singleStep ? null : (
            <Button onClick={() => steps.append({ action: engine.actions[Math.min(1, engine.actions.length - 1)], target: "", value: "", assertion: "" })}>Add step</Button>
          )}
        </Stack>
        {errors.steps?.root?.message || errors.steps?.message ? <Alert severity="error">{errors.steps?.root?.message ?? errors.steps?.message}</Alert> : null}
        {steps.fields.map((field, index) => {
          const action = form.watch(`steps.${index}.action`) as StepAction;
          const hint: ActionGuide = ACTION_GUIDE[action] ?? { label: action };
          return (
            <Paper key={field.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  {engine.singleStep ? (
                    <Typography variant="subtitle2">{hint.label}</Typography>
                  ) : (
                    <>
                      <Typography variant="subtitle2" sx={{ minWidth: 24 }}>{index + 1}.</Typography>
                      <TextField
                        select
                        size="small"
                        label="Action"
                        value={action}
                        onChange={(event) => form.setValue(`steps.${index}.action`, event.target.value as StepAction)}
                        sx={{ minWidth: 200 }}
                      >
                        {(engine.actions.includes(action) ? engine.actions : [action, ...engine.actions]).map((item) => (
                          <MenuItem key={item} value={item}>{ACTION_GUIDE[item]?.label ?? item}</MenuItem>
                        ))}
                      </TextField>
                      <Box sx={{ flex: 1 }} />
                      <IconButton aria-label="Remove step" onClick={() => steps.remove(index)} disabled={steps.fields.length === 1}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </>
                  )}
                </Stack>
                {hint.target ? (
                  <TextField size="small" label={hint.target.label} placeholder={hint.target.placeholder} helperText={hint.target.help} slotProps={shrink} fullWidth {...form.register(`steps.${index}.target`)} />
                ) : null}
                {hint.value ? (
                  <TextField
                    size="small"
                    label={hint.value.label}
                    placeholder={hint.value.placeholder}
                    helperText={hint.value.help}
                    slotProps={{ ...shrink, htmlInput: hint.value.json ? { style: { fontFamily: "monospace" } } : undefined }}
                    multiline={hint.value.json}
                    minRows={hint.value.json ? 2 : undefined}
                    fullWidth
                    {...form.register(`steps.${index}.value`)}
                  />
                ) : null}
                {engine.assertion ? (
                  <TextField
                    size="small"
                    label={engine.assertion.label}
                    placeholder={engine.assertion.placeholder}
                    helperText={engine.assertion.help}
                    slotProps={{ ...shrink, htmlInput: { style: { fontFamily: "monospace" } } }}
                    multiline
                    minRows={2}
                    fullWidth
                    {...form.register(`steps.${index}.assertion`)}
                  />
                ) : null}
                {!hint.target && !hint.value && !engine.assertion ? (
                  <Typography variant="body2" color="text.secondary">No extra input needed.</Typography>
                ) : null}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box>
            <Typography>More details</Typography>
            <Typography variant="body2" color="text.secondary">Optional: key, environment, priority, status, notes, and tags.</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField label="Key" placeholder="LOGIN-001" slotProps={shrink} helperText="Short unique id. Generated from the title if empty." {...form.register("key")} />
            <TextField
              select
              label="Environment"
              value={form.watch("environmentId") ?? ""}
              onChange={(event) => form.setValue("environmentId", event.target.value || undefined)}
              helperText="Leave on the default to use the project URL. Pick one to use its URL and variables."
              slotProps={{ select: { displayEmpty: true }, ...shrink }}
            >
              <MenuItem value="">Default (project URL)</MenuItem>
              {(environments.data ?? []).map((environment) => <MenuItem key={environment.id} value={environment.id}>{environment.name}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select fullWidth label="Category" value={form.watch("type")} onChange={(event) => form.setValue("type", event.target.value as FormValues["type"])} helperText="Used for filtering and reports.">
                {TEST_CASE_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
              <TextField select fullWidth label="Priority" value={form.watch("priority")} onChange={(event) => form.setValue("priority", event.target.value as FormValues["priority"])} helperText="How important a failure is.">
                {PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{priority}</MenuItem>)}
              </TextField>
              <TextField select fullWidth label="Status" value={form.watch("status")} onChange={(event) => form.setValue("status", event.target.value as FormValues["status"])} helperText="Draft tests can still run.">
                {TEST_CASE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField label="Objective" placeholder="Make sure registered users can reach the dashboard." slotProps={shrink} multiline minRows={2} {...form.register("objective")} />
            <TextField label="Description" placeholder="Anything a teammate should know before running or fixing this test." slotProps={shrink} multiline minRows={2} {...form.register("description")} />
            <TextField label="Tags" placeholder="login, smoke" slotProps={shrink} value={tagsText} onChange={(event) => setTagsText(event.target.value)} helperText="Comma-separated." />
            <TextField
              label="Preconditions"
              placeholder={"User account exists\nSite is reachable"}
              slotProps={shrink}
              value={preconditionsText}
              onChange={(event) => setPreconditionsText(event.target.value)}
              multiline
              minRows={2}
              helperText="One per line. For documentation only."
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={save.isPending}>{testCaseId ? "Save changes" : "Create test case"}</Button>
        {testCaseId ? <Button type="button" onClick={() => void validateCase()}>Validate</Button> : null}
      </Stack>
    </Stack>
  );
}
