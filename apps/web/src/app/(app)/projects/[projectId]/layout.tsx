"use client";

import { Box, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { ProjectDetail } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, use } from "react";
import { api } from "@/lib/api";

const LINKS = [
  { suffix: "", label: "Overview" },
  { suffix: "/applications", label: "Applications" },
  { suffix: "/environments", label: "Environments" },
  { suffix: "/test-cases", label: "Test cases" },
  { suffix: "/test-suites", label: "Suites" },
  { suffix: "/test-plans", label: "Plans" },
  { suffix: "/test-runs", label: "Runs" },
];

export default function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const pathname = usePathname();
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<ProjectDetail>(`/projects/${projectId}`),
  });

  const base = `/projects/${projectId}`;
  const current = LINKS.find((link) => (link.suffix === "" ? pathname === base : pathname.startsWith(`${base}${link.suffix}`)))?.suffix ?? "";

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Project
        </Typography>
        <Typography variant="h4">{project.data?.name ?? (project.isLoading ? "Loading" : "Project")}</Typography>
        <Typography color="text.secondary">{project.data ? `${project.data.key} · ${project.data.status}` : null}</Typography>
      </Box>
      {project.isLoading ? <CircularProgress size={22} /> : null}
      <Tabs value={current} variant="scrollable">
        {LINKS.map((link) => (
          <Tab key={link.suffix || "overview"} value={link.suffix} label={link.label} component={Link} href={`${base}${link.suffix}`} />
        ))}
      </Tabs>
      {children}
    </Stack>
  );
}
