"use client";

import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import { Project } from "@atp/shared-types";
import { createProjectSchema } from "@atp/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

type ProjectForm = z.output<typeof createProjectSchema>;

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  const form = useForm<z.input<typeof createProjectSchema>, unknown, ProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", key: "", description: "" },
  });

  const create = useMutation({
    mutationFn: (values: ProjectForm) => api<Project>("/projects", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const archive = useMutation({
    mutationFn: (project: Project) =>
      api(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: project.status === "active" ? "archived" : "active" }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const remove = useMutation({
    mutationFn: (project: Project) => api(`/projects/${project.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Each project holds applications, environments, and tests."
        action={<Button variant="contained" onClick={() => setOpen(true)}>New project</Button>}
      />
      {projects.error ? <Alert severity="error">{errorMessage(projects.error)}</Alert> : null}
      {projects.data && projects.data.length === 0 ? (
        <EmptyState title="No projects yet" body="Create a project before adding applications or test cases." action={<Button variant="contained" onClick={() => setOpen(true)}>New project</Button>} />
      ) : null}
      {projects.data && projects.data.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.data.map((project) => (
              <TableRow key={project.id} hover>
                <TableCell>
                  <Link href={`/projects/${project.id}`}>{project.name}</Link>
                  <div>{project.description}</div>
                </TableCell>
                <TableCell>{project.key}</TableCell>
                <TableCell>
                  <Chip size="small" label={project.status} color={project.status === "active" ? "success" : "default"} />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => archive.mutate(project)}>
                    {project.status === "active" ? "Archive" : "Restore"}
                  </Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(project)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New project</DialogTitle>
        <Stack component="form" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <DialogContent>
            <Stack spacing={2}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <TextField label="Name" {...form.register("name")} error={Boolean(form.formState.errors.name)} helperText={form.formState.errors.name?.message} />
              <TextField label="Key" placeholder="Generated from the name if empty" {...form.register("key")} />
              <TextField label="Description" multiline minRows={3} {...form.register("description")} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>Create</Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete project"
        body="This deletes the project and its applications, environments, cases, suites, and plans."
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </>
  );
}
