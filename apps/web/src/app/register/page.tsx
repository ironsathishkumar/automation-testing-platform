"use client";

import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from "@mui/material";
import { registerSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthFrame } from "@/components/AuthFrame";
import { api, errorMessage } from "@/lib/api";

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setError(null);
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify(values) });
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <AuthFrame
      title="Create account"
      subtitle="This account stays on the local API."
      footer={
        <Typography variant="body2">
          Already registered? <MuiLink component={Link} href="/login">Sign in</MuiLink>
        </Typography>
      }
    >
      <Stack component="form" spacing={2} onSubmit={form.handleSubmit(onSubmit)}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Stack direction="row" spacing={2}>
          <TextField label="First name" fullWidth {...form.register("firstName")} error={Boolean(form.formState.errors.firstName)} helperText={form.formState.errors.firstName?.message} />
          <TextField label="Last name" fullWidth {...form.register("lastName")} error={Boolean(form.formState.errors.lastName)} helperText={form.formState.errors.lastName?.message} />
        </Stack>
        <TextField label="Email" type="email" {...form.register("email")} error={Boolean(form.formState.errors.email)} helperText={form.formState.errors.email?.message} />
        <TextField label="Password" type="password" {...form.register("password")} error={Boolean(form.formState.errors.password)} helperText={form.formState.errors.password?.message ?? "At least 8 characters"} />
        <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting}>
          Create account
        </Button>
      </Stack>
    </AuthFrame>
  );
}
