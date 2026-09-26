"use client";

import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import { loginSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthFrame } from "@/components/AuthFrame";
import { api, errorMessage } from "@/lib/api";
import { SESSION_EXPIRED, safeNext } from "@/lib/redirect";

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string }> }) {
  const { reason, next } = use(searchParams);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify(values) });
      router.replace(safeNext(next));
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <AuthFrame
      title="Sign in"
      subtitle="Use the local account for this workstation."
      footer={
        <Typography variant="body2">
          No account yet? <MuiLink component={Link} href="/register">Create one</MuiLink>
        </Typography>
      }
    >
      <Stack component="form" spacing={2} onSubmit={form.handleSubmit(onSubmit)}>
        {reason === SESSION_EXPIRED && !error ? <Alert severity="info">Your session has expired. Sign in again.</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField label="Email" type="email" {...form.register("email")} error={Boolean(form.formState.errors.email)} helperText={form.formState.errors.email?.message} />
        <TextField label="Password" type="password" {...form.register("password")} error={Boolean(form.formState.errors.password)} helperText={form.formState.errors.password?.message} />
        <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting}>
          Sign in
        </Button>
      </Stack>
    </AuthFrame>
  );
}

