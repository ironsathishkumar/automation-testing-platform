"use client";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Alert, Box, Button, Chip, Link as MuiLink, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

export interface AiSettingsView {
  configured: boolean;
  source: "settings" | "env" | null;
  baseUrl: string | null;
  model: string | null;
  keyHint: string | null;
  message: string | null;
}

interface Preset {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  needsKey: boolean;
  keyUrl?: string;
  note: string;
}

const PRESETS: Preset[] = [
  {
    id: "gemini",
    label: "Google Gemini (free)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    needsKey: true,
    keyUrl: "https://aistudio.google.com/apikey",
    note: "Free tier. Sign in with a Google account and create an API key.",
  },
  {
    id: "groq",
    label: "Groq (free)",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    needsKey: true,
    keyUrl: "https://console.groq.com/keys",
    note: "Free tier with rate limits. Create an API key in the Groq console.",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
    keyUrl: "https://platform.openai.com/api-keys",
    note: "Paid, billed per use. Create a key under API keys.",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    needsKey: false,
    note: "Runs on this machine, no key or internet needed. Install from ollama.com, then run: ollama pull llama3.2",
  },
];

function presetFor(baseUrl: string | null) {
  return PRESETS.find((preset) => preset.baseUrl === baseUrl)?.id ?? (baseUrl ? "custom" : "gemini");
}

export function useAiSettings() {
  return useQuery({ queryKey: ["ai-status"], queryFn: () => api<AiSettingsView>("/ai/status") });
}

export function AiSettingsCard() {
  const queryClient = useQueryClient();
  const settings = useAiSettings();
  const [presetId, setPresetId] = useState("gemini");
  const [baseUrl, setBaseUrl] = useState(PRESETS[0].baseUrl);
  const [model, setModel] = useState(PRESETS[0].model);
  const [apiKey, setApiKey] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!settings.data?.baseUrl) return;
    setPresetId(presetFor(settings.data.baseUrl));
    setBaseUrl(settings.data.baseUrl);
    setModel(settings.data.model ?? "");
  }, [settings.data?.baseUrl, settings.data?.model]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-status"] });
  const save = useMutation({
    mutationFn: () => api<AiSettingsView>("/ai/settings", { method: "PUT", body: JSON.stringify({ baseUrl, model, apiKey }) }),
    onSuccess: async () => {
      setApiKey("");
      setEditing(false);
      await refresh();
      check.mutate();
    },
  });
  const check = useMutation({ mutationFn: () => api<{ reply: string; durationMs: number }>("/ai/settings/test", { method: "POST" }) });
  const remove = useMutation({
    mutationFn: () => api<AiSettingsView>("/ai/settings", { method: "DELETE" }),
    onSuccess: async () => {
      check.reset();
      await refresh();
    },
  });

  const preset = PRESETS.find((item) => item.id === presetId);
  const current = settings.data;
  const showForm = editing || (current !== undefined && !current.configured);
  const keepsKey = current?.source === "settings" && current.baseUrl === baseUrl && Boolean(current.keyHint);

  function choose(id: string | null) {
    if (!id) return;
    setPresetId(id);
    const next = PRESETS.find((item) => item.id === id);
    if (next) {
      setBaseUrl(next.baseUrl);
      setModel(next.model);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
          <Typography variant="subtitle1" sx={{ flex: 1 }}>AI provider</Typography>
          {current?.configured ? (
            <>
              <Chip color="success" icon={<CheckCircleIcon />} label={`${current.model} · ${current.source === "env" ? "from .env" : "saved here"}`} />
              <Button size="small" variant="outlined" disabled={check.isPending} onClick={() => check.mutate()}>
                {check.isPending ? "Testing…" : "Test connection"}
              </Button>
              {!showForm ? <Button size="small" onClick={() => setEditing(true)}>Change</Button> : null}
              {current.source === "settings" ? <Button size="small" color="error" disabled={remove.isPending} onClick={() => remove.mutate()}>Remove</Button> : null}
            </>
          ) : (
            <Chip label="Not set up" />
          )}
        </Stack>

        {check.data ? <Alert severity="success">Connected. The model answered “{check.data.reply}” in {(check.data.durationMs / 1000).toFixed(1)} s. AI features are ready.</Alert> : null}
        {check.error ? <Alert severity="error">{errorMessage(check.error)}</Alert> : null}

        {showForm ? (
          <>
            {!current?.configured ? (
              <Alert severity="info">
                AI writes test steps from documents, drafts tests from a sentence, and explains failures. Pick a provider, paste its API key, and save. Gemini and Groq have free tiers; Ollama runs locally.
              </Alert>
            ) : null}
            <ToggleButtonGroup exclusive size="small" value={presetId} onChange={(_, id: string | null) => choose(id)} sx={{ flexWrap: "wrap" }}>
              {PRESETS.map((item) => <ToggleButton key={item.id} value={item.id}>{item.label}</ToggleButton>)}
              <ToggleButton value="custom">Other</ToggleButton>
            </ToggleButtonGroup>
            {preset ? (
              <Typography variant="body2" color="text.secondary">
                {preset.note}{" "}
                {preset.keyUrl ? <MuiLink href={preset.keyUrl} target="_blank" rel="noreferrer">Get a key</MuiLink> : null}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Any service with an OpenAI-compatible /chat/completions API (Azure, OpenRouter, LM Studio, vLLM…).</Typography>
            )}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Provider URL"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.openai.com/v1"
                helperText="Must be https, or localhost for a local model."
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="gpt-4o-mini"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              label={preset && !preset.needsKey ? "API key (not needed)" : "API key"}
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={keepsKey ? `Saved key ${current?.keyHint} is kept if you leave this empty` : preset?.needsKey === false ? "Leave empty" : "Paste the key, e.g. sk-… or AIza…"}
              helperText="Stored in this machine's local database and never shown again."
              autoComplete="off"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {save.error ? <Alert severity="error">{errorMessage(save.error)}</Alert> : null}
            <Box>
              <Button variant="contained" disabled={save.isPending || !baseUrl.trim() || !model.trim()} onClick={() => save.mutate()}>
                {save.isPending ? "Saving…" : "Save and test"}
              </Button>
              {editing ? <Button sx={{ ml: 1 }} onClick={() => setEditing(false)}>Cancel</Button> : null}
            </Box>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}
