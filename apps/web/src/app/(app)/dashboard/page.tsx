"use client";

import { Alert, Button, CircularProgress, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { DashboardSummary } from "@atp/shared-types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { api, errorMessage } from "@/lib/api";

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardSummary>("/dashboard"),
  });

  if (summary.isLoading) {
    return <CircularProgress />;
  }

  if (summary.error) {
    return <Alert severity="error">{errorMessage(summary.error)}</Alert>;
  }

  const data = summary.data;
  if (!data) return null;

  const cards = [
    ["Projects", data.projectCount],
    ["Active", data.activeProjectCount],
    ["Applications", data.applicationCount],
    ["Environments", data.environmentCount],
    ["Test cases", data.testCaseCount],
    ["Suites", data.suiteCount],
    ["Plans", data.planCount],
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Local inventory of projects and tests. Execution arrives in a later phase."
        action={
          <Button variant="contained" component={Link} href="/projects">
            Open projects
          </Button>
        }
      />
      <Grid container spacing={2}>
        {cards.map(([label, value]) => (
          <Grid key={String(label)} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.5 }}>
              <Typography color="text.secondary" variant="body2">
                {label}
              </Typography>
              <Typography variant="h4">{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Recent projects
      </Typography>
      {data.recentProjects.length === 0 ? (
        <Alert severity="info">Create a project to start organizing applications and tests.</Alert>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentProjects.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Link href={`/projects/${project.id}`}>{project.name}</Link>
                  </TableCell>
                  <TableCell>{project.key}</TableCell>
                  <TableCell>{project.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Stack sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Runs, pass rate, and evidence show up after the execution worker is added.
        </Typography>
      </Stack>
    </>
  );
}
